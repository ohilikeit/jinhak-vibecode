#!/usr/bin/env bash
# tests/integration/test-expense-pdf-to-csv.sh
# Priority 2: 3 영수증 PDF → /build → output/expenses.csv (합계 행 포함)
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
INSTALL="$ROOT/bin/install.js"
PY="${JINHAK_PYTHON:-$ROOT/.venv-dev/bin/python3}"

TMP=$(mktemp -d -t jinhak-expense-XXXXXX)
trap 'rm -rf "$TMP"' EXIT
export HARNESS_HOME="$TMP/harness-home"
export AGENTS_SKILLS_HOME="$ROOT/templates/.agents/skills"
cd "$TMP"

pass=0; fail=0
ok() { pass=$((pass+1)); printf '✅ %s\n' "$1"; }
ng() { fail=$((fail+1)); printf '❌ %s\n' "$1"; }
run_capture() { OUT=$("$@" 2>&1) && RC=0 || RC=$?; }

mkdir -p inbox/receipts
"$PY" "$ROOT/test-fixtures/make-receipt-pdf.py" inbox/receipts/01.pdf "2026-05-19" "25,000"  "회의 점심"      "기획팀"
"$PY" "$ROOT/test-fixtures/make-receipt-pdf.py" inbox/receipts/02.pdf "2026-05-20" "13,500"  "택시"           "영업팀"
"$PY" "$ROOT/test-fixtures/make-receipt-pdf.py" inbox/receipts/03.pdf "2026-05-21" "47,800"  "외부 회의 식대" "기획팀"

run_capture node "$INSTALL" build "영수증 PDF를 CSV로 정리해줘"
printf '\n--- build ---\n%s\n(exit %d)\n' "$OUT" "$RC"
[ "$RC" -eq 0 ] && ok "build exit 0" || ng "build exit=$RC"

case "$OUT" in
  *'"skill":"expense-pdf-to-csv"'*) ok "expense-pdf-to-csv 라우팅" ;;
  *) ng "라우팅 실패" ;;
esac
case "$OUT" in
  *'"rows":4'*) ok "4행 (3 영수증 + 1 합계)" ;;
  *) ng "행 수 누락" ;;
esac

CSV="output/expenses.csv"
[ -f "$CSV" ] && ok "CSV 생성됨: $CSV" || ng "CSV 누락"

printf '\n--- expenses.csv ---\n'
cat "$CSV"
printf '\n--- end ---\n\n'

# UTF-8 BOM 검증
head -c 3 "$CSV" | od -An -tx1 | grep -q 'ef bb bf' && ok "UTF-8 BOM 헤더 (Excel 호환)" || ng "BOM 누락"

# 헤더가 일자/금액/항목/부서
head -1 "$CSV" | sed 's/^\xef\xbb\xbf//' | grep -q '일자,금액,항목,부서' && ok "한국어 헤더 4컬럼" || ng "헤더 다름"

# 회사명 = 기획팀 2건 + 영업팀 1건
grep -q '기획팀' "$CSV" && ok "기획팀 포함" || ng "기획팀 누락"
grep -q '영업팀' "$CSV" && ok "영업팀 포함" || ng "영업팀 누락"

# 합계 행 (25000 + 13500 + 47800 = 86300)
grep -q '^합계,86300,' "$CSV" && ok "합계 행 86300원 정확" || ng "합계 행 누락 또는 잘못"

# pandas로 다시 읽어 검증
inspect=$("$PY" - <<EOF
import json
import pandas as pd
df = pd.read_csv("$CSV")
print(json.dumps({
  "columns": list(df.columns),
  "rows": len(df),
  "total_row_amount": int(df.iloc[-1]["금액"]),
  "data_amounts": [int(x) for x in df["금액"][:-1]],
}, ensure_ascii=False))
EOF
)
echo "$inspect"
case "$inspect" in
  *'"total_row_amount": 86300'*'"data_amounts": [25000, 13500, 47800]'*) ok "pandas로 재읽기 검증" ;;
  *) ng "pandas 재읽기 실패" ;;
esac

# /plan 이 영수증 키워드를 새 스킬로 매칭하는지
run_capture node "$INSTALL" plan "이번 달 영수증 정리"
case "$OUT" in
  *'expense-pdf-to-csv'*) ok "plan: 영수증 → expense-pdf-to-csv" ;;
  *) ng "plan 매칭 실패" ;;
esac

# 기존 두 스킬도 그대로 동작 (회귀 보호)
run_capture node "$INSTALL" plan "회의록 요약"
case "$OUT" in
  *'meeting-notes-to-summary'*) ok "회귀: 회의록 → meeting-notes-to-summary" ;;
  *) ng "회의록 회귀" ;;
esac

run_capture node "$INSTALL" plan "채용공고 Excel"
case "$OUT" in
  *'jobs-pdf-to-excel'*) ok "회귀: 채용공고 → jobs-pdf-to-excel" ;;
  *) ng "채용공고 회귀" ;;
esac

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

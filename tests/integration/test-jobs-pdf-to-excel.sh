#!/usr/bin/env bash
# tests/integration/test-jobs-pdf-to-excel.sh
# Phase 7 End-to-End (가이드 docs/GOAL_MODE_IMPLEMENTATION_GUIDE.md §3):
#   1. mktemp으로 격리 HARNESS_HOME 생성
#   2. 3개 한국어 PDF를 inbox/jobs/에 배치
#   3. node bin/install.js start — stdin으로 인터뷰 5답변 mocking
#   4. node bin/install.js build "채용공고 PDF → Excel 정리"
#   5. output/jobs.xlsx 생성 확인
#   6. openpyxl로 3행 + 헤더 + 회사명 검증
#   7. ~/.harness, ~/.agents 미수정 가드레일
#   8. 결과를 마크다운 표로 출력 (평가자 evidence)
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
INSTALL="$ROOT/bin/install.js"
PY="${JINHAK_PYTHON:-$ROOT/.venv-dev/bin/python3}"

TMP=$(mktemp -d -t jinhak-e2e-XXXXXX)
trap 'echo "🗑 cleanup $TMP"; rm -rf "$TMP"' EXIT

export HARNESS_HOME="$TMP/harness-home"
export AGENTS_SKILLS_HOME="$TMP/agents-skills"
cd "$TMP"

pass=0; fail=0
ok() { pass=$((pass+1)); printf '✅ %s\n' "$1"; }
ng() { fail=$((fail+1)); printf '❌ %s\n' "$1"; }

mkdir -p inbox/jobs assets output
# 3개 샘플 PDF 생성
"$PY" "$ROOT/test-fixtures/make-jobs-pdf.py" inbox/jobs/01.pdf "백엔드 엔지니어 채용 공고" "진학에듀" "백엔드"   "서울 강남구" "2026-06-30"
"$PY" "$ROOT/test-fixtures/make-jobs-pdf.py" inbox/jobs/02.pdf "프론트엔드 개발자 모집"   "교육테크" "프론트엔드" "서울 마포구" "2026-07-15"
"$PY" "$ROOT/test-fixtures/make-jobs-pdf.py" inbox/jobs/03.pdf "데이터 분석가 채용"      "스터디랩" "데이터분석" "원격"       "2026-08-01"

ls inbox/jobs/ | sed 's/^/  PDF /'

# 템플릿 생성
"$PY" "$ROOT/test-fixtures/make-5col-template.py" assets/template.xlsx

# /start 인터뷰 (가이드 Phase 7 step 3) — stdin으로 5답변 mocking
echo
echo "▶ Step 3: /start (mocked stdin)"
printf '기획\n채용공고 정리\nExcel\n존댓말\nGmail, Notion\n' | \
  JINHAK_PYTHON="$PY" node "$INSTALL" start 2>&1 | sed 's/^/  start │ /'

PROFILE="$HARNESS_HOME/user-profile.md"
STATE="$TMP/.harness/state.md"
[ -f "$PROFILE" ] && ok "user-profile.md 생성: $PROFILE" || ng "user-profile.md 누락"
[ -f "$STATE" ]   && ok ".harness/state.md 생성: $STATE" || ng "state.md 누락"
# 5답변 모두 프로필에 보존
for expected in '기획' '채용공고 정리' 'Excel' '존댓말' 'Gmail' 'Notion'; do
  grep -qF "$expected" "$PROFILE" 2>/dev/null && ok "프로필에 '$expected' 포함" || ng "프로필에 '$expected' 누락"
done

# /build 실행 (가이드 Phase 7 step 4)
echo
echo "▶ Step 4: /build"
JINHAK_PYTHON="$PY" node "$INSTALL" build "채용공고 PDF → Excel 정리" 2>&1 | tee /tmp/build.log
[ -f output/jobs.xlsx ] && ok "output/jobs.xlsx 생성됨" || ng "output xlsx 누락"

# 결과 검증: openpyxl로 행/헤더/회사명
inspect=$("$PY" - <<'EOF'
import json, openpyxl
wb = openpyxl.load_workbook("output/jobs.xlsx")
ws = wb.active
rows = [[c.value for c in row] for row in ws.iter_rows(min_row=1, max_row=10, max_col=5)]
out = {
  "headers": rows[0] if rows else [],
  "data": [r for r in rows[1:] if any(c is not None and c != "" for c in r)],
  "header_bold": [bool(c.font.bold) for c in ws[1]],
}
print(json.dumps(out, ensure_ascii=False))
EOF
)

echo
echo "$inspect"
echo

# 검증 1: 헤더 5개 정확
expected_headers='["공고제목", "회사명", "직무", "근무지", "마감일"]'
headers=$(echo "$inspect" | python3 -c 'import sys,json; print(json.dumps(json.load(sys.stdin)["headers"], ensure_ascii=False))')
if [ "$headers" = "$expected_headers" ]; then
  ok "헤더 = $expected_headers"
else
  ng "헤더 불일치: $headers"
fi

# 검증 2: 데이터 3행
n=$(echo "$inspect" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["data"]))')
[ "$n" -eq 3 ] && ok "데이터 3행" || ng "행 수 $n (기대 3)"

# 검증 3: 회사명 컬럼이 각 PDF의 회사와 일치
companies=$(echo "$inspect" | python3 -c '
import sys, json
d = json.load(sys.stdin)
print("\n".join(str(r[1]) for r in d["data"]))
')
expected_companies=$'진학에듀\n교육테크\n스터디랩'
if [ "$companies" = "$expected_companies" ]; then
  ok "회사명 컬럼 정확: 진학에듀 / 교육테크 / 스터디랩"
else
  ng "회사명 불일치"
  printf 'got:\n%s\nwant:\n%s\n' "$companies" "$expected_companies"
fi

# 가드레일: HARNESS_HOME 외부 작성 금지
if [ -d "$HOME/.harness" ]; then
  ng "~/.harness 가 만들어졌습니다 (격리 실패)"
else
  ok "~/.harness 미수정 확인 (격리 OK)"
fi

# 결과를 마크다운 표로 출력 (평가자 인용용)
echo
echo "### 최종 출력 xlsx 내용"
echo
echo "| 공고제목 | 회사명 | 직무 | 근무지 | 마감일 |"
echo "|---|---|---|---|---|"
echo "$inspect" | python3 -c '
import sys, json
d = json.load(sys.stdin)
for r in d["data"]:
    print("| " + " | ".join(str(x) for x in r) + " |")
'

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

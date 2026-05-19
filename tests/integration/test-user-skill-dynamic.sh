#!/usr/bin/env bash
# tests/integration/test-user-skill-dynamic.sh
# Phase B: /create → /plan → /build 동적 등록 전체 흐름
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
INSTALL="$ROOT/bin/install.js"
PY="${JINHAK_PYTHON:-$ROOT/.venv-dev/bin/python3}"

TMP=$(mktemp -d -t jinhak-userdyn-XXXXXX)
trap 'rm -rf "$TMP"' EXIT
export HARNESS_HOME="$TMP/harness-home"
export AGENTS_SKILLS_HOME="$ROOT/templates/.agents/skills"
cd "$TMP"

pass=0; fail=0
ok() { pass=$((pass+1)); printf '✅ %s\n' "$1"; }
ng() { fail=$((fail+1)); printf '❌ %s\n' "$1"; }
run_capture() { OUT=$("$@" 2>&1) && RC=0 || RC=$?; }

# ── 1. /create로 새 스킬 만들기 (계약서 PDF → CSV)
printf 'contract-pdf-to-csv\n계약서정리\ninbox/contracts\npdf\noutput/contracts.csv\n계약일, 회사명, 금액\n' | \
  node "$INSTALL" create >/dev/null 2>&1

SKILL_DIR="$HARNESS_HOME/user-skills/contract-pdf-to-csv"
[ -f "$SKILL_DIR/SKILL.md" ] && ok "SKILL.md 생성" || ng "SKILL.md 누락"
[ -f "$SKILL_DIR/spec.json" ] && ok "spec.json 생성" || ng "spec.json 누락"

cat "$SKILL_DIR/spec.json"
echo

# ── 2. /plan이 새 스킬을 동적 인식하는지
run_capture node "$INSTALL" plan "계약서정리 부탁해"
case "$OUT" in
  *'contract-pdf-to-csv'*) ok "/plan: user-skill 동적 라우팅" ;;
  *) ng "/plan 라우팅 실패: $(echo "$OUT" | head -3)" ;;
esac

# ── 3. 3개 계약서 PDF 만들기
mkdir -p inbox/contracts
"$PY" "$ROOT/test-fixtures/make-jobs-pdf.py" inbox/contracts/01.pdf "계약 A" "회사A" "사무관리"  "x" "2026-12-31" >/dev/null
"$PY" "$ROOT/test-fixtures/make-jobs-pdf.py" inbox/contracts/02.pdf "계약 B" "회사B" "물류 협업"  "x" "2027-01-15" >/dev/null
"$PY" "$ROOT/test-fixtures/make-jobs-pdf.py" inbox/contracts/03.pdf "계약 C" "회사C" "공동 마케팅" "x" "2027-03-01" >/dev/null
# make-jobs-pdf는 마감일 필드를 만든다. 우리 user-skill의 필드는 "계약일/회사명/금액"
# 회사명만 매칭될 것이고 계약일/금액은 미기재로 처리됨 — 그 동작 자체를 검증

# ── 4. /build가 동적 spec으로 실행하는지
JINHAK_PYTHON="$PY" run_capture node "$INSTALL" build "계약서정리 진행"
printf '\n--- build 출력 ---\n%s\n(exit %d)\n' "$OUT" "$RC"
[ "$RC" -eq 0 ] && ok "/build 동적 실행 성공" || ng "/build exit=$RC"

case "$OUT" in
  *'"skill":"contract-pdf-to-csv"'*) ok "skill=contract-pdf-to-csv 라우팅" ;;
  *) ng "skill 라우팅 실패" ;;
esac

CSV="output/contracts.csv"
[ -f "$CSV" ] && ok "CSV 생성: $CSV" || ng "CSV 누락"

printf '\n--- CSV ---\n'
cat "$CSV"
printf '\n--- end ---\n'

# 헤더가 spec.fields 순서 — 계약일/회사명/금액
head -1 "$CSV" | sed 's/^\xef\xbb\xbf//' | grep -q '계약일,회사명,금액' && ok "동적 헤더 정확" || ng "헤더 다름"

# 회사명 추출 — 회사A/B/C 모두
grep -q '회사A' "$CSV" && ok "회사A 추출" || ng "회사A 누락"
grep -q '회사B' "$CSV" && ok "회사B 추출" || ng "회사B 누락"
grep -q '회사C' "$CSV" && ok "회사C 추출" || ng "회사C 누락"

# 계약일/금액 라벨 없으므로 "(미기재)"
grep -q '(미기재)' "$CSV" && ok "라벨 누락 시 (미기재)" || ng "(미기재) 누락"

# ── 5. 기존 스킬(jobs-pdf-to-excel, expense, meetings)이 회귀 없이 동작
run_capture node "$INSTALL" plan "채용공고 Excel"
case "$OUT" in
  *'jobs-pdf-to-excel'*) ok "회귀: jobs-pdf-to-excel 라우팅" ;;
  *) ng "회귀 깨짐: jobs" ;;
esac

run_capture node "$INSTALL" plan "회의록 요약"
case "$OUT" in
  *'meeting-notes-to-summary'*) ok "회귀: meeting-notes 라우팅" ;;
  *) ng "회귀 깨짐: meeting" ;;
esac

run_capture node "$INSTALL" plan "영수증 정리"
case "$OUT" in
  *'expense-pdf-to-csv'*) ok "회귀: expense 라우팅" ;;
  *) ng "회귀 깨짐: expense" ;;
esac

# ── 6. txt → md 패턴도 동적 runner 동작
printf 'memo-to-todo\nTODO메모정리\ninbox/memos\ntxt\noutput/todos.md\n할일,담당,기한\n' | \
  node "$INSTALL" create >/dev/null 2>&1
mkdir -p inbox/memos
cat > inbox/memos/01.txt <<'EOF'
주간 회의 메모
할일: 사이트 리뉴얼 디자인 시안
담당: 김디자이너
기한: 2026-06-01
EOF
cat > inbox/memos/02.txt <<'EOF'
브런치 회의 메모
할일: 부서간 협업 가이드 작성
담당: 이기획
기한: 2026-06-15
EOF
JINHAK_PYTHON="$PY" run_capture node "$INSTALL" build "TODO메모정리"
case "$OUT" in
  *'"skill":"memo-to-todo"'*) ok "txt→md user-skill 동적 라우팅" ;;
  *) ng "txt→md 라우팅 실패" ;;
esac
[ -f output/todos.md ] && ok "output/todos.md 생성" || ng "todos.md 누락"
grep -q '김디자이너' output/todos.md && ok "txt 추출 정확" || ng "txt 추출 실패"

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

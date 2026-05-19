#!/usr/bin/env bash
# tests/integration/test-autopilot.sh — /autopilot 무중단 흐름
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
INSTALL="$ROOT/bin/install.js"
PY="${JINHAK_PYTHON:-$ROOT/.venv-dev/bin/python3}"

TMP=$(mktemp -d -t jinhak-auto-XXXXXX)
trap 'rm -rf "$TMP"' EXIT
export HARNESS_HOME="$TMP/harness-home"
export AGENTS_SKILLS_HOME="$ROOT/templates/.agents/skills"
cd "$TMP"

pass=0; fail=0
ok() { pass=$((pass+1)); printf '✅ %s\n' "$1"; }
ng() { fail=$((fail+1)); printf '❌ %s\n' "$1"; }
run_capture() { OUT=$("$@" 2>&1) && RC=0 || RC=$?; }

# 시나리오 A: jobs (성공 케이스)
mkdir -p inbox/jobs assets output
"$PY" "$ROOT/test-fixtures/make-jobs-pdf.py" inbox/jobs/01.pdf "T" "회사X" "BE" "서울" "2026-06-30" >/dev/null
"$PY" "$ROOT/test-fixtures/make-jobs-pdf.py" inbox/jobs/02.pdf "T" "회사Y" "FE" "마포" "2026-07-15" >/dev/null
"$PY" "$ROOT/test-fixtures/make-5col-template.py" assets/template.xlsx >/dev/null

JINHAK_PYTHON="$PY" run_capture node "$INSTALL" autopilot "채용공고 Excel 정리" --expected-rows 2
printf '\n--- autopilot 성공 ---\n%s\n(exit %d)\n' "$OUT" "$RC"
[ "$RC" -eq 0 ] && ok "autopilot 성공 exit 0" || ng "autopilot exit=$RC"
case "$OUT" in
  *'━━━ 1/3 plan ━━━'*'━━━ 2/3 build ━━━'*'━━━ 3/3 verify ━━━'*) ok "3 단계 진행 라벨" ;;
  *) ng "단계 라벨 누락" ;;
esac
case "$OUT" in
  *'jobs-pdf-to-excel'*) ok "plan: 라우팅 표시" ;;
  *) ng "plan 미작동" ;;
esac
case "$OUT" in
  *'"skill":"jobs-pdf-to-excel"'*) ok "build: 실행" ;;
  *) ng "build 미실행" ;;
esac
case "$OUT" in
  *'예상 행 수 (2)와 일치'*) ok "verify: expected-rows 통과" ;;
  *) ng "verify 미작동" ;;
esac
case "$OUT" in
  *'✅ autopilot 완료'*) ok "최종 완료 라벨" ;;
  *) ng "완료 라벨 누락" ;;
esac
case "$OUT" in
  *'jinhak-harness handoff'*) ok "다음 단계 handoff 안내" ;;
  *) ng "handoff 안내 누락" ;;
esac

# 시나리오 B: 매칭 안 되는 요청 → plan 단계에서 멈춤
run_capture node "$INSTALL" autopilot "이메일 답장 자동 작성"
[ "$RC" -ne 0 ] && ok "미매칭 시 exit ≠ 0" || ng "미매칭 통과"
case "$OUT" in
  *'plan 단계에서 멈췄습니다'*) ok "plan 멈춤 안내" ;;
  *) ng "plan 멈춤 안내 누락" ;;
esac

# 시나리오 C: 인자 없음 → exit 2
run_capture node "$INSTALL" autopilot
[ "$RC" -eq 2 ] && ok "인자 없음 exit 2" || ng "exit=$RC (기대 2)"
case "$OUT" in
  *'사용법: jinhak-harness autopilot'*) ok "사용법 안내" ;;
  *) ng "사용법 누락" ;;
esac

# 시나리오 D: build 단계 실패 (PDF 없음)
rm -rf inbox/jobs
mkdir -p inbox/jobs
run_capture node "$INSTALL" autopilot "채용공고 Excel"
[ "$RC" -ne 0 ] && ok "build 실패 시 exit ≠ 0" || ng "build 실패 통과"
case "$OUT" in
  *'build 단계에서 멈췄습니다'*) ok "build 멈춤 안내" ;;
  *) ng "build 멈춤 안내 누락" ;;
esac

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

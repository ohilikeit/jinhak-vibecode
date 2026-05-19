#!/usr/bin/env bash
# tests/commands/test-handoff.sh — /handoff 검증
# 시나리오:
#   A. dry-run 기본: 미리보기 출력 + 파일 복사 X + 안내 메시지
#   B. --confirm: 실제 복사 + .harness/state.md 기록
#   C. 라벨/대상 지정 동작
#   D. output 파일 없음 → exit 1
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
INSTALL="$ROOT/bin/install.js"
PY="${JINHAK_PYTHON:-$ROOT/.venv-dev/bin/python3}"

TMP=$(mktemp -d -t jinhak-handoff-XXXXXX)
trap 'rm -rf "$TMP"' EXIT
export HARNESS_HOME="$TMP/harness-home"
cd "$TMP"

pass=0; fail=0
ok() { pass=$((pass+1)); printf '✅ %s\n' "$1"; }
ng() { fail=$((fail+1)); printf '❌ %s\n' "$1"; }
run_capture() { OUT=$("$@" 2>&1) && RC=0 || RC=$?; }

# 산출물 준비
mkdir -p inbox/jobs assets output
"$PY" "$ROOT/test-fixtures/make-jobs-pdf.py" inbox/jobs/01.pdf "백엔드"  "진학에듀" "BE" "서울" "2026-07-01" >/dev/null
"$PY" "$ROOT/test-fixtures/make-5col-template.py" assets/template.xlsx >/dev/null
JINHAK_PYTHON="$PY" node "$INSTALL" build "채용공고 PDF" >/dev/null

# A. dry-run (기본)
run_capture node "$INSTALL" handoff
printf '\n--- A. dry-run ---\n%s\n(exit %d)\n' "$OUT" "$RC"
[ "$RC" -eq 0 ] && ok "dry-run exit 0" || ng "dry-run exit=$RC"
case "$OUT" in
  *'dry-run 모드'*) ok "dry-run 안내 메시지" ;;
  *) ng "dry-run 안내 누락" ;;
esac
case "$OUT" in
  *'--confirm'*) ok "--confirm 안내" ;;
  *) ng "--confirm 안내 누락" ;;
esac
# 파일이 복사되지 않았어야 함
ls handoff/ 2>/dev/null | grep -q . && ng "dry-run인데 파일 복사됨" || ok "dry-run에서 실제 복사 X"

# B. --confirm
run_capture node "$INSTALL" handoff --confirm
printf '\n--- B. confirm ---\n%s\n(exit %d)\n' "$OUT" "$RC"
[ "$RC" -eq 0 ] && ok "confirm exit 0" || ng "confirm exit=$RC"

# 파일이 handoff/ 디렉터리에 복사되어야 함
copied=$(ls handoff/ 2>/dev/null | head -1)
if [ -n "$copied" ]; then
  ok "복사된 파일: handoff/$copied"
else
  ng "파일이 복사되지 않음"
fi

# 파일명에 jobs-YYYY-MM-DD 패턴
case "$copied" in
  jobs-[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].xlsx) ok "파일명 패턴 jobs-YYYY-MM-DD.xlsx" ;;
  *) ng "파일명 패턴 불일치: $copied" ;;
esac

# .harness/state.md 갱신
if [ -f .harness/state.md ]; then
  ok ".harness/state.md 존재"
  printf '\n--- state.md ---\n%s\n--- end ---\n' "$(cat .harness/state.md)"
  case "$(cat .harness/state.md)" in
    *'## 핸드오프 로그'*) ok "핸드오프 로그 섹션 생성" ;;
    *) ng "핸드오프 로그 섹션 없음" ;;
  esac
  case "$(cat .harness/state.md)" in
    *"jobs.xlsx → $TMP/handoff/jobs-"*) ok "로그에 원본 → 대상 기록" ;;
    *) ng "로그에 매핑 누락" ;;
  esac
else
  ng ".harness/state.md 생성 실패"
fi

# C. 라벨/대상 지정
run_capture node "$INSTALL" handoff --label weekly-jobs --to "$TMP/share" --confirm
printf '\n--- C. label/to ---\n%s\n(exit %d)\n' "$OUT" "$RC"
[ "$RC" -eq 0 ] && ok "label/to exit 0" || ng "label/to exit=$RC"
copied_c=$(ls "$TMP/share/" 2>/dev/null | head -1)
case "$copied_c" in
  weekly-jobs-[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].xlsx) ok "지정 라벨 적용: $copied_c" ;;
  *) ng "라벨 미적용: $copied_c" ;;
esac

# D. output 없음
rm -rf output
run_capture node "$INSTALL" handoff
[ "$RC" -eq 1 ] && ok "output 없을 때 exit 1" || ng "output 없음 exit=$RC"
case "$OUT" in
  *'산출물을 찾지 못했'*) ok "친절한 에러 안내" ;;
  *) ng "친절 에러 누락" ;;
esac

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

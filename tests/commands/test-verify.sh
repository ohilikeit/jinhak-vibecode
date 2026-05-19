#!/usr/bin/env bash
# tests/commands/test-verify.sh — /verify 친절 리포트 검증
# 시나리오:
#   A. /build 직후 → 통과 리포트 + exit 0
#   B. 결과 행 하나 비우기 → "빈 셀" 경고 + 친절 한국어 메시지
#   C. expected-rows 불일치 → exit 1
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
INSTALL="$ROOT/bin/install.js"
PY="${JINHAK_PYTHON:-$ROOT/.venv-dev/bin/python3}"

TMP=$(mktemp -d -t jinhak-verify-XXXXXX)
trap 'rm -rf "$TMP"' EXIT
export HARNESS_HOME="$TMP/harness-home"
cd "$TMP"

pass=0; fail=0
ok() { pass=$((pass+1)); printf '✅ %s\n' "$1"; }
ng() { fail=$((fail+1)); printf '❌ %s\n' "$1"; }

# run_capture: 명령을 실행하고 stdout/stderr → $OUT, 종료코드 → $RC
# set -e를 우회해서 non-zero exit도 허용
run_capture() {
  OUT=$("$@" 2>&1) && RC=0 || RC=$?
}

mkdir -p inbox/jobs assets output
"$PY" "$ROOT/test-fixtures/make-jobs-pdf.py" inbox/jobs/01.pdf "백엔드 채용"      "진학에듀" "BE" "서울" "2026-07-01"
"$PY" "$ROOT/test-fixtures/make-jobs-pdf.py" inbox/jobs/02.pdf "프론트엔드 채용"  "교육테크" "FE" "마포" "2026-07-15"
"$PY" "$ROOT/test-fixtures/make-5col-template.py" assets/template.xlsx
JINHAK_PYTHON="$PY" node "$INSTALL" build "채용공고 PDF Excel" >/dev/null

# A. 정상 케이스
run_capture env JINHAK_PYTHON="$PY" node "$INSTALL" verify --expected-rows 2
printf '\n--- A. 통과 시나리오 ---\n%s\n(exit %d)\n' "$OUT" "$RC"
[ "$RC" -eq 0 ] && ok "정상 케이스 exit 0" || ng "정상 케이스 exit $RC"
case "$OUT" in
  *'헤더가 템플릿과 일치'*) ok "헤더 일치 메시지" ;;
  *) ng "헤더 일치 메시지 없음" ;;
esac
case "$OUT" in
  *'예상 행 수 (2)와 일치'*) ok "expected-rows 일치 메시지" ;;
  *) ng "expected-rows 메시지 없음" ;;
esac
case "$OUT" in
  *'🎉 검증 통과'*) ok "통과 최종 메시지" ;;
  *) ng "통과 최종 메시지 없음" ;;
esac

# B. 인위적으로 셀 하나 비우기 (회사명) → 빈 셀 경고
# openpyxl의 cell(..., value=None)은 None을 무시하므로 .value 속성에 직접 할당
"$PY" - <<'EOF'
import openpyxl
wb = openpyxl.load_workbook("output/jobs.xlsx")
ws = wb.active
ws.cell(row=2, column=2).value = None
wb.save("output/jobs.xlsx")
EOF
run_capture env JINHAK_PYTHON="$PY" node "$INSTALL" verify
printf '\n--- B. 빈 셀 시나리오 ---\n%s\n(exit %d)\n' "$OUT" "$RC"
case "$OUT" in
  *'⚠️  빈 셀 1개'*) ok "빈 셀 경고 메시지 (1개)" ;;
  *) ng "빈 셀 경고 누락" ;;
esac
case "$OUT" in
  *'2행 "회사명" 컬럼이 비어있습니다'*) ok "친절한 한국어 위치 안내" ;;
  *) ng "친절한 위치 안내 누락" ;;
esac
case "$OUT" in
  *'"회사명:" 라벨을 찾지 못했을 수 있어요'*) ok "원인 추정 안내" ;;
  *) ng "원인 추정 누락" ;;
esac
case "$OUT" in
  *'⚠️  검증 완료'*) ok "경고 최종 메시지 (warning)" ;;
  *) ng "경고 최종 메시지 누락" ;;
esac

# C. expected-rows 불일치
run_capture env JINHAK_PYTHON="$PY" node "$INSTALL" verify --expected-rows 99
printf '\n--- C. expected-rows 불일치 ---\n%s\n(exit %d)\n' "$OUT" "$RC"
[ "$RC" -eq 1 ] && ok "행 수 불일치 시 exit 1" || ng "행 수 불일치 exit=$RC (기대 1)"
case "$OUT" in
  *'예상 행 수 99, 실제'*) ok "행 수 차이 메시지" ;;
  *) ng "행 수 차이 메시지 누락" ;;
esac

# D. 출력 파일 없음 → exit 1 + 안내
rm -f output/jobs.xlsx
run_capture env JINHAK_PYTHON="$PY" node "$INSTALL" verify
printf '\n--- D. 출력 없음 ---\n%s\n(exit %d)\n' "$OUT" "$RC"
[ "$RC" -eq 1 ] && ok "출력 없음 시 exit 1" || ng "출력 없음 exit=$RC"
case "$OUT" in
  *'/build를 먼저 실행'*) ok "사용자 안내 메시지" ;;
  *) ng "안내 메시지 없음" ;;
esac

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

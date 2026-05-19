#!/usr/bin/env bash
# tests/commands/test-plan.sh — /plan 검증
# 시나리오:
#   A. 채용공고 요청 → jobs-pdf-to-excel 매칭 + plan 파일 생성
#   B. 매칭 안 되는 요청 → 친절한 거절 + 지원 스킬 안내
#   C. 인자 없으면 사용법 안내
#   D. plan 파일에 절차 + 다음 명령 포함
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
INSTALL="$ROOT/bin/install.js"

TMP=$(mktemp -d -t jinhak-plan-XXXXXX)
trap 'rm -rf "$TMP"' EXIT
export HARNESS_HOME="$TMP/harness-home"
export AGENTS_SKILLS_HOME="$ROOT/templates/.agents/skills"
cd "$TMP"

pass=0; fail=0
ok() { pass=$((pass+1)); printf '✅ %s\n' "$1"; }
ng() { fail=$((fail+1)); printf '❌ %s\n' "$1"; }
run_capture() { OUT=$("$@" 2>&1) && RC=0 || RC=$?; }

# A. 매칭되는 요청
run_capture node "$INSTALL" plan "채용공고 PDF를 Excel로 정리해줘"
printf '\n--- A. 매칭 요청 ---\n%s\n(exit %d)\n' "$OUT" "$RC"
[ "$RC" -eq 0 ] && ok "정상 plan exit 0" || ng "plan exit=$RC"
case "$OUT" in
  *'jobs-pdf-to-excel'*) ok "스킬 매칭: jobs-pdf-to-excel" ;;
  *) ng "스킬 매칭 누락" ;;
esac
case "$OUT" in
  *'## 필요한 공용 utils'*) ok "utils 섹션 포함" ;;
  *) ng "utils 섹션 누락" ;;
esac
case "$OUT" in
  *'common/utils/pdf-extract'*) ok "requires:pdf-extract 추출" ;;
  *) ng "requires 추출 실패" ;;
esac
case "$OUT" in
  *'## 단계'*) ok "단계 섹션 포함" ;;
  *) ng "단계 섹션 누락" ;;
esac
case "$OUT" in
  *'jinhak-harness build'*'jinhak-harness verify'*'jinhak-harness handoff'*)
    ok "다음 명령 build/verify/handoff 안내" ;;
  *) ng "다음 명령 누락" ;;
esac
case "$OUT" in
  *'매칭 근거'*'채용공고'*) ok "매칭 근거 (감지된 키워드) 표시" ;;
  *) ng "매칭 근거 누락" ;;
esac

# plan 파일이 .harness/plans/ 에 저장되었는지
plan_file=$(ls .harness/plans/*.md 2>/dev/null | head -1)
if [ -n "$plan_file" ]; then
  ok "plan 파일 저장됨: $plan_file"
else
  ng "plan 파일 누락"
fi

# B. 매칭 안 되는 요청
run_capture node "$INSTALL" plan "회의록을 PPT로 자동 변환해줘"
printf '\n--- B. 미매칭 요청 ---\n%s\n(exit %d)\n' "$OUT" "$RC"
[ "$RC" -eq 1 ] && ok "미매칭 시 exit 1" || ng "미매칭 exit=$RC"
case "$OUT" in
  *'현재 지원하는 자동화'*) ok "지원 스킬 안내" ;;
  *) ng "안내 누락" ;;
esac
case "$OUT" in
  *'jobs-pdf-to-excel'*) ok "지원 스킬 목록 포함" ;;
  *) ng "스킬 목록 없음" ;;
esac

# C. 인자 없음
run_capture node "$INSTALL" plan
[ "$RC" -eq 2 ] && ok "인자 없음 시 exit 2" || ng "exit=$RC (기대 2)"
case "$OUT" in
  *'사용법: jinhak-harness plan'*) ok "사용법 안내" ;;
  *) ng "사용법 안내 누락" ;;
esac

# D. plan 파일 내용 한 번 더 확인
printf '\n--- D. plan 파일 내용 ---\n%s\n--- end ---\n' "$(cat "$plan_file")"
case "$(cat "$plan_file")" in
  *'사용자 요청'*'채용공고 PDF'*) ok "plan 파일에 사용자 요청 보존" ;;
  *) ng "plan 파일에 요청 누락" ;;
esac

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

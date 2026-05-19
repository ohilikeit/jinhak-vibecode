#!/usr/bin/env bash
# tests/commands/test-start.sh — /start 인터뷰 격리 검증
# fresh-test.sh 스타일로 mktemp 디렉터리에서 실행:
#   - HARNESS_HOME = $TMP/harness-home
#   - cwd          = $TMP/work
#   - stdin        = 5답변 mocking
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
INSTALL="$ROOT/bin/install.js"

TMP=$(mktemp -d -t jinhak-start-XXXXXX)
trap 'rm -rf "$TMP"' EXIT

export HARNESS_HOME="$TMP/harness-home"
export AGENTS_SKILLS_HOME="$TMP/agents-skills"
mkdir -p "$TMP/work"
cd "$TMP/work"

pass=0; fail=0
ok() { pass=$((pass+1)); printf '✅ %s\n' "$1"; }
ng() { fail=$((fail+1)); printf '❌ %s\n' "$1"; }

# 5답변을 한 번에 stdin으로 흘려보냄
out=$(printf '기획\n채용공고 정리\nExcel\n존댓말\nGmail, Notion\n' | \
  env -u COPILOT_CLI -u CURSOR_PLUGIN_ROOT -u CLAUDE_PLUGIN_ROOT \
      CLAUDE_PLUGIN_ROOT=/tmp/claude-mock \
      node "$INSTALL" start 2>&1)

printf '\n--- 출력 시작 ---\n%s\n--- 출력 끝 ---\n\n' "$out"

# 1) user-profile.md 존재 + 5답변 포함
PROFILE="$HARNESS_HOME/user-profile.md"
if [ -f "$PROFILE" ]; then
  ok "user-profile.md 존재: $PROFILE"
  printf '\n--- user-profile.md ---\n'
  cat "$PROFILE"
  printf '\n--- end ---\n\n'
  for expected in '기획' '채용공고 정리' 'Excel' '존댓말' 'Gmail' 'Notion'; do
    if grep -qF "$expected" "$PROFILE"; then
      ok "프로필에 '$expected' 포함"
    else
      ng "프로필에 '$expected' 누락"
    fi
  done
else
  ng "user-profile.md 누락"
fi

# 2) .harness/state.md 생성됨 (cwd)
STATE="$TMP/work/.harness/state.md"
if [ -f "$STATE" ]; then
  ok ".harness/state.md 생성됨: $STATE"
else
  ng ".harness/state.md 누락"
fi

# 3) AI 도구 감지 라인 ✅
case "$out" in
  *'✅ Claude Code 감지'*) ok "AI 도구 감지 라인 (Claude Code)" ;;
  *'✅ '*'감지'*)           ok "AI 도구 감지 라인 (다른 도구)" ;;
  *) ng "감지 라인 누락" ;;
esac

# 4) 한국어 가이드 메시지
case "$out" in
  *'/build 라고 말해주세요'*) ok "/build 안내 메시지" ;;
  *) ng "한국어 가이드 메시지 누락" ;;
esac

# 5) 재실행 시 인터뷰 스킵
out2=$(printf '' | node "$INSTALL" start 2>&1)
case "$out2" in
  *'기존 프로필 사용'*) ok "재실행 시 기존 프로필 재사용" ;;
  *) ng "재실행에서 인터뷰가 또 떴음" ;;
esac

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

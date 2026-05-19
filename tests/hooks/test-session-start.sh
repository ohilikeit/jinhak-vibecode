#!/usr/bin/env bash
# tests/hooks/test-session-start.sh — hooks/session-start 시나리오 검증
# 사용법: ./tests/hooks/test-session-start.sh
set -eu

HOOK="$(cd "$(dirname "$0")/../.." && pwd)/hooks/session-start"

pass=0
fail=0
note() { printf '  → %s\n' "$1"; }
ok()   { pass=$((pass + 1)); printf '✅ %s\n' "$1"; }
ng()   { fail=$((fail + 1)); printf '❌ %s\n' "$1"; }

# 0) 훅 자체가 실행 가능한가
[ -x "$HOOK" ] && ok "hook 실행 권한 OK" || ng "hook 실행 불가: $HOOK"

# 1) Cursor → additional_context (snake_case)
out=$(CURSOR_PLUGIN_ROOT=/tmp/x CLAUDE_PLUGIN_ROOT= COPILOT_CLI= bash "$HOOK")
note "$(printf '%s' "$out" | head -c 80)..."
case "$out" in
  *'"additional_context"'*) ok "Cursor 분기: additional_context 포함" ;;
  *) ng "Cursor 분기 실패" ;;
esac

# 2) Claude Code → hookSpecificOutput.additionalContext (nested)
out=$(CURSOR_PLUGIN_ROOT= CLAUDE_PLUGIN_ROOT=/tmp/x COPILOT_CLI= bash "$HOOK")
note "$(printf '%s' "$out" | head -c 80)..."
case "$out" in
  *'"hookSpecificOutput"'*'"additionalContext"'*) ok "Claude Code 분기: hookSpecificOutput.additionalContext 포함" ;;
  *) ng "Claude Code 분기 실패" ;;
esac

# 3) Copilot/SDK 기본 → 최상위 additionalContext
out=$(CURSOR_PLUGIN_ROOT= CLAUDE_PLUGIN_ROOT= COPILOT_CLI=1 bash "$HOOK")
note "$(printf '%s' "$out" | head -c 80)..."
case "$out" in
  *'"hookSpecificOutput"'*) ng "Copilot 분기에서 hookSpecificOutput이 잘못 노출됨" ;;
  *'"additionalContext"'*)  ok "Copilot/SDK 분기: 최상위 additionalContext 포함" ;;
  *) ng "Copilot/SDK 분기 실패" ;;
esac

# 4) 모든 분기 JSON 유효성 (python3 json 파서)
if command -v python3 >/dev/null 2>&1; then
  for env_setup in \
    "CURSOR_PLUGIN_ROOT=/tmp/x" \
    "CLAUDE_PLUGIN_ROOT=/tmp/x" \
    "COPILOT_CLI=1"; do
    if eval "$env_setup bash \"$HOOK\"" | python3 -c 'import sys,json; json.load(sys.stdin)' 2>/dev/null; then
      note "JSON 유효: $env_setup"
    else
      ng "JSON 파싱 실패: $env_setup"
    fi
  done
  ok "3개 분기 JSON 모두 유효"
else
  note "python3 없음 — JSON 파싱 검증 스킵"
fi

# 5) 부트스트랩 컨텍스트 ≤ 500 토큰 (chars/4 근사)
ctx_chars=$(bash "$HOOK" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["additionalContext"]))')
ctx_tokens=$((ctx_chars / 4))
if [ "$ctx_tokens" -le 500 ]; then
  ok "부트스트랩 컨텍스트 ${ctx_chars}자 ≈ ${ctx_tokens}토큰 (≤500)"
else
  ng "컨텍스트가 500토큰 초과: ${ctx_chars}자 ≈ ${ctx_tokens}토큰"
fi

# 6) 5종 escape 패턴 모두 존재
escape_count=0
grep -qF '${s//\\/\\\\}'    "$HOOK" && escape_count=$((escape_count + 1)) && note "backslash escape ✓"
grep -qF '${s//\"/\\\"}'     "$HOOK" && escape_count=$((escape_count + 1)) && note "doublequote escape ✓"
grep -qF "\${s//\$'\\n'/\\\\n}" "$HOOK" && escape_count=$((escape_count + 1)) && note "newline escape ✓"
grep -qF "\${s//\$'\\r'/\\\\r}" "$HOOK" && escape_count=$((escape_count + 1)) && note "carriage-return escape ✓"
grep -qF "\${s//\$'\\t'/\\\\t}" "$HOOK" && escape_count=$((escape_count + 1)) && note "tab escape ✓"
[ "$escape_count" -eq 5 ] && ok "REPORT_06 §3.5 escape 패턴 5종 모두 존재" || ng "escape 패턴 누락: $escape_count/5"

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

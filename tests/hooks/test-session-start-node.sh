#!/usr/bin/env bash
# tests/hooks/test-session-start-node.sh — 크로스플랫폼 Node 엔진(session-start.js) 검증
# bash/PowerShell 래퍼가 공유하는 단일 두뇌. (PowerShell은 이 엔진을 그대로 호출)
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENGINE="$ROOT/hooks/session-start.js"

pass=0; fail=0
note() { printf '  → %s\n' "$1"; }
ok()   { pass=$((pass + 1)); printf '✅ %s\n' "$1"; }
ng()   { fail=$((fail + 1)); printf '❌ %s\n' "$1"; }

[ -f "$ENGINE" ] && ok "엔진 파일 존재" || ng "엔진 없음: $ENGINE"

valid_json() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{JSON.parse(s);process.exit(0)})' 2>/dev/null; }

# 1) Cursor 분기 → additional_context (snake_case)
out=$(CURSOR_PLUGIN_ROOT=/tmp/x CLAUDE_PLUGIN_ROOT= COPILOT_CLI= node "$ENGINE")
echo "$out" | valid_json && case "$out" in *'"additional_context"'*) ok "Cursor: additional_context" ;; *) ng "Cursor 분기 실패" ;; esac || ng "Cursor JSON 무효"

# 2) Claude Code 분기 → hookSpecificOutput.additionalContext
out=$(CURSOR_PLUGIN_ROOT= CLAUDE_PLUGIN_ROOT=/tmp/x COPILOT_CLI= node "$ENGINE")
case "$out" in *'"hookSpecificOutput"'*'"additionalContext"'*) ok "Claude: hookSpecificOutput.additionalContext" ;; *) ng "Claude 분기 실패" ;; esac

# 3) Copilot/SDK 기본 → 최상위 additionalContext (hookSpecificOutput 아님)
out=$(CURSOR_PLUGIN_ROOT= CLAUDE_PLUGIN_ROOT= COPILOT_CLI=1 node "$ENGINE")
case "$out" in
  *'"hookSpecificOutput"'*) ng "Copilot 분기에서 hookSpecificOutput 잘못 노출" ;;
  *'"additionalContext"'*) ok "Copilot/SDK: 최상위 additionalContext" ;;
  *) ng "Copilot 분기 실패" ;;
esac

# 4) 부트스트랩은 항상 포함
out=$(CLAUDE_PLUGIN_ROOT=/x node "$ENGINE")
case "$out" in *'jinhak-harness'*'baseline (alwaysApply)'*) ok "부트스트랩 + baseline 합성" ;; *) ng "부트스트랩/baseline 누락" ;; esac

# 5) 개인 컨텍스트(인터뷰모드) full 모드 주입
PCTX=$(mktemp -d)
cat > "$PCTX/personal-context.md" <<'PCEOF'
---
mode: full
priorities:
  - 'CATCH MAU 700만 달성'
suppressed_topics:
  - '인사 관련 사항'
---
# c
PCEOF
out=$(CLAUDE_PLUGIN_ROOT=/x HARNESS_HOME="$PCTX" node "$ENGINE")
rm -rf "$PCTX"
case "$out" in *'개인 컨텍스트 (인터뷰모드)'*'CATCH MAU 700만 달성'*) ok "full 모드 개인 컨텍스트 주입" ;; *) ng "개인 컨텍스트 미주입" ;; esac

# 6) 빈 HARNESS_HOME — 여전히 유효 JSON + 부트스트랩
EMPTY=$(mktemp -d)
out=$(CLAUDE_PLUGIN_ROOT=/x HARNESS_HOME="$EMPTY" node "$ENGINE")
rm -rf "$EMPTY"
echo "$out" | valid_json && case "$out" in *'jinhak-harness'*) ok "빈 홈: 유효 JSON + 부트스트랩" ;; *) ng "빈 홈 처리 실패" ;; esac || ng "빈 홈 JSON 무효"

# 7) bash 래퍼가 node로 위임하는 라인 존재 (회귀 보호)
grep -q 'exec node "\$__SELF_DIR/session-start.js"' "$ROOT/hooks/session-start" && ok "bash 래퍼 → node 위임 라인 존재" || ng "bash 위임 라인 누락"

# 8) PowerShell 폴백이 같은 엔진 호출
grep -q "session-start.js" "$ROOT/hooks/session-start.ps1" && ok "ps1 폴백 → 동일 엔진 호출" || ng "ps1 엔진 호출 누락"

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

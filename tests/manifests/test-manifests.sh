#!/usr/bin/env bash
# tests/manifests/test-manifests.sh — 멀티 AI 호환 manifest 형식 검증
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

pass=0; fail=0
ok() { pass=$((pass+1)); printf '✅ %s\n' "$1"; }
ng() { fail=$((fail+1)); printf '❌ %s\n' "$1"; }

valid_json() {
  local f="$1"
  [ -f "$f" ] || { ng "파일 없음: $f"; return; }
  python3 -c "import json; json.load(open('$f', encoding='utf-8'))" 2>/dev/null \
    && ok "JSON 유효: $f" \
    || ng "JSON 파싱 실패: $f"
}

# 6개 manifest 존재 + 유효성
valid_json "$ROOT/.claude-plugin/plugin.json"
valid_json "$ROOT/.cursor-plugin/plugin.json"
valid_json "$ROOT/.codex-plugin/plugin.json"
valid_json "$ROOT/gemini-extension.json"
valid_json "$ROOT/.antigravity/plugin.json"
[ -f "$ROOT/.opencode/INSTALL.md" ] && ok "OpenCode INSTALL.md 존재" || ng "OpenCode INSTALL.md 누락"

# 모든 manifest가 "jinhak-harness" 이름 + 0.1.0 버전
for f in .claude-plugin/plugin.json .cursor-plugin/plugin.json .codex-plugin/plugin.json gemini-extension.json .antigravity/plugin.json; do
  name=$(python3 -c "import json; print(json.load(open('$ROOT/$f', encoding='utf-8')).get('name', ''))")
  ver=$(python3 -c "import json; print(json.load(open('$ROOT/$f', encoding='utf-8')).get('version', ''))")
  [ "$name" = "jinhak-harness" ] && ok "$f: name=jinhak-harness" || ng "$f: name=$name"
  [ "$ver" = "0.1.0" ] && ok "$f: version=0.1.0" || ng "$f: version=$ver"
done

# Claude/Cursor/Codex/Antigravity 모두 hooks/session-start 참조
for f in .claude-plugin/plugin.json .codex-plugin/plugin.json .antigravity/plugin.json; do
  hook=$(python3 -c "import json; d=json.load(open('$ROOT/$f', encoding='utf-8')); print(d.get('hooks', {}).get('session-start', ''))")
  [ "$hook" = "hooks/session-start" ] && ok "$f: hooks.session-start 참조" || ng "$f hook 경로: $hook"
done

# Cursor와 Gemini는 다른 key 이름 사용
cursor_hook=$(python3 -c "import json; print(json.load(open('$ROOT/.cursor-plugin/plugin.json', encoding='utf-8')).get('hooks', {}).get('session_start', ''))")
[ "$cursor_hook" = "hooks/session-start" ] && ok "Cursor: hooks.session_start (snake_case)" || ng "Cursor hook key"

gemini_hook=$(python3 -c "import json; print(json.load(open('$ROOT/gemini-extension.json', encoding='utf-8')).get('hooks', {}).get('on_session_start', ''))")
[ "$gemini_hook" = "hooks/session-start" ] && ok "Gemini: hooks.on_session_start" || ng "Gemini hook key"

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

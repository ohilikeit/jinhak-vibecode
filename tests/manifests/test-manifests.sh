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

# 각 호스트 manifest가 commands 위치를 호스트별 key로 선언했는가
claude_cmds=$(python3 -c "import json; print(json.load(open('$ROOT/.claude-plugin/plugin.json', encoding='utf-8')).get('commands_dir', ''))")
[ "$claude_cmds" = "commands" ] && ok "Claude: commands_dir=commands" || ng "Claude commands_dir=$claude_cmds"

cursor_cmds=$(python3 -c "import json; print(json.load(open('$ROOT/.cursor-plugin/plugin.json', encoding='utf-8')).get('commands_path', ''))")
[ "$cursor_cmds" = ".cursor/commands" ] && ok "Cursor: commands_path=.cursor/commands" || ng "Cursor commands_path=$cursor_cmds"

codex_cmds=$(python3 -c "import json; print(json.load(open('$ROOT/.codex-plugin/plugin.json', encoding='utf-8')).get('commands_dir', ''))")
[ "$codex_cmds" = "commands" ] && ok "Codex: commands_dir=commands" || ng "Codex commands_dir=$codex_cmds"

gemini_cmds=$(python3 -c "import json; print(json.load(open('$ROOT/gemini-extension.json', encoding='utf-8')).get('commands_dir', ''))")
[ "$gemini_cmds" = ".gemini/commands" ] && ok "Gemini: commands_dir=.gemini/commands" || ng "Gemini commands_dir=$gemini_cmds"

ag_cmds=$(python3 -c "import json; print(json.load(open('$ROOT/.antigravity/plugin.json', encoding='utf-8')).get('commands_path', ''))")
[ "$ag_cmds" = "commands" ] && ok "Antigravity: commands_path=commands" || ng "Antigravity commands_path=$ag_cmds"

# 실제 파생 산출물 존재 여부
[ -d "$ROOT/commands" ] && ok "commands/ 디렉터리 존재 (canonical)" || ng "commands/ 누락"
[ -d "$ROOT/.cursor/commands" ] && ok ".cursor/commands/ 디렉터리 존재 (derived)" || ng ".cursor/commands/ 누락"
[ -d "$ROOT/.gemini/commands" ] && ok ".gemini/commands/ 디렉터리 존재 (derived)" || ng ".gemini/commands/ 누락"

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

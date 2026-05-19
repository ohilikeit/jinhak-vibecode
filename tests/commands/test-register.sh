#!/usr/bin/env bash
# tests/commands/test-register.sh — register/unregister 라운드트립 검증
#
# 격리된 FAKE_HOME에서 6 호스트 dir에 jinhak-harness/ 네임스페이스 폴더가
# 정확히 생성되는지 + 모든 파일이 복사되는지 + unregister가 깨끗이 비우는지.
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
INSTALL="$ROOT/bin/install.js"
FAKE_HOME=$(mktemp -d -t jh-reg-XXXXXX)
trap 'rm -rf "$FAKE_HOME"' EXIT

pass=0; fail=0
ok() { pass=$((pass+1)); printf '✅ %s\n' "$1"; }
ng() { fail=$((fail+1)); printf '❌ %s\n' "$1"; }
run_capture() { OUT=$("$@" 2>&1) && RC=0 || RC=$?; }

# ── 1) dry-run은 파일을 안 만든다 ──────────────────────────────
run_capture env HOME="$FAKE_HOME" node "$INSTALL" register --dry-run
[ "$RC" -eq 0 ] && ok "register --dry-run exit 0" || ng "dry-run exit=$RC"
case "$OUT" in
  *'(--dry-run, 실제 변경 없음)'*) ok "dry-run 라벨 출력" ;;
  *) ng "dry-run 라벨 누락" ;;
esac
[ ! -d "$FAKE_HOME/.claude/commands/jinhak-harness" ] && ok "dry-run: 디렉터리 미생성" || ng "dry-run인데 디렉터리 생성됨"

# ── 2) 실제 register — 6 호스트 모두 생성 ────────────────────
run_capture env HOME="$FAKE_HOME" node "$INSTALL" register
[ "$RC" -eq 0 ] && ok "register exit 0" || ng "register exit=$RC"

declare -a HOST_PATHS=(
  "$FAKE_HOME/.claude/commands/jinhak-harness"
  "$FAKE_HOME/.cursor/commands/jinhak-harness"
  "$FAKE_HOME/.codex/prompts/jinhak-harness"
  "$FAKE_HOME/.gemini/commands/jinhak-harness"
  "$FAKE_HOME/.gemini/antigravity/commands/jinhak-harness"
  "$FAKE_HOME/.config/opencode/commands/jinhak-harness"
)
for p in "${HOST_PATHS[@]}"; do
  [ -d "$p" ] && ok "디렉터리 생성: ${p##*$FAKE_HOME}" || ng "누락: $p"
done

# ── 3) 12 canonical 커맨드가 Claude/Cursor/Codex/Antigravity/OpenCode 5 호스트 각각 .md 12개 ───
for p in \
  "$FAKE_HOME/.claude/commands/jinhak-harness" \
  "$FAKE_HOME/.cursor/commands/jinhak-harness" \
  "$FAKE_HOME/.codex/prompts/jinhak-harness" \
  "$FAKE_HOME/.gemini/antigravity/commands/jinhak-harness" \
  "$FAKE_HOME/.config/opencode/commands/jinhak-harness" ; do
  count=$(ls "$p"/*.md 2>/dev/null | wc -l)
  [ "$count" -eq 12 ] && ok "$p: 12개 .md" || ng "$p: $count개 (기대 12)"
done

# ── 4) Gemini는 .toml 12개 ───────────────────────────────────
gcount=$(ls "$FAKE_HOME/.gemini/commands/jinhak-harness"/*.toml 2>/dev/null | wc -l)
[ "$gcount" -eq 12 ] && ok "Gemini: 12개 .toml" || ng "Gemini .toml: $gcount개"

# ── 5) 네임스페이스 활성화 검증 — init.md 본문이 동일한지 ─────
src=$(head -1 "$ROOT/commands/init.md")
dst=$(head -1 "$FAKE_HOME/.claude/commands/jinhak-harness/init.md")
[ "$src" = "$dst" ] && ok "Claude /jinhak-harness:init 첫 줄 일치" || ng "첫 줄 다름: src='$src' dst='$dst'"

# ── 6) --host 필터 ──────────────────────────────────────────
TMP2=$(mktemp -d)
run_capture env HOME="$TMP2" node "$INSTALL" register --host=claude
[ -d "$TMP2/.claude/commands/jinhak-harness" ] && ok "--host=claude 단독 등록" || ng "--host 필터 동작 안 함"
[ ! -d "$TMP2/.cursor/commands/jinhak-harness" ] && ok "--host=claude: 다른 호스트 미생성" || ng "다른 호스트가 의도치 않게 생성"
rm -rf "$TMP2"

# ── 7) unregister 라운드트립 ────────────────────────────────
run_capture env HOME="$FAKE_HOME" node "$INSTALL" unregister
[ "$RC" -eq 0 ] && ok "unregister exit 0" || ng "unregister exit=$RC"
for p in "${HOST_PATHS[@]}"; do
  if [ -d "$p" ] && [ -n "$(ls "$p" 2>/dev/null)" ]; then
    ng "unregister 후에도 파일 남음: $p"
  else
    ok "비워짐: ${p##*$FAKE_HOME}"
  fi
done

# ── 8) 알 수 없는 호스트 ────────────────────────────────────
TMP3=$(mktemp -d)
run_capture env HOME="$TMP3" node "$INSTALL" register --host=fakehost
[ "$RC" -eq 2 ] && ok "알 수 없는 호스트 exit 2" || ng "기대 exit 2, 실제 $RC"
rm -rf "$TMP3"

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

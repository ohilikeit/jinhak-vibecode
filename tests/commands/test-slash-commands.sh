#!/usr/bin/env bash
# tests/commands/test-slash-commands.sh — 10개 슬래시 커맨드 정적 검증
#
# 검증 항목:
#  1) commands/<name>.md × 10 존재 + frontmatter 유효 (description / argument-hint / allowed-tools)
#  2) 본문에 `jinhak-harness <name>` 호출선 포함
#  3) 인자 받는 명령은 $ARGUMENTS 플레이스홀더 포함
#  4) Cursor 변환본: frontmatter 없음 (Cursor 규약 — frontmatter 금지)
#  5) Gemini 변환본: TOML 유효 + description + prompt 필드
#  6) 모든 derive 산출물이 canonical과 1:1 매칭
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CANONICAL="$ROOT/commands"
CURSOR="$ROOT/.cursor/commands"
GEMINI="$ROOT/.gemini/commands"

pass=0; fail=0
ok() { pass=$((pass+1)); printf '✅ %s\n' "$1"; }
ng() { fail=$((fail+1)); printf '❌ %s\n' "$1"; }

EXPECTED=(init doctor start plan build verify handoff ship create autopilot register unregister)
EXPECTED_WITH_ARGS=(plan build verify handoff ship autopilot register unregister)
EXPECTED_NO_ARGS=(init doctor start create)

# ── 1) canonical 10개 존재 ─────────────────────────────────────
for cmd in "${EXPECTED[@]}"; do
  f="$CANONICAL/$cmd.md"
  if [ -f "$f" ]; then
    ok "canonical: commands/$cmd.md"
  else
    ng "canonical 누락: $cmd.md"
  fi
done

# ── 2) frontmatter 필드 (description / argument-hint / allowed-tools) ─
for cmd in "${EXPECTED[@]}"; do
  f="$CANONICAL/$cmd.md"
  [ -f "$f" ] || continue
  desc=$(awk '/^---$/{c++; next} c==1 && /^description:/' "$f")
  hint=$(awk '/^---$/{c++; next} c==1 && /^argument-hint:/' "$f")
  tools=$(awk '/^---$/{c++; next} c==1 && /^allowed-tools:/' "$f")
  [ -n "$desc" ] && ok "$cmd: description 있음" || ng "$cmd: description 누락"
  [ -n "$hint" ] && ok "$cmd: argument-hint 있음" || ng "$cmd: argument-hint 누락"
  [ -n "$tools" ] && ok "$cmd: allowed-tools 있음" || ng "$cmd: allowed-tools 누락"
done

# ── 3) 본문에 jinhak-harness <name> 호출 ─────────────────────────
for cmd in "${EXPECTED[@]}"; do
  f="$CANONICAL/$cmd.md"
  [ -f "$f" ] || continue
  if grep -q "jinhak-harness $cmd" "$f"; then
    ok "$cmd: 본문에 jinhak-harness $cmd 호출선"
  else
    ng "$cmd: CLI 호출선 없음"
  fi
done

# ── 4) 인자 받는 명령은 \$ARGUMENTS 사용 ───────────────────────
for cmd in "${EXPECTED_WITH_ARGS[@]}"; do
  f="$CANONICAL/$cmd.md"
  [ -f "$f" ] || continue
  if grep -qF '$ARGUMENTS' "$f"; then
    ok "$cmd: \$ARGUMENTS 플레이스홀더"
  else
    ng "$cmd: \$ARGUMENTS 누락"
  fi
done

# ── 5) Cursor 변환본: frontmatter 없음 ──────────────────────────
for cmd in "${EXPECTED[@]}"; do
  f="$CURSOR/$cmd.md"
  if [ ! -f "$f" ]; then
    ng "Cursor 변환본 없음: $cmd.md"
    continue
  fi
  first_line=$(head -1 "$f")
  if [ "$first_line" = "---" ]; then
    ng "Cursor: $cmd.md — frontmatter 발견 (Cursor 규약 위반)"
  else
    ok "Cursor: $cmd.md — frontmatter 없음"
  fi
done

# ── 6) Gemini 변환본: TOML 유효 ────────────────────────────────
for cmd in "${EXPECTED[@]}"; do
  f="$GEMINI/$cmd.toml"
  if [ ! -f "$f" ]; then
    ng "Gemini 변환본 없음: $cmd.toml"
    continue
  fi
  if grep -q "^description = " "$f" && grep -q "^prompt = " "$f"; then
    ok "Gemini: $cmd.toml — description + prompt 필드"
  else
    ng "Gemini: $cmd.toml — 필수 필드 누락"
  fi
done

# ── 7) derive 생성기를 다시 돌렸을 때 결과가 변하지 않는지 (idempotent) ─
TMP=$(mktemp -d)
cp -r "$CURSOR" "$TMP/cursor.before"
cp -r "$GEMINI" "$TMP/gemini.before"
node "$ROOT/scripts/gen-commands.mjs" >/dev/null
if diff -r "$TMP/cursor.before" "$CURSOR" >/dev/null && \
   diff -r "$TMP/gemini.before" "$GEMINI" >/dev/null; then
  ok "gen-commands.mjs idempotent (재실행해도 결과 동일)"
else
  ng "gen-commands.mjs 재실행 시 산출물 변경 — 비결정성"
fi
rm -rf "$TMP"

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

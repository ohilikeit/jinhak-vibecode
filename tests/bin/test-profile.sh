#!/usr/bin/env bash
# tests/bin/test-profile.sh — 프로필 분기 + --debug-loaded 검증 (ADR-001)
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
INSTALL="$ROOT/bin/install.js"

pass=0; fail=0
ok() { pass=$((pass+1)); printf '✅ %s\n' "$1"; }
ng() { fail=$((fail+1)); printf '❌ %s\n' "$1"; }

run() {
  env -u HARNESS_PROFILE AGENTS_SKILLS_HOME="$ROOT/templates" node "$INSTALL" "$@" --debug-loaded 2>&1
}

# 1) 기본 프로필 = eco
out=$(run)
printf '\n--- default 출력 ---\n%s\n' "$out"
case "$out" in
  *'profile=eco'*) ok "기본 프로필=eco" ;;
  *) ng "기본 프로필 부재 또는 다름" ;;
esac

# 2) --profile=eco: frontmatter > 0, body_loaded=0, body_eligible=0
out=$(run --profile=eco)
printf '\n--- eco 출력 ---\n%s\n' "$out"
fm=$(echo "$out" | grep -oP 'frontmatter_loaded=\K\d+')
bd=$(echo "$out" | grep -oP 'body_loaded=\K\d+')
el=$(echo "$out" | grep -oP 'body_eligible=\K\d+')
[ "$fm" -gt 0 ] && ok "eco: frontmatter_loaded=$fm (>0)" || ng "eco: frontmatter 0개"
[ "$bd" -eq 0 ] && ok "eco: body_loaded=0" || ng "eco: body_loaded=$bd (기대 0)"
[ "$el" -eq 0 ] && ok "eco: body_eligible=0" || ng "eco: body_eligible=$el (기대 0)"

# 3) --profile=power: body_eligible > 0
out=$(run --profile=power)
printf '\n--- power 출력 ---\n%s\n' "$out"
el=$(echo "$out" | grep -oP 'body_eligible=\K\d+')
bd=$(echo "$out" | grep -oP 'body_loaded=\K\d+')
[ "$el" -gt 0 ] && ok "power: body_eligible=$el (>0)" || ng "power: body_eligible 0"
[ "$bd" -eq 0 ] && ok "power: body_loaded=0 (eligible≠loaded)" || ng "power: body_loaded=$bd (기대 0)"

# 4) HARNESS_PROFILE env로도 동작
out=$(env AGENTS_SKILLS_HOME="$ROOT/templates" HARNESS_PROFILE=standard node "$INSTALL" --debug-loaded 2>&1)
case "$out" in
  *'profile=standard'*) ok "HARNESS_PROFILE env로 standard 적용" ;;
  *) ng "HARNESS_PROFILE env 무시됨" ;;
esac

# 5) 잘못된 프로필 → 종료코드 ≠ 0
if env -u HARNESS_PROFILE AGENTS_SKILLS_HOME="$ROOT/templates" node "$INSTALL" --profile=enterprise --debug-loaded 2>/dev/null; then
  ng "잘못된 프로필이 통과됨"
else
  ok "잘못된 프로필 거부 (exit ≠ 0)"
fi

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

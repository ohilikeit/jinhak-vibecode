#!/usr/bin/env bash
# tests/bin/test-cost-label.sh — 토큰 가드 라벨 모듈 검증
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

pass=0; fail=0
ok() { pass=$((pass+1)); printf '✅ %s\n' "$1"; }
ng() { fail=$((fail+1)); printf '❌ %s\n' "$1"; }

probe() {
  node -e "
    const { printCostLabel, costFor } = require('$ROOT/bin/cost-label.js');
    const cmd = '$1';
    const profile = '$2';
    process.stdout.write(costFor(cmd, profile) + '\n');
  "
}

# 1) 기본 커맨드들의 cost 등급
[ "$(probe plan eco)"    = "fast"  ] && ok "plan eco → fast"    || ng "plan eco"
[ "$(probe verify eco)"  = "fast"  ] && ok "verify eco → fast"  || ng "verify eco"
[ "$(probe handoff eco)" = "fast"  ] && ok "handoff eco → fast" || ng "handoff eco"
[ "$(probe ship eco)"    = "fast"  ] && ok "ship eco → fast"    || ng "ship eco"
[ "$(probe start eco)"   = "fast"  ] && ok "start eco → fast"   || ng "start eco"
[ "$(probe build eco)"   = "slow"  ] && ok "build eco → slow (Python spawn)" || ng "build eco"

# 2) power 프로필에서 risky 승급
[ "$(probe verify power)" = "risky" ] && ok "verify power → risky" || ng "verify power"
[ "$(probe build power)"  = "risky" ] && ok "build power → risky"  || ng "build power"

# 3) printCostLabel은 stderr에 출력
out=$(node -e "
  const { printCostLabel } = require('$ROOT/bin/cost-label.js');
  printCostLabel('plan', 'eco');
" 2>&1)
case "$out" in
  '🟢 빠름'*) ok "🟢 라벨 출력" ;;
  *) ng "🟢 라벨 누락: $out" ;;
esac

out=$(node -e "
  const { printCostLabel } = require('$ROOT/bin/cost-label.js');
  printCostLabel('build', 'eco');
" 2>&1)
case "$out" in
  '🟡 느림'*) ok "🟡 라벨 출력 (build)" ;;
  *) ng "🟡 라벨 누락: $out" ;;
esac

out=$(node -e "
  const { printCostLabel } = require('$ROOT/bin/cost-label.js');
  printCostLabel('build', 'power');
" 2>&1)
case "$out" in
  '🔴 할당량 위험'*) ok "🔴 라벨 출력 (power)" ;;
  *) ng "🔴 라벨 누락: $out" ;;
esac

# 4) install.js 디스패치 통합 — 실제 명령 호출 시 라벨이 첫 줄
out=$(node "$ROOT/bin/install.js" plan "$$" 2>&1 || true)
case "$out" in
  '🟢'*) ok "install.js dispatch가 라벨을 첫 줄로 출력" ;;
  *) ng "dispatch 통합 실패" ;;
esac

# 5) doctor/paths/ship/--version/--help 에는 중복 라벨 X
out=$(node "$ROOT/bin/install.js" --version 2>&1)
case "$out" in
  '🟢'*) ng "--version에 중복 라벨 출력됨" ;;
  *) ok "--version은 라벨 미출력 (정보성)" ;;
esac

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

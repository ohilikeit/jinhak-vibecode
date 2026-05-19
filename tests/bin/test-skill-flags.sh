#!/usr/bin/env bash
# tests/bin/test-skill-flags.sh — alwaysApply + user-invocable 검증 (Priority 7)
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

pass=0; fail=0
ok() { pass=$((pass+1)); printf '✅ %s\n' "$1"; }
ng() { fail=$((fail+1)); printf '❌ %s\n' "$1"; }

# 1) skills-loader 가 두 플래그를 파싱하는지
out=$(node -e "
  const { loadSkills } = require('$ROOT/bin/skills-loader.js');
  const skills = loadSkills('$ROOT/templates', 'eco');
  for (const s of skills) {
    console.log(s.name, s.alwaysApply, s.userInvocable);
  }
")
printf '\n--- skills ---\n%s\n--- end ---\n' "$out"

# baseline → alwaysApply: true, user-invocable: false
case "$out" in
  *'baseline true false'*) ok "baseline: alwaysApply=true, userInvocable=false" ;;
  *) ng "baseline 플래그 미반영" ;;
esac

# jobs-pdf-to-excel → alwaysApply: false, user-invocable: true
case "$out" in
  *'jobs-pdf-to-excel false true'*) ok "jobs: alwaysApply=false, userInvocable=true" ;;
  *) ng "jobs 플래그 미반영" ;;
esac

# meeting-notes-to-summary → false, true
case "$out" in
  *'meeting-notes-to-summary false true'*) ok "meeting: false/true" ;;
  *) ng "meeting 플래그 미반영" ;;
esac

# common/utils/pdf-extract → false, false
case "$out" in
  *'common/utils/pdf-extract false false'*) ok "pdf-extract: 둘 다 false (internal utility)" ;;
  *) ng "pdf-extract 플래그 미반영" ;;
esac

# common/utils/xlsx-write → false, false
case "$out" in
  *'common/utils/xlsx-write false false'*) ok "xlsx-write: 둘 다 false (internal utility)" ;;
  *) ng "xlsx-write 플래그 미반영" ;;
esac

# 2) loadAlwaysApply / loadUserInvocable 헬퍼
n=$(node -e "
  const { loadAlwaysApply } = require('$ROOT/bin/skills-loader.js');
  console.log(loadAlwaysApply('$ROOT/templates', 'eco').length);
")
[ "$n" -eq 1 ] && ok "loadAlwaysApply → 1개 (baseline)" || ng "loadAlwaysApply=$n (기대 1)"

n=$(node -e "
  const { loadUserInvocable } = require('$ROOT/bin/skills-loader.js');
  console.log(loadUserInvocable('$ROOT/templates', 'eco').length);
")
[ "$n" -eq 2 ] && ok "loadUserInvocable → 2개 (jobs + meetings)" || ng "loadUserInvocable=$n (기대 2)"

# 3) /doctor가 플래그를 카탈로그에 표시
out=$(AGENTS_SKILLS_HOME="$ROOT/templates/.agents/skills" node "$ROOT/bin/install.js" doctor --refresh 2>&1)
case "$out" in
  *'baseline'*'alwaysApply'*'internal'*) ok "doctor: baseline에 alwaysApply + internal 표시" ;;
  *) ng "doctor 플래그 표시 누락" ;;
esac
case "$out" in
  *'jobs-pdf-to-excel'*'user-invocable'*) ok "doctor: jobs에 user-invocable 표시" ;;
  *) ng "doctor jobs user-invocable 누락" ;;
esac

# 4) 기본값 검증: SKILL.md에 플래그 명시 안 하면 alwaysApply=false, userInvocable=true
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/no-flags"
cat > "$TMP/no-flags/SKILL.md" <<'EOF'
---
name: no-flags-test
description: 플래그 없는 스킬
---
본문
EOF
out=$(node -e "
  const { loadSkills } = require('$ROOT/bin/skills-loader.js');
  const s = loadSkills('$TMP', 'eco')[0];
  console.log(s.alwaysApply, s.userInvocable);
")
case "$out" in
  'false true'*) ok "default: alwaysApply=false, userInvocable=true" ;;
  *) ng "default 값 다름: $out" ;;
esac

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

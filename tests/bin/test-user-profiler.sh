#!/usr/bin/env bash
# tests/bin/test-user-profiler.sh — 8 행동 차원 user-profiler (Priority 8)
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

pass=0; fail=0
ok() { pass=$((pass+1)); printf '✅ %s\n' "$1"; }
ng() { fail=$((fail+1)); printf '❌ %s\n' "$1"; }

# Node로 profileFrom() 호출 후 JSON 출력
probe() {
  node -e "
    const { profileFrom } = require('$ROOT/bin/user-profiler.js');
    const a = $1;
    process.stdout.write(JSON.stringify(profileFrom(a)));
  "
}

# 1) 기획자 + 격식 + 다도구 (협업 + 기록 선호 + 검증 강함)
OUT=$(probe "{ role: '기획', repetitive_tasks: '채용공고 정리', output_format: 'Excel', company_tone: '존댓말 격식', tools: ['Gmail', 'Notion', 'Slack'] }")
echo "기획자 출력: $OUT"
case "$OUT" in
  *'"verbosity":4'*) ok "기획자 상세(verbosity=4 — Excel은 보고서급 bump 없음)" ;;
  *) ng "기획자 verbosity 다름" ;;
esac
case "$OUT" in
  *'"verification_rigor":5'*) ok "격식+Excel → verification_rigor=5" ;;
  *) ng "verification_rigor 다름" ;;
esac
case "$OUT" in
  *'"collaboration_style":5'*) ok "Slack+Notion → collaboration_style=5" ;;
  *) ng "collaboration_style 다름" ;;
esac
case "$OUT" in
  *'"documentation_pref":4'*) ok "Notion → documentation_pref=4" ;;
  *) ng "documentation_pref 다름" ;;
esac
case "$OUT" in
  *'"tool_familiarity":5'*) ok "도구 3개 → tool_familiarity=5" ;;
  *) ng "tool_familiarity 다름" ;;
esac

# 2) 디자이너 + 캐주얼 + 도구 1개 (간결 + 빠름 + 낮은 협업)
OUT=$(probe "{ role: '디자인', repetitive_tasks: '시안 정리', output_format: '이메일', company_tone: '캐주얼', tools: ['Figma'] }")
echo "디자이너 출력: $OUT"
case "$OUT" in
  *'"verbosity":1'*) ok "디자이너+이메일 → verbosity=1 (간결)" ;;
  *) ng "디자이너 verbosity 다름" ;;
esac
case "$OUT" in
  *'"speed":4'*) ok "캐주얼 → speed=4" ;;
  *) ng "speed 다름" ;;
esac
case "$OUT" in
  *'"collaboration_style":2'*) ok "Figma만 → collaboration_style=2" ;;
  *) ng "collaboration_style 다름" ;;
esac
case "$OUT" in
  *'"tool_familiarity":2'*) ok "도구 1개 → tool_familiarity=2" ;;
  *) ng "tool_familiarity 다름" ;;
esac

# 3) 도메인 보존 + 1-5 범위 (clamp)
OUT=$(probe "{ role: '재무', repetitive_tasks: '계정', output_format: '메모', company_tone: '캐주얼', tools: [] }")
case "$OUT" in
  *'"domain":"재무"'*) ok "도메인 보존: 재무" ;;
  *) ng "도메인 보존 실패" ;;
esac
case "$OUT" in
  *'"tool_familiarity":1'*) ok "도구 0개 → tool_familiarity=1" ;;
  *) ng "tool_familiarity (도구 없음) 다름" ;;
esac
case "$OUT" in
  *'"error_tolerance":2'*) ok "메모 → error_tolerance=2" ;;
  *) ng "error_tolerance 다름" ;;
esac

# 4) /start와 통합 — user-profile.md에 behavior_profile 섹션이 들어있는지
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
export HARNESS_HOME="$TMP/harness-home"
mkdir -p "$TMP/work" && cd "$TMP/work"
printf '기획\n채용공고 정리\nExcel\n존댓말\nGmail, Notion, Slack\n' | \
  node "$ROOT/bin/install.js" start >/dev/null 2>&1

PROFILE="$HARNESS_HOME/user-profile.md"
[ -f "$PROFILE" ] && ok "user-profile.md 생성" || ng "프로필 누락"
grep -q '^behavior_profile:' "$PROFILE" && ok "behavior_profile YAML 섹션" || ng "YAML 섹션 누락"
grep -q '## 행동 차원' "$PROFILE" && ok "마크다운 본문에 행동 차원 섹션" || ng "마크다운 섹션 누락"
grep -qE '^- 상세도\(verbosity\): [1-5]' "$PROFILE" && ok "verbosity 1-5 범위" || ng "verbosity 범위 다름"
grep -qE '^- 도구 친숙도\(tool_familiarity\): 5' "$PROFILE" && ok "Gmail+Notion+Slack → tool_familiarity=5" || ng "tool_familiarity 추론 실패"

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

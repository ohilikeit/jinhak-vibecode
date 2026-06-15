#!/usr/bin/env bash
# tests/bin/test-render-digest.sh — bin/render-digest.js + personal-context.js 검증
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
RENDER="$ROOT/bin/render-digest.js"

pass=0; fail=0
note() { printf '  → %s\n' "$1"; }
ok()   { pass=$((pass + 1)); printf '✅ %s\n' "$1"; }
ng()   { fail=$((fail + 1)); printf '❌ %s\n' "$1"; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# user-profile.md (/start 산출물) 픽스처
cat > "$TMP/user-profile.md" <<'EOF'
---
created: 2026-06-04T00:00:00.000Z
role: 'AI개발자'
behavior_profile:
  verbosity: 3             # 간결(1) ↔ 상세(5)
  speed: 2                 # 빠름(1) ↔ 꼼꼼(5)
  verification_rigor: 5    # 가볍게(1) ↔ 엄격히(5)
---
# 사용자 프로필
EOF

# 1) 프로필만 있을 때 — eco 폴백 다이제스트(전체주입 마커 없음)
out="$(HARNESS_HOME="$TMP" node "$RENDER")"
note "$(printf '%s' "$out" | head -c 80)"
case "$out" in *'직군 AI개발자'*) ok "eco 폴백: 직군 포함" ;; *) ng "eco 폴백: 직군 누락" ;; esac
case "$out" in *'검증강도 5/5'*) ok "eco 폴백: 행동차원 포함" ;; *) ng "행동차원 누락" ;; esac
case "$out" in *'위 컨텍스트를 반영'*) ng "personal-context 없는데 full 마커 노출" ;; *) ok "eco 폴백: full 마커 없음" ;; esac

# personal-context.md (/interview 산출물) 픽스처 추가
cat > "$TMP/personal-context.md" <<'EOF'
---
created: 2026-06-15T00:00:00.000Z
mode: full
priorities:
  - 'CATCH MAU 700만 달성'
  - '수시 합격예측 모델 고도화'
proactive_flags:
  - '교육부 입시 개편 발표'
tone: '직접적'
pushback_style: '직접 반론'
language_pref: '한국어'
suppressed_topics:
  - '인사 관련 사항'
---
# 개인 컨텍스트
EOF

# 2) personal-context 있을 때 — full 모드(전체 주입)
out="$(HARNESS_HOME="$TMP" node "$RENDER")"
case "$out" in *'우선순위: 1) CATCH MAU 700만 달성'*) ok "full: 우선순위 주입" ;; *) ng "full: 우선순위 누락" ;; esac
case "$out" in *'어조 직접적'*'반론 직접 반론'*) ok "full: 어조/반론 주입" ;; *) ng "full: 어조/반론 누락" ;; esac
case "$out" in *'선제 알림: 교육부 입시 개편 발표'*) ok "full: 선제 알림 주입" ;; *) ng "full: 선제 알림 누락" ;; esac
case "$out" in *'다루지 않을 주제(주의): 인사 관련 사항'*) ok "full: 회피 주제 주입" ;; *) ng "full: 회피 주제 누락" ;; esac
case "$out" in *'위 컨텍스트를 반영'*) ok "full: 반영 지시 마커 포함" ;; *) ng "full: 반영 마커 누락" ;; esac

# 3) HARNESS_CONTEXT_MODE=eco 강제 — full 마커 사라짐
out="$(HARNESS_HOME="$TMP" HARNESS_CONTEXT_MODE=eco node "$RENDER")"
case "$out" in *'위 컨텍스트를 반영'*) ng "강제 eco인데 full 마커 노출" ;; *) ok "강제 eco: full 모드 비활성" ;; esac
case "$out" in *'우선순위: 1) CATCH'*) ok "강제 eco: 우선순위는 유지" ;; *) ng "강제 eco: 우선순위 누락" ;; esac

# 4) 프로필 전무 — 빈 출력 + exit 0
EMPTY="$(mktemp -d)"
out="$(HARNESS_HOME="$EMPTY" node "$RENDER"; echo "rc=$?")"
rm -rf "$EMPTY"
case "$out" in 'rc=0') ok "프로필 없음: 빈 출력 + exit 0" ;; *) ng "프로필 없음 처리 실패: $out" ;; esac

# 5) full cap(1800자) 준수 — 긴 우선순위로 검증
python3 - "$TMP/personal-context.md" <<'PY'
import sys
big = "x" * 5000
with open(sys.argv[1], "w", encoding="utf-8") as f:
    f.write("---\npriorities:\n  - '%s'\n---\n# c\n" % big)
PY
out="$(HARNESS_HOME="$TMP" node "$RENDER")"
len=${#out}
if [ "$len" -le 1810 ]; then ok "full cap 준수 (${len}자 ≤ 1810)"; else ng "full cap 초과: ${len}자"; fi

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

#!/usr/bin/env bash
# tests/commands/test-interview.sh — /interview 심화 인터뷰 커맨드 검증
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CLI="$ROOT/bin/install.js"

pass=0; fail=0
note() { printf '  → %s\n' "$1"; }
ok()   { pass=$((pass + 1)); printf '✅ %s\n' "$1"; }
ng()   { fail=$((fail + 1)); printf '❌ %s\n' "$1"; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
PC="$TMP/personal-context.md"

# CORE 7문항 답변 (선택형은 번호)
core_answers() {
  printf '%s\n' \
    'CATCH MAU 700만 달성, 수시 모델 고도화' \
    '학생 데이터 보안' \
    '교육부 입시 개편 발표' \
    '4' \
    '1' \
    '1' \
    '인사 관련 사항'
}

# 1) 인터뷰 실행 → personal-context.md 생성
core_answers | HARNESS_HOME="$TMP" node "$CLI" interview >/dev/null 2>&1 || true
[ -f "$PC" ] && ok "personal-context.md 생성" || ng "파일 미생성: $PC"

# 2) 구조화 필드 저장 확인
grep -q "priorities:" "$PC" && ok "우선순위 저장" || ng "우선순위 누락"
grep -q "CATCH MAU 700만 달성" "$PC" && ok "우선순위 값 저장" || ng "우선순위 값 누락"
grep -q "tone: '직접적'" "$PC" && ok "어조 선택 매핑(4→직접적)" || ng "어조 매핑 실패"
grep -q "pushback_style: '직접 반론'" "$PC" && ok "반론 매핑(1→직접 반론)" || ng "반론 매핑 실패"
grep -q "language_pref: '한국어'" "$PC" && ok "언어 매핑(1→한국어)" || ng "언어 매핑 실패"
grep -q "suppressed_topics:" "$PC" && ok "회피 주제 저장" || ng "회피 주제 누락"
grep -q "mode: full" "$PC" && ok "full 모드 표기" || ng "mode 표기 누락"

# 3) 재실행(--force 없음) → 건너뜀
out="$(printf 'x\n' | HARNESS_HOME="$TMP" node "$CLI" interview 2>&1 || true)"
case "$out" in *'기존 개인 컨텍스트 사용'*) ok "재실행 시 기존 컨텍스트 보존" ;; *) ng "재실행 보존 실패: $out" ;; esac

# 4) --exec 임원팩 포함
TMP2="$(mktemp -d)"
printf '%s\n' \
  '목표A' '관심B' '알림C' '4' '1' '1' '주제D' \
  '진학사, 수능' '유웨이 신제품' '' '' \
  | HARNESS_HOME="$TMP2" node "$CLI" interview --exec >/dev/null 2>&1 || true
grep -q "press_keywords:" "$TMP2/personal-context.md" && ok "--exec: 언론 키워드 저장" || ng "--exec: 언론 키워드 누락"
grep -q "competitor_triggers:" "$TMP2/personal-context.md" && ok "--exec: 경쟁사 동향 저장" || ng "--exec: 경쟁사 동향 누락"
rm -rf "$TMP2"

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

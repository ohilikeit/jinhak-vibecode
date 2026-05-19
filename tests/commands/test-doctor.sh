#!/usr/bin/env bash
# tests/commands/test-doctor.sh — /doctor 통합 진단 검증
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
INSTALL="$ROOT/bin/install.js"
PY="${JINHAK_PYTHON:-$ROOT/.venv-dev/bin/python3}"

TMP=$(mktemp -d -t jinhak-doctor-XXXXXX)
trap 'rm -rf "$TMP"' EXIT
export HARNESS_HOME="$TMP/harness-home"
export AGENTS_SKILLS_HOME="$ROOT/templates/.agents/skills"
cd "$TMP"

# venv-dev의 python3에 PATH 우선권 부여 — 일반 python3은 pdfplumber/openpyxl 없을 수 있음
export PATH="$ROOT/.venv-dev/bin:$PATH"

pass=0; fail=0
ok() { pass=$((pass+1)); printf '✅ %s\n' "$1"; }
ng() { fail=$((fail+1)); printf '❌ %s\n' "$1"; }
run_capture() { OUT=$("$@" 2>&1) && RC=0 || RC=$?; }

# A. 정상 시나리오 (모든 의존성 깔린 venv-dev)
run_capture node "$INSTALL" doctor --refresh
printf '\n--- A. doctor 출력 ---\n%s\n(exit %d)\n' "$OUT" "$RC"

# 6개 섹션 모두 존재
for section in '## 1. 환경' '## 2. 프로필' '## 3. 의존성' '## 4. 스킬 카탈로그' '## 5. 메모리' '## 6. 최근 활동' '## 진단 결과'; do
  case "$OUT" in
    *"$section"*) ok "섹션 존재: $section" ;;
    *) ng "섹션 누락: $section" ;;
  esac
done

# HARNESS_HOME / profile=eco / dry_run_enforced=true 표시
case "$OUT" in
  *"HARNESS_HOME: $HARNESS_HOME"*) ok "HARNESS_HOME 정확" ;;
  *) ng "HARNESS_HOME 출력 누락" ;;
esac
case "$OUT" in
  *'profile: eco'*) ok "기본 프로필=eco" ;;
  *) ng "프로필 표시 누락" ;;
esac
case "$OUT" in
  *'dry_run_enforced: true'*) ok "dry-run 강제 표시" ;;
  *) ng "dry-run 표시 누락" ;;
esac

# 의존성 5개 모두 ✅
for dep in python3 pdfplumber openpyxl pandas uv; do
  case "$OUT" in
    *"✅ $dep"*) ok "deps ✅ $dep" ;;
    *) ng "deps $dep 누락 또는 실패" ;;
  esac
done

# 스킬 카탈로그에 jobs-pdf-to-excel
case "$OUT" in
  *'jobs-pdf-to-excel'*) ok "스킬 카탈로그에 jobs-pdf-to-excel" ;;
  *) ng "스킬 카탈로그 누락" ;;
esac

# 최종 진단 메시지
case "$OUT" in
  *'🎉 모두 정상'*) ok "최종 정상 진단" ;;
  *'⚠️'*|*'🛠'*) ok "최종 경고/오류 진단 (정상도 허용)" ;;
  *) ng "최종 진단 메시지 누락" ;;
esac

# B. --profile=power 적용
run_capture node "$INSTALL" doctor --profile=power
case "$OUT" in
  *'profile: power'*) ok "power 프로필 적용" ;;
  *) ng "power 프로필 미반영" ;;
esac
case "$OUT" in
  *'benchmark: on-explicit'*) ok "power benchmark 값 표시" ;;
  *) ng "power budget 누락" ;;
esac

# C. 의존성 실패 시나리오 — PATH에서 모든 도구 제거
run_capture env -i HOME="$TMP" PATH=/usr/bin:/bin HARNESS_HOME="$TMP/harness-home2" AGENTS_SKILLS_HOME="$AGENTS_SKILLS_HOME" node "$INSTALL" doctor --refresh
printf '\n--- C. deps 실패 시나리오 ---\n%s\n(exit %d)\n' "$OUT" "$RC"
case "$OUT" in
  *'❌'*'미설치'*) ok "의존성 미설치 ❌ 표기" ;;
  *) ng "❌ 미설치 표기 누락" ;;
esac
case "$OUT" in
  *'🛠'*) ok "오류 진단 메시지" ;;
  *) ng "오류 진단 누락" ;;
esac
[ "$RC" -eq 1 ] && ok "deps 미설치 시 exit 1" || ng "exit=$RC (기대 1)"

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

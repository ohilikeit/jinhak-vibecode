#!/usr/bin/env bash
# tests/commands/test-create.sh — Skill Creator (Priority 3)
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
INSTALL="$ROOT/bin/install.js"

TMP=$(mktemp -d -t jinhak-create-XXXXXX)
trap 'rm -rf "$TMP"' EXIT
export HARNESS_HOME="$TMP/harness-home"
cd "$TMP"

pass=0; fail=0
ok() { pass=$((pass+1)); printf '✅ %s\n' "$1"; }
ng() { fail=$((fail+1)); printf '❌ %s\n' "$1"; }

# 6 답변 mock (계약서 PDF → CSV 자동화)
out=$(printf 'contract-pdf-to-csv\n계약서 PDF 정리\ninbox/contracts\npdf\noutput/contracts.csv\n계약일, 회사명, 금액, 만료일\n' | \
  node "$INSTALL" create 2>&1)
printf '\n--- create 출력 ---\n%s\n--- end ---\n\n' "$out"

SKILL="$HARNESS_HOME/user-skills/contract-pdf-to-csv/SKILL.md"
[ -f "$SKILL" ] && ok "SKILL.md 생성: $SKILL" || ng "SKILL.md 누락"

printf '\n--- SKILL.md ---\n%s\n--- end ---\n\n' "$(cat "$SKILL")"

grep -q '^name: contract-pdf-to-csv$' "$SKILL" && ok "이름 정확" || ng "이름 누락"
grep -q '^user-invocable: true$' "$SKILL" && ok "user-invocable: true" || ng "user-invocable 누락"
grep -q '^alwaysApply: false$' "$SKILL" && ok "alwaysApply: false" || ng "alwaysApply 누락"
grep -q 'common/utils/pdf-extract' "$SKILL" && ok "pdf-extract 자동 추론" || ng "pdf-extract 누락"
grep -q 'common/utils/csv-write' "$SKILL" && ok "csv-write 자동 추론" || ng "csv-write 누락"
grep -q '## 컨텍스트' "$SKILL" && ok "## 컨텍스트 섹션" || ng "컨텍스트 섹션 누락"
grep -q '## I/O 형식' "$SKILL" && ok "## I/O 형식 섹션" || ng "I/O 섹션 누락"
grep -q '## 효과 단계' "$SKILL" && ok "## 효과 단계 섹션" || ng "효과 단계 섹션 누락"
grep -q '## 사용자 수정' "$SKILL" && ok "## 사용자 수정 (필드) 섹션" || ng "사용자 수정 섹션 누락"
for field in 계약일 회사명 금액 만료일; do
  grep -q "\`$field\`" "$SKILL" && ok "필드 '$field' 포함" || ng "필드 '$field' 누락"
done

# 입력 폴더/확장자/출력 경로 보존
grep -q 'inbox/contracts' "$SKILL" && ok "입력 폴더 보존" || ng "입력 폴더 누락"
grep -qF '.pdf' "$SKILL" && ok ".pdf 보존" || ng ".pdf 누락"
grep -q 'output/contracts.csv' "$SKILL" && ok "출력 경로 보존" || ng "출력 경로 누락"

# 잘못된 이름 거부 (한글 / 공백)
out=$(printf '잘못된 이름\nx\nx\npdf\nx\nx\n' | \
  node "$INSTALL" create 2>&1 || true)
case "$out" in
  *'영문 케밥-케이스만 허용'*) ok "잘못된 이름 거부" ;;
  *) ng "잘못된 이름 거부 실패: $out" ;;
esac

# 다른 조합: txt → md (utils 없음)
rm -rf "$HARNESS_HOME/user-skills"
out=$(printf 'memo-to-todo\nTODO 모으기\ninbox/memos\ntxt\noutput/todos.md\nTODO\n' | \
  node "$INSTALL" create 2>&1)
SKILL2="$HARNESS_HOME/user-skills/memo-to-todo/SKILL.md"
[ -f "$SKILL2" ] && ok "두 번째 스킬 생성" || ng "두 번째 스킬 실패"
# txt->md 은 requires 비어야 함
grep -q '^requires:$' "$SKILL2" && grep -A 1 '^requires:$' "$SKILL2" | grep -q '\[\]' && ok "txt->md: requires 비어있음" || ng "requires 비어있지 않음"

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

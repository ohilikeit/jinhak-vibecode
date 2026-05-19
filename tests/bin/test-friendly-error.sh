#!/usr/bin/env bash
# tests/bin/test-friendly-error.sh — 친절 실패 리포트 모듈 검증
# REPORT_06 §4 #8: LLM 호출 0, 변수 치환만으로 사용자 친화 메시지 생성
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

pass=0; fail=0
ok() { pass=$((pass+1)); printf '✅ %s\n' "$1"; }
ng() { fail=$((fail+1)); printf '❌ %s\n' "$1"; }

# Node 인라인 평가로 각 템플릿 결과를 확인
eval_tpl() {
  node -e "
    const { formatError, HarnessError } = require('$ROOT/bin/friendly-error.js');
    const err = $1;
    process.stdout.write(formatError(err));
  "
}

# 1) inbox-not-found
OUT=$(eval_tpl "new HarnessError('inbox-not-found', 'x', { path: '/tmp/inbox', skill: 'jobs-pdf-to-excel' })")
case "$OUT" in
  *'입력 폴더를 찾지 못했어요'*'/tmp/inbox'*'jobs-pdf-to-excel'*'--inbox'*) ok "inbox-not-found 치환 정확" ;;
  *) ng "inbox-not-found 누락:\n$OUT" ;;
esac

# 2) inbox-empty
OUT=$(eval_tpl "new HarnessError('inbox-empty', 'x', { path: '/tmp/inbox', kind: 'PDF', ext: '.pdf' })")
case "$OUT" in
  *'폴더는 있지만 PDF이 하나도 없어요'*'.pdf'*) ok "inbox-empty 치환 정확" ;;
  *) ng "inbox-empty:\n$OUT" ;;
esac

# 3) template-not-found
OUT=$(eval_tpl "new HarnessError('template-not-found', 'x', { path: '/tmp/template.xlsx' })")
case "$OUT" in
  *'회사 양식 파일'*'/tmp/template.xlsx'*'--template'*) ok "template-not-found 치환 정확" ;;
  *) ng "template-not-found:\n$OUT" ;;
esac

# 4) output-not-found
OUT=$(eval_tpl "new HarnessError('output-not-found', 'x', { path: '/tmp/out.xlsx' })")
case "$OUT" in
  *'산출물 파일을 찾지 못했어요'*'/tmp/out.xlsx'*'/build'*) ok "output-not-found 치환" ;;
  *) ng "output-not-found:\n$OUT" ;;
esac

# 5) skill-not-matched (supported 배열)
OUT=$(eval_tpl "new HarnessError('skill-not-matched', 'x', { request: '아무거나', supported: [{ skill: 'jobs', keywords: ['공고','PDF'] }, { skill: 'memo', keywords: ['회의'] }] })")
case "$OUT" in
  *'아무거나'*'jobs'*'공고, PDF'*'memo'*'회의'*) ok "skill-not-matched 다행 치환" ;;
  *) ng "skill-not-matched:\n$OUT" ;;
esac

# 6) unknown 폴백
OUT=$(eval_tpl "new Error('완전 미상 에러 메시지')")
case "$OUT" in
  *'완전 미상 에러 메시지'*'복사해서 도움을 요청'*) ok "unknown 폴백 메시지" ;;
  *) ng "unknown:\n$OUT" ;;
esac

# 7) code가 정의되지 않은 사용자 정의 에러도 unknown으로
OUT=$(eval_tpl "new HarnessError('does-not-exist', '뭔가 잘못됨')")
case "$OUT" in
  *'뭔가 잘못됨'*) ok "미정의 code는 unknown 폴백" ;;
  *) ng "미정의 code 폴백 실패:\n$OUT" ;;
esac

# 8) LLM 호출이 없음을 정적 검증 — anthropic/openai/fetch 모두 부재
if grep -qE '(anthropic|openai|fetch\(|@anthropic-ai)' "$ROOT/bin/friendly-error.js"; then
  ng "친절 리포트에 LLM 호출 흔적"
else
  ok "LLM 호출 0건 (변수 치환만 사용)"
fi

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

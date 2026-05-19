#!/usr/bin/env bash
# tests/bin/test-memory.sh — Memory facade (Priority 5)
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

TMP=$(mktemp -d -t jinhak-mem-XXXXXX)
trap 'rm -rf "$TMP"' EXIT
export HARNESS_HOME="$TMP/harness-home"

pass=0; fail=0
ok() { pass=$((pass+1)); printf '✅ %s\n' "$1"; }
ng() { fail=$((fail+1)); printf '❌ %s\n' "$1"; }

probe() {
  HARNESS_HOME="$HARNESS_HOME" node -e "$1"
}

# 1) saveDecision → recallProject 한 사이클
probe "
  const m = require('$ROOT/bin/memory.js');
  m.saveDecision('test_key', { foo: 'bar' });
  const proj = m.recallProject();
  process.stdout.write(JSON.stringify({
    has_key: 'test_key' in (proj.decisions || {}),
    value: proj.decisions.test_key,
  }));
" > "$TMP/out1.json"
out=$(cat "$TMP/out1.json")
case "$out" in
  *'"has_key":true'*'"foo":"bar"'*) ok "saveDecision → recallProject 한 사이클" ;;
  *) ng "saveDecision/recallProject: $out" ;;
esac

# 2) 결정 파일이 jsonl 형식
DEC="$HARNESS_HOME/memory/decisions.jsonl"
[ -f "$DEC" ] && ok "decisions.jsonl 생성" || ng "decisions.jsonl 누락"

# 3) summarizeSession
sum=$(probe "
  const m = require('$ROOT/bin/memory.js');
  m.saveDecision('k2', 1);
  m.saveDecision('k3', 'three');
  process.stdout.write(JSON.stringify(m.summarizeSession()));
")
echo "summarize: $sum"
case "$sum" in
  *'"decision_count_project":3'*) ok "summarize: 프로젝트 결정 3건" ;;
  *) ng "summarize 결정 수 오류" ;;
esac
case "$sum" in
  *'"keys":["test_key","k2","k3"]'*) ok "summarize: keys 보존" ;;
  *) ng "summarize keys 다름" ;;
esac

# 4) forget
forgot=$(probe "
  const m = require('$ROOT/bin/memory.js');
  const ok1 = m.forget('k2');
  const proj = m.recallProject();
  process.stdout.write(JSON.stringify({ ok: ok1, has_k2: 'k2' in (proj.decisions || {}) }));
")
case "$forgot" in
  *'"ok":true'*'"has_k2":false'*) ok "forget(k2) 동작" ;;
  *) ng "forget: $forgot" ;;
esac

# 5) 없는 키 forget → false
fail2=$(probe "
  const m = require('$ROOT/bin/memory.js');
  process.stdout.write(String(m.forget('does_not_exist')));
")
[ "$fail2" = "false" ] && ok "없는 키 forget → false" || ng "없는 키 forget=$fail2"

# 6) 프로젝트 격리 — 다른 cwd는 다른 프로젝트
probe "
  const m = require('$ROOT/bin/memory.js');
  m.saveDecision('cwd_a_key', 'A', { cwd: '/tmp/dirA' });
  m.saveDecision('cwd_b_key', 'B', { cwd: '/tmp/dirB' });
  const a = m.recallProject({ cwd: '/tmp/dirA' });
  const b = m.recallProject({ cwd: '/tmp/dirB' });
  process.stdout.write(JSON.stringify({
    a_has_a: 'cwd_a_key' in a.decisions,
    a_has_b: 'cwd_b_key' in a.decisions,
    b_has_a: 'cwd_a_key' in b.decisions,
    b_has_b: 'cwd_b_key' in b.decisions,
  }));
" > "$TMP/iso.json"
iso=$(cat "$TMP/iso.json")
case "$iso" in
  *'"a_has_a":true'*'"a_has_b":false'*'"b_has_a":false'*'"b_has_b":true'*)
    ok "프로젝트 cwd 격리" ;;
  *) ng "프로젝트 격리: $iso" ;;
esac

# 7) /handoff --confirm 후 memory에 last_handoff 기록되는지
unset JINHAK_PYTHON || true
PY="$ROOT/.venv-dev/bin/python3"
NEW_CWD=$(mktemp -d)
cd "$NEW_CWD"
mkdir -p inbox/jobs assets output
"$PY" "$ROOT/test-fixtures/make-jobs-pdf.py" inbox/jobs/01.pdf "x" "X" "x" "x" "x" >/dev/null
"$PY" "$ROOT/test-fixtures/make-5col-template.py" assets/template.xlsx >/dev/null
JINHAK_PYTHON="$PY" node "$ROOT/bin/install.js" build "채용공고 Excel" >/dev/null 2>&1
JINHAK_PYTHON="$PY" node "$ROOT/bin/install.js" handoff --confirm >/dev/null 2>&1

sum=$(probe "
  const m = require('$ROOT/bin/memory.js');
  process.stdout.write(JSON.stringify(m.recallProject({ cwd: '$NEW_CWD' })));
")
case "$sum" in
  *'"last_handoff"'*'"label":"jobs"'*) ok "/handoff --confirm → memory.saveDecision(last_handoff)" ;;
  *) ng "handoff → memory 미연동: $sum" ;;
esac
cd - >/dev/null
rm -rf "$NEW_CWD"

# 8) /doctor에 메모리 섹션 표시
out=$(AGENTS_SKILLS_HOME="$ROOT/templates/.agents/skills" node "$ROOT/bin/install.js" doctor 2>&1)
case "$out" in
  *'## 5. 메모리'*) ok "doctor: 메모리 섹션" ;;
  *) ng "doctor 메모리 섹션 누락" ;;
esac
case "$out" in
  *'memory_root'*) ok "doctor: memory_root 표시" ;;
  *) ng "memory_root 누락" ;;
esac

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

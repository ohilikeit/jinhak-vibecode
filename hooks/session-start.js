#!/usr/bin/env node
'use strict';

// jinhak-harness — session-start 훅의 크로스플랫폼 Node 엔진 (단일 두뇌)
// bash(hooks/session-start) 와 PowerShell(hooks/session-start.ps1) 래퍼가 모두 이걸
// 호출한다. Node는 하네스 동작에 항상 존재하므로 OS 무관하게 동일 출력을 보장.
//
// 출력: 호스트별 JSON 스키마(Cursor / Claude Code / Copilot·SDK)로 부트스트랩 컨텍스트
//   + baseline(alwaysApply) 본문 + 개인 컨텍스트(인터뷰모드) 다이제스트를 합성.
// 이스케이프는 JSON.stringify가 안전하게 처리(제어문자 포함).
//
// 설계 원칙: 절대 throw 하지 않는다 — 최소한 정적 부트스트랩은 항상 출력.

const fs = require('node:fs');
const path = require('node:path');

const HOOK_DIR = __dirname;
const CAP_TOKENS_CHARS = 800; // baseline 본문 합성 상한(자) — 전체 컨텍스트 cap 보호

// ── 정적 부트스트랩 (bash 훅과 동일 문구) ─────────────────────────
const BOOTSTRAP = [
  '[jinhak-harness] 비개발자 직군 자동화 하니스가 활성화되었습니다.',
  '',
  '원칙:',
  '- 한국어 우선, 친절한 실패 리포트(변수 치환 템플릿)',
  '- 기본 프로필=eco · Dry-run 강제 · 외부 전송/삭제는 명시 승인 필요',
  '- 첫 실행이면 `/start`로 5분 직군 인터뷰부터 진행하세요',
  '',
  '커맨드: /start /interview /plan /build /autopilot /verify /ship /handoff /create /init /doctor',
  '환경: HARNESS_HOME, AGENTS_SKILLS_HOME 로 데이터 위치 제어 (HARNESS_DEV=1 이면 dev-home 사용)',
].join('\n');

// ── baseline(alwaysApply) 본문 동적 합성 ──────────────────────────
function baselineBody() {
  const candidates = [
    process.env.AGENTS_SKILLS_HOME
      ? path.join(process.env.AGENTS_SKILLS_HOME, 'baseline', 'SKILL.md')
      : '',
    path.join(HOOK_DIR, '..', 'templates', '.agents', 'skills', 'baseline', 'SKILL.md'),
    path.join(
      process.env.HARNESS_HOME || path.join(require('node:os').homedir(), '.harness'),
      'agents',
      'skills',
      'baseline',
      'SKILL.md',
    ),
  ];
  for (const file of candidates) {
    if (!file) continue;
    let text;
    try {
      text = fs.readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    // frontmatter 제거: 첫 `---` ~ 둘째 `---` 사이 스킵, 이후 본문
    const lines = text.split('\n');
    let dashes = 0;
    const body = [];
    for (const line of lines) {
      if (line === '---') {
        dashes++;
        continue;
      }
      if (dashes >= 2) body.push(line);
    }
    let b = body.join('\n').trim();
    if (b) {
      if (b.length > CAP_TOKENS_CHARS) b = b.slice(0, CAP_TOKENS_CHARS);
      return b;
    }
    return '';
  }
  return '';
}

// ── 개인 컨텍스트(인터뷰모드) 다이제스트 ──────────────────────────
function personalContext() {
  try {
    const { harnessHome } = require('../bin/paths.js');
    const { buildDigest, personalContextPath } = require('../bin/personal-context.js');
    const home = harnessHome();
    const hasInterview = fs.existsSync(personalContextPath(home));
    const forceEco = (process.env.HARNESS_CONTEXT_MODE || '').toLowerCase() === 'eco';
    return buildDigest(home, { full: hasInterview && !forceEco });
  } catch {
    return '';
  }
}

function buildContext() {
  let s = BOOTSTRAP;
  try {
    const base = baselineBody();
    if (base) s += `\n\n--- baseline (alwaysApply) ---\n${base}`;
  } catch {
    /* baseline 합성 실패는 무시 — 부트스트랩은 유지 */
  }
  try {
    const digest = personalContext();
    if (digest) s += `\n\n--- 개인 컨텍스트 (인터뷰모드) ---\n${digest}`;
  } catch {
    /* 개인 컨텍스트 주입 실패는 세션을 막지 않음 */
  }
  return s;
}

// ── 호스트별 JSON 스키마 분기 (bash 훅과 동일) ────────────────────
function emit(s) {
  const env = process.env;
  let payload;
  if (env.CURSOR_PLUGIN_ROOT) {
    payload = { additional_context: s };
  } else if (env.CLAUDE_PLUGIN_ROOT && !env.COPILOT_CLI) {
    payload = {
      hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: s },
    };
  } else {
    payload = { additionalContext: s };
  }
  process.stdout.write(JSON.stringify(payload));
}

try {
  emit(buildContext());
} catch {
  // 최후의 폴백 — 정적 부트스트랩만이라도 유효 JSON으로 출력
  try {
    emit(BOOTSTRAP);
  } catch {
    process.exit(0);
  }
}

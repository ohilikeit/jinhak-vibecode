'use strict';

// jinhak-harness — /doctor
// 환경·의존성·프로필·스킬 카탈로그를 한 번에 진단하고 한국어 리포트를 출력한다.
// 모든 정보는 기존 모듈(lazy-deps / profile / skills-loader)에서 재사용한다.

const fs = require('node:fs');
const path = require('node:path');

const { harnessHome, agentsSkillsHome, isDevMode } = require('../paths.js');
const { resolveProfile, budgetFor } = require('../profile.js');
const { loadSkills } = require('../skills-loader.js');
const { detectAll, hintFor } = require('../lazy-deps.js');
const memory = require('../memory.js');

function statusLine(label, value, level) {
  const icon = level === 'ok' ? '✅' : level === 'warn' ? '⚠️ ' : level === 'err' ? '❌' : 'ℹ️ ';
  return `${icon} ${label}: ${value}`;
}

function main() {
  const args = process.argv.slice(2);
  const forceRefresh = args.includes('--refresh');

  let issues = 0;
  let warnings = 0;
  const lines = [];

  lines.push('# jinhak-harness /doctor');
  lines.push('');

  // ── 1. 환경 ──────────────────────────────────────────────
  lines.push('## 1. 환경');
  const home = harnessHome();
  const skills = agentsSkillsHome();
  lines.push(statusLine('HARNESS_HOME', home, 'info'));
  lines.push(statusLine('AGENTS_SKILLS_HOME', skills, 'info'));
  lines.push(
    statusLine(
      'HARNESS_DEV',
      isDevMode() ? '1 (격리 개발 모드)' : '(unset, 일반 모드)',
      isDevMode() ? 'ok' : 'info',
    ),
  );
  lines.push(statusLine('cwd', process.cwd(), 'info'));
  lines.push('');

  // ── 2. 프로필 ────────────────────────────────────────────
  lines.push('## 2. 프로필 (ADR-001)');
  let profile;
  try {
    profile = resolveProfile(args);
    const budget = budgetFor(profile);
    lines.push(statusLine('profile', profile, profile === 'eco' ? 'ok' : 'info'));
    lines.push(statusLine('dry_run_enforced', budget.dry_run_enforced ? 'true (외부 전송/삭제 차단)' : 'false', 'ok'));
    lines.push(statusLine('benchmark', budget.benchmark, 'info'));
    lines.push(statusLine('description_tuner', budget.description_tuner, 'info'));
  } catch (err) {
    issues += 1;
    lines.push(statusLine('profile', `해석 실패: ${err.message}`, 'err'));
  }
  lines.push('');

  // ── 3. 의존성 (lazy-deps) ───────────────────────────────
  lines.push('## 3. 의존성');
  const { results, fromCache } = detectAll(forceRefresh);
  lines.push(`(${fromCache ? '캐시 사용 — `--refresh`로 새로 측정 가능' : '새로 측정함'})`);
  for (const [name, info] of Object.entries(results)) {
    if (info.found) {
      lines.push(statusLine(name, info.version, 'ok'));
    } else {
      issues += 1;
      lines.push(statusLine(name, '미설치', 'err'));
      lines.push(`     → ${hintFor(name)}`);
    }
  }
  lines.push('');

  // ── 4. 스킬 카탈로그 ────────────────────────────────────
  lines.push('## 4. 스킬 카탈로그');
  const skillsDir = fs.existsSync(skills)
    ? skills
    : path.resolve(__dirname, '..', '..', 'templates');
  const skillList = loadSkills(skillsDir, profile || 'eco');
  if (skillList.length === 0) {
    warnings += 1;
    lines.push(statusLine('skills_found', `0 (스킬 디렉터리: ${skillsDir})`, 'warn'));
  } else {
    lines.push(statusLine('skills_dir', skillsDir, 'info'));
    lines.push(statusLine('skills_found', String(skillList.length), 'ok'));
    for (const s of skillList) {
      const flags = [];
      if (s.alwaysApply) flags.push('alwaysApply');
      flags.push(s.userInvocable ? 'user-invocable' : 'internal');
      lines.push(
        `  - \`${s.name}\` (body ${s.body_bytes}B, ${s.body_eligible ? 'eligible' : 'not loaded'}, ${flags.join(', ')})`,
      );
    }
  }
  lines.push('');

  // ── 5. 메모리 (facade summarizeSession) ─────────────────
  lines.push('## 5. 메모리');
  try {
    const sum = memory.summarizeSession();
    lines.push(statusLine('memory_root', sum.memory_root, 'info'));
    lines.push(statusLine('이 프로젝트 결정 수', String(sum.decision_count_project), 'info'));
    lines.push(statusLine('전체 결정 로그', String(sum.decision_count_total), 'info'));
    if (sum.keys.length) {
      lines.push('현재 프로젝트 키:');
      for (const k of sum.keys.slice(0, 5)) lines.push(`  - ${k}`);
    } else {
      lines.push('  (아직 결정 없음 — /handoff --confirm 후 last_handoff 기록됩니다)');
    }
  } catch (err) {
    warnings += 1;
    lines.push(statusLine('memory', `읽기 실패: ${err.message}`, 'warn'));
  }
  lines.push('');

  // ── 6. 최근 활동 (.harness/state.md) ────────────────────
  lines.push('## 6. 최근 활동');
  const stateMd = path.join(process.cwd(), '.harness', 'state.md');
  if (fs.existsSync(stateMd)) {
    const content = fs.readFileSync(stateMd, 'utf-8');
    const handoffMatch = content.match(/##\s*핸드오프 로그\s*\n([\s\S]+?)(?=\n##|\n$)/);
    if (handoffMatch) {
      const lastN = handoffMatch[1].trim().split('\n').slice(-3);
      lines.push(statusLine('state.md', stateMd, 'ok'));
      lines.push('최근 핸드오프:');
      for (const line of lastN) lines.push(`  ${line.trim()}`);
    } else {
      lines.push(statusLine('state.md', `${stateMd} (핸드오프 로그 없음)`, 'info'));
    }
  } else {
    lines.push(statusLine('state.md', '아직 없음 — /start 로 생성됩니다', 'info'));
  }
  lines.push('');

  // ── 7. 최종 진단 ────────────────────────────────────────
  lines.push('## 진단 결과');
  if (issues === 0 && warnings === 0) {
    lines.push('🎉 모두 정상 — /plan 명령으로 자동화를 시작하세요.');
  } else if (issues === 0) {
    lines.push(`⚠️  경고 ${warnings}건 (치명적 문제는 없음). 위 항목을 확인하세요.`);
  } else {
    lines.push(`🛠  오류 ${issues}건 / 경고 ${warnings}건. 위의 ❌ 항목을 먼저 해결해주세요.`);
  }
  lines.push('');

  process.stdout.write(lines.join('\n'));
  process.exit(issues > 0 ? 1 : 0);
}

main();

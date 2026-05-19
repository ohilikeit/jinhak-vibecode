#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { harnessHome, agentsSkillsHome, isDevMode } = require('./paths.js');
const { resolveProfile, budgetFor } = require('./profile.js');
const { loadSkills } = require('./skills-loader.js');
const { printCostLabel } = require('./cost-label.js');
const pkg = require('../package.json');

function emitCostLabel(cmd) {
  // 메타/진단성은 라벨 생략
  if (['paths', 'doctor', 'ship'].includes(cmd)) {
    // doctor/ship은 자기 안에서 출력함; paths는 정보성이라 생략
    return;
  }
  let profile = 'eco';
  try { profile = resolveProfile(args); } catch {}
  printCostLabel(cmd, profile);
}

const args = process.argv.slice(2);

function printVersion() {
  process.stdout.write(`jinhak-harness v${pkg.version}\n`);
}

function printHelp() {
  process.stdout.write(
    [
      `jinhak-harness v${pkg.version} — 비개발자 직군 자동화 하니스`,
      '',
      '사용법: jinhak-harness <command> [options]',
      '',
      '워크플로우 (권장 순서):',
      '  doctor                          환경/의존성/스킬 진단 (선택)',
      '  start                           5문항 직군 인터뷰 + 프로필 생성',
      '  plan "<요청>"                   요청 분석 → .harness/plans/*.md',
      '  build "<요청>"                  실제 실행 (PDF→Excel / 회의록→md 등)',
      '  verify [--expected-rows N]      산출물 친절 한국어 리포트',
      '  handoff [--confirm]             dry-run → --confirm 시 복사',
      '  ship [--confirm] [--push]       .harness 변경을 git commit',
      '  create                          새 자동화 스킬 SKILL.md 생성 (인터뷰)',
      '',
      '진단/메타:',
      '  --version, -v                   버전 출력',
      '  --help, -h                      이 도움말',
      '  --debug-loaded [--profile=X]    프로필별 스킬 로드 상태 (ADR-001)',
      '  paths                           HARNESS 경로 출력',
      '',
      '환경변수:',
      `  HARNESS_HOME         = ${harnessHome()}`,
      `  AGENTS_SKILLS_HOME   = ${agentsSkillsHome()}`,
      `  HARNESS_DEV          = ${isDevMode() ? '1 (dev mode)' : '(unset)'}`,
      `  HARNESS_PROFILE      = ${process.env.HARNESS_PROFILE || '(unset, default=eco)'}`,
      '',
      '문서: docs/GOAL_MODE_IMPLEMENTATION_GUIDE.md, docs/adr/ADR-001..004',
      '',
    ].join('\n'),
  );
}

function printPaths() {
  process.stdout.write(
    [
      `HARNESS_HOME=${harnessHome()}`,
      `AGENTS_SKILLS_HOME=${agentsSkillsHome()}`,
      '',
    ].join('\n'),
  );
}

if (args.includes('--version') || args.includes('-v')) {
  printVersion();
  process.exit(0);
}

if (args.includes('--debug-loaded')) {
  const profile = resolveProfile(args);
  const budget = budgetFor(profile);
  const skillsDir = process.env.AGENTS_SKILLS_HOME || agentsSkillsHome();
  const fallbackDir = require('node:path').resolve(__dirname, '..', 'templates');
  const dir = require('node:fs').existsSync(skillsDir) ? skillsDir : fallbackDir;
  const skills = loadSkills(dir, profile);

  const frontmatterLoaded = skills.filter((s) => s.frontmatter_loaded).length;
  const bodyLoaded = skills.filter((s) => s.body_loaded).length;
  const bodyEligible = skills.filter((s) => s.body_eligible).length;

  process.stdout.write(
    [
      `profile=${profile}`,
      `skills_dir=${dir}`,
      `skills_found=${skills.length}`,
      `frontmatter_loaded=${frontmatterLoaded}`,
      `body_loaded=${bodyLoaded}`,
      `body_eligible=${bodyEligible}`,
      `dry_run_enforced=${budget.dry_run_enforced}`,
      `benchmark=${budget.benchmark}`,
      '',
    ].join('\n'),
  );
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  printHelp();
  process.exit(0);
}

const cmd = args[0];
emitCostLabel(cmd);
switch (cmd) {
  case 'paths':
    printPaths();
    process.exit(0);
    break;
  case 'start': {
    // start.ts를 type-stripping 모드로 child process에서 실행
    const script = path.resolve(__dirname, 'commands', 'start.ts');
    const result = spawnSync(
      process.execPath,
      ['--experimental-strip-types', '--no-warnings=ExperimentalWarning', script, ...args.slice(1)],
      { stdio: 'inherit' },
    );
    process.exit(result.status ?? 1);
    break;
  }
  case 'build': {
    const script = path.resolve(__dirname, 'commands', 'build.ts');
    const result = spawnSync(
      process.execPath,
      ['--experimental-strip-types', '--no-warnings=ExperimentalWarning', script, ...args.slice(1)],
      { stdio: 'inherit' },
    );
    process.exit(result.status ?? 1);
    break;
  }
  case 'verify': {
    const script = path.resolve(__dirname, 'commands', 'verify.ts');
    const result = spawnSync(
      process.execPath,
      ['--experimental-strip-types', '--no-warnings=ExperimentalWarning', script, ...args.slice(1)],
      { stdio: 'inherit' },
    );
    process.exit(result.status ?? 1);
    break;
  }
  case 'handoff': {
    const script = path.resolve(__dirname, 'commands', 'handoff.ts');
    const result = spawnSync(
      process.execPath,
      ['--experimental-strip-types', '--no-warnings=ExperimentalWarning', script, ...args.slice(1)],
      { stdio: 'inherit' },
    );
    process.exit(result.status ?? 1);
    break;
  }
  case 'plan': {
    const script = path.resolve(__dirname, 'commands', 'plan.ts');
    const result = spawnSync(
      process.execPath,
      ['--experimental-strip-types', '--no-warnings=ExperimentalWarning', script, ...args.slice(1)],
      { stdio: 'inherit' },
    );
    process.exit(result.status ?? 1);
    break;
  }
  case 'doctor': {
    const script = path.resolve(__dirname, 'commands', 'doctor.js');
    const result = spawnSync(process.execPath, [script, ...args.slice(1)], { stdio: 'inherit' });
    process.exit(result.status ?? 1);
    break;
  }
  case 'ship': {
    const script = path.resolve(__dirname, 'commands', 'ship.ts');
    const result = spawnSync(
      process.execPath,
      ['--experimental-strip-types', '--no-warnings=ExperimentalWarning', script, ...args.slice(1)],
      { stdio: 'inherit' },
    );
    process.exit(result.status ?? 1);
    break;
  }
  case 'create': {
    const script = path.resolve(__dirname, 'commands', 'create.ts');
    const result = spawnSync(
      process.execPath,
      ['--experimental-strip-types', '--no-warnings=ExperimentalWarning', script, ...args.slice(1)],
      { stdio: 'inherit' },
    );
    process.exit(result.status ?? 1);
    break;
  }
  default:
    process.stderr.write(`jinhak-harness: unknown command "${cmd}"\n`);
    process.stderr.write(`Run "jinhak-harness --help" for usage.\n`);
    process.exit(1);
}

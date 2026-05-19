#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { harnessHome, agentsSkillsHome, isDevMode } = require('./paths.js');
const { resolveProfile, budgetFor } = require('./profile.js');
const { loadSkills } = require('./skills-loader.js');
const pkg = require('../package.json');

const args = process.argv.slice(2);

function printVersion() {
  process.stdout.write(`jinhak-harness v${pkg.version}\n`);
}

function printHelp() {
  process.stdout.write(
    [
      `jinhak-harness v${pkg.version}`,
      '',
      'Usage:',
      '  jinhak-harness --version       Print version and exit',
      '  jinhak-harness --help          Show this help and exit',
      '  jinhak-harness paths           Print resolved HARNESS paths',
      '',
      'Environment:',
      `  HARNESS_HOME         = ${harnessHome()}`,
      `  AGENTS_SKILLS_HOME   = ${agentsSkillsHome()}`,
      `  HARNESS_DEV          = ${isDevMode() ? '1 (dev mode)' : '(unset)'}`,
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
  default:
    process.stderr.write(`jinhak-harness: unknown command "${cmd}"\n`);
    process.stderr.write(`Run "jinhak-harness --help" for usage.\n`);
    process.exit(1);
}

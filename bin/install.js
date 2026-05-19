#!/usr/bin/env node
'use strict';

const { harnessHome, agentsSkillsHome, isDevMode } = require('./paths.js');
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
  default:
    process.stderr.write(`jinhak-harness: unknown command "${cmd}"\n`);
    process.stderr.write(`Run "jinhak-harness --help" for usage.\n`);
    process.exit(1);
}

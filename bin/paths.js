'use strict';

const path = require('node:path');
const os = require('node:os');

function harnessHome() {
  if (process.env.HARNESS_HOME) return process.env.HARNESS_HOME;
  if (process.env.HARNESS_DEV === '1') return path.join(process.cwd(), 'dev-home');
  return path.join(os.homedir(), '.harness');
}

function agentsSkillsHome() {
  return process.env.AGENTS_SKILLS_HOME || path.join(os.homedir(), '.agents', 'skills');
}

function isDevMode() {
  return process.env.HARNESS_DEV === '1';
}

module.exports = {
  harnessHome,
  agentsSkillsHome,
  isDevMode,
};

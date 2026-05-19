'use strict';

const path = require('node:path');
const os = require('node:os');

function harnessHome() {
  return process.env.HARNESS_HOME || path.join(os.homedir(), '.harness');
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

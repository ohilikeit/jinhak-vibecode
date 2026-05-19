'use strict';

// jinhak-harness — 스킬 로더 (ADR-001 budget 적용)
// 부팅 시: frontmatter만 파싱. 본문은 명시 loadBody 호출 시에만 읽는다.

const fs = require('node:fs');
const path = require('node:path');

const { budgetFor } = require('./profile.js');

function findSkillFiles(root) {
  const results = [];
  if (!fs.existsSync(root)) return results;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && entry.name === 'SKILL.md') results.push(full);
    }
  }
  return results;
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { frontmatter: null, body: raw };
  const frontmatter = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z0-9_\-]+)\s*:\s*(.*)$/);
    if (kv) frontmatter[kv[1]] = kv[2];
  }
  return { frontmatter, body: m[2] };
}

function parseBoolish(v) {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (s === 'true' || s === 'yes' || s === '1') return true;
  if (s === 'false' || s === 'no' || s === '0') return false;
  return undefined;
}

function loadSkills(skillsDir, profile) {
  const budget = budgetFor(profile);
  const files = findSkillFiles(skillsDir);
  const skills = [];
  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(raw);
    // Karpathy alwaysApply: 명시되지 않으면 false
    const alwaysApply = parseBoolish(frontmatter && frontmatter.alwaysApply) === true;
    // RBAC user-invocable: 명시되지 않으면 true (기본은 사용자 호출 가능)
    const userInvocableRaw = parseBoolish(frontmatter && frontmatter['user-invocable']);
    const userInvocable = userInvocableRaw === undefined ? true : userInvocableRaw;
    skills.push({
      path: file,
      name: frontmatter && frontmatter.name ? frontmatter.name : path.basename(path.dirname(file)),
      frontmatter,
      frontmatter_loaded: budget.frontmatter_at_boot,
      body_loaded: budget.body_at_boot,
      body_eligible: budget.body_eligible_at_boot,
      body_bytes: body.length,
      alwaysApply,
      userInvocable,
    });
  }
  return skills;
}

// alwaysApply: true 인 스킬만 — Layer 1 baseline 주입 후보
function loadAlwaysApply(skillsDir, profile) {
  return loadSkills(skillsDir, profile).filter((s) => s.alwaysApply);
}

// user-invocable: true 인 스킬만 — /plan /build 에서 라우팅 가능
function loadUserInvocable(skillsDir, profile) {
  return loadSkills(skillsDir, profile).filter((s) => s.userInvocable);
}

module.exports = { loadSkills, loadAlwaysApply, loadUserInvocable, parseFrontmatter, findSkillFiles };

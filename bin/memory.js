'use strict';

// jinhak-harness — Memory facade (REPORT_06 §3.3 Hermes 4-method facade)
// 사용자 노출은 4 메서드만, 백엔드는 JSON append-only.
// 향후 v0.2+ 에서 SQLite/Postgres로 swap 가능 (인터페이스 그대로).

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { harnessHome } = require('./paths.js');

function memoryRoot() {
  return path.join(harnessHome(), 'memory');
}

function projectKey(cwd) {
  return crypto.createHash('sha256').update(cwd).digest('hex').slice(0, 12);
}

function ensureRoot() {
  const root = memoryRoot();
  fs.mkdirSync(path.join(root, 'projects'), { recursive: true });
  return root;
}

function projectFile(cwd) {
  ensureRoot();
  return path.join(memoryRoot(), 'projects', `${projectKey(cwd)}.json`);
}

function decisionsFile() {
  ensureRoot();
  return path.join(memoryRoot(), 'decisions.jsonl');
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
}

// 1) saveDecision — 키-값 결정 기록 (append-only jsonl)
function saveDecision(key, value, ctx = {}) {
  const file = decisionsFile();
  const cwd = ctx.cwd || process.cwd();
  const entry = {
    timestamp: new Date().toISOString(),
    cwd,
    project: projectKey(cwd),
    key,
    value,
  };
  fs.appendFileSync(file, JSON.stringify(entry) + '\n');
  // 프로젝트 파일에도 latest 상태 갱신
  const pfile = projectFile(cwd);
  const proj = readJson(pfile, { project: projectKey(cwd), cwd, decisions: {} });
  proj.decisions[key] = value;
  proj.last_updated = entry.timestamp;
  writeJson(pfile, proj);
  return entry;
}

// 2) recallProject — 현재 프로젝트의 최근 결정/요약 반환
function recallProject(ctx = {}) {
  const cwd = ctx.cwd || process.cwd();
  const proj = readJson(projectFile(cwd), null);
  if (!proj) return { cwd, decisions: {}, last_updated: null };
  return proj;
}

// 3) summarizeSession — 현재까지 누적된 메모리 요약
function summarizeSession(ctx = {}) {
  const cwd = ctx.cwd || process.cwd();
  const proj = recallProject({ cwd });
  const decisions = proj.decisions || {};
  const decFile = decisionsFile();
  let totalEntries = 0;
  if (fs.existsSync(decFile)) {
    totalEntries = fs.readFileSync(decFile, 'utf-8').split('\n').filter(Boolean).length;
  }
  return {
    cwd,
    project_key: projectKey(cwd),
    last_updated: proj.last_updated,
    decision_count_project: Object.keys(decisions).length,
    decision_count_total: totalEntries,
    keys: Object.keys(decisions),
    memory_root: memoryRoot(),
  };
}

// 4) forget — 키 삭제 (프로젝트 파일에서)
function forget(key, ctx = {}) {
  const cwd = ctx.cwd || process.cwd();
  const pfile = projectFile(cwd);
  const proj = readJson(pfile, null);
  if (!proj || !(key in (proj.decisions || {}))) return false;
  delete proj.decisions[key];
  proj.last_updated = new Date().toISOString();
  writeJson(pfile, proj);
  // 결정 로그에는 forget 이벤트 추가 (audit trail)
  fs.appendFileSync(
    decisionsFile(),
    JSON.stringify({
      timestamp: proj.last_updated,
      cwd,
      project: projectKey(cwd),
      key,
      value: null,
      action: 'forget',
    }) + '\n',
  );
  return true;
}

module.exports = {
  saveDecision,
  recallProject,
  summarizeSession,
  forget,
  // 내부 헬퍼 (테스트용)
  _memoryRoot: memoryRoot,
  _projectKey: projectKey,
};

#!/usr/bin/env node
'use strict';

// jinhak-harness — lazy dependency detection (ADR-003 §2.2)
// Probes 5 deps (python3, pdfplumber, openpyxl, pandas, uv), prints status
// with OS-specific install hints on miss, and caches results to
// $HARNESS_HOME/env-cache.json with a 7-day TTL.

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { harnessHome } = require('./paths.js');

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_FILE = path.join(harnessHome(), 'env-cache.json');

const INSTALL_HINTS = {
  uv: 'curl -LsSf https://astral.sh/uv/install.sh | sh && uv tool install --with pdfplumber --with openpyxl --with pandas jinhak-harness-pytools',
  mac: 'brew install python && pip3 install --user pdfplumber openpyxl pandas',
  wsl: 'sudo apt install python3-pdfplumber python3-openpyxl python3-pandas',
};

function osHintKey() {
  const platform = process.platform;
  if (platform === 'darwin') return 'mac';
  if (platform === 'linux') return 'wsl';
  return 'uv';
}

function hintFor(name) {
  if (name === 'uv') return INSTALL_HINTS.uv;
  const key = osHintKey();
  return INSTALL_HINTS[key] || INSTALL_HINTS.uv;
}

function probeCommand(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: 'utf-8' });
  if (result.error || result.status !== 0) {
    return { found: false, version: null };
  }
  const out = (result.stdout || '').trim() || (result.stderr || '').trim();
  return { found: true, version: out };
}

function probePyModule(mod) {
  return probeCommand('python3', [
    '-c',
    `import ${mod}; print(getattr(${mod}, "__version__", "unknown"))`,
  ]);
}

const PROBES = {
  python3:    () => probeCommand('python3', ['--version']),
  pdfplumber: () => probePyModule('pdfplumber'),
  openpyxl:   () => probePyModule('openpyxl'),
  pandas:     () => probePyModule('pandas'),
  uv:         () => probeCommand('uv', ['--version']),
};

function loadCache() {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.timestamp || !parsed.results) return null;
    const age = Date.now() - new Date(parsed.timestamp).getTime();
    if (age < 0 || age > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(results) {
  const dir = path.dirname(CACHE_FILE);
  fs.mkdirSync(dir, { recursive: true });
  const payload = { timestamp: new Date().toISOString(), results };
  fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2));
}

function runProbes() {
  const results = {};
  for (const name of Object.keys(PROBES)) {
    results[name] = PROBES[name]();
  }
  return results;
}

function format(results, fromCache) {
  const tag = fromCache ? ' (cached)' : '';
  const lines = [`jinhak-harness lazy-deps${tag}`, `HARNESS_HOME=${harnessHome()}`, ''];
  for (const [name, info] of Object.entries(results)) {
    if (info.found) {
      lines.push(`✅ ${name} ${info.version}`);
    } else {
      lines.push(`❌ ${name} not found`);
      lines.push(`   → ${hintFor(name)}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

function detectAll(forceRefresh = false) {
  let results;
  let fromCache = false;
  if (!forceRefresh) {
    const cached = loadCache();
    if (cached) {
      results = cached.results;
      fromCache = true;
    }
  }
  if (!results) {
    results = runProbes();
    saveCache(results);
  }
  return { results, fromCache, cacheFile: CACHE_FILE };
}

function main() {
  const args = process.argv.slice(2);
  const forceRefresh = args.includes('--refresh') || args.includes('--no-cache');
  const { results, fromCache } = detectAll(forceRefresh);
  process.stdout.write(format(results, fromCache));
  const allFound = Object.values(results).every((r) => r.found);
  process.exit(allFound ? 0 : 1);
}

module.exports = { detectAll, hintFor, INSTALL_HINTS };

if (require.main === module) main();

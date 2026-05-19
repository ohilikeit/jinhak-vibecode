#!/usr/bin/env node
'use strict';

// bin/commands/register.js — 6 AI 호스트의 user-level commands/skills 디렉터리에
// canonical commands/*.md(.toml)을 jinhak-harness/ 서브디렉터리로 복사한다.
//
// 사용:
//   jinhak-harness register              모든 호스트에 등록 (실제 복사)
//   jinhak-harness register --dry-run    무엇이 복사될지만 미리 보기
//   jinhak-harness register --host=claude,cursor   특정 호스트만
//   jinhak-harness unregister            모든 호스트에서 제거
//   jinhak-harness unregister --host=claude

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const PKG_ROOT = path.resolve(__dirname, '..', '..');
const NS = 'jinhak-harness'; // 슬래시 커맨드 네임스페이스 — /jinhak-harness:init

// ── 호스트별 등록 위치 ────────────────────────────────────────────
function hostTargets() {
  const home = os.homedir();
  return [
    {
      id: 'claude',
      label: 'Claude Code',
      src: path.join(PKG_ROOT, 'commands'),
      dst: path.join(home, '.claude', 'commands', NS),
      ext: '.md',
      format: 'markdown-with-frontmatter',
      sample: '/jinhak-harness:init',
    },
    {
      id: 'cursor',
      label: 'Cursor',
      src: path.join(PKG_ROOT, '.cursor', 'commands'),
      dst: path.join(home, '.cursor', 'commands', NS),
      ext: '.md',
      format: 'markdown-no-frontmatter',
      sample: '/jinhak-harness:init',
    },
    {
      id: 'codex',
      label: 'Codex CLI',
      src: path.join(PKG_ROOT, 'commands'),
      dst: path.join(home, '.codex', 'prompts', NS),
      ext: '.md',
      format: 'markdown-with-frontmatter',
      sample: '/prompts:jinhak-harness:init  (또는 /jinhak-harness:init)',
    },
    {
      id: 'gemini',
      label: 'Gemini CLI',
      src: path.join(PKG_ROOT, '.gemini', 'commands'),
      dst: path.join(home, '.gemini', 'commands', NS),
      ext: '.toml',
      format: 'toml',
      sample: '/jinhak-harness:init',
    },
    {
      id: 'antigravity',
      label: 'Google Antigravity',
      src: path.join(PKG_ROOT, 'commands'),
      dst: path.join(home, '.gemini', 'antigravity', 'commands', NS),
      ext: '.md',
      format: 'markdown-with-frontmatter',
      sample: '/jinhak-harness:init',
    },
    {
      id: 'opencode',
      label: 'OpenCode',
      src: path.join(PKG_ROOT, 'commands'),
      dst: path.join(home, '.config', 'opencode', 'commands', NS),
      ext: '.md',
      format: 'markdown-with-frontmatter',
      sample: '/jinhak-harness:init',
    },
  ];
}

// ── 인자 파싱 ───────────────────────────────────────────────────
function parseArgs(args) {
  const filter = new Set();
  let dryRun = false;
  for (const a of args) {
    if (a === '--dry-run') dryRun = true;
    else if (a.startsWith('--host=')) {
      for (const h of a.slice('--host='.length).split(',')) {
        const t = h.trim();
        if (t) filter.add(t);
      }
    }
  }
  return { filter, dryRun };
}

// ── 디렉터리 보장 ─────────────────────────────────────────────────
function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function listSrcFiles(src, ext) {
  if (!fs.existsSync(src)) return [];
  return fs.readdirSync(src).filter((f) => f.endsWith(ext)).sort();
}

// ── 한 호스트 등록 ────────────────────────────────────────────────
function registerOne(target, { dryRun }) {
  const files = listSrcFiles(target.src, target.ext);
  if (files.length === 0) {
    return { id: target.id, label: target.label, skipped: true, reason: `src 비어 있음: ${target.src}`, copied: 0 };
  }
  if (!dryRun) ensureDir(target.dst);
  const copied = [];
  for (const f of files) {
    const from = path.join(target.src, f);
    const to = path.join(target.dst, f);
    if (!dryRun) fs.copyFileSync(from, to);
    copied.push(f);
  }
  return {
    id: target.id,
    label: target.label,
    dst: target.dst,
    copied: copied.length,
    files: copied,
    sample: target.sample,
    format: target.format,
  };
}

function unregisterOne(target, { dryRun }) {
  if (!fs.existsSync(target.dst)) {
    return { id: target.id, label: target.label, skipped: true, reason: '등록된 적 없음', removed: 0 };
  }
  const entries = fs.readdirSync(target.dst).filter((f) => f.endsWith(target.ext));
  if (!dryRun) {
    for (const f of entries) fs.unlinkSync(path.join(target.dst, f));
    // 디렉터리가 비었으면 함께 제거
    try {
      if (fs.readdirSync(target.dst).length === 0) fs.rmdirSync(target.dst);
    } catch { /* ignore */ }
  }
  return { id: target.id, label: target.label, dst: target.dst, removed: entries.length };
}

// ── 메인 ─────────────────────────────────────────────────────────
function main() {
  const argv = process.argv.slice(2);
  const sub = argv[0]; // 'register' or 'unregister' — install.js가 셋업
  const { filter, dryRun } = parseArgs(argv.slice(1));

  const all = hostTargets();
  const targets = filter.size > 0 ? all.filter((t) => filter.has(t.id)) : all;

  if (targets.length === 0) {
    process.stderr.write(`❌ 매칭되는 호스트 없음: --host=${[...filter].join(',')}\n`);
    process.stderr.write(`   사용 가능: ${all.map((t) => t.id).join(', ')}\n`);
    process.exit(2);
  }

  const action = sub === 'unregister' ? 'unregister' : 'register';
  const verbLabel = action === 'register' ? '등록' : '제거';
  const dryLabel = dryRun ? ' (--dry-run, 실제 변경 없음)' : '';

  process.stdout.write(`\n🔧 ${verbLabel} 시작${dryLabel} — 대상 ${targets.length}개 호스트\n\n`);

  let totalChanged = 0;
  for (const t of targets) {
    const r = action === 'register' ? registerOne(t, { dryRun }) : unregisterOne(t, { dryRun });
    if (r.skipped) {
      process.stdout.write(`  ⏭  ${r.label}: ${r.reason}\n`);
      continue;
    }
    const n = action === 'register' ? r.copied : r.removed;
    totalChanged += n;
    process.stdout.write(`  ✅ ${r.label} — ${n}개 ${verbLabel}\n`);
    process.stdout.write(`     ${r.dst}\n`);
    if (action === 'register' && r.sample) {
      process.stdout.write(`     사용 예: ${r.sample}\n`);
    }
  }

  process.stdout.write(`\n📊 합계: ${totalChanged}개 파일 ${verbLabel}${dryLabel}\n`);

  if (action === 'register' && !dryRun) {
    process.stdout.write(`\n다음 단계:\n`);
    process.stdout.write(`  1) 해당 AI 도구를 완전히 종료 후 다시 실행하세요 (자동완성 갱신)\n`);
    process.stdout.write(`  2) 채팅창에서 "/" 입력 시 jinhak-harness:* 가 후보로 떠야 합니다\n`);
    process.stdout.write(`  3) 안 뜨면 jinhak-harness doctor 로 진단\n`);
    process.stdout.write(`\n제거: jinhak-harness unregister\n`);
  }
}

main();

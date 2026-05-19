#!/usr/bin/env node
// scripts/gen-commands.mjs — canonical commands/<name>.md → Cursor/Gemini 형식 derive
//
// SSOT: commands/<name>.md (Claude Code/Codex/OpenCode 공통)
// 파생: .cursor/commands/<name>.md (frontmatter 제거)
//      .gemini/commands/<name>.toml (description + prompt 필드)
//
// 사용: node scripts/gen-commands.mjs

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, 'commands');
const CURSOR = join(ROOT, '.cursor', 'commands');
const GEMINI = join(ROOT, '.gemini', 'commands');

// ── 단순 frontmatter 파서 (의존성 없이) ───────────────────────────
function splitFrontmatter(text) {
  const lines = text.split('\n');
  if (lines[0] !== '---') return { fm: {}, body: text };
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') { end = i; break; }
  }
  if (end < 0) return { fm: {}, body: text };
  const fmText = lines.slice(1, end).join('\n');
  const body = lines.slice(end + 1).join('\n').replace(/^\n+/, '');
  const fm = {};
  let currentKey = null;
  for (const line of fmText.split('\n')) {
    const m = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (m) {
      currentKey = m[1];
      const val = m[2].trim();
      fm[currentKey] = val.startsWith('"') && val.endsWith('"')
        ? val.slice(1, -1)
        : val;
    } else if (currentKey && line.trim().startsWith('-')) {
      if (!Array.isArray(fm[currentKey])) fm[currentKey] = [];
      fm[currentKey].push(line.trim().replace(/^-\s*/, ''));
    }
  }
  return { fm, body };
}

// ── TOML 문자열 이스케이프 ────────────────────────────────────────
function tomlString(s) {
  // 멀티라인 basic string """ ... """ — 백슬래시·트리플쿼트만 이스케이프
  const escaped = s.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"');
  return `"""\n${escaped}\n"""`;
}

function ensureDir(d) {
  if (existsSync(d)) rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}

// ── 메인 ─────────────────────────────────────────────────────────
function main() {
  if (!existsSync(SRC)) {
    console.error(`❌ canonical commands/ 없음: ${SRC}`);
    process.exit(1);
  }

  ensureDir(CURSOR);
  ensureDir(GEMINI);

  const files = readdirSync(SRC).filter((f) => f.endsWith('.md'));
  if (files.length === 0) {
    console.error('❌ commands/*.md 없음');
    process.exit(1);
  }

  let cursorCount = 0;
  let geminiCount = 0;

  for (const f of files) {
    const name = basename(f, '.md');
    const text = readFileSync(join(SRC, f), 'utf8');
    const { fm, body } = splitFrontmatter(text);
    const description = fm.description || `${name} 명령`;

    // Cursor: frontmatter 제거된 plain markdown
    writeFileSync(join(CURSOR, `${name}.md`), body);
    cursorCount++;

    // Gemini: TOML (description + prompt)
    const toml = `# Auto-generated from commands/${f} — do not edit.\n` +
                 `description = ${JSON.stringify(description)}\n` +
                 `prompt = ${tomlString(body)}\n`;
    writeFileSync(join(GEMINI, `${name}.toml`), toml);
    geminiCount++;
  }

  console.log(`✅ derive 완료 — canonical ${files.length}개 → Cursor ${cursorCount}, Gemini ${geminiCount}`);
}

main();

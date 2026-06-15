#!/usr/bin/env node
'use strict';

// jinhak-harness — /interview 심화 인터뷰 (인터뷰모드)
// 단군 하니스 설문(Q-DG-01~20)을 직군 불문 일반화한 심화 온보딩.
//   1) CORE 7문항(+ --exec 시 임원팩 4문항)으로 개인 컨텍스트 수집
//   2) $HARNESS_HOME/personal-context.md 에 구조화 저장 (full 모드)
//   3) 이후 매 세션 시작 시 session-start 훅이 전체 컨텍스트를 자동 주입
//
// 이 기능은 eco가 아닌 full 모드로 동작한다 — 전체 개인 컨텍스트를 항상 주입.

const fs = require('node:fs');
const path = require('node:path');
const { createInterface } = require('node:readline');
const { harnessHome } = require('../paths.js');
const {
  questionsFor,
  writePersonalContext,
  personalContextPath,
  buildDigest,
} = require('../personal-context.js');

function parseFlags(argv) {
  return {
    exec: argv.includes('--exec'),
    force: argv.includes('--force'),
  };
}

function makeAsker(rl) {
  const buffer = [];
  const waiters = [];
  rl.on('line', (line) => {
    if (waiters.length) waiters.shift()(line);
    else buffer.push(line);
  });
  return function ask(prompt) {
    process.stderr.write(prompt);
    return new Promise((res) => {
      if (buffer.length) res(buffer.shift());
      else waiters.push(res);
    });
  };
}

function renderChoicePrompt(q) {
  const lines = [q.label];
  q.choices.forEach((c, i) => lines.push(`   ${i + 1}) ${c}`));
  const def = q.default ? ` [기본 ${q.default}]` : '';
  lines.push(`   번호 입력${def}: `);
  return lines.join('\n');
}

async function runInterview(argv) {
  const { exec, force } = parseFlags(argv);
  const home = harnessHome();
  const target = personalContextPath(home);

  if (fs.existsSync(target) && !force) {
    process.stdout.write(
      `기존 개인 컨텍스트 사용: ${target}\n` +
        `다시 만들려면 \`/interview --force\` (임원팩은 \`--exec\` 추가).\n`,
    );
    return 0;
  }

  process.stdout.write(
    '🔴 /interview — 개인 컨텍스트 심화 인터뷰 (full 모드)\n' +
      (exec ? '임원/경영진 질문팩 포함 (11문항).\n' : 'CORE 7문항 — 임원팩은 `--exec`.\n') +
      '모든 답변은 이 기기에만 저장됩니다. 모르면 Enter로 건너뛰세요.\n\n',
  );

  const rl = createInterface({ input: process.stdin, terminal: false });
  const ask = makeAsker(rl);
  const questions = questionsFor(exec);
  const answers = {};

  for (const q of questions) {
    if (q.type === 'choice') {
      const raw = (await ask(renderChoicePrompt(q))).trim();
      answers[q.key] = raw || q.default || '1';
    } else if (q.type === 'multi') {
      const raw = (await ask(q.label)).trim();
      answers[q.key] = raw ? raw.split(/\s*,\s*/).filter(Boolean) : [];
    } else {
      const raw = (await ask(q.label)).trim();
      answers[q.key] = raw || q.default || '';
    }
  }
  rl.close();

  writePersonalContext(home, answers, { exec, mode: 'full' });
  process.stdout.write(`\n✅ 개인 컨텍스트 저장: ${target}\n`);

  const preview = buildDigest(home, { full: true });
  if (preview) {
    process.stdout.write('\n다음 세션부터 아래 컨텍스트가 자동 주입됩니다 (full 모드):\n');
    process.stdout.write(
      preview
        .split('\n')
        .map((l) => `  │ ${l}`)
        .join('\n') + '\n',
    );
  }
  process.stdout.write(
    '\n언제든 파일을 직접 수정하거나 `/interview --force`로 다시 만들 수 있어요.\n',
  );
  return 0;
}

runInterview(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => {
    process.stderr.write(`interview failed: ${err && err.message}\n`);
    process.exit(1);
  });

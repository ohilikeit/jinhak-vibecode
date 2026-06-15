'use strict';

// jinhak-harness — 개인 컨텍스트 (인터뷰모드)
// 단군 하니스 설문(Q-DG-01~20)을 직군 불문 일반화한 심화 인터뷰의 데이터 모델.
//
// 책임:
//   1) 인터뷰 질문 정의 (CORE + 선택형 EXEC 팩)
//   2) personal-context.md (YAML frontmatter + 본문) 렌더/저장
//   3) frontmatter 파싱 헬퍼 (의존성 0 — 우리가 생성한 파일만 대상)
//   4) buildDigest — user-profile.md + personal-context.md → 주입용 텍스트
//      · full 모드: 전체 개인 컨텍스트 (큰 cap)
//      · eco 폴백: 압축 다이제스트 (작은 cap)
//
// 주의: 결정론적 — LLM 호출 없음. 모든 답변은 로컬에만 저장(baseline 정책).

const fs = require('node:fs');
const path = require('node:path');

const FULL_CAP = 1800; // full 모드 주입 상한(자) ≈ 450토큰
const DIGEST_CAP = 700; // eco 폴백 다이제스트 상한(자) ≈ 175토큰

/** @typedef {{ key: string, label: string, type: 'text'|'multi'|'choice', choices?: string[], default?: string, pack?: 'core'|'exec' }} Question */

/** @type {Question[]} */
const CORE_QUESTIONS = [
  {
    key: 'priorities',
    type: 'multi',
    pack: 'core',
    label:
      '1) 지금 가장 중요한 목표·과제를 1~3개 쉼표로 알려주세요 (구체적일수록 좋아요): ',
  },
  {
    key: 'watch_items',
    type: 'multi',
    pack: 'core',
    label: '2) 늘 신경 쓰이거나 챙겨야 하는 것이 있나요? (쉼표, 없으면 Enter): ',
  },
  {
    key: 'proactive_flags',
    type: 'multi',
    pack: 'core',
    label:
      '3) 묻지 않아도 즉시 알려드려야 할 소식·신호가 있나요? (쉼표, 없으면 Enter): ',
  },
  {
    key: 'tone',
    type: 'choice',
    pack: 'core',
    choices: [
      '분석적 — 사실·수치 중심, 감정 표현 최소화',
      '간결한 — 핵심만 짧고 명료하게',
      '따뜻한 — 맥락·격려 중심, 부드럽게',
      '직접적 — 판단 포함, 명확한 권고 제시',
    ],
    default: '4',
    label: '4) AI의 전반적 어조를 골라주세요',
  },
  {
    key: 'pushback_style',
    type: 'choice',
    pack: 'core',
    choices: [
      '직접 반론 — "이 결정에 동의하지 않습니다, 이유는…"',
      '질문 형식 — "추가로 검토하실 사항이 있습니다"',
      '데이터만 제시 — 반론 없이 상반 데이터만',
      '요청 시에만 — 먼저 물었을 때만 의견',
    ],
    default: '1',
    label: '5) AI가 판단에 동의하지 않을 때 어떻게 말할까요',
  },
  {
    key: 'language_pref',
    type: 'choice',
    pack: 'core',
    choices: ['한국어', '영어', '이중언어 (한국어+영어)', '매번 질문'],
    default: '1',
    label: '6) 산출물 기본 언어를 골라주세요',
  },
  {
    key: 'suppressed_topics',
    type: 'multi',
    pack: 'core',
    label:
      '7) AI가 다루지 않았으면 하는 주제가 있나요? (쉼표, 없으면 Enter): ',
  },
];

/** @type {Question[]} — 임원/경영진용 선택 팩 (--exec) */
const EXEC_QUESTIONS = [
  {
    key: 'press_keywords',
    type: 'multi',
    pack: 'exec',
    label:
      '8) [임원팩] 언론에 등장하면 즉시 알려야 할 키워드는? (쉼표, 없으면 Enter): ',
  },
  {
    key: 'competitor_triggers',
    type: 'multi',
    pack: 'exec',
    label:
      '9) [임원팩] 즉각 보고가 필요한 경쟁사 동향은? (쉼표, 없으면 Enter): ',
  },
  {
    key: 'daily_sweep_time',
    type: 'text',
    pack: 'exec',
    default: '07:00 KST',
    label: '10) [임원팩] 일일 요약 희망 시간 (기본 07:00 KST, Enter로 기본값): ',
  },
  {
    key: 'weekly_reflection_time',
    type: 'text',
    pack: 'exec',
    default: '일요일 18:00 KST',
    label:
      '11) [임원팩] 주간 성찰 희망 시간 (기본 일 18:00 KST, Enter로 기본값): ',
  },
];

function questionsFor(includeExec) {
  return includeExec ? [...CORE_QUESTIONS, ...EXEC_QUESTIONS] : CORE_QUESTIONS;
}

// ── 경로 ──────────────────────────────────────────────────────────
function personalContextPath(home) {
  return path.join(home, 'personal-context.md');
}

// ── YAML 직렬화 (안전한 작은따옴표 처리) ──────────────────────────
function yamlScalar(v) {
  return `'${String(v).replace(/'/g, "''")}'`;
}

/** choice 답변(번호)을 라벨 앞부분(' — ' 이전)으로 변환 */
function choiceLabel(q, answerNum) {
  const idx = parseInt(String(answerNum), 10) - 1;
  const raw = q.choices && q.choices[idx] ? q.choices[idx] : '';
  return raw.split(' — ')[0].trim();
}

/**
 * 인터뷰 답변 → personal-context.md 문자열.
 * @param {Record<string, string|string[]>} answers
 * @param {{ exec?: boolean, mode?: string }} [opts]
 */
function renderPersonalContext(answers, opts = {}) {
  const created = new Date().toISOString();
  const lines = ['---', `created: ${created}`, `mode: ${opts.mode || 'full'}`];

  const allQ = questionsFor(true); // frontmatter엔 답한 키만 출력
  for (const q of allQ) {
    if (!(q.key in answers)) continue;
    const v = answers[q.key];
    if (q.type === 'multi') {
      const arr = Array.isArray(v) ? v : [];
      if (arr.length === 0) continue;
      lines.push(`${q.key}:`);
      for (const item of arr) lines.push(`  - ${yamlScalar(item)}`);
    } else if (q.type === 'choice') {
      lines.push(`${q.key}: ${yamlScalar(choiceLabel(q, v))}`);
    } else {
      const s = String(v || '').trim() || q.default || '';
      if (s) lines.push(`${q.key}: ${yamlScalar(s)}`);
    }
  }
  lines.push('---', '', '# 개인 컨텍스트 (인터뷰모드)', '');
  lines.push(
    '> 이 파일은 매 세션 시작 시 AI에 자동 주입됩니다 (full 모드: 전체 / eco: 요약).',
    '> 모든 내용은 이 기기에만 저장됩니다. 언제든 직접 수정하거나 `/interview --force`로 다시 만드세요.',
    '',
  );

  const bullet = (label, v) => {
    if (Array.isArray(v)) {
      if (v.length === 0) return;
      lines.push(`- **${label}**:`);
      for (const it of v) lines.push(`  - ${it}`);
    } else if (v) {
      lines.push(`- **${label}**: ${v}`);
    }
  };

  bullet('우선순위', answers.priorities);
  bullet('상시 관심사', answers.watch_items);
  bullet('선제 알림 기준', answers.proactive_flags);
  if ('tone' in answers)
    bullet('어조', choiceLabel(CORE_QUESTIONS[3], answers.tone));
  if ('pushback_style' in answers)
    bullet('반론 방식', choiceLabel(CORE_QUESTIONS[4], answers.pushback_style));
  if ('language_pref' in answers)
    bullet('기본 언어', choiceLabel(CORE_QUESTIONS[5], answers.language_pref));
  bullet('다루지 않을 주제', answers.suppressed_topics);
  if (opts.exec) {
    bullet('모니터링 언론 키워드', answers.press_keywords);
    bullet('경쟁사 동향 트리거', answers.competitor_triggers);
    if (answers.daily_sweep_time)
      bullet('일일 요약 시간', answers.daily_sweep_time);
    if (answers.weekly_reflection_time)
      bullet('주간 성찰 시간', answers.weekly_reflection_time);
  }
  lines.push('');
  return lines.join('\n');
}

function writePersonalContext(home, answers, opts = {}) {
  const target = personalContextPath(home);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, renderPersonalContext(answers, opts));
  return target;
}

// ── frontmatter 파싱 (우리가 생성한 단순 구조 전용) ──────────────
function readFileSafe(file) {
  try {
    return fs.readFileSync(file, 'utf-8');
  } catch {
    return '';
  }
}

function stripScalar(raw) {
  let s = String(raw).trim();
  const hash = s.indexOf('#'); // 주석 제거 (behavior_profile 라인)
  if (hash >= 0) s = s.slice(0, hash).trim();
  if (
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith('"') && s.endsWith('"'))
  ) {
    s = s.slice(1, -1).replace(/''/g, "'");
  }
  return s;
}

/** 첫 번째로 등장하는 `key: value` 스칼라 반환 (없으면 '') */
function getScalar(md, key) {
  const m = md.match(new RegExp(`^[ \\t]*${key}:[ \\t]*(.+)$`, 'm'));
  return m ? stripScalar(m[1]) : '';
}

/** `key:` 다음 줄들의 `- item` 리스트 반환 */
function getList(md, key) {
  const lines = md.split('\n');
  const out = [];
  let collecting = false;
  for (const line of lines) {
    if (!collecting) {
      if (new RegExp(`^[ \\t]*${key}:[ \\t]*$`).test(line)) collecting = true;
      continue;
    }
    const m = line.match(/^[ \t]*-[ \t]+(.+)$/);
    if (m) out.push(stripScalar(m[1]));
    else if (line.trim() === '') continue;
    else break;
  }
  return out;
}

/**
 * 주입용 컨텍스트 생성.
 * @param {string} home  HARNESS_HOME
 * @param {{ full?: boolean }} [opts]  full=true면 전체, 아니면 압축 다이제스트
 * @returns {string} 주입 텍스트 (없으면 '')
 */
function buildDigest(home, opts = {}) {
  const full = !!opts.full;
  const profileMd = readFileSafe(path.join(home, 'user-profile.md'));
  const contextMd = readFileSafe(personalContextPath(home));
  if (!profileMd && !contextMd) return '';

  const role = getScalar(profileMd, 'role');
  const rigor = getScalar(profileMd, 'verification_rigor');
  const speed = getScalar(profileMd, 'speed');
  const verbosity = getScalar(profileMd, 'verbosity');

  const tone = getScalar(contextMd, 'tone');
  const pushback = getScalar(contextMd, 'pushback_style');
  const lang = getScalar(contextMd, 'language_pref');
  const priorities = getList(contextMd, 'priorities');
  const watch = getList(contextMd, 'watch_items');
  const flags = getList(contextMd, 'proactive_flags');
  const suppressed = getList(contextMd, 'suppressed_topics');
  const pressKw = getList(contextMd, 'press_keywords');
  const competitors = getList(contextMd, 'competitor_triggers');

  const out = [];
  const meta = [];
  if (role) meta.push(`직군 ${role}`);
  if (tone) meta.push(`어조 ${tone}`);
  if (pushback) meta.push(`반론 ${pushback}`);
  if (lang) meta.push(`언어 ${lang}`);
  if (meta.length) out.push(meta.join(' · '));

  const dims = [];
  if (verbosity) dims.push(`상세도 ${verbosity}/5`);
  if (speed) dims.push(`속도 ${speed}/5`);
  if (rigor) dims.push(`검증강도 ${rigor}/5`);
  if (dims.length) out.push(dims.join(' · '));

  if (priorities.length)
    out.push(`우선순위: ${priorities.map((p, i) => `${i + 1}) ${p}`).join('  ')}`);

  if (full) {
    // full 모드 — 전체 개인 컨텍스트
    if (watch.length) out.push(`상시 관심사: ${watch.join(' · ')}`);
    if (flags.length) out.push(`선제 알림: ${flags.join(' · ')}`);
    if (suppressed.length)
      out.push(`다루지 않을 주제(주의): ${suppressed.join(' · ')}`);
    if (pressKw.length) out.push(`언론 키워드: ${pressKw.join(' · ')}`);
    if (competitors.length) out.push(`경쟁사 동향: ${competitors.join(' · ')}`);
    out.push('→ 위 컨텍스트를 반영해 응답하세요. (다루지 않을 주제는 회피)');
  } else {
    // eco 폴백 — 핵심만
    if (flags.length) out.push(`선제 알림: ${flags.slice(0, 3).join(' · ')}`);
    if (suppressed.length)
      out.push(`회피 주제: ${suppressed.slice(0, 3).join(' · ')}`);
  }

  let text = out.join('\n');
  const cap = full ? FULL_CAP : DIGEST_CAP;
  if (text.length > cap) text = text.slice(0, cap - 1).trimEnd() + '…';
  return text;
}

module.exports = {
  CORE_QUESTIONS,
  EXEC_QUESTIONS,
  questionsFor,
  personalContextPath,
  renderPersonalContext,
  writePersonalContext,
  buildDigest,
  choiceLabel,
  getScalar,
  getList,
  FULL_CAP,
  DIGEST_CAP,
};

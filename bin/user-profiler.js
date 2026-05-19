'use strict';

// jinhak-harness — 8 행동 차원 user-profiler (REPORT_06 §3.2 / 차별화 #1)
// MVP는 결정론적 휴리스틱 — 5문항 답변에서 8 차원을 추론한다. 향후 v0.2+
// 에서는 세션 메시지 recency-weighted 샘플링으로 정밀화.
//
// 8 차원 (GSD gsd-user-profiler 패턴):
//   1. verbosity            — 간결(1) ↔ 상세(5)
//   2. domain               — 직군 그대로 (문자열)
//   3. speed                — 빠른 흐름(1) ↔ 꼼꼼한 흐름(5)
//   4. error_tolerance      — 실수 허용(1) ↔ 무관용(5)
//   5. collaboration_style  — 단독(1) ↔ 협업(5)
//   6. documentation_pref   — 행동 우선(1) ↔ 기록 우선(5)
//   7. tool_familiarity     — 익숙치 않음(1) ↔ 다수 도구 능숙(5)
//   8. verification_rigor   — 가볍게(1) ↔ 엄격히(5)

const COLLAB_TOOLS = ['Slack', 'Teams', 'Discord', 'Zoom', 'Notion', 'Confluence', 'Jira'];
const DOC_TOOLS    = ['Notion', 'Confluence', 'OneNote', 'Obsidian', 'Roam', 'Workflowy'];

function tokenize(s) {
  return String(s || '')
    .split(/[\s,;/]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function clamp(n) {
  return Math.max(1, Math.min(5, n));
}

function profileFrom(answers) {
  const role = String(answers.role || '');
  const tasks = String(answers.repetitive_tasks || '');
  const out = String(answers.output_format || '');
  const tone = String(answers.company_tone || '');
  const tools = Array.isArray(answers.tools)
    ? answers.tools
    : tokenize(answers.tools);

  // 1. verbosity — 직군 + 출력 포맷에서 추론
  let verbosity = 3;
  if (/디자인|design/i.test(role)) verbosity = 2;
  if (/기획|planning|마케팅|sales|영업/i.test(role)) verbosity = 4;
  if (/보고서|문서|기획안|제안서/i.test(out)) verbosity = clamp(verbosity + 1);
  if (/이메일|메일|SMS|문자/i.test(out)) verbosity = clamp(verbosity - 1);

  // 3. speed — 회사 톤에서 추론
  let speed = 3;
  if (/캐주얼|반말|친근/i.test(tone)) speed = 4;
  if (/격식|존댓말|공식/i.test(tone)) speed = 2;

  // 4. error_tolerance — 출력이 외부 노출형이면 무관용 ↑
  let errorTolerance = 3;
  if (/Excel|보고서|문서|기획안|이메일|제안서/i.test(out)) errorTolerance = 4;
  if (/메모|초안|아이디어/i.test(out)) errorTolerance = 2;
  // 격식 톤은 더 무관용
  if (/격식|존댓말|공식/i.test(tone)) errorTolerance = clamp(errorTolerance + 1);

  // 5. collaboration_style — 도구 목록에서 추론
  const collabHits = tools.filter((t) =>
    COLLAB_TOOLS.some((c) => t.toLowerCase().includes(c.toLowerCase())),
  ).length;
  let collaboration = 2;
  if (collabHits >= 2) collaboration = 5;
  else if (collabHits === 1) collaboration = 4;

  // 6. documentation_pref — 도구 목록에서 추론
  const docHits = tools.filter((t) =>
    DOC_TOOLS.some((d) => t.toLowerCase().includes(d.toLowerCase())),
  ).length;
  let documentation = docHits >= 1 ? 4 : 2;

  // 7. tool_familiarity — 도구 수
  let toolFamiliarity = 3;
  if (tools.length >= 3) toolFamiliarity = 5;
  else if (tools.length === 0) toolFamiliarity = 1;
  else if (tools.length === 1) toolFamiliarity = 2;

  // 8. verification_rigor — error_tolerance + 격식 회사톤 기반
  let verificationRigor = errorTolerance;
  if (/격식|존댓말|공식/i.test(tone)) verificationRigor = clamp(verificationRigor + 1);

  return {
    verbosity,
    domain: role,
    speed,
    error_tolerance: errorTolerance,
    collaboration_style: collaboration,
    documentation_pref: documentation,
    tool_familiarity: toolFamiliarity,
    verification_rigor: verificationRigor,
  };
}

// user-profile.md frontmatter에 추가할 YAML 블록 생성
function renderYaml(profile) {
  return [
    `behavior_profile:`,
    `  verbosity: ${profile.verbosity}             # 간결(1) ↔ 상세(5)`,
    `  speed: ${profile.speed}                 # 빠름(1) ↔ 꼼꼼(5)`,
    `  error_tolerance: ${profile.error_tolerance}       # 허용(1) ↔ 무관용(5)`,
    `  collaboration_style: ${profile.collaboration_style}   # 단독(1) ↔ 협업(5)`,
    `  documentation_pref: ${profile.documentation_pref}   # 행동(1) ↔ 기록(5)`,
    `  tool_familiarity: ${profile.tool_familiarity}     # 익숙치 않음(1) ↔ 능숙(5)`,
    `  verification_rigor: ${profile.verification_rigor}    # 가볍게(1) ↔ 엄격히(5)`,
  ].join('\n');
}

module.exports = { profileFrom, renderYaml, DIMENSIONS: 8 };

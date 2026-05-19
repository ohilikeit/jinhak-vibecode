'use strict';

// jinhak-harness — 토큰 가드 UX (REPORT_06 §6.5)
// 거친 3단계 라벨로 비개발자에게 비용을 알린다 — 숫자 노출 X.
//
//   🟢 빠름    — eco 결정론적 작업, LLM 호출 0
//   🟡 느림    — Python spawn / 다수 파일 처리, ~수초~수십초
//   🔴 할당량 위험 — power 기능 또는 4시간 한도의 ~30% 이상 소진 가능

const LABELS = {
  fast: '🟢 빠름',
  slow: '🟡 느림',
  risky: '🔴 할당량 위험',
};

const DETAILS = {
  fast: 'eco 결정론적 작업 — LLM 호출 없음, 즉시 응답',
  slow: 'Python 처리 또는 다수 파일 — 몇 초~몇 십 초 걸릴 수 있어요',
  risky: 'power 기능 — 토큰을 많이 쓸 수 있어요, 잔량 확인 후 진행하세요',
};

// 커맨드별 기본 비용 매트릭스
const COMMAND_COST = {
  start:   'fast',
  plan:    'fast',
  verify:  'fast',
  handoff: 'fast',
  ship:    'fast',
  doctor:  'fast',
  build:   'slow', // PDF 추출 + xlsx 작성
};

function costFor(cmd, profile = 'eco') {
  // power 프로필 + 검증 강한 명령은 risky로 상승
  if (profile === 'power' && (cmd === 'verify' || cmd === 'build')) return 'risky';
  return COMMAND_COST[cmd] || 'fast';
}

function printCostLabel(cmd, profile = 'eco', stream = process.stderr) {
  const level = costFor(cmd, profile);
  const line = `${LABELS[level]} — ${DETAILS[level]}`;
  stream.write(line + '\n');
  return level;
}

module.exports = { printCostLabel, costFor, LABELS, DETAILS };

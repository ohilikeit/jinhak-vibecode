'use strict';

// jinhak-harness — 친절 실패 리포트 (REPORT_06 §4 #8)
// LLM 호출 없는 변수 치환 템플릿. throw 측이 err.code 를 달면 catch에서
// formatError(err) 한 줄로 한국어 사용자 메시지로 변환.

const TEMPLATES = {
  'inbox-not-found': (e) => [
    `🛠 입력 폴더를 찾지 못했어요.`,
    ``,
    `  찾는 위치: ${e.path || '(미상)'}`,
    `  자동화:    ${e.skill || '(미상)'}`,
    ``,
    `해결 방법:`,
    `  1) 위 경로에 폴더를 만들고 파일을 넣어주세요`,
    `  2) 또는 다른 폴더를 쓰려면: --inbox <폴더경로> 옵션 추가`,
  ],
  'inbox-empty': (e) => [
    `🛠 입력 폴더는 있지만 ${e.kind || '파일'}이 하나도 없어요.`,
    ``,
    `  폴더: ${e.path || '(미상)'}`,
    `  찾는 확장자: ${e.ext || '*'}`,
    ``,
    `해결 방법:`,
    `  1) ${e.path}에 ${e.ext} 파일을 넣어주세요`,
    `  2) 파일이 있다면 확장자가 소문자(${e.ext})인지 확인해주세요`,
  ],
  'template-not-found': (e) => [
    `🛠 회사 양식 파일(xlsx 템플릿)을 찾지 못했어요.`,
    ``,
    `  찾는 위치: ${e.path || '(미상)'}`,
    ``,
    `해결 방법:`,
    `  1) 위 경로에 회사 양식 xlsx를 두세요 (헤더만 있어도 OK)`,
    `  2) 다른 양식을 쓰려면: --template <xlsx경로> 옵션 추가`,
  ],
  'output-not-found': (e) => [
    `🛠 산출물 파일을 찾지 못했어요.`,
    ``,
    `  찾는 위치: ${e.path || '(미상)'}`,
    ``,
    `해결 방법:`,
    `  /build 를 먼저 실행해서 산출물을 만들어주세요.`,
  ],
  'python-missing': (e) => [
    `🛠 Python을 찾지 못했어요. 일부 기능(PDF·Excel 처리)이 막힙니다.`,
    ``,
    `해결 방법:`,
    `  /doctor 명령으로 설치 안내를 확인하세요.`,
  ],
  'skill-not-matched': (e) => [
    `🛠 요청을 자동화할 스킬을 찾지 못했어요.`,
    ``,
    `  요청: "${e.request || ''}"`,
    ``,
    `현재 지원하는 자동화:`,
    ...(e.supported || []).map((s) => `  - ${s.skill}  (트리거: ${s.keywords.join(', ')})`),
    ``,
    `지원되는 키워드 중 하나를 포함해 다시 요청해주세요.`,
  ],
  'unknown': (e) => [
    `🛠 자동화가 실패했어요.`,
    ``,
    `  원인: ${e.message || '(메시지 없음)'}`,
    ``,
    `이 메시지를 그대로 복사해서 도움을 요청해주세요.`,
  ],
};

// throw new Error('...') 에 .code / .path / .skill 등을 달면 매핑됨.
// throw 측 헬퍼:
class HarnessError extends Error {
  constructor(code, message, fields = {}) {
    super(message);
    this.code = code;
    Object.assign(this, fields);
  }
}

function formatError(err) {
  const code = (err && err.code) || 'unknown';
  const tpl = TEMPLATES[code] || TEMPLATES.unknown;
  const lines = tpl({
    message: err && err.message,
    path: err && err.path,
    skill: err && err.skill,
    kind: err && err.kind,
    ext: err && err.ext,
    request: err && err.request,
    supported: err && err.supported,
  });
  return lines.join('\n') + '\n';
}

module.exports = { formatError, HarnessError, TEMPLATES };

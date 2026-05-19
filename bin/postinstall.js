#!/usr/bin/env node
'use strict';

// jinhak-harness — postinstall 인사말 (npm install 후 자동 실행)
// 절대 destructive 작업 X. 사용자 홈 디렉터리는 첫 명령 실행 시점에 만듦.

const pkg = require('../package.json');

// 자기검증: install.js가 같은 디렉터리에 있어야 정상
const path = require('path');
const fs = require('fs');
const installJs = path.join(__dirname, 'install.js');
if (!fs.existsSync(installJs)) {
  process.stderr.write([
    '',
    '❌ jinhak-harness 설치 검증 실패',
    `   ${installJs} 가 없습니다.`,
    '',
    '해결:',
    '  npm uninstall -g jinhak-harness',
    '  npm cache clean --force',
    '  npm install -g github:ohilikeit/jinhak-vibecode',
    '',
  ].join('\n'));
  // npm install이 실패로 표시되도록 종료. scripts.postinstall의 || true는 의도된 무해 처리.
  process.exit(1);
}

// CI/test 환경에서는 조용히
if (process.env.CI || process.env.JINHAK_NO_GREETING) process.exit(0);

const banner = [
  '',
  `🎉 jinhak-harness v${pkg.version} 설치 완료`,
  '',
  '비개발자 직군용 자동화 하니스가 준비됐어요. 한국어 우선·eco 토큰 가드·',
  'Claude Code/Cursor/Codex/Gemini/Antigravity/OpenCode 모두 호환.',
  '',
  '다음 단계:',
  '  jinhak-harness register      # 6 AI 호스트 채팅창에 /jinhak-harness:* 슬래시 등록 (한 번)',
  '  jinhak-harness doctor        # 환경 점검 (의존성·프로필·스킬)',
  '  jinhak-harness init          # 홈 디렉터리 초기화 (~/.harness)',
  '  jinhak-harness start         # 5문항 직군 인터뷰',
  '',
  '슬래시로 쓰고 싶다면 (register 후 AI 도구 재시작):',
  '  /jinhak-harness:init  /jinhak-harness:start  /jinhak-harness:autopilot "<요청>"',
  '',
  '도움말:  jinhak-harness --help',
  '문서:    GETTING_STARTED.md (비개발자), USAGE.md (개발자)',
  '',
];
process.stdout.write(banner.join('\n'));

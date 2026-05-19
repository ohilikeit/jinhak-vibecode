#!/usr/bin/env node
'use strict';

// jinhak-harness — postinstall 인사말 (npm install 후 자동 실행)
// 절대 destructive 작업 X. 사용자 홈 디렉터리는 첫 명령 실행 시점에 만듦.

const pkg = require('../package.json');

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
  '  jinhak-harness doctor        # 환경 점검 (의존성·프로필·스킬)',
  '  jinhak-harness init          # 홈 디렉터리 초기화 (~/.harness)',
  '  jinhak-harness start         # 5문항 직군 인터뷰',
  '',
  '도움말:  jinhak-harness --help',
  '문서:    USAGE.md (E2E 사용 가이드)',
  '',
];
process.stdout.write(banner.join('\n'));

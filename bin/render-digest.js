#!/usr/bin/env node
'use strict';

// jinhak-harness — 세션 시작 시 개인 컨텍스트 주입 텍스트 생성기
// session-start 훅이 이 스크립트를 호출해 stdout을 부트스트랩 컨텍스트에 합성한다.
//
// full 모드 (이 기능의 기본): 심화 인터뷰(personal-context.md)가 있으면 전체 개인
//   컨텍스트를 주입 — "context가 항상 잘 동작"하도록.
// eco 폴백: 심화 인터뷰가 없고 /start 프로필만 있으면 압축 다이제스트만.
// 강제 eco: HARNESS_CONTEXT_MODE=eco 로 full 모드를 끌 수 있음.
//
// 설계 원칙: 절대 throw 하지 않는다(훅이 set -eu). 실패 시 빈 출력 + exit 0.

const fs = require('node:fs');
const { harnessHome } = require('./paths.js');
const { buildDigest, personalContextPath } = require('./personal-context.js');

function main() {
  const home = harnessHome();
  const hasInterview = fs.existsSync(personalContextPath(home));
  const forceEco = (process.env.HARNESS_CONTEXT_MODE || '').toLowerCase() === 'eco';
  const full = hasInterview && !forceEco;

  const text = buildDigest(home, { full });
  if (text) process.stdout.write(text);
}

try {
  main();
} catch {
  // 친절 실패: 컨텍스트 주입 실패가 세션을 막아선 안 된다.
  process.exit(0);
}

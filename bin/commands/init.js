'use strict';

// jinhak-harness — /init
// 사용자 홈에 $HARNESS_HOME 구조를 만든다. 이미 존재하면 그대로 둠.

const fs = require('node:fs');
const path = require('node:path');
const { harnessHome, agentsSkillsHome, isDevMode } = require('../paths.js');

function main() {
  const home = harnessHome();
  const skillsHome = agentsSkillsHome();

  const dirs = [
    home,
    path.join(home, 'user-skills'),
    path.join(home, 'memory', 'projects'),
    skillsHome,
  ];

  const lines = [
    '🛠 jinhak-harness 홈 디렉터리 초기화',
    '',
  ];
  for (const d of dirs) {
    if (fs.existsSync(d)) {
      lines.push(`  ✅ 이미 존재: ${d}`);
    } else {
      fs.mkdirSync(d, { recursive: true });
      lines.push(`  ✅ 새로 만듦: ${d}`);
    }
  }
  lines.push('');
  if (isDevMode()) {
    lines.push('ℹ️  HARNESS_DEV=1 격리 모드 — dev-home 로 저장됩니다.');
  } else {
    lines.push(`ℹ️  운영 모드 — ${home} (제거하려면 단순 rm -rf 가능)`);
  }
  lines.push('');
  lines.push('다음 단계:');
  lines.push('  jinhak-harness doctor      # 환경 점검');
  lines.push('  jinhak-harness start       # 5문항 직군 인터뷰');
  lines.push('');

  process.stdout.write(lines.join('\n'));
  return 0;
}

process.exit(main());

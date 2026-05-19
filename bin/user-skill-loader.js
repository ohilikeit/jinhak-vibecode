'use strict';

// jinhak-harness — 사용자 스킬 동적 로더
// $HARNESS_HOME/user-skills/<name>/spec.json 을 모두 로드해 RULES 형식으로 반환.
// /create가 작성한 spec.json을 /build·/plan이 자동으로 발견하도록 한다.

const fs = require('node:fs');
const path = require('node:path');
const { harnessHome } = require('./paths.js');

function userSkillsDir() {
  return path.join(harnessHome(), 'user-skills');
}

function loadSpecs() {
  const root = userSkillsDir();
  if (!fs.existsSync(root)) return [];
  const specs = [];
  for (const name of fs.readdirSync(root)) {
    const specFile = path.join(root, name, 'spec.json');
    if (!fs.existsSync(specFile)) continue;
    try {
      const spec = JSON.parse(fs.readFileSync(specFile, 'utf-8'));
      specs.push({ ...spec, _dir: path.join(root, name) });
    } catch {
      // 손상된 spec.json은 무시 (친절 리포트는 doctor에서)
    }
  }
  return specs;
}

// trigger 키워드 추출: spec.trigger_phrase + spec.keywords
function keywordsFor(spec) {
  const out = new Set();
  if (Array.isArray(spec.keywords)) for (const k of spec.keywords) out.add(k);
  if (spec.trigger_phrase) {
    // 트리거 문구의 주요 명사들을 키워드로 추가 (공백/구두점 분리)
    for (const tok of String(spec.trigger_phrase).split(/[\s,.;/]+/)) {
      const t = tok.trim();
      if (t.length >= 2) out.add(t);
    }
  }
  return [...out];
}

module.exports = { loadSpecs, keywordsFor, userSkillsDir };

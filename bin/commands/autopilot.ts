#!/usr/bin/env node
// jinhak-harness — /autopilot (Layer 2.5)
// plan → build → verify 를 한 명령으로 무중단 진행. eco 프로필 한정.
//
// 사용:
//   node bin/install.js autopilot "<요청>" [--expected-rows N]

import { spawnSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { formatError, HarnessError } = require("../friendly-error.js");

const HERE = path.dirname(fileURLToPath(import.meta.url));
const INSTALL_JS = path.resolve(HERE, "..", "install.js");

function step(label: string): void {
  process.stdout.write(`\n━━━ ${label} ━━━\n`);
}

function run(cmd: string, extraArgs: string[]): number {
  const r = spawnSync(process.execPath, [INSTALL_JS, cmd, ...extraArgs], { stdio: "inherit" });
  return r.status ?? 1;
}

function main(): number {
  const argv = process.argv.slice(2);
  const positional = argv.filter((a) => !a.startsWith("--"));
  const skip = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--") && i + 1 < argv.length) skip.add(argv[i + 1]);
  }
  const request = positional.filter((p) => !skip.has(p)).join(" ");

  if (!request) {
    process.stderr.write(
      [
        "사용법: jinhak-harness autopilot \"<자동화 요청>\" [--expected-rows N]",
        "예시: jinhak-harness autopilot \"채용공고 Excel 정리\" --expected-rows 3",
        "",
      ].join("\n"),
    );
    return 2;
  }

  const expectedRowsIdx = argv.indexOf("--expected-rows");
  const verifyArgs: string[] = [];
  if (expectedRowsIdx >= 0 && argv[expectedRowsIdx + 1]) {
    verifyArgs.push("--expected-rows", argv[expectedRowsIdx + 1]);
  }

  step("1/3 plan");
  let code = run("plan", [request]);
  if (code !== 0) {
    process.stderr.write(`\n🛠 plan 단계에서 멈췄습니다 (exit ${code}). 위 안내를 따라 수정 후 다시 시도해주세요.\n`);
    return code;
  }

  step("2/3 build");
  code = run("build", [request]);
  if (code !== 0) {
    process.stderr.write(`\n🛠 build 단계에서 멈췄습니다 (exit ${code}). 입력 폴더와 템플릿을 확인하세요.\n`);
    return code;
  }

  step("3/3 verify");
  code = run("verify", verifyArgs);
  // verify는 warning이어도 0을 반환 (실패는 1), 그대로 전파

  step("✅ autopilot 완료");
  process.stdout.write(
    [
      "",
      "다음 단계 (사용자 결정):",
      "  jinhak-harness handoff           # 미리보기",
      "  jinhak-harness handoff --confirm # 실제 복사",
      "",
    ].join("\n"),
  );
  return code;
}

try {
  process.exit(main());
} catch (err) {
  process.stderr.write(formatError(err as Error));
  process.exit(1);
}

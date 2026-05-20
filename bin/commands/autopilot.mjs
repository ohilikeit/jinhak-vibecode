#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require2 = createRequire(import.meta.url);
const { formatError, HarnessError } = require2("../friendly-error.js");
const HERE = path.dirname(fileURLToPath(import.meta.url));
const INSTALL_JS = path.resolve(HERE, "..", "install.js");
function step(label) {
  process.stdout.write(`
\u2501\u2501\u2501 ${label} \u2501\u2501\u2501
`);
}
function run(cmd, extraArgs) {
  const r = spawnSync(process.execPath, [INSTALL_JS, cmd, ...extraArgs], { stdio: "inherit" });
  return r.status ?? 1;
}
function main() {
  const argv = process.argv.slice(2);
  const positional = argv.filter((a) => !a.startsWith("--"));
  const skip = /* @__PURE__ */ new Set();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--") && i + 1 < argv.length) skip.add(argv[i + 1]);
  }
  const request = positional.filter((p) => !skip.has(p)).join(" ");
  if (!request) {
    process.stderr.write(
      [
        '\uC0AC\uC6A9\uBC95: jinhak-harness autopilot "<\uC790\uB3D9\uD654 \uC694\uCCAD>" [--expected-rows N]',
        '\uC608\uC2DC: jinhak-harness autopilot "\uCC44\uC6A9\uACF5\uACE0 Excel \uC815\uB9AC" --expected-rows 3',
        ""
      ].join("\n")
    );
    return 2;
  }
  const expectedRowsIdx = argv.indexOf("--expected-rows");
  const verifyArgs = [];
  if (expectedRowsIdx >= 0 && argv[expectedRowsIdx + 1]) {
    verifyArgs.push("--expected-rows", argv[expectedRowsIdx + 1]);
  }
  step("1/3 plan");
  let code = run("plan", [request]);
  if (code !== 0) {
    process.stderr.write(`
\u{1F6E0} plan \uB2E8\uACC4\uC5D0\uC11C \uBA48\uCDC4\uC2B5\uB2C8\uB2E4 (exit ${code}). \uC704 \uC548\uB0B4\uB97C \uB530\uB77C \uC218\uC815 \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.
`);
    return code;
  }
  step("2/3 build");
  code = run("build", [request]);
  if (code !== 0) {
    process.stderr.write(`
\u{1F6E0} build \uB2E8\uACC4\uC5D0\uC11C \uBA48\uCDC4\uC2B5\uB2C8\uB2E4 (exit ${code}). \uC785\uB825 \uD3F4\uB354\uC640 \uD15C\uD50C\uB9BF\uC744 \uD655\uC778\uD558\uC138\uC694.
`);
    return code;
  }
  step("3/3 verify");
  code = run("verify", verifyArgs);
  step("\u2705 autopilot \uC644\uB8CC");
  process.stdout.write(
    [
      "",
      "\uB2E4\uC74C \uB2E8\uACC4 (\uC0AC\uC6A9\uC790 \uACB0\uC815):",
      "  jinhak-harness handoff           # \uBBF8\uB9AC\uBCF4\uAE30",
      "  jinhak-harness handoff --confirm # \uC2E4\uC81C \uBCF5\uC0AC",
      ""
    ].join("\n")
  );
  return code;
}
try {
  process.exit(main());
} catch (err) {
  process.stderr.write(formatError(err));
  process.exit(1);
}

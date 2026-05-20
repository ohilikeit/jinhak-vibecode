#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { createRequire } from "node:module";
const require2 = createRequire(import.meta.url);
const { formatError, HarnessError } = require2("../friendly-error.js");
const memory = require2("../memory.js");
function parseArgs(argv) {
  const opt = (name, dflt) => {
    const i = argv.indexOf(name);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : dflt;
  };
  const cwd = process.cwd();
  return {
    output: opt("--output", path.join(cwd, "output", "jobs.xlsx")),
    to: opt("--to", path.join(cwd, "handoff")),
    label: opt("--label", "jobs"),
    confirm: argv.includes("--confirm")
  };
}
function buildTargetName(label, sourceExt) {
  const now = /* @__PURE__ */ new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${label}-${yyyy}-${mm}-${dd}${sourceExt}`;
}
function appendStateLog(stateMdDir, entry) {
  fs.mkdirSync(stateMdDir, { recursive: true });
  const stateMd = path.join(stateMdDir, "state.md");
  let body = "";
  if (fs.existsSync(stateMd)) {
    body = fs.readFileSync(stateMd, "utf-8");
  } else {
    body = [
      "# \uD504\uB85C\uC81D\uD2B8 \uC0C1\uD0DC",
      "",
      `\uCD08\uAE30\uD654: ${(/* @__PURE__ */ new Date()).toISOString()}`,
      "",
      "## \uC9C4\uD589 \uC911\uC778 \uC790\uB3D9\uD654",
      "- (\uC5C6\uC74C)",
      "",
      "## \uBA54\uBAA8",
      "- /build \uBA85\uB839\uC73C\uB85C \uC0C8 \uC790\uB3D9\uD654 \uCD94\uAC00",
      ""
    ].join("\n");
  }
  const hasLog = body.includes("## \uD578\uB4DC\uC624\uD504 \uB85C\uADF8");
  if (!hasLog) {
    body = body.replace(/\s*$/, "") + "\n\n## \uD578\uB4DC\uC624\uD504 \uB85C\uADF8\n";
  }
  body = body.replace(/\s*$/, "") + `
- ${entry}
`;
  fs.writeFileSync(stateMd, body);
  return stateMd;
}
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.output)) {
    const err = new HarnessError("output-not-found", "output missing", { path: args.output });
    process.stderr.write(formatError(err));
    return 1;
  }
  const ext = path.extname(args.output);
  const targetName = buildTargetName(args.label, ext);
  const targetPath = path.join(args.to, targetName);
  process.stdout.write(
    [
      `\u{1F4E6} \uD578\uB4DC\uC624\uD504 \uBBF8\uB9AC\uBCF4\uAE30`,
      `  \uC6D0\uBCF8:   ${args.output}`,
      `  \uB300\uC0C1:   ${targetPath}`,
      `  \uB77C\uBCA8:   ${args.label}`,
      `  \uD30C\uC77C\uBA85: ${targetName}`,
      ""
    ].join("\n")
  );
  if (!args.confirm) {
    process.stdout.write(
      [
        "\u2139\uFE0F  dry-run \uBAA8\uB4DC (eco \uAE30\uBCF8) \u2014 \uC2E4\uC81C\uB85C \uBCF5\uC0AC\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.",
        "   \uC2E4\uD589\uD558\uB824\uBA74 \uB2E4\uC2DC \uAC19\uC740 \uBA85\uB839\uC5D0 `--confirm` \uC744 \uBD99\uC5EC\uC8FC\uC138\uC694:",
        `   $ jinhak-harness handoff --to ${args.to} --label ${args.label} --confirm`,
        ""
      ].join("\n")
    );
    return 0;
  }
  fs.mkdirSync(args.to, { recursive: true });
  fs.copyFileSync(args.output, targetPath);
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const entry = `${timestamp}  ${path.basename(args.output)} \u2192 ${targetPath}`;
  const stateMd = appendStateLog(path.join(process.cwd(), ".harness"), entry);
  memory.saveDecision("last_handoff", {
    timestamp,
    source: args.output,
    target: targetPath,
    label: args.label
  });
  process.stdout.write(
    [
      `\u2705 \uBCF5\uC0AC \uC644\uB8CC: ${targetPath}`,
      `\u2705 \uD65C\uB3D9 \uB85C\uADF8 \uAE30\uB85D: ${stateMd}`,
      "",
      "\u{1F3AF} \uB2E4\uC74C \uB2E8\uACC4: \uC774 \uD30C\uC77C\uC744 \uC0AC\uC6A9\uC790\uBD84\uC758 \uD45C\uC900 \uC704\uCE58(\uC608: \uD68C\uC0AC \uACF5\uC720 \uB4DC\uB77C\uC774\uBE0C)\uB85C \uC62E\uACA8\uC8FC\uC138\uC694.",
      ""
    ].join("\n")
  );
  return 0;
}
process.exit(main());

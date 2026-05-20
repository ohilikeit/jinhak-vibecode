#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
const require2 = createRequire(import.meta.url);
const { formatError, HarnessError } = require2("../friendly-error.js");
const { printCostLabel } = require2("../cost-label.js");
function parseArgs(argv) {
  const opt = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
  };
  return {
    confirm: argv.includes("--confirm"),
    push: argv.includes("--push"),
    message: opt("--message")
  };
}
function lastHandoffEntry(stateMd) {
  if (!fs.existsSync(stateMd)) return null;
  const body = fs.readFileSync(stateMd, "utf-8");
  const m = body.match(/##\s*핸드오프 로그\s*\n([\s\S]+?)(?=\n##|\n$)/);
  if (!m) return null;
  const lines = m[1].trim().split("\n").filter((l) => l.trim().startsWith("-"));
  return lines.length ? lines[lines.length - 1].replace(/^-\s*/, "") : null;
}
function git(args) {
  const r = spawnSync("git", args, { encoding: "utf-8" });
  return { code: r.status ?? 1, out: r.stdout || "", err: r.stderr || "" };
}
function main() {
  printCostLabel("ship");
  const args = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const stateMd = path.join(cwd, ".harness", "state.md");
  const inGitRepo = git(["rev-parse", "--is-inside-work-tree"]).code === 0;
  if (!inGitRepo) {
    process.stderr.write("\uC774 \uB514\uB809\uD130\uB9AC\uB294 git \uC800\uC7A5\uC18C\uAC00 \uC544\uB2D9\uB2C8\uB2E4. /ship\uC740 git \uCEE4\uBC0B \uBA85\uB839\uC774\uC5D0\uC694.\n");
    return 1;
  }
  const lastEntry = lastHandoffEntry(stateMd);
  const message = args.message || (lastEntry ? `ship: ${lastEntry.split(" \u2192 ")[0]} \u2192 ${lastEntry.split(" \u2192 ")[1] || "(\uB300\uC0C1 \uBBF8\uC0C1)"}` : "ship: handoff");
  const status = git(["status", "--porcelain"]);
  const candidates = status.out.split("\n").filter((l) => l.length > 3).map((l) => ({ status: l.slice(0, 2), file: l.slice(3) })).filter((c2) => c2.file.startsWith(".harness/") || c2.file === ".harness" || c2.file.endsWith("user-profile.md") || c2.file === ".harness/");
  process.stdout.write(
    [
      `\u{1F4E6} ship \uBBF8\uB9AC\uBCF4\uAE30`,
      `  \uBA54\uC2DC\uC9C0: ${message}`,
      `  \uB9C8\uC9C0\uB9C9 handoff \uB85C\uADF8: ${lastEntry || "(\uC5C6\uC74C \u2014 state.md\uB97C \uBABB \uCC3E\uC558\uC5B4\uC694)"}`,
      `  \uBCC0\uACBD \uD6C4\uBCF4 (.harness/* \uB610\uB294 user-profile.md):`,
      ...candidates.length ? candidates.map((c2) => `    ${c2.status} ${c2.file}`) : ["    (\uC2A4\uD14C\uC774\uC9C0\uD560 \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4)"],
      ""
    ].join("\n")
  );
  if (!args.confirm) {
    process.stdout.write(
      [
        "\u2139\uFE0F  dry-run \uBAA8\uB4DC \u2014 \uC2E4\uC81C\uB85C \uCEE4\uBC0B\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.",
        "   \uC2E4\uC81C \uCEE4\uBC0B: \uAC19\uC740 \uBA85\uB839\uC5D0 `--confirm` \uC744 \uBD99\uC5EC\uC8FC\uC138\uC694.",
        ""
      ].join("\n")
    );
    return 0;
  }
  if (candidates.length === 0) {
    process.stdout.write("\uBCC0\uACBD\uB41C .harness \uD30C\uC77C\uC774 \uC5C6\uC5B4\uC11C \uCEE4\uBC0B\uD560 \uAC8C \uC5C6\uC2B5\uB2C8\uB2E4.\n");
    return 0;
  }
  for (const c2 of candidates) {
    const r = git(["add", "--", c2.file]);
    if (r.code !== 0) {
      process.stderr.write(`git add \uC2E4\uD328: ${c2.file}
${r.err}
`);
      return 1;
    }
  }
  const c = git(["commit", "-m", message]);
  if (c.code !== 0) {
    process.stderr.write(`git commit \uC2E4\uD328:
${c.err || c.out}
`);
    return 1;
  }
  process.stdout.write(`\u2705 \uCEE4\uBC0B \uC644\uB8CC: ${message}
`);
  if (args.push) {
    const p = git(["push"]);
    if (p.code !== 0) {
      process.stderr.write(`git push \uC2E4\uD328 (\uCEE4\uBC0B\uC740 \uB428):
${p.err || p.out}
`);
      return 1;
    }
    process.stdout.write("\u2705 push \uC644\uB8CC\n");
  }
  return 0;
}
try {
  process.exit(main());
} catch (err) {
  process.stderr.write(formatError(err));
  process.exit(1);
}

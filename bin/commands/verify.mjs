#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require2 = createRequire(import.meta.url);
const { formatError, HarnessError } = require2("../friendly-error.js");
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const INSPECT_PY = path.resolve(
  REPO_ROOT,
  "templates/common/utils/xlsx-write/scripts/read.py"
);
function parseArgs(argv) {
  const opt = (name, dflt) => {
    const i = argv.indexOf(name);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : dflt;
  };
  const optInt = (name) => {
    const v = opt(name, "");
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const cwd = process.cwd();
  return {
    output: opt("--output", path.join(cwd, "output", "jobs.xlsx")),
    template: opt("--template", path.join(cwd, "assets", "template.xlsx")),
    expectedRows: optInt("--expected-rows"),
    python: process.env.JINHAK_PYTHON || "python3"
  };
}
function inspect(python, xlsx) {
  const r = spawnSync(python, [INSPECT_PY, xlsx], { encoding: "utf-8" });
  if (r.status !== 0) {
    throw new Error(`inspect.py exited with code ${r.status}: ${r.stderr.trim()}`);
  }
  return JSON.parse(r.stdout);
}
function reportLines(args, out, tmpl) {
  const lines = [];
  let ok = true;
  let warnings = 0;
  lines.push(`\u{1F4CB} \uCD9C\uB825 \uD30C\uC77C: ${args.output}`);
  lines.push(`\u{1F4D0} \uD15C\uD50C\uB9BF:    ${args.template}`);
  lines.push("");
  if (tmpl) {
    const same = JSON.stringify(out.headers) === JSON.stringify(tmpl.headers);
    if (same) {
      lines.push(`\u2705 \uD5E4\uB354\uAC00 \uD15C\uD50C\uB9BF\uACFC \uC77C\uCE58\uD569\uB2C8\uB2E4 (${out.headers.length}\uAC1C): ${out.headers.join(" / ")}`);
    } else {
      ok = false;
      lines.push(`\u274C \uD5E4\uB354\uAC00 \uD15C\uD50C\uB9BF\uACFC \uB2E4\uB985\uB2C8\uB2E4`);
      lines.push(`   \uD15C\uD50C\uB9BF: ${tmpl.headers.join(" / ")}`);
      lines.push(`   \uCD9C\uB825  : ${out.headers.join(" / ")}`);
    }
  } else {
    lines.push(`\u2139\uFE0F  \uD15C\uD50C\uB9BF\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC5B4 \uD5E4\uB354 \uBE44\uAD50\uB97C \uAC74\uB108\uB701\uB2C8\uB2E4 (${args.template})`);
    lines.push(`   \uCD9C\uB825 \uD5E4\uB354: ${out.headers.join(" / ")}`);
  }
  lines.push(`\u{1F4CA} \uB370\uC774\uD130 \uD589 \uC218: ${out.row_count}`);
  if (args.expectedRows !== null) {
    if (out.row_count === args.expectedRows) {
      lines.push(`\u2705 \uC608\uC0C1 \uD589 \uC218 (${args.expectedRows})\uC640 \uC77C\uCE58\uD569\uB2C8\uB2E4`);
    } else {
      ok = false;
      lines.push(`\u274C \uC608\uC0C1 \uD589 \uC218 ${args.expectedRows}, \uC2E4\uC81C ${out.row_count} \u2014 \uCC28\uC774 ${out.row_count - args.expectedRows}`);
    }
  }
  if (out.empty_cells.length === 0) {
    lines.push(`\u2705 \uBE48 \uC140 \uC5C6\uC74C (\uBAA8\uB4E0 \uC140\uC774 \uCC44\uC6CC\uC838 \uC788\uC2B5\uB2C8\uB2E4)`);
  } else {
    warnings += 1;
    const totalCells = out.row_count * out.headers.length;
    const pct = totalCells > 0 ? (out.empty_cells.length / totalCells * 100).toFixed(1) : "0";
    lines.push(`\u26A0\uFE0F  \uBE48 \uC140 ${out.empty_cells.length}\uAC1C (${pct}% \u2014 \uC804\uCCB4 ${totalCells}\uC140 \uC911)`);
    for (const [row, , header] of out.empty_cells.slice(0, 5)) {
      lines.push(`   - ${row}\uD589 "${header}" \uCEEC\uB7FC\uC774 \uBE44\uC5B4\uC788\uC2B5\uB2C8\uB2E4 \u2192 \uC6D0\uBCF8 PDF\uC5D0\uC11C "${header}:" \uB77C\uBCA8\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC744 \uC218 \uC788\uC5B4\uC694`);
    }
    if (out.empty_cells.length > 5) {
      lines.push(`   ... (\uC678 ${out.empty_cells.length - 5}\uAC1C)`);
    }
  }
  const allBold = out.header_bold.every(Boolean);
  if (allBold) {
    lines.push(`\u2705 \uD5E4\uB354 \uC2A4\uD0C0\uC77C(\uBCFC\uB4DC) \uBCF4\uC874\uB428`);
  } else {
    warnings += 1;
    lines.push(`\u26A0\uFE0F  \uC77C\uBD80 \uD5E4\uB354\uAC00 \uBCFC\uB4DC\uAC00 \uC544\uB2D9\uB2C8\uB2E4: ${out.header_bold}`);
  }
  lines.push("");
  if (!ok) {
    lines.push("\u{1F6E0}  \uAC80\uC99D \uC2E4\uD328 \u2014 \uC704 \uD56D\uBAA9\uC744 \uD655\uC778\uD558\uC138\uC694.");
  } else if (warnings > 0) {
    lines.push(`\u26A0\uFE0F  \uAC80\uC99D \uC644\uB8CC \u2014 \uACBD\uACE0 ${warnings}\uAC74\uC774 \uC788\uC2B5\uB2C8\uB2E4. \uBCF4\uB0B4\uAE30 \uC804\uC5D0 \uD55C \uBC88 \uB354 \uD655\uC778\uD558\uC138\uC694.`);
  } else {
    lines.push("\u{1F389} \uAC80\uC99D \uD1B5\uACFC \u2014 \uC0B0\uCD9C\uBB3C\uC744 \uADF8\uB300\uB85C \uC0AC\uC6A9\uD574\uB3C4 \uB429\uB2C8\uB2E4.");
  }
  return { lines, ok, warnings };
}
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.output)) {
    const err = new HarnessError("output-not-found", "output missing", { path: args.output });
    process.stderr.write(formatError(err));
    return 1;
  }
  const out = inspect(args.python, args.output);
  const tmpl = fs.existsSync(args.template) ? inspect(args.python, args.template) : void 0;
  const { lines, ok } = reportLines(args, out, tmpl);
  process.stdout.write(lines.join("\n") + "\n");
  return ok ? 0 : 1;
}
process.exit(main());

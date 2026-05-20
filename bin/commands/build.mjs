#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { extract } from "../../templates/common/utils/pdf-extract/scripts/extract.ts";
import { write } from "../../templates/common/utils/xlsx-write/scripts/write.ts";
import { write as writeCsv } from "../../templates/common/utils/csv-write/scripts/write.ts";
import { createRequire } from "node:module";
const require2 = createRequire(import.meta.url);
const { formatError, HarnessError } = require2("../friendly-error.js");
const { loadSpecs, keywordsFor } = require2("../user-skill-loader.js");
function parseArgs(argv) {
  const opt = (name, dflt) => {
    const i = argv.indexOf(name);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : dflt;
  };
  const skip = /* @__PURE__ */ new Set();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--") && i + 1 < argv.length) skip.add(argv[i + 1]);
  }
  const positional = argv.filter((a) => !a.startsWith("--") && !skip.has(a));
  const req = positional.join(" ");
  const cwd = process.cwd();
  return {
    request: req,
    inboxJobs: opt("--inbox", path.join(cwd, "inbox", "jobs")),
    templateJobs: opt("--template", path.join(cwd, "assets", "template.xlsx")),
    outputJobs: opt("--output", path.join(cwd, "output", "jobs.xlsx")),
    inboxMeetings: opt("--inbox-meetings", path.join(cwd, "inbox", "meetings")),
    outputMeetings: opt("--output-meetings", path.join(cwd, "output", "meeting-summary.md")),
    inboxReceipts: opt("--inbox-receipts", path.join(cwd, "inbox", "receipts")),
    outputExpenses: opt("--output-expenses", path.join(cwd, "output", "expenses.csv")),
    python: process.env.JINHAK_PYTHON
  };
}
function parseAmount(raw) {
  const digits = raw.replace(/[^0-9-]/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}
function pickField(text, labels) {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    for (const label of labels) {
      const idx = line.indexOf(`${label}:`);
      if (idx >= 0) {
        return line.slice(idx + label.length + 1).trim();
      }
    }
  }
  return null;
}
function pickTitle(text) {
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (t) return t;
  }
  return "";
}
const RULES = [
  {
    skill: "jobs-pdf-to-excel",
    keywords: ["\uCC44\uC6A9\uACF5\uACE0", "\uACF5\uACE0", "Excel", "\uC5D1\uC140", "\uC2A4\uD504\uB808\uB4DC\uC2DC\uD2B8"],
    describeIO: (a) => [
      `  inbox=${a.inboxJobs}`,
      `  template=${a.templateJobs}`,
      `  output=${a.outputJobs}`
    ],
    run: async (a) => {
      if (!fs.existsSync(a.inboxJobs))
        throw new HarnessError("inbox-not-found", "inbox missing", {
          path: a.inboxJobs,
          skill: "jobs-pdf-to-excel"
        });
      if (!fs.existsSync(a.templateJobs))
        throw new HarnessError("template-not-found", "template missing", {
          path: a.templateJobs
        });
      const pdfs = fs.readdirSync(a.inboxJobs).filter((f) => f.toLowerCase().endsWith(".pdf")).map((f) => path.join(a.inboxJobs, f)).sort();
      if (pdfs.length === 0)
        throw new HarnessError("inbox-empty", "no pdf", {
          path: a.inboxJobs,
          kind: "PDF",
          ext: ".pdf"
        });
      const rows = [];
      for (const pdf of pdfs) {
        const { pages } = await extract(pdf, { python: a.python });
        const text = pages.map((p) => p.text).join("\n");
        rows.push({
          \uACF5\uACE0\uC81C\uBAA9: pickTitle(text),
          \uD68C\uC0AC\uBA85: pickField(text, ["\uD68C\uC0AC\uBA85"]) ?? "",
          \uC9C1\uBB34: pickField(text, ["\uC9C1\uBB34"]) ?? "",
          \uADFC\uBB34\uC9C0: pickField(text, ["\uADFC\uBB34\uC9C0"]) ?? "",
          \uB9C8\uAC10\uC77C: pickField(text, ["\uB9C8\uAC10\uC77C"]) ?? ""
        });
      }
      fs.mkdirSync(path.dirname(a.outputJobs), { recursive: true });
      const r = await write({
        template: a.templateJobs,
        output: a.outputJobs,
        rows,
        python: a.python
      });
      return { output: r.output, rows: r.rows_written };
    }
  },
  {
    skill: "expense-pdf-to-csv",
    keywords: ["\uC601\uC218\uC99D", "\uC9C0\uCD9C", "\uACBD\uBE44", "\uBE44\uC6A9 \uC815\uC0B0", "\uBE44\uC6A9\uC815\uC0B0"],
    describeIO: (a) => [
      `  inbox=${a.inboxReceipts}`,
      `  output=${a.outputExpenses}`
    ],
    run: async (a) => {
      if (!fs.existsSync(a.inboxReceipts))
        throw new HarnessError("inbox-not-found", "inbox missing", {
          path: a.inboxReceipts,
          skill: "expense-pdf-to-csv"
        });
      const pdfs = fs.readdirSync(a.inboxReceipts).filter((f) => f.toLowerCase().endsWith(".pdf")).map((f) => path.join(a.inboxReceipts, f)).sort();
      if (pdfs.length === 0)
        throw new HarnessError("inbox-empty", "no pdf", {
          path: a.inboxReceipts,
          kind: "PDF",
          ext: ".pdf"
        });
      const rows = [];
      let total = 0;
      for (const pdf of pdfs) {
        const { pages } = await extract(pdf, { python: a.python });
        const text = pages.map((p) => p.text).join("\n");
        const amountRaw = pickField(text, ["\uAE08\uC561"]) ?? "0";
        const amount = parseAmount(amountRaw);
        total += amount;
        rows.push({
          \uC77C\uC790: pickField(text, ["\uC77C\uC790", "\uB0A0\uC9DC"]) ?? "(\uBBF8\uAE30\uC7AC)",
          \uAE08\uC561: amount,
          \uD56D\uBAA9: pickField(text, ["\uD56D\uBAA9", "\uC6A9\uB3C4"]) ?? "(\uBBF8\uAE30\uC7AC)",
          \uBD80\uC11C: pickField(text, ["\uBD80\uC11C"]) ?? "(\uBBF8\uAE30\uC7AC)"
        });
      }
      rows.push({ \uC77C\uC790: "\uD569\uACC4", \uAE08\uC561: total, \uD56D\uBAA9: "", \uBD80\uC11C: "" });
      fs.mkdirSync(path.dirname(a.outputExpenses), { recursive: true });
      const r = await writeCsv({ output: a.outputExpenses, rows, python: a.python });
      return { output: r.output, rows: r.rows };
    }
  },
  {
    skill: "meeting-notes-to-summary",
    keywords: ["\uD68C\uC758\uB85D", "\uD68C\uC758 \uC694\uC57D", "\uD68C\uC758", "\uC561\uC158 \uC544\uC774\uD15C", "\uC561\uC158\uC544\uC774\uD15C"],
    describeIO: (a) => [
      `  inbox=${a.inboxMeetings}`,
      `  output=${a.outputMeetings}`
    ],
    run: async (a) => {
      if (!fs.existsSync(a.inboxMeetings))
        throw new HarnessError("inbox-not-found", "inbox missing", {
          path: a.inboxMeetings,
          skill: "meeting-notes-to-summary"
        });
      const files = fs.readdirSync(a.inboxMeetings).filter((f) => f.toLowerCase().endsWith(".txt")).map((f) => path.join(a.inboxMeetings, f)).sort();
      if (files.length === 0)
        throw new HarnessError("inbox-empty", "no .txt", {
          path: a.inboxMeetings,
          kind: "\uD68C\uC758\uB85D",
          ext: ".txt"
        });
      const rows = [];
      for (const file of files) {
        const text = fs.readFileSync(file, "utf-8");
        rows.push({
          \uB0A0\uC9DC: pickField(text, ["\uB0A0\uC9DC", "\uC77C\uC790"]) ?? "(\uBBF8\uAE30\uC7AC)",
          \uCC38\uC11D\uC790: pickField(text, ["\uCC38\uC11D\uC790"]) ?? "(\uBBF8\uAE30\uC7AC)",
          \uACB0\uC815\uC0AC\uD56D: pickField(text, ["\uACB0\uC815\uC0AC\uD56D", "\uACB0\uC815"]) ?? "(\uBBF8\uAE30\uC7AC)",
          \uC561\uC158: pickField(text, ["\uC561\uC158\uC544\uC774\uD15C", "\uC561\uC158"]) ?? "(\uBBF8\uAE30\uC7AC)"
        });
      }
      fs.mkdirSync(path.dirname(a.outputMeetings), { recursive: true });
      const lines = [
        "# \uD68C\uC758 \uC694\uC57D",
        "",
        `\uC815\uB9AC \uC2DC\uAC01: ${(/* @__PURE__ */ new Date()).toISOString()}`,
        `\uCD1D ${rows.length}\uAC74`,
        "",
        "| \uB0A0\uC9DC | \uCC38\uC11D\uC790 | \uACB0\uC815\uC0AC\uD56D | \uC561\uC158 |",
        "|---|---|---|---|",
        ...rows.map((r) => `| ${r.\uB0A0\uC9DC} | ${r.\uCC38\uC11D\uC790} | ${r.\uACB0\uC815\uC0AC\uD56D} | ${r.\uC561\uC158} |`),
        ""
      ];
      fs.writeFileSync(a.outputMeetings, lines.join("\n"));
      return { output: a.outputMeetings, rows: rows.length };
    }
  }
];
function buildUserSkillRule(spec) {
  return {
    skill: spec.name,
    keywords: keywordsFor(spec),
    describeIO: () => [
      `  inbox=${spec.inbox_dir}`,
      `  output=${spec.output_path}`,
      `  \uD544\uB4DC=${(spec.fields || []).join(", ") || "(\uC5C6\uC74C)"}`
    ],
    run: async () => {
      const cwd = process.cwd();
      const inbox = path.isAbsolute(spec.inbox_dir) ? spec.inbox_dir : path.join(cwd, spec.inbox_dir);
      const outPath = path.isAbsolute(spec.output_path) ? spec.output_path : path.join(cwd, spec.output_path);
      const inExt = "." + String(spec.input_ext || "").replace(/^\./, "");
      if (!fs.existsSync(inbox)) {
        throw new HarnessError("inbox-not-found", "inbox missing", {
          path: inbox,
          skill: spec.name
        });
      }
      const files = fs.readdirSync(inbox).filter((f) => f.toLowerCase().endsWith(inExt)).map((f) => path.join(inbox, f)).sort();
      if (files.length === 0) {
        throw new HarnessError("inbox-empty", "no files", {
          path: inbox,
          kind: spec.input_ext.toUpperCase(),
          ext: inExt
        });
      }
      const rows = [];
      for (const file of files) {
        let text = "";
        if (spec.input_ext === "pdf") {
          const { pages } = await extract(file);
          text = pages.map((p) => p.text).join("\n");
        } else {
          text = fs.readFileSync(file, "utf-8");
        }
        const row = {};
        for (const field of spec.fields || []) {
          row[field] = pickField(text, [field]) ?? "(\uBBF8\uAE30\uC7AC)";
        }
        rows.push(row);
      }
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      if (spec.output_ext === "csv") {
        const r = await writeCsv({ output: outPath, rows });
        return { output: r.output, rows: r.rows };
      }
      if (spec.output_ext === "md") {
        const headers = spec.fields || [];
        const lines = [
          `# ${spec.name}`,
          "",
          `\uC815\uB9AC \uC2DC\uAC01: ${(/* @__PURE__ */ new Date()).toISOString()}`,
          `\uCD1D ${rows.length}\uAC74`,
          "",
          "| " + headers.join(" | ") + " |",
          "|" + headers.map(() => "---").join("|") + "|",
          ...rows.map((r) => "| " + headers.map((h) => String(r[h] ?? "")).join(" | ") + " |"),
          ""
        ];
        fs.writeFileSync(outPath, lines.join("\n"));
        return { output: outPath, rows: rows.length };
      }
      throw new HarnessError("unknown", `user-skill \uB3D9\uC801 runner\uB294 ${spec.output_ext}\uC744 \uC544\uC9C1 \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. csv/md\uB9CC \uAC00\uB2A5\uD569\uB2C8\uB2E4.`);
    }
  };
}
function chooseRule(request) {
  const r = request || "";
  for (const spec of loadSpecs()) {
    const rule = buildUserSkillRule(spec);
    if (rule.keywords.some((k) => r.includes(k))) return rule;
  }
  for (const rule of RULES) {
    if (rule.keywords.some((k) => r.includes(k))) return rule;
  }
  return null;
}
async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  const rule = chooseRule(args.request);
  if (!rule) {
    const err = new HarnessError("skill-not-matched", "no rule", {
      request: args.request,
      supported: RULES.map((r) => ({ skill: r.skill, keywords: r.keywords }))
    });
    process.stderr.write(formatError(err));
    process.exit(2);
  }
  process.stderr.write(`\u25B6 skill=${rule.skill}
`);
  for (const line of rule.describeIO(args)) process.stderr.write(line + "\n");
  const result = await rule.run(args);
  process.stdout.write(
    JSON.stringify({ skill: rule.skill, output: result.output, rows: result.rows }) + "\n"
  );
}
main().catch((err) => {
  process.stderr.write(formatError(err));
  process.exit(1);
});

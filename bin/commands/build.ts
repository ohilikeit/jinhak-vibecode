#!/usr/bin/env node
// jinhak-harness — /build (Layer 2.5)
// 룰 테이블 디스패치로 여러 직군 스킬을 한 진입점에서 실행한다.
//
// 사용:
//   node bin/install.js build "<요청 문자열>" [skill별 옵션]
//
// 새 스킬 추가:
//   1) templates/.agents/skills/<skill>/SKILL.md 작성
//   2) 아래 RULES 배열에 키워드 + runner 등록
//   3) Args 인터페이스/parseArgs에 skill별 옵션 추가

import * as fs from "node:fs";
import * as path from "node:path";
import { extract } from "../../templates/common/utils/pdf-extract/scripts/extract.ts";
import { write } from "../../templates/common/utils/xlsx-write/scripts/write.ts";
import { write as writeCsv } from "../../templates/common/utils/csv-write/scripts/write.ts";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { formatError, HarnessError } = require("../friendly-error.js");
const { loadSpecs, keywordsFor } = require("../user-skill-loader.js");

interface Args {
  request: string;
  // jobs-pdf-to-excel
  inboxJobs: string;
  templateJobs: string;
  outputJobs: string;
  // meeting-notes-to-summary
  inboxMeetings: string;
  outputMeetings: string;
  // expense-pdf-to-csv
  inboxReceipts: string;
  outputExpenses: string;
  // 공통
  python?: string;
}

function parseArgs(argv: string[]): Args {
  const opt = (name: string, dflt: string) => {
    const i = argv.indexOf(name);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : dflt;
  };
  const skip = new Set<string>();
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
    python: process.env.JINHAK_PYTHON,
  };
}

function parseAmount(raw: string): number {
  const digits = raw.replace(/[^0-9-]/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

// ── 공용 헬퍼 ─────────────────────────────────────────────
function pickField(text: string, labels: string[]): string | null {
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

function pickTitle(text: string): string {
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (t) return t;
  }
  return "";
}

// ── 룰 테이블 ─────────────────────────────────────────────
interface Rule {
  skill: string;
  keywords: string[];
  run: (args: Args) => Promise<{ output: string; rows: number }>;
  describeIO: (args: Args) => string[];
}

const RULES: Rule[] = [
  {
    skill: "jobs-pdf-to-excel",
    keywords: ["채용공고", "공고", "Excel", "엑셀", "스프레드시트"],
    describeIO: (a) => [
      `  inbox=${a.inboxJobs}`,
      `  template=${a.templateJobs}`,
      `  output=${a.outputJobs}`,
    ],
    run: async (a) => {
      if (!fs.existsSync(a.inboxJobs))
        throw new HarnessError("inbox-not-found", "inbox missing", {
          path: a.inboxJobs,
          skill: "jobs-pdf-to-excel",
        });
      if (!fs.existsSync(a.templateJobs))
        throw new HarnessError("template-not-found", "template missing", {
          path: a.templateJobs,
        });
      const pdfs = fs
        .readdirSync(a.inboxJobs)
        .filter((f) => f.toLowerCase().endsWith(".pdf"))
        .map((f) => path.join(a.inboxJobs, f))
        .sort();
      if (pdfs.length === 0)
        throw new HarnessError("inbox-empty", "no pdf", {
          path: a.inboxJobs,
          kind: "PDF",
          ext: ".pdf",
        });
      const rows: Record<string, string>[] = [];
      for (const pdf of pdfs) {
        const { pages } = await extract(pdf, { python: a.python });
        const text = pages.map((p) => p.text).join("\n");
        rows.push({
          공고제목: pickTitle(text),
          회사명: pickField(text, ["회사명"]) ?? "",
          직무: pickField(text, ["직무"]) ?? "",
          근무지: pickField(text, ["근무지"]) ?? "",
          마감일: pickField(text, ["마감일"]) ?? "",
        });
      }
      fs.mkdirSync(path.dirname(a.outputJobs), { recursive: true });
      const r = await write({
        template: a.templateJobs,
        output: a.outputJobs,
        rows,
        python: a.python,
      });
      return { output: r.output, rows: r.rows_written };
    },
  },
  {
    skill: "expense-pdf-to-csv",
    keywords: ["영수증", "지출", "경비", "비용 정산", "비용정산"],
    describeIO: (a) => [
      `  inbox=${a.inboxReceipts}`,
      `  output=${a.outputExpenses}`,
    ],
    run: async (a) => {
      if (!fs.existsSync(a.inboxReceipts))
        throw new HarnessError("inbox-not-found", "inbox missing", {
          path: a.inboxReceipts,
          skill: "expense-pdf-to-csv",
        });
      const pdfs = fs
        .readdirSync(a.inboxReceipts)
        .filter((f) => f.toLowerCase().endsWith(".pdf"))
        .map((f) => path.join(a.inboxReceipts, f))
        .sort();
      if (pdfs.length === 0)
        throw new HarnessError("inbox-empty", "no pdf", {
          path: a.inboxReceipts,
          kind: "PDF",
          ext: ".pdf",
        });
      const rows: Record<string, string | number>[] = [];
      let total = 0;
      for (const pdf of pdfs) {
        const { pages } = await extract(pdf, { python: a.python });
        const text = pages.map((p) => p.text).join("\n");
        const amountRaw = pickField(text, ["금액"]) ?? "0";
        const amount = parseAmount(amountRaw);
        total += amount;
        rows.push({
          일자: pickField(text, ["일자", "날짜"]) ?? "(미기재)",
          금액: amount,
          항목: pickField(text, ["항목", "용도"]) ?? "(미기재)",
          부서: pickField(text, ["부서"]) ?? "(미기재)",
        });
      }
      rows.push({ 일자: "합계", 금액: total, 항목: "", 부서: "" });
      fs.mkdirSync(path.dirname(a.outputExpenses), { recursive: true });
      const r = await writeCsv({ output: a.outputExpenses, rows, python: a.python });
      return { output: r.output, rows: r.rows };
    },
  },
  {
    skill: "meeting-notes-to-summary",
    keywords: ["회의록", "회의 요약", "회의", "액션 아이템", "액션아이템"],
    describeIO: (a) => [
      `  inbox=${a.inboxMeetings}`,
      `  output=${a.outputMeetings}`,
    ],
    run: async (a) => {
      if (!fs.existsSync(a.inboxMeetings))
        throw new HarnessError("inbox-not-found", "inbox missing", {
          path: a.inboxMeetings,
          skill: "meeting-notes-to-summary",
        });
      const files = fs
        .readdirSync(a.inboxMeetings)
        .filter((f) => f.toLowerCase().endsWith(".txt"))
        .map((f) => path.join(a.inboxMeetings, f))
        .sort();
      if (files.length === 0)
        throw new HarnessError("inbox-empty", "no .txt", {
          path: a.inboxMeetings,
          kind: "회의록",
          ext: ".txt",
        });

      const rows: { 날짜: string; 참석자: string; 결정사항: string; 액션: string }[] = [];
      for (const file of files) {
        const text = fs.readFileSync(file, "utf-8");
        rows.push({
          날짜: pickField(text, ["날짜", "일자"]) ?? "(미기재)",
          참석자: pickField(text, ["참석자"]) ?? "(미기재)",
          결정사항: pickField(text, ["결정사항", "결정"]) ?? "(미기재)",
          액션: pickField(text, ["액션아이템", "액션"]) ?? "(미기재)",
        });
      }
      fs.mkdirSync(path.dirname(a.outputMeetings), { recursive: true });
      const lines = [
        "# 회의 요약",
        "",
        `정리 시각: ${new Date().toISOString()}`,
        `총 ${rows.length}건`,
        "",
        "| 날짜 | 참석자 | 결정사항 | 액션 |",
        "|---|---|---|---|",
        ...rows.map((r) => `| ${r.날짜} | ${r.참석자} | ${r.결정사항} | ${r.액션} |`),
        "",
      ];
      fs.writeFileSync(a.outputMeetings, lines.join("\n"));
      return { output: a.outputMeetings, rows: rows.length };
    },
  },
];

// user-skills/<name>/spec.json 을 RULES 형식으로 변환하는 일반화 runner
function buildUserSkillRule(spec: any): Rule {
  return {
    skill: spec.name,
    keywords: keywordsFor(spec),
    describeIO: () => [
      `  inbox=${spec.inbox_dir}`,
      `  output=${spec.output_path}`,
      `  필드=${(spec.fields || []).join(", ") || "(없음)"}`,
    ],
    run: async () => {
      const cwd = process.cwd();
      const inbox = path.isAbsolute(spec.inbox_dir) ? spec.inbox_dir : path.join(cwd, spec.inbox_dir);
      const outPath = path.isAbsolute(spec.output_path) ? spec.output_path : path.join(cwd, spec.output_path);
      const inExt = "." + String(spec.input_ext || "").replace(/^\./, "");

      if (!fs.existsSync(inbox)) {
        throw new HarnessError("inbox-not-found", "inbox missing", {
          path: inbox,
          skill: spec.name,
        });
      }
      const files = fs
        .readdirSync(inbox)
        .filter((f) => f.toLowerCase().endsWith(inExt))
        .map((f) => path.join(inbox, f))
        .sort();
      if (files.length === 0) {
        throw new HarnessError("inbox-empty", "no files", {
          path: inbox,
          kind: spec.input_ext.toUpperCase(),
          ext: inExt,
        });
      }

      const rows: Record<string, string>[] = [];
      for (const file of files) {
        let text = "";
        if (spec.input_ext === "pdf") {
          const { pages } = await extract(file);
          text = pages.map((p) => p.text).join("\n");
        } else {
          text = fs.readFileSync(file, "utf-8");
        }
        const row: Record<string, string> = {};
        for (const field of spec.fields || []) {
          row[field] = pickField(text, [field]) ?? "(미기재)";
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
          `정리 시각: ${new Date().toISOString()}`,
          `총 ${rows.length}건`,
          "",
          "| " + headers.join(" | ") + " |",
          "|" + headers.map(() => "---").join("|") + "|",
          ...rows.map((r) => "| " + headers.map((h: string) => String(r[h] ?? "")).join(" | ") + " |"),
          "",
        ];
        fs.writeFileSync(outPath, lines.join("\n"));
        return { output: outPath, rows: rows.length };
      }
      // xlsx는 템플릿이 필요하므로 MVP 동적 runner에서는 미지원
      throw new HarnessError("unknown", `user-skill 동적 runner는 ${spec.output_ext}을 아직 지원하지 않습니다. csv/md만 가능합니다.`);
    },
  };
}

function chooseRule(request: string): Rule | null {
  const r = request || "";
  // user-skill을 먼저 검사 (더 구체적인 키워드일 가능성 높음)
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
      supported: RULES.map((r) => ({ skill: r.skill, keywords: r.keywords })),
    });
    process.stderr.write(formatError(err));
    process.exit(2);
  }

  process.stderr.write(`▶ skill=${rule.skill}\n`);
  for (const line of rule.describeIO(args)) process.stderr.write(line + "\n");

  const result = await rule.run(args);
  process.stdout.write(
    JSON.stringify({ skill: rule.skill, output: result.output, rows: result.rows }) + "\n",
  );
}

main().catch((err) => {
  process.stderr.write(formatError(err));
  process.exit(1);
});

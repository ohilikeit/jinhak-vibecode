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

interface Args {
  request: string;
  // jobs-pdf-to-excel
  inboxJobs: string;
  templateJobs: string;
  outputJobs: string;
  // meeting-notes-to-summary
  inboxMeetings: string;
  outputMeetings: string;
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
    python: process.env.JINHAK_PYTHON,
  };
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
    keywords: ["채용공고", "공고", "PDF", "Excel", "엑셀", "스프레드시트"],
    describeIO: (a) => [
      `  inbox=${a.inboxJobs}`,
      `  template=${a.templateJobs}`,
      `  output=${a.outputJobs}`,
    ],
    run: async (a) => {
      if (!fs.existsSync(a.inboxJobs))
        throw new Error(`inbox 디렉터리를 찾지 못했습니다: ${a.inboxJobs}`);
      if (!fs.existsSync(a.templateJobs))
        throw new Error(`template xlsx를 찾지 못했습니다: ${a.templateJobs}`);
      const pdfs = fs
        .readdirSync(a.inboxJobs)
        .filter((f) => f.toLowerCase().endsWith(".pdf"))
        .map((f) => path.join(a.inboxJobs, f))
        .sort();
      if (pdfs.length === 0)
        throw new Error(`inbox에 PDF가 없습니다: ${a.inboxJobs}`);
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
    skill: "meeting-notes-to-summary",
    keywords: ["회의록", "회의 요약", "회의", "액션 아이템", "액션아이템"],
    describeIO: (a) => [
      `  inbox=${a.inboxMeetings}`,
      `  output=${a.outputMeetings}`,
    ],
    run: async (a) => {
      if (!fs.existsSync(a.inboxMeetings))
        throw new Error(`inbox 디렉터리를 찾지 못했습니다: ${a.inboxMeetings}`);
      const files = fs
        .readdirSync(a.inboxMeetings)
        .filter((f) => f.toLowerCase().endsWith(".txt"))
        .map((f) => path.join(a.inboxMeetings, f))
        .sort();
      if (files.length === 0)
        throw new Error(`inbox에 .txt 회의록이 없습니다: ${a.inboxMeetings}`);

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

function chooseRule(request: string): Rule | null {
  const r = request || "";
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
    process.stderr.write(
      [
        `요청을 매칭할 스킬이 없습니다: "${args.request}".`,
        "",
        "현재 지원하는 자동화:",
        ...RULES.map((r) => `  - ${r.skill}  (트리거: ${r.keywords.join(", ")})`),
        "",
      ].join("\n"),
    );
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
  process.stderr.write(`build failed: ${(err as Error).message}\n`);
  process.exit(1);
});

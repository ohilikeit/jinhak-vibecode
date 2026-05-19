#!/usr/bin/env node
// jinhak-harness — /build (MVP: jobs-pdf-to-excel만 지원)
//
// 사용:
//   node bin/install.js build "<요청 문자열>" \
//        [--inbox <dir>] [--template <xlsx>] [--output <xlsx>]
//
// MVP 정책: 인자에 "채용공고" 또는 "PDF" 또는 "Excel" 포함 시 jobs-pdf-to-excel 실행

import * as fs from "node:fs";
import * as path from "node:path";
import { extract } from "../../templates/common/utils/pdf-extract/scripts/extract.ts";
import { write } from "../../templates/common/utils/xlsx-write/scripts/write.ts";

interface Args {
  request: string;
  inbox: string;
  template: string;
  output: string;
  python?: string;
}

const HEADERS = ["공고제목", "회사명", "직무", "근무지", "마감일"];

function parseArgs(argv: string[]): Args {
  const opt = (name: string, dflt: string) => {
    const i = argv.indexOf(name);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : dflt;
  };
  const positional = argv.filter((a) => !a.startsWith("--"));
  const skip = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--") && i + 1 < argv.length) skip.add(argv[i + 1]);
  }
  const req = positional.find((p) => !skip.has(p)) || "";
  const cwd = process.cwd();
  return {
    request: req,
    inbox: opt("--inbox", path.join(cwd, "inbox", "jobs")),
    template: opt("--template", path.join(cwd, "assets", "template.xlsx")),
    output: opt("--output", path.join(cwd, "output", "jobs.xlsx")),
    python: process.env.JINHAK_PYTHON,
  };
}

function chooseSkill(request: string): "jobs-pdf-to-excel" | null {
  const r = request || "";
  if (r.includes("채용공고") || r.includes("PDF") || r.includes("Excel") || r.includes("공고")) {
    return "jobs-pdf-to-excel";
  }
  return null;
}

function pickField(text: string, label: string): string | null {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const idx = line.indexOf(`${label}:`);
    if (idx >= 0) {
      return line.slice(idx + label.length + 1).trim();
    }
  }
  return null;
}

function pickTitle(text: string): string {
  // 첫 비어있지 않은 줄 = 제목
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (t) return t;
  }
  return "";
}

async function runJobsPdfToExcel(args: Args): Promise<{ output: string; rows: number }> {
  if (!fs.existsSync(args.inbox)) {
    throw new Error(`inbox 디렉터리를 찾지 못했습니다: ${args.inbox}`);
  }
  if (!fs.existsSync(args.template)) {
    throw new Error(`template xlsx를 찾지 못했습니다: ${args.template}`);
  }

  const pdfs = fs
    .readdirSync(args.inbox)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .map((f) => path.join(args.inbox, f))
    .sort();

  if (pdfs.length === 0) {
    throw new Error(`inbox에 PDF가 없습니다: ${args.inbox}`);
  }

  const rows: Record<string, string>[] = [];
  for (const pdf of pdfs) {
    const { pages } = await extract(pdf, { python: args.python });
    const text = pages.map((p) => p.text).join("\n");
    rows.push({
      공고제목: pickTitle(text),
      회사명: pickField(text, "회사명") ?? "",
      직무: pickField(text, "직무") ?? "",
      근무지: pickField(text, "근무지") ?? "",
      마감일: pickField(text, "마감일") ?? "",
    });
  }

  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  const result = await write({
    template: args.template,
    output: args.output,
    rows,
    python: args.python,
  });
  return { output: result.output, rows: result.rows_written };
}

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  const skill = chooseSkill(args.request);
  if (!skill) {
    process.stderr.write(
      `요청을 매칭할 스킬이 없습니다: "${args.request}".\nMVP는 "채용공고 PDF → Excel" 만 지원합니다.\n`,
    );
    process.exit(2);
  }

  process.stderr.write(`▶ skill=${skill}\n`);
  process.stderr.write(`  inbox=${args.inbox}\n`);
  process.stderr.write(`  template=${args.template}\n`);
  process.stderr.write(`  output=${args.output}\n`);

  const result = await runJobsPdfToExcel(args);
  process.stdout.write(
    JSON.stringify({ output: result.output, rows: result.rows }) + "\n",
  );
}

main().catch((err) => {
  process.stderr.write(`build failed: ${(err as Error).message}\n`);
  process.exit(1);
});

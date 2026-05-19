#!/usr/bin/env node
// jinhak-harness — /verify (Layer 2.5)
// 마지막 자동화 산출물(xlsx)이 약속한 형태로 떨어졌는지 검증하고
// 비개발자가 읽을 한국어 친절 리포트를 출력한다.
//
// 사용:
//   node bin/install.js verify
//   node bin/install.js verify --output output/jobs.xlsx --template assets/template.xlsx
//   node bin/install.js verify --expected-rows 3

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

interface Args {
  output: string;
  template: string;
  expectedRows: number | null;
  python: string;
}

interface InspectResult {
  headers: string[];
  rows: (string | number | null)[][];
  empty_cells: [number, number, string][];
  header_bold: boolean[];
  row_count: number;
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const INSPECT_PY = path.resolve(
  REPO_ROOT,
  "templates/common/utils/xlsx-write/scripts/read.py",
);

function parseArgs(argv: string[]): Args {
  const opt = (name: string, dflt: string) => {
    const i = argv.indexOf(name);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : dflt;
  };
  const optInt = (name: string): number | null => {
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
    python: process.env.JINHAK_PYTHON || "python3",
  };
}

function inspect(python: string, xlsx: string): InspectResult {
  const r = spawnSync(python, [INSPECT_PY, xlsx], { encoding: "utf-8" });
  if (r.status !== 0) {
    throw new Error(`inspect.py exited with code ${r.status}: ${r.stderr.trim()}`);
  }
  return JSON.parse(r.stdout) as InspectResult;
}

function reportLines(args: Args, out: InspectResult, tmpl?: InspectResult): { lines: string[]; ok: boolean; warnings: number } {
  const lines: string[] = [];
  let ok = true;
  let warnings = 0;

  lines.push(`📋 출력 파일: ${args.output}`);
  lines.push(`📐 템플릿:    ${args.template}`);
  lines.push("");

  // 1. 헤더
  if (tmpl) {
    const same = JSON.stringify(out.headers) === JSON.stringify(tmpl.headers);
    if (same) {
      lines.push(`✅ 헤더가 템플릿과 일치합니다 (${out.headers.length}개): ${out.headers.join(" / ")}`);
    } else {
      ok = false;
      lines.push(`❌ 헤더가 템플릿과 다릅니다`);
      lines.push(`   템플릿: ${tmpl.headers.join(" / ")}`);
      lines.push(`   출력  : ${out.headers.join(" / ")}`);
    }
  } else {
    lines.push(`ℹ️  템플릿을 찾을 수 없어 헤더 비교를 건너뜁니다 (${args.template})`);
    lines.push(`   출력 헤더: ${out.headers.join(" / ")}`);
  }

  // 2. 행 수
  lines.push(`📊 데이터 행 수: ${out.row_count}`);
  if (args.expectedRows !== null) {
    if (out.row_count === args.expectedRows) {
      lines.push(`✅ 예상 행 수 (${args.expectedRows})와 일치합니다`);
    } else {
      ok = false;
      lines.push(`❌ 예상 행 수 ${args.expectedRows}, 실제 ${out.row_count} — 차이 ${out.row_count - args.expectedRows}`);
    }
  }

  // 3. 빈 셀
  if (out.empty_cells.length === 0) {
    lines.push(`✅ 빈 셀 없음 (모든 셀이 채워져 있습니다)`);
  } else {
    warnings += 1;
    const totalCells = out.row_count * out.headers.length;
    const pct = totalCells > 0 ? ((out.empty_cells.length / totalCells) * 100).toFixed(1) : "0";
    lines.push(`⚠️  빈 셀 ${out.empty_cells.length}개 (${pct}% — 전체 ${totalCells}셀 중)`);
    for (const [row, , header] of out.empty_cells.slice(0, 5)) {
      lines.push(`   - ${row}행 "${header}" 컬럼이 비어있습니다 → 원본 PDF에서 "${header}:" 라벨을 찾지 못했을 수 있어요`);
    }
    if (out.empty_cells.length > 5) {
      lines.push(`   ... (외 ${out.empty_cells.length - 5}개)`);
    }
  }

  // 4. 헤더 스타일 (정보성)
  const allBold = out.header_bold.every(Boolean);
  if (allBold) {
    lines.push(`✅ 헤더 스타일(볼드) 보존됨`);
  } else {
    warnings += 1;
    lines.push(`⚠️  일부 헤더가 볼드가 아닙니다: ${out.header_bold}`);
  }

  lines.push("");
  if (!ok) {
    lines.push("🛠  검증 실패 — 위 항목을 확인하세요.");
  } else if (warnings > 0) {
    lines.push(`⚠️  검증 완료 — 경고 ${warnings}건이 있습니다. 보내기 전에 한 번 더 확인하세요.`);
  } else {
    lines.push("🎉 검증 통과 — 산출물을 그대로 사용해도 됩니다.");
  }

  return { lines, ok, warnings };
}

function main(): number {
  const args = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(args.output)) {
    process.stderr.write(`출력 파일을 찾지 못했습니다: ${args.output}\n`);
    process.stderr.write(`/build를 먼저 실행했는지 확인하세요.\n`);
    return 1;
  }

  const out = inspect(args.python, args.output);
  const tmpl = fs.existsSync(args.template) ? inspect(args.python, args.template) : undefined;
  const { lines, ok } = reportLines(args, out, tmpl);
  process.stdout.write(lines.join("\n") + "\n");
  return ok ? 0 : 1;
}


process.exit(main());

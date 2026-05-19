#!/usr/bin/env node
// tests/templates/test-xlsx-write.mjs
// 1) 템플릿 xlsx를 빌드 (헤더 볼드)
// 2) write() 호출로 2행 채움
// 3) openpyxl로 결과를 읽어 셀 값 + 헤더 볼드 보존을 검증
//
// 사용: node --experimental-strip-types tests/templates/test-xlsx-write.mjs

import { write } from "../../templates/common/utils/xlsx-write/scripts/write.ts";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const PY = process.env.JINHAK_PYTHON || resolve(ROOT, ".venv-dev/bin/python3");
const MAKE_TEMPLATE = resolve(ROOT, "test-fixtures/make-xlsx-template.py");

const work = mkdtempSync(join(tmpdir(), "jinhak-xlsxtest-"));
const template = join(work, "template.xlsx");
const output = join(work, "out.xlsx");

function fail(msg) {
  console.error("❌", msg);
  rmSync(work, { recursive: true, force: true });
  process.exit(1);
}

try {
  // (1) 템플릿 생성
  execFileSync(PY, [MAKE_TEMPLATE, template], { stdio: "inherit" });
  if (!existsSync(template)) fail("템플릿 생성 실패");

  // (2) 2행 채우기
  const rows = [
    { 공고제목: "백엔드 엔지니어 채용", 회사명: "진학에듀", 직무: "BE" },
    { 공고제목: "프론트엔드 채용", 회사명: "교육테크", 직무: "FE" },
  ];
  const result = await write({ template, output, rows, python: PY });
  if (result.rows_written !== 2) fail(`기대 2행, 실제 ${result.rows_written}`);
  if (JSON.stringify(result.headers) !== JSON.stringify(["공고제목", "회사명", "직무"]))
    fail(`헤더 순서 다름: ${JSON.stringify(result.headers)}`);

  // (3) openpyxl로 결과 검증 (Python에 위임)
  const inspect = execFileSync(
    PY,
    [
      "-c",
      `
import json, sys, openpyxl
wb = openpyxl.load_workbook("${output}")
ws = wb.active
out = {
  "rows": [[c.value for c in row] for row in ws.iter_rows(min_row=1, max_row=3, max_col=3)],
  "header_bold": [bool(c.font.bold) for c in ws[1]],
}
json.dump(out, sys.stdout, ensure_ascii=False)
`,
    ],
    { encoding: "utf-8" },
  );
  const data = JSON.parse(inspect);

  const expectedRows = [
    ["공고제목", "회사명", "직무"],
    ["백엔드 엔지니어 채용", "진학에듀", "BE"],
    ["프론트엔드 채용", "교육테크", "FE"],
  ];
  if (JSON.stringify(data.rows) !== JSON.stringify(expectedRows))
    fail(`행 데이터 불일치:\n  got=${JSON.stringify(data.rows)}\n  want=${JSON.stringify(expectedRows)}`);
  if (!data.header_bold.every(Boolean)) fail(`헤더 볼드 보존 실패: ${JSON.stringify(data.header_bold)}`);

  console.log("✅ xlsx-write: 2행 기록 + 헤더 볼드 보존 확인");
  console.log("");
  console.log("| 공고제목 | 회사명 | 직무 |");
  console.log("|---|---|---|");
  for (const r of data.rows.slice(1)) {
    console.log(`| ${r[0]} | ${r[1]} | ${r[2]} |`);
  }
  console.log("");
  console.log(`헤더 볼드: ${JSON.stringify(data.header_bold)}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}

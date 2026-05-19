#!/usr/bin/env node
// tests/templates/test-pdf-extract.mjs
// extract.ts를 Node 22 type-stripping으로 import해 결과를 python 직접 호출과 비교한다.
//
// 사용: node --experimental-strip-types tests/templates/test-pdf-extract.mjs

import { extract } from "../../templates/common/utils/pdf-extract/scripts/extract.ts";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const SAMPLE = resolve(ROOT, "test-fixtures", "sample.pdf");
const PY_SCRIPT = resolve(
  ROOT,
  "templates/common/utils/pdf-extract/scripts/extract.py",
);
const PY = process.env.JINHAK_PYTHON || resolve(ROOT, ".venv-dev/bin/python3");

function fail(msg) {
  console.error("❌", msg);
  process.exit(1);
}

const fromTs = await extract(SAMPLE, { python: PY });
const fromPyRaw = execFileSync(PY, [PY_SCRIPT, SAMPLE], { encoding: "utf-8" });
const fromPy = JSON.parse(fromPyRaw);

const a = JSON.stringify(fromTs);
const b = JSON.stringify(fromPy);
if (a !== b) {
  console.error("ts:", a.slice(0, 200));
  console.error("py:", b.slice(0, 200));
  fail("extract.ts 결과가 extract.py 결과와 다릅니다");
}

const page = fromTs.pages[0];
if (!page) fail("pages가 비어있습니다");
if (!page.text.includes("진학 채용공고")) fail(`텍스트에 한국어 누락: ${page.text.slice(0, 80)}`);
if (page.tables.length !== 1) fail(`tables 1개를 기대했으나 ${page.tables.length}개`);
const cells = page.tables[0].flat();
if (!cells.some((c) => c && c.includes("회사명") || (c && c.includes("항목"))))
  fail("표 헤더에 한국어 없음");

console.log("✅ extract.ts ≡ extract.py (한국어 보존, 표 1개)");
console.log("   pages:", fromTs.pages.length, "| text-chars:", page.text.length, "| tables:", page.tables.length);
console.log("   head:", JSON.stringify(fromTs).slice(0, 200));

#!/usr/bin/env node
// jinhak-harness — /create (Skill Creator, 차별화 #2)
// 사용자가 인터뷰로 새 SKILL.md를 만든다. LLM 호출 0, 변수 치환 기반.
//
// 4 카테고리 (REPORT_06 §4 #2 — Hermes on_session_end 훅의 명시 변형):
//   1. 컨텍스트  — 언제 사용?
//   2. I/O 형식  — 입력/출력 폴더와 확장자
//   3. 효과 단계 — 절차 (표준 5단계 템플릿)
//   4. 사용자 수정 — 추출하고 싶은 필드들
//
// 사용:
//   node bin/install.js create
//   (mocked stdin 가능 — 6답변)

import { createInterface, type Interface } from "node:readline";
import * as fs from "node:fs";
import * as path from "node:path";
import { harnessHome } from "../paths.js";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { formatError, HarnessError } = require("../friendly-error.js");

interface SkillSpec {
  name: string;
  trigger_phrase: string;
  inbox_dir: string;
  input_ext: string;
  output_ext: string;
  output_path: string;
  fields: string[];
}

const QUESTIONS = [
  { key: "name", label: "1) 스킬 이름은? (영문 케밥-케이스 권장, 예: contract-pdf-to-summary): " },
  { key: "trigger_phrase", label: "2) 어떤 요청일 때 동작할까요? (예: 계약서 PDF 요약, 견적서 정리): " },
  { key: "inbox_dir", label: "3) 입력 폴더 경로는? (예: inbox/contracts): " },
  { key: "input_ext", label: "4) 입력 파일 확장자는? (예: pdf / txt / md): " },
  { key: "output_path", label: "5) 출력 파일 경로는? (예: output/summary.csv): " },
  { key: "fields", label: "6) 추출할 항목을 쉼표로 알려주세요 (예: 계약일, 회사명, 금액): " },
];

// 입력/출력 확장자 조합 → 필요한 utils
const REQUIRES_MAP: Record<string, string[]> = {
  "pdf->csv":  ["common/utils/pdf-extract", "common/utils/csv-write"],
  "pdf->xlsx": ["common/utils/pdf-extract", "common/utils/xlsx-write"],
  "pdf->md":   ["common/utils/pdf-extract"],
  "txt->csv":  ["common/utils/csv-write"],
  "txt->xlsx": ["common/utils/xlsx-write"],
  "txt->md":   [],
  "md->csv":   ["common/utils/csv-write"],
  "md->xlsx":  ["common/utils/xlsx-write"],
  "md->md":    [],
};

function makeAsker(rl: Interface) {
  const buffer: string[] = [];
  const waiters: ((line: string) => void)[] = [];
  rl.on("line", (line) => {
    if (waiters.length) waiters.shift()!(line);
    else buffer.push(line);
  });
  return function ask(prompt: string): Promise<string> {
    process.stderr.write(prompt);
    return new Promise((res) => {
      if (buffer.length) res(buffer.shift()!);
      else waiters.push(res);
    });
  };
}

function inferRequires(inputExt: string, outputExt: string): string[] {
  const key = `${inputExt}->${outputExt}`;
  return REQUIRES_MAP[key] || [];
}

function renderSkillMd(spec: SkillSpec): string {
  const requires = inferRequires(spec.input_ext, spec.output_ext);
  const fieldList = spec.fields.length
    ? spec.fields.map((f) => `   - ${f}`).join("\n")
    : "   - (필드 없음 — 단순 변환)";
  const requiresBlock = requires.length
    ? requires.map((r) => `  - ${r}`).join("\n")
    : "  []";
  return [
    "---",
    `name: ${spec.name}`,
    `description: ${spec.inbox_dir}의 .${spec.input_ext} 파일을 ${spec.fields.length}개 필드로 정리해 ${spec.output_path}에 저장합니다. Use when 사용자가 "${spec.trigger_phrase}" 등을 말할 때.`,
    "user-invocable: true",
    "alwaysApply: false",
    "requires:",
    requiresBlock,
    "allowed-tools:",
    "  - Read",
    "  - Bash(python3 *)",
    "  - Bash(node *)",
    "---",
    "",
    `# ${spec.name}`,
    "",
    "## 컨텍스트",
    "",
    `사용자가 "${spec.trigger_phrase}" 같은 요청을 할 때 동작합니다.`,
    "",
    "## I/O 형식",
    "",
    `- 입력 폴더: \`${spec.inbox_dir}\``,
    `- 입력 확장자: \`.${spec.input_ext}\``,
    `- 출력 경로: \`${spec.output_path}\``,
    `- 출력 확장자: \`.${spec.output_ext}\``,
    "",
    "## 효과 단계",
    "",
    `1. \`${spec.inbox_dir}\` 의 \`.${spec.input_ext}\` 파일을 모두 스캔`,
    "2. 각 파일에서 라벨 기반 정규식으로 다음 필드 추출:",
    fieldList,
    `3. ${requires.includes("common/utils/pdf-extract") ? "`common/utils/pdf-extract`로 텍스트 추출 후 " : ""}추출 결과를 ${requires.includes("common/utils/csv-write") ? "`common/utils/csv-write`" : requires.includes("common/utils/xlsx-write") ? "`common/utils/xlsx-write`" : "마크다운 표"}로 정리`,
    `4. 결과를 \`${spec.output_path}\`에 저장`,
    "5. stdout JSON으로 경로 + 행 수 보고",
    "",
    "## 사용자 수정 (필드)",
    "",
    spec.fields.map((f) => `- \`${f}\``).join("\n") || "- (정의된 필드 없음)",
    "",
    "## Gotchas",
    "",
    "- 라벨이 입력 파일에 없으면 친절 리포트에서 어느 파일/필드인지 안내",
    `- 이 스킬은 \`/create\` 로 생성된 사용자 스킬입니다. \`build.ts\` 의 RULES에 등록해야 \`/build\`에서 자동 실행됩니다 (향후 동적 등록 phase).`,
    "",
  ].join("\n");
}

async function main(): Promise<number> {
  const userSkillsDir = path.join(harnessHome(), "user-skills");

  process.stdout.write("👋 새 자동화 스킬을 만들어요. 6개 질문에 답해주세요.\n\n");

  const rl = createInterface({ input: process.stdin, terminal: false });
  const ask = makeAsker(rl);
  const answers: Record<string, string> = {};
  for (const q of QUESTIONS) {
    const raw = (await ask(q.label)).trim();
    answers[q.key] = raw;
  }
  rl.close();

  // 기본 검증
  if (!answers.name) throw new HarnessError("unknown", "스킬 이름이 비어있습니다");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(answers.name)) {
    throw new HarnessError("unknown", `스킬 이름은 영문 케밥-케이스만 허용됩니다: "${answers.name}"`);
  }

  const outputExt = path.extname(answers.output_path).replace(/^\./, "") || "md";
  const fields = answers.fields
    ? answers.fields.split(/\s*,\s*/).filter(Boolean)
    : [];

  const spec: SkillSpec = {
    name: answers.name,
    trigger_phrase: answers.trigger_phrase,
    inbox_dir: answers.inbox_dir,
    input_ext: answers.input_ext.replace(/^\./, ""),
    output_ext: outputExt,
    output_path: answers.output_path,
    fields,
  };

  const skillDir = path.join(userSkillsDir, spec.name);
  fs.mkdirSync(skillDir, { recursive: true });
  const skillMd = path.join(skillDir, "SKILL.md");
  fs.writeFileSync(skillMd, renderSkillMd(spec));

  // 요약 출력
  process.stdout.write(
    [
      "",
      `✅ 새 스킬 SKILL.md 생성: ${skillMd}`,
      "",
      "📦 요약:",
      `  이름:        ${spec.name}`,
      `  트리거:      "${spec.trigger_phrase}"`,
      `  입력:        ${spec.inbox_dir}/*.${spec.input_ext}`,
      `  출력:        ${spec.output_path}`,
      `  필드:        ${fields.length ? fields.join(", ") : "(없음)"}`,
      `  requires:    ${inferRequires(spec.input_ext, spec.output_ext).join(", ") || "(없음)"}`,
      "",
      "🛠 다음 단계:",
      `  1. 생성된 SKILL.md를 검토·편집: ${skillMd}`,
      `  2. /build 자동 실행을 원하면 \`bin/commands/build.ts\` RULES 배열에 항목 추가`,
      "     (다음 phase에서 동적 등록 자동화 예정)",
      "",
    ].join("\n"),
  );

  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    process.stderr.write(formatError(err as Error));
    process.exit(1);
  });

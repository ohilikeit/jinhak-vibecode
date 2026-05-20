#!/usr/bin/env node
import { createInterface } from "node:readline";
import * as fs from "node:fs";
import * as path from "node:path";
import { harnessHome } from "../paths.js";
import { createRequire } from "node:module";
const require2 = createRequire(import.meta.url);
const { formatError, HarnessError } = require2("../friendly-error.js");
const QUESTIONS = [
  { key: "name", label: "1) \uC2A4\uD0AC \uC774\uB984\uC740? (\uC601\uBB38 \uCF00\uBC25-\uCF00\uC774\uC2A4 \uAD8C\uC7A5, \uC608: contract-pdf-to-summary): " },
  { key: "trigger_phrase", label: "2) \uC5B4\uB5A4 \uC694\uCCAD\uC77C \uB54C \uB3D9\uC791\uD560\uAE4C\uC694? (\uC608: \uACC4\uC57D\uC11C PDF \uC694\uC57D, \uACAC\uC801\uC11C \uC815\uB9AC): " },
  { key: "inbox_dir", label: "3) \uC785\uB825 \uD3F4\uB354 \uACBD\uB85C\uB294? (\uC608: inbox/contracts): " },
  { key: "input_ext", label: "4) \uC785\uB825 \uD30C\uC77C \uD655\uC7A5\uC790\uB294? (\uC608: pdf / txt / md): " },
  { key: "output_path", label: "5) \uCD9C\uB825 \uD30C\uC77C \uACBD\uB85C\uB294? (\uC608: output/summary.csv): " },
  { key: "fields", label: "6) \uCD94\uCD9C\uD560 \uD56D\uBAA9\uC744 \uC27C\uD45C\uB85C \uC54C\uB824\uC8FC\uC138\uC694 (\uC608: \uACC4\uC57D\uC77C, \uD68C\uC0AC\uBA85, \uAE08\uC561): " }
];
const REQUIRES_MAP = {
  "pdf->csv": ["common/utils/pdf-extract", "common/utils/csv-write"],
  "pdf->xlsx": ["common/utils/pdf-extract", "common/utils/xlsx-write"],
  "pdf->md": ["common/utils/pdf-extract"],
  "txt->csv": ["common/utils/csv-write"],
  "txt->xlsx": ["common/utils/xlsx-write"],
  "txt->md": [],
  "md->csv": ["common/utils/csv-write"],
  "md->xlsx": ["common/utils/xlsx-write"],
  "md->md": []
};
function makeAsker(rl) {
  const buffer = [];
  const waiters = [];
  rl.on("line", (line) => {
    if (waiters.length) waiters.shift()(line);
    else buffer.push(line);
  });
  return function ask(prompt) {
    process.stderr.write(prompt);
    return new Promise((res) => {
      if (buffer.length) res(buffer.shift());
      else waiters.push(res);
    });
  };
}
function inferRequires(inputExt, outputExt) {
  const key = `${inputExt}->${outputExt}`;
  return REQUIRES_MAP[key] || [];
}
function renderSkillMd(spec) {
  const requires = inferRequires(spec.input_ext, spec.output_ext);
  const fieldList = spec.fields.length ? spec.fields.map((f) => `   - ${f}`).join("\n") : "   - (\uD544\uB4DC \uC5C6\uC74C \u2014 \uB2E8\uC21C \uBCC0\uD658)";
  const requiresBlock = requires.length ? requires.map((r) => `  - ${r}`).join("\n") : "  []";
  return [
    "---",
    `name: ${spec.name}`,
    `description: ${spec.inbox_dir}\uC758 .${spec.input_ext} \uD30C\uC77C\uC744 ${spec.fields.length}\uAC1C \uD544\uB4DC\uB85C \uC815\uB9AC\uD574 ${spec.output_path}\uC5D0 \uC800\uC7A5\uD569\uB2C8\uB2E4. Use when \uC0AC\uC6A9\uC790\uAC00 "${spec.trigger_phrase}" \uB4F1\uC744 \uB9D0\uD560 \uB54C.`,
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
    "## \uCEE8\uD14D\uC2A4\uD2B8",
    "",
    `\uC0AC\uC6A9\uC790\uAC00 "${spec.trigger_phrase}" \uAC19\uC740 \uC694\uCCAD\uC744 \uD560 \uB54C \uB3D9\uC791\uD569\uB2C8\uB2E4.`,
    "",
    "## I/O \uD615\uC2DD",
    "",
    `- \uC785\uB825 \uD3F4\uB354: \`${spec.inbox_dir}\``,
    `- \uC785\uB825 \uD655\uC7A5\uC790: \`.${spec.input_ext}\``,
    `- \uCD9C\uB825 \uACBD\uB85C: \`${spec.output_path}\``,
    `- \uCD9C\uB825 \uD655\uC7A5\uC790: \`.${spec.output_ext}\``,
    "",
    "## \uD6A8\uACFC \uB2E8\uACC4",
    "",
    `1. \`${spec.inbox_dir}\` \uC758 \`.${spec.input_ext}\` \uD30C\uC77C\uC744 \uBAA8\uB450 \uC2A4\uCE94`,
    "2. \uAC01 \uD30C\uC77C\uC5D0\uC11C \uB77C\uBCA8 \uAE30\uBC18 \uC815\uADDC\uC2DD\uC73C\uB85C \uB2E4\uC74C \uD544\uB4DC \uCD94\uCD9C:",
    fieldList,
    `3. ${requires.includes("common/utils/pdf-extract") ? "`common/utils/pdf-extract`\uB85C \uD14D\uC2A4\uD2B8 \uCD94\uCD9C \uD6C4 " : ""}\uCD94\uCD9C \uACB0\uACFC\uB97C ${requires.includes("common/utils/csv-write") ? "`common/utils/csv-write`" : requires.includes("common/utils/xlsx-write") ? "`common/utils/xlsx-write`" : "\uB9C8\uD06C\uB2E4\uC6B4 \uD45C"}\uB85C \uC815\uB9AC`,
    `4. \uACB0\uACFC\uB97C \`${spec.output_path}\`\uC5D0 \uC800\uC7A5`,
    "5. stdout JSON\uC73C\uB85C \uACBD\uB85C + \uD589 \uC218 \uBCF4\uACE0",
    "",
    "## \uC0AC\uC6A9\uC790 \uC218\uC815 (\uD544\uB4DC)",
    "",
    spec.fields.map((f) => `- \`${f}\``).join("\n") || "- (\uC815\uC758\uB41C \uD544\uB4DC \uC5C6\uC74C)",
    "",
    "## Gotchas",
    "",
    "- \uB77C\uBCA8\uC774 \uC785\uB825 \uD30C\uC77C\uC5D0 \uC5C6\uC73C\uBA74 \uCE5C\uC808 \uB9AC\uD3EC\uD2B8\uC5D0\uC11C \uC5B4\uB290 \uD30C\uC77C/\uD544\uB4DC\uC778\uC9C0 \uC548\uB0B4",
    `- \uC774 \uC2A4\uD0AC\uC740 \`/create\` \uB85C \uC0DD\uC131\uB41C \uC0AC\uC6A9\uC790 \uC2A4\uD0AC\uC785\uB2C8\uB2E4. \`build.ts\` \uC758 RULES\uC5D0 \uB4F1\uB85D\uD574\uC57C \`/build\`\uC5D0\uC11C \uC790\uB3D9 \uC2E4\uD589\uB429\uB2C8\uB2E4 (\uD5A5\uD6C4 \uB3D9\uC801 \uB4F1\uB85D phase).`,
    ""
  ].join("\n");
}
async function main() {
  const userSkillsDir = path.join(harnessHome(), "user-skills");
  process.stdout.write("\u{1F44B} \uC0C8 \uC790\uB3D9\uD654 \uC2A4\uD0AC\uC744 \uB9CC\uB4E4\uC5B4\uC694. 6\uAC1C \uC9C8\uBB38\uC5D0 \uB2F5\uD574\uC8FC\uC138\uC694.\n\n");
  const rl = createInterface({ input: process.stdin, terminal: false });
  const ask = makeAsker(rl);
  const answers = {};
  for (const q of QUESTIONS) {
    const raw = (await ask(q.label)).trim();
    answers[q.key] = raw;
  }
  rl.close();
  if (!answers.name) throw new HarnessError("unknown", "\uC2A4\uD0AC \uC774\uB984\uC774 \uBE44\uC5B4\uC788\uC2B5\uB2C8\uB2E4");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(answers.name)) {
    throw new HarnessError("unknown", `\uC2A4\uD0AC \uC774\uB984\uC740 \uC601\uBB38 \uCF00\uBC25-\uCF00\uC774\uC2A4\uB9CC \uD5C8\uC6A9\uB429\uB2C8\uB2E4: "${answers.name}"`);
  }
  const outputExt = path.extname(answers.output_path).replace(/^\./, "") || "md";
  const fields = answers.fields ? answers.fields.split(/\s*,\s*/).filter(Boolean) : [];
  const spec = {
    name: answers.name,
    trigger_phrase: answers.trigger_phrase,
    inbox_dir: answers.inbox_dir,
    input_ext: answers.input_ext.replace(/^\./, ""),
    output_ext: outputExt,
    output_path: answers.output_path,
    fields
  };
  const skillDir = path.join(userSkillsDir, spec.name);
  fs.mkdirSync(skillDir, { recursive: true });
  const skillMd = path.join(skillDir, "SKILL.md");
  fs.writeFileSync(skillMd, renderSkillMd(spec));
  const specJson = path.join(skillDir, "spec.json");
  fs.writeFileSync(
    specJson,
    JSON.stringify(
      {
        name: spec.name,
        trigger_phrase: spec.trigger_phrase,
        keywords: spec.trigger_phrase.split(/\s+/).filter((w) => w.length >= 2),
        inbox_dir: spec.inbox_dir,
        input_ext: spec.input_ext,
        output_ext: spec.output_ext,
        output_path: spec.output_path,
        fields: spec.fields,
        created: (/* @__PURE__ */ new Date()).toISOString()
      },
      null,
      2
    )
  );
  process.stdout.write(
    [
      "",
      `\u2705 \uC0C8 \uC2A4\uD0AC SKILL.md \uC0DD\uC131: ${skillMd}`,
      `\u2705 \uB3D9\uC801 \uB4F1\uB85D\uC6A9 spec.json \uC0DD\uC131: ${specJson}`,
      "",
      "\u{1F4E6} \uC694\uC57D:",
      `  \uC774\uB984:        ${spec.name}`,
      `  \uD2B8\uB9AC\uAC70:      "${spec.trigger_phrase}"`,
      `  \uC785\uB825:        ${spec.inbox_dir}/*.${spec.input_ext}`,
      `  \uCD9C\uB825:        ${spec.output_path}`,
      `  \uD544\uB4DC:        ${fields.length ? fields.join(", ") : "(\uC5C6\uC74C)"}`,
      `  requires:    ${inferRequires(spec.input_ext, spec.output_ext).join(", ") || "(\uC5C6\uC74C)"}`,
      "",
      "\u{1F6E0} \uB2E4\uC74C \uB2E8\uACC4:",
      `  - /plan "${spec.trigger_phrase}"  \uB85C \uACC4\uD68D \uD655\uC778`,
      `  - /build "${spec.trigger_phrase}" \uB85C \uC989\uC2DC \uC2E4\uD589 (spec.json \uC790\uB3D9 \uC778\uC2DD)`,
      ""
    ].join("\n")
  );
  return 0;
}
main().then((code) => process.exit(code)).catch((err) => {
  process.stderr.write(formatError(err));
  process.exit(1);
});

#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require2 = createRequire(import.meta.url);
const { loadSpecs, keywordsFor } = require2("../user-skill-loader.js");
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const SKILLS_ROOT = process.env.AGENTS_SKILLS_HOME ? process.env.AGENTS_SKILLS_HOME : path.join(REPO_ROOT, "templates", ".agents", "skills");
const KEYWORD_RULES = [
  {
    keywords: ["\uCC44\uC6A9\uACF5\uACE0", "\uACF5\uACE0", "Excel", "\uC5D1\uC140", "\uC2A4\uD504\uB808\uB4DC\uC2DC\uD2B8"],
    skill: "jobs-pdf-to-excel"
  },
  {
    keywords: ["\uD68C\uC758\uB85D", "\uD68C\uC758 \uC694\uC57D", "\uD68C\uC758", "\uC561\uC158 \uC544\uC774\uD15C", "\uC561\uC158\uC544\uC774\uD15C"],
    skill: "meeting-notes-to-summary"
  },
  {
    keywords: ["\uC601\uC218\uC99D", "\uC9C0\uCD9C", "\uACBD\uBE44", "\uBE44\uC6A9 \uC815\uC0B0", "\uBE44\uC6A9\uC815\uC0B0"],
    skill: "expense-pdf-to-csv"
  }
];
function loadSkill(name) {
  const file = path.join(SKILLS_ROOT, name, "SKILL.md");
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf-8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return null;
  const frontmatterRaw = m[1];
  const body = m[2];
  const rawFm = {};
  let currentKey = null;
  const requires = [];
  let inRequires = false;
  for (const line of frontmatterRaw.split("\n")) {
    const kv = line.match(/^([A-Za-z0-9_\-]+):\s*(.*)$/);
    if (kv) {
      currentKey = kv[1];
      rawFm[currentKey] = kv[2];
      inRequires = currentKey === "requires" && kv[2].trim() === "";
      continue;
    }
    if (inRequires) {
      const li = line.match(/^\s+-\s+(.*)$/);
      if (li) requires.push(li[1].trim());
    }
  }
  const desc = rawFm.description || "";
  const triggers = [];
  for (const rule of KEYWORD_RULES) {
    if (rule.skill === name) triggers.push(...rule.keywords);
  }
  const procMatch = body.match(/##\s*절차\s*\n([\s\S]*?)(?=\n##\s|\n$)/);
  const procedure = procMatch ? procMatch[1].trim() : "(\uC2A4\uD0AC \uBCF8\uBB38\uC5D0 ## \uC808\uCC28 \uC139\uC158\uC774 \uC5C6\uC2B5\uB2C8\uB2E4)";
  return {
    name: rawFm.name || name,
    description: desc,
    requires,
    triggers,
    procedure,
    rawFrontmatter: rawFm
  };
}
function chooseSkill(request) {
  const r = request || "";
  for (const spec of loadSpecs()) {
    const kws = keywordsFor(spec);
    if (kws.some((k) => r.includes(k))) return spec.name;
  }
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((k) => r.includes(k))) return rule.skill;
  }
  return null;
}
function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "plan";
}
function timestamp() {
  const d = /* @__PURE__ */ new Date();
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${z(d.getUTCMonth() + 1)}${z(d.getUTCDate())}-${z(d.getUTCHours())}${z(d.getUTCMinutes())}${z(d.getUTCSeconds())}`;
}
function renderPlan(request, skill) {
  return [
    `# \uC790\uB3D9\uD654 \uACC4\uD68D \u2014 ${skill.name}`,
    "",
    `**\uC791\uC131 \uC2DC\uAC01**: ${(/* @__PURE__ */ new Date()).toISOString()}`,
    `**\uC0AC\uC6A9\uC790 \uC694\uCCAD**: ${request}`,
    `**\uC120\uD0DD\uB41C \uC2A4\uD0AC**: \`${skill.name}\``,
    `**\uC2A4\uD0AC \uC124\uBA85**: ${skill.description}`,
    "",
    "## \uD544\uC694\uD55C \uACF5\uC6A9 utils",
    ...skill.requires.length ? skill.requires.map((r) => `- \`${r}\``) : ["- (\uC5C6\uC74C)"],
    "",
    "## \uB2E8\uACC4",
    skill.procedure,
    "",
    "## \uB2E4\uC74C \uBA85\uB839",
    "",
    "```bash",
    `jinhak-harness build "${request}"   # \uC2E4\uD589`,
    `jinhak-harness verify                # \uC0B0\uCD9C\uBB3C \uAC80\uC99D`,
    `jinhak-harness handoff               # \uBBF8\uB9AC\uBCF4\uAE30 \uD6C4 --confirm \uC73C\uB85C \uBCF5\uC0AC`,
    "```",
    "",
    "## \uB9E4\uCE6D \uADFC\uAC70",
    `\uC694\uCCAD \uBB38\uC790\uC5F4\uC5D0\uC11C \uB2E4\uC74C \uD0A4\uC6CC\uB4DC\uB97C \uAC10\uC9C0: ${skill.triggers.filter((t) => request.includes(t)).map((t) => `\`${t}\``).join(", ") || "(\uC5C6\uC74C)"}`,
    ""
  ].join("\n");
}
function main() {
  const argv = process.argv.slice(2);
  const positional = argv.filter((a) => !a.startsWith("--"));
  const request = positional.join(" ").trim();
  if (!request) {
    process.stderr.write(
      [
        '\uC0AC\uC6A9\uBC95: jinhak-harness plan "<\uC790\uB3D9\uD654 \uC694\uCCAD>"',
        '\uC608\uC2DC: jinhak-harness plan "\uCC44\uC6A9\uACF5\uACE0 PDF\uB97C Excel\uB85C \uC815\uB9AC\uD574\uC918"',
        ""
      ].join("\n")
    );
    return 2;
  }
  const skillName = chooseSkill(request);
  if (!skillName) {
    process.stderr.write(
      [
        `\uC694\uCCAD\uC744 \uC790\uB3D9\uD654\uD560 \uC2A4\uD0AC\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4: "${request}"`,
        "",
        "\uD604\uC7AC \uC9C0\uC6D0\uD558\uB294 \uC790\uB3D9\uD654:",
        ...KEYWORD_RULES.map(
          (r) => `  - ${r.skill}  (\uD2B8\uB9AC\uAC70: ${r.keywords.join(", ")})`
        ),
        "",
        "\uC9C0\uC6D0\uB418\uB294 \uD0A4\uC6CC\uB4DC \uC911 \uD558\uB098\uB97C \uD3EC\uD568\uD574 \uB2E4\uC2DC \uC694\uCCAD\uD574\uC8FC\uC138\uC694.",
        ""
      ].join("\n")
    );
    return 1;
  }
  const skill = loadSkill(skillName);
  if (!skill) {
    process.stderr.write(`SKILL.md\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4: ${skillName}
`);
    return 1;
  }
  const planMd = renderPlan(request, skill);
  const cwd = process.cwd();
  const plansDir = path.join(cwd, ".harness", "plans");
  fs.mkdirSync(plansDir, { recursive: true });
  const fileName = `${timestamp()}-${slugify(skill.name)}.md`;
  const filePath = path.join(plansDir, fileName);
  fs.writeFileSync(filePath, planMd);
  process.stdout.write(planMd);
  process.stdout.write(`
\u{1F4DD} plan \uC800\uC7A5: ${filePath}
`);
  return 0;
}
process.exit(main());

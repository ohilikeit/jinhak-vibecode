#!/usr/bin/env node
// jinhak-harness — /plan (Layer 2.5)
// 사용자 요청을 분석해 적합한 스킬을 고르고 plan 마크다운을 생성한다.
// LLM 호출 없이 키워드 매칭 + SKILL.md 파싱으로 결정론적으로 동작.
//
// 사용:
//   node bin/install.js plan "채용공고 PDF를 Excel로 정리해줘"
//
// 산출물: .harness/plans/<YYYYMMDD-HHMMSS>-<slug>.md

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

interface SkillManifest {
  name: string;
  description: string;
  requires: string[];
  triggers: string[];
  procedure: string;
  rawFrontmatter: Record<string, string>;
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const SKILLS_ROOT = process.env.AGENTS_SKILLS_HOME
  ? process.env.AGENTS_SKILLS_HOME
  : path.join(REPO_ROOT, "templates", ".agents", "skills");

// 키워드 → 스킬 매핑 (MVP eco — 하드코딩, build.ts의 RULES와 동기)
const KEYWORD_RULES: { keywords: string[]; skill: string }[] = [
  {
    keywords: ["채용공고", "공고", "Excel", "엑셀", "스프레드시트"],
    skill: "jobs-pdf-to-excel",
  },
  {
    keywords: ["회의록", "회의 요약", "회의", "액션 아이템", "액션아이템"],
    skill: "meeting-notes-to-summary",
  },
  {
    keywords: ["영수증", "지출", "경비", "비용 정산", "비용정산"],
    skill: "expense-pdf-to-csv",
  },
];

function loadSkill(name: string): SkillManifest | null {
  const file = path.join(SKILLS_ROOT, name, "SKILL.md");
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf-8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return null;
  const frontmatterRaw = m[1];
  const body = m[2];

  const rawFm: Record<string, string> = {};
  let currentKey: string | null = null;
  const requires: string[] = [];
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

  // description에서 trigger 구문 추출 ("Use when ..." 다음의 키워드)
  const desc = rawFm.description || "";
  const triggers: string[] = [];
  for (const rule of KEYWORD_RULES) {
    if (rule.skill === name) triggers.push(...rule.keywords);
  }

  // 본문에서 `## 절차` 섹션 추출
  const procMatch = body.match(/##\s*절차\s*\n([\s\S]*?)(?=\n##\s|\n$)/);
  const procedure = procMatch ? procMatch[1].trim() : "(스킬 본문에 ## 절차 섹션이 없습니다)";

  return {
    name: rawFm.name || name,
    description: desc,
    requires,
    triggers,
    procedure,
    rawFrontmatter: rawFm,
  };
}

function chooseSkill(request: string): string | null {
  const r = request || "";
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((k) => r.includes(k))) return rule.skill;
  }
  return null;
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "plan"
  );
}

function timestamp(): string {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${z(d.getUTCMonth() + 1)}${z(d.getUTCDate())}-${z(d.getUTCHours())}${z(d.getUTCMinutes())}${z(d.getUTCSeconds())}`;
}

function renderPlan(request: string, skill: SkillManifest): string {
  return [
    `# 자동화 계획 — ${skill.name}`,
    "",
    `**작성 시각**: ${new Date().toISOString()}`,
    `**사용자 요청**: ${request}`,
    `**선택된 스킬**: \`${skill.name}\``,
    `**스킬 설명**: ${skill.description}`,
    "",
    "## 필요한 공용 utils",
    ...(skill.requires.length
      ? skill.requires.map((r) => `- \`${r}\``)
      : ["- (없음)"]),
    "",
    "## 단계",
    skill.procedure,
    "",
    "## 다음 명령",
    "",
    "```bash",
    `jinhak-harness build "${request}"   # 실행`,
    `jinhak-harness verify                # 산출물 검증`,
    `jinhak-harness handoff               # 미리보기 후 --confirm 으로 복사`,
    "```",
    "",
    "## 매칭 근거",
    `요청 문자열에서 다음 키워드를 감지: ${skill.triggers
      .filter((t) => request.includes(t))
      .map((t) => `\`${t}\``)
      .join(", ") || "(없음)"}`,
    "",
  ].join("\n");
}

function main(): number {
  const argv = process.argv.slice(2);
  const positional = argv.filter((a) => !a.startsWith("--"));
  const request = positional.join(" ").trim();

  if (!request) {
    process.stderr.write(
      [
        "사용법: jinhak-harness plan \"<자동화 요청>\"",
        "예시: jinhak-harness plan \"채용공고 PDF를 Excel로 정리해줘\"",
        "",
      ].join("\n"),
    );
    return 2;
  }

  const skillName = chooseSkill(request);
  if (!skillName) {
    process.stderr.write(
      [
        `요청을 자동화할 스킬을 찾지 못했습니다: "${request}"`,
        "",
        "현재 지원하는 자동화:",
        ...KEYWORD_RULES.map(
          (r) => `  - ${r.skill}  (트리거: ${r.keywords.join(", ")})`,
        ),
        "",
        "지원되는 키워드 중 하나를 포함해 다시 요청해주세요.",
        "",
      ].join("\n"),
    );
    return 1;
  }

  const skill = loadSkill(skillName);
  if (!skill) {
    process.stderr.write(`SKILL.md를 찾지 못했습니다: ${skillName}\n`);
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
  process.stdout.write(`\n📝 plan 저장: ${filePath}\n`);
  return 0;
}

process.exit(main());

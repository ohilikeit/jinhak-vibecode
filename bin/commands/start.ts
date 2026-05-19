#!/usr/bin/env node
// jinhak-harness — /start 온보딩 인터뷰
// 1) $HARNESS_HOME/user-profile.md 부재 시 5문항 한국어 인터뷰
// 2) 답을 YAML frontmatter + 본문으로 user-profile.md에 저장
// 3) cwd의 .harness/state.md 부재 시 생성
// 4) 환경변수로 AI 도구 감지 후 ✅ 출력
// 5) /build 안내 한국어 메시지로 마무리

import { createInterface, type Interface } from "node:readline";
import * as fs from "node:fs";
import * as path from "node:path";
import { harnessHome } from "../paths.js";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { profileFrom, renderYaml } = require("../user-profiler.js");

interface Question {
  key: string;
  label: string;
  multi?: boolean; // 쉼표로 여러 개 받기
}

const QUESTIONS: Question[] = [
  { key: "role", label: "1) 직군이 어떻게 되시나요? (예: 기획/마케팅/HR/CS): " },
  { key: "repetitive_tasks", label: "2) 자주 반복하는 업무를 한 줄로 알려주세요: " },
  { key: "output_format", label: "3) 결과물은 어떤 형태인가요? (예: Excel/PPT/이메일/문서): " },
  { key: "company_tone", label: "4) 회사 글말투는? (예: 존댓말/격식/캐주얼): " },
  { key: "tools", label: "5) 자주 쓰는 도구를 쉼표로 알려주세요 (예: Gmail, Notion, Slack): ", multi: true },
];

function detectAiTool(env: NodeJS.ProcessEnv): string {
  if (env.COPILOT_CLI) return "GitHub Copilot CLI";
  if (env.CURSOR_PLUGIN_ROOT) return "Cursor";
  if (env.CLAUDE_PLUGIN_ROOT) return "Claude Code";
  if (env.VSCODE_INJECTION || env.VSCODE_PID) return "VS Code";
  return "Claude Agent SDK / CLI";
}

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

function yamlScalar(v: string): string {
  // 안전한 따옴표 처리: 작은따옴표가 들어가면 이중 처리
  return `'${v.replace(/'/g, "''")}'`;
}

function writeProfile(target: string, answers: Record<string, string | string[]>): void {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const created = new Date().toISOString();
  const lines = ["---", `created: ${created}`];
  for (const q of QUESTIONS) {
    const v = answers[q.key];
    if (q.multi && Array.isArray(v)) {
      lines.push(`${q.key}:`);
      for (const item of v) lines.push(`  - ${yamlScalar(item)}`);
    } else {
      lines.push(`${q.key}: ${yamlScalar(String(v))}`);
    }
  }
  // 8 행동 차원 자동 추론 (REPORT_06 §3.2)
  const behavior = profileFrom(answers);
  lines.push(renderYaml(behavior));
  lines.push("---", "", "# 사용자 프로필", "");
  lines.push(`- **직군**: ${answers.role}`);
  lines.push(`- **반복 업무**: ${answers.repetitive_tasks}`);
  lines.push(`- **결과물 형태**: ${answers.output_format}`);
  lines.push(`- **회사 톤**: ${answers.company_tone}`);
  const tools = Array.isArray(answers.tools) ? answers.tools.join(", ") : answers.tools;
  lines.push(`- **자주 쓰는 도구**: ${tools}`);
  lines.push("");
  lines.push("## 행동 차원 (자동 추론, 1~5)");
  lines.push("");
  lines.push(`- 상세도(verbosity): ${behavior.verbosity}`);
  lines.push(`- 속도 vs 꼼꼼함(speed): ${behavior.speed}`);
  lines.push(`- 실수 무관용(error_tolerance): ${behavior.error_tolerance}`);
  lines.push(`- 협업 성향(collaboration_style): ${behavior.collaboration_style}`);
  lines.push(`- 기록 선호(documentation_pref): ${behavior.documentation_pref}`);
  lines.push(`- 도구 친숙도(tool_familiarity): ${behavior.tool_familiarity}`);
  lines.push(`- 검증 강도(verification_rigor): ${behavior.verification_rigor}`);
  lines.push("");
  fs.writeFileSync(target, lines.join("\n"));
}

function ensureProjectState(cwd: string): { created: boolean; path: string } {
  const dir = path.join(cwd, ".harness");
  const file = path.join(dir, "state.md");
  if (fs.existsSync(file)) return { created: false, path: file };
  fs.mkdirSync(dir, { recursive: true });
  const body = [
    "# 프로젝트 상태",
    "",
    `초기화: ${new Date().toISOString()}`,
    "",
    "## 진행 중인 자동화",
    "- (없음)",
    "",
    "## 메모",
    "- /build 명령으로 새 자동화 추가",
    "",
  ].join("\n");
  fs.writeFileSync(file, body);
  return { created: true, path: file };
}

async function main(): Promise<void> {
  const home = harnessHome();
  const profilePath = path.join(home, "user-profile.md");

  if (fs.existsSync(profilePath)) {
    process.stdout.write(`기존 프로필 사용: ${profilePath}\n`);
  } else {
    process.stdout.write("👋 jinhak-harness 첫 셋업 — 5개 질문으로 직군 프로파일을 만듭니다.\n\n");
    const rl = createInterface({ input: process.stdin, terminal: false });
    const ask = makeAsker(rl);
    const answers: Record<string, string | string[]> = {};
    for (const q of QUESTIONS) {
      const raw = (await ask(q.label)).trim();
      if (q.multi) {
        answers[q.key] = raw ? raw.split(/\s*,\s*/).filter(Boolean) : [];
      } else {
        answers[q.key] = raw;
      }
    }
    rl.close();
    writeProfile(profilePath, answers);
    process.stdout.write(`\n✅ 프로필 저장: ${profilePath}\n`);
  }

  const state = ensureProjectState(process.cwd());
  process.stdout.write(
    state.created
      ? `✅ 프로젝트 상태 파일 생성: ${state.path}\n`
      : `프로젝트 상태 파일 이미 존재: ${state.path}\n`,
  );

  const tool = detectAiTool(process.env);
  process.stdout.write(`✅ ${tool} 감지\n`);

  process.stdout.write("\n다음에 자동화하고 싶은 일이 있으면 /build 라고 말해주세요.\n");
}

main().catch((err) => {
  process.stderr.write(`start failed: ${(err as Error).message}\n`);
  process.exit(1);
});

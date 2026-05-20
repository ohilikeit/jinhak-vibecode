#!/usr/bin/env node
import { createInterface } from "node:readline";
import * as fs from "node:fs";
import * as path from "node:path";
import { harnessHome } from "../paths.js";
import { createRequire } from "node:module";
const require2 = createRequire(import.meta.url);
const { profileFrom, renderYaml } = require2("../user-profiler.js");
const QUESTIONS = [
  { key: "role", label: "1) \uC9C1\uAD70\uC774 \uC5B4\uB5BB\uAC8C \uB418\uC2DC\uB098\uC694? (\uC608: \uAE30\uD68D/\uB9C8\uCF00\uD305/HR/CS): " },
  { key: "repetitive_tasks", label: "2) \uC790\uC8FC \uBC18\uBCF5\uD558\uB294 \uC5C5\uBB34\uB97C \uD55C \uC904\uB85C \uC54C\uB824\uC8FC\uC138\uC694: " },
  { key: "output_format", label: "3) \uACB0\uACFC\uBB3C\uC740 \uC5B4\uB5A4 \uD615\uD0DC\uC778\uAC00\uC694? (\uC608: Excel/PPT/\uC774\uBA54\uC77C/\uBB38\uC11C): " },
  { key: "company_tone", label: "4) \uD68C\uC0AC \uAE00\uB9D0\uD22C\uB294? (\uC608: \uC874\uB313\uB9D0/\uACA9\uC2DD/\uCE90\uC8FC\uC5BC): " },
  { key: "tools", label: "5) \uC790\uC8FC \uC4F0\uB294 \uB3C4\uAD6C\uB97C \uC27C\uD45C\uB85C \uC54C\uB824\uC8FC\uC138\uC694 (\uC608: Gmail, Notion, Slack): ", multi: true }
];
function detectAiTool(env) {
  if (env.COPILOT_CLI) return "GitHub Copilot CLI";
  if (env.CURSOR_PLUGIN_ROOT) return "Cursor";
  if (env.CLAUDE_PLUGIN_ROOT) return "Claude Code";
  if (env.VSCODE_INJECTION || env.VSCODE_PID) return "VS Code";
  return "Claude Agent SDK / CLI";
}
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
function yamlScalar(v) {
  return `'${v.replace(/'/g, "''")}'`;
}
function writeProfile(target, answers) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const created = (/* @__PURE__ */ new Date()).toISOString();
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
  const behavior = profileFrom(answers);
  lines.push(renderYaml(behavior));
  lines.push("---", "", "# \uC0AC\uC6A9\uC790 \uD504\uB85C\uD544", "");
  lines.push(`- **\uC9C1\uAD70**: ${answers.role}`);
  lines.push(`- **\uBC18\uBCF5 \uC5C5\uBB34**: ${answers.repetitive_tasks}`);
  lines.push(`- **\uACB0\uACFC\uBB3C \uD615\uD0DC**: ${answers.output_format}`);
  lines.push(`- **\uD68C\uC0AC \uD1A4**: ${answers.company_tone}`);
  const tools = Array.isArray(answers.tools) ? answers.tools.join(", ") : answers.tools;
  lines.push(`- **\uC790\uC8FC \uC4F0\uB294 \uB3C4\uAD6C**: ${tools}`);
  lines.push("");
  lines.push("## \uD589\uB3D9 \uCC28\uC6D0 (\uC790\uB3D9 \uCD94\uB860, 1~5)");
  lines.push("");
  lines.push(`- \uC0C1\uC138\uB3C4(verbosity): ${behavior.verbosity}`);
  lines.push(`- \uC18D\uB3C4 vs \uAF3C\uAF3C\uD568(speed): ${behavior.speed}`);
  lines.push(`- \uC2E4\uC218 \uBB34\uAD00\uC6A9(error_tolerance): ${behavior.error_tolerance}`);
  lines.push(`- \uD611\uC5C5 \uC131\uD5A5(collaboration_style): ${behavior.collaboration_style}`);
  lines.push(`- \uAE30\uB85D \uC120\uD638(documentation_pref): ${behavior.documentation_pref}`);
  lines.push(`- \uB3C4\uAD6C \uCE5C\uC219\uB3C4(tool_familiarity): ${behavior.tool_familiarity}`);
  lines.push(`- \uAC80\uC99D \uAC15\uB3C4(verification_rigor): ${behavior.verification_rigor}`);
  lines.push("");
  fs.writeFileSync(target, lines.join("\n"));
}
function ensureProjectState(cwd) {
  const dir = path.join(cwd, ".harness");
  const file = path.join(dir, "state.md");
  if (fs.existsSync(file)) return { created: false, path: file };
  fs.mkdirSync(dir, { recursive: true });
  const body = [
    "# \uD504\uB85C\uC81D\uD2B8 \uC0C1\uD0DC",
    "",
    `\uCD08\uAE30\uD654: ${(/* @__PURE__ */ new Date()).toISOString()}`,
    "",
    "## \uC9C4\uD589 \uC911\uC778 \uC790\uB3D9\uD654",
    "- (\uC5C6\uC74C)",
    "",
    "## \uBA54\uBAA8",
    "- /build \uBA85\uB839\uC73C\uB85C \uC0C8 \uC790\uB3D9\uD654 \uCD94\uAC00",
    ""
  ].join("\n");
  fs.writeFileSync(file, body);
  return { created: true, path: file };
}
async function main() {
  const home = harnessHome();
  const profilePath = path.join(home, "user-profile.md");
  if (fs.existsSync(profilePath)) {
    process.stdout.write(`\uAE30\uC874 \uD504\uB85C\uD544 \uC0AC\uC6A9: ${profilePath}
`);
  } else {
    process.stdout.write("\u{1F44B} jinhak-harness \uCCAB \uC14B\uC5C5 \u2014 5\uAC1C \uC9C8\uBB38\uC73C\uB85C \uC9C1\uAD70 \uD504\uB85C\uD30C\uC77C\uC744 \uB9CC\uB4ED\uB2C8\uB2E4.\n\n");
    const rl = createInterface({ input: process.stdin, terminal: false });
    const ask = makeAsker(rl);
    const answers = {};
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
    process.stdout.write(`
\u2705 \uD504\uB85C\uD544 \uC800\uC7A5: ${profilePath}
`);
  }
  const state = ensureProjectState(process.cwd());
  process.stdout.write(
    state.created ? `\u2705 \uD504\uB85C\uC81D\uD2B8 \uC0C1\uD0DC \uD30C\uC77C \uC0DD\uC131: ${state.path}
` : `\uD504\uB85C\uC81D\uD2B8 \uC0C1\uD0DC \uD30C\uC77C \uC774\uBBF8 \uC874\uC7AC: ${state.path}
`
  );
  const tool = detectAiTool(process.env);
  process.stdout.write(`\u2705 ${tool} \uAC10\uC9C0
`);
  process.stdout.write("\n\uB2E4\uC74C\uC5D0 \uC790\uB3D9\uD654\uD558\uACE0 \uC2F6\uC740 \uC77C\uC774 \uC788\uC73C\uBA74 /build \uB77C\uACE0 \uB9D0\uD574\uC8FC\uC138\uC694.\n");
}
main().catch((err) => {
  process.stderr.write(`start failed: ${err.message}
`);
  process.exit(1);
});

#!/usr/bin/env node
// jinhak-harness — /ship (Layer 2.5)
// /handoff 다음에 호출되는 git 커밋 단계. 마지막 handoff 로그 기준 메시지 생성.
// 기본은 dry-run, --confirm 시 실제 git add + commit.
//
// 사용:
//   node bin/install.js ship                # dry-run 미리보기
//   node bin/install.js ship --confirm      # 실제 commit
//   node bin/install.js ship --message "..."# 메시지 override
//   node bin/install.js ship --push         # confirm 후 push (default OFF)

import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { formatError, HarnessError } = require("../friendly-error.js");
const { printCostLabel } = require("../cost-label.js");

interface Args {
  confirm: boolean;
  push: boolean;
  message: string | null;
}

function parseArgs(argv: string[]): Args {
  const opt = (name: string): string | null => {
    const i = argv.indexOf(name);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
  };
  return {
    confirm: argv.includes("--confirm"),
    push: argv.includes("--push"),
    message: opt("--message"),
  };
}

function lastHandoffEntry(stateMd: string): string | null {
  if (!fs.existsSync(stateMd)) return null;
  const body = fs.readFileSync(stateMd, "utf-8");
  const m = body.match(/##\s*핸드오프 로그\s*\n([\s\S]+?)(?=\n##|\n$)/);
  if (!m) return null;
  const lines = m[1].trim().split("\n").filter((l) => l.trim().startsWith("-"));
  return lines.length ? lines[lines.length - 1].replace(/^-\s*/, "") : null;
}

function git(args: string[]): { code: number; out: string; err: string } {
  const r = spawnSync("git", args, { encoding: "utf-8" });
  return { code: r.status ?? 1, out: r.stdout || "", err: r.stderr || "" };
}

function main(): number {
  printCostLabel("ship");
  const args = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const stateMd = path.join(cwd, ".harness", "state.md");

  const inGitRepo = git(["rev-parse", "--is-inside-work-tree"]).code === 0;
  if (!inGitRepo) {
    process.stderr.write("이 디렉터리는 git 저장소가 아닙니다. /ship은 git 커밋 명령이에요.\n");
    return 1;
  }

  const lastEntry = lastHandoffEntry(stateMd);
  const message =
    args.message ||
    (lastEntry
      ? `ship: ${lastEntry.split(" → ")[0]} → ${lastEntry.split(" → ")[1] || "(대상 미상)"}`
      : "ship: handoff");

  // 무엇이 staged 될지 미리 계산
  // git status --porcelain 출력: "XY filename" (XY = 1자씩 상태코드, 그다음 공백)
  const status = git(["status", "--porcelain"]);
  const candidates = status.out
    .split("\n")
    .filter((l) => l.length > 3)
    .map((l) => ({ status: l.slice(0, 2), file: l.slice(3) }))
    .filter((c) => c.file.startsWith(".harness/") || c.file === ".harness" || c.file.endsWith("user-profile.md") || c.file === ".harness/");

  process.stdout.write(
    [
      `📦 ship 미리보기`,
      `  메시지: ${message}`,
      `  마지막 handoff 로그: ${lastEntry || "(없음 — state.md를 못 찾았어요)"}`,
      `  변경 후보 (.harness/* 또는 user-profile.md):`,
      ...(candidates.length
        ? candidates.map((c) => `    ${c.status} ${c.file}`)
        : ["    (스테이지할 항목이 없습니다)"]),
      "",
    ].join("\n"),
  );

  if (!args.confirm) {
    process.stdout.write(
      [
        "ℹ️  dry-run 모드 — 실제로 커밋되지 않았습니다.",
        "   실제 커밋: 같은 명령에 `--confirm` 을 붙여주세요.",
        "",
      ].join("\n"),
    );
    return 0;
  }

  if (candidates.length === 0) {
    process.stdout.write("변경된 .harness 파일이 없어서 커밋할 게 없습니다.\n");
    return 0;
  }

  // .harness/* + user-profile.md 만 stage
  for (const c of candidates) {
    const r = git(["add", "--", c.file]);
    if (r.code !== 0) {
      process.stderr.write(`git add 실패: ${c.file}\n${r.err}\n`);
      return 1;
    }
  }
  const c = git(["commit", "-m", message]);
  if (c.code !== 0) {
    process.stderr.write(`git commit 실패:\n${c.err || c.out}\n`);
    return 1;
  }
  process.stdout.write(`✅ 커밋 완료: ${message}\n`);

  if (args.push) {
    const p = git(["push"]);
    if (p.code !== 0) {
      process.stderr.write(`git push 실패 (커밋은 됨):\n${p.err || p.out}\n`);
      return 1;
    }
    process.stdout.write("✅ push 완료\n");
  }
  return 0;
}

try {
  process.exit(main());
} catch (err) {
  process.stderr.write(formatError(err as Error));
  process.exit(1);
}

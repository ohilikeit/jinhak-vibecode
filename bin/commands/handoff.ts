#!/usr/bin/env node
// jinhak-harness — /handoff (Layer 2.5)
// 검증된 산출물을 정해진 위치로 전달한다. 기본은 dry-run (ADR-001 §2 eco
// 정책). --confirm 으로만 실제 복사 + .harness/state.md 로그 기록.
//
// 사용:
//   node bin/install.js handoff                       # dry-run 미리보기
//   node bin/install.js handoff --confirm             # 실제 복사
//   node bin/install.js handoff --to ~/Documents/jobs # 대상 디렉터리 지정
//   node bin/install.js handoff --label weekly-jobs   # 파일명 prefix

import * as fs from "node:fs";
import * as path from "node:path";

interface Args {
  output: string;
  to: string;
  label: string;
  confirm: boolean;
}

function parseArgs(argv: string[]): Args {
  const opt = (name: string, dflt: string) => {
    const i = argv.indexOf(name);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : dflt;
  };
  const cwd = process.cwd();
  return {
    output: opt("--output", path.join(cwd, "output", "jobs.xlsx")),
    to: opt("--to", path.join(cwd, "handoff")),
    label: opt("--label", "jobs"),
    confirm: argv.includes("--confirm"),
  };
}

function buildTargetName(label: string, sourceExt: string): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${label}-${yyyy}-${mm}-${dd}${sourceExt}`;
}

function appendStateLog(stateMdDir: string, entry: string): string {
  fs.mkdirSync(stateMdDir, { recursive: true });
  const stateMd = path.join(stateMdDir, "state.md");
  let body = "";
  if (fs.existsSync(stateMd)) {
    body = fs.readFileSync(stateMd, "utf-8");
  } else {
    body = [
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
  }
  const hasLog = body.includes("## 핸드오프 로그");
  if (!hasLog) {
    body = body.replace(/\s*$/, "") + "\n\n## 핸드오프 로그\n";
  }
  body = body.replace(/\s*$/, "") + `\n- ${entry}\n`;
  fs.writeFileSync(stateMd, body);
  return stateMd;
}

function main(): number {
  const args = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(args.output)) {
    process.stderr.write(`산출물을 찾지 못했습니다: ${args.output}\n`);
    process.stderr.write(`/build 와 /verify 를 먼저 실행했는지 확인하세요.\n`);
    return 1;
  }

  const ext = path.extname(args.output);
  const targetName = buildTargetName(args.label, ext);
  const targetPath = path.join(args.to, targetName);

  process.stdout.write(
    [
      `📦 핸드오프 미리보기`,
      `  원본:   ${args.output}`,
      `  대상:   ${targetPath}`,
      `  라벨:   ${args.label}`,
      `  파일명: ${targetName}`,
      "",
    ].join("\n"),
  );

  if (!args.confirm) {
    process.stdout.write(
      [
        "ℹ️  dry-run 모드 (eco 기본) — 실제로 복사되지 않았습니다.",
        "   실행하려면 다시 같은 명령에 `--confirm` 을 붙여주세요:",
        `   $ jinhak-harness handoff --to ${args.to} --label ${args.label} --confirm`,
        "",
      ].join("\n"),
    );
    return 0;
  }

  // 실제 복사
  fs.mkdirSync(args.to, { recursive: true });
  fs.copyFileSync(args.output, targetPath);

  const timestamp = new Date().toISOString();
  const entry = `${timestamp}  ${path.basename(args.output)} → ${targetPath}`;
  const stateMd = appendStateLog(path.join(process.cwd(), ".harness"), entry);

  process.stdout.write(
    [
      `✅ 복사 완료: ${targetPath}`,
      `✅ 활동 로그 기록: ${stateMd}`,
      "",
      "🎯 다음 단계: 이 파일을 사용자분의 표준 위치(예: 회사 공유 드라이브)로 옮겨주세요.",
      "",
    ].join("\n"),
  );
  return 0;
}

process.exit(main());

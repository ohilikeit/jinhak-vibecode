// jinhak-harness — common/utils/csv-write Node 래퍼
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const PY_SCRIPT = resolve(HERE, "write.py");

export interface WriteCsvOptions {
  output: string;
  rows: Record<string, unknown>[];
  python?: string;
}

export interface WriteCsvResult {
  output: string;
  rows: number;
  columns: string[];
}

export async function write(opts: WriteCsvOptions): Promise<WriteCsvResult> {
  const python = opts.python ?? process.env.JINHAK_PYTHON ?? "python3";
  const tmp = await mkdtemp(join(tmpdir(), "jinhak-csv-"));
  const rowsPath = join(tmp, "rows.json");
  try {
    await writeFile(rowsPath, JSON.stringify(opts.rows), "utf-8");
    return await runPython(python, [PY_SCRIPT, opts.output, rowsPath]);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

function runPython(python: string, args: string[]): Promise<WriteCsvResult> {
  return new Promise((res, rej) => {
    const child = spawn(python, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => (stdout += c.toString("utf-8")));
    child.stderr.on("data", (c) => (stderr += c.toString("utf-8")));
    child.on("error", rej);
    child.on("close", (code) => {
      if (code !== 0) {
        rej(new Error(`csv-write/write.py exited ${code}: ${stderr.trim() || "(no stderr)"}`));
        return;
      }
      try {
        res(JSON.parse(stdout) as WriteCsvResult);
      } catch (err) {
        rej(new Error(`failed to parse csv-write stdout: ${(err as Error).message}`));
      }
    });
  });
}

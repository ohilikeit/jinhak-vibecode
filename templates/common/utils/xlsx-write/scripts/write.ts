// jinhak-harness — common/utils/xlsx-write Node 래퍼
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const PY_SCRIPT = resolve(HERE, "write_from_template.py");

export interface WriteOptions {
  template: string;
  output: string;
  rows: Record<string, unknown>[];
  python?: string;
}

export interface WriteResult {
  rows_written: number;
  headers: string[];
  output: string;
}

export async function write(opts: WriteOptions): Promise<WriteResult> {
  const python = opts.python ?? process.env.JINHAK_PYTHON ?? "python3";
  const tmp = await mkdtemp(join(tmpdir(), "jinhak-xlsx-"));
  const rowsPath = join(tmp, "rows.json");
  try {
    await writeFile(rowsPath, JSON.stringify(opts.rows), "utf-8");
    return await runPython(python, [PY_SCRIPT, opts.template, opts.output, rowsPath]);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

function runPython(python: string, args: string[]): Promise<WriteResult> {
  return new Promise((res, rej) => {
    const child = spawn(python, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => (stdout += c.toString("utf-8")));
    child.stderr.on("data", (c) => (stderr += c.toString("utf-8")));
    child.on("error", rej);
    child.on("close", (code) => {
      if (code !== 0) {
        rej(
          new Error(
            `write_from_template.py exited with code ${code}: ${stderr.trim() || "(no stderr)"}`,
          ),
        );
        return;
      }
      try {
        res(JSON.parse(stdout) as WriteResult);
      } catch (err) {
        rej(
          new Error(
            `failed to parse write_from_template.py stdout: ${(err as Error).message}`,
          ),
        );
      }
    });
  });
}

// jinhak-harness — common/utils/pdf-extract
// Node ↔ Python 결합: extract.py를 spawn해 JSON stdout을 파싱한다.
//
// 사용:
//   import { extract } from "./extract.ts";
//   const data = await extract("/path/to/file.pdf");
//
// 실행 시점에 Node 22+ --experimental-strip-types로 타입을 벗긴다.

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export interface PdfTable extends Array<Array<string | null>> {}
export interface PdfPage {
  text: string;
  tables: PdfTable[];
}
export interface PdfExtractResult {
  pages: PdfPage[];
}

const HERE = dirname(fileURLToPath(import.meta.url));
const PY_SCRIPT = resolve(HERE, "extract.py");

export function extract(
  pdfPath: string,
  options: { python?: string } = {},
): Promise<PdfExtractResult> {
  const python = options.python ?? process.env.JINHAK_PYTHON ?? "python3";

  return new Promise((res, rej) => {
    const child = spawn(python, [PY_SCRIPT, pdfPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf-8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf-8");
    });

    child.on("error", rej);
    child.on("close", (code) => {
      if (code !== 0) {
        rej(
          new Error(
            `extract.py exited with code ${code}: ${stderr.trim() || "(no stderr)"}`,
          ),
        );
        return;
      }
      try {
        res(JSON.parse(stdout) as PdfExtractResult);
      } catch (err) {
        rej(new Error(`failed to parse extract.py stdout as JSON: ${(err as Error).message}`));
      }
    });
  });
}

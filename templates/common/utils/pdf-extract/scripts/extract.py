#!/usr/bin/env python3
"""
jinhak-harness — common/utils/pdf-extract
PDF 파일에서 페이지별 텍스트와 표를 뽑아 JSON으로 stdout에 출력한다.

사용:
    python3 extract.py /path/to/file.pdf

출력 스키마:
    {"pages": [{"text": "...", "tables": [[[..]]]}, ...]}
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


def extract(pdf_path: Path) -> dict:
    import pdfplumber  # lazy import so --help 등 부수 명령에서 빠르게 종료

    pages: list[dict] = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            try:
                tables = page.extract_tables() or []
            except Exception:
                tables = []
            pages.append({"text": text, "tables": tables})
    return {"pages": pages}


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("usage: extract.py <pdf-path>", file=sys.stderr)
        return 2

    pdf_path = Path(argv[1])
    if not pdf_path.exists():
        print(f"file not found: {pdf_path}", file=sys.stderr)
        return 1

    result = extract(pdf_path)
    json.dump(result, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

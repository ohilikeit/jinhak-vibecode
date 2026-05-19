#!/usr/bin/env python3
"""Generate test-fixtures/template.xlsx with bold Korean headers.

Headers: 공고제목 / 회사명 / 직무 (3 columns)
"""
from __future__ import annotations

import sys
from pathlib import Path

import openpyxl
from openpyxl.styles import Font

HEADERS = ["공고제목", "회사명", "직무"]


def build(out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "채용공고"

    bold = Font(name="Calibri", size=11, bold=True)
    for col_idx, header in enumerate(HEADERS, start=1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = bold

    wb.save(out)


if __name__ == "__main__":
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / "template.xlsx"
    build(out)
    print(f"wrote {out}")

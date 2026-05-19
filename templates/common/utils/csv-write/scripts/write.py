#!/usr/bin/env python3
"""
jinhak-harness — common/utils/csv-write
dict 배열을 utf-8-sig CSV로 저장 (Excel/Numbers 한글 호환).

사용:
    python3 write.py <output.csv> <rows.json>

출력 (stdout JSON):
    {"output": "<path>", "rows": <int>, "columns": [...]}
"""
from __future__ import annotations

import json
import sys
from pathlib import Path


def write(output: Path, rows: list[dict]) -> dict:
    import pandas as pd  # lazy

    output.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        # 빈 데이터 — 헤더 없는 빈 파일을 만들지 않고 명시 에러
        raise SystemExit("rows가 비어있습니다.")

    df = pd.DataFrame(rows)
    df.to_csv(output, index=False, encoding="utf-8-sig")
    return {
        "output": str(output),
        "rows": len(df),
        "columns": list(df.columns),
    }


def main(argv: list[str]) -> int:
    if len(argv) < 3:
        print("usage: write.py <output.csv> <rows.json>", file=sys.stderr)
        return 2
    output = Path(argv[1])
    rows_path = Path(argv[2])
    if not rows_path.exists():
        print(f"rows.json not found: {rows_path}", file=sys.stderr)
        return 1
    rows = json.loads(rows_path.read_text(encoding="utf-8"))
    if not isinstance(rows, list):
        print("rows.json must be a list", file=sys.stderr)
        return 1
    result = write(output, rows)
    json.dump(result, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

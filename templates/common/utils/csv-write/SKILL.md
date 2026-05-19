---
name: common/utils/csv-write
description: 데이터 행 배열을 한국어 CSV 파일로 저장합니다. UTF-8 BOM(utf-8-sig)로 출력되어 Excel에서 바로 열어도 한글이 깨지지 않습니다. Use when 사용자가 "CSV로 정리", "엑셀에서 열 CSV" 등을 말할 때, 또는 다른 직군 스킬이 `requires:` 항목으로 이 utility를 선언했을 때.
user-invocable: false
alwaysApply: false
requires:
  - python3
  - pandas
allowed-tools:
  - Bash(python3 *)
  - Read
  - Write
---

# common/utils/csv-write

## 역할

dict 배열 → CSV 파일. 헤더는 첫 행의 키 순서를 따른다. UTF-8 BOM(utf-8-sig)로 저장해 Excel/Numbers 양쪽에서 한글이 그대로 보인다.

## 사용법

### Python 직접 호출
```bash
python3 scripts/write.py <output.csv> <rows.json>
```

### Node 래퍼
```ts
import { write } from "./scripts/write.ts";
await write({ output, rows });
```

## 입력

- `rows.json`: 객체 배열. 모든 객체는 같은 키 집합을 가지는 게 권장됨.
- 누락된 키는 빈 셀로 처리됨.

## 출력

- 지정된 `output.csv` (UTF-8 with BOM)
- stdout JSON: `{"output": "<path>", "rows": <int>, "columns": ["..."]}`

## Gotchas

- 사용자가 Excel에서 CSV를 다시 저장하면 BOM이 사라질 수 있다 — 그래도 한 번 열리면 정상.
- 천 단위 구분 `1,234` 같은 값은 따옴표로 감싸지 않으면 컬럼 분리됨 — pandas가 자동으로 처리.

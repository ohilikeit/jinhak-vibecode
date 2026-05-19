---
name: common/utils/xlsx-write
description: 정해진 헤더의 Excel 템플릿(xlsx)을 복사한 뒤 데이터 행을 채워 넣어 새로운 xlsx 파일을 만듭니다. Use when 사용자가 "Excel로 정리", "스프레드시트로 저장", "양식에 채워줘" 등을 말할 때, 또는 다른 직군 스킬이 `requires:` 항목으로 이 utility를 선언했을 때.
requires:
  - python3
  - openpyxl
allowed-tools:
  - Bash(python3 *)
  - Read
  - Write
---

# common/utils/xlsx-write

## 역할

회사 표준 양식(템플릿 xlsx) → 데이터 행 채워 넣은 출력 xlsx 생성. 헤더 셀의 스타일(볼드/색상/병합)을
**손대지 않고** 보존하기 위해 템플릿을 통째로 복사한 뒤 row 2부터 쓴다.

## 사용법

### Python 직접 호출
```bash
python3 scripts/write_from_template.py <template.xlsx> <output.xlsx> <rows.json>
```

- `rows.json`은 객체 배열. 각 객체의 키는 템플릿 헤더 이름과 일치해야 한다.
- 예: `[{"공고제목":"백엔드 채용","회사명":"진학에듀","직무":"BE"}]`

### Node 래퍼
```ts
import { write } from "./scripts/write.ts";
await write({ template, output, rows });
```

## 헤더 순서 = 컬럼 순서

row 1에서 좌→우로 헤더를 읽어 dict 키와 매핑한다. 따라서 사용자가 템플릿 컬럼 순서를 바꿔도
코드 변경 없이 동작한다. 헤더에 없는 dict 키는 무시한다.

## Gotchas

- 빈 셀: dict에 키가 없으면 `None`(빈 셀).
- 병합 셀: row 1의 병합은 보존되지만, row 2부터 병합이 필요하면 별도 처리 필요.
- 수식: 데이터로 `"=A1+B1"` 같은 문자열을 넣으면 openpyxl이 수식으로 해석한다. 그대로 텍스트로 두려면 앞에 `'` 추가.

---
name: common/utils/pdf-extract
description: PDF 파일에서 페이지별 텍스트와 표(table)를 추출해 JSON으로 반환합니다. Use when 사용자가 PDF 파일 내용을 읽거나 표를 뽑아야 한다고 말할 때, 또는 다른 직군 스킬이 `requires:` 항목으로 이 utility를 선언했을 때.
requires:
  - python3
  - pdfplumber
allowed-tools:
  - Bash(python3 *)
  - Read
---

# common/utils/pdf-extract

## 역할

PDF → `{"pages": [{"text": "...", "tables": [[[...]]]}]}` 형태의 JSON 출력을 책임지는 1급 공용 유틸리티입니다.
직군 스킬(예: `jobs-pdf-to-excel`)은 추출 규칙을 본인이 가지고, 추출 자체는 이 utility에 위임합니다.

## 사용법

### Python 직접 호출 (디버깅·검증용)
```bash
python3 scripts/extract.py /path/to/file.pdf > out.json
```

### Node 래퍼 호출 (스킬에서 사용)
```ts
import { extract } from "./scripts/extract.ts";
const result = await extract("/path/to/file.pdf");
// result.pages[0].text, result.pages[0].tables
```

## 출력 스키마

```jsonc
{
  "pages": [
    {
      "text": "페이지 전체 텍스트",
      "tables": [
        [["헤더1", "헤더2"], ["행1-1", "행1-2"]]   // 표 1
      ]
    }
  ]
}
```

- `ensure_ascii=False`로 한글이 그대로 보존됩니다.
- 표가 없는 페이지는 `"tables": []`.
- 빈 PDF는 `{"pages": []}`.

## 의존성

`compatibility.json` 참조. 1순위 설치는 `uv tool install`, 폴백은 OS별 패키지 매니저입니다(ADR-003 §2.2).

## Gotchas

- 스캔 이미지 PDF(텍스트 레이어 없음)는 `text=""`로 나옵니다. OCR은 본 MVP 범위 밖입니다.
- 표 감지는 pdfplumber 기본 휴리스틱을 따릅니다. 복잡한 셀 병합은 부정확할 수 있습니다.

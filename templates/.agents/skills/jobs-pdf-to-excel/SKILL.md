---
name: jobs-pdf-to-excel
description: 폴더(inbox/jobs/)에 모인 채용공고 PDF를 정해진 컬럼의 Excel로 정리합니다. Use when 사용자가 "채용공고 정리", "PDF 모아서 Excel", "공고 표로 만들어줘" 등을 말할 때.
requires:
  - common/utils/pdf-extract
  - common/utils/xlsx-write
allowed-tools:
  - Read
  - Bash(python3 *)
  - Bash(node *)
---

# jobs-pdf-to-excel

## 절차

1. `inbox/jobs/` 디렉터리의 `.pdf` 파일을 모두 스캔
2. 각 PDF에 대해 `common/utils/pdf-extract` 호출 → 페이지 텍스트
3. 텍스트에서 라벨 기반 정규식으로 다음 5필드 추출
   - 공고제목 (첫 번째 헤더 라인)
   - 회사명 (`회사명:` 뒤)
   - 직무 (`직무:` 뒤)
   - 근무지 (`근무지:` 뒤)
   - 마감일 (`마감일:` 뒤)
4. 추출된 행 N개를 `common/utils/xlsx-write`로 회사 템플릿에 채워 저장
5. 출력 경로 + 행 수를 stdout에 JSON으로 보고

## 입력

- `inbox/jobs/*.pdf` — 라벨 컨벤션을 따르는 채용공고 PDF
- `assets/template.xlsx` — 5컬럼 헤더(공고제목/회사명/직무/근무지/마감일) Excel 템플릿

## 출력

- `output/jobs.xlsx` — 채워진 Excel
- stdout: `{"output":"output/jobs.xlsx","rows":3}` 형태 JSON

## Gotchas

- 라벨이 PDF에 없으면 해당 셀은 빈칸으로 둔다
- 스캔 이미지 PDF(텍스트 레이어 없음)는 모든 셀이 빈칸 → 사용자에게 친절 실패 리포트

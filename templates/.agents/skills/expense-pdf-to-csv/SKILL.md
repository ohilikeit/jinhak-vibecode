---
name: expense-pdf-to-csv
description: 폴더(inbox/receipts/)에 모인 영수증/지출 PDF에서 일자/금액/항목/부서를 추출해 CSV로 저장합니다. Use when 사용자가 "영수증 정리", "지출 CSV", "경비 합산", "비용 정산" 등을 말할 때.
user-invocable: true
alwaysApply: false
requires:
  - common/utils/pdf-extract
  - common/utils/csv-write
allowed-tools:
  - Read
  - Bash(python3 *)
  - Bash(node *)
---

# expense-pdf-to-csv

## 절차

1. `inbox/receipts/` 디렉터리의 `.pdf` 파일을 모두 스캔
2. 각 PDF에 대해 `common/utils/pdf-extract` 호출 → 페이지 텍스트
3. 텍스트에서 라벨 기반 정규식으로 4필드 추출
   - 일자 (`일자:` 또는 `날짜:` 뒤)
   - 금액 (`금액:` 뒤, 천 단위 쉼표 제거 후 정수로 변환)
   - 항목 (`항목:` 또는 `용도:` 뒤)
   - 부서 (`부서:` 뒤)
4. 마지막 행에 합계 추가
5. `common/utils/csv-write` 로 `output/expenses.csv` 저장
6. 출력 경로 + 행 수 + 총액을 stdout JSON에 보고

## 입력 PDF 형식 예

```
지출 결의서

일자: 2026-05-19
금액: 25,000
항목: 회의 점심
부서: 기획팀
```

## 출력

- `output/expenses.csv` (UTF-8 BOM, Excel/Numbers 호환)
- stdout: `{"output":"output/expenses.csv","rows":4,"total":58000}` (3건 + 합계 1행)

## Gotchas

- 금액에 콤마/원/원화 기호가 섞이면 숫자만 추출
- 라벨 누락 시 셀은 빈칸으로 두고 친절 리포트가 어느 PDF/필드인지 알려줌

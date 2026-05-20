---
description: 자동화 실행 — 적합한 스킬을 골라 inbox/* → output/* 생성
argument-hint: "<요청 문장>"
allowed-tools:
  - Bash
---

# /build — 자동화 실행

사용자 요청을 받아 등록된 스킬 중 가장 적합한 것을 골라 실제 변환(PDF → Excel/CSV, 텍스트 → 요약 등)을 수행합니다.

## 실행

```bash
npx -y jinhak-harness build "$ARGUMENTS"
```

`$ARGUMENTS`가 비면 사용법(exit 2). 사용자에게 자연어로 요청을 받아 그대로 전달하세요.

## 입력 폴더 컨벤션

| 요청 | 입력 폴더 | 산출 |
|---|---|---|
| 채용공고 Excel 정리 | `inbox/jobs/*.pdf` + `assets/template.xlsx` | `output/jobs.xlsx` |
| 회의록 요약 | `inbox/meetings/*.txt` | `output/meeting-summary.md` |
| 영수증 CSV | `inbox/receipts/*.pdf` | `output/expenses.csv` |
| (사용자 정의) | `/create`로 등록된 spec.json의 `input.dir` | spec.json의 `output.path` |

## 실패 시

친절 한국어 리포트로 어느 파일/필드가 문제인지 알려줍니다 (LLM 호출 0).

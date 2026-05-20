---
description: 새 자동화 스킬 만들기 — 6문항 인터뷰 → user-skills/<name>/SKILL.md
argument-hint: ""
allowed-tools:
  - Bash
---

# /create — 새 자동화 만들기

기본 3개 스킬(채용공고/회의록/영수증) 외에 직접 만드는 새 자동화. 6문항 인터뷰만 답하면 `~/.harness/user-skills/<name>/{SKILL.md, spec.json}` 가 자동 생성되고 `/plan`·`/build` 가 즉시 인식합니다.

## 실행

```bash
npx -y jinhak-harness create
```

대화형 프로그램이므로 채팅에서 다음 6문항을 순서대로 물어 사용자 답변을 stdin으로 전달하세요:

1. 스킬 이름은? (영문 케밥-케이스 권장, 예: `contract-pdf-to-summary`)
2. 어떤 요청일 때 동작할까요? (트리거 키워드용 한 문장)
3. 입력 폴더 경로는? (예: `inbox/contracts`)
4. 입력 파일 확장자는? (`pdf` / `txt` / `xlsx` 등)
5. 출력 파일 경로는? (예: `output/contracts.csv`)
6. 추출할 항목을 쉼표로 알려주세요 (예: `계약일, 회사명, 금액, 만료일`)

## 결과

- `~/.harness/user-skills/<name>/SKILL.md` — 호스트가 자동 스캔
- `~/.harness/user-skills/<name>/spec.json` — `/build` 가 동적 라우팅에 사용

코드 수정 0회, 바로 사용 가능합니다.

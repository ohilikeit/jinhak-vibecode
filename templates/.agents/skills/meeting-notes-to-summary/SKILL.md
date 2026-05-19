---
name: meeting-notes-to-summary
description: 폴더(inbox/meetings/)에 모인 회의록 텍스트 파일을 한 장의 마크다운 요약표로 정리합니다. Use when 사용자가 "회의록 요약", "회의 정리", "액션 아이템 모아줘" 등을 말할 때.
user-invocable: true
alwaysApply: false
requires: []
allowed-tools:
  - Read
  - Bash(node *)
---

# meeting-notes-to-summary

## 절차

1. `inbox/meetings/` 디렉터리의 `.txt` 파일을 모두 스캔
2. 각 파일에서 다음 라벨 기반 정규식으로 4필드 추출
   - 날짜 (`날짜:` 또는 `일자:` 뒤)
   - 참석자 (`참석자:` 뒤, 쉼표 분리)
   - 결정사항 (`결정사항:` 또는 `결정:` 뒤, 줄 끝까지)
   - 액션 (`액션:` 또는 `액션아이템:` 뒤, 줄 끝까지)
3. 추출된 행 N개를 마크다운 표로 `output/meeting-summary.md`에 저장
4. 출력 경로 + 행 수를 stdout에 JSON으로 보고

## 입력 예시

```
날짜: 2026-05-19
참석자: 김PM, 이디자이너, 박개발
결정사항: 다음 스프린트 우선 항목은 진학-하니스 v0.2 출시
액션: 김PM이 5/22까지 PRD 초안 공유
```

## 출력

- `output/meeting-summary.md` — 마크다운 표
- stdout: `{"output":"output/meeting-summary.md","rows":3}` 형태 JSON

## Gotchas

- 라벨이 파일에 없으면 해당 셀은 "(미기재)" 로 표시
- 다중 결정사항/액션은 첫 번째 줄만 추출 (MVP 단순화)

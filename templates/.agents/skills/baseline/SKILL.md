---
name: baseline
description: jinhak-harness baseline 정책 — 한국어 우선, dry-run 강제, 친절 실패 리포트. 모든 자동화 위에 깔리는 규칙층.
user-invocable: false
alwaysApply: true
requires: []
allowed-tools: []
---

# baseline (alwaysApply)

이 스킬은 **사용자 호출 대상이 아닙니다** — `alwaysApply: true`이므로 모든 자동화 위에 자동 주입되는 baseline 정책 레이어입니다.

## 정책

1. **한국어 우선** — 모든 사용자-facing 메시지는 한국어. 에러·진단·요청·확인 모두.
2. **Dry-run 강제** — 외부 전송/삭제/결제 같은 부수효과는 사용자가 `--confirm` 으로 명시 승인해야만 실행.
3. **친절 실패 리포트** — 에러는 `bin/friendly-error.js` 의 변수 치환 템플릿으로 변환. LLM 호출 X.
4. **토큰 가드 라벨** — 모든 명령은 🟢🟡🔴 라벨로 비용을 사전 안내.
5. **격리 모드 보호** — `HARNESS_HOME` / `AGENTS_SKILLS_HOME` 외부의 사용자 홈은 절대 만지지 않음.

## Karpathy 시맨틱

`alwaysApply: true` 는 `.cursor/rules/*.mdc` 의 자동 강제 패턴과 동일한 의미입니다 — 어떤 직군 스킬이 호출되든 이 baseline은 항상 컨텍스트에 깔립니다.

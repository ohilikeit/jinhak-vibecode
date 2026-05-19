# /autopilot — 한 번에 모든 단계

`/plan` → `/build` → `/verify` 3단계를 무중단으로 실행합니다. **처음 자동화를 돌릴 때 권장**.

## 실행

```bash
jinhak-harness autopilot "$ARGUMENTS"
```

기대 행 수까지 알 때 (가장 안전):

```bash
jinhak-harness autopilot "$ARGUMENTS"
# 단, $ARGUMENTS 에 --expected-rows 가 포함돼 있어야 함
```

`$ARGUMENTS` 가 비면 사용법(exit 2). 사용자에게 "어떤 자동화를 한 번에 돌릴까요?" 라고 물어 인자를 받으세요.

## 진행 표시

```
━━━ 1/3 plan ━━━
  → 라우팅: jobs-pdf-to-excel
━━━ 2/3 build ━━━
  → output/jobs.xlsx 생성
━━━ 3/3 verify ━━━
  → 예상 행 수 (3)와 일치 ✅
✅ autopilot 완료 — 다음: /handoff --to <폴더> --confirm
```

## 중간에 멈추면

어느 단계에서 멈췄는지 한국어로 알려주므로(예: "plan 단계에서 멈췄습니다 — 매칭되는 스킬 없음"), 그 단계의 단일 명령(`/plan`, `/build`, `/verify`)으로 디버그하세요.

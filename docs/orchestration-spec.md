# Orchestration Spec — 메타 슬래시 커맨드 (원안)

> **상태**: ⚠️ **원안 / 부분 구현** (Draft v2, 2026-05-18 작성 후 미수정).
> 아래 본문은 **설계 의도(원안)**이며 실제 구현은 단순화되어 달라졌다. **현재 구현 기준은 [§0.5 구현 현황](#05-구현-현황-2026-06-기준)을 먼저 보라.**
> 본문 §1~9는 v1.0을 향한 **로드맵/설계 참조**로 유지한다.
> **상위 문서**: [README.md §4.5](../README.md) · [REPORT_06 §5.5](research/REPORT_06_FINAL_synthesis.md)
> **차용 출처**: GSD · Superpowers · Hermes · KW Plugins · Karpathy
> **현 구현 도구 문서**: [architecture/LAYER3_HARNESS_TOOLING.md](architecture/LAYER3_HARNESS_TOOLING.md)

## 0. v2 핵심 변경 (Codex 리뷰 결과 반영)

| 변경 | 이유 |
|---|---|
| **8개 → v1 노출 3개** (`/start /build /verify`) + 내부 5개 (`/plan /autoplan /autopilot /ship /handoff`) | 비개발자가 8개 외울 가능성 낮음. 노출 surface 축소 |
| **HARD-GATE 6 → 3** (G-DRYRUN / G-APPROVAL / G-VERIFY만 유지) | G-TOKEN / G-REQ / G-PROFILE은 **소프트 경고**로 강등. "도구가 stall 한다" 인상 회피 |
| **`CONTEXT.md 절대 수정 X` 폐기** | 비개발자는 컨텍스트를 끊임없이 정정함. 잠금 대신 변경 이력만 추적 |
| **`.harness/` 파일 모델 사용자 비노출** | 도구가 관리, 사용자 어휘는 "프로젝트 메모리 / 현재 자동화 / 실행 이력 / 검증" |
| **스킬 트리거 2-of-4 휴리스틱 폐기, 3계층 로딩으로 단순화** | 휴리스틱은 trigger-happy. v1은 frontmatter만 기본 로드, 명시 요구 시에만 본문 |
| **40~70% 절감 수치 약화** | 측정 전 약속 금지. "측정 후 확정" 표기 |
| **9+9 MemoryProvider ABC 비노출** | facade 4개 메서드만 사용자/SKILL에 노출, ABC는 internal |
| **phase별 토큰 확인 → 거친 라벨 (🟢🟡🔴)** | 비개발자는 토큰 산수가 아니라 체감 비용을 본다 |

본 문서는 메타 커맨드의 frontmatter, 게이트, 아티팩트 스키마, 서브에이전트 spawn 패턴을 단일 진실 소스로 정의한다. v2 변경은 기존 구조를 깨지 않으면서 노출 표면만 축소한다.

---

## 0.5 구현 현황 (2026-06 기준)

> **이 절이 현재 동작에 대한 권위 있는 기준이다.** §1~9는 작성 시점의 원안이며 구현과 다르다.

### 커맨드: 원안 8종 → 실재 12종

| 원안 (§4) | 실제 | 차이 |
|---|---|---|
| `/onboard` | `/start` | **개명**. 5문항 인터뷰 → `~/.harness/user-profile.md` |
| `/plan` | `/plan` | 존재. 단 산출물이 다름(아래) |
| `/autoplan` | — | ❌ **미구현** (파일 없음) |
| `/build` | `/build` | 존재. 단 PLAN 실행 엔진이 아니라 `inbox→output` 룰테이블 디스패처 |
| `/autopilot` | `/autopilot` | 존재. `plan→build→verify` 순차 spawn (phase 게이트 없음) |
| `/verify` | `/verify` | 존재. 친절 한국어 검증(행 수·빈 셀·합계). evals/압박테스트 미구현 |
| `/ship` | `/ship` | **의미 변경**: 스케줄·전달채널 등록 → `.harness/*` **git 커밋** |
| `/handoff` | `/handoff` | **의미 변경**: 직군 컨텍스트 전환 → 산출물 **폴더 복사**(dry-run 기본, `--confirm`) |
| (없음) | `/create` | Skill Creator 6문항 인터뷰 → `user-skills/<name>/SKILL.md` |
| (없음) | `/doctor` `/init` `/register` `/unregister` | 진단·홈 초기화·6 호스트 등록/제거 |

### 아티팩트: 원안 상태머신 → 실재 단순 파일

| 원안 (§1) | 실제 |
|---|---|
| `.harness/plans/<slug>/{CONTEXT,PLAN,SUMMARY,VERIFICATION}.md` (slug별 4파일) | `.harness/plans/<타임스탬프>-<slug>.md` **단일 파일** 1장 |
| `.harness/baseline.mdc` `PROJECT.md` `ROADMAP.md` `handoffs/<phase>.md` `evals/<skill>/evals.json` | ❌ 미생성 |
| `.harness/state.md` | ✅ `/handoff`·`/ship`이 사용 |
| `user-profile.md` (프로젝트) | `~/.harness/user-profile.md` (홈) |

### 미구현 시스템 (원안에만 존재)

- **CommandDef 중앙 레지스트리(§2)** — `registry.ts` 없음. 커맨드는 `commands/*.md` + `bin/commands/*.mjs`로 개별 정의.
- **HARD-GATE 카탈로그(§3,§5)** — `/handoff`의 dry-run을 제외하면 형식 게이트 미구현.
- **직군 스킬 phase 매핑·서브에이전트 spawn(§3.3,§6)** — `/build`는 3개 구체 스킬(jobs-pdf-to-excel / expense-pdf-to-csv / meeting-notes-to-summary)에 대한 정적 룰테이블.
- **메모리 훅(on_session_end / on_session_switch)** — facade(`bin/memory.js`)만 존재, 훅 연동 미구현.
- **Description Tuner 학습 루프(§7)** — 미구현.

### 실재 빌트인 스킬
- 직군: `baseline`, `jobs-pdf-to-excel`, `expense-pdf-to-csv`, `meeting-notes-to-summary` (`templates/.agents/skills/`)
- 공용 유틸: `pdf-extract`, `xlsx-write`, `csv-write` (`templates/common/utils/`, Python lazy 디텍션)

---

## 1. 디렉터리 레이아웃 (GSD 차용) — 원안

```
.harness/
├── baseline.mdc            # alwaysApply: true — Karpathy 4원칙 + 토큰 가드 (Karpathy 차용)
├── PROJECT.md              # 1회 작성, 비전·도메인 (불변)
├── ROADMAP.md              # 완료/진행 자동화 목록 (누적)
├── state.md                # 현재 phase·세션 ID·linked_ralph 등 (도구만 편집)
├── user-profile.md         # 8 행동 차원 + 직군 (GSD user-profiler 차용)
├── handoffs/<phase>.md     # 단계 전환 시 결정·기각·리스크 (Superpowers 차용)
├── plans/<slug>/
│   ├── CONTEXT.md          # 인터뷰 locked 결정 (절대 수정 X)
│   ├── PLAN.md             # /plan 산출물 (requires 검증용)
│   ├── SUMMARY.md          # /build 결과 (content-match resume key)
│   └── VERIFICATION.md     # /verify 보고 (status + overrides)
└── evals/
    └── <skill>/evals.json  # 회귀 케이스 + Description Tuner 학습 데이터
```

---

## 2. CommandDef 중앙 레지스트리 (Hermes 차용)

```typescript
interface CommandDef {
  name: string;                    // /start, /build, /verify, /plan, ...
  description: string;             // ≤1024자, "Use when..." 패턴
  argument_hint?: string;
  category: "bootstrap" | "planning" | "execution" | "verification" | "delivery" | "handoff";
  visibility: "user" | "internal";              // v2 추가 — 자동완성·문서에 노출 여부
  profiles: ("eco" | "standard" | "power")[];
  requires: string[];              // 선행 아티팩트 (없으면 자동 호출하여 보충)
  produces: string[];
  allowed_tools: string[];
  hard_gates: HardGate[];          // 3종만 (G-DRYRUN / G-APPROVAL / G-VERIFY)
  soft_warnings: SoftWarning[];    // v2 추가 — 차단 X, 경고만 (G-TOKEN / G-REQ / G-PROFILE)
  next_commands: string[];         // 자동 체인이 아니라 추천 표시용
  effort_label: "🟢 빠름" | "🟡 느림" | "🔴 할당량 위험";  // v2 추가 — 토큰 산수 대체
}
```

`visibility: "user"`인 3개만 슬래시 자동완성과 마켓플레이스 docs에 노출. `visibility: "internal"`인 5개는 도구가 내부 phase로만 호출하거나 `--advanced` 플래그 사용 시에만 직접 호출 가능.

---

## 3. 공통 진입·종료 규칙

### 3.1 진입 — HARD-GATE 3종 + 소프트 경고
**HARD-GATE 3종** (차단):
- **G-DRYRUN**: 외부 송신/삭제/결제 등 비가역 부수효과 → 미리보기 + 명시 승인 필수
- **G-APPROVAL**: 사용자가 결과를 직접 확인해야 하는 단계 → "진행" 응답 필수
- **G-VERIFY**: 성공/통과 주장 시 검증 명령 실행 결과 첨부 필수 (Superpowers 차용)

**소프트 경고** (메시지 후 진행):
- 선행 아티팩트 누락 → 자동으로 필요 phase 역방향 호출 (사용자에게는 "잠깐 만들고 올게요" 한 줄)
- 프로필 미스매치 → eco 사용자가 🔴 기능 호출 시 "이번 한 번만 진행할까요?" 분기
- 컨텍스트 윈도우 60% → 자동 압축 (사용자 알림 X), 80% → "잠시 정리할게요" 후 자동 분할

→ "도구가 일일이 확인받는다" 인상을 주지 않고, 진짜 위험한 3가지만 막는다.

### 3.2 종료
1. produces 아티팩트 도구 내부에 저장 (사용자에게 경로 안내 X)
2. handoff 노트 작성 (도구가 다음 phase에 자동 전달, 사용자에게는 1줄 요약만)
3. 다음 단계 추천 1개 표시 — 사용자가 자동 진행 동의 시 바로 다음 phase로

### 3.3 서브에이전트 spawn 패턴 (GSD lean orchestrator)
- 메타 커맨드 본체는 **인자 파싱 + 게이트 + 서브에이전트 호출 + 결과 수집**만 담당
- 도메인 로직은 서브에이전트가 자기 reference 파일을 직접 로드해서 처리
- spawn 시 풀텍스트 인라인 전달 (Superpowers 패턴)

---

## 4. 8개 커맨드 상세 스펙 — 원안 (실재 매핑은 §0.5)

### 4.1 `/onboard`
```yaml
name: onboard
description: 최초 1회 — 직군 선택, 8 행동 차원 프로파일링, baseline.mdc 작성, starter 스킬 3개 설치
category: bootstrap
profiles: [eco, standard, power]
requires: []
produces: [baseline.mdc, PROJECT.md, user-profile.md, .agents/skills/<직군>/]
allowed_tools: [Read, Write, AskUserQuestion, Bash]
hard_gates:
  - condition: ".harness/state.md 미존재"
    block_if: false  # 첫 진입은 항상 허용
next_commands: [/plan]
estimated_tokens: { eco: 4000, standard: 6000, power: 8000 }
```
**서브에이전트**: `harness-user-profiler` (GSD gsd-user-profiler 한국화 포팅) — Haiku 라우팅
**HARD-GATE**: 없음 (최초 진입)

### 4.2 `/plan <목표>`
```yaml
name: plan
argument_hint: <한 줄 자동화 목표>
description: 목표를 단계로 분해, 단계별 스킬·도구·예상 토큰 산출, 사용자 승인 후 PLAN.md 저장
category: planning
profiles: [eco, standard, power]
requires: [PROJECT.md, user-profile.md]
produces: [plans/<slug>/CONTEXT.md, plans/<slug>/PLAN.md]
allowed_tools: [Read, Write, AskUserQuestion, Agent, WebFetch]
hard_gates:
  - <HARD-GATE>onboard 미완료 시 진입 금지. baseline.mdc 부재면 /onboard 안내.</HARD-GATE>
next_commands: [/build, /autoplan]
estimated_tokens: { eco: 3000, standard: 5000, power: 8000 }
```
**서브에이전트**: `planner` (Haiku로 분해, Opus는 의사결정만)
**산출 PLAN.md frontmatter**:
```yaml
goal: <한 줄>
profile: eco|standard|power
estimated_tokens: { build: N, run: N }
phases:
  - phase: <이름>
    skills: [<직군/스킬>]
    tools: [~~CRM, ~~email]
    activeForm: "<현재형>"
handoffs: [<from→to>]
```

### 4.3 `/autoplan <목표>`
```yaml
name: autoplan
description: /plan + 메모리·user-profiler 자동 추론으로 질문 최소화
category: planning
profiles: [standard, power]              # eco 제외 (회상 비용)
requires: [PROJECT.md, user-profile.md]
produces: [plans/<slug>/CONTEXT.md, plans/<slug>/PLAN.md]
hard_gates:
  - <HARD-GATE>eco 프로필에서 호출 시 "memory recall 비쌈" 경고 후 1회 옵트인 분기</HARD-GATE>
next_commands: [/build]
estimated_tokens: { eco: N/A, standard: 9000, power: 14000 }
```
**메모리 훅**: `prefetch(query="<목표>")` 1회만, semantic search는 명시 요청 시에만

### 4.4 `/build <slug>`
```yaml
name: build
description: 승인된 PLAN을 단계별 실행, 단계 사이 사용자 확인 게이트
category: execution
profiles: [eco, standard, power]
requires: [plans/<slug>/PLAN.md]
produces: [plans/<slug>/SUMMARY.md]
allowed_tools: [Read, Write, Edit, Bash, Agent, AskUserQuestion]
hard_gates:
  - <HARD-GATE>PLAN.md 미승인(사용자 "진행" 응답 미기록) 시 진입 금지</HARD-GATE>
  - <HARD-GATE>각 phase 진입 시 예상 토큰 안내 + 사용자 확인 필수 (eco·standard·power 모두)</HARD-GATE>
next_commands: [/verify]
estimated_tokens: { eco: 6000, standard: 12000, power: 25000 }
```
**서브에이전트 라운드**: phase마다 적합 직군 스킬을 서브에이전트로 spawn(GSD orchestrator-subagent 분리), 결과 수집 후 다음 phase
**스킬 트리거 게이트** (README §4.6): 각 phase 시작 시 Haiku 라우터 4체크 → 2 미만이면 SKILL.md 로드 생략

### 4.5 `/autopilot <목표>`
```yaml
name: autopilot
description: /plan + /build 무중단 (phase 단위 게이트는 유지)
category: execution
profiles: [standard(1회 한정), power]    # eco 절대 금지
requires: [PROJECT.md]
produces: [plans/<slug>/PLAN.md, SUMMARY.md, VERIFICATION.md]
hard_gates:
  - <HARD-GATE>eco 프로필 호출 절대 금지 — "토큰 폭주 위험"으로 즉시 차단</HARD-GATE>
  - <HARD-GATE>standard 프로필은 1회 한정, 다음 호출 시 power 권유</HARD-GATE>
  - <HARD-GATE>phase 단위 게이트는 유지 — phase 사이 토큰 잔량 watchdog</HARD-GATE>
next_commands: [/ship]
estimated_tokens: { eco: N/A, standard: 20000, power: 35000 }
```
**content-match resume** (Hermes batch_runner 차용): 중단 후 재호출 시 SUMMARY.md 내용 매칭으로 완료 phase 스킵

### 4.6 `/verify <slug>`
```yaml
name: verify
description: 산출물을 기대값과 비교, gaps_found 시 자동 재계획
category: verification
profiles: [eco(Dry-run), standard(+evals), power(+압박 테스트)]
requires: [plans/<slug>/SUMMARY.md]
produces: [plans/<slug>/VERIFICATION.md]
allowed_tools: [Read, Bash, Agent]
hard_gates:
  - <HARD-GATE>실행 후 검증 명령 결과 없이 "통과" 주장 금지 (Superpowers verification-before-completion 차용)</HARD-GATE>
next_commands: [/ship, /build(gaps_found 시)]
estimated_tokens: { eco: 2000, standard: 5000, power: 12000 }
```
**VERIFICATION.md frontmatter**:
```yaml
status: passed | gaps_found | human_needed
score: N/M
gaps:
  - truth: <기대 동작>
    reason: <실패 사유>
    missing: [<누락 파일/단계>]
overrides:                              # GSD override 차용
  - must_have: <항목>
    reason: <의도적 수용 사유>
    accepted_by: user
    accepted_at: <ISO>
```

### 4.7 `/ship <slug>`
```yaml
name: ship
description: 자동화를 스케줄·전달 채널 등록 + evals.json 회귀 잠금
category: delivery
profiles: [eco(명시 호출), standard, power]
requires: [plans/<slug>/VERIFICATION.md (status: passed)]
produces: [evals/<slug>/evals.json, .harness/schedules/<slug>.yaml(선택)]
allowed_tools: [Read, Write, Bash, Agent]
hard_gates:
  - <HARD-GATE>VERIFICATION.md status가 passed 아니면 차단</HARD-GATE>
  - <HARD-GATE>외부 전송 작업은 Dry-run 미리보기 후 사용자 명시 승인</HARD-GATE>
next_commands: []  # terminal
estimated_tokens: { eco: 2000, standard: 4000, power: 7000 }
```
**메모리 훅**: `on_session_end(messages)` 호출 → 메모리 provider가 자동화 메타데이터 영구 저장
**스케줄 형식** (Hermes 차용): `"30m"` / `"every 30m"` / `"0 9 * * *"` / ISO timestamp

### 4.8 `/handoff <직군>`
```yaml
name: handoff
argument_hint: <직군 또는 스킬 카테고리>
description: 진행 중 다른 직군 컨텍스트로 전환 (lineage 보존)
category: handoff
profiles: [eco, standard, power]
requires: [plans/<slug>/CONTEXT.md (선택)]
produces: [handoffs/<from>-to-<target>.md]
allowed_tools: [Read, Write, Agent]
hard_gates:
  - <HARD-GATE>자동 체인 금지 — 사용자가 명시적으로 호출해야 함 (KW Plugins 패턴)</HARD-GATE>
next_commands: []  # 사용자가 선택
estimated_tokens: { eco: 1000, standard: 1500, power: 2000 }
```
**메모리 훅**: `on_session_switch(new_session_id, parent_session_id=current, reset=false, reason="handoff:<target>")`
**handoff 문서 형식** (Superpowers 차용):
```markdown
## Handoff: <from-skill> → <to-skill>
- Decided: <단계에서 확정된 결정>
- Rejected: <기각된 대안>
- Risks: <다음 단계 리스크>
- Files: <생성·수정된 핵심 파일>
- Remaining: <다음 단계가 처리할 항목>
```

---

## 5. 게이트 카탈로그 (v2: HARD 3 + Soft 3)

### HARD-GATE (차단)
| 게이트 ID | 적용 | 조건 | 메시지 |
|---|---|---|---|
| G-DRYRUN | /verify(→ship 분기) | 외부 송신·삭제·결제 등 비가역 행동 | 미리보기 표시 후 "진행하시겠습니까?" |
| G-APPROVAL | /build /verify | 사용자가 결과를 명시적으로 확인해야 할 때 | "이대로 진행할까요?" |
| G-VERIFY | /verify | 검증 명령 미실행 상태로 "통과" 주장 | "검증 결과를 확인 후 다시 시도" |

### 소프트 경고 (메시지 후 자동 진행 or 옵트인 분기)
| 경고 ID | 트리거 | 동작 |
|---|---|---|
| W-REQ | 선행 아티팩트 누락 | 자동으로 필요 phase 호출, 사용자에겐 "잠깐 만들고 올게요" |
| W-PROFILE | eco 사용자가 🔴 기능 호출 | "이번 한 번만 진행할까요?" 분기 |
| W-CONTEXT | 컨텍스트 60% → 자동 압축 / 80% → 자동 분할 | 80%일 때만 사용자 알림 |

---

## 6. 직군 스킬 ↔ 메타 커맨드 매핑 매트릭스

| phase | 호출 직군 스킬 (KW Plugins 기반) | spawn 모델 |
|---|---|---|
| 표본 수집 | common/inbox-collect | Haiku |
| 요구사항 추출 | planning/spec-from-samples | Haiku |
| 데이터 처리 룰 | data/pdf-extract-strategy, data/sql-from-natural | Sonnet |
| 카피·문서 작성 | marketing/draft-content, planning/report-writer | Sonnet |
| 디자인 산출물 | design/excel-layout, design/dashboard-template | Sonnet |
| 검증 | common/verify, common/dry-run | Haiku |
| 전달·스케줄 | operations/schedule, operations/notify | Haiku |

직군 스킬은 KW Plugins 17개 빌트인 모델 + 한국화. 메타 커맨드 본체는 어떤 phase가 어떤 스킬을 부르는지 모르고, PLAN.md frontmatter에 선언된 `phases[].skills`를 그대로 spawn한다.

---

## 7. 학습 루프 (Description Tuner 연동)

스킬 트리거 게이트(README §4.6)와 짝을 이루어:
- 일반 프롬프트 처리 → 사용자 거절 → `evals/<skill>/labels.jsonl`에 "여기선 스킬 필요" 라벨
- 스킬 로드 처리 → 산출물 일반 프롬프트와 동등 → "여기선 스킬 불필요" 라벨
- standard+에서 Description Tuner가 다음 정확도 개선에 사용 (생성 시점 1회 한정 정책 유지)

---

## 8. 미해결 결정 (v1.0 이전 확정 필요)

1. **state.md 포맷**: GSD 마크다운 vs Hermes JSON 스냅샷 — 사용자 가독성 우선이면 마크다운, resume 안전성 우선이면 JSON
2. **CommandDef 단일 레지스트리 위치**: TypeScript 소스 vs JSON 매니페스트 — TS면 타입 안전, JSON이면 marketplace 직접 노출
3. **/autopilot 1회 한정 추적**: standard 프로필에서 "이번 세션 1회"를 어디에 기록? state.md? user-profile.md?
4. **사내 Postgres 동기화** (ADR-002): handoffs/ 와 state.md를 동기화 대상으로 둘지

---

## 9. 출처 파일 (재참조)

| 패턴 | 원본 |
|---|---|
| 아티팩트 상태 머신 | `references/plugins/get-shit-done-main/agents/gsd-planner.md`, `commands/gsd/plan-phase.md` |
| HARD-GATE XML | `references/plugins/superpowers-main/skills/brainstorming/SKILL.md`, `test-driven-development/SKILL.md` |
| 메모리 훅 호출 위치 | `references/plugins/hermes-agent/agent/memory_provider.py:153-226`, `memory_manager.py:392-523` |
| auto-trigger description | `references/plugins/knowledge-work-plugins-main/sales/skills/call-prep/SKILL.md` |
| alwaysApply baseline | `references/plugins/andrej-karpathy-skills-main/.cursor/rules/karpathy-guidelines.mdc` |
| CommandDef 레지스트리 | `references/plugins/hermes-agent/hermes_cli/commands.py` |
| content-match resume | `references/plugins/hermes-agent/batch_runner.py:527-1291` |
| override 메커니즘 | `references/plugins/get-shit-done-main/agents/gsd-verifier.md` |
| 2단계 리뷰 | `references/plugins/superpowers-main/skills/subagent-driven-development/SKILL.md` |

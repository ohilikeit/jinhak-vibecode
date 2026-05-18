# 진학사 사내 비개발자 업무 자동화 하네스 설계 문서 v0.3

> v0.2 대비 변경 요약은 §22 참조. 핵심 업데이트:
> (1) Agent Skills 공식 명세 준수 (frontmatter 표준화),
> (2) Progressive Disclosure 3계층을 설계 원칙으로 명문화,
> (3) `.agents/skills/` 컨벤션 채택으로 cross-client 자동 발견 지원,
> (4) 카탈로그 비대화 대응 (직무·본부별 필터링),
> (5) Description 최적화 프로세스 (트리거 평가 + train/validation 분할) 도입,
> (6) 본부별 Gotchas 패턴 표준화,
> (7) Eval-driven iteration (with/without 비교) 도입,
> (8) 컨텍스트 압축 보호, 신뢰 게이팅, 모델 주도 + 사용자 명시 이중 활성화 등 운영 규칙 추가.

---

## 0. 문서 목적

이 문서는 진학사 사내 비개발자(기획자, 운영자, 영업, HR, 재무, 디자이너 등)가 본인의 반복 업무를 AI를 활용해 안정적으로 자동화할 수 있도록 돕는 **사내 전용 하네스 도구**의 설계서이다.

사내 비개발자들이 사용하는 AI 도구가 Claude Code, Cursor, Codex, Antigravity, Copilot 등으로 고르게 분포되어 있다는 환경 제약 때문에, 이 도구는 **Agent Skills 공식 표준**(https://agentskills.io)을 본체로 한다. 표준 자체는 Anthropic이 개발하고 다수 클라이언트가 채택한 오픈 포맷이다.

핵심 목표:

1. 비개발자가 큰 업무를 AI가 처리 가능한 단계로 쪼개지 못하는 문제(분해 갭)를 자동으로 해결한다.
2. 각 단계에 회사·본부·팀·개인 컨텍스트를 자동으로 주입한다(결합 갭).
3. 검증된 프롬프트 패턴을 자동 합성하여 결과물 품질을 보장한다(프롬프트 품질 갭).
4. 사내 보안 정책·도메인 지식·본부 방향성을 디폴트로 박아두되, 팀·개인 단위로 override 가능하게 한다.
5. 비개발자가 자신의 자동화를 스킬로 추출하고, 잘 만들어진 개인 스킬이 팀·본부 자산으로 승격되도록 한다.
6. 기획자 1본부 1팀 MVP로 시작하되, 신규 본부·팀·직무 추가 시 **코드 변경 없이** 수평 확장 가능한 구조로 설계한다.
7. 비개발자가 의식하지 않아도 산출물의 퀄리티가 자동으로 올라가는 **백그라운드 quality booster**로 작동한다.
8. Agent Skills 표준 준수를 통해 Claude Code, Cursor, Codex, Copilot, Antigravity 등 어떤 호환 클라이언트에서도 동일하게 동작한다.

---

## 1. 제품 정의

### 1.1 한 문장 정의

**진학사 비개발자가 평소 말로 업무를 설명하면, 하네스가 뒤에서 업무 분해 + 사내 컨텍스트 결합 + 검증된 프롬프트 합성 + 자동 품질 검사를 합쳐 결과물 퀄리티를 자동으로 올려주는, Agent Skills 표준 기반의 사내 자동화 도구.**

### 1.2 제품의 본질 — 세 가지 갭

비개발자가 바이브코딩으로 자동화하려 할 때 막히는 지점은 단순히 "코드를 모른다"가 아니다. 세 가지 갭이 동시에 존재한다.

| 갭 | 비개발자가 못 하는 일 | 하네스가 자동으로 메우는 방식 |
|---|---|---|
| **G1. 분해 갭** | 큰 업무를 AI가 단번에 처리 가능한 단계로 쪼개기 | 업무 유형별 표준 분해 템플릿을 자동 적용 |
| **G2. 결합 갭** | 각 단계에 회사·본부·도메인 지식을 끼워넣기 | 계층화된 컨텍스트(L0~L3)를 단계별로 자동 주입 |
| **G3. 프롬프트 품질 갭** | 잘 동작하는 프롬프트를 짤 감 | 단계별로 검증된 프롬프트 패턴을 자동 합성 |

이 도구의 본질은 "AI가 코딩해주는 것"이 아니라, **세 가지 갭을 비개발자가 의식하지 않게 자동으로 메우는 것**이다.

### 1.3 Agent Skills 표준이 본체인 이유

사내 비개발자들이 쓰는 AI 도구가 고르게 분포되어 있다. 따라서 Claude Code plugin이나 Cursor extension처럼 특정 플랫폼에 종속된 형태로 만들면 절반 이상의 사용자가 배제된다.

**Agent Skills 표준**은 Anthropic이 개발해 오픈 표준으로 공개한 형식으로, Claude, Claude Code, OpenAI Codex, GitHub Copilot, VS Code, Cursor, Gemini CLI, OpenCode, Kiro 등 20개 이상의 에이전트 클라이언트가 채택했다. 본체는 이 표준을 그대로 따른다. 각 AI 도구는 표준 자산을 "어디에서 로드하는지"만 알려주는 얇은 install 가이드로 지원된다.

---

## 2. 핵심 설계 원칙

### 2.1 Agent Skills 표준 100% 준수

본체 자산 구조:

```text
{skill-name}/
├─ SKILL.md          # 필수. YAML frontmatter + Markdown 본문
├─ scripts/          # 선택. 실행 가능한 코드
├─ references/       # 선택. 상세 참조 문서
└─ assets/           # 선택. 템플릿, 정적 리소스
```

`SKILL.md` frontmatter 필수 필드는 `name`과 `description` 두 개뿐. 우리 하네스의 커스텀 메타데이터(scope, division, quality_gates 등)는 모두 표준 `metadata:` 필드 아래로 들어간다(§9.1).

### 2.2 Progressive Disclosure (3계층 로딩) 설계 원칙

표준은 컨텍스트 비용을 최소화하기 위해 3계층 점진적 공개를 강제한다. 우리 하네스도 이를 그대로 따른다.

| 계층 | 로드 대상 | 시점 | 토큰 비용 |
|------|-----------|------|-----------|
| 1. 카탈로그 | 모든 스킬의 `name` + `description` | 세션 시작 | 스킬당 ~50-100 토큰 |
| 2. 지침 | 활성화된 스킬의 `SKILL.md` 본문 전체 | 매칭 시점 | 권장 5,000 토큰 이하 |
| 3. 리소스 | `scripts/`, `references/`, `assets/` | 지침이 참조할 때 | 가변 |

**우리 하네스의 제약:**

- 모든 SKILL.md 본문은 **500줄 / 5,000 토큰 이하** (스펙 권장 한도).
- 상세한 도메인 자료는 `references/{토픽}.md`로 분리하고, SKILL.md에서 *언제 그 파일을 읽어야 할지* 명시한다.
- 카탈로그 비대화를 막기 위해 **직무·본부별 카탈로그 필터링**을 운영한다(§3.3).

### 2.3 도구 중립성과 `.agents/skills/` 컨벤션

스킬 발견 경로는 사실상의 cross-client 컨벤션 `.agents/skills/`를 따른다. 우리 하네스의 본체는 사내 표준 경로에 두되, **`.agents/skills/`로 미러링/심볼릭 링크**하여 모든 호환 클라이언트가 자동 발견할 수 있게 한다(§3.2).

### 2.4 계층화된 디폴트 + Override

회사 보안, 본부 방향성, 도메인 지식은 디폴트로 박아두되, 팀·개인이 override 가능하게 한다. L0(전사) 보안·컴플라이언스만 잠금, 나머지는 모두 override 가능(§6).

### 2.5 Quality는 옵션이 아니라 기본 레이어

PII 마스킹, 숫자 출처 대조, 톤 검사, 발송 전 승인은 사용자가 의식하지 않아도 모든 워크플로에 자동으로 끼는 **booster layer**로 둔다(§7). 사용자가 만든 개인 스킬도 자동으로 이 보호를 상속받는다.

### 2.6 초안 우선, 자동 실행은 후순위

```text
1) 초안 생성  →  2) 사용자 검토  →  3) 승인 후 저장
              →  4) 승인 후 발송  →  5) 충분히 검증된 뒤 일정 자동 실행
```

### 2.7 Bottom-up 스킬 자산화

비개발자가 만든 자동화가 **개인(L3) → 팀(L2) → 본부(L1) → 전사 core**로 자연스럽게 승격되는 경로를 둔다(§8.3).

### 2.8 Eval 기반 반복 개선

모든 core-skill과 promoted-skill은 `evals/evals.json`을 가지며, **with_skill vs without_skill 비교**로 실제 가치를 정량 측정한다(§9.4, §18).

### 2.9 수평 확장 가능한 구조

신규 본부 추가 = 폴더 6개 파일 채우기. 신규 직무 추가 = workflow-template 몇 개 추가. 본체 코드 변경 없음(§15).

### 2.10 사내 환경 우선

외부 SaaS 연동보다 사내 시스템과 사내 보안 정책 준수가 우선이다.

---

## 3. 전체 아키텍처

### 3.1 디렉토리 구조

```text
jinhak-harness/
├─ context-stack/                      # 계층화 컨텍스트 (§6)
│  ├─ L0_org/                          # 전사 (정보보안팀 잠금)
│  ├─ L1_division/
│  │  ├─ jinhakapply/
│  │  ├─ jinhakdotcom/
│  │  ├─ catch/
│  │  ├─ blacklabel/
│  │  └─ sales/
│  ├─ L2_team/
│  └─ L3_user/
│
├─ skills/                             # Agent Skills 표준 자산 (3.2 매핑)
│  ├─ core/                            # 본체 스킬 (도구 중립)
│  │  ├─ task-decomposer/              # G1
│  │  ├─ context-injector/             # G2
│  │  ├─ prompt-composer/              # G3
│  │  ├─ memory-retriever/
│  │  ├─ skill-creator/
│  │  ├─ generalization-checker/
│  │  └─ debug-assistant/
│  ├─ quality-boosters/                # 자동 품질 게이트 (§7)
│  │  ├─ pii-guard/
│  │  ├─ source-anchor/
│  │  ├─ approval-gate/
│  │  ├─ schema-drift-detector/
│  │  ├─ tone-linter/
│  │  └─ hardcode-sniper/
│  ├─ workflows/                       # 업무 유형별 (§4.3)
│  │  ├─ pm-prd-drafting/
│  │  ├─ pm-competitor-research/
│  │  ├─ pm-user-interview-synthesis/
│  │  ├─ pm-weekly-status/
│  │  ├─ pm-data-analysis-brief/
│  │  ├─ pm-policy-monitoring/
│  │  └─ pm-meeting-summary/
│  ├─ promoted/                        # 팀·본부 승격 스킬
│  │  ├─ L2_team/{division}/{team}/
│  │  └─ L1_division/{division}/
│  └─ user/                            # 개인 스킬
│     └─ {user-id}/
│
├─ division-overlays/                  # 본부별 workflow 차이
│  └─ {division}/{workflow}.override.yaml
│
├─ adapters/                           # AI 도구별 install (얇음)
│  ├─ claude-code/install.md
│  ├─ cursor/install.md
│  ├─ codex/install.md
│  ├─ copilot/install.md
│  ├─ antigravity/install.md
│  └─ gemini-cli/install.md
│
├─ automations/                        # 사용자 자동화 프로젝트
│  └─ {project-id}/
│
├─ evals/                              # 시스템 레벨 평가 (§9.4)
│  ├─ harness-benchmarks/
│  └─ skill-trigger-eval/
│
└─ registry/
   ├─ skills.yaml                      # 전체 카탈로그
   ├─ workflows.yaml
   ├─ catalog-filters/                 # 직무·본부별 필터 (§3.3)
   └─ promotion-log.yaml
```

### 3.2 `.agents/skills/` 발견 경로 매핑

Agent Skills 표준은 클라이언트가 다음 경로를 스캔하도록 권장한다:

```text
사용자 수준:    ~/.agents/skills/           ~/.{client}/skills/
프로젝트 수준:  <repo>/.agents/skills/      <repo>/.{client}/skills/
```

우리 하네스 본체는 **사내 Bitbucket Cloud 단일 repository**(D4)에서 관리되며, 비개발자는 Bitbucket UI에 절대 접근하지 않는다(D4-b). 사용자 PC에는 **install 스크립트**가 본체를 적절한 도구 표준 경로에 배포한다:

```text
사용자 환경                    install 스크립트가 하는 일
─────────────────────         ────────────────────────────────
Claude Code 사용자       →    ~/.claude/skills/      에 본체 배포
Cursor 사용자            →    ~/.cursor/rules/       에 본체 배포
표준 호환 사용자         →    ~/.agents/skills/      에 본체 배포

user-skill 생성 시       →    같은 경로 안에 사용자가 직접 추가
                              (Bitbucket과 동기화 안 됨, 로컬 전용)
```

본체 자산이 사용자 PC에 배포된 후에는 다음 두 가지 방식으로 발견을 보장한다.

**방식 A (개인 컴퓨터 설치):**
```text
~/.agents/skills/                 # 표준 경로
├─ task-decomposer    → symlink → /opt/jinhak-harness/skills/core/task-decomposer
├─ pii-guard          → symlink → /opt/jinhak-harness/skills/quality-boosters/pii-guard
└─ ...
```

**방식 B (프로젝트 단위):**
```text
<project>/.agents/skills/         # 프로젝트 클론 시 함께 이동
├─ {필요한 스킬만 선택 설치}
```

이 구조로 Claude Code, Cursor, Codex, Copilot 모두 **추가 adapter 작성 없이** 우리 스킬을 자동 발견한다.

### 3.3 카탈로그 필터링 (비대화 대응)

스킬 수가 늘면 카탈로그가 매 세션 5,000~10,000 토큰을 점유한다. 사용자가 자신과 무관한 스킬까지 카탈로그에 받을 필요는 없다.

```yaml
# registry/catalog-filters/jinhakapply-pm.yaml
profile_id: jinhakapply-pm
include:
  - skills/core/*                       # 모든 core
  - skills/quality-boosters/*           # 모든 booster (default-on)
  - skills/workflows/pm-*               # 기획자 워크플로만
  - skills/promoted/L1_division/jinhakapply/*
  - skills/promoted/L2_team/jinhakapply/*
  - skills/user/{current-user}/*
exclude:
  - skills/workflows/sales-*            # 영업 워크플로 제외
  - skills/workflows/hr-*               # HR 워크플로 제외
```

사용자가 처음 하네스를 설치할 때 본부·팀·직무에 맞는 프로필이 자동 적용된다. `.agents/skills/`에는 필터를 통과한 스킬만 심볼릭 링크된다.

---

## 4. 핵심 개념 모델

### 4.1 Context Stack (계층 컨텍스트)

진학사 본부 구조를 그대로 반영한 4단 계층. 머지 순서: **L3 → L2 → L1 → L0** (개인이 가장 우선, 전사 보안은 잠금). 세부 §6 참조.

### 4.2 Core Skill (Agent Skills 표준)

도구 중립 Agent Skills 표준을 따르는 핵심 능력.

```text
skills/core/task-decomposer/
├─ SKILL.md                         # 표준 frontmatter + 본문 (500줄 이하)
├─ references/                      # 상세 자료
│  ├─ decomposition-patterns.md
│  └─ pattern-selection-rules.md
├─ scripts/decompose.ts
├─ assets/                          # 템플릿
└─ evals/                           # eval 테스트 케이스 (§9.4)
   ├─ evals.json
   └─ files/
```

**prompt-composer 설계 원칙 (Best practices에서 가져옴):**

- **메뉴가 아니라 기본값을 제공**: 단계별 프롬프트에서 사용자에게 여러 옵션을 던지지 않는다. 명확한 기본값 + 명시적 탈출구 형식.
- **선언보다 절차를 선호**: "이 작업은 X를 해야 한다"보다 "이 부류 작업은 어떻게 접근하는가"를 가르친다.
- **이유(why)를 설명**: 경직된 명령보다 추론 기반 지시("Y는 Z를 일으키므로 X 하라")가 더 잘 작동.

### 4.3 Workflow Skill (업무 유형별)

```text
skills/workflows/pm-weekly-status/
├─ SKILL.md
├─ references/
│  ├─ stage-1-data-collection.md
│  ├─ stage-2-anomaly-check.md
│  ├─ stage-3-kpi-computation.md
│  ├─ stage-4-hypothesis.md
│  └─ stage-5-exec-summary.md
├─ assets/
│  ├─ report-template.md
│  └─ exec-summary-template.md
├─ quality-gates.yaml
└─ evals/
   ├─ evals.json
   └─ files/sample-weekly-data.csv
```

SKILL.md 본문은 5단계 워크플로 개요와 "각 단계에서 어느 references/{stage}.md를 로드해야 하는지"를 명시한다. 단계별 상세는 references에 분리(progressive disclosure).

### 4.4 Division Overlay

같은 workflow를 본부별로 다르게 쓰기 위한 override 레이어.

```yaml
# division-overlays/jinhakapply/pm-weekly-status.override.yaml
extends: skills/workflows/pm-weekly-status
stage_overrides:
  3-kpi-computation:
    add_kpis: [접수율, 결제완료율, 환불율, 가나다군별_지원자수]
    prompt_additions: |
      가군/나군/다군은 정시 기준으로만 표시한다.
      수시 차수와 혼동하지 않도록 명시한다.
  5-exec-summary:
    audience: 진학어플라이 본부장
    tone: 임원 보고용 1페이지
```

### 4.5 Quality Booster (Agent Skill 형식)

각 booster는 Agent Skills 표준 스킬로 구현되어 다른 스킬에서 재사용 가능(§7).

### 4.6 User Skill / Promoted Skill

유저가 자신의 자동화를 스킬로 저장한 결과물. 검증을 통과하면 팀(L2) → 본부(L1) → 전사(core)로 승격(§8.3).

### 4.7 Automation Project

```text
automations/2026-marketing-weekly-report/
├─ automation.yaml
├─ README.md
├─ intake/
├─ references/
├─ sources/
├─ outputs/
├─ runs/
└─ generated-skill/
```

---

## 5. 사용자 경험 흐름

### 5.1 두 가지 활성화 경로 (표준 §4)

표준은 두 가지 스킬 활성화 방식을 정의한다. 둘 다 지원한다.

**모델 주도 (기본):**

```text
사용자: "이번 주 진학어플라이 가군 접수 현황 보고서 만들어줘"
  → 에이전트가 카탈로그에서 description 매칭
  → pm-weekly-status 스킬 자동 활성화
  → SKILL.md 본문 전체 로드
  → 워크플로 실행
```

**사용자 명시 (슬래시 명령):**

```text
사용자: "/jihwan-weekly-gagun-report 실행"
  → 하네스가 직접 해당 스킬 활성화
  → 모델의 description 매칭 거치지 않음
```

description 매칭에 의존하면 트리거 누락 위험이 있고, 명시 활성화는 사용자가 스킬 이름을 알아야 한다. 두 경로를 함께 두어 신뢰성과 유연성을 확보한다.

### 5.2 한 줄 요청에서 산출물까지

사용자가 의식하는 행동은 **첫 줄 한 마디뿐**이다.

```text
사용자: "이번 주 진학어플라이 가군 접수 현황 보고서 만들어줘"
                          │
                          ▼
[1] task-decomposer (description 매칭으로 활성화)
    workflow pm-weekly-status 매칭
    표준 5단계 분해:
      ① 데이터 수집  ② 이상치 점검  ③ KPI 산출
      ④ 원인 가설   ⑤ 임원용 요약
                          │
                          ▼
[2] context-injector (L3 → L2 → L1 → L0 머지)
    L0:  외부 공유 금지 채널, PII 패턴
    L1:  진학어플라이 KPI 정의, 가군 용어, gotchas.md
    L1+: division-overlays/jinhakapply/pm-weekly-status.override.yaml
    L2:  가군기획팀 톤
    L3:  보고서 1페이지 임원용 톤
                          │
                          ▼
[3] prompt-composer
    각 단계 ①~⑤에 머지된 컨텍스트 + 검증된 프롬프트 패턴 주입
    "원인 추측 금지, 근거 없으면 '확인 필요'로 표시" 등 가드 자동 삽입
                          │
                          ▼
[4] quality-booster (§7)
    PII Guard / Source Anchor / Tone Linter / Approval Gate
                          │
                          ▼
[5] 초안 + 검증 리포트 + 승인 게이트
```

### 5.3 첫 사용 흐름

```text
사용자: 매주 작성하는 가군 접수 현황 보고서를 자동화하고 싶어.

도구:
  1) 본부와 팀을 확인합니다 → 진학어플라이 / 가군기획팀
  2) 이 업무 유형은 'pm-weekly-status'로 보입니다
  3) 본부 KPI 정의와 톤가이드 + gotchas를 자동으로 적용합니다
  4) 이전 보고서가 있다면 references/에 넣어주세요
  5) 이번 주 데이터 위치를 알려주세요
```

본부 KPI나 톤은 묻지 않는다(L1에 이미 있음).

### 5.4 도메인 정보 부족 시

L0~L2에 답이 없는 질문만 사용자에게 묻는다.

```text
다음 정보가 L1/L2에 정의되어 있지 않습니다.

1. 가군 접수율 임계치(빨간색 기준)는 몇 %입니까?
2. 환불율을 어디서 가져오나요?

→ 답변하시면 가군기획팀 컨텍스트(L2)에 저장하여 다음에는 묻지 않겠습니다.
```

도메인 지식은 **묻고 답한 결과가 자동으로 적절한 계층에 축적**된다.

### 5.5 스킬화 (3회 성공 후 자동 제안)

§9 참조.

---

## 6. 계층화 컨텍스트 시스템

### 6.1 구조

```text
context-stack/
├─ L0_org/                              # 전사 (정보보안팀 잠금)
│  ├─ security-policy.md
│  ├─ compliance-rules.yaml             # PII 패턴, 발송 금지 채널
│  ├─ company-glossary.md
│  ├─ writing-house-style.md
│  └─ tool-policy.yaml
│
├─ L1_division/
│  ├─ jinhakapply/
│  │  ├─ domain-terms.md
│  │  ├─ kpis.yaml
│  │  ├─ stakeholders.md
│  │  ├─ data-sources.yaml
│  │  ├─ tone-guide.md
│  │  ├─ gotchas.md                     # 🆕 v0.3: 본부별 함정 모음 (§6.5)
│  │  └─ workflow-overrides/
│  ├─ jinhakdotcom/
│  ├─ catch/
│  ├─ blacklabel/
│  └─ sales/
│
├─ L2_team/
│  └─ {division}/{team}/
│     ├─ workflows-in-use.yaml
│     ├─ tone-overrides.md
│     ├─ rejected-defaults.md
│     ├─ gotchas.md                     # 🆕 v0.3: 팀별 함정
│     └─ team-glossary.md
│
└─ L3_user/
   └─ {user-id}/
      ├─ profile.md
      ├─ preferences.md
      ├─ personal-glossary.md
      └─ memory/
```

### 6.2 머지 규칙

```text
1) L3 → L2 → L1 → L0 순서로 머지
2) 같은 키 충돌 시: 하위 계층 값이 우선
3) 예외: L0의 다음 항목은 잠금 (override 불가)
     - security-policy.md
     - compliance-rules.yaml
4) 잠금 항목을 사용자가 override 시도하면 차단 + 정보보안팀 자동 통지
```

### 6.3 컨텍스트 주입 정책

context-injector는 단계별로 필요한 부분만 선택 주입한다. 정책은 각 workflow-template의 `quality-gates.yaml`에 명시.

```text
① 데이터 수집:   L1 data-sources, L0 tool-policy, L1 gotchas (스키마 관련)
② 이상치 점검:   L1 kpis, L1 gotchas
③ KPI 산출:     L1 kpis, L1+division-overlay
④ 원인 가설:     L1 domain-terms, L2 team-glossary, L1 gotchas (도메인)
⑤ 임원용 요약:   L1 stakeholders+tone-guide, L2 tone-overrides,
                 L3 preferences, L0 writing-house-style, L0 compliance
```

### 6.4 거버넌스

| 계층 | 수정 권한 | 승인 절차 |
|------|-----------|-----------|
| L0   | 정보보안팀, IT 거버넌스 | 별도 위원회 검토 |
| L1   | 본부 PO, 본부장 | 본부 내 검토 |
| L2   | 팀장 | 팀 내 검토 |
| L3   | 본인 | 없음 |

각 계층 변경은 `context-stack/{level}/CHANGELOG.md`에 자동 기록.

### 6.5 Gotchas 패턴 (Best practices §효과적인 지시)

표준 Best practices가 "가장 가치 있는 콘텐츠는 gotchas — 합리적 가정에 반하는 환경별 사실"이라고 명시한다. L1/L2의 `gotchas.md`가 핵심 도메인 자산이다.

**예시 (L1 jinhakapply/gotchas.md):**

```markdown
## Gotchas (진학어플라이)

- 가군/나군/다군은 정시 기준. 수시 차수(수시1/2/3)와 절대 혼동 금지.
  수시 차수는 "수시 N차"로 명시한다.
- 접수율 컬럼이 시즌별로 이름 변경됨: 2025_접수율 → 2026_접수율.
  매년 1월 자동화 재실행 전 컬럼명 확인 필요.
- "이번주" 시트는 일요일 자정에 자동 롤오버. 월요일 새벽 실행 시 빈 데이터 가능.
- 환불 데이터는 결제 시점 기준이 아니라 환불 처리 완료 시점 기준으로 집계됨.
  당주 결제·당주 환불은 양쪽에 모두 잡힌다.
- 본부장 보고에서 "지원자 수" 단어는 "접수 완료 건수"로 바꿔 표기.
  내부 정의 차이 때문에 임원 보고에서는 항상 후자로 통일.
```

**왜 gotchas가 핵심인가:**

LLM은 일반 도메인 지식은 알지만 회사 내부의 비대칭적 정의, 시즌성, 시스템 특이성은 모른다. gotchas는 "알려주지 않으면 반드시 틀리는 것"만 모은다. 모든 단계 프롬프트에 자동 주입된다.

### 6.6 개인 메모리 (자동 학습)

```yaml
# context-stack/L3_user/{user}/memory/learned-preferences.yaml
- id: prefer-table-over-bullet
  type: style
  confidence: high
  evidence_count: 7
  last_observed: 2026-05-10
  rule: "본 사용자는 5개 이상 항목 나열 시 표를 선호함"
```

confidence high는 자동 반영, medium 이하는 사용자 확인 후 반영.

---

## 7. Quality Auto-Boost 시스템

### 7.1 Booster 목록 (v1)

| Booster | 자동 작동 시점 | 막아주는 사고 | 우선순위 |
|---------|----------------|--------------|---------|
| **PII Guard** | 모든 단계 입출력 | 학생 정보 외부 노출 | 🔴 v1 필수 |
| **Source Anchor** | 숫자 생성 직후 | LLM 숫자 추측 | 🔴 v1 필수 |
| **Approval Gate** | 외부 발송 직전 | 자동 발송 사고 | 🔴 v1 필수 |
| **Schema Drift Detector** | 입력 데이터 로드 | 컬럼명 변경 미탐지 | 🟡 v1.5 |
| **Tone Linter** | 최종 산출물 직전 | 본부 톤가이드 위반 | 🟡 v1.5 |
| **Hardcode Sniper** | 스킬 저장 시 | 다음 주 깨지는 자동화 | 🟡 v1.5 |
| **Format Consistency Checker** | 최종 산출물 직전 | 형식 불일치 | 🟢 v2 |
| **Citation Validator** | 외부 자료 인용 | 가짜 인용·URL | 🟢 v2 |

### 7.2 Booster는 표준 Agent Skill

각 booster는 Agent Skills 표준 스킬로 구현된다.

```text
skills/quality-boosters/pii-guard/
├─ SKILL.md
├─ references/
│  └─ pii-patterns.md                # L0 compliance-rules.yaml에서 패턴 동기화
├─ scripts/scan.ts
└─ evals/
   └─ evals.json
```

표준 스킬이므로 사용자가 만든 user-skill에서 **재사용 가능**. 사용자 스킬도 자동으로 PII 보호 상속.

### 7.3 작동 방식

각 워크플로의 `quality-gates.yaml`에 어느 booster를 어느 단계에서 호출할지 명시.

```yaml
# skills/workflows/pm-weekly-status/quality-gates.yaml
default_boosters:
  - pii-guard
  - source-anchor
  - approval-gate
stage_specific:
  5-exec-summary:
    - tone-linter
    - format-consistency-checker
```

### 7.4 통과 시 조용히, 실패 시에만 알림

booster는 통과하면 조용히 통과한다.

```text
⚠️ PII Guard: 산출물에 학번으로 보이는 9자리 숫자 3건 발견
  → 마스킹 처리하시겠습니까? [예/아니오/확인]

⚠️ Source Anchor: '전월 대비 +12%' 수치의 출처를 찾지 못함
  → 자동으로 '확인 필요'로 표시했습니다.
```

---

## 8. 스킬 시스템과 승격 경로

### 8.1 스킬 계층

```text
Level 1: Primitive       단일 작업 (CSV 파싱, 표 추론)
Level 2: Composite       primitive 조합 (보고서 초안)
Level 3: Workflow        업무 흐름 전체 (주간 보고서 자동화)
Level 4: Role Pack       직군 패키지 (기획자 팩)
Level 5: User Custom     사용자 자동화
```

### 8.2 스킬 스코프

```yaml
scope_options:
  personal:    개인 (L3, skills/user/{user}/)
  team:        팀 공유 (L2, skills/promoted/L2_team/...)
  division:    본부 공유 (L1, skills/promoted/L1_division/...)
  org:         전사 (core, skills/core/...)
```

### 8.3 Bottom-up 승격 경로

```text
[Step 1] 유저가 워크플로 3회 이상 성공 실행
            ↓
[Step 2] skill-creator 자동 제안
            ↓
[Step 3] 저장 시 자동 수행
         - generalization-checker 실행 (§9.2)
         - 본부 공통 vs 개인 부분 자동 분리 제안
         - SKILL.md 자동 생성 (Agent Skills 표준)
         - description 트리거 평가 (§9.3)
         - evals/evals.json 초안 자동 생성 (§9.4)
            ↓
[Step 4] 승격 경로
         L3 personal → L2 team → L1 division → core
         각 단계에서:
         - reviewer 1명 승인
         - generalization-checker 통과
         - description 트리거율 ≥0.7 (트리거되어야 함 쿼리에서)
         - eval delta: with_skill이 without_skill 대비 +20%p 이상
         - PII Guard 통과
```

### 8.4 스킬 레지스트리

```yaml
# registry/skills.yaml
- id: pm-weekly-status-jinhakapply
  name: 진학어플라이 주간 보고
  type: workflow
  scope: division
  division: jinhakapply
  workflow_pack: pm-weekly-status
  reusability_level: 4
  required_context:
    - L1_division/jinhakapply
    - L0_org
  quality_gates: [pii-guard, source-anchor, tone-linter]
  trigger_eval:
    train_pass_rate: 0.90
    validation_pass_rate: 0.85
    last_evaluated: 2026-05-15
  output_eval:
    with_skill_pass_rate: 0.88
    without_skill_pass_rate: 0.35
    delta: 0.53
    token_overhead: +1700
  last_validated: 2026-05-15
  risk_level: medium
  promoted_from: L3_user/jihwan/weekly-gagun-report
```

---

## 9. Skill Creator & Generalization Checker & Eval

### 9.1 SKILL.md 표준 형식 (v0.3에서 정정)

표준 frontmatter는 최상위에 6개 필드만 허용한다. 우리 커스텀 메타데이터는 `metadata:` 아래로.

```markdown
---
name: jihwan-weekly-gagun-report
description: 진학어플라이 가군기획팀 주간 보고서를 생성한다. 사용자가 "주간 보고",
  "가군 현황", "가군 접수 보고", "마케팅 주간 업데이트" 등을 요청할 때 사용한다.
  명시적으로 "보고서"라고 말하지 않더라도 가군 KPI 관련 주간 요약이 필요한 모든
  상황에서 활성화한다. 데이터 소스는 사내 가군현황 시트, 산출물은 1페이지 임원용 문서.
license: Internal-Jinhak
compatibility: Requires jinhak-harness >=0.3. Pulls L1_division/jinhakapply context.
metadata:
  scope: personal
  division: jinhakapply
  team: gagun-team
  inherits_quality_gates: pii-guard source-anchor approval-gate tone-linter
  workflow_pack: pm-weekly-status
  promoted_from: null
  reusability_level: "2"
  last_validated: "2026-05-15"
allowed-tools: Read Bash(jq:*) Skill(pii-guard) Skill(source-anchor)
---

# 진학어플라이 가군 주간 보고

## 언제 사용하는가
가군 접수 현황 주간 보고 요청 시. 화·금 정기 또는 본부장 ad-hoc 요청 모두.

## 필요 컨텍스트
- L1_division/jinhakapply (KPI 정의, gotchas)
- L2_team/jinhakapply/gagun-team (톤 override)
- L3_user/{me} (산출물 선호)

## 워크플로
1. automation.yaml 로드 후 컨텍스트 스택 머지
2. 가군현황 시트에서 데이터 수집 — 컬럼명 변경은 references/data-schema.md 참조
3. pm-weekly-status 5단계 분해 실행
4. 품질 게이트 통과
5. 초안 저장 후 승인 게이트

## Gotchas (이 스킬 고유)
- "가군"이라는 용어가 모호하면 항상 "정시 가군"으로 가정. 수시 의심 시 사용자 확인.
- 시즌 롤오버 직후(매년 1월 첫 주) 컬럼명 변경 가능 → schema-drift-detector가 알릴 것.

## 안전 규칙
- 자동 발송 금지 (승인 필수)
- 학번 패턴 자동 마스킹 (pii-guard 자동 호출)
- 이전 보고서 덮어쓰기 금지

## 참조 자료
- 데이터 스키마 변경 시: references/data-schema.md
- 이전 보고서 형식: references/previous-formats.md
- 본부장 톤 가이드: L1_division/jinhakapply/tone-guide.md
```

**표준 frontmatter 제약:**

| 필드 | 제약 |
|------|------|
| `name` | 최대 64자, 소문자+숫자+하이픈만, 부모 디렉토리명과 일치 |
| `description` | 최대 1024자, 무엇을+언제 모두 명시 |
| `license` | 선택, 짧게 |
| `compatibility` | 선택, 최대 500자 |
| `metadata` | 선택, 임의 key-value (우리 커스텀 필드는 모두 여기) |
| `allowed-tools` | 선택, 실험적 |

### 9.2 Skill Creator (자동화 → 표준 SKILL.md)

입력:
- `automation.yaml`, `runbook.md`, `scripts/`, `templates/`
- 최근 실행 로그 3회 이상
- 사용된 컨텍스트 스택 스냅샷

출력 (Agent Skills 표준 구조):
```text
skills/user/{user}/{skill-name}/
├─ SKILL.md                    # 표준 frontmatter + 500줄 이하 본문
├─ references/                 # 상세 자료 분리
├─ scripts/                    # 재사용 가능 헬퍼
├─ assets/                     # 템플릿
├─ evals/                      # 자동 생성된 테스트 케이스
│  ├─ evals.json
│  └─ files/
└─ quality-gates.yaml
```

### 9.3 Description 최적화 (트리거 평가)

표준 docs(Optimizing descriptions)의 5단계 루프를 자동화한다.

```text
[1] skill-creator가 description 초안 생성
       ↓
[2] 트리거 평가 쿼리 자동 생성 (~20개)
    - should_trigger=true 8~10개 (다양한 표현)
    - should_trigger=false 8~10개 (근접 오판 케이스)
       ↓
[3] train/validation 분할 (60/40)
       ↓
[4] 각 쿼리를 3회 실행, 트리거율 측정
    - train 결과로 description 수정
    - validation으로 일반화 검증
       ↓
[5] 5회 반복 후 validation 통과율 기준 베스트 선택
       ↓
[6] 임계값 (승격 게이트):
    - L3 → L2 승격: validation 통과율 ≥ 0.80
    - L1 승격: ≥ 0.85
    - core 승격: ≥ 0.90
```

**Description 작성 원칙 (Best practices):**

- **명령형 어법**: "~한다"가 아니라 "~할 때 사용하라"
- **사용자 의도 중심**: 내부 메커니즘이 아닌 사용자 목표
- **다소 적극적으로**: 사용자가 도메인 직접 언급 안 해도 매칭되도록
- **간결**: 1024자 한도 내, 보통 몇 문장 ~ 짧은 단락

### 9.4 Generalization Checker (3단계 알고리즘)

**Step 1: 정적 분석 (결정적 규칙, LLM 미사용)**

```text
- 정규식·AST 분석으로 하드코딩 패턴 탐지
- 파일명, 날짜, 사람 이름, 절대 경로, 특정 컬럼 순서 의존
```

**Step 2: 동적 검증 (eval-driven)**

표준 evaluating-skills 패턴을 그대로 채택:

```text
skills/user/{user}/{skill}/
└─ evals/
   ├─ evals.json                # 테스트 케이스 정의
   └─ files/                    # 입력 파일 (다양한 시점·형태)

{skill}-workspace/iteration-N/
├─ {eval-id}/
│  ├─ with_skill/   (outputs/, timing.json, grading.json)
│  └─ without_skill/
└─ benchmark.json   # pass_rate, tokens, duration delta
```

각 테스트 케이스를 두 번 실행 (스킬 사용 / 미사용) 후 비교.

**Step 3: LLM judge (품질 채점)**

```text
- 산출물 품질을 이전 결과와 비교 (구조·톤·KPI 일치)
- judge는 본부 톤가이드를 기준으로 채점
- Blind comparison: 어느 출력이 어느 버전인지 모르고 채점
```

### 9.5 자동 리팩터링 제안

```text
"이 스킬이 매 실행마다 다음 헬퍼 로직을 재발명하고 있습니다:
  - CSV에서 결측값 처리
  - 가군 정의 매칭

이 둘을 scripts/ 디렉토리에 번들링하면 매 실행마다 ~1,200토큰을 절약할 수 있습니다.
번들링하시겠습니까?"
```

이 신호는 표준 Best practices가 명시적으로 권장하는 패턴(eval trace 비교 → 반복 작업 추출).

### 9.6 재사용성 등급

```text
Level 0: 일회성
Level 1: 같은 파일 구조에서 재사용 가능
Level 2: 같은 업무 유형에서 재사용 가능
Level 3: 같은 본부의 여러 팀에서 재사용 (L2 → L1 후보)
Level 4: 여러 본부에서 일부 설정 변경 후 재사용 (L1 → core 후보)
Level 5: 전사 공통 (core)
```

---

## 10. Agent Skills 표준 호환 전략

### 10.1 본체는 표준 그 자체

본체 자산은 Agent Skills 공식 명세를 그대로 따른다. 다른 클라이언트와 동일한 발견·활성화 메커니즘 사용.

### 10.2 도구별 install 가이드 (얇음)

```text
adapters/claude-code/install.md       # ~/.claude/skills/ → ~/.agents/skills/ 링크 또는 그대로 ~/.agents/skills/ 사용
adapters/cursor/install.md            # .cursor/rules/ 또는 .cursor/commands/ 매핑
adapters/codex/install.md             # Codex의 스킬 디렉토리
adapters/copilot/install.md           # .github/skills/
adapters/antigravity/install.md
adapters/gemini-cli/install.md
```

각 install.md는 1쪽 이내 (디렉토리 매핑 1줄 + 인증 안내 + 사내 환경변수 설정).

### 10.3 Adapter 두께 한계선 (v0.2에서 도입, v0.3 유지)

```text
규칙 1: adapter는 install.md + 선택적 hook 1~2개 이상이면 안 됨
규칙 2: 본체 변경 시 모든 adapter가 1시간 내에 동기화 가능
규칙 3: 도구별 advanced 기능은 본체가 모르는 채로 add-on
규칙 4: lowest common denominator 회피를 위해 도구별 add-on 권장
```

### 10.4 카탈로그 노출 정책 (Add support §3)

표준은 두 가지 카탈로그 노출 방식을 인정한다.

**방식 A — 시스템 프롬프트 섹션 (기본):**
```xml
<available_skills>
  <skill>
    <name>pm-weekly-status</name>
    <description>...</description>
    <location>~/.agents/skills/pm-weekly-status/SKILL.md</location>
  </skill>
  ...
</available_skills>
```

**방식 B — 전용 활성화 도구:**
- `activate_skill(name)` 도구 등록
- 카탈로그를 도구 description에 임베드
- 권한 게이팅, 사용량 추적, 구조화 wrapping 등 가능

우리 하네스는 방식 A를 default, 방식 B는 사내 advanced 사용자용으로 제공.

### 10.5 컨텍스트 압축 보호 (Add support §5)

활성화된 SKILL.md 본문 + 머지된 컨텍스트 스택은 자동 압축에서 면제한다.

```xml
<skill_content name="pm-weekly-status" protected="true">
  ...
</skill_content>
<context_stack protected="true">
  L0: ...
  L1: ...
</context_stack>
```

`protected="true"` 태그는 컨텍스트 압축 알고리즘이 건너뛰게 한다. 스킬 지침이 압축으로 잘려나가면 산출물 품질이 조용히 저하되므로 절대 잘려서는 안 된다.

### 10.6 활성화 중복 제거

같은 세션에서 같은 스킬을 두 번 활성화 시도 시 재주입 생략. 중복으로 컨텍스트 점유하지 않음.

### 10.7 Exporter

```text
/auto:export claude-code
/auto:export cursor
```

본체 자산을 도구별 형식으로 패키징. 사내 표준 경로가 없는 사용자(예: 개인 노트북) 용 패키지 생성.

---

## 11. 검증·디버깅 레이어

### 11.1 검증 단계 (모든 자동화 공통)

```text
preflight:                실행 전 준비
input validation:         입력 파일·컬럼·권한
context validation:       L0~L3 머지 충돌 감지
dry run:                  외부 발송 없이 실행
output validation:        booster 자동 호출
safety validation:        PII·발송 권한
generalization check:     스킬 저장 시 (§9.4)
human approval:           사용자 승인
delivery:                 저장 또는 발송
post-run summary:         실행 결과 + eval 데이터 자동 누적
```

### 11.2 컨텍스트 보존 규칙 (v0.3 신규)

```text
보호 대상 (압축 면제):
  - 활성화된 SKILL.md 본문
  - 머지된 컨텍스트 스택 (L0~L3)
  - 활성화된 quality-booster 지침

압축 가능:
  - 사용자와의 일상 대화 (스킬 외부)
  - 중간 산출물 (이미 outputs/에 저장된 것)
  - 도구 호출 결과 중 큰 데이터 (요약 가능)
```

### 11.3 Debug Assistant

```text
문제:
  사내 시트에서 데이터를 가져오지 못했습니다.

확인된 원인:
  - 시트 이름 "가군현황2026"을 찾을 수 없습니다.
  - 사내 위키에서 이 시트의 이름이 "가군현황_2026"으로 변경된 것이 확인됩니다.

자동 시도:
  - automation.yaml의 sheet_name 자동 수정 후보를 표시했습니다.
  - 변경을 승인하시겠습니까?
```

### 11.4 실행 상태 기록

```yaml
# automations/{id}/runs/2026-05-15-001.yaml
run:
  id: 2026-05-15-001
  status: draft_created
  context_snapshot:
    L0_version: 2026-05-01
    L1_jinhakapply_version: 2026-05-10
    L2_gagun_team_version: 2026-05-12
    L3_user_version: 2026-05-15
  validations:
    preflight: passed
    input_validation: passed
    context_validation: passed
    dry_run: passed
    output_validation: warning
    safety_validation: passed
  warnings:
    - CTR 컬럼 결측 3건
    - 가군 정의가 L1 최신 버전과 불일치
  next_actions:
    - 결측값 제외 여부 사용자 확인
  eval_data:
    duration_ms: 23332
    total_tokens: 84852
    quality_score: 0.88
```

---

## 12. 안전 설계 (사내 환경)

### 12.1 기본 안전 정책

```text
1. 외부 발송은 기본 비활성화
2. 삭제·덮어쓰기·대량 수정은 이중 승인
3. PII 감지 시 발송 차단
4. API key·token은 코드에 저장 금지
5. L0 잠금 항목 override 시도는 차단 + 정보보안팀 통지
6. 사내 시스템 외 공개 배포 차단
7. dry-run 기본 실행
8. 모든 실행에 input snapshot + output log 저장
9. 실패 시 복구 안내 자동 생성
10. 사용자가 이해할 수 있는 언어로 에러 번역
```

### 12.2 PII 정책 (진학사 특화)

```yaml
# L0/compliance-rules.yaml
pii_patterns:
  - 학번 (9~10자리 숫자)
  - 수험번호
  - 학생 이름 + 학교 조합
  - 주민번호 앞·뒷자리
  - 전화번호
  - 이메일 (개인용 도메인)

handling:
  default_action: mask
  log_to: 사내 보안 로그
  notify: 정보보안팀 (감지 시)
```

### 12.3 신뢰 게이팅 (Add support §1, v0.3 신규)

표준은 "프로젝트 수준 스킬은 신뢰할 수 없는 출처일 수 있다"고 명시. 사내 환경에 맞춰 적용:

```text
신뢰 게이팅 규칙:

[자동 신뢰]
- skills/core/*                     # 하네스팀 관리
- skills/quality-boosters/*         # 하네스팀 관리
- skills/workflows/*                # 하네스팀 관리
- skills/promoted/L1_division/*     # 본부 PO 검토 통과
- skills/promoted/L2_team/*         # 팀장 검토 통과

[조건부 신뢰]
- skills/user/{me}/*                # 본인 스킬, PII Guard + Hardcode Sniper 강제
- skills/user/{other}/*             # 타 사용자 스킬, 첫 실행 시 격리 + 사용자 확인

[차단]
- 사외 출처 import                  # 정보보안팀 사전 검토 필수
- L0 잠금 override 시도             # 즉시 차단 + 통지
```

### 12.4 권한 모델 (사내 시스템)

```text
- 사내 Google Workspace: 최소 권한
- 사내 데이터베이스: 읽기 전용 우선, write는 별도 승인
- 사내 위키: 읽기 허용, 쓰기는 본부장 승인
- 사외 SaaS: v1 미포함
```

---

## 13. 데이터 모델

### 13.1 automation.yaml

```yaml
id: jihwan-weekly-gagun-report
name: 진학어플라이 가군 주간 보고
owner_user: jihwan
context_stack:
  L1: jinhakapply
  L2: gagun-team
  L3: jihwan
workflow: pm-weekly-status
overlays:
  - division-overlays/jinhakapply/pm-weekly-status.override.yaml

cadence:
  frequency: weekly
  day: monday
  timezone: Asia/Seoul

inputs:
  - id: gagun_sheet
    type: jinhak_sheets
    sheet_ref: 가군현황_2026
    required: true

outputs:
  - id: report_doc
    type: jinhak_docs
    target_folder: /진학어플라이/주간보고/2026
    requires_approval: false
  - id: exec_summary
    type: internal_message
    channel: 가군기획팀-주간
    requires_approval: true

quality_gates:
  - pii-guard
  - source-anchor
  - tone-linter
  - approval-gate

skill:
  generate_on_success_runs: 3
  initial_scope: personal
  promotion_candidates:
    - L2_team: 가군기획팀 공통 부분이 60% 이상이면 자동 제안

eval:
  enabled: true
  evals_path: ./evals/evals.json
  iteration_workspace: ./evals-workspace/
```

### 13.2 SKILL.md frontmatter (§9.1 참조)

### 13.3 컨텍스트 메모리 아이템

```yaml
id: gagun-definition
type: domain_term
layer: L1_division/jinhakapply
source: 본부 PO 직접 입력
confidence: locked
content: |
  가군: 정시 모집 가군. 수시 차수와 혼동 금지.
last_verified: 2026-05-01
applies_to: [pm-weekly-status, pm-data-analysis-brief]
```

### 13.4 evals.json (v0.3 신규, 표준 evaluating-skills 기반)

```json
{
  "skill_name": "jihwan-weekly-gagun-report",
  "evals": [
    {
      "id": "happy-path-standard-week",
      "prompt": "이번 주 가군 접수 현황 보고서 만들어줘",
      "expected_output": "1페이지 임원용 보고서, 가군별 KPI 표, 원인 가설, 다음 주 액션",
      "files": ["evals/files/2026-W20-gagun.csv"],
      "assertions": [
        "출력에 가군별 KPI 표가 포함됨",
        "표에 접수율, 결제완료율, 환불율 컬럼이 모두 있음",
        "임원용 톤 (확신 표현 없이 '확인 필요' 사용)",
        "PII (학번, 이름) 마스킹 완료",
        "이전 주 대비 변화 % 명시",
        "1페이지 분량 (1500자 이하)"
      ]
    },
    {
      "id": "edge-schema-change",
      "prompt": "이번 주 가군 보고",
      "expected_output": "컬럼명 변경 감지 후 사용자에게 확인 요청, 자동 진행 안 함",
      "files": ["evals/files/2026-W22-gagun-renamed-columns.csv"],
      "assertions": [
        "schema-drift-detector가 트리거됨",
        "사용자 확인 없이 자동 진행하지 않음",
        "친절한 에러 메시지 (raw stacktrace 아님)"
      ]
    }
  ]
}
```

---

## 14. 기획자 MVP

### 14.1 MVP 범위 (1×1×1×1 원칙)

| 차원 | MVP 선택 | 근거 |
|------|----------|------|
| 본부 | 진학어플라이 1개 | 데이터·이해관계자 명확 |
| 팀 | 가군기획팀 (또는 동급 1팀) | 사용자 그룹 좁힘 |
| 직무 | 기획자 | 사용자 지정 |
| 워크플로 | 3개 | 빈도 top |
| AI 도구 | **Claude Code + Cursor 2개** | D2 결정. 사내 분포 추정 기반. 추가 요청 시 adapter 1장씩 작성. |
| Quality Booster | 3개 (PII Guard, Source Anchor, Approval Gate) | 사고 방지 최우선 |
| 카탈로그 필터 | 1개 (jinhakapply-pm) | 비대화 방지 |
| Skill화 | on | 핵심 가치 증명 |

### 14.2 MVP 워크플로 3개

1. **pm-weekly-status**: 주간 진행 보고
2. **pm-policy-monitoring**: 입시 정책 변경 모니터링 (도메인 특화)
3. **pm-user-interview-synthesis**: 사용자 피드백·인터뷰 정리

### 14.3 구조만 미리 (확장 준비)

```text
L1_division/{jinhakdotcom, catch, blacklabel, sales}/    # 빈 폴더 + 템플릿
skills/workflows/{pm-prd-drafting, pm-data-analysis-brief, ...}/  # 나중에
adapters/{antigravity, copilot, gemini-cli}/             # v2
```

### 14.4 MVP 제외

```text
- 대시보드·웹앱 (v2+ 기술 부채)
- 외부 SaaS 자동 발송
- 사내 DB write-back
- 임베딩 기반 retrieval (단순 grep + frontmatter 시작)
- Slack·Notion 자동 발송 (초안만)
```

### 14.5 MVP 성공 기준

```text
- 첫 자동화 성공까지 30분 이내
- 3회 실행 후 스킬화 1클릭
- 다음 주 재실행 성공률 90% 이상
- PII 노출 0건
- 사용자 보고서 수동 수정량 50% 이하
- Description 트리거율 (validation): ≥ 0.80
- eval delta (with vs without): pass_rate +30%p 이상
```

---

## 15. 수평 확장 설계

### 15.1 확장 단위별 작업량

| 추가 사항 | 작업 | 비용 |
|-----------|------|------|
| 신규 본부 | `L1_division/{name}/` 6+1(gotchas)개 파일 | 본부 PO 1일 |
| 신규 팀 | `L2_team/{div}/{team}/` 생성 | 팀장 30분 |
| 신규 직무 | `skills/workflows/{role}-*/` 3~5개 + 카탈로그 필터 1개 | 1주 |
| 신규 AI 도구 | `adapters/{tool}/install.md` 1장 | 1일 |
| 신규 booster | `skills/quality-boosters/{name}/` | 1~2주 |
| 신규 워크플로 | `skills/workflows/{name}/` + evals | 1~2주 |
| 본부별 override | `division-overlays/{div}/{wf}.override.yaml` | 반나절 |

### 15.2 핵심 원칙

- 본부·팀 추가는 코드 변경 0
- 직무·워크플로 추가는 본체 무수정
- AI 도구 추가는 install.md 1장
- 표준 호환 클라이언트는 `.agents/skills/` 자동 발견으로 zero-config

### 15.3 수평 확장 검증

분기별:

```text
- 신규 본부 1개 추가 실제 소요 (목표: < 2일)
- 신규 직무 워크플로 1개 추가 (목표: < 1주)
- 본체 코드 변경 없이 확장된 비율 (목표: > 90%)
- 카탈로그 토큰 평균 (목표: 사용자 1명당 < 3,000)
```

---

## 16. 예시 시나리오 (진학사 도메인)

### 16.1 진학어플라이 가군 주간 보고

```text
사용자: 가군기획팀 기획자 김지환
입력: "이번 주 가군 접수 현황 보고서"

자동 동작:
  1) 카탈로그(필터: jinhakapply-pm)에서 description 매칭
     → pm-weekly-status 활성화
  2) task-decomposer: 5단계 분해
  3) context-injector:
     - L0: PII, 외부 공유 금지
     - L1 jinhakapply: 가군 정의 + gotchas (수시 혼동 금지)
     - L1 overlay: 가군은 정시 가군으로만
     - L2 가군기획팀: 톤 = 임원용 1페이지
     - L3 김지환: 표 선호
  4) prompt-composer: 5단계 프롬프트 + gotchas 자동 삽입
  5) quality-booster: PII Guard + Source Anchor + Approval Gate
  6) 초안 + 검증 리포트 + 승인 게이트

3회 성공 후:
  - skill-creator 자동 제안
  - description 트리거 평가 실행 (validation 통과율 0.87)
  - eval delta 측정 (with vs without: +52%p)
  - generalization-checker: 본인 부분 분리 제안
  - "가군기획팀 누구나 쓸 수 있는 형태로 L2 승격 후보입니다"
```

### 16.2 진학닷컴 입시 정책 변경 모니터링

```text
입력: "이번 주 발표된 입시 정책 변경 사항 정리"

자동 동작:
  - pm-policy-monitoring 활성화
  - L1 jinhakdotcom: 모니터링 대상 = 교육부, 17개 시도교육청, 주요 대학
  - L1 gotchas: "대학별 자체 정책 변경은 보통 12월에 몰림, 이 시기 추가 모니터링 강도 상승"
  - L1 도메인: 학종, 정시, 수시, 입학사정관제 정의
  - Citation Validator: 가짜 URL 차단
  - 초안 + 변경 사항 표 + 원문 링크
```

### 16.3 캐치 사용자 인터뷰 정리

```text
입력: "지난주 진행한 사용자 인터뷰 5건 요약"

자동 동작:
  - pm-user-interview-synthesis 활성화
  - L0: PII Guard 강하게 작동
  - L1 catch: 페르소나 = 취준생/이직자, KPI = 활성도/매칭률
  - L1 gotchas: "취준생 인터뷰는 학교명 노출되기 쉬움, 학교 정보는 카테고리화 (수도권/지방, 4년제/2년제)"
  - 5건 → 공통 페인포인트 / 차별점 / 액션 아이템
  - 인용은 익명 처리
```

---

## 17. 거버넌스와 운영

> **MVP 단순화 (D4-c 결정 반영):** Phase 1에서는 정식 4단 거버넌스를 가동하지 않는다. 하네스팀이 L1·L2 컨텍스트와 promoted-skill 변경을 직접 처리하고, 본부 PO·팀장은 사내 채널로 변경을 요청한다. 아래 표는 v2 이후 정상 거버넌스 모델이며, MVP에서는 §17.5 단순 모델을 적용한다.

### 17.1 역할 정의 (v2 정상 모델)

| 역할 | 책임 |
|------|------|
| 하네스팀 | core, quality-boosters, workflows 유지보수, 카탈로그 필터 관리 |
| 정보보안팀 | L0 정책, 잠금 항목 검토, 신뢰 게이팅 정책 |
| 본부 PO | L1 컨텍스트 관리, 본부 워크플로 override, gotchas 큐레이션 |
| 팀장 | L2 관리, 팀 스킬 승격 승인 |
| 일반 사용자 | L3, 본인 자동화·스킬 |

### 17.2 승격 승인 라인

```text
L3 personal → L2 team:        팀장 승인
L2 team → L1 division:        본부 PO 승인
L1 division → core:           하네스팀 + 정보보안팀 공동 승인
```

각 단계에서 자동 검증(generalization-checker, trigger eval, output eval, PII Guard) 통과 필수.

### 17.3 변경 관리

- 모든 계층 변경은 `CHANGELOG.md` 자동 기록
- core 변경은 분기별 릴리스 노트
- L0 변경은 전사 공지

### 17.4 사용자 지원

- 사내 위키 가이드
- 사내 채널: 하네스팀 운영
- 신규 본부 온보딩: 본부 PO 0.5일 워크숍

### 17.5 MVP 단순 거버넌스 모델 (D4-c 반영)

Phase 1 동안 실제로 적용되는 모델은 다음과 같다:

| 자산 | MVP 운영 방식 | 입력 채널 |
|------|---------------|-----------|
| skills/core, quality-boosters, workflows | 하네스팀이 직접 관리·배포 | 사용자 피드백·요청 채널 |
| L0 (보안·컴플라이언스) | 정보보안팀이 작성, 하네스팀이 commit | 정보보안팀 직접 결정 |
| L1 (본부 컨텍스트 + gotchas + KPI) | **하네스팀이 직접 commit**. 본부 PO는 변경 요청만. | 사내 채널 (D-U3) |
| L2 (팀 컨텍스트) | 하네스팀이 직접 commit. 팀장은 변경 요청만. | 사내 채널 |
| user-skill | 사용자 본인 PC에 로컬 전용. Bitbucket 비공개. | 본인 |
| 승격 (L3→L2→L1) | MVP에서 정식 승격 X. 사용자가 채널로 "이거 우리 팀에 좋겠다"고 보고 → 하네스팀이 검토 후 promoted/에 commit. | 사내 채널 |

**시사점:**
- MVP 단계에서 본부 PO·팀장은 git 개념을 알 필요 없음
- 모든 변경 책임이 하네스팀에 집중 → 하네스팀 운영 부담이 v0.3 가정보다 큼
- v2에서 본부 PO 직접 commit으로 권한 위임 시작

---

## 18. 성공 지표

### 18.1 사용자 성공

```text
- 첫 자동화 성공까지 (목표: 30분)
- 신규 사용자 7일 retention (목표: 60%)
- 사용자 수동 수정 비율 (목표: ≤30%)
- 재실행 성공률 (목표: ≥90%)
- 이해된 에러 메시지 비율 (목표: ≥90%)
```

### 18.2 시스템 품질 (v0.3 확장, eval 기반)

```text
- 평균 스킬 재사용성 등급 (목표: Level ≥2)
- 하드코딩 자동 탐지율 (목표: ≥95%)
- PII 탐지율 (목표: ≥99%)
- 평균 description 트리거율 (validation) (목표: ≥0.85)
- 평균 eval delta (pass_rate, with vs without) (목표: ≥30%p)
- 평균 토큰 오버헤드 (with vs without) (목표: ≤+2000)
- 컨텍스트 머지 정확도
```

### 18.3 확장 지표

```text
- 활성 본부 / 팀 / 사용자 수
- 사용자 생성 스킬 수
- L3→L2→L1→core 누적 승격
- workflow 수 / adapter 수 / booster 수
- 카탈로그 평균 토큰 (목표: 사용자 1인당 ≤3000)
```

### 18.4 안전 지표

```text
- PII 노출 사고: 0건
- L0 잠금 override 시도: 0건 또는 즉시 차단
- 미승인 외부 발송: 0건
- 자동 발송 사고: 0건
```

---

## 19. 리스크와 대응

### 19.1 범위 과다

대응: MVP 1×1×1×1 유지. 구조만 수평 확장 가능하게.

### 19.2 Agent Skills 표준 분화

리스크: 클라이언트별 frontmatter 해석 차이.

대응: 본체는 가장 안정적인 공통 부분만 사용. 비표준 필드는 모두 `metadata:` 하위로. 도구별 advanced는 add-on. 신규 클라이언트 추가 시 호환성 매트릭스 분기별 측정.

### 19.3 카탈로그 비대화

리스크: 스킬 100개+ 누적 시 매 세션 5,000~10,000 토큰 상시 점유.

대응: 직무·본부별 카탈로그 필터(§3.3). 사용자별 평균 ≤3,000 토큰 목표.

### 19.4 Description 매칭 실패

리스크: 트리거되어야 할 때 트리거 안 됨.

대응: trigger eval 의무화. validation 통과율 0.80 미만 스킬은 승격 불가. 사용자 명시 활성화 경로(슬래시 명령) 항상 병행 제공.

### 19.5 PII·보안 사고

대응: L0 잠금, PII Guard 모든 단계 자동, 신뢰 게이팅(§12.3), 사외 SaaS v1 제외.

### 19.6 일반화되지 않은 사용자 스킬

대응: generalization-checker를 승격 게이트로 강제 (정적+동적+LLM judge 3단계).

### 19.7 컨텍스트 압축으로 인한 조용한 품질 저하

리스크: 긴 세션에서 SKILL.md 본문이 압축에 잘려 산출물 품질 저하.

대응: §10.5 컨텍스트 보호. 모든 활성 스킬과 컨텍스트 스택은 `protected="true"`.

### 19.8 메모리 오염

대응: 모든 메모리에 source, confidence, last_verified, applies_to. medium 이하는 사용자 확인.

### 19.9 사용자 학습 곡선

대응: yaml·폴더는 도구가 다룸. 사용자는 자연어 인터페이스만 사용. L3 preferences는 대화형 수정.

---

## 20. 개발 로드맵

### Phase 1: Core Harness + 표준 준수 (Month 1~2)

```text
- Agent Skills 표준 자산 구조 확정 (frontmatter 검증 포함)
- .agents/skills/ 미러링 메커니즘
- task-decomposer, context-injector, prompt-composer SKILL.md 작성
- L0 진학사 보안·컴플라이언스 (정보보안팀 협업)
- L1 진학어플라이 (gotchas 포함)
- L3 사용자 프로파일 구조
- 카탈로그 필터 1개 (jinhakapply-pm)
```

### Phase 2: Quality Booster (Month 2~3)

```text
- PII Guard, Source Anchor, Approval Gate (표준 Skill 형식)
- 모든 워크플로 자동 통합
- 컨텍스트 보호 메커니즘
- 사고 0건 검증
```

### Phase 3: 기획자 MVP + Eval (Month 3~4)

```text
- pm-weekly-status, pm-policy-monitoring, pm-user-interview-synthesis
- 각 워크플로의 evals/evals.json + with/without 비교
- division-overlays/jinhakapply
- 가군기획팀 베타 5명
```

### Phase 4: Skill Creator + Generalization Checker + Trigger Eval (Month 4~5)

```text
- 스킬화 자동 제안
- description 트리거 평가 자동화 (train/validation)
- generalization-checker 3단계
- L3 → L2 승격 시범
```

### Phase 5: Adapter 확장 + 본부 확장 (Month 5~6)

```text
- AI 도구 adapter 추가 (Codex, Antigravity, Copilot)
- 진학닷컴, 캐치 본부 L1 + gotchas
- 추가 워크플로 (pm-data-analysis-brief, pm-meeting-summary)
- 카탈로그 필터 본부별 추가
```

### Phase 6: 확장 안정화 (Month 6+)

```text
- 신규 직무 (디자이너, 운영, HR, 재무)
- L1 → core 거버넌스 가동
- 대시보드·웹앱 v2 검토
```

---

## 21. 결정 사항과 미결정 사항

### 21.1 확정된 결정 (Decision Round 1, 2026-05-15)

| # | 항목 | 결정 | 비고 |
|---|------|------|------|
| D1 | MVP 첫 본부·팀 | **진학어플라이 / 가군기획팀** | 정시 가군 KPI가 명확·정량·주기적이라 자동화 가치 증명 용이. v0.3 본문 전체가 이 가정 위에서 작성됨. |
| D2 | 사내 AI 도구 분포 파악 | **추정으로 시작: Claude Code + Cursor 2개** | 사내 분포가 다양하다는 정성적 정보 기반. MVP는 이 둘만 지원. 클레임이 들어오면 adapter 추가. v1 이후 IT/설문 실측. |
| D4 | 사내 저장소 | **Bitbucket Cloud** | 사내 표준 git 호스팅. .agents/skills/ 컨벤션 호환. SaaS이므로 L0 compliance 관점에서 정보보안팀 승인 필요 (§21.3-c). |
| D4-a | Bitbucket 종류 | **Cloud (bitbucket.org SaaS)** | self-hosted 아님. 외부 SaaS 데이터 저장 정책 검토 필요. |
| D4-b | 비개발자 접근 UI | **AI 도구 표준 경로 직접 사용 (.claude/skills/, .cursor/rules/ 등)** | install 스크립트로 본체를 사용자 PC에 배포. user-skill은 로컬 전용. Bitbucket UI는 비개발자에게 노출하지 않음. 별도 웹 UI 없음. |
| D4-c | L1 PR 리뷰 흐름 | **MVP는 하네스팀이 모두 직접 관리, 본부 변경 요청은 채널 기반** | 본부 PO가 Slack/메일/사내 채널로 요청 → 하네스팀이 검토 후 Bitbucket에 commit. 정식 PR 거버넌스는 v2. |

### 21.2 잔여 미결정 (다음 결정 라운드 후보)

🟡 **Phase 1 병행 가능 (실체 만들기와 동시 진행):**

- **U3. L0 작성 주체와 일정**: 정보보안팀 협업 시점·범위.
- **U7. 사내 시스템 연동 API**: 진학사 내부 DB·시트·위키 접근 방법 (전용 API vs 권한 위임 vs 사용자 직접 업로드).

🟢 **Phase 2+로 미뤄도 됨:**

- **U5**. 하네스팀 인력 구성.
- **U6**. 임베딩·검색 인프라 도입 시점 (v1 grep 기반).
- **U8**. 사내 SaaS형 AI 도구(웹 기반 ChatGPT Enterprise, Claude.ai 웹) 지원 → 스킬 레지스트리 API 필요 여부.
- **U9**. 카탈로그 필터 거버넌스 — 직무·본부별 필터를 누가 정의·승인하는지.
- **U10**. 자동 활성화 vs 명시 활성화 사용자 가이드 작성 방식.

### 21.3 D4 결정 이후 새로 도출된 후속 이슈

D4-a/b/c가 확정되며 v0.3 가정이 크게 단순해졌다. 그 결과 새로 처리해야 할 이슈:

- **D4-c-i (선행 차단 가능성)**: Bitbucket Cloud는 SaaS. 사내 도메인 용어·gotchas·KPI를 외부 SaaS에 저장하려면 **정보보안팀 승인 필요**. 승인 못 받으면 D4 재검토 (Data Center 전환 또는 사내 GitLab 등). → Phase 1 시작 전 차단 가능성 있음.
- **D-U1 본체 업데이트 배포 메커니즘**: 본체가 바뀌면 사용자에게 어떻게 알리고 어떻게 받게 하는가? 후보: (a) 사용자가 install 스크립트 재실행 / (b) 하네스가 자동 git pull 백그라운드 동기화 / (c) 채널 공지 + 수동.
- **D-U2 user-skill 백업 정책**: 비개발자가 만든 스킬이 본인 PC에만 있으면 PC 고장·이직 시 손실. 후보: (a) MVP는 백업 없음, 자기 책임 / (b) 옵션으로 사내 드라이브 동기화 / (c) 본인 Bitbucket 개인 repo 권장.
- **D-U3 L1 변경 요청 채널과 SLA**: 본부 PO가 어디로 요청하고 며칠 안에 처리하는가? 채널 명칭(Slack, 사내 메신저 등), 양식, 응답 SLA.
- **D-U4 install 스크립트의 도구 감지·경로 매핑**: 사용자가 Claude Code/Cursor 어느 쪽을 쓰는지 install 시 묻고 적절한 경로(.claude/skills/ 또는 .cursor/rules/)에 배포하는 방식 설계 필요.

---

## 22. v0.2 → v0.3 변경 요약

| 영역 | v0.2 | v0.3 |
|------|------|------|
| SKILL.md frontmatter | 비표준 필드(`summary`, `scope` 등) 최상위 사용 | **표준 6개 필드만 최상위, 커스텀은 `metadata:` 하위로** |
| Progressive Disclosure | 미언급 | **3계층 명문화, SKILL.md 500줄/5000토큰 한도 강제** |
| 스킬 발견 경로 | 자체 레이아웃만 | **`.agents/skills/` 미러링으로 cross-client 자동 발견** |
| 카탈로그 비대화 | 미언급 | **직무·본부별 catalog-filters 도입 (§3.3)** |
| Description 작성 | 미언급 | **Description 최적화 5단계 루프 (train/validation 분할) (§9.3)** |
| Gotchas | 미언급 | **L1/L2에 gotchas.md 표준화, 핵심 도메인 자산으로 (§6.5)** |
| Generalization Checker | 정적+동적+LLM judge 명시 | **표준 evaluating-skills 패턴 그대로 채택: evals.json + with/without 비교 + benchmark.json (§9.4)** |
| 컨텍스트 보호 | 미언급 | **§10.5, §11.2: SKILL.md + 컨텍스트 스택 자동 압축 면제** |
| 신뢰 게이팅 | L0 잠금만 | **§12.3: 자동 신뢰 / 조건부 신뢰 / 차단 3단계 정책** |
| 활성화 경로 | 모델 주도만 암묵 | **§5.1: 모델 주도 + 사용자 명시(슬래시 명령) 이중 지원** |
| Adapter 카탈로그 | 미언급 | **§10.4: 시스템 프롬프트 방식 / 전용 활성화 도구 방식 둘 다 지원** |
| 활성화 중복 제거 | 미언급 | **§10.6 추가** |
| 재사용 스크립트 번들링 | 미언급 | **§9.5: eval trace 분석으로 자동 제안** |
| 클라우드/샌드박스 환경 | 미언급 | **§21 미결정 사항에 사내 스킬 레지스트리 API 추가** |
| 성공 지표 | 정성적 | **§18.2: trigger eval, output eval, 토큰 오버헤드 등 정량 KPI 추가** |
| MVP 성공 기준 | 일반적 | **§14.5: trigger 통과율 ≥0.80, eval delta ≥30%p 추가** |
| 승격 게이트 | 검증 통과만 | **§8.3: trigger 통과율, output eval delta 등 정량 기준 추가** |

---

## 23. 최종 권장 설계

```text
본체:
  Agent Skills 공식 표준 (frontmatter 6필드 + Progressive Disclosure 3계층)
  + skills/core + skills/quality-boosters + skills/workflows
  + 4단 계층 컨텍스트(L0~L3) + L1/L2 gotchas

확장:
  workflow-templates, division-overlays
  adapters/ (얇은 install.md, 표준 .agents/skills/ 의존)

품질:
  Quality Booster layer (default-on, 각 booster가 표준 Skill)
  Eval-driven iteration (with/without, trigger eval)

사용자 자산:
  skills/user → skills/promoted (Bottom-up 승격)
  승격 게이트: generalization + trigger eval + output eval + PII Guard

운영:
  하네스팀 / 정보보안팀 / 본부 PO / 팀장 / 사용자 4단 거버넌스
  카탈로그 필터로 직무·본부별 노출 제어
  컨텍스트 압축 보호로 긴 세션 품질 유지
  신뢰 게이팅으로 사외 출처 차단
```

**가장 중요한 설계 판단:**

```text
1. 본체는 Agent Skills 공식 표준 그 자체. 비표준 필드 일체 금지 (metadata: 하위만).
2. Progressive Disclosure 3계층은 설계 제약. SKILL.md 500줄/5000토큰 한도 강제.
3. `.agents/skills/` 컨벤션 채택. cross-client zero-config 자동 발견.
4. 카탈로그 비대화는 필터로 해결. 사용자 1인당 ≤3000 토큰.
5. 컨텍스트는 4단 계층 + L1/L2 gotchas. 진학사 본부 구조 그대로.
6. Quality Booster는 default layer. 각 booster가 표준 Skill이라 user-skill도 자동 상속.
7. 대시보드·웹앱은 v1에 없다. 핵심 약속(품질 자동 부스팅)에 집중.
8. 스킬화는 trigger eval + output eval delta로 승격 게이트.
9. 컨텍스트 압축 보호로 긴 세션에서도 품질 유지.
10. 사용자 스킬은 자동으로 팀·본부 자산으로 승격. 사내 자동화 라이브러리가 bottom-up으로 쌓인다.
11. 신규 본부·팀·직무 추가에 본체 코드 변경 없다. 수평 확장은 폴더 채우기 + 카탈로그 필터.
```

**이 설계의 약속:**

진학사 기획자가 평소 말로 업무를 설명하면, Agent Skills 표준에 100% 부합하는 사내 하네스가:
- 회사·본부·팀·개인 컨텍스트와 본부 gotchas를 자동으로 결합하고,
- 검증된 프롬프트 패턴을 자동으로 합성하며,
- PII·숫자 출처·톤·일반화 검증이 자동으로 작동하고,
- 사용자가 의식하지 않아도 결과물 퀄리티가 올라가며,
- 다음 주에도 작동하고,
- 잘 만든 것은 팀과 본부의 자산으로 자연스럽게 승격되며,
- 사용자가 Claude Code를 쓰든 Cursor를 쓰든 Codex를 쓰든 Copilot을 쓰든 **추가 설정 없이 똑같이 작동한다**.

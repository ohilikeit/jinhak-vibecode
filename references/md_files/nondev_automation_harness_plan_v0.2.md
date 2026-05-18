# 진학사 사내 비개발자 업무 자동화 하네스 설계 문서 v0.2

> v0.1 대비 변경 요약은 §22 참조. 핵심 피벗: (1) Agent Skills 공통 규격을 본체로 확정, (2) 가치 제안을 "AI 도구 중립 자동화 빌더"에서 **"비개발자 업무 분해·도메인 결합·프롬프트 품질을 자동으로 보장해주는 사내 quality booster"**로 재정의, (3) 진학사 본부 구조를 그대로 반영한 4단 계층 컨텍스트 모델 도입, (4) 기획자 1본부 1팀 MVP로 좁힘, (5) 대시보드/웹앱은 v2+ 기술 부채로 분리.

---

## 0. 문서 목적

이 문서는 진학사 사내 비개발자(기획자, 운영자, 영업, HR, 재무, 디자이너 등)가 본인의 반복 업무를 AI를 활용해 안정적으로 자동화할 수 있도록 돕는 **사내 전용 하네스 도구**의 설계 초안이다.

사내 비개발자들이 사용하는 AI 도구가 Claude Code, Cursor, Codex, Antigravity, Copilot 등으로 고르게 분포되어 있다는 환경 제약 때문에, 이 도구는 **특정 AI 플랫폼에 종속되지 않는 Agent Skills 공통 규격**을 본체로 한다.

핵심 목표는 다음과 같다.

1. 비개발자가 큰 업무를 AI가 처리 가능한 단계로 쪼개지 못하는 문제(분해 갭)를 자동으로 해결한다.
2. 각 단계에 회사·본부·팀·개인 컨텍스트를 자동으로 주입한다(결합 갭).
3. 검증된 프롬프트 패턴을 자동 합성하여 결과물 품질을 보장한다(프롬프트 품질 갭).
4. 사내 보안 정책·도메인 지식·본부 방향성을 디폴트로 박아두되, 팀·개인 단위로 override 가능하게 한다.
5. 비개발자가 자신의 자동화를 스킬로 추출하고, 잘 만들어진 개인 스킬이 팀·본부 자산으로 승격되도록 한다.
6. 기획자 1본부 1팀 MVP로 시작하되, 신규 본부·팀·직무 추가 시 **코드 변경 없이** 수평 확장 가능한 구조로 설계한다.
7. 비개발자가 의식하지 않아도 산출물의 퀄리티가 자동으로 올라가는 **백그라운드 quality booster**로 작동한다.

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

### 1.3 도구 중립성이 본체인 이유

사내 비개발자들이 쓰는 AI 도구가 고르게 분포되어 있다. 따라서 Claude Code plugin, Cursor extension처럼 특정 플랫폼에 종속된 형태로 만들면 절반 이상의 사용자가 배제된다.

→ **본체는 Agent Skills 공식 규격(SKILL.md + scripts + references)이다.** 각 AI 도구는 이 공통 자산을 "어디에 두고 어떻게 로드하는지"만 알려주는 얇은 install 가이드로 지원한다.

---

## 2. 핵심 설계 원칙

### 2.1 Agent Skills 표준 우선

- 본체 자산: `SKILL.md`, `scripts/`, `references/`, `templates/` (Agent Skills 공식 구조)
- 도구별 adapter는 install.md 한 장으로 끝낸다. adapter가 두꺼워지면 본체 진화 속도가 묶이므로 **adapter 두께 한계선을 명문화**한다 (§10.4).

### 2.2 계층화된 디폴트 + Override

회사 보안, 본부 방향성, 도메인 지식은 디폴트로 박아두되, 팀·개인이 override 가능하게 한다. L0(전사) 보안·컴플라이언스만 잠금, 나머지는 모두 override 가능.

### 2.3 Quality는 옵션이 아니라 기본 레이어

PII 마스킹, 숫자 출처 대조, 톤 검사, 발송 전 승인은 사용자가 의식하지 않아도 모든 워크플로에 자동으로 끼는 **booster layer**로 둔다(§7). 사용자가 만든 개인 스킬도 자동으로 이 보호를 상속받는다.

### 2.4 초안 우선, 자동 실행은 후순위

비개발자용 자동화는 처음부터 완전 자동 발송으로 가면 위험하다. 기본 단계:

```text
1) 초안 생성  →  2) 사용자 검토  →  3) 승인 후 저장
              →  4) 승인 후 발송  →  5) 충분히 검증된 뒤 일정 자동 실행
```

### 2.5 Bottom-up 스킬 자산화

비개발자가 자기 업무로 만든 자동화가 **개인(L3) → 팀(L2) → 본부(L1) → 전사 core**로 자연스럽게 승격되는 경로를 둔다(§8.3). 사내 자동화 라이브러리가 bottom-up으로 쌓이게 한다.

### 2.6 수평 확장 가능한 구조

신규 본부 추가 = 폴더 6개 파일 채우기. 신규 직무 추가 = workflow-template 몇 개 추가. **본체 코드 변경 없음**을 설계 원칙으로 둔다(§15).

### 2.7 사내 환경 우선

외부 SaaS(Slack, Notion, Salesforce 등) 연동보다 사내 시스템(사내 위키, 사내 Google Workspace, 사내 데이터베이스)과 사내 보안 정책 준수가 우선이다.

---

## 3. 전체 아키텍처

```text
jinhak-harness/
├─ context-stack/                      # 계층화된 컨텍스트 (§6)
│  ├─ L0_org/                          # 전사 (정보보안팀이 잠금 관리)
│  ├─ L1_division/                     # 본부별 (본부 PO 수정)
│  │  ├─ jinhakapply/                  # 진학어플라이
│  │  ├─ jinhakdotcom/                 # 진학닷컴
│  │  ├─ catch/                        # 캐치
│  │  ├─ blacklabel/                   # 블랙라벨
│  │  └─ sales/                        # 영업본부
│  ├─ L2_team/                         # 팀별 (팀장 수정)
│  └─ L3_user/                         # 개인 (각 유저 수정)
│
├─ core-skills/                        # Agent Skills 표준, 도구 중립 (§4.2)
│  ├─ task-decomposer/                 # G1: 업무 분해
│  ├─ context-injector/                # G2: 계층 컨텍스트 머지·주입
│  ├─ prompt-composer/                 # G3: 프롬프트 합성
│  ├─ quality-booster/                 # 자동 품질 검사 (§7)
│  ├─ skill-creator/                   # 자동화를 스킬로 추출
│  ├─ generalization-checker/          # 다음 주에도 동작하는지 검증
│  ├─ memory-retriever/                # 과거 자동화 맥락 검색
│  └─ debug-assistant/                 # 에러를 업무 언어로 번역
│
├─ workflow-templates/                 # 업무 유형별 분해 + 프롬프트 (§4.3)
│  ├─ pm-prd-drafting/                 # 기획자 PRD 작성
│  ├─ pm-competitor-research/          # 경쟁사·시장 조사
│  ├─ pm-user-interview-synthesis/     # 사용자 인터뷰 정리
│  ├─ pm-weekly-status/                # 주간 진행 보고
│  ├─ pm-data-analysis-brief/          # 데이터 분석 정리
│  ├─ pm-policy-monitoring/            # 입시 정책 변경 모니터링 (도메인 특화)
│  └─ pm-meeting-summary/              # 회의록·액션아이템
│
├─ division-overlays/                  # 본부별 workflow 커스터마이즈
│  └─ {division}/{workflow}.override.yaml
│
├─ user-skills/                        # 유저 개인 스킬 (스킬화 결과물)
│  └─ {user}/{skill}/
│
├─ promoted-skills/                    # 승격된 팀·본부 자산
│  ├─ L2_team/{division}/{team}/
│  └─ L1_division/{division}/
│
├─ adapters/                           # AI 도구별 install 가이드 (얇음)
│  ├─ claude-code/install.md
│  ├─ cursor/install.md
│  ├─ codex/install.md
│  ├─ antigravity/install.md
│  └─ copilot/install.md
│
├─ automations/                        # 사용자가 만든 자동화 프로젝트
│  └─ {project-id}/
│
└─ registry/
   ├─ skills.yaml                      # 전체 스킬 카탈로그
   ├─ workflows.yaml
   └─ promotion-log.yaml               # 스킬 승격 이력
```

---

## 4. 핵심 개념 모델

### 4.1 Context Stack (계층 컨텍스트)

진학사 본부 구조를 그대로 반영한 4단 계층. 머지 순서: **L3 → L2 → L1 → L0** (개인이 가장 우선, 전사 보안은 잠금).

```text
L0 전사:       보안정책, 컴플라이언스, 사내 약어, 사내 톤가이드 (잠금)
L1 본부:       본부 도메인 용어, 본부 KPI 정의, 본부 이해관계자, 데이터 소스
L2 팀:         팀이 쓰는 workflow, 팀 톤 override, 팀이 거부한 디폴트
L3 개인:       역할, 산출물 길이 선호, 개인 약어
```

세부 구조는 §6 참조.

### 4.2 Core Skill

도구 중립 Agent Skills 표준을 따르는 핵심 능력. v1 기준 8개 (위 아키텍처 참조).

```text
core-skills/task-decomposer/
├─ SKILL.md                         # Agent Skills 표준 frontmatter + 사용 가이드
├─ decomposition-patterns/          # 보고서·조사·분석·문서·요약 등 유형별 분해 패턴
├─ scripts/decompose.ts
└─ references/
```

### 4.3 Workflow Template

업무 유형별로 "어떻게 단계를 쪼개고, 각 단계에 어떤 컨텍스트를 결합하며, 어떤 프롬프트를 쓸지"를 미리 정해둔 것. 직군과 분리되어 있어 재사용 가능.

```text
workflow-templates/pm-weekly-status/
├─ template.yaml                    # 분해 단계 정의
├─ stage-prompts/                   # 단계별 프롬프트 템플릿
│  ├─ 1-data-collection.md
│  ├─ 2-anomaly-check.md
│  ├─ 3-kpi-computation.md
│  ├─ 4-hypothesis.md
│  └─ 5-exec-summary.md
├─ quality-gates.yaml               # 이 워크플로 전용 추가 검증
└─ examples/
```

### 4.4 Division Overlay

같은 workflow를 본부별로 다르게 쓰기 위한 override 레이어. 코드 수정 없이 yaml로만 차이 표현.

```yaml
# division-overlays/jinhakapply/pm-weekly-status.override.yaml
extends: workflow-templates/pm-weekly-status
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

### 4.5 Quality Booster

모든 단계 사이에 자동으로 끼어 결과물 품질을 보장하는 layer. 사용자가 의식하지 않음. §7 참조.

### 4.6 User Skill / Promoted Skill

유저가 자신의 자동화를 스킬로 저장한 결과물. 검증을 통과하면 팀(L2) → 본부(L1) → 전사 core로 승격 가능.

### 4.7 Automation Project

사용자가 만드는 하나의 자동화 단위. 폴더 구조:

```text
automations/2026-marketing-weekly-report/
├─ automation.yaml                  # 사용 중인 workflow, 컨텍스트 스택 스냅샷
├─ README.md
├─ intake/                          # 인터뷰 기록, 미해결 질문
├─ references/                      # 사용자가 업로드한 과거 산출물
├─ sources/                         # 입력 데이터
├─ outputs/                         # 산출물
├─ runs/                            # 실행 로그 + 검증 결과
└─ generated-skill/                 # 스킬화 결과
```

---

## 5. 사용자 경험 흐름

### 5.1 한 줄 요청에서 산출물까지

사용자가 의식하는 행동은 **첫 줄 한 마디뿐**이다. 내부 동작:

```text
사용자: "이번 주 진학어플라이 가군 접수 현황 보고서 만들어줘"
                          │
                          ▼
[1] task-decomposer
    workflow-templates/pm-weekly-status 매칭
    표준 5단계 분해:
      ① 데이터 수집  ② 이상치 점검  ③ KPI 산출
      ④ 원인 가설   ⑤ 임원용 요약
                          │
                          ▼
[2] context-injector (L3 → L2 → L1 → L0 머지)
    L0:  외부 공유 금지 채널, PII 패턴
    L1:  진학어플라이 KPI 정의, 가군 용어, 본부장 = OOO
    L1+: division-overlays/jinhakapply/pm-weekly-status.override.yaml
    L2:  가군기획팀 톤, 정시 가군 vs 수시 가군 분리 표기
    L3:  보고서 1페이지 임원용 톤
                          │
                          ▼
[3] prompt-composer
    각 단계 ①~⑤에 머지된 컨텍스트 + 검증된 프롬프트 패턴 주입
    품질 가드 자동 삽입:
      "원인 추측 금지, 근거 없으면 '확인 필요'로 표시"
                          │
                          ▼
[4] quality-booster (§7)
    PII 마스킹 점검 / 숫자 출처 대조 / 톤 일관성 / 형식 일치
                          │
                          ▼
[5] 초안 + 검증 리포트 + 승인 게이트
```

### 5.2 첫 사용 흐름

신규 사용자가 처음 자동화를 만들 때:

```text
사용자: 매주 작성하는 가군 접수 현황 보고서를 자동화하고 싶어.

도구:
  1) 본부와 팀을 확인합니다 → 진학어플라이 / 가군기획팀
  2) 이 업무 유형은 'pm-weekly-status'로 보입니다
  3) 본부 KPI 정의와 톤가이드를 자동으로 적용합니다
  4) 이전 보고서가 있다면 references/에 넣어주세요
  5) 이번 주 데이터 위치를 알려주세요
```

사용자가 입력해야 하는 정보는 자기 업무 문맥뿐. 본부 KPI나 톤은 묻지 않는다(L1에 이미 있음).

### 5.3 레퍼런스 분석

사용자가 과거 보고서를 넣으면 자동으로 추출:

- 반복되는 섹션 구조
- 사용된 KPI (L1 정의와 일치하는지 검증)
- 톤·문장 길이 (L1/L2 톤과 차이 있으면 사용자 확인)
- 누락된 정보·예외 규칙

결과는 `automations/{id}/intake/reference-analysis.md`로 저장하고, 사용자 개인 컨텍스트(L3)와 차이가 있으면 L3 업데이트 제안.

### 5.4 도메인 정보 부족 시

L0~L2에 답이 없는 질문만 사용자에게 묻는다. 예시:

```text
다음 정보가 L1/L2에 정의되어 있지 않습니다.

1. 가군 접수율 임계치(빨간색 기준)는 몇 %입니까?
2. 환불율을 어디서 가져오나요?

→ 답변하시면 가군기획팀 컨텍스트(L2)에 저장하여 다음에는 묻지 않겠습니다.
```

도메인 지식은 **묻고 답한 결과가 자동으로 적절한 계층에 축적**되는 것이 핵심.

### 5.5 검증과 승인

§7과 §11 참조. 모든 자동화는 발송·저장 전 검증 리포트와 함께 승인 게이트를 통과해야 한다.

### 5.6 스킬화

자동화가 3회 이상 성공 실행되면 skill-creator가 자동 제안:

```text
이 자동화를 'JiHwan/주간-가군-보고' 스킬로 저장할까요?

저장 시:
  - generalization-checker 실행 (하드코딩 탐지)
  - 본부 공통 부분 vs 개인 부분 분리 제안
  - "가군기획팀 누구나 쓸 만한 부분"은 L2 팀 자산으로 승격 후보로 표시
```

---

## 6. 계층화 컨텍스트 시스템

### 6.1 구조

```text
context-stack/
├─ L0_org/                              # 전사 (정보보안팀만 수정, 다른 계층 override 불가)
│  ├─ security-policy.md                # 외부 공유 금지, 민감정보 처리
│  ├─ compliance-rules.yaml             # PII 정규식 패턴, 발송 금지 채널
│  ├─ company-glossary.md               # 사내 부서명, 시스템명, 약어
│  ├─ writing-house-style.md            # 사내 톤·맞춤법·금지어
│  └─ tool-policy.yaml                  # 허용 SaaS 목록, 금지 도구
│
├─ L1_division/
│  ├─ jinhakapply/                      # 진학어플라이 (원서접수)
│  │  ├─ domain-terms.md                # 가군/나군/다군, 수시6/정시3 등
│  │  ├─ kpis.yaml                      # 접수율, 결제완료율, 환불율 정의
│  │  ├─ stakeholders.md                # 본부장, PO, 주요 수신자
│  │  ├─ data-sources.yaml              # 어떤 시트·DB가 진실인가
│  │  ├─ tone-guide.md                  # 본부 보고용 톤 (L0 위에 덧붙임)
│  │  └─ workflow-overrides/            # 본부별 workflow 차이
│  ├─ jinhakdotcom/                     # 진학닷컴 (입시정보)
│  ├─ catch/                            # 캐치 (취업)
│  ├─ blacklabel/                       # 블랙라벨 (고등교재)
│  └─ sales/                            # 영업본부
│
├─ L2_team/
│  └─ {division}/{team}/
│     ├─ workflows-in-use.yaml          # 우리 팀이 자동화한 것
│     ├─ tone-overrides.md              # 우리 팀은 좀 더 캐주얼 등
│     ├─ rejected-defaults.md           # 우리 팀은 적용하지 않는 L0/L1 규칙 + 사유
│     └─ team-glossary.md
│
└─ L3_user/
   └─ {user-id}/
      ├─ profile.md                     # 역할, 직무, 경력
      ├─ preferences.md                 # 산출물 길이, 표/차트 선호
      ├─ personal-glossary.md
      └─ memory/                        # 과거 자동화 학습 (§6.5)
```

### 6.2 머지 규칙

```text
1) L3 → L2 → L1 → L0 순서로 머지
2) 같은 키 충돌 시: 하위 계층 값이 우선 (개인 > 팀 > 본부 > 전사)
3) 예외: L0의 다음 항목은 잠금 (override 불가)
     - security-policy.md
     - compliance-rules.yaml (PII 패턴, 발송 금지 채널)
4) 잠금 항목을 사용자가 override 시도하면 차단 + 정보보안팀에 자동 통지
```

### 6.3 컨텍스트 주입 정책

context-injector는 모든 단계에 L0~L3를 다 주입하지 않는다. **단계별로 필요한 부분만 선택**:

```text
① 데이터 수집:   L1 data-sources, L0 tool-policy
② 이상치 점검:   L1 kpis (정의 비교용)
③ KPI 산출:     L1 kpis, L1+division-overlay
④ 원인 가설:     L1 domain-terms, L2 team-glossary
⑤ 임원용 요약:   L1 stakeholders + tone-guide, L2 tone-overrides, L3 preferences,
                 L0 writing-house-style, L0 compliance (모든 단계 공통)
```

이 정책은 각 workflow-template의 `template.yaml`에 명시.

### 6.4 거버넌스

| 계층 | 수정 권한 | 승인 절차 |
|------|-----------|-----------|
| L0   | 정보보안팀, IT 거버넌스 | 별도 위원회 검토 |
| L1   | 본부 PO, 본부장 | 본부 내 검토 |
| L2   | 팀장 | 팀 내 검토 |
| L3   | 본인 | 없음 |

각 계층 수정 시 변경 이력이 `context-stack/{level}/CHANGELOG.md`에 자동 기록.

### 6.5 개인 메모리

L3 안에 사용자별 학습 메모리를 둔다. 매 자동화 실행마다 다음을 누적:

- 사용자가 선호한 표현·구조
- 사용자가 거부한 자동 추천
- 자주 실행한 워크플로 패턴
- 과거 자동화 프로젝트 요약

```yaml
# context-stack/L3_user/{user}/memory/learned-preferences.yaml
- id: prefer-table-over-bullet
  type: style
  confidence: high
  evidence_count: 7
  last_observed: 2026-05-10
  rule: "본 사용자는 5개 이상 항목을 나열할 때 표를 선호함"
```

`confidence`가 high가 되면 자동 반영, medium 이하는 사용자에게 확인 후 반영.

---

## 7. Quality Auto-Boost 시스템

비개발자가 노력 들이지 않고도 결과물 퀄리티가 올라가는 부분의 실체. 모든 워크플로의 단계 사이에 자동으로 끼는 booster.

### 7.1 Booster 목록 (v1)

| Booster | 자동 작동 시점 | 막아주는 사고 | 우선순위 |
|---------|----------------|--------------|---------|
| **PII Guard** | 모든 단계 입출력 | 학생 이름·연락처·수험번호 외부 노출 | 🔴 v1 필수 |
| **Source Anchor** | 숫자 생성 직후 | LLM의 숫자 추측. 근거 없으면 "확인 필요" 강제 | 🔴 v1 필수 |
| **Approval Gate** | 외부 발송 직전 | 자동 발송 사고 | 🔴 v1 필수 |
| **Schema Drift Detector** | 입력 데이터 로드 시 | 시트 컬럼명 변경 미탐지 | 🟡 v1.5 |
| **Tone Linter** | 최종 산출물 직전 | 본부 톤가이드 위반 | 🟡 v1.5 |
| **Hardcode Sniper** | 스킬 저장 시 | "이번 주 파일명" 박힘 → 다음 주 깨짐 | 🟡 v1.5 |
| **Format Consistency Checker** | 최종 산출물 직전 | 지난주 보고서와 형식 불일치 | 🟢 v2 |
| **Citation Validator** | 외부 자료 인용 시 | 가짜 인용·존재하지 않는 URL | 🟢 v2 |

### 7.2 Booster는 각각 별도 Skill

```text
core-skills/quality-booster/
├─ pii-guard/
│  ├─ SKILL.md
│  ├─ patterns/                     # L0 compliance-rules.yaml에서 패턴 로드
│  └─ scripts/scan.ts
├─ source-anchor/
├─ approval-gate/
└─ ...
```

각 booster가 별도 Skill인 이유: **사용자가 만든 user-skill에서도 그대로 재사용 가능**. 사용자 스킬도 자동으로 PII 보호를 상속받는다.

### 7.3 작동 방식

각 워크플로의 `quality-gates.yaml`에 어느 booster를 어느 단계에서 호출할지 명시. 대부분의 booster는 default-on, 사용자가 끄려면 명시적 의사 표시 필요.

```yaml
# workflow-templates/pm-weekly-status/quality-gates.yaml
default_boosters:
  - pii-guard          # 모든 단계
  - source-anchor      # 단계 3, 4
  - approval-gate      # 외부 발송 시
stage_specific:
  5-exec-summary:
    - tone-linter
    - format-consistency-checker
```

### 7.4 사용자가 의식하지 않는다는 것의 의미

booster는 **실패 시에만 사용자에게 알린다**. 통과하면 조용히 통과. 알림 예시:

```text
⚠️ PII Guard: 산출물에 학번으로 보이는 9자리 숫자 3건 발견
  → 마스킹 처리하시겠습니까? [예/아니오/확인]

⚠️ Source Anchor: '전월 대비 +12%' 수치의 출처를 찾지 못함
  → 자동으로 '확인 필요'로 표시했습니다. 보고서 12번째 줄을 확인하세요.
```

---

## 8. 스킬 시스템과 승격 경로

### 8.1 스킬 계층

```text
Level 1: Primitive Skill        단일 작업 (CSV 읽기, 표 구조 추론)
Level 2: Composite Skill        여러 primitive 조합 (보고서 초안 생성)
Level 3: Workflow Skill         하나의 업무 흐름 전체 (주간 보고서 자동화)
Level 4: Role Skill Pack        직군별 패키지 (기획자 팩, 영업 팩)
Level 5: User Custom Skill      사용자가 만든 특정 자동화
```

### 8.2 스킬 스코프

```yaml
scope_options:
  personal:      개인 업무 특화 (L3)
  team:          팀 공유 (L2)
  division:      본부 공유 (L1)
  org:           전사 공유 (core-skills로 승격)
```

### 8.3 Bottom-up 승격 경로

```text
[Step 1] 유저가 워크플로 3회 이상 성공 실행
            ↓
[Step 2] skill-creator 자동 제안
         "이 자동화를 'JiHwan/주간-가군-보고' 스킬로 저장할까요?"
            ↓
[Step 3] 저장 시 자동 수행
         - generalization-checker 실행 (§9)
         - 본부 공통 vs 개인 부분 자동 분리 제안
         - SKILL.md 자동 생성 (Agent Skills 표준)
            ↓
[Step 4] 승격 경로
         L3 personal → L2 team → L1 division → core-skills(전사)
         각 단계에서:
         - reviewer 1명 승인 (해당 계층 거버넌스 담당자)
         - generalization-checker 통과
         - PII Guard 통과
         - 일반화 등급 충족
```

승격 시 자동 리팩터링도 함께 수행:

```text
"현재 코드에 사용자명 'JiHwan'이 하드코딩되어 있습니다.
 L2_team 승격을 위해 이를 자동으로 환경변수로 분리하겠습니다."
```

### 8.4 스킬 레지스트리

```yaml
# registry/skills.yaml
skills:
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
    quality_gates:
      - pii-guard
      - source-anchor
      - tone-linter
    last_validated: 2026-05-15
    risk_level: medium
    promoted_from: L3_user/jihwan/weekly-gagun-report
```

---

## 9. Skill Creator & Generalization Checker

### 9.1 Skill Creator

사용자가 만든 자동화를 Agent Skills 표준 SKILL.md로 저장. 입력:

```text
- automation.yaml
- runbook.md
- scripts/
- templates/
- 최근 실행 로그 3회 이상
- 사용된 컨텍스트 스택 스냅샷
```

출력:

```text
user-skills/{user}/{skill}/
├─ SKILL.md              # Agent Skills 표준 frontmatter + 사용 가이드
├─ scripts/
├─ references/
├─ templates/
├─ quality-gates.yaml
└─ README.md
```

SKILL.md 예시:

```markdown
---
name: jihwan-weekly-gagun-report
summary: Generate the weekly Gagun (정시 가군) admission report.
description: 진학어플라이 가군기획팀 주간 보고. 컨텍스트 스택 L1=jinhakapply,
  L2=gagun-team이 자동 적용됩니다. 데이터 소스: 가군현황시트. 산출물: 1페이지 임원용.
scope: personal
inherits_quality_gates: [pii-guard, source-anchor, approval-gate, tone-linter]
---

# 주간 가군 보고

## 사용 시점
가군 접수 현황 주간 보고를 작성할 때.

## 필요 컨텍스트
- L1 진학어플라이 KPI 정의
- L2 가군기획팀 톤 override
- L3 본인 산출물 선호

## 워크플로
1. automation.yaml 로드
2. 컨텍스트 스택 머지
3. 가군현황시트에서 데이터 수집
4. 5단계 분해 실행 (pm-weekly-status workflow)
5. 품질 게이트 통과
6. 초안 저장 + 승인 게이트

## 안전 규칙
- 자동 발송 금지 (승인 필수)
- 학번 패턴 자동 마스킹
- 이전 보고서 덮어쓰기 금지
```

### 9.2 Generalization Checker

비개발자가 만든 스킬이 다음에도 작동하는지 자동 검증. **이것이 비개발자 자동화의 진짜 차별점이다.**

검증 항목 (v1):

```text
[하드코딩 탐지]
1. 파일명 하드코딩 (예: "2026-05-주간보고.csv")
2. 날짜 하드코딩
3. 사람 이름·고객명·캠페인명 하드코딩
4. 절대 경로
5. 특정 컬럼 순서 의존

[견고성]
6. 빈 값 처리 여부
7. 컬럼명 변화 대응 여부
8. 다른 샘플 파일로 재실행 통과 여부

[일반화]
9. 스킬 설명이 너무 특정 프로젝트에 종속됐는지
10. 본부 공통 부분 vs 개인 부분 분리 가능성
```

### 9.3 검증 알고리즘 (v1 명시)

이전 v0.1에서 vague했던 부분 구체화:

```text
[정적 분석 단계]
- 정규식·AST 분석으로 하드코딩 패턴 탐지
- 결정적 규칙, LLM 미사용

[동적 검증 단계]
- 사용자에게 다른 시점의 동일 유형 입력 파일 1개 요청
  (없으면 합성 데이터 자동 생성)
- 실제 재실행 → 통과 여부 측정

[LLM judge 단계]
- 산출물 품질을 이전 결과와 비교 (구조·톤·KPI 일치)
- judge는 본부 톤가이드를 기준으로 채점
```

### 9.4 재사용성 등급

```text
Level 0: 일회성 산출물
Level 1: 같은 파일 구조에서 재사용 가능
Level 2: 같은 업무 유형에서 재사용 가능
Level 3: 같은 본부의 여러 팀에서 재사용 가능 (L2 → L1 승격 후보)
Level 4: 여러 본부에서 일부 설정만 바꿔 재사용 가능 (L1 → core 승격 후보)
Level 5: 사내 공통 (core-skills)
```

### 9.5 자동 리팩터링 제안

문제를 찾는 것에서 끝나지 않고, 어떻게 일반화할지 제안:

```text
현재 코드:
  Slack 채널 "#gagun-team"이 send-report.ts에 하드코딩되어 있습니다.

제안:
  이 값을 automation.yaml의 outputs.slack.channel로 분리합니다.
  L2_team/jinhakapply/gagun-team/team-config.yaml에서 기본값 제공.

승인하시겠습니까? [예/아니오/직접수정]
```

---

## 10. Agent Skills 표준 호환 전략

### 10.1 본체는 표준 그 자체

본체 자산은 Agent Skills 공식 규격을 그대로 따른다.

```text
SKILL.md (frontmatter: name, summary, description)
+ scripts/
+ references/
+ templates/
```

### 10.2 도구별 Adapter

각 AI 도구별로 "이 스킬 폴더를 어디에 두고 어떻게 로드하는지"만 적은 install 가이드.

```text
adapters/claude-code/install.md       # ~/.claude/skills/ 또는 .claude-plugin/
adapters/cursor/install.md            # .cursor/rules/ 또는 .cursor/commands/
adapters/codex/install.md             # codex의 skill 디렉토리
adapters/antigravity/install.md
adapters/copilot/install.md           # .github/skills/
```

각 install.md는 명령어 한 줄 + 디렉토리 매핑 1개 + 인증 안내 정도. 1쪽 이상 길어지면 본체 설계가 잘못된 것.

### 10.3 도구 기능 차이 처리

도구별로 표현력이 다르다. 처리 원칙:

| 차이 | 처리 |
|------|------|
| 어느 도구에나 있는 기능 (skill 로드, 파일 읽기) | core에서 사용 |
| 일부 도구에만 있는 기능 (Claude Code hooks, MCP, command) | optional. 없으면 graceful fallback |
| 도구별 advanced 기능 | 본체에 안 넣음. 도구별 community skill로 분리 |

### 10.4 Adapter 두께 한계선 (v0.2에서 신규 명시)

이전 v0.1에서 미해결이었던 트레이드오프:

```text
규칙 1: adapter는 install.md + 선택적 hook 1~2개 이상이면 안 됨
규칙 2: 본체 변경 시 모든 adapter가 1시간 내에 동기화 가능해야 함
규칙 3: 도구별 advanced 기능은 본체가 모르는 채로 add-on
규칙 4: lowest common denominator 회피를 위해 도구별 add-on 권장
        (예: Claude Code 사용자만을 위한 hook 기반 자동 trigger)
```

### 10.5 Exporter

```text
/auto:export claude-code
/auto:export cursor
/auto:export codex
```

본체 자산을 도구별 형식으로 패키징해서 출력. 사용자는 출력물을 자기 도구에 복사만 하면 됨.

---

## 11. 검증·디버깅 레이어

### 11.1 검증 단계 (모든 자동화 공통)

```text
preflight:                실행 전 준비 상태 확인
input validation:         입력 파일·컬럼·권한 확인
context validation:       L0~L3 머지 결과 검증, 충돌 감지
dry run:                  외부 발송·수정 없이 실행
output validation:        산출물 품질 (booster 자동 호출)
safety validation:        PII·발송 권한 확인
generalization check:     다른 입력에서도 작동하는지 (스킬 저장 시)
human approval:           사용자 승인
delivery:                 저장 또는 발송
post-run summary:         실행 결과와 개선점 자동 저장
```

### 11.2 Debug Assistant

에러를 업무 언어로 번역. 비개발자에게 raw 에러 던지지 않음.

```text
문제:
  사내 시트에서 데이터를 가져오지 못했습니다.

확인된 원인:
  - 시트 이름 "가군현황2026"을 찾을 수 없습니다.
  - 사내 위키에서 이 시트의 이름이 "가군현황_2026"으로 변경된 것이 확인됩니다.

자동으로 시도한 것:
  - automation.yaml의 sheet_name을 자동 수정 후보로 표시했습니다.
  - 변경을 승인하시겠습니까?
```

### 11.3 실행 상태 기록

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
    - CTR 컬럼에 결측 3건
    - 가군 정의가 L1 최신 버전과 일치하지 않음 (자동 동기화 필요)
  next_actions:
    - 결측값을 제외할지 사용자 확인
```

---

## 12. 안전 설계 (사내 환경)

### 12.1 기본 안전 정책

```text
1. 외부 발송은 기본 비활성화
2. 삭제·덮어쓰기·대량 수정은 이중 승인
3. PII 감지 시 발송 차단
4. API key·token은 코드에 저장 금지 (사내 secret manager 사용)
5. L0 잠금 항목 override 시도는 차단 + 정보보안팀 통지
6. 사내 시스템 외 공개 배포 차단 (사외 URL 차단)
7. dry-run 기본 실행
8. 모든 실행에 input snapshot + output log 저장
9. 실패 시 복구 안내 자동 생성
10. 사용자가 이해할 수 있는 언어로 에러 번역
```

### 12.2 PII 정책 (진학사 특화)

L0 `compliance-rules.yaml`에 박힘:

```yaml
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

### 12.3 권한 모델 (사내 시스템 연동)

```text
- 사내 Google Workspace: 최소 권한 (특정 시트·폴더 범위)
- 사내 데이터베이스: 읽기 전용 우선, write는 별도 승인
- 사내 위키: 읽기는 허용, 쓰기는 본부장 승인
- 사외 SaaS: v1 미포함 (v2+ 검토)
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
```

### 13.2 skill-card.yaml

```yaml
id: jihwan-weekly-gagun-report
name: 진학어플라이 가군 주간 보고
scope: personal
division: jinhakapply
team: gagun-team
workflow_pack: pm-weekly-status
reusability_level: 2
inherits_quality_gates: [pii-guard, source-anchor, tone-linter, approval-gate]
context_dependencies:
  - L0_org (필수)
  - L1_division/jinhakapply (필수)
  - L2_team/jinhakapply/gagun-team (선택, 권장)
last_validated: 2026-05-15
last_run: 2026-05-15
risk_level: medium
promotion_status:
  L2_candidate: true
  L2_review_pending: false
```

### 13.3 컨텍스트 메모리 아이템

```yaml
id: gagun-definition
type: domain_term
layer: L1_division/jinhakapply
source: 본부 PO 직접 입력
confidence: locked   # 본부 정의는 잠금
content: |
  가군: 정시 모집 가군. 수시 차수와 혼동 금지.
  나군, 다군과 함께 정시 3개 군 구성.
last_verified: 2026-05-01
applies_to: [pm-weekly-status, pm-data-analysis-brief]
```

---

## 14. 기획자 MVP

### 14.1 MVP 범위 (1×1×1×1 원칙)

| 차원 | MVP 선택 | 근거 |
|------|----------|------|
| 본부 | 진학어플라이 1개 | 데이터·이해관계자 명확, 정량 KPI 풍부 |
| 팀 | 가군기획팀(또는 동급 1팀) | 사용자 그룹 좁힘 |
| 직무 | 기획자 | 사용자 지정 |
| 워크플로 | 3개 | 기획자 반복 업무 top |
| AI 도구 | 2개 (실측 후 결정) | 사내 분포 top 2 |
| Quality Booster | 3개 (PII Guard, Source Anchor, Approval Gate) | 사내 사고 방지 최우선 |
| Skill화 | on | 핵심 가치 증명 |

### 14.2 MVP 워크플로 3개

1. **pm-weekly-status**: 주간 진행 보고 (가군 접수 현황 등)
2. **pm-policy-monitoring**: 입시 정책 변경 모니터링 (도메인 특화, 진학사 강점)
3. **pm-user-interview-synthesis**: 사용자 피드백·인터뷰 정리

선정 기준: 빈도 + 분해 가능성 + 도메인 결합 가치.

### 14.3 MVP에 포함하되 비워둠 (구조만 미리)

```text
L1_division/{jinhakdotcom, catch, blacklabel, sales}/  # 빈 폴더 + 템플릿
workflow-templates/{pm-prd-drafting, pm-data-analysis-brief, ...}/  # 나중에 추가
adapters/{antigravity, copilot}/                                    # v2
```

빈 폴더라도 미리 만들어두면 신규 본부 추가 = 파일 채우기.

### 14.4 MVP에서 제외

```text
- 대시보드·웹앱 (v2+ 기술 부채)
- 외부 SaaS 자동 발송
- 사내 DB write-back
- retrieval-index (임베딩) → 단순 grep + frontmatter 시작
- Slack·Notion 자동 발송 → 초안 생성까지만
```

### 14.5 MVP 성공 기준

```text
- 첫 자동화 성공까지 30분 이내 (신규 사용자)
- 3회 실행 후 스킬화까지 1클릭
- 다음 주 재실행 성공률 90% 이상
- PII 노출 0건
- 사용자 보고서 수동 수정량 50% 이하
```

---

## 15. 수평 확장 설계

### 15.1 확장 단위별 작업량

| 추가 사항 | 작업 | 비용 |
|-----------|------|------|
| 신규 본부 | `L1_division/{name}/` 6개 파일 채움 | 본부 PO 1일 |
| 신규 팀 | `L2_team/{div}/{team}/` 생성 | 팀장 30분 |
| 신규 직무 (예: 디자이너) | `workflow-templates/designer-*/` 3~5개 추가 | 디자이너 + 하네스팀 1주 |
| 신규 AI 도구 지원 | `adapters/{tool}/install.md` 1장 | 1일 |
| 신규 booster | `core-skills/quality-booster/{name}/` 1개 추가 | 1~2주 |
| 신규 워크플로 (공통) | `workflow-templates/{name}/` 추가 | 1~2주 |
| 본부별 override | `division-overlays/{div}/{wf}.override.yaml` 1개 | 본부 PO 반나절 |

### 15.2 핵심 원칙

- **본부·팀 추가는 코드 변경 0**: 폴더 채우기만.
- **직무·워크플로 추가는 본체 무수정**: workflow-templates 폴더에 추가.
- **AI 도구 추가는 install.md 1장**.

### 15.3 수평 확장 검증

분기별로 다음을 측정:

```text
- 신규 본부 1개 추가 실제 소요 시간 (목표: < 2일)
- 신규 직무 워크플로 1개 추가 실제 소요 시간 (목표: < 1주)
- 본체 코드 변경 없이 확장된 비율 (목표: > 90%)
```

목표 미달 시 구조 재검토.

---

## 16. 예시 시나리오 (진학사 도메인)

### 16.1 진학어플라이 가군 주간 보고

```text
사용자: 가군기획팀 기획자 김지환

입력: "이번 주 가군 접수 현황 보고서"

자동 동작:
  1) task-decomposer: pm-weekly-status 5단계 분해
  2) context-injector:
     - L0: PII 마스킹, 외부 공유 금지
     - L1 jinhakapply: 가군 정의, 본부장 = OOO, KPI = 접수율/결제완료율
     - L1 overlay: 가군은 정시 가군으로만 표기
     - L2 가군기획팀: 톤 = 임원용 1페이지
     - L3 김지환: 표 선호
  3) prompt-composer: 5단계 프롬프트 합성
  4) quality-booster: PII Guard + Source Anchor + Approval Gate
  5) 초안 + 검증 리포트 + 승인 게이트

3회 성공 실행 후:
  → skill-creator가 'jihwan-weekly-gagun-report' 스킬 자동 제안
  → generalization-checker: 김지환 개인 부분 자동 분리
  → "가군기획팀 누구나 쓸 수 있는 형태로 만들 수 있습니다. L2 승격 제안하시겠습니까?"
```

### 16.2 진학닷컴 입시 정책 변경 모니터링

```text
사용자: 진학닷컴 콘텐츠팀

입력: "이번 주 발표된 입시 정책 변경 사항 정리"

자동 동작:
  - workflow-templates/pm-policy-monitoring 적용
  - L1 jinhakdotcom: 모니터링 대상 = 교육부, 17개 시도교육청, 주요 대학
  - L1 도메인 용어: 학종, 정시, 수시, 입학사정관제 정의
  - Citation Validator booster: 가짜 URL·인용 차단
  - 초안 + 변경 사항 표 + 원문 링크
```

### 16.3 캐치 사용자 인터뷰 정리

```text
사용자: 캐치 PM

입력: "지난주 진행한 사용자 인터뷰 5건 요약"

자동 동작:
  - workflow-templates/pm-user-interview-synthesis 적용
  - L0: PII Guard 강하게 작동 (인터뷰이 신상 마스킹)
  - L1 catch: 사용자 페르소나 = 취준생/이직자, KPI = 활성도/매칭률
  - 5건 → 공통 페인포인트 / 차별점 / 액션 아이템으로 정리
  - 인용은 익명 처리, 원문은 사내 저장소만
```

---

## 17. 거버넌스와 운영

### 17.1 역할 정의

| 역할 | 책임 |
|------|------|
| 하네스팀 (운영자) | core-skills 유지보수, workflow-templates 추가, booster 개발 |
| 정보보안팀 | L0 보안 정책·컴플라이언스 규칙 관리, 잠금 항목 검토 |
| 본부 PO | L1 컨텍스트 관리, 본부 워크플로 override 작성 |
| 팀장 | L2 컨텍스트 관리, 팀 스킬 승격 승인 |
| 일반 사용자 | L3 개인 컨텍스트, 본인 자동화·스킬 작성 |

### 17.2 스킬 승격 승인 라인

```text
L3 personal → L2 team:        팀장 승인
L2 team → L1 division:        본부 PO 승인
L1 division → core (전사):    하네스팀 + 정보보안팀 공동 승인
```

각 단계에서 자동 검증(generalization-checker, PII Guard 등) 통과는 필수, 검토자는 그 위에서 도메인 적합성만 판단.

### 17.3 변경 관리

- 모든 계층 변경은 `CHANGELOG.md`에 자동 기록
- core-skills 변경은 분기별 릴리스 노트 발행
- L0 변경은 전사 공지

### 17.4 사용자 지원

- 사내 위키에 사용 가이드
- 사내 채널: 하네스팀 운영
- 신규 본부 온보딩: 본부 PO 대상 0.5일 워크숍

---

## 18. 성공 지표

### 18.1 사용자 성공

```text
- 첫 자동화 성공까지 걸리는 시간 (목표: 30분)
- 신규 사용자 7일 retention (목표: 60%)
- 사용자가 직접 수정해야 한 부분 비율 (목표: 30% 이하)
- 자동화 재실행 성공률 (목표: 90% 이상)
- 사용자가 이해한 에러 메시지 비율 (목표: 90% 이상)
- 발송 전 검수에서 발견된 문제 수 (높을수록 booster 효과)
```

### 18.2 시스템 품질

```text
- 스킬 재사용성 평균 등급 (목표: Level 2 이상)
- 하드코딩 자동 탐지율 (목표: 95%)
- PII 탐지율 (목표: 99% 이상)
- 컨텍스트 머지 정확도
- 본부별 override 적용 정확도
```

### 18.3 확장 지표

```text
- 활성 본부 수
- 활성 팀 수
- 활성 사용자 수 (월간)
- 사용자 생성 스킬 수
- L3 → L2 → L1 → core 승격 누적 수
- workflow-template 수
- AI 도구 adapter 수
```

### 18.4 안전 지표

```text
- PII 노출 사고: 0건 (절대 기준)
- L0 잠금 항목 override 시도: 0건 또는 즉시 차단
- 미승인 외부 발송: 0건
- 자동 발송 사고: 0건
```

---

## 19. 리스크와 대응

### 19.1 범위 과다

리스크: 5개 본부 × 다직무 × 다워크플로를 처음부터 지원하려 하면 출시가 늦어진다.

대응: MVP는 진학어플라이 1본부 × 기획자 × 3워크플로. 구조만 수평 확장 가능하게 미리 짜둠.

### 19.2 도구 표준 분화

리스크: Agent Skills 표준이 도구별로 분화되면 본체 호환성이 깨진다.

대응: 본체는 가장 안정적인 공통 부분만 사용. 도구별 advanced 기능은 본체 외부에서 add-on. Adapter 두께 한계선(§10.4) 명문화.

### 19.3 L1 컨텍스트 관리 부담

리스크: 본부 PO가 L1 컨텍스트를 잘 채워주지 않으면 자동화 품질이 떨어진다.

대응: 신규 본부 온보딩 워크숍 + 본부별 진단 대시보드 (L1 완성도 점수 표시). 사용자가 자주 묻는 질문이 자동으로 L1 후보로 누적.

### 19.4 PII·보안 사고

리스크: 학생 정보 등 민감정보 노출.

대응: L0 잠금, PII Guard 모든 단계 자동 호출, 사고 시 정보보안팀 즉시 통지. 사외 SaaS 연동은 v1 제외.

### 19.5 일반화되지 않은 사용자 스킬

리스크: 한 파일에만 맞는 스킬이 승격되어 팀 자산 오염.

대응: generalization-checker를 승격 게이트로 강제. Level 2 미만은 L2 승격 차단.

### 19.6 메모리·컨텍스트 오염

리스크: 잘못된 과거 정보가 새 자동화에 자동 적용.

대응: 모든 메모리 아이템에 source, confidence, last_verified, applies_to 필수. confidence가 medium 이하면 사용자 확인 후 적용.

### 19.7 사용자 학습 곡선

리스크: 비개발자가 yaml·폴더 구조를 직접 다루지 못함.

대응: yaml·폴더는 도구가 다룸. 사용자는 자연어 인터페이스만 사용. 단, L3 preferences 정도는 UI 또는 대화형으로 수정 가능.

---

## 20. 개발 로드맵

### Phase 1: Core Harness (Month 1~2)

```text
- Agent Skills 표준 자산 구조 확정
- core-skills: task-decomposer, context-injector, prompt-composer 초안
- L0 진학사 보안·컴플라이언스 작성 (정보보안팀 협업)
- L1 진학어플라이 작성 (본부 PO 인터뷰)
- L3 사용자 프로파일 구조
```

### Phase 2: Quality Booster (Month 2~3)

```text
- PII Guard, Source Anchor, Approval Gate 구현
- 모든 워크플로 자동 통합
- 사고 0건 검증
```

### Phase 3: 기획자 MVP 워크플로 (Month 3~4)

```text
- pm-weekly-status, pm-policy-monitoring, pm-user-interview-synthesis
- division-overlays/jinhakapply 작성
- 가군기획팀 베타 사용자 5명
```

### Phase 4: Skill Creator + Generalization Checker (Month 4~5)

```text
- 스킬화 자동 제안
- generalization-checker 정적·동적·LLM judge 통합
- L3 → L2 승격 시범
```

### Phase 5: Adapter 확장 + 본부 확장 (Month 5~6)

```text
- AI 도구 adapter 2~3개
- 진학닷컴, 캐치 본부 L1 작성
- 추가 워크플로 (pm-data-analysis-brief, pm-meeting-summary)
```

### Phase 6: 확장 안정화 (Month 6+)

```text
- 신규 직무 워크플로 (디자이너, 운영, HR, 재무)
- L1 → core 승격 거버넌스 가동
- 대시보드·웹앱 등 v2 기능 검토
```

---

## 21. 미결정 사항 (다음 결정 라운드)

1. **MVP 본부·팀 확정**: 진학어플라이 / 가군기획팀이 맞는지, 다른 본부가 더 시급한지 본부장 인터뷰 필요.
2. **사내 AI 도구 분포 실측**: 비개발자들이 실제로 쓰는 도구 분포 (설문 또는 IT 데이터). MVP adapter 우선순위 결정.
3. **L0 작성 주체와 일정**: 정보보안팀과 협업 시점.
4. **사내 저장소 결정**: GitHub Enterprise / 사내 GitLab / 공유 드라이브 중 어디에 본체와 사용자 스킬을 둘 것인지. 보안 정책 검토.
5. **하네스팀 인력 구성**: 운영자, 워크플로 작성자, 컨텍스트 큐레이터.
6. **임베딩·검색 인프라**: v1은 grep 기반, v2에서 검색 인프라 도입 여부.
7. **사내 시스템 연동 API**: 진학사 내부 데이터베이스·시트·위키에 접근 방법 (전용 API vs 권한 위임).

---

## 22. v0.1 → v0.2 변경 요약

| 영역 | v0.1 | v0.2 |
|------|------|------|
| 본체 정의 | "공통 자산 + AI adapter"로 모호 | **Agent Skills 표준 그 자체** |
| 핵심 가치 | "비개발자 자동화 빌더" 일반론 | **세 가지 갭(분해·결합·프롬프트 품질) 자동 해결** |
| 컨텍스트 모델 | role-pack / workflow-pack 평면 구조 | **L0~L3 계층 컨텍스트 + 진학사 본부 구조** |
| Quality | 검증 항목 나열, 옵션처럼 표현 | **booster layer로 default-on, 별도 Skill화** |
| MVP 범위 | 3직군 × 3워크플로 × 8도구 × 3 adapter (광범위) | **1본부 × 1팀 × 3워크플로 × 2 adapter** |
| 대시보드 | 핵심 기능 (§6 전체) | **v2+ 기술 부채로 분리** |
| 스킬 승격 | 개념만 언급 | **L3 → L2 → L1 → core 명시적 경로 + 거버넌스** |
| Generalization Checker | 검증 항목만 나열, 알고리즘 vague | **정적·동적·LLM judge 3단계 명시** |
| Adapter 두께 | 미정 | **두께 한계선 명문화 (install.md 1쪽)** |
| automation.yaml ↔ scripts 동기화 | 미정 | (v0.3에서 결정 예정 — §21에 잔존 이슈로 명시) |
| 도메인 특화 | 일반론 | **진학사 본부·도메인 용어 반영** |
| 거버넌스 | 미정 | **§17에서 역할·승인 라인 정의** |

---

## 23. 최종 권장 설계

```text
본체:
  Agent Skills 표준 + core-skills + 계층 컨텍스트(L0~L3)

확장:
  workflow-templates, division-overlays, adapters/

품질:
  Quality Booster layer (default-on, 별도 skill화)

사용자 자산:
  user-skills → promoted-skills (Bottom-up 승격)

운영:
  하네스팀 / 정보보안팀 / 본부 PO / 팀장 / 사용자 4단 거버넌스
```

가장 중요한 설계 판단:

```text
1. Claude Code plugin이나 Cursor extension을 본체로 만들지 않는다.
   본체는 Agent Skills 표준 그 자체다.
2. 컨텍스트는 평면이 아니라 4단 계층이다. 진학사 본부 구조가 그대로 들어간다.
3. Quality Booster는 옵션이 아니라 default layer다. 사용자가 의식하지 않는다.
4. 대시보드·웹앱은 v1에 없다. 핵심 약속(품질 자동 부스팅)에 집중한다.
5. 사용자 스킬은 자동으로 팀·본부 자산으로 승격될 수 있다. 사내 자동화 라이브러리가
   bottom-up으로 쌓인다.
6. 신규 본부·팀·직무 추가에 본체 코드 변경이 없다. 수평 확장은 폴더 채우기다.
```

이 설계의 약속은 다음과 같다: **진학사 기획자가 평소 말로 업무를 설명하면, 회사·본부·팀·개인 컨텍스트가 자동으로 결합되고, 검증된 프롬프트 패턴이 자동으로 합성되며, PII·숫자 출처·톤·일반화 검증이 자동으로 작동해서, 사용자가 의식하지 않아도 결과물 퀄리티가 올라간다.** 그리고 그 자동화는 다음 주에도 작동하며, 잘 만든 것은 팀과 본부의 자산으로 자연스럽게 승격된다.

# 비개발자용 업무 자동화 하네스 설계 문서 v0.1

## 0. 문서 목적

이 문서는 개발 지식이 부족한 비개발자가 자신의 반복 업무, 보고서, 대시보드, 현황판, 문서 생성, SaaS 연동, 내부 도구 제작을 AI와 함께 안정적으로 자동화할 수 있도록 돕는 도구를 설계하기 위한 초안이다.

이 도구는 특정 AI 제품 하나에 종속되지 않는다. Claude Code, Codex, Cursor, Antigravity, GitHub Copilot 등 다양한 AI 도구에서 재사용 가능한 공통 구조를 중심으로 설계한다.

핵심 목표는 다음과 같다.

1. 사용자가 자동화하고 싶은 업무를 잘 설명하지 못해도, 인터뷰를 통해 자동화 가능한 구조로 바꾼다.
2. 자동화 과정, 입력 파일, 산출물, 의사결정, 검증 결과를 로컬 폴더에 체계적으로 관리한다.
3. 보고서 자동화뿐 아니라 대시보드, 현황판, 간단한 웹앱 제작까지 지원한다.
4. 한 번 만든 자동화를 재사용 가능한 스킬로 저장한다.
5. 저장된 스킬의 일반화 가능성과 재사용성을 검증한다.
6. 다양한 직군과 업무 유형을 수평, 수직으로 확장할 수 있게 한다.
7. 디버깅, 테스트, 검증, 안전장치를 사용자가 의식하지 않아도 기본 프로세스에 포함한다.

---

## 1. 제품 정의

### 1.1 한 문장 정의

**비개발자의 반복 업무를 인터뷰, 설계, 구현, 검증, 재사용 가능한 스킬 생성까지 이어주는 멀티 AI 도구 호환 업무 자동화 하네스.**

### 1.2 제품의 본질

이 도구는 단순히 코드를 생성하는 도구가 아니다. 사용자의 업무를 자동화 가능한 시스템으로 번역하는 도구다.

비개발자는 보통 다음에서 막힌다.

- 무엇을 자동화할 수 있는지 판단하지 못한다.
- 필요한 입력 자료와 데이터 구조를 알지 못한다.
- 반복 업무의 예외 규칙을 명확히 표현하지 못한다.
- 어떤 도구를 연결해야 하는지 모른다.
- API 키, OAuth, 권한, 로컬 실행 환경에서 막힌다.
- 생성된 코드가 왜 안 되는지 디버깅하지 못한다.
- 한 번 만든 자동화를 다음에도 안정적으로 재사용하지 못한다.
- 특정 파일에만 맞게 만들어진 스크립트가 일반화되지 않는 문제를 알아차리지 못한다.

따라서 이 도구의 본질은 “AI가 코딩해주는 것”이 아니라 다음에 있다.

```text
업무 인터뷰
→ 업무 구조화
→ 자료 수집
→ 자동화 명세 생성
→ 필요한 도구 연결
→ 로컬 실행 자산 생성
→ 테스트와 검증
→ 대시보드 또는 보고서 등 산출물 생성
→ 스킬화
→ 재사용성 검증
→ 다른 AI 도구로 이식
```

---

## 2. 핵심 설계 원칙

### 2.1 AI 도구 중립성

Claude Code plugin, Codex plugin, Cursor rules, Antigravity skills, Copilot skills 중 하나를 본체로 삼지 않는다. 본체는 공통 스펙과 폴더 구조다.

중심 자산은 다음이다.

- `SKILL.md`
- `automation.yaml`
- `memory/`
- `role-packs/`
- `workflow-packs/`
- `tool-adapters/`
- `validation/`
- `ai-adapters/`

각 AI 도구는 이 공통 자산을 실행하는 어댑터 역할만 한다.

### 2.2 업무 유형과 직군의 분리

직군과 업무 유형을 분리해야 확장이 쉽다.

예를 들어 “주간 보고서”는 마케팅, 영업, HR, 재무, 운영, 제품, CS 모두에게 존재한다. 단지 입력 데이터, KPI, 말투, 수신자, 도구가 다를 뿐이다.

따라서 구조는 다음처럼 나눈다.

```text
role-pack: 마케팅, 영업, HR, 재무, 운영, 제품, 디자인, 법무, 고객지원
workflow-pack: 보고서, 대시보드, 이메일 다이제스트, CRM 업데이트, 리서치, 회의 요약, 문서 생성
```

### 2.3 초안 생성 우선, 자동 실행은 후순위

비개발자용 자동화는 처음부터 완전 자동 발송, 자동 삭제, 자동 수정으로 가면 위험하다.

기본값은 다음이다.

```text
1단계: 초안 생성
2단계: 사용자 검토
3단계: 승인 후 저장
4단계: 승인 후 발송
5단계: 충분히 검증된 뒤 일정 자동 실행
```

### 2.4 모든 과정은 로컬 폴더에 남긴다

사용자가 AI와 대화한 결과만 남기면 재사용성이 낮다. 자동화 과정은 폴더, 명세 파일, 실행 로그, 결정 기록으로 남아야 한다.

```text
무엇을 만들었는지
왜 그렇게 만들었는지
어떤 파일을 참고했는지
어떤 도구를 연결했는지
어떤 테스트를 통과했는지
어디까지 자동화되었는지
다음에 어떻게 실행하는지
```

이 정보가 남아야 사용자가 같은 자동화를 다음에도 실행할 수 있고, 다른 AI 도구로 옮길 수 있다.

### 2.5 검증과 디버깅은 선택 기능이 아니라 기본 기능

비개발자가 가장 막히는 부분은 생성 자체가 아니라, 생성된 것이 제대로 작동하는지 판단하는 단계다.

따라서 모든 워크플로에는 다음이 기본 포함되어야 한다.

- 입력 파일 검증
- 누락 데이터 탐지
- 스키마 검증
- 샘플 데이터 테스트
- 숫자 출처 대조
- 민감정보 탐지
- 자동 발송 전 승인
- 스크립트 일반화 가능성 검증
- 다른 입력 파일로 재실행 테스트
- 실패 시 복구 가이드 생성

---

## 3. 전체 아키텍처

```text
nondev-automation-harness/
├─ core/
│  ├─ intake/
│  ├─ planning/
│  ├─ memory/
│  ├─ workflow-schema/
│  ├─ validation/
│  ├─ debugging/
│  ├─ safety/
│  └─ skill-factory/
│
├─ skills/
│  ├─ automation-intake/
│  ├─ reference-ingestion/
│  ├─ memory-retrieval/
│  ├─ workflow-designer/
│  ├─ dashboard-builder/
│  ├─ report-builder/
│  ├─ tool-connector-guide/
│  ├─ script-builder/
│  ├─ qa-runner/
│  ├─ debug-assistant/
│  ├─ skill-creator/
│  ├─ skill-generalization-checker/
│  └─ adapter-exporter/
│
├─ role-packs/
│  ├─ marketing/
│  ├─ sales/
│  ├─ product/
│  ├─ design/
│  ├─ finance/
│  ├─ hr/
│  ├─ operations/
│  ├─ legal/
│  ├─ customer-support/
│  └─ founder/
│
├─ workflow-packs/
│  ├─ weekly-report/
│  ├─ dashboard/
│  ├─ tracker/
│  ├─ digest/
│  ├─ research-brief/
│  ├─ meeting-summary/
│  ├─ content-calendar/
│  ├─ crm-workflow/
│  ├─ candidate-screening/
│  └─ financial-reconciliation/
│
├─ tool-adapters/
│  ├─ google-drive/
│  ├─ google-sheets/
│  ├─ google-docs/
│  ├─ gmail/
│  ├─ slack/
│  ├─ notion/
│  ├─ airtable/
│  ├─ hubspot/
│  ├─ salesforce/
│  ├─ figma/
│  ├─ linear/
│  ├─ jira/
│  ├─ supabase/
│  ├─ vercel/
│  ├─ zapier/
│  └─ n8n/
│
├─ webapp-templates/
│  ├─ nextjs-dashboard/
│  ├─ internal-tool/
│  ├─ tracker-app/
│  ├─ approval-console/
│  └─ report-portal/
│
├─ ai-adapters/
│  ├─ claude-code/
│  ├─ codex/
│  ├─ cursor/
│  ├─ antigravity/
│  └─ copilot/
│
├─ templates/
│  ├─ automation-project/
│  ├─ skill/
│  ├─ report/
│  ├─ dashboard/
│  ├─ runbook/
│  └─ validation-suite/
│
└─ examples/
   ├─ marketing-weekly-report/
   ├─ sales-pipeline-dashboard/
   ├─ hr-candidate-tracker/
   ├─ finance-expense-report/
   ├─ design-review-digest/
   └─ customer-support-ticket-dashboard/
```

---

## 4. 핵심 개념 모델

### 4.1 Automation Project

사용자가 만드는 하나의 자동화 단위다.

예시:

- 매주 성장팀 보고서 작성
- 영업 파이프라인 대시보드 만들기
- 채용 후보자 현황판 만들기
- CS 티켓 요약 메일 만들기
- 월간 비용 리포트 만들기

각 자동화는 자체 폴더를 가진다.

```text
automations/
└─ weekly-growth-report/
   ├─ automation.yaml
   ├─ README.md
   ├─ status.md
   ├─ runbook.md
   ├─ memory/
   ├─ intake/
   ├─ references/
   ├─ sources/
   ├─ outputs/
   ├─ scripts/
   ├─ app/
   ├─ tests/
   ├─ runs/
   └─ generated-skill/
```

### 4.2 Skill

하나의 재사용 가능한 능력이다.

예시:

- 보고서 초안 생성
- CSV 파일 구조 파악
- Google Sheets 연결 안내
- Next.js 대시보드 생성
- 기존 보고서 말투 분석
- 자동화 일반화 가능성 검증

스킬은 가능하면 Agent Skills 형식을 따른다.

```text
skills/
└─ report-builder/
   ├─ SKILL.md
   ├─ references/
   ├─ scripts/
   └─ templates/
```

### 4.3 Workflow Pack

여러 직군에서 재사용 가능한 업무 유형 패키지다.

예시:

```text
workflow-packs/weekly-report/
├─ intake-questions.yaml
├─ output-sections.yaml
├─ validation-checklist.md
├─ templates/
└─ skill-map.yaml
```

### 4.4 Role Pack

직군별 지식, KPI, 산출물 관습, 말투, 도구, 예외 규칙을 담는다.

예시:

```text
role-packs/marketing/
├─ common-metrics.md
├─ common-tools.yaml
├─ report-patterns.md
├─ dashboard-patterns.md
├─ tone-guides.md
└─ workflows.yaml
```

### 4.5 Tool Adapter

외부 도구를 연결하는 설정, 안내, 테스트 스크립트, 권한 설명을 포함한다.

```text
tool-adapters/google-sheets/
├─ setup-guide.md
├─ auth-requirements.md
├─ connection-test.ts
├─ fetch-sample.ts
├─ schema-detection.ts
└─ safety-rules.md
```

### 4.6 AI Adapter

공통 자산을 각 AI 도구에서 쓰기 위한 얇은 포장 계층이다.

```text
ai-adapters/claude-code/
├─ .claude-plugin/
├─ commands/
├─ hooks/
└─ agents/

ai-adapters/cursor/
├─ .cursor/rules/
├─ .cursor/commands/
└─ mcp.json

ai-adapters/copilot/
├─ .github/copilot-instructions.md
├─ .github/skills/
└─ AGENTS.md
```

---

## 5. 사용자 경험 흐름

### 5.1 시작

사용자 입력:

```text
매주 작성하는 마케팅 성과 보고서를 자동화하고 싶어.
```

도구 응답:

```text
먼저 자동화 프로젝트를 만들겠습니다.
이 자동화는 보고서 유형으로 보입니다.
직군은 마케팅으로 추정됩니다.

아래 정보를 차근차근 확인하겠습니다.
1. 보고서를 보는 사람
2. 보고서 작성 주기
3. 기존 보고서 샘플
4. 데이터가 있는 위치
5. 최종 저장 위치
6. 자동 공유 여부
```

### 5.2 프로젝트 생성

```text
automations/marketing-weekly-report/
├─ automation.yaml
├─ intake/open-questions.md
├─ references/previous-reports/
├─ references/business-context/
├─ sources/manual-files/
└─ status.md
```

### 5.3 파일 업로드 안내

도구는 사용자가 이해할 수 있는 언어로 폴더에 파일을 넣게 한다.

```text
이전 보고서가 있다면 여기에 넣어주세요.

automations/marketing-weekly-report/references/previous-reports/

이번 주 데이터 CSV나 Excel 파일이 있다면 여기에 넣어주세요.

automations/marketing-weekly-report/sources/manual-files/
```

### 5.4 레퍼런스 분석

도구는 파일을 읽고 다음을 추출한다.

- 반복되는 섹션
- 자주 쓰는 KPI
- 말투
- 보고서 길이
- 표와 차트 패턴
- 수신자 수준
- 내부 용어
- 누락된 정보

결과는 다음에 저장한다.

```text
intake/reference-analysis.md
memory/domain-terms.md
memory/output-style.md
memory/metric-definitions.md
```

### 5.5 도메인 정보 추가 질문

```text
분석 결과 다음 정보가 부족합니다.

1. 전환율의 내부 정의가 무엇인가요?
2. 목표 대비 실적을 표시할 때 빨간색 기준은 몇 퍼센트 이하인가요?
3. 보고서 수신자는 실무자인가요, 임원인가요?
4. 원인 분석이 없을 때 추측을 허용하나요, 아니면 “원인 확인 필요”로 표시해야 하나요?
```

### 5.6 도구 연결 추천

```text
이 자동화는 다음 도구를 연결하면 편해집니다.

1. Google Sheets
   목적: 매주 데이터를 자동으로 가져오기
   권한: 특정 스프레드시트 읽기

2. Google Docs
   목적: 보고서 초안을 자동 저장하기
   권한: 지정 폴더에 문서 생성

3. Slack
   목적: 승인 후 채널에 요약 공유
   권한: 특정 채널에 메시지 작성

처음에는 Slack 자동 발송은 비활성화하고, 초안만 생성하도록 설정하겠습니다.
```

### 5.7 구현

도구는 다음을 생성한다.

```text
scripts/fetch-data.ts
scripts/normalize-data.ts
scripts/generate-report.ts
scripts/qa-report.ts
outputs/report-template.md
tests/sample-input/
tests/expected-output/
runbook.md
```

### 5.8 검증

검증은 자동으로 실행된다.

```text
검증 항목:
- 입력 파일 존재 여부
- 컬럼명 변화 감지
- 숫자 합계 대조
- 이전 보고서 형식과 일치 여부
- 민감정보 포함 여부
- 발송 전 승인 여부
- 다른 샘플 파일에서도 작동하는지 확인
```

### 5.9 스킬 생성

자동화가 작동하면 재사용 가능한 스킬로 만든다.

```text
generated-skill/
├─ SKILL.md
├─ references/
├─ scripts/
├─ templates/
└─ validation/
```

사용자는 다음부터 이렇게 요청할 수 있다.

```text
이번 주 마케팅 보고서 초안 만들어줘.
```

---

## 6. 대시보드와 웹페이지 제작 지원

보고서 자동화와 별도로, 비개발자는 본인 업무를 관리하기 위한 간단한 웹페이지나 대시보드를 만들고 싶어할 수 있다.

예시:

- 영업 파이프라인 현황판
- 채용 후보자 관리 보드
- 콘텐츠 캘린더
- 고객지원 티켓 분석 대시보드
- 비용 지출 모니터링
- 프로젝트 리스크 현황판
- OKR 진행률 대시보드

### 6.1 Dashboard Builder Workflow

```text
업무 인터뷰
→ 대시보드 목적 정의
→ 사용자와 사용 시나리오 정의
→ 데이터 소스 정의
→ KPI와 필터 정의
→ 화면 구조 생성
→ 샘플 데이터로 mock dashboard 생성
→ 실제 데이터 연결
→ 권한과 공개 범위 확인
→ 로컬 실행
→ 배포 옵션 안내
→ 스킬화
```

### 6.2 기본 웹앱 템플릿

```text
webapp-templates/nextjs-dashboard/
├─ app/
├─ components/
├─ lib/
├─ data/
├─ charts/
├─ auth/
├─ tests/
├─ README.md
└─ harness.config.yaml
```

기본 포함 요소:

- Next.js App Router
- Tailwind CSS
- shadcn/ui 스타일 컴포넌트
- KPI 카드
- 필터 가능한 테이블
- 기본 차트
- CSV import
- Google Sheets adapter
- Supabase adapter
- 로컬 mock data
- 권한 안내
- Playwright smoke test
- 배포 전 체크리스트

### 6.3 대시보드 명세 예시

```yaml
dashboard:
  id: sales-pipeline-dashboard
  title: Sales Pipeline Dashboard
  audience: sales_manager
  refresh_frequency: daily

  data_sources:
    - type: google_sheets
      name: pipeline_sheet
      required_columns:
        - account_name
        - owner
        - stage
        - deal_size
        - close_date
        - next_action

  views:
    - id: overview
      components:
        - type: metric_card
          metric: total_pipeline_value
        - type: metric_card
          metric: deals_closing_this_month
        - type: chart
          chart_type: bar
          metric: pipeline_by_stage
        - type: table
          name: delayed_deals

  filters:
    - owner
    - stage
    - close_month

  safety:
    public_access: false
    pii_check: true
    require_auth_before_deploy: true
```

### 6.4 대시보드 검증

대시보드는 단순히 화면이 보이는 것으로 충분하지 않다.

검증 항목:

- 샘플 데이터와 실제 데이터의 컬럼 불일치 감지
- 빈 값 처리
- 날짜 형식 처리
- 숫자 단위 처리
- 권한 없는 공개 배포 방지
- API key 노출 방지
- 모바일 화면 최소 확인
- 기본 브라우저 smoke test
- 사용자가 설명한 KPI와 실제 계산식 일치 여부

---

## 7. 로컬 메모리 시스템

### 7.1 목적

사용자가 이 도구로 여러 자동화를 만들수록, 이전 대화와 결정, 업무 맥락이 쌓인다. 이 정보를 매번 다시 설명하게 하면 비효율적이다.

로컬 메모리 폴더는 다음을 저장한다.

- 사용자 선호
- 직군과 업무 맥락
- 회사 용어
- KPI 정의
- 자주 쓰는 도구
- 자주 쓰는 산출물 형식
- 과거 자동화 프로젝트 요약
- 이전 실패와 해결책
- 사용자가 싫어하는 표현
- 승인 규칙

### 7.2 메모리 폴더 구조

```text
.memory/
├─ profile.md
├─ preferences.md
├─ glossary.md
├─ tools.md
├─ style-guides/
├─ metric-definitions/
├─ automations-index.yaml
├─ conversations/
│  ├─ 2026-05-15-weekly-report.md
│  └─ 2026-05-20-dashboard-builder.md
├─ decisions/
│  ├─ decision-log.md
│  └─ rejected-options.md
└─ retrieval-index.json
```

### 7.3 메모리 저장 원칙

모든 대화 내용을 무작정 저장하지 않는다. 메모리는 요약, 결정, 재사용 가능한 지식 위주로 저장한다.

저장 대상:

- 반복적으로 쓰이는 업무 규칙
- KPI 정의
- 선호하는 보고서 형식
- 도구 연결 방식
- 검증된 자동화 실행법
- 자주 발생한 오류와 해결책

저장하지 말아야 할 대상:

- 일회성 잡담
- 민감한 원문 데이터
- 불필요한 개인정보
- API key와 토큰
- 사용자가 명시적으로 저장하지 말라고 한 내용

### 7.4 메모리 검색 흐름

사용자가 새 자동화를 요청하면 도구는 먼저 메모리를 검색한다.

```text
1. 사용자의 현재 요청을 workflow type과 role로 분류
2. 관련 role memory 검색
3. 관련 workflow memory 검색
4. 유사 자동화 프로젝트 검색
5. 필요한 정보만 현재 컨텍스트에 주입
6. 주입된 메모리 출처를 사용자에게 요약
```

예시 응답:

```text
이전에 만든 성장팀 보고서 자동화에서 다음 정보를 재사용할 수 있습니다.

- 보고서 말투: 간결한 임원 보고 스타일
- CAC 정의: paid CAC 기준
- 공유 방식: Google Docs 초안 생성 후 Slack 요약
- 안전 규칙: 자동 발송 전 승인 필요

이번 대시보드에도 이 규칙을 적용해도 되는지 확인하겠습니다.
```

### 7.5 메모리 검증

과거 메모리가 항상 맞는 것은 아니다. 오래되었거나 특정 프로젝트에만 맞을 수 있다.

따라서 메모리에는 scope와 confidence를 둔다.

```yaml
memory_item:
  id: metric-definition-cac
  scope: marketing
  source_project: weekly-growth-report
  confidence: medium
  last_verified: 2026-05-15
  applies_to:
    - paid_acquisition
  not_applies_to:
    - organic_growth
```

---

## 8. 스킬 모듈 시스템

### 8.1 문제

비개발자용 자동화는 다양한 도메인과 업무에 대응해야 한다. 모든 것을 하나의 거대한 스킬로 만들면 유지보수가 불가능하다.

따라서 스킬은 공통 모듈로 관리되어야 한다.

### 8.2 스킬 계층

```text
Level 1: Primitive Skill
작은 단일 작업 수행
예: CSV 읽기, 표 구조 추론, 말투 분석

Level 2: Composite Skill
여러 Primitive Skill을 조합
예: 보고서 초안 생성, 대시보드 명세 생성

Level 3: Workflow Skill
하나의 업무 흐름 전체 수행
예: 주간 보고서 자동화, 영업 대시보드 생성

Level 4: Role Skill Pack
직군별 업무 관습과 도메인 지식 제공
예: 마케팅 팩, 영업 팩, 재무 팩

Level 5: User Custom Skill
사용자가 만든 특정 자동화
예: JiHwan weekly growth report
```

### 8.3 스킬 레지스트리

```yaml
skills:
  - id: reference-ingestion
    type: primitive
    inputs:
      - local_files
    outputs:
      - reference_summary
    compatible_tools:
      - claude-code
      - codex
      - cursor
      - antigravity
      - copilot

  - id: weekly-report-builder
    type: workflow
    depends_on:
      - reference-ingestion
      - metric-definition-extractor
      - report-template-generator
      - qa-runner

  - id: dashboard-builder
    type: workflow
    depends_on:
      - data-source-profiler
      - ui-layout-planner
      - nextjs-app-generator
      - browser-smoke-test
```

### 8.4 스킬 선택 방식

사용자가 스킬 이름을 몰라도 된다. 도구가 요청을 분석해서 필요한 스킬을 선택한다.

```text
사용자: 영업팀 현황판 하나 만들고 싶어.

자동 선택:
- automation-intake
- sales role pack
- dashboard workflow pack
- data-source-profiler
- dashboard-builder
- nextjs-app-generator
- qa-runner
- skill-creator
```

---

## 9. Skill Creator

### 9.1 목적

사용자가 만든 자동화를 다시 쓸 수 있게 스킬로 저장한다.

입력:

- `automation.yaml`
- `runbook.md`
- `scripts/`
- `templates/`
- `tests/`
- `memory/`
- 최근 실행 로그

출력:

```text
generated-skill/
├─ SKILL.md
├─ scripts/
├─ references/
├─ templates/
├─ validation/
└─ README.md
```

### 9.2 생성되는 SKILL.md 예시

```md
---
name: weekly-growth-report
summary: Generate the weekly growth report using the saved metric definitions, report format, and approved data sources.
description: Use this skill when the user asks to create, update, review, or prepare the weekly growth report. It reads the configured data sources, generates a draft report, runs validation checks, and asks for approval before delivery.
---

# Weekly Growth Report Skill

## When to use

Use this skill when the user asks for the weekly growth report, growth summary, marketing performance report, or Slack-ready weekly update.

## Required context

- automation.yaml
- metric definitions
- report template
- previous report examples
- approved data sources

## Workflow

1. Load automation.yaml.
2. Check data source availability.
3. Fetch or request input data.
4. Validate schema and required fields.
5. Generate draft report.
6. Run QA checks.
7. Save the draft.
8. Ask for approval before sending.

## Safety rules

- Do not send messages without approval.
- Do not overwrite previous reports.
- Do not guess missing numbers.
- Do not expose spreadsheet URLs or tokens.
```

### 9.3 개인 스킬과 공유 스킬

```text
personal skill:
사용자 개인 업무에 특화

team skill:
팀원들이 공유 가능

generic skill:
도메인 일반화가 되어 다른 사용자도 사용 가능
```

Skill Creator는 스킬을 만들 때 scope를 명시해야 한다.

```yaml
scope: personal
reusability_level: project_specific
```

---

## 10. 스킬 일반화 검증 시스템

### 10.1 문제

AI가 자동화를 만들 때 특정 파일명, 특정 컬럼명, 특정 샘플 데이터에만 맞는 코드를 작성할 수 있다. 비개발자는 이 문제를 알아차리기 어렵다.

예시 문제:

```text
weekly_report_may.csv에만 작동하는 스크립트
특정 열 순서에만 의존하는 파서
특정 고객명에 하드코딩된 필터
이번 주 날짜가 코드에 박혀 있는 문제
파일 경로가 사용자 컴퓨터에만 맞는 문제
```

### 10.2 Generalization Checker Skill

이 스킬은 자동화가 다른 입력에서도 작동할 수 있는지 검증한다.

검증 항목:

```text
1. 하드코딩된 파일명 탐지
2. 하드코딩된 날짜 탐지
3. 하드코딩된 사람 이름, 고객명, 캠페인명 탐지
4. 절대 경로 탐지
5. 특정 열 순서 의존 탐지
6. 빈 값 처리 여부 확인
7. 컬럼명 변화 대응 여부 확인
8. 다른 샘플 파일로 재실행
9. 스키마 변화 시 오류 메시지 품질 확인
10. 스킬 설명이 너무 특정 프로젝트에 종속되어 있는지 확인
```

### 10.3 재사용성 등급

```yaml
reusability_report:
  level: workflow_reusable
  score: 78
  risks:
    - script expects exact column name "Paid CAC"
    - output template assumes executive audience
    - slack channel is hardcoded
  recommendations:
    - move column mappings to automation.yaml
    - make audience configurable
    - move slack channel to delivery settings
```

### 10.4 재사용성 레벨

```text
Level 0: 일회성 산출물
Level 1: 같은 파일 구조에서 재사용 가능
Level 2: 같은 업무 유형에서 재사용 가능
Level 3: 같은 직군의 여러 팀에서 재사용 가능
Level 4: 여러 직군에서 일부 설정만 바꿔 재사용 가능
Level 5: 공개 가능한 범용 스킬
```

### 10.5 자동 리팩터링 제안

Generalization Checker는 문제를 찾는 것에서 끝나지 않고, 설정으로 빼낼 수 있는 항목을 제안해야 한다.

예시:

```text
현재 코드에는 "2026-05-weekly-report.csv"가 직접 들어 있습니다.
이 값을 automation.yaml의 input.default_file_pattern으로 옮기겠습니다.

현재 Slack 채널 "#growth"가 send-report.ts에 하드코딩되어 있습니다.
이 값을 automation.yaml의 outputs.slack.channel로 옮기겠습니다.
```

---

## 11. 디버깅과 검증 레이어

### 11.1 Debug Assistant

비개발자에게 에러 로그를 그대로 던지면 안 된다. Debug Assistant는 에러를 업무 언어로 번역해야 한다.

예시:

```text
문제:
Google Sheets에서 데이터를 가져오지 못했습니다.

가능한 원인:
1. 로그인 권한이 만료되었습니다.
2. 스프레드시트 링크가 바뀌었습니다.
3. 해당 시트 이름이 변경되었습니다.

먼저 확인할 것:
- Google Sheets에 다시 로그인하세요.
- automation.yaml의 sheet_name이 실제 시트 이름과 같은지 확인하세요.

자동으로 확인한 결과:
- API 키 파일은 존재합니다.
- 스프레드시트 ID는 존재합니다.
- 시트 이름 "Weekly Metrics"를 찾을 수 없습니다.
```

### 11.2 검증 단계

모든 자동화는 다음 검증 단계를 가진다.

```text
preflight:
실행 전 준비 상태 확인

input validation:
입력 파일, 컬럼, 권한 확인

dry run:
외부 발송이나 수정 없이 실행

output validation:
결과물 품질 확인

safety validation:
민감정보, 권한, 발송 여부 확인

generalization validation:
다른 입력에서도 작동하는지 확인

human approval:
사용자 승인

delivery:
저장 또는 발송

post-run summary:
실행 결과와 다음 개선점 저장
```

### 11.3 자동화 실행 상태

```yaml
run:
  id: 2026-05-15-001
  status: draft_created
  validations:
    preflight: passed
    input_validation: passed
    dry_run: passed
    output_validation: warning
    safety_validation: passed
    generalization_validation: partial
  warnings:
    - "CTR column has 3 missing values"
    - "Report template assumes executive audience"
  next_actions:
    - "Confirm whether missing CTR values should be excluded"
```

---

## 12. 안전 설계

### 12.1 기본 안전 정책

```text
1. 외부 발송은 기본 비활성화
2. 삭제, 덮어쓰기, 대량 수정은 이중 승인
3. 민감정보가 감지되면 발송 차단
4. API key와 token은 코드에 저장 금지
5. 공개 배포 전 접근 권한 확인
6. 프로덕션 DB 직접 수정 금지
7. 실행 전 dry-run 기본 실행
8. 모든 실행에 input snapshot과 output log 저장
9. 실패 시 롤백 또는 복구 안내
10. 사용자가 이해할 수 있는 설명 제공
```

### 12.2 대시보드 안전 정책

```text
- 기본 배포는 private preview
- 공개 URL 배포 전 확인
- 고객명, 이메일, 전화번호, 계약금액 등 민감 필드 표시 여부 확인
- 관리자 기능은 기본 비활성화
- 쓰기 기능은 읽기 전용 대시보드가 검증된 뒤 활성화
- DB migration 전 백업
- 환경변수 노출 검사
```

### 12.3 도구 연결 안전 정책

```text
- 최소 권한 원칙
- 특정 파일 또는 특정 폴더 범위 권한 우선
- 전체 Drive, 전체 Gmail 권한은 경고
- 발송 권한보다 초안 생성 권한 우선
- 권한 요청 이유를 사용자 언어로 설명
```

---

## 13. 멀티 AI 도구 호환 전략

### 13.1 공통 계층

공통 계층은 특정 AI 도구에 의존하지 않는다.

```text
skills/
automation.yaml
memory/
workflow-packs/
role-packs/
tool-adapters/
templates/
scripts/
validation/
```

### 13.2 도구별 어댑터

| AI 도구 | 지원 방식 | 비고 |
|---|---|---|
| Claude Code | plugin, skill, command, hook, MCP | 가장 풍부한 자동화 lifecycle 구성 가능 |
| Codex | skill, plugin, MCP | Agent Skills와 plugin wrapper 중심 |
| Cursor | rules, commands, MCP, skills | 프로젝트 규칙과 명령 중심 |
| Antigravity | skills, artifacts, workspace context | Skill 중심으로 이식 |
| GitHub Copilot | agent skills, custom instructions, repo instructions | repo 기반 협업에 적합 |

### 13.3 Exporter

`adapter-exporter`는 공통 프로젝트를 도구별 형식으로 내보낸다.

```text
/auto:export claude-code
/auto:export codex
/auto:export cursor
/auto:export antigravity
/auto:export copilot
```

출력 예시:

```text
exports/
├─ claude-code-plugin/
├─ codex-plugin/
├─ cursor-rules/
├─ antigravity-skills/
└─ copilot-skills/
```

---

## 14. 주요 내장 스킬 목록

### 14.1 Core Skills

| Skill | 역할 |
|---|---|
| automation-intake | 사용자의 업무를 인터뷰하고 자동화 가능성을 판단 |
| workflow-classifier | 업무 유형과 직군을 분류 |
| reference-ingestion | 사용자가 넣은 파일을 읽고 패턴 추출 |
| domain-context-extractor | 내부 용어, KPI, 예외 규칙 추출 |
| memory-retrieval | 로컬 메모리에서 관련 맥락 검색 |
| output-spec-designer | 산출물 형식, 말투, 구조 설계 |
| tool-recommender | 필요한 SaaS, DB, 파일 연동 추천 |
| connector-setup-guide | 비개발자용 연결 안내 생성 |
| script-builder | 로컬 실행 스크립트 생성 |
| report-builder | 보고서 자동화 생성 |
| dashboard-builder | 업무용 웹 대시보드 생성 |
| qa-runner | 검증 체크리스트 실행 |
| debug-assistant | 에러 원인 분석과 복구 안내 |
| skill-creator | 완성된 자동화를 스킬로 저장 |
| skill-generalization-checker | 스킬 재사용성과 일반화 가능성 검증 |
| adapter-exporter | 다른 AI 도구용 설정 생성 |

### 14.2 Workflow Skills

| Workflow | 예시 |
|---|---|
| weekly-report | 주간 성과 보고서 |
| monthly-report | 월간 경영 보고서 |
| dashboard | 현황판, KPI 보드 |
| tracker | 후보자, 고객, 태스크 추적기 |
| digest | 이메일, Slack, 티켓 요약 |
| research-brief | 시장, 경쟁사, 고객 리서치 |
| content-calendar | 콘텐츠 발행 계획 |
| crm-update | CRM 입력과 follow-up 정리 |
| reconciliation | 비용, 인보이스, 결제 대조 |
| meeting-summary | 회의록과 액션아이템 정리 |

### 14.3 Role Packs

| Role Pack | 포함 지식 |
|---|---|
| marketing | 캠페인, 콘텐츠, 광고, SEO, 성장 KPI |
| sales | 리드, 계정, 파이프라인, 딜 단계, follow-up |
| product | PRD, 로드맵, 피드백, 릴리즈 노트 |
| design | 디자인 리뷰, 브랜드, 에셋, 리서치 요약 |
| finance | 예산, 비용, 인보이스, 월마감, variance |
| hr | 채용, 후보자, 인터뷰, 온보딩 |
| operations | 프로세스, 벤더, 운영 리스크, 체크리스트 |
| legal | 계약, NDA, 정책, 리스크 검토 |
| customer-support | 티켓, escalation, FAQ, churn signal |
| founder | 투자자 업데이트, KPI, hiring, 전략 메모 |

---

## 15. MVP 계획

### 15.1 MVP 목표

첫 버전은 모든 직군을 완벽히 지원하지 않는다. 대신 확장 가능한 구조를 증명한다.

MVP의 목표:

```text
보고서 자동화와 대시보드 제작이라는 두 가지 대표 워크플로를 지원한다.
자동화 프로젝트 폴더를 생성한다.
레퍼런스 파일을 읽고 요구사항을 추출한다.
로컬 메모리를 저장하고 검색한다.
완성된 자동화를 스킬로 만든다.
스킬 일반화 검증을 실행한다.
Claude Code, Cursor, Codex 중 최소 2개에 export한다.
```

### 15.2 MVP 지원 범위

직군:

```text
marketing
sales
operations
```

워크플로:

```text
weekly-report
dashboard
email-or-slack-digest
```

도구:

```text
local files
CSV
Google Sheets
Google Docs
Slack
Notion
Supabase
Vercel
```

AI 도구 어댑터:

```text
Claude Code
Cursor
Codex
```

### 15.3 MVP에서 제외할 것

```text
완전 자동 발송 스케줄러
복잡한 권한 관리 UI
팀 단위 협업 권한
모든 SaaS 연동
법무, 재무 고위험 자동화의 완전 자동 실행
대규모 프로덕션 DB write-back
```

---

## 16. 예시 시나리오

### 16.1 마케팅 주간 보고서

입력:

```text
매주 월요일에 마케팅 성과 보고서를 만들고 싶어.
```

결과:

```text
- 이전 보고서 분석
- KPI 정의 추출
- Google Sheets 연결
- 보고서 템플릿 생성
- 주간 보고서 초안 생성
- Slack 요약 초안 생성
- 발송 전 승인
- weekly-marketing-report 스킬 생성
```

### 16.2 영업 파이프라인 대시보드

입력:

```text
영업팀 딜 현황을 볼 수 있는 대시보드를 만들고 싶어.
```

결과:

```text
- 영업 role pack 선택
- dashboard workflow pack 선택
- Google Sheets pipeline 데이터 구조 분석
- Next.js dashboard 생성
- KPI 카드, 단계별 차트, 지연 딜 테이블 생성
- 로컬 실행
- Vercel preview 배포 안내
- sales-pipeline-dashboard 스킬 생성
```

### 16.3 HR 후보자 트래커

입력:

```text
채용 후보자 상태를 관리하는 간단한 웹페이지가 필요해.
```

결과:

```text
- HR role pack 선택
- tracker workflow pack 선택
- 후보자 데이터 필드 정의
- 개인정보 안전 점검
- 읽기 전용 대시보드 먼저 생성
- 상태 변경 기능은 승인 후 추가
- candidate-tracker 스킬 생성
```

---

## 17. UX 명령 체계

도구별 명령은 다르더라도 공통 UX는 유지한다.

```text
/auto:start
새 자동화 시작

/auto:import
레퍼런스 파일 분석

/auto:plan
자동화 설계안 생성

/auto:connect
필요 도구 연결 안내

/auto:build
스크립트, 대시보드, 보고서 생성

/auto:test
검증 실행

/auto:debug
오류 진단

/auto:create-skill
현재 자동화를 스킬로 저장

/auto:check-reuse
스킬 일반화 가능성 검증

/auto:export
다른 AI 도구용으로 내보내기
```

비개발자는 명령을 몰라도 된다. 자연어 요청을 받으면 내부적으로 해당 명령 흐름으로 라우팅한다.

---

## 18. 데이터 모델

### 18.1 automation.yaml

```yaml
id: marketing-weekly-report
name: Marketing Weekly Report
owner_role: marketing
workflow_type: weekly-report
status: draft

cadence:
  frequency: weekly
  day: monday
  timezone: Asia/Seoul

inputs:
  - id: performance_sheet
    type: google_sheets
    required: true
    schema_ref: sources/performance-sheet.schema.yaml

outputs:
  - id: report_doc
    type: google_doc
    requires_approval: false
  - id: slack_summary
    type: slack_message
    requires_approval: true

memory:
  use_global_memory: true
  project_memory_path: ./memory

quality_gates:
  - input_validation
  - output_validation
  - pii_check
  - source_number_check
  - generalization_check

skill:
  generate_on_success: true
  scope: personal
```

### 18.2 skill-card.yaml

```yaml
id: weekly-marketing-report
name: Weekly Marketing Report
scope: personal
role_pack: marketing
workflow_pack: weekly-report
reusability_level: same_workflow
required_tools:
  - google_sheets
  - google_docs
optional_tools:
  - slack
last_validated: 2026-05-15
risk_level: medium
```

### 18.3 memory item

```yaml
id: marketing-report-tone
type: style_preference
scope: marketing
source: marketing-weekly-report
confidence: high
content: "간결하고 임원 보고용 문체를 선호한다. 원인 추측은 피하고 근거가 없으면 확인 필요로 표시한다."
last_verified: 2026-05-15
```

---

## 19. 성공 지표

### 19.1 사용자 성공 지표

```text
첫 자동화 성공까지 걸리는 시간
사용자가 직접 수정해야 한 코드 줄 수
자동화 재실행 성공률
생성된 보고서 또는 대시보드의 수동 수정량
사용자가 이해한 오류 메시지 비율
발송 전 검수에서 발견된 문제 수
```

### 19.2 시스템 품질 지표

```text
스킬 재사용성 점수
하드코딩 탐지율
샘플 외 입력 통과율
민감정보 탐지율
도구 연결 성공률
adapter export 성공률
메모리 검색 정확도
```

### 19.3 제품 확장 지표

```text
workflow pack 수
role pack 수
tool adapter 수
AI adapter 수
사용자 생성 custom skill 수
custom skill 재사용 횟수
team 공유 skill 수
```

---

## 20. 리스크와 대응

### 20.1 범위 과다

리스크:

모든 직군과 모든 자동화를 처음부터 지원하려고 하면 제품이 복잡해진다.

대응:

MVP는 보고서와 대시보드에 집중한다. 직군은 marketing, sales, operations부터 시작한다.

### 20.2 AI 도구별 호환성 차이

리스크:

Claude Code, Cursor, Codex, Antigravity, Copilot의 plugin, skill, hook 구조가 다르다.

대응:

공통 자산을 `SKILL.md`, `automation.yaml`, scripts, templates로 두고 AI adapter를 얇게 유지한다.

### 20.3 비개발자 보안 사고

리스크:

API key 노출, 공개 URL 배포, 민감정보 발송, DB 삭제 가능성이 있다.

대응:

초안 생성, dry-run, 승인 게이트, 민감정보 검사, 권한 설명, 삭제 차단을 기본값으로 둔다.

### 20.4 일반화되지 않은 자동화

리스크:

한 파일에만 맞는 자동화가 스킬로 저장되어 다음 실행에서 실패한다.

대응:

Skill Generalization Checker를 기본 파이프라인에 포함한다.

### 20.5 메모리 오염

리스크:

잘못된 과거 정보가 새 자동화에 적용될 수 있다.

대응:

메모리에 scope, confidence, source, last_verified를 기록하고, 중요한 정보는 적용 전 사용자에게 요약 확인한다.

---

## 21. 개발 로드맵

### Phase 1: Core Harness

목표:

```text
- automation project 생성
- intake 인터뷰
- automation.yaml 생성
- reference 파일 분석
- memory 폴더 생성
- report workflow 1개 지원
```

산출물:

```text
skills/automation-intake
skills/reference-ingestion
skills/report-builder
skills/qa-runner
templates/automation-project
```

### Phase 2: Skill Factory

목표:

```text
- 자동화 결과를 SKILL.md로 생성
- skill-card.yaml 생성
- 재사용성 점수 산출
- 일반화 문제 탐지
```

산출물:

```text
skills/skill-creator
skills/skill-generalization-checker
validation/reusability-checks
```

### Phase 3: Dashboard Builder

목표:

```text
- CSV 또는 Google Sheets 기반 dashboard 생성
- Next.js template 제공
- 로컬 실행과 smoke test
- 배포 전 안전 점검
```

산출물:

```text
skills/dashboard-builder
webapp-templates/nextjs-dashboard
tool-adapters/supabase
tool-adapters/vercel
```

### Phase 4: Tool Adapters

목표:

```text
- Google Sheets
- Google Docs
- Slack
- Notion
- Supabase
- Vercel
```

산출물:

```text
tool-adapters/*/setup-guide.md
tool-adapters/*/connection-test.ts
tool-adapters/*/safety-rules.md
```

### Phase 5: AI Adapters

목표:

```text
- Claude Code adapter
- Cursor adapter
- Codex adapter
- Copilot adapter
- Antigravity adapter
```

산출물:

```text
ai-adapters/claude-code
ai-adapters/cursor
ai-adapters/codex
ai-adapters/copilot
ai-adapters/antigravity
```

### Phase 6: Pack Ecosystem

목표:

```text
- role pack 확장
- workflow pack 확장
- community skill pack 구조
- skill registry
- 검증된 pack 표시
```

산출물:

```text
role-packs/*
workflow-packs/*
registry/skills.yaml
registry/packs.yaml
```

---

## 22. 최초 구현 우선순위

가장 먼저 만들어야 하는 것은 대시보드나 SaaS 연동이 아니다. 다음 순서가 더 맞다.

1. `automation.yaml` schema
2. automation project folder template
3. intake interview skill
4. reference ingestion skill
5. local memory system
6. report workflow pack
7. qa-runner
8. skill-creator
9. skill-generalization-checker
10. dashboard-builder
11. tool adapters
12. AI adapters

이 순서가 중요한 이유는, 자동화 프로젝트의 표준 구조가 먼저 잡혀야 보고서, 대시보드, 이메일, CRM, HR tracker 모두 같은 방식으로 확장될 수 있기 때문이다.

---

## 23. 최종 권장 설계

이 제품은 다음 구조로 설계해야 한다.

```text
본체:
공통 자동화 스펙, 로컬 폴더 구조, 메모리, 스킬 시스템

확장:
role packs, workflow packs, tool adapters

실행:
Claude Code, Codex, Cursor, Antigravity, Copilot용 adapter

품질:
QA, 디버깅, 일반화 검증, 안전 게이트

재사용:
Skill Creator, Skill Registry, Memory Retrieval
```

가장 중요한 설계 판단은 다음이다.

```text
Claude Code plugin을 본체로 만들지 않는다.
Agent Skills와 automation.yaml을 본체로 만든다.
대시보드 제작은 별도 workflow pack으로 포함한다.
로컬 메모리는 모든 자동화의 공통 계층으로 둔다.
재사용성 검증은 스킬 생성 후 선택 기능이 아니라 기본 게이트로 둔다.
디버깅과 QA는 사용자가 요청할 때 실행하는 기능이 아니라 모든 build와 run 사이에 자동으로 실행되는 레이어로 둔다.
```

이렇게 설계하면 이 도구는 단순한 자동화 플러그인이 아니라, 비개발자가 자신의 업무를 점진적으로 시스템화하고, 그 결과를 개인 또는 팀의 재사용 가능한 지식 자산으로 축적하는 프레임워크가 된다.


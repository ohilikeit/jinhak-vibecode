# Knowledge Work Plugins 프로젝트 분석 보고서

## 개요

`knowledge-work-plugins`는 Anthropic이 공식 오픈소스한 AI 플러그인 모음으로, Claude Cowork과 Claude Code를 위한 **직군별 특화 AI 어시스턴트**를 제공합니다. 기획/디자인/마케팅/영업/HR/재무/법무/제품관리/고객지원/데이터 분석 등 11개 핵심 직군과 소규모 기업, 엔지니어링, 생물학 연구까지 확장됩니다. 비개발자가 "도메인 정보만 제공하면 나머지는 도구가 처리"하는 철학을 실현한 가장 성숙한 참조 구현입니다.

## 핵심 철학

**"Turn Claude into a specialist for your role, team, and company"**

- **직군별 스타터팩**: 각 직군마다 즉시 실용 가능한 기본 구성(skills + commands + MCP 연결)
- **도메인 인코딩**: 마크다운으로 작성된 업무 프레임워크, 체크리스트, 템플릿이 Claude의 자동 행동을 지시
- **도구 중립성**: 특정 SaaS에 종속되지 않으며, MCP 플러그인으로 고객의 도구 스택에 유연하게 맞춤
- **커스터마이제이션 우선**: 오픈소스이므로 회사 프로세스, 용어, 정책을 쉽게 주입 가능

## 직군 분류 체계

### 자체 빌트인 플러그인 (11개)

| 직군 | 핵심 기능 | 주요 Commands | Skill 수 |
|------|---------|-------------|----------|
| **Productivity** | 일정, 태스크, 컨텍스트 | /daily-standup, /plan-day | 5+ |
| **Sales** | 영업파이프라인, 콜 준비, 아웃리치 | /call-prep, /forecast, /pipeline-review | 9 |
| **Marketing** | 콘텐츠, 캠페인, 브랜드 관리 | /draft-content, /campaign-plan, /seo-audit | 5 |
| **Finance** | 회계, 결산, 분석 | /journal-entry, /reconciliation, /variance-analysis | 6 |
| **Product Management** | 스펙, 로드맵, 사용자 연구 | /write-spec, /roadmap-update, /synthesize-research | 7 |
| **Design** | 디자인 시스템, 접근성, 핸드오프 | /critique, /design-system, /accessibility | 6 |
| **HR** | 채용, 온보딩, 성과평가 | /draft-offer, /onboarding, /comp-analysis | 6 |
| **Legal** | 계약검토, 컴플라이언스 | /contract-review, /nda-triage | 4+ |
| **Data** | SQL, 시각화, 통계분석 | /write-query, /create-viz, /statistical-analysis | 8 |
| **Customer Support** | 티켓 분류, 지식베이스 | /ticket-triage, /draft-response | 5 |
| **Bio-Research** | 문헌검색, 게놈 분석 | (데이터베이스/도구 중심) | 4+ |

### 파트너 기반 확장 (4개)
- **Slack** (Salesforce) — 메시지 검색, Canvas 관리
- **Apollo.io** — 리드 전역화, 아웃리치 자동화
- **Common Room** — GTM 커뮤니티 인텔리전스
- **Zoom Plugin** — 회의 통합

### 메타 플러그인
- **cowork-plugin-management** — 플러그인 생성/커스터마이징용 도구
- **enterprise-search** — 회사 전체 도구 통합 검색

## 플러그인 구조 (표준화)

```
plugin-name/
├── .claude-plugin/plugin.json       # 메타데이터 (이름, 버전, 설명)
├── .mcp.json                        # MCP 서버 연결 설정 (선택)
├── README.md                        # 사용자 가이드
├── CONNECTORS.md                    # 도구 카테고리 맵핑
├── skills/                          # 자동 활성화 도메인 지식
│   ├── skill-name/SKILL.md         # 프론트매터 + 상세 가이드
│   └── ...
└── commands/                        # 명시적 슬래시 명령어 (선택)
    └── command-name/CMD.md
```

### SKILL.md 표준 포맷
```yaml
---
name: skill-id
description: 짧은 설명 (trigger 키워드 포함)
user-invocable: true|false
---
```
+ 마크다운 본문: 프레임워크, 실행 흐름, 출력 형식, 예제, 변형, 팁

### 특징적 설계
1. **Standalone + Supercharged** 패턴: MCP 없이도 동작하되, 연결되면 성능 향상
2. **카테고리 기반 도구 추상화**: `~~CRM`, `~~chat`, `~~data-warehouse` 등으로 특정 SaaS에 종속 회피
3. **설정 파일 주입**: `settings.local.json`으로 회사 컨텍스트(용어, 정책, 조직구조) 자동 적용

## 핵심 기능 카테고리 분석

### (A) 온보딩 / 인터뷰
- **사용 패턴**: "사용자 설명 → 질문 기반 대화 → 자동 결과 생성"
- **예**: HR `/draft-offer`, PM `/write-spec` — 필수정보 묻고 문서 생성
- **강점**: 비개발자 친화적, 낮은 진입장벽

### (B) 스킬 시스템
- **자동 트리거**: 사용자 자연 언어 → Claude가 관련 skill 자동 활성화
- **예**: "경쟁사 분석해줘" → `competitive-intelligence` skill 발동
- **구조**: 각 skill은 도메인 체크리스트, 프레임워크, 템플릿 번들

### (C) 도구 통합 (MCP)
- **표준화 인터페이스**: `.mcp.json`에 MCP URL 정의
- **선택적 활성화**: 사용자가 연결하지 않으면 수동 입력 모드로 폴백
- **카테고리 맵핑**: CONNECTORS.md에서 도구 스왑 가능 (HubSpot ↔ Salesforce)

### (D) 호환성 레이어
- **다중 플랫폼**: Cowork, Claude Code, Cursor, Codex에서 동작
- **배포 형식**: GitHub 마크다운 + JSON (코드 없음, 인프라 없음)

### (E) 메모리/컨텍스트
- **로컬 설정 주입**: `settings.local.json` → 회사 정책, 용어 학습
- **연속성**: 플러그인이 메모리 기능을 통해 세션 간 컨텍스트 유지 (Cowork 레벨)

### (F) 디자인 시스템
- **플러그인 매니페스트**: 카탈로그 통합 (`marketplace.json`)
- **일관된 문서화**: README, CONNECTORS.md, SKILL.md 템플릿

### (G) 테스트 주도 검증 (약함)
- **현재**: 문서 기반, 수동 검증
- **부재**: 자동화된 evals, 품질 게이트

## 배포 및 설치 흐름

### 1. Claude Code (CLI)
```bash
claude plugin marketplace add anthropics/knowledge-work-plugins
claude plugin install sales@knowledge-work-plugins
```

### 2. Cowork (UI)
- [claude.com/plugins](https://claude.com/plugins/) → 마켓플레이스에서 클릭 설치

### 3. 커스터마이징 (기업용)
- 자신의 조직 폴더로 플러그인 복사 → `.mcp.json`, 스킬 수정 → 자동 활성화

## 호환성 (멀티 AI 도구)

| 도구 | 지원 | 비고 |
|------|-----|------|
| Claude Cowork | ✓ 1순위 | 원래 설계 대상 |
| Claude Code | ✓ | CLI + 플러그인 마켓 |
| Cursor | △ 미정 | 플러그인 미지원 시 수동 통합 |
| Codex (OpenAI) | △ 미정 | MCP 서버 재사용 가능 |
| Antigravity | △ 미정 | 문서 형식 호환성만 |

## 강점

1. **직군별 카탈로그 체계**: 11개 핵심 직군 + 파트너 확장 → 명확한 온보딩
2. **도메인 인코딩의 성숙도**: 3000+ 라인의 상세 skill 마크다운 (Sales 예: 9개 skills, 각 200-400 라인)
3. **도구 중립성**: MCP + 카테고리 맵핑 = SaaS 스택에 무관한 유연성
4. **커스터마이징 경로**: 오픈소스 + 로컬 설정 = 회사 프로세스 주입 용이
5. **No-code 배포**: 마크다운 + JSON만으로 버전 관리, CI/CD 불필요
6. **멀티 플랫폼 설계**: Cowork + Claude Code 모두 지원, 파트너 확장 가능

## 약점

1. **자동화된 품질 검증 부재**: 모든 skill이 문서 기반 → 실제 성능 측정 없음
2. **버전 관리 미흡**: marketplace.json이 수동 업데이트 → 스키마 드리프트 위험
3. **패트턴화된 온보딩 부족**: 각 직군 README가 독립적 → 교차 학습 곤란
4. **커스터마이징 가이드 약함**: "fork + edit" 권장이지만, 동기화 전략 없음
5. **평가/테스트 인프라 없음**: eval framework 부재 → 품질 게이트 불가능
6. **권한 관리 미흡**: 누가 어떤 skill을 볼지에 대한 RBAC 없음

## 우리 하네스에 차용할 점

### 1. 직군 카탈로그 구조 (필수)
```
.agents/skills/
├── marketing/          # 직군 폴더
│   ├── SKILL.md (여러 skill)
│   ├── SETUP.md (온보딩)
│   └── EXAMPLES.md
├── sales/
├── finance/
...
```
**이점**: 비개발자가 "내 직군" 클릭 → 자신의 도메인 모든 것 한 곳에

### 2. Standalone + Supercharged 패턴
- **기본**: 사용자 입력만으로 작동
- **고급**: MCP/API 연결 시 자동화 수준 상승
→ 낮은 진입장벽 + 높은 천장

### 3. SKILL.md 프론트매터 표준
```yaml
---
name: skill-id
domain: marketing | sales | hr | ...
trigger-keywords: [key1, key2]
mcp-categories: [crm, email, ...]
level: beginner | intermediate | advanced
---
```
→ 검색 가능, 메타데이터 활용 가능

### 4. 카테고리 기반 도구 추상화
- `~~CRM`, `~~email`, `~~analytics` 같은 플레이스홀더 사용
- CONNECTORS.md에서 구체적 도구 매핑
→ 기업의 SaaS 스택 변경 시 스킬 재작성 불필요

### 5. settings.local.json 주입 모델
회사 맞춤형 정보 (용어, 정책, 조직도)를 skills에서 자동 참조
→ "문제: 매번 묻기", "해결: 한 번 설정 → 계속 적용"

## 차별화 포인트

### 1. 평가 체계 (우리 고유)
- **문제**: knowledge-work-plugins는 문서 기반만 → 실제 성능 미측정
- **우리**: eval framework로 각 skill 품질 검증
  - 예: marketing skill "콘텐츠 품질" 자동 평가
  - 예: sales skill "콜 준비 완성도" 자동 채점

### 2. 진화 메커니즘 (우리 고유)
- **문제**: 플러그인은 정적 → 사용자 피드백 반영 경로 없음
- **우리**: skill 사용 시 자동 수집 → 개선 루프
  - "이 skill 도움됨?" → 피드백 → 스킬 버전 업데이트

### 3. 온보딩 자동화 (우리 고유)
- **문제**: knowledge-work-plugins는 "직군 선택" 후 수동 탐색
- **우리**: deep-interview 모드로 자동 프로파일링
  - 사용자의 도메인, 도구, 선호도 스캔 → 맞춤 스킬 제안

### 4. 멀티 AI 도구 진정한 호환성 (우리의 목표)
- **knowledge-work-plugins**: Cowork + Claude Code만 실제 지원
- **우리**: 호환성 레이어로 Cursor, Codex, Copilot까지 확장
  - MCP 없는 도구용 REST API 어댑터
  - 플러그인 → JSON → 표준 format 변환

### 5. 조직 권한 관리 (우리의 추가)
- **문제**: knowledge-work-plugins는 모든 skill 공개
- **우리**: 직급/팀별 RBAC
  - "주니어 마케터: content-creation만", "마케팅 리더: competitive-brief도"

## 한 줄 요약

Knowledge Work Plugins는 **비개발자 중심의 직군별 AI 플러그인 생태계**의 가장 성숙한 참조 구현으로, 마크다운 기반 도메인 인코딩 + MCP 도구 통합 + 로컬 커스터마이징의 삼각형 모델을 제시하며, 우리는 이 구조를 채택하되 **자동 평가(evals), 진화 메커니즘, 깊이 있는 온보딩, 멀티 AI 호환성, 조직 권한 관리**으로 차별화해야 한다.

---

## 기술 명세 (참고)

### 파일 기반 배포
- **언어**: 마크다운 + JSON (코드 없음)
- **버전 관리**: Git + PR 기반
- **인프라**: 0 (GitHub 호스팅, 클라이언트 사이드만 처리)

### MCP 생태계 연동
- **표준**: [Model Context Protocol](https://modelcontextprotocol.io/)
- **예**: Slack, HubSpot, Figma, Notion, BigQuery 등 50+ 공식 서버

### 마켓플레이스 구조
```json
{
  "plugins": [
    {
      "name": "sales",
      "source": "./sales",
      "description": "...",
      "author": { "name": "Anthropic" }
    }
  ]
}
```

---

## 부록: 재검증 결과 및 정정사항 (Audit Addendum, 2026-05-18)

`marketplace.json`, 각 직군 디렉터리, 모든 `SKILL.md`, CONNECTORS.md, .mcp.json을 전수 재정독한 결과 본문의 핵심 수치가 상당부분 부정확하다.

### A. 핵심 정정 — 플러그인 수와 스킬 수
| 본문 주장 | 실제 | 비고 |
|---|---|---|
| **"11개 빌트인 플러그인"** | **17개** | 누락: **engineering**, **operations**, **pdf-viewer**, **small-business** (각각 핵심 카테고리) |
| 파트너 4개 (Slack/Apollo/Common Room/Zoom) | ✅ 4개 + brand-voice(Tribe AI) | 마켓플레이스 전체로는 58개 (외부 repo 포함) |
| Marketing 5 skills | **8** | 표 행 정정 |
| Finance 6 skills | **8** | |
| HR 6 skills | **9** | |
| Design 6 skills | **7** | |
| PM 7 skills | **8** | |
| Data 8 skills | **10** | |
| Legal "4+" | **9** | |
| Sales 9 skills | ✅ 9 | 일치 |
| Customer Support 5 skills | ✅ 5 | 일치 |

### B. 본문이 통째로 누락한 직군
- **operations** (9 skills)
- **engineering** (10 skills)
- **small-business** (31 skills — 본 보고서 최대 규모, 페이롤/월말마감/성장 캠페인 등 사전 번들 워크플로)

### C. 개념적 오해 — "Commands" vs "Skills"
- 본문 3.1·4.A·표 "주요 Commands" 열의 `/daily-standup`, `/call-prep`, `/journal-entry` 등은 **슬래시 커맨드가 아니라 auto-trigger Skill** 이다. Claude가 자연어 키워드를 감지해 자동 발동하는 구조.
- 명시적 슬래시 커맨드를 사용하는 직군은 **product-management 단 하나**(`commands/brainstorm.md`).
- 따라서 본문 전반의 "Commands" 표현은 **"Skills (자동 트리거 키워드)"** 로 정정해야 한다.

### D. 실제 SKILL.md 본문 구조 (재검증)
프론트매터:
```yaml
---
name: <skill-id>
description: <summary + trigger keywords>
argument-hint: "<optional input hint>"
user-invocable: true|false
---
```
본문 표준 6섹션: How It Works (ASCII 다이어그램, Standalone/Supercharged) → Getting Started → Connectors (Optional, `~~CRM` 등 카테고리 테이블) → Output Format → Examples → Tips/Variants.

`user-invocable` 필드는 거의 사용되지 않음 → 본문 11.5에서 권고한 RBAC는 **실제 부재**가 맞으나, 필드는 이미 존재하므로 우리는 이를 활용해 RBAC를 1급으로 도입 가능.

### E. CONNECTORS.md `~~CRM` 패턴 검증
- Sales: `~~CRM` → HubSpot/Close/Salesforce/Pipedrive/Copper로 매핑 ✅
- Legal: `~~CRM`, `~~cloud storage`, `~~CLM`, `~~e-signature` ✅
- 단, **모든 플러그인이 CONNECTORS.md를 갖지는 않음** → 일관성 부재가 약점. 우리는 모든 직군에 강제할 것.

### F. 한국 비개발자 시장에 즉시 포팅할 스킬 (경로 + 한국화 포인트)
1. `sales/skills/call-prep/SKILL.md` — 트리거: "회의 준비/콜 준비". 한국 기업 뉴스(네이버 뉴스, 다트), LinkedIn Korea 프로필.
2. `marketing/skills/draft-content/SKILL.md` — 네이버 블로그/카카오뷰/티스토리/LinkedIn Korea 포맷 추가, 존댓말/반말 톤 옵션, 한글 SEO 키워드.
3. `finance/skills/journal-entry/SKILL.md` — 부가세/법인세/계정과목(차변/대변) 한국 회계 표준 주입 via settings.local.json.
4. `small-business/skills/*` (31개) — 한국 SMB ERP(FastCat 등), 네이버 예약, 카카오워크 커넥터 교체, 한국 회계 연도/명절 보너스 반영.

### G. 본문 수정 권고
- 1·2장 "11개 직군" → "**17개 빌트인 + 4개 파트너 = 21개**"
- 2장 표에 operations / engineering / small-business 3개 행 추가, 누락 스킬 수 정정
- 3·4장 "Commands" 표현을 "**Skills (자동 트리거)**" 로 일괄 교체, product-management만 명시적 커맨드 보유 명기
- 5장 배포 흐름에 marketplace.json의 SHA 핀 외부 repo 패턴 추가 (커스터마이징 fork 시 drift 위험)
- 11장에 "**RBAC는 user-invocable 필드 미사용**" 명기, 우리는 1급 도입


# Get Shit Done (GSD) 프로젝트 분석 보고서
## 비개발자용 AI 하네스 도구 설계 인사이트

---

## 1. 개요

**Get Shit Done(GSD)**는 Claude Code, Copilot, Cursor, Codex 등 멀티 AI 도구 환경에서 **스펙 주도 개발(Spec-Driven Development)**을 실현하는 경량 메타프롬팅·컨텍스트 엔지니어링 시스템이다. 단일 개발자가 AI에게 사양을 전달하면 나머지는 AI가 자동 처리하는 구조로, 반복되는 "컨텍스트 부패(context rot)"를 해결하는 데 핵심 가치가 있다.

- **번들**: npm 패키지(`get-shit-done-cc` v1.50.0-canary.0)로 배포, 15개 AI 런타임 지원
- **에코시스템**: 33개 스페셜라이즈드 에이전트 + 60개 워크플로우 + 15개 스킬
- **설치 규모**: 프로필 기반(`core`, `standard`, `full`), 합계 986개 파일, CONTEXT.md 751줄

---

## 2. 프로젝트 철학

### 2.1 핵심 가정
- **"복잡성은 시스템 안에, 워크플로우는 간단하게"** — 사용자 명령은 `/gsd-new-project` → `/gsd-discuss-phase` → `/gsd-plan-phase` → `/gsd-execute-phase` → `/gsd-verify-work` → `/gsd-ship` 6개 루프로 압축
- **컨텍스트 재사용성 극대화** — 각 서브에이전트는 '200k 신선한 컨텍스트'를 할당받고, 워크플로우·연구·계획·실행이 메인 윈도우를 20~40% 수준으로 유지
- **프리티어 개발자 + AI 협업** — 테스트·문서·의사결정을 AI에 위임, 개발자는 검증과 거버넌스에만 집중

### 2.2 비개발자 적용 가능성
원래 대상이 개발자였으나, **높은 재사용 가능성과 도메인 독립적 구조**가 있어 비개발자 온보딩에 적합하다:
- 인터뷰 → 문서화 → 검증 루프가 도메인 무관하게 반복 가능
- "워크플로우를 워크플로우로 생성"하는 자기 참조 구조
- 숨겨진 상태 관리(`.planning/state.md`)로 사용자가 직접 구성 파일을 건드리지 않음

---

## 3. 아키텍처 심화 분석

### 3.1 계층 구조 (SDK ↔ CLI ↔ Hooks ↔ Agents ↔ Workflows)

```
┌─────────────────────────────────────────────┐
│  Users / AI Tools (Claude Code, Copilot)    │
├─────────────────────────────────────────────┤
│ Workflows (60개: discuss-phase.md, etc.)    │ ← YAML frontmatter + 프로세스 단계
├─────────────────────────────────────────────┤
│ Agents (33개: gsd-executor, gsd-planner)    │ ← 스페셜라이즈드, 신선한 컨텍스트
├─────────────────────────────────────────────┤
│ Commands (gsd/*.md: /gsd-execute-phase)     │ ← 라우팅, 서브에이전트 스폰
├─────────────────────────────────────────────┤
│ Hooks (gsd-context-monitor.js, etc.)        │ ← Git hooks, 상태 업데이트, 검증
├─────────────────────────────────────────────┤
│ SDK (TypeScript: @gsd-build/sdk)            │ ← 쿼리 레지스트리, 상태 머신
├─────────────────────────────────────────────┤
│ CLI (bin/install.js, bin/gsd-sdk.js)        │ ← npm 진입점, 런타임 어댑터
├─────────────────────────────────────────────┤
│ Shared Modules (state-document.cjs, etc.)   │ ← CJS/SDK 양쪽에서 재사용
└─────────────────────────────────────────────┘
```

### 3.2 핵심 모듈 (CONTEXT.md에서 추출)

| 모듈 | 역할 | 구현 |
|-----|------|------|
| **Dispatch Policy** | 에러 종류 분류 (6개), 폴백 정책, CLI 종료 코드 매핑 | `gsd-transport-policy.ts` |
| **Query Runtime Context** | 프로젝트 디렉터리, 워크스트림 경로 해석 | `sdk/src/query/` |
| **STATE.md Document** | `.planning/state.md` 파싱, 필드 추출·교체, 상태 정규화 | `state-document.generated.cjs` (TypeScript 소스에서 생성) |
| **Planning Workspace** | `.planning` 폴더 잠금, 활성 워크스트림 포인터, 자동 복구 | `workspace.ts` |
| **Skill Surface Budget** | 프로필별 스킬/에이전트 설치 필터 (Phase 1), 런타임 토글 (Phase 2) | `install-profiles.cjs`, `/gsd:surface` 커맨드 |
| **Workstream Inventory** | 워크스트림 자동 발견, 단계/계획/요약 카운팅 | `workstream-inventory.cjs` |
| **Runtime-Global Skills** | 런타임별 글로벌 스킬 디렉터리 정책 (Claude Code vs Copilot vs Cursor) | `install.js` ~550줄 |

### 3.3 설치 & 런타임 어댑터

```javascript
// install.js의 핵심 로직
const claudeToCopilotTools = {
  Read: 'read',
  Write: 'edit',
  Edit: 'edit',
  Bash: 'execute',
  // ...
};

const CODEX_AGENT_SANDBOX = {
  'gsd-executor': 'workspace-write',
  'gsd-planner': 'workspace-write',
  // ...
};
```

- **15개 런타임 지원**: Claude Code, OpenCode, Gemini CLI, Kilo, Codex, Copilot, Cursor, Windsurf, 등
- **도구 매핑**: Claude → Copilot 도구명 자동 변환 (gsd-tools.cjs → native SDK로 마이그레이션 중)
- **프로필 모델**: `--profile=core|standard|full` + `--minimal` 별칭, 선택 결과 `.gsd-profile` 마커로 저장
- **권한 사전 승인**: `allowed-tools` 필드로 선언적 권한 설정, 런타임 설정 디렉터리에 자동 주입

---

## 4. 핵심 기능

### 4.1 6단계 루프

1. **Init** (`/gsd-new-project`): 인터뷰 → 연구 → 요구사항 → 로드맵
2. **Discuss** (`/gsd-discuss-phase N`): 회색 영역 분석 → 사용자 선택 → CONTEXT.md 작성
3. **Plan** (`/gsd-plan-phase N`): 연구 → 계획 → 검증 루프
4. **Execute** (`/gsd-execute-phase N`): 병렬 웨이브 실행, 각 서브에이전트 독립 커밋
5. **Verify** (`/gsd-verify-work N`): 산출물 검증 → 진단 수정 계획
6. **Ship** (`/gsd-ship N`): 태그 & 아카이브 → 다음 마일스톤 준비

각 단계는 **"실행 컨텍스트" 참조(`@~/.claude/get-shit-done/workflows/X.md`)**로 워크플로우 파일을 로드하고, 필드별로 '이전 문맥 재사용(CONTEXT.md) + 신규 입력 + 게이트'를 반복한다.

### 4.2 MVP 모드 & TDD 게이팅

```yaml
# ROADMAP.md 예시
**Phase 01:** Walking Skeleton (MVP)
**Mode:** mvp
**User Story:** As a [role], I want [capability], so that [outcome].
```

- MVP 프레임: 수직 슬라이스(UI → API → DB)로 계획, 수평 레이어 방지
- **MVP+TDD 게이트**: 동작 추가 작업(`tdd="true"` + 사용자 결과)은 실패 테스트(`test({phase}-{plan})`)가 커밋 선행 필수
- SPIDR 분해(Spike, Paths, Interfaces, Data, Rules)로 과도하게 큰 사용자 스토리 분할

### 4.3 에이전트 체계 (33개)

**카테고리별 대표**:
- **Researchers** (3): project-researcher, phase-researcher, ui-researcher — 웹 검색 + Context7
- **Planners** (1): gsd-planner — 의존성 분석 + 원자성 테스크 생성
- **Executor** (1): gsd-executor — 무중단 실행, 각 테스크 원자 커밋
- **Checkers** (3): plan-checker, integration-checker, ui-checker — 차단 & 조기 경고
- **Verifier** (1): gsd-verifier — 산출물 샘플링 & 진단
- **Debuggers** (1): gsd-debugger — 스택 트레이스 역 엔지니어링

각 에이전트는 **'도메인 마크다운'으로 선언** (`.md` 에이전트 파일 = YAML frontmatter + 롤 설명 + 캡력):
```markdown
---
name: gsd:execute-phase
description: Execute all plans in a phase with wave-based parallelization
argument-hint: "<phase-number> [--wave N] ..."
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, Agent, TodoWrite, AskUserQuestion]
requires: [phase, verify-work]
---
```

---

## 5. 배포 & 설치 방식

### 5.1 npm 패키지 분포

```json
{
  "name": "get-shit-done-cc",
  "bin": {
    "get-shit-done-cc": "bin/install.js",
    "gsd-sdk": "bin/gsd-sdk.js"
  },
  "files": ["bin", "commands", "get-shit-done", "agents", "hooks", "scripts", "sdk/*"],
  "engines": { "node": ">=22.0.0" }
}
```

- **설치**: `npx get-shit-done-cc@latest` (CLI 프롬프트 기반 대화형 설치)
- **진입점**: bin/install.js (~457KB, Node.js 정적 번들) → 런타임 감지 → 설정 디렉터리 쓰기
- **빌드**: `npm run build:hooks && npm run build:sdk` (TypeScript → CJS 컴파일, 훅 생성)

### 5.2 프로필 기반 설치

```bash
npm install --profile=core      # 6개 핵심 스킬만
npm install --profile=standard  # core + 단계 관리
npm install                     # 전체 (15개 스킬, 33개 에이전트)
```

선택 결과는 `<runtimeConfigDir>/.gsd-profile` 마커에 저장, 다음 세션에서 동일 프로필 복구.

### 5.3 런타임 설정 배포

| 런타임 | 설정 경로 | 마커 | 에이전트 경로 |
|--------|---------|------|-------------|
| Claude Code | `~/.claude/` | `claude.json` | `~/.claude/agents/gsd-*/` |
| Copilot | `.github/copilot-instructions.md` | `<!-- GSD Configuration ... -->` | `.github/agents/` (미래) |
| Cursor | `.cursor/rules/` | (개별 파일) | `.cursor/agents/` (제안) |
| Codex | `codex/config.toml` | `# GSD Agent Configuration` | `codex/agents/` |

install.js는 각 런타임에 맞게 **도구 매핑 + 권한 설정 + 마커 삽입**을 자동 처리한다.

---

## 6. 호환성

### 6.1 멀티 런타임 지원

공식 `.agents/skills/<name>/SKILL.md` 표준을 기본으로, 런타임별 폴백 어댑터 제공:
- **Claude Code / Cursor / Copilot**: 기본 경로 우선 (`~/.agents/skills/`)
- **Codex**: `config.toml` 에이전트 등록 + manifest 생성
- **Copilot**: `.github/copilot-instructions.md`로 스킬 설명 임베드

### 6.2 도구 추상화

```javascript
// 내부 매핑
const claudeToCopilotTools = {
  Read: 'read',
  Write: 'edit',
  Bash: 'execute',
  Grep: 'search',
  WebSearch: 'web',
};

// 결과: SKILL.md allowed-tools는 "Claude 이름"으로 작성, installer가 런타임별로 변환
```

---

## 7. 강점

1. **컨텍스트 부패 해결**: 각 에이전트가 200k 신선한 윈도우를 할당받음 → 지속 가능한 대규모 프로젝트
2. **도메인 무관 구조**: 인터뷰 → 문서화 → 검증 루프가 직군·도메인 독립적 → 비개발자 적용 용이
3. **선언적 워크플로우**: Markdown 기반 워크플로우 + YAML 프론트매터 → 수정 이력 추적·CI/CD 검증 가능
4. **멀티 런타임 기본**: 15개 AI 도구 동시 지원 → 팀 내 도구 선택 자유도
5. **점진적 프로필링**: 사용자가 "뭘 자동화할지조차 정리 안 된 상태"에서 시작 가능 → 온보딩 낮은 진입장벽
6. **신뢰 게이팅**: 스킬 신뢰도 검증 + `allowed-tools` 사전 승인 → 권한 팝업 피로감 감소

---

## 8. 약점 & 개선 기회

1. **온보딩 가파름**: 6단계 루프를 처음 써본 사용자는 "무엇부터 할지"에 혼란 가능
   - **개선**: 첫 마일스톤 가이드 스텝 추가 (예: "3단계 미니 프로젝트" 템플릿)

2. **에이전트 컨텍스트 버짓 불명확**: 각 에이전트가 "200k 신선한 컨텍스트"라지만, 실제 프로젝트 규모별 경험담 부족
   - **개선**: 크기별 벤치마크 문서 (`small < 5KB`, `medium < 100KB`, `large >= 500KB` 구간별 성공/실패 패턴)

3. **비개발자 스킬 리스트 부족**: 현 33개 에이전트는 개발자 중심 (코드 리뷰, 디버깅)
   - **개선**: 기획/마케팅/HR/재무 특화 스킬 번들 추가 (예: `gsd-report-writer`, `gsd-email-scheduler`)

4. **상태 동기화 수동**: `.planning/state.md` 는 로컬 파일, 팀 협업 환경에서 충돌 가능
   - **개선**: git conflict resolution 자동화 + 선택적 클라우드 동기화 옵션

5. **테스트/검증 메커니즘 진입장벽**: "평가(evals)"라는 개념이 기술적 → 비개발자에게 추상적
   - **개선**: "예시 수집" 인터뷰로 감싸서, 테스트 코드를 숨긴 채 자동 회귀 검증

---

## 9. 우리 비개발자 하네스에 차용할 점

### 9.1 구조적 차용

1. **계층형 로딩 (Three-Tier Model)**
   ```
   Catalog (name + description) 
   → SKILL.md 본문 (500줄 한도)
   → references/ (상세 문서, 온디맨드 로드)
   ```
   GSD의 "워크플로우 → 에이전트 → 워크플로우" 자기 참조 구조를 그대로 채택.

2. **마크다운 기반 선언 (No Custom DSL)**
   - SKILL.md 자체가 **executable spec** (YAML frontmatter + 프로세스)
   - 버전 관리·CI/CD 검증·인간 가독성 동시 확보

3. **프로필 기반 설치 (Progressive Disclosure)**
   ```
   --profile=minimal  # 인터뷰 + 온보딩만
   --profile=standard # + 스킬 작성기
   --profile=full     # + 고급 검증 & 디자인 시스템
   ```

4. **신뢰 게이팅 & 권한 사전 승인**
   ```yaml
   ---
   allowed-tools: [Read, Write, AskUserQuestion, Notion, Gmail]
   compatibility: ["Claude Code", "Copilot", "Cursor"]
   ---
   ```
   외부 의존성(Notion 토큰, Gmail 인증) 부족 시 설치 가이드 자동 트리거.

### 9.2 프로세스/워크플로우 차용

1. **인터뷰 → 문서 → 검증 반복**
   ```
   1. AskUserQuestion (직군 선택)
   2. Read reference files (도메인 샘플)
   3. Discuss (회색 영역 정의)
   4. Write spec (SKILL.md 초안)
   5. Verify (예시 실행 & 회귀 테스트)
   ```

2. **Skill Creator 메타 스킬 (실습 캡처)**
   - 사용자가 한 번 작업을 마칠 동안 도구가 대화·수정·재시도 기록
   - 회고 시 "효과 있었던 단계 / 사용자 수정 / I/O 형식" 추출 → SKILL.md 자동 생성

3. **신뢰도 벤치마크 (with_skill vs without_skill)**
   - 각 자동화를 적용/미적용 두 가지로 실행 → `timing.json` + `grading.json` + `benchmark.json` 산출
   - 실제 생산성 향상을 정량화

### 9.3 기술 차용

1. **State Machine (`.planning/state.md`)**
   - 사용자 직접 설정 파일 편집 금지, 도구가 마크다운 필드 추출·교체·정규화
   - 비개발자가 "상태"라는 개념을 의식 없이 따름

2. **Hooks 시스템 (Git + JS/Shell)**
   ```
   - gsd-context-monitor.js: 컨텍스트 사용량 추적
   - gsd-statusline.js: 세션 상태 표시 (UI)
   - gsd-validate-commit.sh: 커밋 메시지 규칙 검증
   ```
   비개발자도 진행 상황을 "상태 표시"로만 이해하고, 백그라운드 검증은 자동.

3. **Generated Code (TypeScript → CommonJS)**
   ```javascript
   // TypeScript 소스 → 컴파일 타임에 CJS 생성
   // CLI와 SDK 양쪽이 동일 로직 공유 (hand-drift 방지)
   const stateDocument = require('./state-document.generated.cjs');
   ```

---

## 10. 차별화 포인트

### 우리가 GSD와 다르게 해야 할 것

1. **온보딩 FIRST**
   - GSD: 개발자 대상, "6단계 루프" 학습 곡선 존재
   - **우리**: 비개발자 대상, 첫 인터뷰 5분 안에 "스킬 초안" 생성 가능해야 함
   - 예: "당신의 직군은?" → "기획" → 기획 특화 템플릿 추천 (보고서, 일정 추출, 경쟁사 모니터링)

2. **도메인 특화 스킬 사전 번들**
   - GSD: 33개 에이전트, 대부분 코드 생성·검증 중심
   - **우리**: 각 직군별 톱 3 스킬 사전 제작
     - 기획: 보고서 생성, 요구사항 추출, 경쟁사 분석
     - 마케팅: 카피 변형, 채널별 맞춤, A/B 테스트
     - HR: 채용 공고 작성, 면접 질문 생성, 급여 벤치마크
     - 영업: 리드 스코어링, 제안서 자동 작성, Follow-up 메일

3. **디자인 시스템 기본 탑재**
   - GSD: 코드 산출물 중심 (markdown/TypeScript)
   - **우리**: 비개발자가 만드는 대시보드·리포트도 "AI 슬롭"처럼 보이지 않게
   - `design-consultation` + `design-html` 스킬로 강제 일관성

4. **메모리 시스템 (사용자 프로필 학습)**
   - GSD: 프로젝트 단위 상태 (`.planning/`)
   - **우리**: 사용자 단위 메모리 (`memory/user/{name}/`)
     - 기획자 A의 "선호 양식" 자동 학습
     - "마케팅팀 톤 매뉴얼" 자동 주입
     - 다른 프로젝트에서도 맥락 자동 이어받기

5. **외부 도구 통합 강화**
   - GSD: 내부 상태 관리 중심
   - **우리**: Notion, Gmail, Slack, Figma, Google Drive 등과 양방향 동기화
     - "Inbox 폴더에 파일 놨어요" → Notion 데이터베이스 자동 추가
     - "스킬 실행하면" → 결과를 Slack 채널로 자동 공유

6. **검증 UX 개선 (테스트 숨기기)**
   - GSD: evals.json, Nyquist auditor 등 기술 용어 노출
   - **우리**: "예시 3개 주기" 인터뷰로 감싸기
     - 사용자는 "입력 예시 3개 제공하기"만 인식
     - 백그라운드에서 자동으로 회귀 테스트 + 성능 벤치마크

---

## 11. 한줄 요약

**GSD는 개발자 대상 스펙 주도 시스템으로, 컨텍스트 부패를 계층형 워크플로우(인터뷰→문서→검증)와 신선한 에이전트 윈도우로 해결하며, Markdown 선언·프로필 기반 설치·런타임 무관 배포를 통해 도메인 무관 재사용성을 확보했다. 우리는 이를 비개발자용으로 차용하되, 온보딩 우선·직군 특화 스킬·디자인 시스템·사용자 프로필 메모리를 추가해 "도메인 정보만 전달, 나머지는 도구가 처리"라는 핵심 목표를 달성할 수 있다.**

---

## 부록: 핵심 파일 목록

| 파일 | 역할 |
|-----|------|
| `README.md` | 6단계 루프, 설치 방법, 신뢰 사용자 언급 |
| `CONTEXT.md` | 도메인 용어, 모듈 설명, PR 리뷰 체크리스트 (751줄) |
| `package.json` | npm 진입점, 스크립트 (빌드/테스트/린트) |
| `bin/install.js` | 런타임 감지, 프로필 기반 설치, 도구 매핑 (~457KB) |
| `sdk/src/` | TypeScript 쿼리 레지스트리, 상태 머신, CLI 경로 |
| `commands/gsd/*.md` | 60개 워크플로우 진입점 (라우팅, 서브에이전트 스폰) |
| `agents/gsd-*.md` | 33개 에이전트 정의 (마크다운 + YAML frontmatter) |
| `hooks/gsd-*.js` | Git hooks, 상태 모니터, 스타일 가이드 (9개) |
| `docs/AGENTS.md` | 에이전트 역할 카드, 도구 할당, 병렬성 |
| `docs/ARCHITECTURE.md` | 계층 설명, 의존성 그래프 |

---

**작성 날짜**: 2026-05-18  
**분석 범위**: get-shit-done-cc v1.50.0-canary.0 (986개 파일)  
**참고**: RFC/ADR 문서, CHANGELOG v1.42~1.50, 사내 Slack 스레드

---

## 부록: 재검증 결과 및 정정사항 (Audit Addendum, 2026-05-18)

레퍼런스 디렉터리(`agents/`, `commands/gsd/`, `docs/adr/`, `get-shit-done/templates/`, `get-shit-done/bin/lib/`)를 전수 재정독한 결과 다음 정정·보강 사항이 도출되었다.

### A. 정정 사항
| 본문 주장 | 실제 | 비고 |
|---|---|---|
| "60개 워크플로우" | **67개 commands** (`commands/gsd/*.md`) | 워크플로우와 커맨드 개념 혼동 — 모두 마크다운 진입점 |
| "15개 스킬" | **불명/허위** — skills 디렉터리 자체가 별도 셀 수 없음 | 15는 **runtime** 수(`install.js:525`)이지 skill 수가 아님. 본문 1·3·4장에서 "skills"라 한 부분 표기 정정 필요 |
| 33개 에이전트 | ✅ 정확 | `agents/gsd-*.md` 33개 확인 |
| install.js ~457KB | ✅ 정확 (457,634 bytes) | |
| 15 runtimes | ✅ 정확 (claude, kilo, opencode, gemini, codex, copilot, antigravity, cursor, windsurf, augment, trae, qwen, hermes, codebuddy, cline) | |
| CONTEXT.md 751줄 | ✅ 정확 | |

### B. 본문이 통째로 빠뜨린 핵심 서브시스템
1. **`gsd-user-profiler.md` 에이전트** — 100~150개 세션 메시지를 recency-weighted/project-proportional 샘플링하여 **8개 행동 차원**으로 신뢰도 점수화. 우리 "직군 프로파일링 인터뷰"와 정확히 같은 문제를 이미 해결. 비개발자 적응 시 (verbosity / domain / speed / error tolerance / collaboration style / documentation preference / tool familiarity / verification rigor) 8개 축을 그대로 차용 가능.
2. **ADR 시스템** — `docs/adr/` 에 14개 accepted + 3개 draft. 특히 **ADR-0011 "Skill Surface Budget Module"** 은 우리 점진적 공개 설계의 청사진:
   - **Phase 1**: 설치 시 프로필 (`--profile=core|standard|full`) → `.gsd-profile` 마커 기록
   - **Phase 2**: 런타임 cluster-level 토글 (`/gsd:surface` 커맨드)
3. **`get-shit-done/bin/lib/clusters.cjs`** — 의도적으로 중첩되는 named skill 그룹. "마케팅 클러스터 + 디자인 클러스터" 동시 선택 가능. 우리 직군 토글 모델에 직결.
4. **36개 템플릿 (`get-shit-done/templates/`)** — AI-SPEC.md / DEBUG.md / UAT.md / UI-SPEC.md / VALIDATION.md / discovery.md / phase-prompt.md / planner-subagent-prompt.md / requirements.md / roadmap.md / state.md / user-profile.md / verification-report.md 등. 비개발자 직군별 변환 시 marketing-brief / hr-proposal / finance-report 템플릿으로 1:1 매핑 가능.
5. **`gsd-nyquist-auditor.md` 에이전트** — 본문 4.2에서 "TDD 게이트"로만 처리되었지만 실제로는 3개 예시 입력에 대해 회귀 채점 → `grading.json`/`benchmark.json` 산출. 비개발자에게 "예시 3개 주기"로 위장하기 좋은 패턴.
6. **다국어 README** — README.pt-BR.md / README.zh-CN.md / README.ja-JP.md / **README.ko-KR.md** 가 이미 존재. 우리 한국어 1차 지원 설계 시 docs/ 하위 구조 그대로 복제 권장.
7. **워크트리 안전성 테스트 (~15개)** — bug-3491-nested-git-worktree.test.cjs, bug-2774-worktree-cleanup-workspace-safety.test.cjs 등. 비개발자가 마주칠 권한/경로 에지 케이스 대비.

### C. GSD가 **하지 않는** 것 (우리 차별화 기회)
- **MCP 공식 추상화 레이어 부재** — 에이전트가 외부 도구를 직접 호출. 우리는 1급 MCP/카테고리 추상화로 차별화.
- **비개발자/비즈니스 역할 인식 0** — README/docs에 "non-developer / marketer / HR" 언급 전무.
- **팀 협업 동기화 부재** — 상태는 로컬 `.planning/` 한정.

### D. 본문 수정 권고
- 1장 "60 workflows" → "67 commands"
- 1장 "15 skills" → "15 runtimes" 로 의미 명확화하고 skill 수치는 삭제 (skill은 무한)
- 9장(차용 점)에 **D.1 user-profiler**, **D.2 ADR-0011 Skill Surface Budget**, **D.3 36 templates**, **D.4 Nyquist auditor**, **D.5 한국어 README ko-KR 구조** 5개 항목 추가

### E. 즉시 적용 가능 코드 위치
- `/get-shit-done/bin/lib/install-profiles.cjs` + `/get-shit-done/bin/lib/clusters.cjs` → 우리 프로필 설치 직접 참고
- `/agents/gsd-user-profiler.md` → 우리 `harness-user-profiler.md`로 한국어/직군 버전 포팅
- `/docs/adr/0011-skill-surface-budget-module.md` → 우리 ADR-001로 그대로 차용


# Andrej Karpathy Skills 프로젝트 분석 보고서

**대상**: `/home/jihwan/jinhak-vibecode/references/plugins/andrej-karpathy-skills-main`
**작성일**: 2026-05-18
**분석 목표**: 비개발자용 AI 하네스 도구 개발을 위한 인사이트 도출

---

## 1. 프로젝트 개요

**정식명**: Karpathy-Inspired Claude Code Guidelines  
**저자**: Forrest Chang (기반: Andrej Karpathy의 LLM 코딩 안티패턴 관찰)  
**라이선스**: MIT  
**핵심 가치 제안**: LLM이 코딩할 때 자주 범하는 4가지 실수를 구조적으로 차단하는 행동 지침 세트

---

## 2. 프로젝트 철학

### 2.1 근본 문제 인식

Andrej Karpathy의 X 포스트에서 출발:

> "모델들은 대신 잘못된 가정을 하고서도 확인하지 않은 채 진행한다. 혼란을 관리하지 않고, 명확히 하려 묻지도 않고, 비일관성을 드러내지도 않는다."

4가지 핵심 안티패턴:
1. **암묵적 가정** — 불확실한 부분을 조용히 택하고 실행
2. **과도한 복잡화** — 불필요한 추상화, 선제적 기능, 200줄짜리 코드로 50줄 문제 해결
3. **수술 부정확** — 버그 수정하면서 무관한 코드/포맷/주석까지 손댐
4. **불분명한 성공 기준** — "고쳐줘" 같은 모호한 지시로 루프 진행

### 2.2 핵심 해법: 4대 원칙

| # | 원칙 | 핵심 행동 |
|---|------|----------|
| **1** | Think Before Coding | 가정 명시화 → 다중 해석 제시 → 단순 방식 제안 → 불명확 시 정지 |
| **2** | Simplicity First | 요청한 것만 구현 / 단일 용도 추상화 금지 / 스펙 없는 에러 처리 금지 |
| **3** | Surgical Changes | 요청 라인만 수정 / 스타일 미변경 / 무관 dead code 언급만 (삭제 금지) |
| **4** | Goal-Driven Execution | 명확한 성공 기준 정의 → 테스트로 재현 → 통과 검증 → 회귀 확인 |

---

## 3. 디렉터리 & 아키텍처 분석

### 3.1 파일 구조

```
andrej-karpathy-skills-main/
├── README.md                 # 4 원칙 상세 설명 + 설치 가이드
├── README.zh.md              # 중국어 번역
├── CLAUDE.md                 # 프로젝트용 동작 지침 (compact 버전)
├── EXAMPLES.md               # 10개 실제 예시 (잘못된 vs 올바른 패턴)
├── CURSOR.md                 # Cursor IDE 연동 가이드
├── .claude-plugin/           # Claude Code 플러그인 메타정보
├── .cursor/rules/
│   └── karpathy-guidelines.mdc  # Cursor 규칙 파일
└── skills/
    └── karpathy-guidelines/
        └── SKILL.md          # Agent Skills 표준 번들
```

### 3.2 배포 모델: 2가지 경로

**Option A: Plugin (추천)**
```bash
/plugin marketplace add forrestchang/andrej-karpathy-skills
/plugin install andrej-karpathy-skills@karpathy-skills
```
→ 프로젝트 간 자동 공유

**Option B: Per-Project CLAUDE.md**
```bash
curl -o CLAUDE.md https://raw.githubusercontent.com/forrestchang/andrej-karpathy-skills/main/CLAUDE.md
# 또는 기존 CLAUDE.md에 append
```
→ 프로젝트별 커스터마이징 가능

---

## 4. 핵심 기능 & 구현 패턴

### 4.1 SKILL.md 구조

```yaml
---
name: karpathy-guidelines
description: Behavioral guidelines to reduce common LLM coding mistakes...
license: MIT
---

# Karpathy Guidelines
[마크다운 본문 콘텐츠]
```

**특징**:
- YAML frontmatter로 메타정보 (name, description, license)
- 마크다운 본문에 구조화된 가이드라인
- 실행 코드 없음 (순수 지침)
- 외부 의존성 없음 (standalone)

### 4.2 EXAMPLES.md 패턴

각 원칙마다 **3~4개 현실적 예시**:

#### 예시 구조
```
### 예제 N: [상황명]

**❌ 잘못됨 (LLM이 보통 하는 것)**
[코드 블록: 여러 문제가 섞여 있음]

**문제점**:
- 가정 1
- 가정 2
- ...

**✅ 올바름 (명시적 사고)**
[개선된 코드 블록]

**설명**: [왜 이게 나은가]
```

#### 학습 가치
- 추상적 원칙 → 구체적 코드로 번역
- 동료 코드 리뷰처럼 현실적 예시
- "이건 내 프로젝트에 도 있을 것 같은데?" 직관적 이해

### 4.3 CLAUDE.md (Compact 버전)

README와 달리:
- 66줄 (vs 172줄)
- 4 원칙만 핵심 설명
- 예시 최소화
- 직접 프로젝트 CLAUDE.md에 merge 가능

---

## 5. 배포 & 설치 방식

| 방식 | 대상 | 설치 난도 | 범위 |
|------|------|---------|------|
| **Plugin** | Claude Code 사용자 | 낮음 (2 명령) | 모든 프로젝트 |
| **Curl + CLAUDE.md** | 어떤 프로젝트든 | 낮음 (1 줄) | 해당 프로젝트만 |
| **Cursor 규칙** | Cursor IDE 사용자 | 중간 (`.cursor/` 복사) | 해당 프로젝트 |
| **Git Submodule** | 리포지토리 수준 | 중간 | 레포 전체 |

**장점**: 선택지가 명확하고 메이저 AI 에디터를 모두 지원

**약점**: 각 에디터별 별도 설정 필요 (중앙집중식 아님)

---

## 6. 호환성 및 외부 의존성

### 6.1 지원 도구

- ✅ Claude Code (`.claude-plugin/`)
- ✅ Cursor IDE (`.cursor/rules/`)
- ✅ 일반 텍스트 CLAUDE.md (모든 LLM IDE)

### 6.2 외부 의존성

**없음**. 순수 마크다운 + 지침 텍스트만 포함.
- Git 저장소 아님
- 런타임 스크립트 없음
- 외부 API 호출 없음

---

## 7. 강점 (우리 도구가 배울 점)

### 7.1 **명확한 문제 정의**
- 근본 관찰(Karpathy의 실제 LLM 행동 분석)에서 출발
- "AI가 왜 안 좋은 코드를 쓰나?" → 4가지 구체적 원인으로 환원
- 각 원인에 1:1 대응하는 원칙 수립

### 7.2 **설명 > 처방**
- 지침은 "도구가 어떻게 동작하느냐"가 아니라 "LLM이 왜 실수하나"에 집중
- EXAMPLES.md는 단순 "하지 말 것" 나열이 아니라 반복 가능한 패턴 제시
- 비개발자도 이 논리 체계를 자기 도메인에 적용 가능

### 7.3 **다중 배포 전략**
- Plugin (집중식) + CLAUDE.md (분산식) 동시 지원
- Cursor 같은 경쟁 도구도 공식 지원
- 사용자가 선택 가능한 구조

### 7.4 **실제 코드 예시**
- 추상적 설명만 아니라 Python/JavaScript 구체 예시
- "올바른" 버전도 함께 제시하여 diff로 학습 가능
- 각 예시가 실제 코드 리뷰처럼 자연스러움

### 7.5 **경량성**
- 단일 리포지토리, 작은 파일 크기
- 설치 커맨드 2줄
- 외부 의존성 없음 → 배포 마찰 최소화

---

## 8. 약점 & 한계

### 8.1 **비개발자 온보딩 부재**
- 모든 콘텐츠가 개발자/LLM 행동 향상 가정
- "기획가가 보고서 자동 생성 스킬을 만들려면?" 같은 비개발 시나리오 미제시
- 지침 자체가 "코딩" 중심 (마케팅/기획/HR 등 비코딩 작업 미포함)

### 8.2 **실행 메커니즘 부재**
- CLAUDE.md는 "지침" 텍스트일 뿐, LLM이 자동으로 따르도록 강제하지 않음
- 사용자가 매번 "4원칙 기억하고 LLM에 상기시켜야" 함
- 도구 차원에서 자동 적용 불가

### 8.3 **도메인 지식 수집 미지원**
- 사용자 고유 정보(예: 회사 톤앤매너, 승인 프로세스, 표준 포맷) 캡처 메커니즘 없음
- 인터뷰/Q&A 시스템 없음
- "지침만 주는 것"이 끝

### 8.4 **검증/평가 체계 없음**
- 이 지침을 따랐을 때 실제 개선도(코드 품질, 토큰 절감, 반복 횟수)를 측정하는 evals 없음
- 대조군("지침 없는 경우") 벤치마크 미제공
- 사용자는 "더 나아졌나?" 정성적으로만 판단 가능

### 8.5 **스킬 재사용성 낮음**
- 단일 SKILL.md로 모든 도구를 커버하려 함
- 분해/모듈화/계층화 없음 (예: 기초 지침 vs 고급 지침)
- 프로젝트별 커스터마이징 가이드 부족

### 8.6 **AI 도구 호환성 제한**
- Claude Code/Cursor 중심 (최신 도구: Copilot, Gemini CLI, OpenCode 등은 미테스트)
- 각 도구의 상이한 프롬프트/메모리 모델 고려 부족
- "표준 에이전트 스킬"로 언급했으나 실제로는 .claude-plugin에 Claude Code 종속

---

## 9. 우리 하네스 도구에 차용할 점

### 9.1 **명확한 문제 정의 → 구조화된 해법**
우리도 "비개발자가 AI 하네스를 왜 못 쓰나?"를 분석한 후 4~5가지 핵심 카테고리로 환원:
- 온보딩 미지원 (지침만 줌, 인터뷰 없음)
- 도메인 지식 파악 부족
- 출력 표준 불명확 (SKILL.md 포맷이 모호)
- 검증 피드백 부재
- 도구 설치 과정 복잡

각각에 1:1 대응하는 기능 모듈 설계.

### 9.2 **다중 배포 전략 채택**
```
출력 1차: .agents/skills/<name>/SKILL.md (표준)
출력 2차: 
  - Claude Code: CLAUDE.md 폴백
  - Cursor: .cursor/rules/
  - Copilot: .github/copilot-instructions.md
  - 기타: MANIFEST.json 폴백
```

표준 경로를 1급 시민으로, 폴백을 2급 시민으로 명확히 계층화.

### 9.3 **SKILL.md → 실행 가능한 아티팩트로 진화**
Karpathy의 "지침"은 정적이지만, 우리는:
- SKILL.md는 메타데이터만 (name, description, compatibility)
- scripts/ 에서 실제 로직
- evals/ 에서 검증
- references/ 에서 상세 가이드

로 계층 분리하여 **재사용성 & 테스트 가능성 극대화**.

### 9.4 **명시적 인터뷰 → 자동 생성**
Karpathy: 사용자가 지침을 읽고 스스로 따라야 함.
우리: 지침 대신 **대화형 wizard 제공**:
- Q1: 직군은? (기획/마케팅/영업/…)
- Q2: 반복 작업 설명?
- Q3: 입력 소스는? 출력 형식은?
- Q4: 누가 받아야 함?

→ 답변 자동→ SKILL.md 초안 + evals 후보 + design 토큰

### 9.5 **with / without 벤치마킹**
Karpathy: "더 나아졌나?" 정성적 판단.
우리: 매 스킬마다 자동 평가:
- 같은 입력으로 스킬 적용/미적용 2가지 실행
- tokens, duration, assertion PASS/FAIL 기록
- delta (시간/비용/정확도 개선율) 리포트
- 사용자: 수치 기반 선택 가능

---

## 10. 차별화 포인트

| 항목 | Karpathy 스킬 | 우리 하네스 |
|------|-------------|---------|
| **대상** | 개발자/LLM 코딩 | **비개발자 (기획/마케팅/HR/재무)** |
| **입력 방식** | 텍스트 가이드 | **대화형 인터뷰 + 파일 수집** |
| **출력** | CLAUDE.md (지침) | **.agents/skills/ 실행 번들** |
| **재사용성** | 단일 프로젝트/도구 | **다중 AI 도구, 재사용 가능 모듈** |
| **검증** | 수동 피드백 | **자동 evals + with/without 벤치** |
| **도메인 캡처** | 없음 | **style.md, design.md, memory/** |
| **외부 통합** | 없음 | **Figma/Notion/Gmail/Teams/Webhook** |
| **설계 시스템** | 미포함 | **DESIGN.md + design-html 스킬** |
| **메타 스킬** | 없음 | **Skill Creator (실습 캡처→추출)** |

---

## 11. 한 줄 요약

**Karpathy 스킬은 "LLM이 좋은 코드를 쓰게 하는 4가지 사고 원칙"을 명확히 정의하고 경량 배포한 성공 사례이지만, 비개발자 온보딩·도메인 지식 수집·자동 검증·도구 통합이 부재하므로, 우리 하네스는 이 철학(명확한 문제 정의 → 다중 배포)을 채택하되 인터뷰·검증·도메인 캡처·도구 통합으로 완전한 "비개발자용 자동화 엔지니어링" 플랫폼으로 진화시켜야 한다.**

---

## 12. 구체적 적용 체크리스트

### 즉시 적용 가능 (MVP 단계)
- [ ] SKILL.md frontmatter 표준 채택 (name, description, compatibility)
- [ ] 다중 배포 경로 (`.agents/skills/` + CLAUDE.md + .cursor/ 등)
- [ ] README + EXAMPLES 형식 (원칙 설명 + 실제 코드 예시)
- [ ] 경량 설치 (2~3 커맨드)

### v0.2 추가 구현
- [ ] 대화형 인터뷰 (SKILL.md 자동 생성)
- [ ] 도메인 파일 수집 (style.md, references/)
- [ ] 기본 evals 자동 생성 (예시 기반)

### v0.3+ 고도화
- [ ] with/without 벤치마킹 자동화
- [ ] Design System 통합
- [ ] Skill Creator 메타 스킬
- [ ] 도구별 호환성 레이어 (Copilot/Gemini/etc)

---

**참고 자료**
- 원본 리포지토리: https://github.com/forrestchang/andrej-karpathy-skills
- Karpathy 원문: https://x.com/karpathy/status/2015883857489522876
- Agent Skills 표준: https://agentskills.io/specification

---

## 13. 재검증 부록 (Audit Addendum, 2026-05-18)

전체 디렉터리(README.zh.md, marketplace.json, .claude-plugin/plugin.json, .cursor/rules/karpathy-guidelines.mdc 포함)를 재정독한 결과 다음 정정·보강 사항이 도출되었다.

### 13.1 정정 사항
- **README.zh.md 누락**: 본문 3.1에 리스트되지 않았던 중국어 README가 존재한다. 다국어 배포 전략 사례로 우리 한국어판 설계에 직접 참고 가치가 있다.
- **Plugin ID 표기 모호**: 5.1의 설치 명령 `andrej-karpathy-skills@karpathy-skills`에서 `karpathy-skills`는 `marketplace.json`의 `id` 필드(마켓플레이스 레벨)이며 nested `name`은 `andrej-karpathy-skills`다. 우리 마켓플레이스 메타데이터 설계 시 동일 이중 식별자 구조를 채택해야 한다.
- **저자 표기**: README 1~5행은 후속 프로젝트 [Multica](https://github.com/multica-ai/multica) (관리형 코딩 에이전트 + 재사용 스킬 플랫폼)를 명시적으로 광고한다. 보고서 8장에 누락된 "생태계 진화 포지셔닝" 신호로, 우리 도구의 "graduation path" 설계에 시사점이 있다.

### 13.2 추가 인사이트
- **`.cursor/rules/karpathy-guidelines.mdc`의 `alwaysApply: true` 메타데이터**: Cursor 사용자에게는 사용자 호출 없이도 정책이 자동 적용된다. **도구 레벨 정책 강제 vs 지시문 레벨 권고**의 차이는 비개발자 하네스에서 결정적이다. 우리는 `alwaysApply` 의미론을 SKILL.md frontmatter나 settings.local.json에 1차로 도입해야 한다.
- **다중 파일 동기화 부담**: CURSOR.md 27~28행은 "4원칙 변경 시 CLAUDE.md, .cursor/rules/karpathy-guidelines.mdc, SKILL.md 3개 파일을 모두 수기로 sync해야 함"을 명시한다. → 우리 도구는 **단일 진실 소스(Single Source of Truth) + 템플릿 생성**으로 이 부담을 자동화해야 한다.
- **레이어드 구성 패턴**: README.md 149~161행은 `## Behavioral Guidelines [KARPATHY]` 위에 `## Project-Specific Guidelines` 를 덧붙이는 정식 합성 사례를 보여준다. 우리는 명시적 확장 포인트를 SKILL.md에 표준 섹션으로 둬야 한다 (예: `## Domain Overrides`).
- **frontmatter 비대칭**: SKILL.md는 `name`/`description`/`license`만 두어 의도적으로 최소화(다른 에이전트 도구와의 호환성을 위해)했고, plugin.json·marketplace.json은 `version`/`keywords`/`category`/`author`로 풍부하다. → "포터블 코어 + 채널별 강화 메타데이터" 원칙.

### 13.3 차용 가치 패턴 (정정 후)
| 파일 | 패턴 | 우리 도구 적용 |
|---|---|---|
| `.cursor/rules/karpathy-guidelines.mdc` (frontmatter) | `alwaysApply: true` 자동 강제 | 비개발자가 호출을 잊어도 강제되는 정책 레이어 |
| `CURSOR.md` "Use in another project" | 복붙 가능한 배포 지시문 | 한국어 온보딩 가이드 템플릿 |
| `README.md` 149~161행 | 합성 가능한 레이어 구조 | `## Domain Overrides` 표준 섹션 |
| `marketplace.json` + `plugin.json` 이중 선언 | 채널별 메타데이터 분리 | 한 SKILL을 npm + Claude Code 마켓 + Cursor에 동시 배포 |

### 13.4 보고서 본문에 반영 권장
- 9.4 인터뷰 자동화에 **단일 진실 소스 → 자동 다중 출력** 명시
- 10 차별화 매트릭스에 **"alwaysApply 시맨틱"** 행 추가

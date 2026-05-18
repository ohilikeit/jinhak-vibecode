# Superpowers 프로젝트 상세 분석 보고서

## 개요

**Superpowers**는 Claude Code, Cursor, Codex, Gemini CLI, Copilot, OpenCode 등 다양한 AI 코딩 에이전트를 위한 **구성형 스킬 라이브러리**이자 **소프트웨어 개발 방법론**이다. 단일 codebase로 5개 이상의 플랫폼을 동시 지원하며, 14개 핵심 스킬(TDD, 디버깅, 협업 워크플로우)을 제공한다.

---

## 철학 & 설계 원칙

Superpowers의 핵심 철학:
- **Test-Driven Development**: 항상 테스트를 먼저 작성
- **Systematic over ad-hoc**: 프로세스와 체크리스트 강제
- **Complexity reduction**: 단순성을 주요 목표로
- **Evidence over claims**: 검증 없이 성공 선언 금지

모든 스킬은 명확한 **트리거 조건**(when to use)과 **하드 게이트**(must-do 체크리스트)를 포함한다. 예: brainstorming 스킬은 코드 작성을 금지하는 `<HARD-GATE>` 선언으로 에이전트를 구속한다.

---

## 아키텍처

### 2.1 스킬 시스템 (Skills/)

```
skill-name/
├── SKILL.md              # 필수: YAML 프론트매터(name, description) + 마크다운 본문
├── supporting-file.*     # 선택: 레퍼런스, 스크립트, 템플릿
└── evals/evals.json      # 선택: 테스트 케이스 (미구현)
```

**핵심 특징:**
- **프론트매터**: `name`(영문자/숫자/하이픈), `description`(1024자 이하, "Use when..." 형식)
- **크기 규칙**: 70~655줄 범위 (평균 230줄)
- **구조화**: 제목, 체크리스트, 플로우 다이어그램(dot), 프로세스 단계별 설명

**14개 핵심 스킬:**
1. `brainstorming` - Socratic 대화로 설계 정제 (하드 게이트: 코드 금지)
2. `writing-plans` - 2~5분 단위 작업으로 분해
3. `subagent-driven-development` - 병렬 서브에이전트 + 2단계 검증
4. `test-driven-development` - RED-GREEN-REFACTOR 강제
5. `systematic-debugging` - 4단계 근본원인 분석
6. `verification-before-completion` - 수정 완료 검증
7. `requesting-code-review` / `receiving-code-review` - 협업 워크플로우
8. `using-git-worktrees` - 병렬 브랜치 관리
9. `finishing-a-development-branch` - 병합/PR/보관 결정
10. `writing-skills` - TDD 기반 스킬 작성 (메타 스킬)
11. `using-superpowers` - 부트스트랩 가이드
12. `executing-plans` - 배치 실행 + 체크포인트
13. `dispatching-parallel-agents` - 병렬 서브에이전트

### 2.2 훅 시스템 (Hooks/)

**SessionStart 훅: 플러그인 로드 → using-superpowers 스킬 자동 주입**

```bash
# hooks/session-start (bash 스크립트)
1. using-superpowers/SKILL.md 로드
2. 플랫폼 환경변수 감지 (CURSOR_PLUGIN_ROOT, CLAUDE_PLUGIN_ROOT, COPILOT_CLI)
3. 플랫폼별 JSON 형식 변환 + 컨텍스트 주입
4. 레거시 설정 감지 및 마이그레이션 경고
```

**플랫폼별 출력 형식:**
- **Cursor**: `additional_context` (snake_case)
- **Claude Code**: `hookSpecificOutput.additionalContext` (nested)
- **Copilot CLI/기타**: `additionalContext` (SDK 표준)

**최적화**: 문자 단위 루프 대신 bash 파라미터 치환으로 JSON 이스케이프 고속화 (`${s//old/new}`)

### 2.3 멀티 AI 어댑터 패턴 (핵심 차별점)

**단일 codebase → 5개 플랫폼 동시 지원:**

```
superpowers/
├── .claude-plugin/plugin.json    (Claude Code 공식 마켓플레이스)
├── .codex-plugin/plugin.json     (OpenAI Codex)
├── .cursor-plugin/plugin.json    (Cursor)
├── gemini-extension.json         (Google Gemini CLI)
├── .opencode/INSTALL.md          (OpenCode)
├── skills/                       (모든 플랫폼 공유)
├── hooks/session-start           (플랫폼 감지 + 조건부 출력)
└── package.json
```

**핵심 전략:**
1. **공식 표준 따름**: `.agents/skills/` 경로 (Claude Code/Cursor/Copilot/Codex/Gemini 모두 자동 스캔)
2. **자체 manifest 최소화**: SKILL.md만으로 충분, 별도 CLAUDE.md/GEMINI.md는 선택사항
3. **런타임 플랫폼 감지**: 환경변수로 현재 에이전트 식별
4. **조건부 출력**: 각 플랫폼의 컨텍스트 주입 방식에 맞춤

**설치 분산화:**
- Claude Code: `/plugin install superpowers@claude-plugins-official`
- Cursor: `/add-plugin superpowers`
- Gemini: `gemini extensions install https://github.com/obra/superpowers`
- OpenCode: `opencode.json`에 `git+https://github.com/obra/superpowers.git` 추가
- Copilot: `copilot plugin install superpowers@superpowers-marketplace`

---

## 핵심 기능

### 3.1 자동 워크플로우 (기본 흐름)

```
1. brainstorming      → 설계 정제 (하드 게이트: 코드 작성 금지)
2. writing-plans      → 작업 분해 (2~5분 단위)
3. subagent-driven-dev → 병렬 실행 + 2단계 검증
4. test-driven-dev    → RED-GREEN-REFACTOR
5. requesting-review  → 코드 리뷰
6. finishing-branch   → 병합/PR/보관
```

에이전트는 각 단계에서 자동으로 해당 스킬을 호출하며, 사용자 명시 없이도 프로세스 강제.

### 3.2 스킬 작성 (writing-skills 메타 스킬)

**TDD 기반 스킬 개발:**
- RED: 서브에이전트로 스킬 없이 기본 동작 측정
- GREEN: 스킬 문서 작성
- REFACTOR: 서브에이전트로 재측정, 개선 확인

**특징:**
- "압박 시나리오(pressure test)" 자동화: 에이전트가 사용자 명시 없이도 실수하는 경우 직접 확인
- Gotchas 섹션 누적: 사용자 수정 패턴 자동 기록
- 점진적 공개(Progressive Disclosure): 본문 500줄 초과 시 references/ 분할 강제

---

## 배포 & 마켓플레이스

### 4.1 버전 관리

- **.version-bump.json**: 버전 번프 규칙 정의
- **RELEASE-NOTES.md**: 66KB 상세 변경 히스토리 (v5.1.0 기준)
- **LICENSE**: MIT (상업적 재사용 가능)

### 4.2 품질 게이트

**PR 거절율 94% 원칙:**
- `CLAUDE.md` 전문: 정확한 PR 템플릿 + 기여 가이드
- **AI 생성 PR 자동 거절**: "이 PR은 저작자의 명시 검토를 받지 않은 AI 생성물입니다"
- **기여 기준 명확화**:
  - ❌ 도메인 특화 / 프로젝트 특화 스킬 → 독립 플러그인으로
  - ❌ 제3자 의존성 추가 (zero-dependency 원칙)
  - ❌ 기술된 문제가 아닌 "이론적 개선"
  - ❌ 다중 PR 배치 제출

### 4.3 스폰서십 모델

GitHub Sponsors 링크로 오픈소스 지속성 확보. 작가(Jesse Vincent)의 명확한 자금화 전략.

---

## 멀티 AI 호환성 (우리가 배워야 할 핵심)

### 5.1 환경변수 감지 패턴

```bash
# hooks/session-start 일부
if [ -n "${CURSOR_PLUGIN_ROOT:-}" ]; then
  # Cursor → snake_case
  printf '{\n  "additional_context": "%s"\n}\n' "$session_context"
elif [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -z "${COPILOT_CLI:-}" ]; then
  # Claude Code → nested
  printf '{\n  "hookSpecificOutput": {\n    "additionalContext": "%s"\n  }\n}\n' "$session_context"
else
  # Copilot CLI / 기타 → SDK 표준
  printf '{\n  "additionalContext": "%s"\n}\n' "$session_context"
fi
```

**이점:**
- 런타임에 플랫폼 자동 식별 (설치 시간 선택 불필요)
- 단일 훅 스크립트로 모든 플랫폼 지원
- 새 플랫폼 추가 시 환경변수만 등록

### 5.2 공식 경로 우선 (.agents/skills/)

- Superpowers는 자체 manifest(CLAUDE.md, GEMINI.md) 미사용
- `.agents/skills/` 경로 + SKILL.md 표준만으로 모든 도구 호환
- 각 도구가 이미 이 경로를 1차 스캔 → 매우 호환성 높음

### 5.3 플랫폼 어댑터 (선택적)

필요 시에만 도구별 폴더 사용:
- `.claude-plugin/hooks/hooks.json` - Claude Code 훅 (이미 hooks/session-start 사용)
- `.cursor-plugin/hooks/hooks-cursor.json` - Cursor 훅 형식 (버전 1)
- 기타 도구도 필요 시 추가 가능

---

## 강점

| 강점 | 설명 |
|------|------|
| **진정한 멀티 도구 호환** | 환경변수 감지 + 공식 경로로 5개 플랫폼 동시 지원, 자체 manifest 최소화 |
| **견고한 스킬 설계** | YAML 프론트매터 표준화 + 구조화된 본문, 명확한 트리거 조건 + 하드 게이트 |
| **훅 기반 자동화** | SessionStart 훅으로 부트스트랩 스킬 자동 주입, 사용자 개입 최소화 |
| **엄격한 품질 게이트** | PR 템플릿 94% 거절율 + AI 생성 PR 자동 거절, 기여 기준 명확 |
| **비개발자 친화적 표현** | "human partner"(의도적) vs "user", 자체 철학 발전 |
| **검증 문화** | 모든 스킬은 TDD 기반 작성 (with/without 벤치마크) |

---

## 약점

| 약점 | 설명 |
|------|------|
| **플러그인 분산 설치** | 멀티 도구 환경에서 5회 이상 반복 설치 필요 (중복 설치) |
| **제한된 기능 폭** | 개발자/엔지니어링 프로세스에 초점, 비개발자 도메인(기획/마케팅) 스킬 부족 |
| **도구 통합 미흡** | Figma/Notion/Gmail 등 외부 도구 연동 없음 (미로드맵) |
| **메모리/컨텍스트 관리 부재** | 장기 대화 메모리, 세션 간 상태 보존 불지원 |
| **디자인 시스템 부재** | 프론트엔드 출력물의 시각적 일관성 보장 기제 없음 |
| **비개발자 온보딩 부재** | 원 기획(README.md 참고)과 달리 실제로는 "개발자 기준 스킬"에만 집중 |
| **외부 의존성 제약** | zero-dependency 원칙으로 확장성 제한 |

---

## 우리 하네스에 차용할 점

### 6.1 (A) 온보딩 & 인터뷰 레이어

**Superpowers 패턴:**
- SessionStart 훅으로 초기 가이드 자동 주입 (using-superpowers)
- 모든 프로세스는 번호 있는 체크리스트 → 누락 방지

**우리 적용:**
- 직군별 프로파일링 인터뷰 → using-harness 스킬 자동 주입
- 반복 업무 추출 질문 가이드 + 템플릿 자동 추천
- 인터뷰 답변 → SKILL.md frontmatter + 본문 초안 자동 변환

### 6.2 (B) 스킬 시스템 & 메타스킬

**Superpowers 패턴:**
- `writing-skills` 메타 스킬: TDD 기반 (RED-GREEN-REFACTOR)
- 압박 시나리오(pressure test) 자동화
- Gotchas 섹션 누적

**우리 적용:**
- `skill-creator` 메타 스킬: 실습 캡처 → 스킬 자동 추출
  - 사용자가 작업 수행 중 도구가 대화·수정·재시도 기록
  - 회고 시 4개 카테고리(효과 있던 단계/사용자 수정/입출력 형식/컨텍스트) 자동 추출
  - 샘플 입력 변형 → robustness 자동 테스트

### 6.3 (C) 도구 호환성 레이어 (가장 핵심)

**Superpowers 구현:**
- 환경변수 감지: `CURSOR_PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `COPILOT_CLI`
- 공식 경로: `.agents/skills/SKILL.md` (자체 manifest 최소화)
- 조건부 출력: Bash 스크립트로 플랫폼별 JSON 형식 변환

**우리 구현:**
```
harness/
├── hooks/session-start              (플랫폼 감지)
├── .agents/skills/<name>/SKILL.md   (공식 경로)
├── .claude-plugin/plugin.json       (Claude Code)
├── .cursor-plugin/plugin.json       (Cursor)
├── .codex-plugin/plugin.json        (Codex)
├── gemini-extension.json            (Gemini)
└── .copilot-cli/                    (Copilot)
```

**JSON 이스케이프 최적화:**
```bash
# 나쁜 예: 문자 단위 루프 (느림)
while IFS= read -r char; do
  case "$char" in
    '"') escaped+='\"' ;;
    '\\') escaped+='\\' ;;
  esac
done

# 좋은 예: Bash 파라미터 치환 (빠름)
s="${s//\\/\\\\}"
s="${s//\"/\\\"}"
s="${s//$'\n'/\\n}"
```

### 6.4 (D) 검증 & 평가 (Eval-Driven)

**Superpowers (미구현):**
- with/without 벤치마크 (스킬 적용 전후 비교)

**우리 구현:**
- `Description Tuner`: 자동화의 `description` 모호성 검증
  - ~20개 평가 쿼리 자동 생성 (should-trigger 8~10 + near-miss 8~10)
  - 각 3회 실행 → trigger rate 측정
  - train/validation 6:4 분할로 반복 개선
- `evals/evals.json`: Example-as-Test
  - 인터뷰에서 "이런 입력엔 이런 출력"이라 답한 내용 → prompt + expected_output + assertions 변환
  - 매 실행 시 비교 (회귀 테스트)

### 6.5 (E) 거절 문화 & 기여 가이드

**Superpowers 문화:**
- PR 거절율 94% 원칙
- 명확한 기준: 도메인 특화 스킬은 독립 플러그인으로
- AI 생성 PR 자동 거절

**우리 문화:**
- 기여 기준 명확화 (도메인별/프로젝트별 스킬 거절)
- 모든 PR은 완전한 템플릿 + 이전 PR 검색 필수
- 사람 검증 필수 (AI 생성 PR 거절 정책)

---

## 차별화 점

### 우리가 Superpowers와 다르게 할 것

| 관점 | Superpowers | 우리 하네스 |
|------|-----------|---------|
| **대상** | 소프트웨어 개발자 | 기획/디자인/마케팅/영업/HR/재무 |
| **프로세스** | 개발 방법론(TDD, 브래인스토밍, 코드리뷰) | 자동화 설계 인터뷰 → SKILL 생성 |
| **출력** | 소프트웨어/테스트 | 비개발 도메인 자동화(보고서, 이메일, 캘린더, 리드 점수 등) |
| **스킬 포커스** | 엔지니어링 워크플로우 14개 | 직군별 반복 업무 (기획: 보고서, 마케팅: 카피 변형, 영업: 리드 스코어링) |
| **메모리** | 없음 | 사용자 프로필 + 도메인 지식 (memory/ 폴더, 의미 검색 기반 자동 회상) |
| **디자인** | 없음 | 디자인 시스템(design-consultation, design-html, design-review) |
| **검증** | with/without 벤치마크(미구현) | Description Tuner + Eval-Driven (evals.json, 자동 생성/채점) |
| **도구 통합** | 미지원 | Figma/Notion/Gmail/Teams/Webhook 1차 지원 |
| **스킬 생성** | 메타 스킬(writing-skills) | Skill Creator (실습 캡처 → 자동 추출) |

---

## 한 줄 요약

**Superpowers는 "환경변수 감지 훅 + 공식 .agents/skills/ 경로 + 멀티 플랫폼 플러그인 구조"로 진정한 멀티 AI 도구 호환을 구현했으며, 우리는 이 패턴을 학습하되 비개발자 온보딩 인터뷰(직군 프로파일링, 반복 업무 추출) · 도메인 메모리(장기 회상) · 디자인 시스템(토큰 기반 컴포넌트) · 실습 기반 스킬 생성(Skill Creator)으로 차별화해야 한다.**

---

## 참고 자료

- **프로젝트**: https://github.com/obra/superpowers
- **리소스 경로**: `/home/jihwan/jinhak-vibecode/references/plugins/superpowers-main/`
  - 스킬: `skills/` (14개, 총 3,207줄)
  - 훅: `hooks/session-start` (Bash, 플랫폼 감지 로직)
  - 플러그인 설정: `.claude-plugin/`, `.cursor-plugin/`, `.codex-plugin/`, `gemini-extension.json`
  - 기여 가이드: `CLAUDE.md` (기여 요건 94% 거절율 문화)
- **원 기획**: `/home/jihwan/jinhak-vibecode/README.md` (우리 하네스 설계 기초)

---

## 부록: 재검증 결과 및 정정사항 (Audit Addendum, 2026-05-18)

5개 보고서 중 **수치 정확도가 가장 높음**. 14 스킬·LOC 범위·v5.1.0·94% 거절율·5개 플랫폼 모두 사실 확인. 다만 다음 보강이 필요하다.

### A. 사실 확인 (모두 ✅)
| 본문 주장 | 실제 |
|---|---|
| 14 core skills | `skills/` = 14개 디렉터리 |
| 70~655줄 범위, 평균 ~230 | 정확 (총 3,207줄 / 14 = 229) |
| 5개 플랫폼 (Claude/Cursor/Codex/Gemini/OpenCode) | 모두 확인 |
| v5.1.0 | 4개 plugin.json + gemini-extension.json 일치 |
| RELEASE-NOTES.md 66KB | 실제 68KB (1,180줄, 소소한 반올림 차) |
| 94% PR 거절율 | CLAUDE.md에 명시적으로 4회 등장 |
| evals.json 미구현 | `find` 결과 0건 — 정확 |
| HARD-GATE 패턴 | brainstorming/SKILL.md에서 확인 |

### B. 본문이 더 깊게 다뤘어야 할 것
1. **hook 포맷 변종 3가지** — 본문 5.1·6.3에 환경변수 분기는 잘 잡았으나 **각 플랫폼이 요구하는 JSON 스키마가 다름**을 충분히 강조하지 못함:
   - Cursor: `additional_context` (snake_case, `version: 1` + `sessionStart` 키)
   - Claude Code: `hookSpecificOutput.additionalContext` (nested + `hookEventName`)
   - Copilot CLI / SDK 표준: `additionalContext` (top-level)
   → 우리 도구는 이 3종 + Codex/Gemini까지 어댑터 매트릭스로 명시 관리해야 한다.
2. **Bash 파라미터 치환 JSON escape**의 정확한 코드 (`hooks/session-start` L23-31):
   ```bash
   s="${s//\\/\\\\}"
   s="${s//\"/\\\"}"
   s="${s//$'\n'/\\n}"
   s="${s//$'\r'/\\r}"
   s="${s//$'\t'/\\t}"
   ```
   본문 6.3 예시 코드는 약식이므로 실제 5종 변환을 그대로 사용 권장.
3. **writing-skills 메타 루프 (TDD)** — 본문 3.2에 RED-GREEN-REFACTOR로 요약했으나 핵심 디테일 누락:
   - **RED 단계는 반드시 서브에이전트로, 그 스킬 없이 실행** → 실제 합리화/실수를 캡처 (이론이 아닌)
   - REFACTOR는 1회성이 아니라 발견된 loophole을 닫고 다시 RED-GREEN 반복
   → 우리 Skill Creator의 핵심 알고리즘이 됨.
4. **PR 템플릿 엄격성** — "94% 거절율"이 그냥 통계가 아니라 **모든 섹션을 placeholder 없이 작성하지 않으면 자동 close**되는 정책. 우리 마켓플레이스 기여 정책에 차용 권장.
5. **evals.json 미구현의 의미** — Superpowers는 자동 evals 대신 **서브에이전트 압박 테스트(pressure test)** 로 수동 검증. → 우리는 이 압박 테스트 패턴 + evals.json 자동화를 **동시에** 채택해야 한다 (각각 다른 보완 역할).

### C. 보고서 본문에 반영 권장
- 5.1 코드 블록을 5종 escape 패턴 풀버전으로 교체
- 6.4 evals 섹션에 "예시 입출력 기반 회귀 + Superpowers의 압박 테스트 두 트랙 병행" 명기
- 6.3에 hook 스키마 매트릭스 표 추가 (Cursor / Claude Code / Copilot / Codex / Gemini 각 JSON 형태)

### D. 우리 하네스에 추가 차용 권고
- **압박 테스트 워크플로** — 새 스킬 작성 시 (1) 스킬 미적용 서브에이전트 베이스라인 → (2) 스킬 적용 후 동일 입력 재실행 → (3) 차이를 SKILL.md `## Gotchas` 섹션에 자동 누적. 이 사이클이 우리 Skill Creator 메타 스킬의 골격이 되어야 한다.
- **"human partner" 용어 채택 검토** — Superpowers는 "user" 대신 의도적으로 "human partner" 사용. 비개발자 한국어 버전에서 "사용자" 대신 "사용자분/팀원" 등 호칭을 일관 적용하면 톤이 부드러워진다.

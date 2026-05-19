# 개요

> 🌱 **처음 써보시는 분은 → [GETTING_STARTED.md](./GETTING_STARTED.md)** (비개발자용, 15분 완성)
> 🛠 개발자/제작자용 상세 문서 → [USAGE.md](./USAGE.md)

---

비개발자들이 업무에 바이브 코딩을 활용하면서 아직 익숙하지 않아 결과물의 퀄리티가 좋지 않다. 비개발자가 본인 도메인의 정보를 AI에게 전달하는 것에만 집중하면 나머지는 알아서 AI가 동작하여 큰 노력을 들이지 않고도 괜찮은 퀄리티의 결과물을 낼 수 있게 도와주는 하네스 엔지니어링 도구가 필요하다.

# 필요 기능 정의

---

## 1. 핵심 컨셉

**"비개발자가 도메인 정보만 전달하면, 나머지는 도구가 알아서 처리"**

- 대상: 기획, 디자인, 마케팅, 영업, HR, 재무 등 비개발 직군 전반
- 호환성: Claude Code / Cursor / Antigravity / Codex / Copilot 등 멀티 AI 도구 환경
- 출력: **공식 Agent Skills 표준을 따르는 `.agents/skills/<skill-name>/SKILL.md` 번들** (다수의 AI 도구가 이미 이 경로를 1차로 스캔)
- 표준 참조: [Agent Skills Specification](https://agentskills.io/specification)

## 2. 기능 카테고리

### A. 온보딩 & 인터뷰 레이어 (가장 핵심)

비개발자가 "뭘 자동화하고 싶은지조차 정리 안 된 상태"에서 시작한다는 전제.

- **직무/도메인 프로파일링 인터뷰**
    - 직군 선택(기획/디자인/마케팅/영업/HR/재무/CS 등) → 직군별 자동화 템플릿 추천
    - 반복 업무 추출 질문 가이드 ("매주/매일 반복하는 일은?", "결과물 형태는?")
- **자동화 설계 인터뷰 (Step-by-step Wizard)**
    - 입력 소스 → 처리 방식 → 출력 형식 → 저장 위치 → 전달 채널 순으로 질문
    - 각 단계마다 "이런 방식도 있어요" 식의 옵션 제시
    - 인터뷰 답변이 곧 `SKILL.md` frontmatter(`name`, `description`)와 본문 초안으로 변환
- **레퍼런스 파일 수집 프로토콜**
    - 지정 폴더(`./inbox/`)에 사용자가 파일을 넣으면 자동 감지·요약·확인
    - 도메인 정보 부족 시 후속 질문 자동 생성
- **결과물 스타일 가이드 캡처**
    - 톤앤매너, 길이, 포맷, 금기 표현을 샘플 파일에서 추출 → `references/style.md` 로 저장

### B. 스킬 & 모듈 시스템 (수평/수직 확장)

공식 Agent Skills 포맷을 1급 시민으로 다룬다. 스킬은 항상 다음 구조를 따른다.

```
skill-name/
├── SKILL.md          # YAML frontmatter(name, description, compatibility, allowed-tools) + 본문
├── scripts/          # 실행 코드 (재사용 가능 헬퍼)
├── references/       # 상세 참조 문서 (필요 시 로드)
├── assets/           # 템플릿, 리소스
└── evals/evals.json  # 평가 테스트 케이스
```

- **점진적 공개(Progressive Disclosure) 강제**
    - SKILL.md 본문 500줄/5000 토큰 초과 시 자동으로 `references/`로 분할 제안
    - 카탈로그(name+description) → 본문 → 리소스의 3계층 로딩 구조 유지
- **공통 스킬 레지스트리**
    - 직군 독립 스킬: 파일 정리, 요약, 차트 생성, 이메일 발송, 캘린더 등록
    - 직군 특화 스킬: 보고서 작성(기획), 카피 변형(마케팅), 리드 스코어링(영업) 등
- **스킬 컴포지션**
    - 한 SKILL이 다른 SKILL의 `scripts/`를 호출하는 형태로 조합
- **Skill Creator 메타 스킬 (실습 캡처 → 추출)**
    - 사용자가 실제 작업을 한 번 끝낼 동안 도구가 대화·수정·재시도를 기록
    - 회고 시 "효과 있었던 단계 / 사용자가 한 수정 / 입출력 형식 / 사용자가 제공한 컨텍스트" 4개 카테고리로 추출 → SKILL.md 초안 자동 생성
    - 전역(`~/.agents/skills/`) vs 프로젝트(`./.agents/skills/`) 저장 선택
    - 사용자가 결과를 수정할 때마다 그 시정을 SKILL.md의 `## Gotchas` 섹션에 자동 누적
- **일반화 vs 일회용 검증 스킬**
    - SKILL.md/scripts에서 하드코딩된 값(특정 파일명, 회사명, 날짜)을 정적 분석
    - "선언적 처방"이 발견되면 "절차형 리라이트" 자동 제안 ("이 회사 매출 합산" → "사용자 요청의 회사 필터를 WHERE 절로 적용")
    - 샘플 입력 변형(파일명/경로/포맷) 후 재실행하여 robustness 자동 테스트
- **신뢰 게이팅**
    - 새 폴더에서 처음 발견된 SKILL.md는 사용자에게 "이 스킬을 신뢰합니까?" 확인 후 로드
    - `compatibility` 필드로 명시된 외부 의존성(예: `gh`, Slack 토큰)이 없으면 설치 가이드 자동 트리거
    - 안전이 검증된 스킬은 `allowed-tools`로 권한 사전 승인하여 권한 팝업 피로감 감소

### B'. 공용 유틸리티 레이어 (`common/utils/`)

고빈도 작업(PDF 파싱, Excel 읽기/쓰기, CSV)은 직군 스킬마다 새로 짜지 않고
`common/utils/` 의 검증된 스킬을 **얇은 호출**로 재사용한다. Hermes의 `tools/` + `lazy_deps.py`
패턴, KW Plugins bio-research의 multi-tier 추출 전략을 차용한다.

- **MVP 동봉 utils 4개** (전부 Python 기반 단일 런타임)
    - `pdf-extract` — Python `pdfplumber` (텍스트 + 표)
    - `xlsx-read` — Python `openpyxl`
    - `xlsx-write` — Python `openpyxl` (템플릿 복사 + 셀 채우기, 스타일 보존)
    - `csv-rw` — Python `pandas` (대용량·인코딩 자동 감지·dtype 추론)
    - docx-extract 등은 v0.2+ 옵셔널 (OCR은 도입 안 함)
- **Python 런타임 lazy 디텍션**
    - npm 패키지는 `.py` 파일을 함께 동봉(`files:` 필드)
    - 첫 실행 시 Python·pdfplumber·openpyxl 디텍션 → 없으면 **OS별 1줄 설치 가이드** (`uv tool install` 1순위)
    - postinstall로 pip install 강제 X (권한·실패 이슈 회피)
    - 디텍션 결과 `~/.harness/env-cache.json`에 7일 캐싱
- **Node ↔ Python 결합 방식**
    - `child_process.spawn('python3', ['extract.py', ...])` + JSON stdin/stdout만
    - Python 측은 의존성·라이프사이클·세션 무관 (one-shot)
- **직군 스킬은 `requires:` frontmatter로 의존 선언**
    ```yaml
    ---
    name: jobs-pdf-to-excel
    requires:
      - common/utils/pdf-extract
      - common/utils/xlsx-write
    ---
    ```
    → 직군 스킬은 도메인 룰만 갖는 얇은 정의(~50줄). pdf 추출 코드를 30개 직군에 복붙할 일 없음.
- **Tier-fallback 전략** (각 utils의 `compatibility.json`)
    - tier 1: 가장 가볍고 빠른 경로 / tier 2: 더 정확하지만 무거운 경로
    - PDF 표 감지 시 자동 tier 승격 제안 (사용자 승인)
- **상세**: [ADR-003 Common Utils Layer](docs/adr/ADR-003-common-utils-layer.md)

### C. 도구 통합 & 외부 채널

- **도구 카탈로그 + 가이드 설치**
    - Figma, Notion, Gmail, One Drive, Microsoft Teams, Webhook 등
    - 각 도구별: "이 도구 쓰려면 ① 가입 ② 토큰 발급 ③ 여기 붙여넣기" 까지 단계별 안내
- **인증 정보 안전 저장**
    - `.env` + 시스템 keychain 활용, 절대 저장소에 커밋 금지 훅 내장
- **스케줄링 — 호스트 네이티브 위임 (자체 데몬 X)**
    - Claude Code 세션 안에선 **`CronCreate` 직접 사용** (이미 있는 네이티브 기능, 0줄 구현)
    - macOS는 `launchctl` plist, Linux/WSL은 `crontab`, Windows는 `schtasks`
    - 우리는 한국어 자연어("매주 월요일 9시") → cron 표현 변환만 담당 (~200줄 shim)
    - **자체 스케줄러 데몬 띄우지 않음** — 토큰·전원 관리·OS 절전·multi-host 호환 모두 호스트/OS가 처리
    - Subagent / Background도 동일: Claude Code `Task` / `run_in_background` / hooks 그대로 사용, 자체 worker pool·batch runner X
    - 상세: [ADR-004 Scheduler & Background Strategy](docs/adr/ADR-004-scheduler-and-background.md)
    - **아이디어 (v1.0+)**: 사내에서 관리하는 cronjob 등록 플랫폼은 별도 ADR로 보안·권한 설계 (현재 범위 아님)

### D. AI 도구 호환성 레이어

공식 `.agents/skills/` 컨벤션이 사실상 표준이므로, **자체 manifest 포맷을 만들지 않고 SKILL.md를 그대로 출력**한다.

- **표준 경로 우선 출력**
    - 기본 출력: `.agents/skills/<name>/SKILL.md` (Claude Code / Cursor / Copilot / Codex / Gemini CLI / OpenCode 등이 이미 스캔)
    - 사용자 수준 스킬: `~/.agents/skills/<name>/`
- **표준 미지원 클라이언트용 폴백 어댑터**
    - 필요한 경우에만 `CLAUDE.md`, `.cursor/rules/`, `.github/copilot-instructions.md` 등으로 변환 출력
- **도구 자동 감지 & 설정 주입**
    - 설치된 CLI / 폴더 마커로 현재 AI 도구를 감지하여 자동 구성
- **이름 충돌 해소**
    - 프로젝트 수준 스킬이 사용자 수준 스킬을 오버라이드 (공식 컨벤션)
    - 충돌 발생 시 어떤 스킬이 가려졌는지 사용자에게 경고

### E. 메모리 & 컨텍스트 관리

- **로컬 메모리 폴더 구조**
    - `memory/user/` (사용자 프로필), `memory/projects/`, `memory/sessions/`, `memory/decisions/`
    - hermes agent의 아키텍쳐 채택?
    - **아이디어 : 사내 postgres | 로컬 SQLite 동시 동기화 사용 설정하여 추적?**
- **자동 회상(Recall)**
    - 새 대화 시작 시 관련 메모리 자동 검색·주입 (semantic search)
- **대화 요약 & 결정 로그**
    - 세션 종료 시 의사결정·산출물·미해결 이슈를 자동 추출하여 저장
- **메모리 청소/감쇠**
    - 오래된 항목 자동 압축, 사용자가 "잊어줘" 발화하면 삭제

### F. 디자인 시스템 & 프론트 빌드 스킬

비개발자가 만든 대시보드/랜딩페이지/리포트 뷰가 "AI 슬롭"처럼 보이지 않도록, 디자인 시스템을 기본 탑재하고 모든 프론트 산출물이 이를 강제로 따르게 한다.

- **디자인 시스템 컨설팅 스킬 (`design-consultation`)**
    - 인터뷰로 사용자/브랜드 톤을 캡처 → `DESIGN.md` 단일 진실 소스 생성
    - 컬러 팔레트, 타이포(폰트 페어링), 스페이싱 스케일, 모션, 보더/라운드/섀도우 토큰
    - 폰트·컬러 프리뷰 페이지 자동 생성하여 즉시 시각 검증
- **디자인 쇼건(`design-shotgun`) 스킬**
    - 동일 화면에 대해 3~5개 변형을 한 번에 생성, 사이드바이사이드 비교 보드로 선택
    - 선택 결과를 `DESIGN.md`에 반영하여 학습
- **프리텍스트(Pretext) 기반 HTML 생성 스킬 (`design-html`)**
    - 토큰을 강제 적용하는 컴포넌트 라이브러리 (버튼/카드/테이블/차트/네비)
    - "AI 슬롭" 패턴(과한 그라데이션, 의미 없는 이모지, 잘못된 위계) 자동 차단 룰
    - shadcn/Tailwind/CSS 변수 기반 출력, 프레임워크 어댑터로 React/Svelte/Vue 변환
- **디자인 리뷰 스킬 (`design-review`)**
    - 산출물 스크린샷을 캡처해 디자이너 시점으로 자동 QA: 시각 위계, 정렬, 대비, 간격 일관성, 인터랙션 응답성
    - 발견된 이슈를 소스 코드에서 직접 수정·커밋·재검증 (atomic fix loop)
- **다크/라이트·반응형 자동 보장**
    - 모든 컴포넌트 생성 시 두 테마 + 모바일/태블릿/데스크톱 뷰 동시 빌드
- **접근성(A11y) 기본값**
    - 대비비, 포커스 링, 시맨틱 태그, ARIA 속성 자동 검증

### G. 테스트 주도 개발 & 검증 (Eval-Driven Iteration)

비개발자는 "테스트 코드"라는 단어 자체에 거부감이 크므로, **공식 Agent Skills evals 워크플로를 인터뷰·예시 수집의 자연스러운 일부로 위장**한다.

- **예시 기반 테스트 자동 생성 (Example-as-Test)**
    - 인터뷰에서 사용자가 "이런 입력엔 이런 출력이 나오면 돼요"라고 답한 내용을 `evals/evals.json`의 prompt + expected_output + assertions로 자동 변환
    - 사용자 모르게 회귀 테스트 케이스로 등록 → 매 실행 시 비교
- **`with_skill` vs `without_skill` 벤치마크**
    - 각 자동화에 대해 스킬 적용/미적용 두 가지로 실행하여 `iteration-N/` 디렉터리에 결과 저장
    - `timing.json`(tokens, duration_ms) + `grading.json`(assertion PASS/FAIL) + `benchmark.json`(delta: pass_rate / time / tokens) 자동 산출
    - delta를 근거로 "이 스킬이 진짜 가치를 더하는가" 판단
- **Description Tuner (트리거 정확도 자동 최적화)**
    - 등록된 자동화의 `description`이 너무 모호하거나 광범위하지 않은지 검증
    - 자동 생성한 ~20개 평가 쿼리(should-trigger 8~10 + near-miss 8~10)를 각 3회 실행하여 trigger rate 측정
    - train/validation 6:4 분할로 5회 이내 반복 개선, 1024자 한도 자동 준수
- **RED → GREEN → REFACTOR 자동 진행**
    - 새 스킬/자동화 추가 시 도구가 먼저 실패하는 테스트를 만들고, 통과시키는 구현을 생성
    - 사용자에겐 "예시 3개 더 보여주세요" 정도로만 노출
- **블라인드 비교 + 사람 리뷰**
    - 두 버전 출력을 LLM judge에게 블라인드로 제시하여 종합 품질 평가
    - 각 테스트 케이스에 한 줄짜리 `feedback.json` 코멘트로 사람 리뷰 캡처
- **드라이런(Dry-run) 강제**
    - 외부 전송·파일 삭제·결제 등 부수효과는 실행 전 미리보기 + 명시적 승인
- **친절한 실패 리포트**
    - 테스트 실패를 "지난 주 정상 작동했던 ◯◯ 케이스가 이번엔 △△로 바뀌었어요"라는 자연어로 변환
- **검증 루프 스킬 (`verify`)**
    - 빌드/린트/타입체크/테스트/접근성/디자인 토큰 준수를 한 번에 돌리고 단일 점수로 리포트

## 3. 설계 우선순위 (MVP → 확장)

대다수 사용자가 월 3만원 구독으로 4시간당 토큰 한도가 있는 환경을 가정한다. 따라서 **MVP 기본 프로필은 `eco`** 이며, 토큰을 많이 쓰는 검증·벤치마크·캡처는 **옵트인**으로 분리한다.

| 단계 | 프로필 | 포함 기능 | 진척 |
| --- | --- | --- | --- |
| **MVP** | `eco` (기본) | 온보딩 인터뷰 → `.agents/skills/<name>/SKILL.md` 생성, 점진적 공개 구조 강제, 기본 스킬 10개, **`common/utils/` 4개 동봉 (pdf-extract / xlsx-read / xlsx-write / csv-rw — Python lazy 디텍션)**, 로컬 SQLite 메모리(자동 prefetch OFF), 컨텍스트 압축 default ON, Haiku 라우팅 | ✅ Phase 1~8 완료 (가이드 §8 정식 phase 모두 통과, E2E 13/13) |
| **MVP** | `standard` (옵트인) | + **Description Tuner 1회 실행** (스킬 생성 시점 한정), 명시 호출 evals |
| **v0.2** | `standard`+ | **Skill Creator (세션 종료 시 요약 1회 — 풀 캡처 X)**, 도구 통합 5종 (Figma/Notion/Gmail/Teams/Webhook), `DESIGN.md` + `design-html` |
| **v0.3** | `power` (파워유저) | with/without 벤치마크(명시 호출), `design-shotgun`(2변형) / `design-review`, 압박 테스트 서브에이전트, 신뢰 게이팅, compatibility 도구 설치 가이드, 스케줄링, 직군별 스타터 팩 |
| **v1.0** | 전체 | 마켓플레이스, 시각적 워크플로우 에디터, 멀티 사용자 협업 |

설치 명령:
```bash
npx jinhak-harness@latest                    # 기본 = eco
npx jinhak-harness@latest --profile=standard # 검증/벤치 옵트인
npx jinhak-harness@latest --profile=power    # 모든 자동 검증 ON
```

## 4. 핵심 설계 원칙 (놓치면 안 되는 것)

1. **인터뷰가 곧 산출물** — 질문에 답하는 것만으로 SKILL.md + evals 후보 + 디자인 토큰이 동시에 완성되어야 함
2. **모든 단계가 되돌리기 가능** — 비개발자는 "망쳤다" 두려움이 큼
3. **공식 표준을 따른다** — `.agents/skills/`와 SKILL.md 포맷을 1차 출력으로 고정하여 AI 도구 락인 방지
4. **암묵지를 명시화** — 사용자 머릿속 도메인 지식·정상 출력 예시·디자인 취향을 모두 파일로 끌어내 저장
5. **토큰 경제 우선, 검증은 옵트인** — 월 3만원 구독자의 4시간 토큰 윈도우를 보호한다. Description Tuner / with-without 벤치마크 / 풀 대화 캡처 / 매 턴 의미검색 / 매 실행 evals / 압박 테스트는 **기본 OFF**, 사용자가 명시 호출하거나 `--profile=standard|power` 일 때만 ON
6. **검증된 utils를 재사용한다** — PDF 파싱·Excel R/W 같은 고빈도 작업은 새 스크립트를 합성하지 않고 `common/utils/` 의 검증된 스킬을 `requires:` frontmatter로 호출한다. 직군 30개에 같은 파싱 코드를 합성하면 토큰·유지보수 모두 폭발한다.
7. **호스트가 주는 것은 다시 만들지 않는다** — subagent·background·cron은 Claude Code/Cursor/Codex/OS가 이미 검증된 구현을 제공한다 (`Task` / `run_in_background` / `CronCreate` / cron / launchd / schtasks). 자체 런타임(스케줄러 데몬·worker pool·batch runner)을 만들면 토큰·유지보수·OS 절전 처리·multi-host 호환 부담만 증가한다. 우리 역할은 비개발자가 그것을 쉽게 호출하게 하는 얇은 shim.

## 4.5. 오케스트레이션 슬래시 커맨드 (Layer 2.5)

> **상세 스펙**: [docs/orchestration-spec.md](docs/orchestration-spec.md)
> **v2 Codex 리뷰 반영 (2026-05-18)**: 8개 커맨드는 spec에 유지하되 **v1 사용자 노출은 3개로 축소**. 나머지 5개는 도구가 내부적으로 호출.

직군 스킬 카탈로그는 "재료(verbs)"이고, 자동화를 만들 때 여러 직군을 가로지른다. 그러나 비개발자가 8개 메타 커맨드를 외우게 하는 건 "한국어 라벨 단 개발자 워크플로 엔진"이 된다. 따라서 **v1 사용자 노출은 3개 커맨드만**, 나머지는 내부 phase로 자동 진행.

### v1 사용자 노출 커맨드 (3개)
| 커맨드 | 사용자가 하는 일 | 내부에서 자동 실행 |
|---|---|---|
| **`/start`** | 최초 1회 — 직군·작업 영역 답하기 | onboarding + baseline 작성 + starter 스킬 설치 |
| **`/build <한 줄 목표>`** | 자동화 만들고 싶다 말하기 | plan → autoplan(메모리) → build (단계 자동 진행, 단계 사이 가벼운 확인만) |
| **`/verify`** | "결과 맞아?" 확인 + 게시 결정 | verify(Dry-run) → 사용자 OK 시 ship(스케줄·전달 채널) |

### 내부/고급 커맨드 (5개, spec에는 정의되지만 평소 호출 X)
`/plan` `/autoplan` `/autopilot` `/ship` `/handoff` — 파워유저가 `--advanced` 플래그로 명시 호출하거나, 도구가 내부 phase 이름으로만 사용. 일반 비개발자에게는 노출하지 않는다.

### 5개 레퍼런스 차용 패턴
| 패턴 | 출처 | 우리 적용 |
|---|---|---|
| 얇은 디스패처 + 두꺼운 서브에이전트 | GSD | 3개 노출 커맨드 본체는 인자 파싱·확인·서브에이전트 호출만 |
| 마크다운 아티팩트 상태 머신 | GSD | **내부에만 존재** — 사용자에게 파일 경로/이름 가르치지 않음. 사용자 어휘는 "프로젝트 메모리 / 현재 자동화 / 실행 이력 / 검증" |
| HARD-GATE | Superpowers | **3개만 유지** (Dry-run / 명시 승인 / 검증 증거). 토큰 게이트·필수 입력 누락은 **소프트 경고**로 |
| 다음 단계 명시 (자동 체인 X) | Superpowers + KW Plugins | 단계 사이 가벼운 확인만 ("계속할까요?"), 매번 토큰 산수는 노출 X |
| auto-trigger description | KW Plugins | 직군 스킬 30개에 적용 |
| `alwaysApply: true` 베이스라인 | Karpathy | `.harness/baseline.mdc` 무조건 주입 |
| CommandDef 중앙 레지스트리 | Hermes | 8개 정의는 유지하되 `visibility: user|internal` 필드 추가 |
| content-match resume | Hermes | 중단 후 재호출 시 완료 단계 스킵 |

### 5개 레퍼런스 차용 패턴
| 패턴 | 출처 | 우리 적용 위치 |
|---|---|---|
| 얇은 디스패처 + 두꺼운 서브에이전트 | GSD orchestrator-subagent 분리 | 모든 메타 커맨드 본체는 인자 파싱·게이트·spawn·수집만 |
| 마크다운 아티팩트 상태 머신 | GSD `.planning/STATE/CONTEXT/PLAN/SUMMARY/VERIFICATION` | `.harness/{PROJECT,ROADMAP,state,user-profile}.md` + `plans/<slug>/` |
| `<HARD-GATE>` XML 진입 조건 | Superpowers (코드 작성 금지 / 검증 없이 통과 주장 금지) | 진입 시 6종 게이트 (G-REQ/PROFILE/TOKEN/VERIFY/DRYRUN/APPROVAL) |
| 다음 스킬 명시 지목 | Superpowers `REQUIRED SUB-SKILL:` (자동 라우팅 X) | `next_commands:` frontmatter, 사용자에게 추천만 |
| `requires:` frontmatter 의존성 | GSD agent frontmatter | 진입 시 선행 아티팩트 존재 검증 |
| Override 메커니즘 | GSD verification overrides | `VERIFICATION.md` frontmatter에 `overrides[]` |
| auto-trigger description | KW Plugins "Use when X, Y, Z. Trigger with ○○" | 직군 스킬 30개 description 패턴 (메타 커맨드는 명시적 슬래시 유지) |
| `alwaysApply: true` 베이스라인 | Karpathy `.cursor/rules/*.mdc` | `.harness/baseline.mdc` (4원칙 + 토큰 가드) |
| CommandDef 중앙 레지스트리 | Hermes `hermes_cli/commands.py` | `src/commands/registry.ts` 단일 정의 → marketplace/plugin/CLI 동시 노출 |
| content-match resume | Hermes batch_runner | `/autopilot` 중단 후 SUMMARY.md 내용 매칭으로 완료 phase 스킵 |
| `on_session_switch` lineage | Hermes memory provider | `/handoff` 시 parent_id 추적, 메모리 보존 |
| 2단계 리뷰 (spec → quality) | Superpowers subagent-driven-development | `/verify` standard+에서 두 패스 (산출물 검증 → 코드 품질) |

### 4.5.1 메타 커맨드 8종
| 커맨드 | 역할 | eco | standard | power |
|---|---|---|---|---|
| **`/onboard`** | 첫 설치 시 1회 — 직군 선택 + 8 행동 차원 프로파일링 + starter skill 설치 | ✅ | ✅ | ✅ |
| **`/plan <목표>`** | 목표를 단계로 분해, 단계마다 필요한 직군 스킬·도구·예상 토큰 안내, 사용자 승인 후 `.harness/plans/<slug>.md` 저장 | ✅ (Haiku) | ✅ | ✅ |
| **`/autoplan`** | `/plan` + 메모리·user-profiler로 질문 자동 추론 | ❌ (회상 비쌈) | ✅ | ✅ |
| **`/build <plan>`** | 승인 plan을 단계별 실행, 사이 사이 확인 게이트 | ✅ | ✅ | ✅ |
| **`/autopilot <목표>`** | `/plan` + `/build` 무중단 | ❌ | ⚠️ 1회 한정 + 토큰 한도 경고 | ✅ |
| **`/verify`** | 산출물과 기대값 비교 | Dry-run만 | + evals | + 압박 테스트 |
| **`/ship`** | 자동화를 스케줄·전달 채널에 등록 + evals 회귀 잠금 | 명시 호출 | ✅ | ✅ |
| **`/handoff <직군>`** | 진행 중 다른 직군 컨텍스트로 전환 ("이제 디자인 봐줘") | ✅ (가벼움) | ✅ | ✅ |

### 4.5.2 plan 파일 형태 (PDF→Excel 예시)
```markdown
# .harness/plans/pdf-to-excel.md
goal: 계약서 PDF → Excel 갱신
profile: eco
estimated_tokens: ~8천 (빌드) + ~1.5천 (실행/회)

phases:
  - phase: 표본 수집      | skill: common/inbox-collect
  - phase: 추출 룰        | skills: [planning/spec-from-samples, data/pdf-extract-strategy]
  - phase: 출력 포맷      | skill: design/excel-layout (lite)
  - phase: 검증           | skill: common/verify (eco: Dry-run, standard+: evals)
  - phase: 전달           | skill: operations/schedule
handoffs:
  - 기획→데이터, 데이터→디자인, 디자인→운영
```

### 4.5.3 단계 게이트 (전 프로필 공통)
- 각 phase 진입 시 사용자에게 "이 단계 진행할까요? (예상 토큰 ○○○)" 확인
- `/autopilot`은 phase 단위로만 무중단; 단계 사이엔 토큰 잔량 체크
- 컨텍스트 윈도우 사용량 60% 도달 시 자동 `on_pre_compress` 훅 발동

## 4.6. 스킬 트리거 게이트 (Skill Trigger Gating)

> **v2 Codex 리뷰 반영**: 2-of-4 휴리스틱과 40~70% 절감 수치는 측정 전 약속이므로 약화. v1은 **3계층 로딩 강제**로 단순화.

스킬 로드(SKILL.md 본문 500줄 + references)는 토큰을 크게 쓴다. v1은 휴리스틱 라우터 대신 **3계층 로딩 정책**으로 같은 효과를 노린다.

### 4.6.1 v1 정책 — 3계층 로딩
1. **세션 부팅 시**: 직군 카탈로그의 **frontmatter만** (`name` + `description`) 로드 — 한 스킬당 ~50 토큰
2. **워크플로 단계가 특정 스킬을 명시 요구할 때**만 해당 SKILL.md 본문 로드
3. **references/는** 본문이 본문 내에서 명시 호출할 때만 로드

→ 휴리스틱·라우터 없이 **계층 강제**만으로 불필요 로드를 줄인다. 절감 효과는 측정 후 보고.

### 4.6.2 측정 기반 v0.2+ 학습 루프
v1에서 사용 데이터가 쌓이면:
- 일반 프롬프트로 처리됐지만 사용자 거절·재요청된 케이스 → "여기선 스킬 필요" 라벨
- 스킬 본문 로드했는데 산출물이 frontmatter description만으로도 충분했던 케이스 → "스킬 본문 불필요" 라벨
- v0.2의 Description Tuner(standard+)가 이 라벨로 description을 더 정확하게 튜닝

## 5. 토큰 경제 & Eco 모드 설계

비개발자 대다수가 Claude Pro 등 정액 구독을 쓰므로, 청사진의 "검증을 백그라운드에서 항상 돌린다"는 기본값을 그대로 두면 첫날 토큰이 녹는다. 따라서 다음 기준으로 기능을 재분류한다.

### 5.1 토큰 비용 분류
- **공짜 (static, 1회 로드)**: SKILL.md frontmatter / 직군 카탈로그 / `.agents/skills` 표준 경로 / Karpathy 4원칙 / `~~CRM` 카테고리 추상화 / Dry-run / 한국어 가이드 / session-start 훅
- **토큰 절약 (있을수록 이득)**: Progressive Disclosure 3계층 / 컨텍스트 압축(aux 모델로 요약) / 로컬 SQLite 메모리 / `.harness/state.md` / Anthropic prompt cache 활용
- **숨은 토큰 폭탄 (백그라운드 자동 실행 금지)**: Description Tuner (20쿼리 × 3회 = 60콜/스킬) / with-without 벤치마크 (2배 비용) / design-shotgun 3~5변형 / Skill Creator 풀 캡처 / 매 턴 의미검색 회상 / 매 실행 evals / 압박 테스트 서브에이전트
- **가장 비싼 항목**: 서브에이전트 다발 spawn (각 200k 신선 컨텍스트) — MVP에서는 메인 컨텍스트로 처리, 컨텍스트 부족이 입증된 작업만 spawn

### 5.2 비싼 기능의 Eco 변환 룰
- Description Tuner: **스킬 생성 시 1회만**, 자동 재실행 금지
- with/without 벤치마크: **MVP 컷**, `power` 프로필 + 명시 호출 시에만
- design-shotgun 변형 수: 3~5 → **2**, 명시 호출
- Skill Creator: 풀 대화 캡처 → **세션 종료 시 요약 1회** (Hermes `on_session_end` 훅 패턴)
- 매 턴 의미검색: 태그/키워드 fast lookup으로 대체, semantic은 명시 요청 시 (`queue_prefetch` 옵셔널)
- 매 실행 evals: 스킬 버전 bump 시에만
- 압박 테스트: 파워유저 모드에서만 노출

### 5.3 토큰 절약 장치 (전 프로필 공통 default ON — eco 한정 X)
1. **Haiku 라우팅**: 인터뷰 질문 생성·요약·압축·친절 실패 리포트는 Haiku. Opus는 SKILL.md 초안·의사결정만.
2. **컨텍스트 압축 default ON**: Hermes의 `on_pre_compress` 훅 + Tail 보호로 4시간 한 세션 유지.
3. **Prompt cache 활용**: 같은 세션 내 SKILL.md 재호출은 cache hit. 5분 TTL 안에 작업 묶기.
4. **에러 메시지 템플릿화**: 자연어 변환을 LLM에 맡기지 말고 사전 정의 템플릿 + 변수 치환.
5. **session-start 훅 최소화**: 부트스트랩 컨텍스트 ~500토큰 이내로 유지 (Superpowers 패턴 그대로).
6. **스킬 트리거 게이트** (4.6장) — 일반 프롬프트로 해결 가능한 요청은 SKILL.md 로드 자체를 생략.
7. **단계 게이트** (4.5.3) — 메타 커맨드의 모든 phase 진입 시 사용자에게 토큰 안내·확인. `power`도 무중단 X.
8. **컨텍스트 윈도우 watchdog** — 60% 사용 시 자동 압축, 80% 시 phase 일시정지 + 세션 분할 제안.

### 5.4 사용자에게 보이는 토큰 가드 (Codex 리뷰 반영: 거친 라벨로 축약)
비개발자는 토큰 산수가 아니라 **체감 비용**만 본다. 다음 3단계 거친 라벨로 표시:
- **🟢 빠름** — eco 프로필의 일반 작업 (인터뷰, 단순 자동화)
- **🟡 느림** — standard 프로필 기능, 단일 실행 시 ~5분 이상
- **🔴 할당량 위험** — power 기능(with/without 벤치, 압박 테스트 등) 또는 4시간 한도의 ~30% 이상 예상

호출 직전 라벨만 표시, "예상 토큰 ○○개" 같은 숫자 노출 X. eco 사용자가 🔴 기능 호출 시 "이번 한 번만 진행할까요?" 분기.

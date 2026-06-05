# 업무 프로세스화 플러그인

## 1. 목적

**현재 이 레포(`jinhak-vibecode`)가 Layer 3의 실체.**

npm 패키지(`jinhak-harness` 등)로 배포되어, **agentskill 공통 규격**을 따르는 skill·command·hook 집합체로 동작한다.

→ Claude Code / Cursor / Codex / Gemini / Antigravity / OpenCode **6개 호스트**에서 동일한 `/jinhak:*` 슬래시 커맨드로 작동.

---

## 2. 핵심 설계 원칙

### 2-1. Tool-agnostic

- skill/agent는 표준 규격(`.md` 프롬프트 + 메타데이터)으로 작성
- Claude Code, Cursor, Codex CLI 등 **어떤 도구든** 읽을 수 있는 형태

### 2-2. npm 단일 채널 배포

- 사내 npm registry (Azure Artifacts) 또는 public npm + AD 인증 wrapper
- 사용자는 한 줄 설치:
    
    ```bash
    JINHAK_AUTO_REGISTER=1 npm install -g jinhak-harness@beta
    ```
    
- postinstall이 6 호스트 CLI 자동 등록

### 2-3. 자율성 보장

- 사용자가 다른 plugin(gstack, oh-my-claudecode 등)을 함께 써도 **충돌 없음**
- Layer 1·2의 환경 주입이 깔려 있어 결과 품질은 일관

### 2-4. Skill = 도메인 답변만 받고 나머지 자동

- 사용자는 "무엇을 하려는지"만 말함
- 분해·자동화 판별·온보딩·인터뷰는 skill이 처리

---

## 3. 현 배포 형태

```
npm package: jinhak-harness (v0.1.3)
  ├─ bin/                     # Node 런타임 (CLI 진입점 + 모듈)
  │   ├─ install.js           # CLI 라우터 (서브커맨드 디스패치)
  │   ├─ postinstall.js       # 설치 후 6 호스트 자동 등록
  │   ├─ profile.js           # eco/standard/power 예산 (ADR-001)
  │   ├─ skills-loader.js     # SKILL.md 3계층 로딩
  │   ├─ doctor.js / init.js / register.js  # 진단·초기화·등록
  │   ├─ memory.js · user-profiler.js · lazy-deps.js · cost-label.js · friendly-error.js
  │   └─ commands/            # 커맨드 구현 (.ts → .mjs 빌드)
  │       └─ autopilot · build · plan · verify · start · handoff · ship · create (.mjs)
  ├─ commands/                # 슬래시 커맨드 정의 (.md + frontmatter) — 실재 12개
  │   ├─ start.md build.md verify.md plan.md autopilot.md handoff.md ship.md
  │   └─ create.md doctor.md init.md register.md unregister.md
  ├─ hooks/
  │   └─ session-start        # SessionStart: baseline(alwaysApply) 주입
  └─ templates/
      ├─ .agents/skills/      # 빌트인 직군 스킬 (agentskill 규격)
      │   ├─ baseline/                  # 모든 자동화 위에 깔리는 정책층
      │   ├─ jobs-pdf-to-excel/         # 채용공고 PDF → Excel
      │   ├─ expense-pdf-to-csv/        # 영수증 PDF → CSV
      │   └─ meeting-notes-to-summary/  # 회의록 → 요약표
      └─ common/utils/        # 공용 유틸 (requires:로 호출)
          └─ pdf-extract/ · xlsx-write/ · csv-write/   # Python lazy 디텍션
```

### 설치 후 동작

1. **6 호스트 자동 등록** (`JINHAK_AUTO_REGISTER=1` 시 postinstall)
   - Claude Code / Cursor / Codex / Gemini / Antigravity / OpenCode의 user-level commands 디렉터리에
     `/jinhak:*` 슬래시 커맨드 일괄 등록

2. **SessionStart hook**
   - `hooks/session-start`: `baseline`(alwaysApply) 스킬을 세션 부팅 시 주입

> **미구현 (v0.2 타겟)**: `~/.claude/CLAUDE.md` 자동 `@import` 주입(Layer 1 context),
> PreToolUse(Layer 2 데이터 안내) / Stop(응답 포맷 강제) hook은 아직 없다. 현재 hook은 `session-start` 하나뿐.

---

## 4. 현 포함 커맨드 (실재 12종)

`commands/*.md`에 실제로 존재하는 슬래시 커맨드. (orchestration-spec의 "메타 커맨드 8종"은 **원안**이며,
구현은 아래와 같이 달라졌다 — `/onboard`→`/start` 개명, `/autoplan` 미구현, `/ship`·`/handoff` 의미 변경,
설치·등록용 `create/doctor/init/register/unregister` 추가.)

### 자동화 워크플로 (7종)
| 이름 | 실제 동작 | 비개발자 노출 |
|---|---|---|
| `/jinhak:start` | 5문항 직군 인터뷰 → 8 행동 차원 추론 → `~/.harness/user-profile.md` (1회) | ✅ |
| `/jinhak:autopilot` | `plan → build → verify` 순차 체인 | ✅ |
| `/jinhak:build` | 룰테이블로 적합 스킬 선택 → `inbox/*` → `output/*` 생성 | ✅ |
| `/jinhak:verify` | 직전 산출물 친절 한국어 검증 (행 수·빈 셀·합계) | ✅ |
| `/jinhak:plan` | 요청 분석 + 호출될 스킬 미리보기 → `.harness/plans/<ts>-<slug>.md` 저장 | 내부 |
| `/jinhak:handoff` | 산출물을 다른 폴더로 **복사** (dry-run 기본, `--confirm` 시 실제) | 내부 |
| `/jinhak:ship` | `.harness/*` 변경분을 git 커밋 (작업 로그 보존) | 내부 |

### 설치·운영 (5종)
| 이름 | 실제 동작 |
|---|---|
| `/jinhak:create` | 6문항 인터뷰 → `user-skills/<name>/SKILL.md` 생성 (Skill Creator) |
| `/jinhak:doctor` | 환경·의존성·프로필·스킬·메모리 6섹션 한국어 진단 |
| `/jinhak:init` | `$HARNESS_HOME` 홈 디렉터리 초기화 (첫 설치 후 1회) |
| `/jinhak:register` / `unregister` | 6 호스트에 슬래시 커맨드 등록/제거 |

> **주의**: `orchestration-spec`이 정의한 `/autoplan`, `.harness/plans/<slug>/{CONTEXT,PLAN,SUMMARY,VERIFICATION}.md`
> 4파일 상태머신, CommandDef 레지스트리, HARD-GATE 카탈로그는 **미구현 원안**이다.
> 실제 `/plan`은 slug별 폴더가 아닌 단일 `.md` 한 장을 쓴다. 상세는 [orchestration-spec.md](../orchestration-spec.md) §0 참조.

---

## 5. 다른 도구와 공존하는 법

### gstack, oh-my-claudecode 등 외부 plugin이 설치되어 있어도

- Layer 1·2 (CLAUDE.md + AGENTS.md + hook)가 환경에 깔려 있으므로
- 그들의 응답에도 **회사 맥락이 자동으로 묻어남**

### 사용자가 본인이 만든 custom skill을 쓸 때도 동일

- Skill이 어떤 LLM 호출을 하든
- System context는 우리 것이 깔려있음

### 충돌 방지

- 우리 hook은 `jinhak:` namespace만 건드림
- 다른 plugin 동작은 read-only로 관찰
- 응답 포맷 강제는 우리 커맨드에만 적용 (또는 후처리)

---

## 6. 교차참조 안내

자세한 내용은 다음 문서로 점프:

| 주제 | 문서 |
|---|---|
| 30초 설치 & 빠른 시작 | [README.md](../../README.md) |
| 상세 사용 시나리오 | [USAGE.md](../../USAGE.md) |
| 비개발자용 15분 가이드 | [GETTING_STARTED.md](../../GETTING_STARTED.md) |
| 메타 커맨드 스펙 | [orchestration-spec.md](../orchestration-spec.md) |
| 설계 결정 기록 | [docs/adr/](../adr/) |
| 토큰 경제 & 비용 추정 | [README.md §5](../../README.md) |

---

## 7. 로드맵

### v0.1.x (현재 — 2026-05)

✅ **완료**:
- npm 패키지 (v0.1.3)
- 6 호스트 자동 등록
- 실재 12개 슬래시 커맨드 (자동화 7 + 설치·운영 5; 비개발자 노출 4)
- 인터뷰 모드 (`/jinhak:start`)
- 호스트별 인증 채널

### v0.2 (타겟: 2026-07)

🔄 **진행 중 / 계획**:
- Layer 1: SharePoint + Graph sync MVP (`context sync` 명령, 위임 인증)
- Layer 2: 응답 포맷 hook 구현
- Layer 2-3: 인터뷰 질문 카탈로그 확대 (직군별)
- 토큰 가드 라벨(🟢🟡🔴) 실측 데이터 수집
- 사내 npm registry (Azure Artifacts) 연동

### v1.0 (타겟: 2026-11)

🚀 **비전**:
- Layer 2-1: 사내 MCP 서버 (Teams/OneDrive/Outlook)
- 자동화 마켓플레이스 (직군별 템플릿 공유)
- eval 데이터셋 수집 + 벤치마크 정리
- 다른 호스트 확대 (GitHub Copilot 등)
- 사내 배포 자동화 CI/CD

---

## 8. 리스크

**자율성 vs 표준화 충돌**

- 사용자가 다른 skill을 자유롭게 쓰게 두면, 우리 **응답 포맷이 깨질 수 있음**
- Stop-hook으로 포맷을 후처리 강제할지, 가이드로만 둘지 **정책 결정 필수**

**다른 가능한 충돌**

- npm registry 분산 (public npm + 사내 Azure Artifacts) → 버전 관리 복잡도
- 호스트별 hook 구현 방식 차이 (Claude Code vs Cursor vs Codex CLI)
- 토큰 예산 초과 → "비용" 표기의 신뢰도 하락

---

## 9. 수집 필요 정보

다음 항목들이 확정되어야 v0.2+ 구현 가능:

- [ ]  **사내 npm registry 운영 가능 여부** — Azure Artifacts 사용? public npm + 인증 wrapper?
- [ ]  **AD 인증 wrapper 필요성** — npm 설치 시 AD 로그인 자동 검증?
- [ ]  **호스트별 인증 채널 실사** — Claude Code / Cursor / Codex / Gemini / Antigravity / OpenCode 각각의 회사 라이선스 상태
- [ ]  **토큰 가드 라벨(🟢🟡🔴) 실측 데이터** — v0.1 측정 후 v0.2 조정 기준 (예: 🟢 = 0~1K 토큰)
- [ ]  **eval 데이터셋 사내 수집 동의** — with/without 벤치마크 학습용 (보안팀 승인)
- [ ]  **사내 마켓플레이스 운영 책임자** — v1.0+ 마켓플레이스 비전 (skill 공유, 평가)
- [ ]  **`dev-home/` 격리 모델의 다른 호스트 적용 검증** — 현재 Claude Code 위주, 다른 도구는?
- [ ]  **기여 워크플로 (누가 PR 권한?)** — Bitbucket? GitHub? 내부 승인 프로세스?

---
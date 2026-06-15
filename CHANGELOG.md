# Changelog

## 0.1.4 (2026-06-15)

### 신규 — 인터뷰모드 개인 컨텍스트 (full 모드 자동 주입)
- **`/interview` 심화 인터뷰 커맨드**: 단군 하니스 온보딩 설문(Q-DG-01~20)을 직군 불문으로 일반화. CORE 7문항(우선순위·상시관심사·선제알림·어조·반론방식·기본언어·금지주제) + `--exec` 임원/경영진 질문팩 4문항(언론키워드·경쟁사동향·일일요약/주간성찰 시간). 답변은 `~/.harness/personal-context.md`에 구조화 저장.
- **세션 자동 주입 (핵심 빈틈 해소)**: 기존 `session-start` 훅은 `/start`가 만든 프로필을 **한 번도 주입하지 않았음**. 이제 `bin/render-digest.js`가 매 세션 프로필을 읽어 부트스트랩에 합성한다.
  - **full 모드**: `personal-context.md`(심화 인터뷰)가 있으면 **전체 개인 컨텍스트**를 주입 — context가 항상 잘 동작.
  - **eco 폴백**: 심화 인터뷰 없이 `/start` 프로필만 있으면 압축 다이제스트만 (≤700자). `HARNESS_CONTEXT_MODE=eco`로 full 모드 강제 비활성 가능.
- 신규 파일: `bin/personal-context.js`, `bin/render-digest.js`, `bin/commands/interview.js`, `commands/interview.md`.
- 테스트: `tests/bin/test-render-digest.sh`(12), `tests/commands/test-interview.sh`(11), `test-session-start.sh`에 full 모드 주입 케이스 추가.

## 0.1.3 (2026-05-20)

### 수정 (critical) — 환경 무관 동작
- **슬래시 커맨드 12개 본문** 의 `jinhak-harness <cmd>` 호출을 `npx -y jinhak-harness <cmd>` 로 변경. 이유: Claude Code/Cursor 등이 슬래시를 실행할 때 사용하는 bash(WSL/git bash)와 사용자가 `npm install -g` 한 shell이 다르면 PATH 불일치로 "command not found" 발생. `npx`는 Node와 함께 깔리니 환경 무관 동작 + 글로벌 설치돼 있으면 자동 재사용 (다운로드 X).
- 영향: Windows에서 `%APPDATA%\\npm` 이 PATH에 없는 환경, WSL Claude Code 가 git bash와 다른 환경을 쓰는 케이스, mac에서 nvm 으로 격리된 환경 등 모든 PATH 시나리오에서 슬래시 커맨드가 동작.
- 파생 `.cursor/commands/*.md` + `.gemini/commands/*.toml` 도 `scripts/gen-commands.mjs` 로 재생성 (36개 invocation).

## 0.1.2 (2026-05-20)

### 수정 (critical)
- **Node 20/22 호환성**: 0.1.0/0.1.1은 `.ts` 커맨드 (plan/build/verify/start/handoff/ship/create/autopilot) 8개가 `--experimental-strip-types` 옵션을 사용했는데, 이 옵션은 Node의 보안 정책상 `node_modules/` 아래 파일엔 적용되지 않아 글로벌 설치 시 항상 실패했다. 모든 Node 버전에서 깨졌음.
- **빌드 도입**: `esbuild` (devDependency)로 `.ts → .mjs` (ESM) 변환을 `prepublishOnly`에서 수행. 사용자 install에는 빌드된 `.mjs` 만 사용되며 esbuild 자체는 안 깔림.
- `bin/install.js`: 8개 커맨드 dispatch 경로 `*.ts` → `*.mjs`, `--experimental-strip-types` 플래그 제거.

### 변경
- `package.json`: `devDependencies.esbuild` 추가, `scripts.build` + `scripts.prepublishOnly` 추가.
- `.npmignore` 신규.

## 0.1.1 (2026-05-20)

### 수정
- **postinstall**: `JINHAK_NO_GREETING=1` 또는 `CI=true` 환경에서 `JINHAK_AUTO_REGISTER=1` 이 동작하지 않던 버그 수정. silent 플래그는 banner만 억제하고 자동 register는 사용자가 명시 opt-in 했으므로 실행되어야 함. (0.1.0에서 silent 체크가 auto-register 분기 이전에 `process.exit(0)` 시켜 무시됨)

## Unreleased

### 추가
- **`register` / `unregister` 명령** — CLI 한 번의 호출로 6 AI 호스트 user-level dir에 슬래시 커맨드를 `jinhak/` 서브디렉터리로 복사. 호스트별 네이티브 네임스페이싱이 자동으로 `/jinhak:init` 형태를 만들어준다.
  - Claude Code: `~/.claude/commands/jinhak/*.md`
  - Cursor: `~/.cursor/commands/jinhak/*.md`
  - Codex CLI: `~/.codex/prompts/jinhak/*.md`
  - Gemini CLI: `~/.gemini/commands/jinhak/*.toml`
  - Antigravity: `~/.gemini/antigravity/commands/jinhak/*.md`
  - OpenCode: `~/.config/opencode/commands/jinhak/*.md`
- **슬래시 커맨드 진입점** `commands/*.md` × 12 (canonical Markdown + frontmatter)
- **Cursor / Gemini 변환본** `.cursor/commands/*.md` (frontmatter 제거), `.gemini/commands/*.toml` (TOML) — `scripts/gen-commands.mjs` 가 idempotent generate
- 호스트 등록 검증 테스트 `tests/commands/test-register.sh` (27 assertion)
- 슬래시 커맨드 정적 검증 `tests/commands/test-slash-commands.sh` (93 assertion)
- `bin/postinstall.js` 자기검증 — 설치 후 `bin/install.js` 누락 감지 시 한국어 안내 + 캐시 재설치 명령 출력
- `GETTING_STARTED.md` — 비개발자용 15분 완성 가이드 신규 추가

### 변경
- `package.json` `bin` 필드 정규화: `./bin/install.js` → `bin/install.js` (일부 Windows npm의 path normalize 호환)
- 매니페스트 6종: stale `"commands": [...]` 배열 → 호스트별 정확한 `commands_dir`/`commands_path` 키
- `README.md` 최상단에 30초 설치 Quick Start + GETTING_STARTED/USAGE 진입 링크
- `USAGE.md` 한 줄 요약·빠른 시작·설치 옵션을 git clone + npm link + register 흐름으로 갱신
- `hooks/session-start` — alwaysApply baseline SKILL.md 본문 동적 합성

### 문서 / DX
- 모든 사용 예시의 슬래시를 `/<cmd>` → `/jinhak:<cmd>` 네임스페이스로 정정
- Windows ExecutionPolicy 사전 가이드를 GETTING_STARTED §2 / README Quick Start에 명시

---

## 0.1.0 (2026-05-19)

첫 MVP eco 릴리즈.

### 추가
- CLI 진입점: `init`, `doctor`, `start`, `plan`, `build`, `verify`, `handoff`, `ship`, `create`, `autopilot`
- 멀티 AI 호환 manifest 6개 (Claude Code, Cursor, Codex, Gemini, Antigravity, OpenCode)
- 공용 utils 3개: `pdf-extract` (pdfplumber), `xlsx-write` (openpyxl), `csv-write` (pandas)
- 직군 스킬 3개: `jobs-pdf-to-excel`, `meeting-notes-to-summary`, `expense-pdf-to-csv`
- baseline 스킬 (`alwaysApply: true`) — 한국어 우선·dry-run 강제 등 정책 layer
- 동적 user-skill 등록 — `create` 로 만든 스킬이 `plan`·`build` 에 자동 인식
- 친절 실패 리포트 (변수 치환 템플릿, LLM 호출 0)
- 토큰 가드 라벨 🟢🟡🔴 (docs/research/REPORT_06 §6.5)
- 8 행동 차원 user-profiler (휴리스틱)
- 메모리 facade 4메서드 (JSON 백엔드, 향후 SQLite swap 가능)
- 프로필 분기 eco/standard/power (ADR-001)
- session-start hook (Cursor/Claude Code/Copilot/SDK 3종 JSON 분기, 5 escape)

### 테스트
- 22 스위트 / `make test-all` (mktemp 격리)

### 알려진 제한
- xlsx 출력은 user-skill 동적 runner 미지원 (템플릿 필요). MVP에서는 `jobs-pdf-to-excel` 만 지원
- SQLite/Postgres 메모리 백엔드, with/without 벤치, Description Tuner는 v0.2+ 일정
- alwaysApply 시맨틱은 메타데이터 + session-start hook 동적 합성으로 제공

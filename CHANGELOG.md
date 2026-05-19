# Changelog

## Unreleased

### 추가
- **`register` / `unregister` 명령** — CLI 한 번의 호출로 6 AI 호스트 user-level dir에 슬래시 커맨드를 `jinhak-harness/` 서브디렉터리로 복사. 호스트별 네이티브 네임스페이싱이 자동으로 `/jinhak-harness:init` 형태를 만들어준다.
  - Claude Code: `~/.claude/commands/jinhak-harness/*.md`
  - Cursor: `~/.cursor/commands/jinhak-harness/*.md`
  - Codex CLI: `~/.codex/prompts/jinhak-harness/*.md`
  - Gemini CLI: `~/.gemini/commands/jinhak-harness/*.toml`
  - Antigravity: `~/.gemini/antigravity/commands/jinhak-harness/*.md`
  - OpenCode: `~/.config/opencode/commands/jinhak-harness/*.md`
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
- 모든 사용 예시의 슬래시를 `/<cmd>` → `/jinhak-harness:<cmd>` 네임스페이스로 정정
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
- 토큰 가드 라벨 🟢🟡🔴 (REPORT_06 §6.5)
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

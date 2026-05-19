# Changelog

## 0.1.0 (2026-05-19)

첫 MVP eco 릴리즈.

### 추가
- CLI 진입점: `init`, `doctor`, `start`, `plan`, `build`, `verify`, `handoff`, `ship`, `create`
- 멀티 AI 호환 manifest 6개 (Claude Code, Cursor, Codex, Gemini, Antigravity, OpenCode)
- 공용 utils 3개: `pdf-extract` (pdfplumber), `xlsx-write` (openpyxl), `csv-write` (pandas)
- 직군 스킬 3개: `jobs-pdf-to-excel`, `meeting-notes-to-summary`, `expense-pdf-to-csv`
- baseline 스킬 (`alwaysApply: true`) — 한국어 우선·dry-run 강제 등 정책 layer
- 동적 user-skill 등록 — `/create`로 만든 스킬이 `/plan`·`/build`에 자동 인식
- 친절 실패 리포트 (변수 치환 템플릿, LLM 호출 0)
- 토큰 가드 라벨 🟢🟡🔴 (REPORT_06 §6.5)
- 8 행동 차원 user-profiler (휴리스틱)
- 메모리 facade 4메서드 (JSON 백엔드, 향후 SQLite swap 가능)
- 프로필 분기 eco/standard/power (ADR-001)
- session-start hook (Cursor/Claude Code/Copilot/SDK 3종 JSON 분기, 5 escape)

### 테스트
- 19 스위트 / 265 assertion / mktemp 격리 — `make test-all`

### 알려진 제한
- xlsx 출력은 user-skill 동적 runner 미지원 (템플릿 필요). MVP에서는 jobs-pdf-to-excel 만 지원
- SQLite/Postgres 메모리 백엔드, with/without 벤치, Description Tuner는 v0.2+ 일정
- alwaysApply 시맨틱은 메타데이터만 지원, 실제 자동 주입 로직은 호스트 도구의 hooks/session-start 가 담당

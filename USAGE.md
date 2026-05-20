# jinhak-harness — End-to-End 사용 설명서

비개발자 직군이 자기 반복 업무를 5분 안에 자동화하는 한국어 우선 도구.

---

## 0. 한 줄 요약

`설치 → register → init → doctor → start → plan → build → verify → handoff`. CLI 백엔드 + 6 AI 호스트 슬래시 커맨드 진입점(`/jinhak:*`). 8행동 차원·토큰 가드·dry-run 강제·멀티 AI 호환 모두 기본.

---

## 1. 빠른 시작 (5분)

```bash
# 1. 클론 + npm link (가장 신뢰성 높은 경로)
cd ~/Downloads
git clone https://github.com/ohilikeit/jinhak-vibecode.git
cd jinhak-vibecode && npm link

# 2. 6 AI 호스트 채팅창에 슬래시 등록 (한 번만)
jinhak-harness register

# 3. 첫 셋업 (~/.harness 자동 생성)
jinhak-harness init

# 4. 환경 점검 (의존성/프로필/스킬 카탈로그)
jinhak-harness doctor

# 5. 5문항 직군 인터뷰
jinhak-harness start
```

이후 AI 도구(Claude Code/Cursor/Codex/Gemini/Antigravity/OpenCode) 채팅창에서:
```
/jinhak:autopilot 채용공고 Excel 정리
```

---

## 2. 설치 옵션

### 옵션 A — git clone + npm link (현 단계 권장)

```bash
git clone https://github.com/ohilikeit/jinhak-vibecode.git
cd jinhak-vibecode
npm link
jinhak-harness --version    # 0.1.0 출력되면 OK
make test-all               # 22 스위트 전부 통과 확인 (선택)
```

`git pull` 한 번으로 업데이트 — symlink라 즉시 반영.

### 옵션 B — npm install -g github:... (Linux/macOS 친화)

```bash
npm install -g github:ohilikeit/jinhak-vibecode
```

Windows 일부 환경에서 추출 단계가 묵음 실패하는 사례가 있어 옵션 A를 우선 권장합니다.

### 옵션 C — npm publish 후 (예정)

```bash
npm install -g jinhak-harness    # publish 풀리면
```

### Python 도구

PDF/Excel/CSV 처리에 Python + 3개 라이브러리 필요. `doctor` 가 OS별 설치 명령 안내.

```bash
# 1순위: uv (가장 깔끔)
curl -LsSf https://astral.sh/uv/install.sh | sh
uv tool install --with pdfplumber --with openpyxl --with pandas jinhak-harness-pytools

# 폴백: pip3
pip3 install --user pdfplumber openpyxl pandas
```

### Windows 사전 가이드 (필수)

PowerShell이 npm 스크립트를 차단할 수 있어 관리자 PowerShell에서 한 번:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

그 다음 Git Bash에서 옵션 A 진행.

---

## 2.5. 슬래시 커맨드 등록 — `jinhak-harness register`

CLI 설치 후 AI 도구 채팅창에 `/jinhak:*` 형태로 12개 커맨드가 뜨려면 등록 단계가 필요합니다:

```bash
jinhak-harness register              # 6 호스트 모두 등록
jinhak-harness register --dry-run    # 미리 보기
jinhak-harness register --host=claude,cursor  # 특정 호스트만
jinhak-harness unregister            # 모두 제거
```

호스트별 등록 위치 (서브디렉터리가 자동으로 네임스페이스가 됨):

| 호스트 | 위치 | 슬래시 |
|---|---|---|
| Claude Code | `~/.claude/commands/jinhak/*.md` | `/jinhak:init` |
| Cursor | `~/.cursor/commands/jinhak/*.md` | `/jinhak:init` |
| Codex CLI | `~/.codex/prompts/jinhak/*.md` | `/jinhak:init` |
| Gemini CLI | `~/.gemini/commands/jinhak/*.toml` | `/jinhak:init` |
| Antigravity | `~/.gemini/antigravity/commands/jinhak/*.md` | `/jinhak:init` |
| OpenCode | `~/.config/opencode/commands/jinhak/*.md` | `/jinhak:init` |

등록 후 해당 AI 도구를 **완전히 종료-재실행** 해주세요 (자동완성 캐시 갱신).

### Python 도구

PDF/Excel/CSV 처리에 Python + 3개 라이브러리 필요. `doctor` 가 OS별 설치 명령 안내.

```bash
# 1순위: uv (가장 깔끔)
curl -LsSf https://astral.sh/uv/install.sh | sh
uv tool install --with pdfplumber --with openpyxl --with pandas jinhak-harness-pytools

# 폴백: pip3
pip3 install --user pdfplumber openpyxl pandas
```

---

## 3. 첫 셋업 — 5분 인터뷰

```bash
jinhak-harness init
jinhak-harness start
```

5개 질문이 한국어로 나옵니다:

```
1) 직군이 어떻게 되시나요?
2) 자주 반복하는 업무를 한 줄로 알려주세요
3) 결과물은 어떤 형태인가요?
4) 회사 글말투는?
5) 자주 쓰는 도구를 쉼표로 알려주세요
```

답하면 `~/.harness/user-profile.md`에 YAML frontmatter + 본문이 저장됩니다. 이때 8 행동 차원(상세도/속도/실수 무관용/협업 성향/기록 선호/도구 친숙도/검증 강도)이 답변에서 자동 추론됩니다.

다음 실행 시 인터뷰는 건너뛰고 기존 프로필을 그대로 사용합니다.

---

## 4. 시나리오 A — 채용공고 PDF → Excel

```bash
# 작업 디렉터리 준비
mkdir -p ~/jobs-week-23 && cd ~/jobs-week-23
mkdir -p inbox/jobs assets output

# 1. 회사 표준 Excel 양식을 assets/template.xlsx 로 복사 (헤더 5컬럼:
#    공고제목 / 회사명 / 직무 / 근무지 / 마감일)
cp /path/to/회사양식.xlsx assets/template.xlsx

# 2. 채용공고 PDF 3개를 inbox/jobs/ 로 드래그-드롭

# 3. 계획 확인
jinhak-harness plan "이번 주 채용공고 Excel로 정리"

# 4. 실행
jinhak-harness build "채용공고 Excel 정리"
# → output/jobs.xlsx 가 생성됨

# 5. 검증 (친절 한국어 리포트)
jinhak-harness verify --expected-rows 3

# 6. 미리보기 후 회사 공유 드라이브에 복사
jinhak-harness handoff --to ~/Documents/share/jobs
jinhak-harness handoff --to ~/Documents/share/jobs --confirm

# 7. (선택) git 저장소면 .harness 변경 자동 커밋
jinhak-harness ship --confirm
```

산출물: `output/jobs.xlsx` (회사명/직무/근무지/마감일이 채워진 5컬럼 표).

---

## 5. 시나리오 B — 회의록 텍스트 → 요약 마크다운

```bash
mkdir -p inbox/meetings output

# inbox/meetings/*.txt 에 회의록 텍스트 파일을 둡니다.
# 각 파일 안에는 라벨이 있어야 합니다:
#   날짜: 2026-05-19  (또는 일자:)
#   참석자: 김PM, 이디자이너
#   결정사항: (또는 결정:)
#   액션: (또는 액션아이템:)

jinhak-harness build "이번 주 회의록 요약"
# → output/meeting-summary.md 마크다운 표
```

---

## 6. 시나리오 C — 영수증 PDF → CSV

```bash
mkdir -p inbox/receipts output

# inbox/receipts/*.pdf 에 영수증을 넣으세요.
# 라벨 컨벤션:
#   일자: 2026-05-19  (또는 날짜:)
#   금액: 25,000
#   항목: 회의 점심  (또는 용도:)
#   부서: 기획팀

jinhak-harness build "영수증 CSV 정리"
# → output/expenses.csv (UTF-8 BOM, Excel 호환) + 합계 행 자동 추가
```

---

## 7. 시나리오 D — 새 자동화 직접 만들기 (`/create`)

위 3개 패턴 외의 새 자동화를 만들 때는 인터뷰 6답변으로 SKILL.md를 자동 생성합니다.

```bash
jinhak-harness create
```

```
1) 스킬 이름은? (영문 케밥-케이스 권장):
> contract-pdf-to-summary

2) 어떤 요청일 때 동작할까요?
> 계약서 PDF 요약

3) 입력 폴더 경로는?
> inbox/contracts

4) 입력 파일 확장자는?
> pdf

5) 출력 파일 경로는?
> output/contracts.csv

6) 추출할 항목을 쉼표로 알려주세요:
> 계약일, 회사명, 금액, 만료일
```

결과:
- `~/.harness/user-skills/contract-pdf-to-summary/SKILL.md` (검토용)
- `~/.harness/user-skills/contract-pdf-to-summary/spec.json` (동적 등록용)

이후 즉시:
```bash
jinhak-harness plan "계약서 요약"
jinhak-harness build "계약서 요약"
```
`/build`가 spec.json을 자동으로 발견해 PDF → CSV로 변환합니다 (코드 수정 0).

---

## 8. 진단·디버깅

| 알고 싶은 것 | 명령 |
|---|---|
| 환경 + 의존성 + 프로필 + 스킬 카탈로그 + 메모리 한눈에 | `jinhak-harness doctor` |
| 의존성 캐시 무시하고 재측정 | `jinhak-harness doctor --refresh` |
| 프로필별 스킬 로드 상태 (ADR-001) | `jinhak-harness --debug-loaded` |
| HARNESS 경로 | `jinhak-harness paths` |
| 직전 산출물 검증 | `jinhak-harness verify` |
| 자동화 활동 로그 | `cat ~/.harness/memory/decisions.jsonl` 또는 `.harness/state.md` |

---

## 9. 멀티 AI 호스트 통합

레포 루트에 다음 manifest가 모두 들어있어 호스트가 알아서 인식합니다.

| 호스트 | manifest | 진입 hook |
|---|---|---|
| Claude Code (v2.1.139+) | `.claude-plugin/plugin.json` | `hooks/session-start` |
| Cursor (v0.40+) | `.cursor-plugin/plugin.json` | (snake_case `session_start`) |
| OpenAI Codex CLI | `.codex-plugin/plugin.json` | `hooks/session-start` |
| Gemini CLI | `gemini-extension.json` | `on_session_start` |
| Google Antigravity | `.antigravity/plugin.json` | `hooks/session-start` |
| OpenCode | `.opencode/INSTALL.md` | `AGENTS_SKILLS_HOME` 지정 |

session-start hook은 3종 JSON 스키마(`additional_context` / `hookSpecificOutput.additionalContext` / 최상위 `additionalContext`)로 분기되며 500토큰 이내의 한국어 부트스트랩을 주입합니다.

---

## 10. 프로필과 토큰 가드

| 프로필 | 비용 라벨 | 켜지는 기능 | 끝내는 기능 |
|---|---|---|---|
| `eco` (기본) | 🟢 빠름 | dry-run 강제, 친절 실패 템플릿, 결정론적 인터뷰 | LLM 호출 0, 벤치마크 0 |
| `standard` | 🟡 느림 | + Description Tuner 1회 (스킬 생성 시), 명시 호출 evals | 자동 벤치 OFF |
| `power` | 🔴 할당량 위험 | + with/without 벤치마크, 압박 테스트 | 매 실행 자동 회귀 OFF (스킬 bump 시만) |

프로필 변경:
```bash
jinhak-harness --profile=power build "..."
# 또는
HARNESS_PROFILE=power jinhak-harness build "..."
```

---

## 11. 디렉터리 구조 (홈 + 프로젝트)

```
~/.harness/                       # 글로벌 (HARNESS_HOME)
├── user-profile.md               # 5문항 답변 + 8 행동 차원
├── user-skills/                  # /create로 만든 스킬
│   └── <name>/{SKILL.md, spec.json}
├── memory/
│   ├── decisions.jsonl           # append-only 결정 로그
│   └── projects/<sha256>.json    # 프로젝트별 결정 dict
└── env-cache.json                # lazy-deps 7일 캐시

~/.agents/skills/                 # AGENTS_SKILLS_HOME (호스트 도구가 자동 스캔)
└── (templates/.agents/skills 의 사본)

<프로젝트 cwd>/                   # 실제 작업 디렉터리
├── inbox/{jobs,meetings,receipts,...}/
├── assets/template.xlsx
├── output/
└── .harness/
    ├── state.md                  # 핸드오프 로그 (사람이 읽음)
    └── plans/<timestamp>-<slug>.md
```

격리 모드(`HARNESS_DEV=1`)에서는 `~/.harness` 대신 현재 디렉터리의 `dev-home/`로 모두 격리됩니다 — 개발·테스트용.

---

## 12. 자주 묻는 질문

**Q. ~/.harness를 삭제해도 되나요?**
A. 네. `rm -rf ~/.harness` 하면 모든 결정·메모리·user-skill이 사라집니다. `init`으로 다시 만들면 됩니다.

**Q. 한 PC에 여러 사람이 쓰면?**
A. 각 사용자 홈에 `~/.harness`가 독립적이라 격리됩니다. 같은 사용자의 다른 프로젝트는 sha256(cwd)로 메모리가 분리됩니다.

**Q. PDF에 라벨이 한국어가 아니면?**
A. SKILL.md에 다른 라벨을 추가하거나 `/create`로 새 스킬을 만들면서 라벨을 정의하세요. 예: `회사명` → `Company Name`.

**Q. 자동화가 실패하면?**
A. 친절 실패 리포트(docs/research/REPORT_06 §4 #8)가 어느 파일/필드가 문제인지 한국어로 알려줍니다. LLM 호출 0원.

**Q. 토큰 한도가 초과될까 봐 걱정돼요.**
A. eco 프로필 기본은 LLM 호출이 없습니다. PDF·Excel 처리만 합니다. `power` 프로필을 명시 지정해야 LLM 사용 기능이 켜집니다.

**Q. 회사 보안 정책상 외부로 데이터가 못 나가요.**
A. eco 프로필은 외부 전송이 모두 dry-run 기본입니다. `/handoff --confirm`도 로컬 파일 복사일 뿐 외부로 가지 않습니다. 외부 전송(Slack/Gmail 등)은 v0.2+ 도구 통합 단계.

---

## 13. 호환 도구 별 빠른 안내

### Claude Code
```bash
# .claude-plugin/plugin.json 자동 인식
claude    # 시작하면 hooks/session-start가 부트스트랩 컨텍스트 주입
```

### Cursor
```bash
# .cursor-plugin/plugin.json + .cursor/rules/ 자동 인식
cursor .  # 같은 hooks/session-start 가 snake_case 분기로 동작
```

### Codex CLI / Gemini / Antigravity
각 manifest가 같은 hook + skills_dir 을 가리키므로 호스트만 다른 동일 경험.

---

## 14. 다음 단계 (v0.2+)

- Description Tuner (스킬 생성 시 1회) — `standard` 프로필
- Skill 메모리 SQLite/Postgres 백엔드 (현재 JSON)
- 외부 도구 통합 5종 (Notion / Gmail / Slack / Figma / Webhook)
- with/without 벤치마크 — `power` 프로필
- design system (DESIGN.md + design-html)

---

## 부록 — 명령 참조표

| 명령 | 무엇 |
|---|---|
| `jinhak-harness init` | `$HARNESS_HOME` 첫 초기화 |
| `jinhak-harness doctor [--refresh]` | 환경·의존성·프로필·스킬·메모리 진단 |
| `jinhak-harness start` | 5문항 직군 인터뷰 (한 번만) |
| `jinhak-harness plan "<요청>"` | 요청 분석 + plan markdown 저장 |
| `jinhak-harness build "<요청>"` | 자동화 실행 |
| `jinhak-harness verify [--expected-rows N]` | 산출물 친절 리포트 |
| `jinhak-harness handoff [--to D] [--label L] [--confirm]` | 외부 위치 복사 |
| `jinhak-harness ship [--confirm] [--push]` | `.harness` git 커밋 |
| `jinhak-harness create` | 새 자동화 SKILL.md + spec.json 생성 |
| `jinhak-harness autopilot "<요청>" [--expected-rows N]` | plan + build + verify 한 번에 |
| `jinhak-harness --help` | 전체 카탈로그 |
| `jinhak-harness --version` | 버전 |
| `jinhak-harness --debug-loaded [--profile=X]` | 스킬 로드 상태 |
| `jinhak-harness paths` | HARNESS 경로 |

---

질문·이슈는 GitHub Issues: https://github.com/jihwanyoon/jinhak-vibecode/issues

# jinhak-harness — 처음 쓰는 분을 위한 사용설명서

> **누구를 위한 문서인가요?**
> 개발자가 아니어도, 컴퓨터에 무엇을 깔아본 적이 거의 없어도, 이 문서만 보고 따라 하면 **15분 안에 첫 자동화**가 돌아가도록 만들었습니다.
>
> 개발자/제작자용 상세 문서는 [USAGE.md](./USAGE.md), [README.md](./README.md)를 봐주세요.

---

## 0. 이 도구가 뭐예요?

반복되는 사무 업무(채용공고 PDF 모으기 → Excel 정리, 회의록 → 요약, 영수증 → CSV)를 **AI 코딩 도구의 채팅창**(Claude Code · Cursor · Codex · Gemini · Antigravity · OpenCode)에서 `/jinhak-harness:start`, `/jinhak-harness:build` 같은 **슬래시 커맨드** 한 줄로 돌아가게 만들어 주는 한국어 도구입니다.

- 5분짜리 인터뷰만 하면 내 직군에 맞게 설정됩니다
- 결과물은 항상 한국어로 알려줍니다
- 회사 밖으로 데이터를 보내지 않습니다 (기본값)
- **6개 AI 도구** 어디서나 동일한 슬래시 커맨드로 동작합니다

---

## 1. 설치 전 준비물 (한 번만)

### 1-1. Node.js 설치 (필수)

이 도구는 Node.js라는 무료 프로그램 위에서 돕니다. 한 번만 깔면 됩니다.

#### macOS
1. https://nodejs.org/ko 방문
2. **LTS** 라고 표시된 큰 초록 버튼 클릭 → `.pkg` 파일 다운로드
3. 다운받은 파일 더블클릭 → "다음" 만 누르면 설치 완료

#### Windows
1. https://nodejs.org/ko 방문
2. **LTS** 라고 표시된 큰 초록 버튼 클릭 → `.msi` 파일 다운로드
3. 다운받은 파일 더블클릭 → "Next" 만 누르면 설치 완료

#### 설치 확인 — 터미널에서:

**macOS**: `Cmd + Space` → "terminal" 검색 → Enter
**Windows**: `Win + R` → "powershell" 입력 → Enter

```bash
node --version
```

`v18.x.x` 또는 그 이상이 나오면 OK.

### 1-2. Python 설치 (PDF·Excel을 다루실 거면 필요)

영수증/채용공고 같은 **PDF**를 자동화하려면 Python이 필요합니다. 텍스트 회의록만 쓸 거면 건너뛰어도 됩니다.

```bash
python3 --version       # 이미 깔려 있는지 확인
```
없다면 https://www.python.org/downloads/ → Windows라면 설치 첫 화면에서 **`Add Python to PATH` 체크박스 켜기**.

---

## 2. jinhak-harness 설치 (3줄)

Windows는 사전에 PowerShell 관리자에서 한 번:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

그 다음 Git Bash(또는 macOS/Linux 터미널)에서:
```bash
cd ~/Downloads
git clone https://github.com/ohilikeit/jinhak-vibecode.git
cd jinhak-vibecode && npm link
```

확인:
```bash
jinhak-harness --version       # → jinhak-harness v0.1.0
```

> 왜 `npm install -g` 가 아닌가: 일부 Windows 환경에서 `npm install -g github:...` 가
> 추출 단계에서 실패하는 사례가 있어 `git clone + npm link` 를 권장합니다. 정식 npm publish 후엔
> `npm install -g jinhak-harness` 한 줄로 바뀝니다.

### 2-1. AI 도구에 슬래시 커맨드 등록 (1줄)

CLI는 깔렸지만 AI 도구 채팅창의 슬래시 메뉴(`/jinhak-harness:*`)에는 아직 안 뜹니다. 한 번 더:

```bash
jinhak-harness register
```

이러면 6 호스트(Claude Code · Cursor · Codex · Gemini · Antigravity · OpenCode)의 user-level commands 디렉터리로 12개 슬래시 커맨드가 한 번에 복사됩니다. 적용 후 AI 도구를 **완전히 종료-재실행**하세요 (자동완성 캐시 갱신).

미리 보기:
```bash
jinhak-harness register --dry-run
```

제거:
```bash
jinhak-harness unregister
```

---

## 3. 처음 5분 — AI 도구에서 슬래시 커맨드 쓰기

`register` 가 끝난 뒤 6개 AI 도구가 다음 12개 슬래시 커맨드를 모두 인식합니다 (네임스페이스 `jinhak-harness:`):

```
/jinhak-harness:init       /jinhak-harness:doctor     /jinhak-harness:start
/jinhak-harness:plan       /jinhak-harness:build      /jinhak-harness:verify
/jinhak-harness:handoff    /jinhak-harness:ship       /jinhak-harness:create
/jinhak-harness:autopilot  /jinhak-harness:register   /jinhak-harness:unregister
```

> 처음 쓰는 분은 그냥 **`/jinhak-harness:autopilot "<무엇을 자동화할지 한국어로>"`** 한 줄만 알면 충분합니다.

### 3-1. 어떤 AI 도구를 쓰시나요?

`register` 한 번 돌리면 6개 호스트가 자동으로 인식합니다. AI 도구를 **완전히 종료-재실행**해 자동완성 캐시를 새로 받으세요.

| 도구 | 진입 |
|---|---|
| **Claude Code** | 채팅창에서 `/jinhak-harness:` 입력 → 12개 후보 자동완성 |
| **Cursor** | 채팅창에서 `/jinhak-harness:` 입력 |
| **Codex CLI** | `codex` 실행 후 `/jinhak-harness:start` |
| **Gemini CLI** | `gemini` 실행 후 `/jinhak-harness:start` |
| **Google Antigravity** | 채팅창에서 `/jinhak-harness:start` |
| **OpenCode** | `opencode` 실행 후 `/jinhak-harness:start` |

### 3-2. 첫 3개 커맨드 (한 번씩)

AI 도구 채팅창에서 순서대로:

```
/jinhak-harness:init       ← 홈 폴더 만들기
/jinhak-harness:doctor     ← 환경 점검 (6 섹션 한국어 진단)
/jinhak-harness:start      ← 5문항 직군 인터뷰
```

`/jinhak-harness:start` 는 채팅창에서 한 문항씩 묻고 답하면 됩니다:

```
1) 직군이 어떻게 되시나요?           예) 인사담당자
2) 자주 반복하는 업무를 한 줄로?     예) 매주 채용공고 정리
3) 결과물은 어떤 형태?              예) Excel
4) 회사 글말투는?                  예) 격식체
5) 자주 쓰는 도구를 쉼표로?         예) Excel, Notion, Slack
```

답한 내용이 자동으로 8 행동 차원(상세도·속도·검증 강도 등)으로 추론되어 `~/.harness/user-profile.md` 에 저장됩니다.

---

## 4. 첫 자동화 따라 하기 — "채용공고 PDF 3개 → Excel 한 장"

### 4-1. 작업 폴더 준비

데스크탑에 폴더 하나 만들고 그 안에:

```
~/Desktop/my-jobs/
  ├── inbox/jobs/      ← 채용공고 PDF 여기에 넣기
  ├── assets/          ← 회사 표준 Excel 양식
  └── output/          ← 결과물이 여기로 나옴
```

### 4-2. 회사 양식 + PDF 넣기

1. `assets/template.xlsx` 에 회사 표준 양식(헤더 5컬럼: 공고제목 / 회사명 / 직무 / 근무지 / 마감일)
2. `inbox/jobs/` 에 채용공고 PDF 3개 드래그-드롭

### 4-3. AI 도구 채팅창에 한 줄

`my-jobs` 폴더를 작업 디렉터리로 열고 채팅창에서:

```
/jinhak-harness:autopilot 이번 주 채용공고 Excel로 정리
```

AI가 알아서 plan → build → verify 3단계를 돌립니다:

```
━━━ 1/3 plan ━━━
  → 라우팅: jobs-pdf-to-excel
━━━ 2/3 build ━━━
  → output/jobs.xlsx 생성
━━━ 3/3 verify ━━━
  → 예상 행 수 (3)와 일치 ✅
✅ autopilot 완료 — 다음: /jinhak-harness:handoff --to <폴더> --confirm
```

### 4-4. 결과를 회사 공유 드라이브로

```
/jinhak-harness:handoff --to ~/Documents/share/jobs              ← 미리 보기만 (실제로 안 옮김)
/jinhak-harness:handoff --to ~/Documents/share/jobs --confirm   ← 진짜 복사
```

**`--confirm` 없으면 안 옮겨집니다.** 실수 방지 장치입니다.

---

## 5. 다음에 시도할 수 있는 자동화

### A. 회의록 텍스트 → 요약 마크다운
회의록 `.txt` 파일을 `inbox/meetings/` 에 넣고 채팅창에서:
```
/jinhak-harness:build 이번 주 회의록 요약
```
→ `output/meeting-summary.md` (파일 안에 `날짜:`, `참석자:`, `결정:`, `액션:` 라벨이 있어야 함)

### B. 영수증 PDF → CSV
영수증 PDF를 `inbox/receipts/` 에 넣고:
```
/jinhak-harness:build 영수증 CSV 정리
```
→ `output/expenses.csv` (Excel에서 바로 열림, 합계 행 자동 추가)

### C. 내 직군 전용 자동화 만들기
```
/jinhak-harness:create
```
6문항만 답하면 새 자동화 스킬이 등록됩니다 (예: 계약서 PDF → 요약 CSV, 견적서 → 비교표, 발주서 → 거래처별 집계). 코드 수정 0회.

---

## 6. 슬래시 커맨드 빠른 참조표 (외울 필요 없음)

| 무엇 하고 싶을 때 | 슬래시 커맨드 |
|---|---|
| 6 호스트 등록 (설치 직후 한 번) | `/jinhak-harness:register` |
| 첫 셋업 | `/jinhak-harness:init` |
| 내 환경에 문제 없는지 점검 | `/jinhak-harness:doctor` |
| 5문항 인터뷰 (한 번만) | `/jinhak-harness:start` |
| 무엇을 할지 미리 보기 | `/jinhak-harness:plan <요청>` |
| 실제 실행 | `/jinhak-harness:build <요청>` |
| 결과 검증 | `/jinhak-harness:verify` |
| 결과를 다른 폴더로 복사 | `/jinhak-harness:handoff --to <폴더> --confirm` |
| **한 줄로 plan+build+verify** | **`/jinhak-harness:autopilot <요청>`** |
| 새 자동화 만들기 | `/jinhak-harness:create` |
| .harness git 커밋 | `/jinhak-harness:ship --confirm` |
| 호스트 등록 해제 | `/jinhak-harness:unregister` |

---

## 7. AI 도구가 슬래시 커맨드를 어떻게 인식하나요? (호스트별 차이)

여러분이 신경 쓰지 않아도 되는 내부 차이지만, 회사 보안 팀이 물으면 답할 수 있도록:

| 도구 | 슬래시 커맨드 형식 | 자동 인식 경로 |
|---|---|---|
| Claude Code | Markdown + frontmatter | `commands/<name>.md` (플러그인 루트) |
| Cursor | Markdown (frontmatter 없음) | `.cursor/commands/<name>.md` |
| Codex CLI | Markdown + frontmatter | `commands/<name>.md` 또는 `~/.codex/prompts/` |
| Gemini CLI | **TOML** (별도 형식) | `.gemini/commands/<name>.toml` |
| Antigravity | Skill 기반 | `commands/<name>.md` + SKILL.md |
| OpenCode | Markdown + frontmatter | `commands/<name>.md` |

이 도구는 **canonical `commands/<name>.md` 하나만 작성**하고, `scripts/gen-commands.mjs` 가 Cursor·Gemini용 변환본을 자동 생성합니다. 사용자는 신경 쓸 필요가 없습니다.

---

## 8. 자주 묻는 질문

**Q. 내 PDF 파일이 회사 밖으로 나가나요?**
A. 안 나갑니다. 기본 프로필(`eco`)은 외부 전송이 차단되어 있고, 모든 처리는 내 컴퓨터 안에서만 일어납니다.

**Q. AI한테 돈 내야 하나요?**
A. 기본 프로필은 LLM 호출이 0회입니다. PDF·Excel 처리만 합니다. 추가 비용 없음.

**Q. 슬래시 커맨드가 자동완성에 안 떠요.**
A. (1) `jinhak-harness register` 를 돌렸는지 확인. (2) AI 도구를 한 번 **완전히 종료** 후 재실행. (3) 그래도 안 뜨면 `/jinhak-harness:doctor` 를 실행해 진단 리포트 확인.

**Q. 실수로 결과가 이상하면 되돌릴 수 있나요?**
A. `output/` 안의 파일은 다시 만들면 덮어쓰여집니다. 원본 PDF는 `inbox/` 에 그대로. `~/.harness/memory/decisions.jsonl` 에 모든 결정 기록이 남습니다.

**Q. 회사 PC를 바꿔도 설정이 유지되나요?**
A. `~/.harness/` 폴더만 복사해 가시면 됩니다. 또는 새 PC에서 `jinhak-harness register` → `/jinhak-harness:start` 다시 한 번.

**Q. PDF 추출이 잘 안 돼요. 글자가 비어요.**
A. PDF가 **이미지 스캔본**이면 글자가 안 잡힙니다. OCR이 된 텍스트형 PDF여야 합니다. `/jinhak-harness:verify` 가 어느 줄이 비었는지 한국어로 알려줍니다.

**Q. 삭제하고 싶어요.**
A. 깨끗하게 한 번에:
```bash
# 1) 6 호스트에서 슬래시 커맨드 제거
jinhak-harness unregister

# 2) CLI 자체 제거 (npm link로 깐 경우)
cd ~/Downloads/jinhak-vibecode
npm unlink -g jinhak-harness

# 3) 클론 폴더 + 설정 삭제 (선택)
rm -rf ~/Downloads/jinhak-vibecode ~/.harness
```

---

## 9. 막혔을 때 / 도움 요청

- 친절한 한국어 에러 메시지가 어디가 문제인지 알려줍니다 (LLM 호출 없이도)
- 그래도 해결 안 되면: `/jinhak-harness:doctor` 결과를 캡처해서 https://github.com/ohilikeit/jinhak-vibecode/issues 에 올려주세요
- 또는 회사 IT 담당자에게 이 문서를 함께 전달해 주세요

---

## 부록 A — CLI로도 쓰고 싶다면 (스크립트·CI 친화)

슬래시 커맨드 외에 터미널에서 같은 명령을 직접 호출할 수 있습니다. **결과는 동일**합니다.

| 슬래시 커맨드 | 동등 CLI 명령 |
|---|---|
| `/jinhak-harness:register` | `jinhak-harness register` |
| `/jinhak-harness:unregister` | `jinhak-harness unregister` |
| `/jinhak-harness:init` | `jinhak-harness init` |
| `/jinhak-harness:doctor` | `jinhak-harness doctor [--refresh]` |
| `/jinhak-harness:start` | `jinhak-harness start` |
| `/jinhak-harness:plan <요청>` | `jinhak-harness plan "<요청>"` |
| `/jinhak-harness:build <요청>` | `jinhak-harness build "<요청>"` |
| `/jinhak-harness:verify` | `jinhak-harness verify [--expected-rows N]` |
| `/jinhak-harness:handoff` | `jinhak-harness handoff --to <폴더> [--confirm]` |
| `/jinhak-harness:ship` | `jinhak-harness ship [--confirm] [--push]` |
| `/jinhak-harness:create` | `jinhak-harness create` |
| `/jinhak-harness:autopilot <요청>` | `jinhak-harness autopilot "<요청>"` |

배치 자동화나 cron 작업에 유용합니다. 슬래시 커맨드와 CLI는 **동일한 백엔드**(bin/install.js)를 호출하므로 결과가 100% 일치합니다.

---

**한 줄 요약**: 설치 후 한 번 `jinhak-harness register`, 그 다음 AI 채팅창에서 `/jinhak-harness:init → :doctor → :start → :autopilot "<요청>"`. 🌱

# jinhak-harness — 처음 쓰는 분을 위한 사용설명서

> **누구를 위한 문서인가요?**
> 개발자가 아니어도, 컴퓨터에 무엇을 깔아본 적이 거의 없어도, 이 문서만 보고 따라 하면 **15분 안에 첫 자동화**가 돌아가도록 만들었습니다.
>
> 개발자/제작자용 상세 문서는 [USAGE.md](./USAGE.md), [README.md](./README.md)를 봐주세요.

---

## 0. 이 도구가 뭐예요?

반복되는 사무 업무(채용공고 PDF 모으기 → Excel 정리, 회의록 → 요약, 영수증 → CSV)를 **컴퓨터가 알아서 하게** 만들어 주는 한국어 도구입니다.

- 5분짜리 인터뷰만 하면 내 직군에 맞게 설정됩니다
- 결과물은 항상 한국어로 알려줍니다
- 회사 밖으로 데이터를 보내지 않습니다 (기본값)
- Claude Code / Cursor / Codex / Gemini / Antigravity / OpenCode 모두에서 똑같이 동작합니다

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

`v18.x.x` 또는 그 이상이 나오면 OK. (예: `v22.11.0`)

> ⚠️ `command not found` 라고 나오면 Node.js 설치가 안 된 것입니다. 다시 1-1로.

### 1-2. Python 설치 (PDF·Excel을 다루실 거면 필요)

영수증/채용공고 같은 **PDF**를 자동화하려면 Python이 필요합니다. 텍스트 회의록만 쓸 거면 건너뛰어도 됩니다.

#### macOS
```bash
# macOS는 보통 Python이 이미 깔려 있어요. 확인:
python3 --version
```
없다면 https://www.python.org/downloads/ 에서 최신 LTS 설치.

#### Windows
1. https://www.python.org/downloads/ → 큰 노란 버튼 클릭
2. **반드시** 설치 첫 화면에서 `Add Python to PATH` 체크박스 켜기
3. "Install Now" 클릭

---

## 2. jinhak-harness 설치 (한 줄)

터미널(PowerShell)을 열고 **딱 한 줄** 복사-붙여넣기:

```bash
npm install -g github:ohilikeit/jinhak-vibecode
```

> **왜 `npm install -g jinhak-harness`는 안 되나요?**
> 아직 공식 npm 저장소에 올리지 않은 단계입니다. GitHub에서 직접 받아오는 위 명령으로 동일하게 동작합니다. 정식 등록 후엔 `npm install -g jinhak-harness` 한 줄로 바뀝니다.

설치가 끝나면 환영 메시지가 한국어로 뜹니다. 확인:

```bash
jinhak-harness --version
```

`0.1.0` 같은 숫자가 보이면 성공.

### 막혔을 때

| 에러 메시지 | 해결 |
|---|---|
| `EACCES: permission denied` | macOS/Linux면 앞에 `sudo` 붙이기 → `sudo npm install -g github:ohilikeit/jinhak-vibecode` |
| `command not found: npm` | Node.js 설치 (1-1)부터 다시 |
| `command not found: jinhak-harness` (설치는 됐는데) | 터미널을 완전히 닫고 새로 열어보세요 |

---

## 3. 처음 5분 — 첫 셋업

터미널에서 순서대로:

### 3-1. 홈 폴더 만들기 (저장 공간)

```bash
jinhak-harness init
```

→ `~/.harness/` 라는 폴더가 생기고 거기에 모든 설정·기록이 저장됩니다. 이걸 지워도 다시 `init` 하면 새로 만들어집니다.

### 3-2. 환경 점검

```bash
jinhak-harness doctor
```

화면에 6개 섹션이 한국어로 뜹니다:
- 환경 / 프로필 / 의존성 / 스킬 카탈로그 / 메모리 / 최근 활동

빨간 `❌` 가 보이면 그 줄의 안내대로 따라 하세요. (대부분 Python 라이브러리 설치 명령을 알려줍니다.)

### 3-3. 5문항 인터뷰

```bash
jinhak-harness start
```

질문 5개가 한국어로 차례로 나옵니다:

```
1) 직군이 어떻게 되시나요?            예: 인사담당자
2) 자주 반복하는 업무를 한 줄로 알려주세요  예: 매주 채용공고 모아서 표 만들기
3) 결과물은 어떤 형태인가요?            예: Excel
4) 회사 글말투는?                     예: 격식체
5) 자주 쓰는 도구를 쉼표로 알려주세요    예: Excel, Notion, Slack
```

답하면 자동으로 8가지 행동 특성(상세도·속도·검증 강도 등)을 추론해 저장합니다. **딱 한 번만** 답하면 끝, 다음부터는 알아서 적용됩니다.

---

## 4. 첫 자동화 따라 하기 — "채용공고 PDF 3개를 Excel 한 장으로"

### 4-1. 작업 폴더 준비

데스크탑에 폴더를 하나 만들고 그 안에 다음 3개 폴더를 만드세요:

```
~/Desktop/my-jobs/
  ├── inbox/jobs/      ← 채용공고 PDF를 여기에 넣을 거예요
  ├── assets/          ← 회사 표준 Excel 양식
  └── output/          ← 결과물이 여기로 나옵니다
```

터미널에서 한 번에:

```bash
mkdir -p ~/Desktop/my-jobs/inbox/jobs ~/Desktop/my-jobs/assets ~/Desktop/my-jobs/output
cd ~/Desktop/my-jobs
```

### 4-2. 채용공고 PDF·Excel 양식 넣기

1. 회사가 쓰는 Excel 양식(헤더: 공고제목 / 회사명 / 직무 / 근무지 / 마감일)을 `assets/template.xlsx` 로 복사
2. 모은 채용공고 PDF 3개를 `inbox/jobs/` 폴더에 드래그-드롭

### 4-3. 한 번에 실행

```bash
jinhak-harness autopilot "이번 주 채용공고 Excel로 정리"
```

화면에 단계가 줄줄이 표시됩니다:

```
━━━ 1/3 plan ━━━
  → 어떤 스킬을 쓸지 결정 중... jobs-pdf-to-excel
━━━ 2/3 build ━━━
  → PDF에서 회사명/직무/근무지/마감일 추출 중...
  → output/jobs.xlsx 생성
━━━ 3/3 verify ━━━
  → 예상 행 수 (3)와 일치 ✅
✅ autopilot 완료
```

`output/jobs.xlsx` 를 열어보세요. 회사명·직무·근무지·마감일이 채워진 표가 만들어져 있습니다.

### 4-4. 결과를 공유 폴더로 옮기기

```bash
# 1) 옮길 곳 미리 보기 (실제로는 안 옮김)
jinhak-harness handoff --to ~/Documents/shared-jobs

# 2) 진짜 옮기기
jinhak-harness handoff --to ~/Documents/shared-jobs --confirm
```

> **--confirm 없으면 안 옮겨집니다.** 실수 방지 장치입니다.

---

## 5. 다음에 시도할 수 있는 자동화

### A. 회의록 텍스트 → 요약 마크다운
회의록 `.txt` 파일을 `inbox/meetings/` 에 넣고:
```bash
jinhak-harness build "이번 주 회의록 요약"
# → output/meeting-summary.md
```
(파일 안에 `날짜:`, `참석자:`, `결정:`, `액션:` 라벨이 있어야 합니다)

### B. 영수증 PDF → CSV
영수증 PDF를 `inbox/receipts/` 에 넣고:
```bash
jinhak-harness build "영수증 CSV 정리"
# → output/expenses.csv (Excel에서 바로 열림, 합계 행 자동 추가)
```

### C. 내 직군 전용 자동화 만들기 (인터뷰 6문항)
```bash
jinhak-harness create
```
6문항만 답하면 새 자동화 스킬이 등록됩니다. 예시:
- 계약서 PDF → 요약 CSV
- 견적서 PDF → 비교표
- 발주서 → 거래처별 집계

---

## 6. 명령어 빠른 참조표 (외울 필요 없음, 자주 보세요)

| 무엇 하고 싶을 때 | 명령 |
|---|---|
| 첫 셋업 | `jinhak-harness init` |
| 내 환경에 문제 없는지 점검 | `jinhak-harness doctor` |
| 5문항 인터뷰 (한 번만) | `jinhak-harness start` |
| 무엇을 할지 미리 보기 | `jinhak-harness plan "<요청>"` |
| 실제 실행 | `jinhak-harness build "<요청>"` |
| 결과 검증 | `jinhak-harness verify` |
| 결과를 다른 폴더로 복사 | `jinhak-harness handoff --to <폴더> --confirm` |
| 한 줄로 plan+build+verify | `jinhak-harness autopilot "<요청>"` |
| 새 자동화 만들기 | `jinhak-harness create` |
| 명령어 전체 보기 | `jinhak-harness --help` |

---

## 7. 자주 묻는 질문

**Q. 내 PDF 파일이 회사 밖으로 나가나요?**
A. 안 나갑니다. 기본 프로필(`eco`)은 외부 전송이 모두 차단되어 있고, 모든 처리는 내 컴퓨터 안에서만 일어납니다.

**Q. AI한테 돈 내야 하나요?**
A. 기본 프로필은 LLM 호출이 0회입니다. PDF·Excel 처리만 합니다. 추가 비용 없음.

**Q. 실수로 결과가 이상하면 되돌릴 수 있나요?**
A. `output/` 안의 파일은 다시 만들면 덮어쓰여집니다. 원본 PDF는 `inbox/` 안에 그대로 있어요. `~/.harness/memory/decisions.jsonl` 에 모든 결정 기록이 남습니다.

**Q. 회사 PC를 바꿔도 설정이 유지되나요?**
A. `~/.harness/` 폴더만 복사해 가시면 됩니다. (또는 새 PC에서 `start` 다시 한 번)

**Q. PDF 추출이 잘 안 돼요. 글자가 비어요.**
A. PDF가 **이미지 스캔본**이면 글자가 안 잡힙니다. OCR이 된 텍스트형 PDF여야 합니다. `verify` 가 어느 줄이 비었는지 한국어로 알려줍니다.

**Q. 다른 AI 도구(Cursor, Gemini)에서도 같은 게 되나요?**
A. 네. 이 도구는 6개 AI 호스트(Claude Code · Cursor · Codex CLI · Gemini CLI · Google Antigravity · OpenCode)에서 동일하게 동작하도록 설계돼 있습니다. 각 호스트가 알아서 인식합니다.

**Q. 삭제하고 싶어요.**
A.
```bash
npm uninstall -g jinhak-harness    # 또는 npm uninstall -g github:ohilikeit/jinhak-vibecode
rm -rf ~/.harness                   # 모든 설정/기록 삭제 (선택)
```

---

## 8. 막혔을 때 / 도움 요청

- 친절한 한국어 에러 메시지가 어디가 문제인지 알려줍니다 (LLM 호출 없이도)
- 그래도 해결 안 되면: `jinhak-harness doctor` 결과를 캡처해서 https://github.com/ohilikeit/jinhak-vibecode/issues 에 올려주세요
- 또는 회사 IT 담당자에게 이 문서를 함께 전달해 주세요

---

**한 줄 요약**: `설치 → init → doctor → start → autopilot "<요청>"`. 그 다음은 도구가 알아서 합니다. 🌱

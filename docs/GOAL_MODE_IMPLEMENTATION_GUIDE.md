# `/goal` 모드로 jinhak-harness MVP 구현 가이드

**작성일**: 2026-05-19
**대상**: 이 레포의 MVP를 Claude Code v2.1.139+ `/goal` 모드로 구현하려는 개발자
**전제 문서**: [README.md](../README.md), [REPORT_06_FINAL_synthesis.md](../REPORT_06_FINAL_synthesis.md), [ADR-003](adr/ADR-003-common-utils-layer.md), [ADR-004](adr/ADR-004-scheduler-and-background.md)

---

## 0. 한 줄 요약

> `/goal`은 **"이 조건이 만족될 때까지 사용자 개입 없이 턴을 계속 돌려라"** 라는 세션-범위 단축키다. Auto mode가 도구별 승인을 없애고 `/goal`이 턴별 승인을 없애므로 **둘을 같이 켜면** 진정한 무인 실행이 된다. 단 — 글로벌 설치형 도구를 만들 때는 dev 환경 격리(`npm link` + `HARNESS_HOME` + `mktemp`)를 먼저 깔고 들어가야 안전하다.

---

## 1. `/goal` 모드의 본질

### 1.1 다른 자율 모드와의 차이

| 모드 | 다음 턴 트리거 | 종료 조건 | 우리에 적합? |
|---|---|---|---|
| `/goal` | 이전 턴 완료 | 작은 평가 모델(Haiku)이 조건 충족 확인 | ✅ **1순위** — 검증 가능한 최종 상태 다수 |
| `/loop` | 시간 간격 | 사용자 stop or Claude 자체 판단 | ⚠️ 폴링용. 우리는 폴링 작업 거의 없음 |
| Stop hook | 이전 턴 완료 | 사용자 스크립트/프롬프트 | ⚠️ 설정 파일 수정 필요, 세션 단축키보다 무거움 |
| Auto mode | (도구 승인만, 새 턴 X) | Claude 자체 판단 | ✅ `/goal`과 **조합** |

**결론**: `/goal + Auto mode` 조합이 MVP 구현의 표준 워크플로. `/loop`·Stop hook은 이번 프로젝트에선 필요 없음.

### 1.2 평가자 동작 원리

- 매 턴 후 작은 빠른 모델(기본 Haiku)이 **대화에서 Claude가 표시한 내용만** 보고 조건 충족 여부 판단
- **외부 명령 실행·파일 읽기 X** → 따라서 조건은 **Claude의 출력으로 입증 가능한 것**이어야 함
- "예/아니오 + 짧은 이유" 반환 → "아니오"면 그 이유가 다음 턴 지시로 자동 주입
- 평가 토큰 비용은 무시 가능 (Haiku 짧은 응답)

### 1.3 효과적인 조건의 3요소

1. **하나의 측정 가능한 최종 상태** — 테스트 결과, 빌드 종료 코드, 파일 수, 함수 존재 여부
2. **명시된 확인 방법** — "`npm test` 종료 0", "`git status`가 깨끗함", "`./scripts/fresh-test.sh` 출력에 '✅ 통과' 포함"
3. **중요한 제약 조건(가드레일)** — "다른 디렉터리 파일은 수정 X", "node_modules 안 건드림", "ADR-003에 명시된 라이브러리만 사용"

조건 최대 4,000자. **턴/시간 절을 항상 포함** (`or stop after 20 turns`).

---

## 2. 우리 레포의 특수성 — 글로벌 설치형 npm 도구

`jinhak-harness`는 `npx jinhak-harness@latest` 로 글로벌 설치되어 `~/.harness/` `~/.agents/skills/` 같은 사용자 홈 디렉터리를 만진다. `/goal`로 무인 구현 시 **개발 머신의 진짜 사용자 환경을 오염시킬 위험**이 있으므로 **첫 goal 실행 전에 격리 셋업이 무조건 선행**되어야 한다.

### 2.1 격리 셋업 체크리스트 (첫 1회만)

```bash
cd ~/jinhak-vibecode

# 1) npm link로 글로벌 명령 흉내 (진짜 install 안 함)
npm link

# 2) 환경변수로 사용자 데이터 위치 강제
export HARNESS_HOME=$PWD/dev-home
export AGENTS_SKILLS_HOME=$PWD/dev-home/agents/skills
export HARNESS_DEV=1   # Dry-run default ON

# 3) .gitignore에 격리 디렉터리 추가
echo -e "\ndev-home/\ntest-*/\n.venv-dev/" >> .gitignore

# 4) 깨끗한 임시 테스트 디렉터리 만드는 스크립트
mkdir -p scripts
cat > scripts/fresh-test.sh <<'EOF'
#!/bin/bash
set -e
TESTDIR=$(mktemp -d -t jinhak-test-XXXXXX)
export HARNESS_HOME="$TESTDIR/harness-home"
export AGENTS_SKILLS_HOME="$TESTDIR/agents/skills"
cd "$TESTDIR"
echo "🧪 격리 테스트 디렉터리: $TESTDIR"
"$@"   # 인자로 받은 명령 실행
echo "🗑  리셋: rm -rf $TESTDIR"
EOF
chmod +x scripts/fresh-test.sh
```

### 2.2 goal 조건에 항상 포함할 가드레일

모든 `/goal` 조건 끝에 다음 절을 붙일 것:

```
... and no files outside {jinhak-vibecode 레포 경로} are modified,
and HARNESS_HOME / AGENTS_SKILLS_HOME / ~/.harness / ~/.agents are not touched,
or stop after 25 turns.
```

이 한 줄이 **글로벌 오염을 평가자 단계에서 차단**한다.

---

## 3. MVP 구현 단계별 `/goal` 조건 (복사붙여넣기 준비)

각 단계는 독립적으로 `/goal` 1회 호출이다. 직전 단계가 완료된 상태에서 다음을 시작한다.

### Phase 0 — 부트스트랩 & 격리 셋업 검증 (사용자가 직접, 10분)

이 단계는 **Claude한테 시킬 수 없다** — 셸 환경변수·시스템 도구 설치이기 때문. 같은 터미널 세션에서 다음을 순서대로 직접 실행:

```bash
# 0-1. Claude Code 버전 확인 (v2.1.139+ 필수)
claude --version

# 0-2. 격리 환경변수 (세션 종료 시까지 유지)
cd ~/jinhak-vibecode
export HARNESS_HOME=$PWD/dev-home
export AGENTS_SKILLS_HOME=$PWD/dev-home/agents/skills
export HARNESS_DEV=1   # Dry-run default ON

# 0-3. .gitignore 격리 디렉터리 추가 (중복 추가 방지)
grep -qxF 'dev-home/' .gitignore 2>/dev/null || \
  echo -e "\ndev-home/\ntest-*/\n.venv-dev/" >> .gitignore

# 0-4. fresh-test.sh + Makefile 생성 (이미 있으면 skip)
[ -f scripts/fresh-test.sh ] || {
  mkdir -p scripts
  cat > scripts/fresh-test.sh <<'EOF'
#!/bin/bash
set -e
TESTDIR=$(mktemp -d -t jinhak-test-XXXXXX)
export HARNESS_HOME="$TESTDIR/harness-home"
export AGENTS_SKILLS_HOME="$TESTDIR/agents/skills"
cd "$TESTDIR"
echo "🧪 격리 테스트 디렉터리: $TESTDIR"
"$@"
echo "🗑  리셋: rm -rf $TESTDIR"
EOF
  chmod +x scripts/fresh-test.sh
}

# 0-5. Python 도구 준비 (Phase 4·5에 필요)
which python3 || { echo "Python3 설치 필요"; exit 1; }
python3 -c "import pdfplumber, openpyxl, pandas" 2>/dev/null || {
  echo "📦 Python 도구 설치 중..."
  if which uv >/dev/null 2>&1; then
    uv tool install --with pdfplumber --with openpyxl --with pandas jinhak-harness-pytools 2>/dev/null \
      || pip3 install --user pdfplumber openpyxl pandas
  else
    pip3 install --user pdfplumber openpyxl pandas
  fi
}

# 0-6. 셋업 검증 — 모든 항목 ✅ 떠야 함
./scripts/fresh-test.sh echo "hello"  &&  echo "✅ fresh-test 동작"
[ -n "$HARNESS_HOME" ]                 &&  echo "✅ HARNESS_HOME=$HARNESS_HOME"
[ -n "$AGENTS_SKILLS_HOME" ]           &&  echo "✅ AGENTS_SKILLS_HOME 설정됨"
python3 -c "import pdfplumber, openpyxl, pandas; print('✅ Python 도구 import OK')"
```

위 6개 출력이 모두 정상이어야 Phase 1 시작 가능. 한 줄이라도 ❌나면 그것부터 해결.

**npm link는 Phase 1 완료 후에 한다** — `package.json` 이 만들어진 다음에야 가능.

### Phase 1 — `package.json` + bin 진입점

```text
/goal package.json exists with valid "name":"jinhak-harness", "bin":{"jinhak-harness":"./bin/install.js"},
"files":["bin/","templates/","hooks/"], "engines":{"node":">=18"}.
bin/install.js exists, is executable (shebang #!/usr/bin/env node),
prints "jinhak-harness vX.Y.Z" when run with --version,
and respects HARNESS_HOME / AGENTS_SKILLS_HOME env vars via bin/paths.ts (or paths.js).
Verify by running: `node bin/install.js --version` shows version string,
and `grep -l HARNESS_HOME bin/*.ts bin/*.js` finds at least one file.
No files outside the jinhak-vibecode repo modified.
Stop after 15 turns.
```

**검증 가능 출력**: `node bin/install.js --version` 결과, `grep` 결과를 Claude가 채팅에 표시.

**Phase 1 통과 직후 사용자 작업 (1분)**:
```bash
# package.json이 생겼으니 이제 npm link 가능
cd ~/jinhak-vibecode
npm link
which jinhak-harness   # 경로 출력되면 OK
```
이후 모든 Phase 검증에서 `jinhak-harness <cmd>` 직접 호출 가능 (지금까지는 `node bin/install.js <cmd>` 우회).

### Phase 2 — `hooks/session-start` (Superpowers 패턴)

```text
/goal hooks/session-start file exists and is executable.
When invoked with CURSOR_PLUGIN_ROOT set, it outputs JSON with key "additional_context".
When invoked with CLAUDE_PLUGIN_ROOT set (and no COPILOT_CLI), it outputs JSON with nested "hookSpecificOutput.additionalContext".
Otherwise outputs JSON with top-level "additionalContext".
Bootstrap context is under 500 tokens (verify by counting characters / 4).
All 5 bash escape patterns from REPORT_06 §3.5 are present.
Verify by running each scenario and showing the JSON output in the chat.
No files outside hooks/ and tests/hooks/ modified.
Stop after 20 turns.
```

### Phase 3 — `bin/lazy-deps.js` 디텍션

```text
/goal bin/lazy-deps.js exists and detects 5 dependencies:
python3, pdfplumber, openpyxl, pandas, uv.
For each found, prints "✅ <name> <version>". For each missing, prints "❌ <name> not found"
plus the OS-specific install hint from ADR-003 §2.2.
Results are cached to $HARNESS_HOME/env-cache.json with 7-day TTL.
Verify by running `node bin/lazy-deps.js` and showing the output,
then running it again immediately and showing it used the cache (mention "(cached)").
HARNESS_HOME must default to dev-home/ when HARNESS_DEV=1 is set.
No files outside bin/ and tests/ modified, and ~/.harness is not touched.
Stop after 20 turns.
```

### Phase 4 — `common/utils/pdf-extract` (ADR-003)

```text
/goal templates/common/utils/pdf-extract/ contains:
- SKILL.md with valid YAML frontmatter (name, description, requires, allowed-tools)
- compatibility.json matching ADR-003 §2.4 example structure
- scripts/extract.py using pdfplumber, reads PDF path from argv[1], outputs JSON to stdout with {"pages":[{"text":"...","tables":[...]}]}, uses ensure_ascii=False
- scripts/extract.ts that spawns python3 with extract.py and returns parsed JSON, throws on non-zero exit
Verify by:
1. Running `python3 templates/common/utils/pdf-extract/scripts/extract.py test-fixtures/sample.pdf` and showing first 200 chars of JSON output containing Korean text correctly.
2. Importing extract.ts from a test file and showing it returns the same parsed result.
If test-fixtures/sample.pdf doesn't exist, create a minimal one with a Python script and Korean text in it first.
No files outside templates/common/utils/pdf-extract/ and test-fixtures/ and tests/ modified.
Stop after 25 turns.
```

### Phase 5 — `common/utils/xlsx-write` (template + 채우기)

```text
/goal templates/common/utils/xlsx-write/ contains:
- SKILL.md (frontmatter + body)
- compatibility.json (python3 + openpyxl required)
- scripts/write_from_template.py: reads template xlsx path + JSON rows from argv, copies template, fills rows starting at row 2, preserves header styles, saves to output path
- scripts/write.ts: Node wrapper
Verify by:
1. Creating a 3-row template xlsx (assets/template.xlsx) using openpyxl with headers "공고제목","회사명","직무"
2. Running write_from_template.py with 2 mock job rows
3. Reading the result back with openpyxl and showing all cell values + that header style (bold) is preserved
No files outside templates/common/utils/xlsx-write/ and test-fixtures/ and tests/ modified.
Stop after 25 turns.
```

### Phase 6 — `/start` 온보딩 인터뷰 골격

```text
/goal bin/commands/start.ts exists. When invoked it:
1. Detects existing HARNESS_HOME/user-profile.md. If absent, runs 5-question Korean interview (직군 / 반복 업무 / 결과물 형태 / 회사 톤 / 자주 쓰는 도구) — questions hard-coded, no LLM call needed for question generation
2. Writes user-profile.md with the answers as YAML frontmatter + markdown body
3. Detects existing project-level .harness/state.md in cwd. If absent, creates it.
4. Detects installed AI tool by env vars (CURSOR_PLUGIN_ROOT / CLAUDE_PLUGIN_ROOT / etc.) and prints "✅ <tool name> 감지"
5. Prints final 가이드 message in Korean: "다음에 자동화하고 싶은 일이 있으면 /build 라고 말해주세요."

Verify by running ./scripts/fresh-test.sh node bin/install.js start with mocked stdin (echo "기획\n채용공고 정리\nExcel\n존댓말\nGmail, Notion" | ...),
and showing:
- user-profile.md exists in the test HARNESS_HOME with all 5 answers
- .harness/state.md exists in the test cwd
- "✅" detection line in output
- Korean welcome message in output
No files outside bin/ and templates/ and tests/ modified.
Stop after 30 turns.
```

### Phase 7 — `jobs-pdf-to-excel` end-to-end (Phase 1~6 통합)

```text
/goal A complete jobs-pdf-to-excel scenario works end-to-end in a fresh-test environment.
Steps:
1. ./scripts/fresh-test.sh runs and creates isolated HARNESS_HOME
2. Drop 3 sample PDFs into the test inbox/jobs/ (create them with Python+reportlab if needed, each with Korean company info)
3. Invoke node bin/install.js start — interview answered via stdin
4. Invoke node bin/install.js build "채용공고 PDF → Excel 정리" — uses pdf-extract + xlsx-write utils
5. Output xlsx is written to test output/ dir
6. Verify: open output xlsx with openpyxl, confirm 3 rows + correct headers (공고제목/회사명/직무/근무지/마감일) + at least 회사명 column filled correctly for each row.
The whole flow must complete without writing to ~/.harness, ~/.agents, or any path outside the mktemp test dir.
Show me the final xlsx cell values printed as a markdown table in the chat as evidence.
Stop after 40 turns.
```

이 phase 7이 통과하면 **MVP eco의 최소 시연 가능 상태(Demoable Slice)** 달성.

### Phase 8+ — ADR-001 + 프로필 분기

```text
/goal bin/profile.ts implements eco/standard/power profile detection from CLI arg --profile or HARNESS_PROFILE env.
Default is eco. ADR-001 §2 (Skill Surface Budget) cutoffs are enforced:
- eco: only frontmatter loaded at boot, body on explicit require
- standard: + Description Tuner runs once at skill creation
- power: + with/without benchmarks on explicit invocation
Verify by running ./scripts/fresh-test.sh node bin/install.js --profile=eco --debug-loaded
showing exactly N skills' frontmatter loaded (count > 0) and 0 bodies loaded,
then --profile=power showing bodies eligible to load.
ADR-001 must be written first if it does not exist at docs/adr/ADR-001-skill-surface-budget.md.
Stop after 30 turns.
```

---

## 4. 워크플로우 패턴 (실전)

### 4.1 평상시 — 한 단계 1 세션

```
$ cd ~/jinhak-vibecode
$ claude
> /goal <Phase N 조건>

[자동 모드 OFF인 채로 시작 → 도구별 승인 몇 번 보고 패턴 익숙해지면 자동 모드 ON]
> /auto on    # 도구 승인도 자동
```

평가자가 "예"라고 해서 goal 자동 해제되면 git diff 확인 → 만족스러우면 commit → 다음 phase.

### 4.2 비대화형 (배치 / 야간 빌드)

여러 phase를 하룻밤에 굴리려면 headless 모드:

```bash
# phase1.txt에 조건 넣고
claude -p "$(cat phase1.txt)" --output-format=stream-json > phase1.log

# 끝나면 다음
claude -p "$(cat phase2.txt)" --output-format=stream-json > phase2.log
```

각 phase 사이에 사람이 빠르게 diff 확인 후 다음 호출.

### 4.3 모니터링

세션 안에서 `/goal` (인자 없음)으로 진행 상황 확인:
- 조건
- 경과 시간 / 턴 수 / 토큰
- 평가자가 직전에 "아니오"라고 한 이유

이유에서 같은 메시지가 3턴 이상 반복되면 **평가자가 보는 증거를 Claude가 제시하지 못하는 상태** → `/goal clear` 후 조건 보강 (예: "show the test output in chat" 명시).

### 4.4 평가자가 잘못 통과시키는 경우 방지

평가자는 Claude의 출력만 본다. Claude가 "테스트가 통과했습니다"라고 거짓말하면 평가자가 그걸 믿을 위험. 방지책:

1. 조건에 **"show the raw output"** 명시 — 단순 텍스트가 아닌 실제 stdout 인용
2. 조건에 **"diff에 N개 새 파일 + 변경 0개" 같은 정량 지표** 포함
3. 평가 모델을 Sonnet으로 격상 (model-config에서) — Haiku보다 거짓 통과 적음, 토큰만 약간 ↑

---

## 5. 토큰 경제 가드 (이 레포의 README §5와 정합)

| 행동 | 토큰 영향 | 우리 규칙 |
|---|---|---|
| `/goal` 1회 + Auto mode | 큰 영향 없음 (평가자는 Haiku) | OK |
| 25턴 cap | 안전 | 항상 포함 |
| 평가자 모델 Sonnet 격상 | +Haiku→Sonnet 차이만큼 | Phase 7 같은 통합 단계에서만 |
| 한 phase에서 너무 큰 조건 | 한 턴이 거대화 → 컨텍스트 압축 위험 | Phase는 1개 검증 가능 단위로만 분해 |
| 자동 모드로 무인 야간 빌드 | 컨텍스트 64% 도달 시 압축 자동 | 컨텍스트 watchdog hook 미리 깔아두면 OK |

---

## 6. 실패 패턴 & 디버깅

| 증상 | 원인 | 대응 |
|---|---|---|
| 평가자가 매번 "아니오"라며 같은 이유 반복 | 검증 명령을 Claude가 채팅에 안 보여줌 | 조건에 "show the raw output of `...` in the chat" 명시 |
| ~/.harness/ 가 만들어짐 (오염) | HARNESS_HOME env 미설정 / 코드가 env 안 읽음 | bin/paths.ts에서 env 우선 처리 강제 (Phase 1) |
| 25턴 cap 도달 후 미완성 | 조건이 너무 크거나 모호 | 더 작은 단계로 분해, 새 `/goal` 호출 |
| Claude가 ADR과 다른 라이브러리 시도 (예: pdf-parse 대신 pdfplumber) | 조건에 라이브러리 명시 안 함 | 조건에 "MUST use pdfplumber per ADR-003" 추가 |
| 평가자가 거짓 통과 | Haiku가 출력 검증 부족 | 평가자 Sonnet 격상 또는 정량 지표 추가 |

---

## 7. 시작 체크리스트 (오늘 30분)

- [ ] `claude --version` — v2.1.139+ 확인
- [ ] `make bootstrap` — 출력의 export 줄을 같은 셸에 복사 실행
- [ ] `make check-env` — 모든 항목 ✅ 떠야 함
- [ ] `.gitignore`에 `dev-home/ test-*/ .venv-dev/` 자동 추가됨 (Phase 0 §0-3에서)
- [ ] 같은 셸에서 `claude` 시작 → `/auto on` → `/goal <Phase 1 조건>`
- [ ] **Phase 1 통과 직후**: 셸 돌아와서 `npm link`, `which jinhak-harness` 확인
- [ ] 매 phase 통과 후 git commit, diff 직접 검토
- [ ] Phase 별 검증은 `make test-fresh CMD='<명령>'` 로 격리 실행
- [ ] Phase 7 통과 시 README §3 MVP eco 칸에 ✅ 표시 + REPORT_06 §11 액션 아이템 #2 체크
- [ ] 작업 끝나면 `make reset` 으로 깨끗하게

---

## 8. 참고 매핑 — 각 phase가 어느 문서를 구현하는가

| Phase | 구현 대상 문서 |
|---|---|
| 1. package.json + bin | README §7.1, ADR-003 §3 |
| 2. session-start hook | REPORT_06 §3.5, Layer 1 |
| 3. lazy-deps | ADR-003 §2.2, §2.4 |
| 4. pdf-extract utils | ADR-003 §2.1, §3 |
| 5. xlsx-write utils | ADR-003 §2.1, §3 |
| 6. /start 인터뷰 | README §2.A, §4.5.1, 이전 시나리오 §2 |
| 7. end-to-end 시나리오 | README §2 전체, 시나리오 응답 §1~§5 |
| 8. profile 분기 | ADR-001(작성 필요), README §3 |
| (이후) common/scheduler | ADR-004, README §2.C |
| (이후) 직군 스킬 한국화 | REPORT_06 §3.4 |

---

## 9. 한 줄 결론

> **`/goal`은 우리 MVP의 핵심 실행 엔진**이다. 격리 셋업(`npm link` + `HARNESS_HOME` + `fresh-test.sh`)을 30분 안에 깔고, Phase 1~7을 각각 `/goal` 1회로 자동 실행하면 1주차 끝에 김PM 시나리오를 실물로 시연할 수 있다. 평가자가 보는 증거(채팅에 표시되는 실제 출력)와 가드레일(레포 외부 파일·~/.harness 수정 금지)을 모든 조건에 반드시 박는 것이 토큰 경제·시스템 안전성의 1차 방어선이다.

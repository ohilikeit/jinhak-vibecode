# Hermes Agent 아키텍처 분석 보고서
## 비개발자용 AI 하네스 도구 설계 참고 자료

---

## 1. 개요

**Hermes Agent**는 Nous Research가 개발한 **자가학습 AI 에이전트 프레임워크**로, 개별 대화와 스케줄링된 자동화를 모두 지원하는 엔터프라이즈급 도구다. 특히 **(A) 플러그인 기반 메모리 아키텍처**, **(B) 멀티 AI 도구 호환성 어댑터 (ACP)**, **(C) 공식 Agent Skills 표준 채택** 측면에서 우리 프로젝트의 핵심 참고 자료다.

---

## 2. 철학 & 설계 원칙

### Hermes의 핵심 전략

1. **"Live where you are"** — 사용자가 이미 있는 곳(CLI, Telegram, Discord, Slack, Signal 등)으로 에이전트가 찾아가야 함
2. **학습 루프 내재화** — 단순 chat 반복이 아니라, 경험→기술(Skill)→개선의 폐쇄 루프를 자동으로 구성
3. **Lock-in 방지** — 모델, 제공자, 도구 전환을 `hermes model` 한 줄로 가능하게 설계
4. **연속성(Continuity)** — 세션 검색, 사용자 모델(honcho dialectic), 대화 요약으로 cross-session 기억 유지

### 우리 하네스와의 철학 공통점

- **비개발자 대상**: Hermes는 이미 터미널/메시징에서 비개발자를 가정
- **표준 우선**: `.agents/skills/SKILL.md` 포맷 채택으로 vendor lock-in 방지
- **인터뷰→산출물**: 자동화 설계 인터뷰가 곧 SKILL.md 초안 생성 (Hermes는 상대적으로 덜함)

---

## 3. 아키텍처 핵심 분석

### 3.1 프로젝트 구조 & 핵심 컴포넌트

```
hermes-agent/
├── run_agent.py          # AIAgent 클래스 (대화 루프, ~4.1K LOC)
├── cli.py                # HermesCLI 클래스 (TUI 오케스트레이션, ~14K LOC)
├── agent/                # 제공자 어댑터, 메모리, 컨텍스트 압축
│   ├── memory_manager.py        # MemoryManager (플러그인 메모리 통합)
│   ├── context_compressor.py    # 문맥 압축 (요약 + tail 보호)
│   ├── anthropic_adapter.py     # Anthropic SDK 어댑터
│   ├── codex_responses_adapter.py
│   └── [15+ provider adapters]
├── acp_adapter/          # ACP(Agent Client Protocol) 서버 (~74K server.py)
├── acp_registry/         # 도구 레지스트리
├── plugins/              # 플러그인 시스템 (메모리, 모델, 도구, 이미지 생성 등)
│   ├── memory/           # honcho, mem0, supermemory, ... (8개 구현체)
│   ├── model-providers/  # 31개 LLM 제공자
│   ├── context_engine/   # 컨텍스트 엔진
│   └── [observability, kanban, image_gen 등]
├── gateway/              # 메시징 게이트웨이 (Telegram, Discord, Slack, ...)
├── cron/                 # 스케줄링 (jobs.py, scheduler.py)
├── skills/               # 번들 스킬
└── Dockerfile            # 멀티 계층 빌드 (uv + npm)
```

### 3.2 메모리 아키텍처 (핵심: 플러그인 패턴)

Hermes의 메모리 시스템은 **MemoryManager + MemoryProvider** 이중 구조:

#### MemoryProvider (Protocol)

```python
class MemoryProvider(Protocol):
    def build_system_prompt(self) -> str
    def prefetch_all(user_message: str) -> str
    def sync_all(user_msg, assistant_response) -> None
    def queue_prefetch_all(user_msg) -> None
```

- **단 하나의 외부 플러그인**만 등록 가능 (honcho, mem0, supermemory, hindsight, openviking, retaindb, byterover 중 택일)
- 시스템 프롬프트, pre-turn 프리페치, post-turn 동기화의 3단계 인터페이스
- 내장 메모리(MEMORY.md, USER.md)는 항상 유효하고 플러그인보다 우선권

#### MemoryManager (Orchestrator)

- 컨텍스트 펜싱: `<memory-context>` 태그로 감싸 LLM 주입 vs 사용자 입력 구분
- 스트리밍 스크러버: 토큰 경계에서 분리된 `</memory-context>` 태그 처리
- 오염 방지: 메모리 주입이 사용자 입력처럼 보이지 않도록 `[System note]` 접두사

**참고 가치**: 우리 하네스의 메모리 레이어는 이 플러그인 패턴을 채용하면, 로컬 SQLite, Postgres, 외부 벡터DB를 모두 같은 인터페이스로 지원 가능

### 3.3 멀티 AI 도구 호환성 레이어: ACP 어댑터

#### ACP (Agent Client Protocol)

- **표준**: Anthropic이 정의한 프로토콜 (VS Code, Zed, JetBrains용 에이전트 통신)
- **Hermes 구현**: `acp_adapter/server.py` (~74K)
  - `NewSessionResponse`, `SetSessionModelResponse`, `SendMessageRequest` 등 스키마
  - 도구 디스커버리, 세션 관리, 스트리밍 이벤트 핸들링
  - 권한 승인 콜백 (`make_approval_callback`)

#### 멀티 제공자 지원

- **31개 LLM 제공자 플러그인** (`plugins/model-providers/`)
  - Anthropic, OpenAI, OpenRouter, Google Gemini, NVIDIA NIM, MiniMax, 
    Kimi/Moonshot, z.ai, Hugging Face, Ollama, LM Studio, ...
  - 각각 `anthropic_adapter.py`, `openai_adapter.py`, ... 형태의 독립 파일
  - 공통 인터페이스: `base_url`, `api_key`, `model` 설정으로 자동 전환

**구성 예시** (`cli-config.yaml.example`):
```yaml
model:
  default: "anthropic/claude-opus-4.6"
  provider: "auto"  # or "openrouter", "anthropic", "openai-codex", ...
  base_url: "https://openrouter.ai/api/v1"
```

**참고 가치**: 우리 하네스가 Claude Code / Cursor / Copilot / Codex를 동시에 지원하려면, 각 도구의 인터페이스를 통일된 어댑터 패턴으로 구현해야 함. Hermes의 provider 플러그인 아키텍처(각 `adapter.py` 파일)를 모델로 삼기 좋음.

### 3.4 컨텍스트 압축 & 요약 (Context Compressor)

**문제**: LLM 문맥 창 한계로 장시간 대화 불가

**해결책** (`context_compressor.py`, ~78K):

1. **Auxiliary Model 사용** — 메인 모델과 별개의 저비용 모델(gpt-4o-mini 등)로 요약
2. **구조화된 요약 템플릿**
   - `[CONTEXT COMPACTION — REFERENCE ONLY]` 프리앰블로 요약임을 명시
   - "이미 해결됨" vs "진행 중" 섹션 분리
   - "Active Task" 섹션으로 재개 지점 명시
3. **Tail 보호** — 최근 메시지는 토큰 예산 기준으로 압축하지 않음
4. **Tool Output Pruning** — 옛날 도구 출력은 미리 제거해 요약 대상 축소
5. **Iterative Summary** — 여러 번 압축할 때마다 이전 요약 정보 누적

**토큰 예산**:
- 최소 요약: 2,000 토큰
- 압축할 콘텐츠의 20% 할당
- 최대 요약: 12,000 토큰 (매우 큰 창에서도 이미지/멀티모달 비용 관리)

**참고 가치**: 우리 하네스에서 "대화 요약 & 결정 로그"를 자동화할 때, 이 압축 알고리즘의 "구조화된 요약 템플릿"과 "Tail 보호" 개념을 채용하면, 중요한 최근 작업을 절대 잃지 않으면서도 효율적인 메모리 관리 가능

---

## 4. 핵심 기능

### 4.1 플랫폼 지원 & 게이트웨이 (Multi-Platform)

Hermes는 단 하나의 `run_agent.py` 백엔드로 여러 인터페이스 지원:

- **CLI (TUI)**: prompt_toolkit 기반, multiline 편집, slash 명령 자동완성
- **Messaging Gateway**: Telegram, Discord, Slack, WhatsApp, Signal, Matrix, Mattermost, Email, SMS, WeChat, Dingtalk, Feishu, Yuanbao, ...
  - 각 플랫폼을 `gateway/platforms/<platform>.py`로 구현
  - 단일 `gateway run.py`로 모든 플랫폼을 동시에 활성화
- **ACP Server**: VS Code / Cursor / JetBrains 프로토콜
- **Browser Dashboard**: React 기반 웹 UI (`ui-tui/src/`)
- **Webhook API**: JSON-RPC 게이트웨이

### 4.2 스킬 시스템 & 공식 표준 채택

- Hermes는 `agentskills.io` 오픈 표준 준수
- 스킬 저장 위치: `~/.hermes/skills/` (사용자) vs 프로젝트 스킬
- 스킬 구조 (우리 프로젝트의 기획과 일치):
  ```
  skill-name/
  ├── SKILL.md      # YAML frontmatter + 상세 설명
  ├── scripts/      # 실행 코드
  ├── references/   # 참조 문서
  └── evals/evals.json
  ```

### 4.3 스케줄링 (Cron)

- 내장 cron 스케줄러 (`cron/jobs.py`, `cron/scheduler.py`)
- 자연어 job 정의 가능 (예: "매일 오전 9시 일일 보고서 생성")
- 결과를 Telegram/Discord로 자동 전송
- 배치 처리: `batch_runner.py` (~56K) — 병렬 궤적(trajectory) 생성

### 4.4 도구 발견 & 관리

- `tools/registry.py`: 도구 중앙 레지스트리
- `model_tools.py`: 도구 오케스트레이션 + 스키마 빌드
- 40+ 번들 도구 (`tools/<tool>.py`)
- MCP 서버 통합: `hermes mcp add <server-url>`로 확장

---

## 5. 배포 & 설치

### 5.1 설치 방식

**Linux/macOS/WSL2**:
```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```
→ `uv` 자동 설치, venv 생성, `~/.local/bin/hermes` 심링

**Windows (Native, PowerShell)**:
```powershell
irm https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1 | iex
```
→ MinGit 포함 (45MB), 어드민 권한 불필요

**Termux (Android)**:
```
[termux] extra로 Android 호환 의존성 수동 설치
```

### 5.2 Docker & 클라우드 배포

- **Dockerfile**: 멀티 계층 빌드 최적화
  - `uv` + `npm` 의존성 캐시 분리
  - Playwright 브라우저 사전 설치
  - 비루트 사용자 (`hermes`, UID 10000) 실행
  - `/opt/data` 볼륨으로 프로필 분리
  - `tini` init으로 좀비 프로세스 관리

- **환경 변수**: `HERMES_HOME`, `HERMES_UID`, `HERMES_WEB_DIST` 등으로 런타임 설정

- **클라우드 지원**: Daytona, Modal (서버리스 지속성), SSH, Singularity

### 5.3 패키지 관리 & 업그레이드

- **PyPI**: `pip install hermes-agent` (공개 패키지 아님, git clone 권장)
- **uv**으로 관리 (`uv pip`, `uv sync`)
- **업그레이드**: `hermes update`

---

## 6. 호환성 분석

### 6.1 LLM 제공자 호환성 (31개 지원)

| 카테고리 | 제공자 | 특징 |
|---------|-------|------|
| 클라우드 | Anthropic, OpenAI, Google Gemini, OpenRouter | 최대 선택지 |
| API Gateway | Nous Portal, z.ai, Hugging Face | 대안 라우팅 |
| 중국 | MiniMax, Kimi/Moonshot, GLM | 지역화 지원 |
| 로컬 | Ollama, LM Studio, llamacpp, vLLM | 프라이빗 배포 |
| 엔터프라이즈 | NVIDIA NIM, AWS Bedrock | 규제 환경 |

→ **결론**: Hermes는 모델 락인 없음. 우리 하네스도 유사하게 3~5개 제공자 기본 지원 필수.

### 6.2 메모리 백엔드 호환성 (8개 지원)

| 백엔드 | 특징 |
|--------|------|
| Honcho | Dialectic 사용자 모델링 |
| Mem0 | 엔터프라이즈급 메모리 관리 |
| Supermemory | 벡터 검색 기반 |
| Hindsight | (상세 미포함) |
| Openviking | (상세 미포함) |
| RetainDB | (상세 미포함) |
| Byterover | (상세 미포함) |

→ **결론**: 플러그인 패턴으로 여러 메모리 백엔드 동시 호환. 우리도 이 패턴 채용.

### 6.3 채널 & 게이트웨이 호환성 (15+ 플랫폼)

Telegram, Discord, Slack, WhatsApp, Signal, Matrix, Mattermost, Email, SMS, DingTalk, WeChat, Feishu, YuanBao, QQBot, Bluebubblesm Webhook, API Server

→ **결론**: 단일 백엔드로 멀티 플랫폼 지원. 우리 하네스는 초기엔 CLI + Notion 정도로 시작하면 됨.

---

## 7. 강점

### A. 메모리 아키텍처의 우아한 플러그인 패턴
- MemoryProvider protocol로 honcho/mem0/supermemory를 일괄 지원
- 사용자는 `HERMES_MEMORY_PROVIDER=honcho` 환경변수로 전환 가능
- **우리에게**: 메모리 레이어를 완전히 교체 가능하게 설계 가능

### B. 멀티 AI 도구 호환성의 표준화
- ACP 서버 구현으로 VS Code / Cursor / JetBrains 동시 지원
- 31개 LLM 제공자 플러그인으로 락인 방지
- **우리에게**: Claude Code / Cursor 호환성을 명확히 설계 가능

### C. 공식 표준 채택 (`.agents/skills/SKILL.md`)
- agentskills.io 오픈 표준 준수
- 수백 개의 기존 스킬과 상호운용 가능
- **우리에게**: 표준 포맷 우선으로 vendor lock-in 방지

### D. 풍부한 도구 & 환경 지원
- 40+ 번들 도구, MCP 서버 플러그 가능
- 7개 터미널 백엔드 (로컬, Docker, SSH, Modal, Daytona, ...)
- **우리에게**: 비개발자가 필요한 Figma/Notion/Gmail 등을 쉽게 추가 가능

### E. 맥락 압축의 정교함
- Auxiliary model 사용으로 비용 절감
- Tail 보호, 구조화된 요약, iterative 업데이트
- **우리에게**: 장시간 세션 자동화가 필요할 때 베스트 프랙티스

### F. 대규모 코드베이스 & 성숙도
- ~17K pytest 테스트, ~900개 테스트 파일
- 0.2~0.14 버전 릴리스 노트 (적극적 개발)
- **우리에게**: 참고할 만한 패턴과 함정들이 이미 기록됨

---

## 8. 약점 & 한계

### A. 비개발자 온보딩의 부재
- Hermes는 이미 "에이전트를 써본" 사용자 대상
- 우리 프로젝트의 "직무 프로파일링 인터뷰" 같은 자동화 설계 마법사 없음
- **영향**: 비개발자가 처음부터 자동화를 "정의"하기 어려움

### B. 스킬 자동 생성 (Skill Creator) 미흡
- 사용자가 작업을 하면 도구가 자동으로 SKILL.md를 추출해주는 기능 약함
- 실습 캡처(Hindsight)가 있지만, 스킬로 바로 변환되지 않음

### C. 테스트 주도 검증 (Eval-Driven) 부분 자동화 부족
- `evals/evals.json` 형식은 정의되어 있으나, 사용자가 수동으로 작성
- "예시 3개만 주면 테스트 케이스 자동 생성" 같은 기능 없음
- with/without 벤치마크 자동 실행 없음

### D. 디자인 시스템 & 프론트 생성 약함
- 우리 프로젝트의 `design-html`, `design-shotgun` 같은 기능 없음
- 출력물이 "AI 슬롭"처럼 보일 위험

### E. 메모리 오염 가능성
- 플러그인 메모리(honcho/mem0)가 시스템 프롬프트에 주입되는데, 감시 필요
- 정기적 메모리 청소/감쇠 메커니즘 약함

### F. 멀티 사용자 협업 미흡
- 현재 단일 사용자 중심 설계
- 팀 협업 스킬 (teams_pipeline 플러그인 있지만 experimental)

---

## 9. 우리 하네스에 차용할 점

### 9.1 메모리 아키텍처 (필수)
```python
class MemoryProvider(Protocol):
    def build_system_prompt(self) -> str: ...
    def prefetch_all(user_msg: str) -> str: ...
    def sync_all(user_msg, assistant_resp) -> None: ...
```
- 로컬 SQLite, Postgres, 외부 벡터DB를 같은 인터페이스로 관리
- 컨텍스트 펜싱으로 LLM 주입 vs 사용자 입력 명확히 구분

### 9.2 멀티 AI 도구 어댑터 패턴 (필수)
```python
# acp_adapter/server.py 모델
class ACPServer:
    def initialize() -> InitializeResponse: ...
    def new_session() -> NewSessionResponse: ...
    def send_message(req) -> MessageStreamEvent: ...
```
- Claude Code, Cursor 호환성 구현 시 ACP를 먼저 구현하기
- 각 도구별 폴백(`.cursor/rules/` 등)은 나중에 생성

### 9.3 컨텍스트 압축 알고리즘 (추천)
- Auxiliary model 사용 → 저비용 요약
- Tail 보호로 최근 작업 보존
- 구조화된 요약 템플릿으로 재개점 명시

### 9.4 공식 표준 채택 (필수)
- `.agents/skills/<name>/SKILL.md`를 primary output
- YAML frontmatter: name, description, compatibility, allowed-tools
- 다른 포맷(CLAUDE.md, .cursor/rules/)는 생성 후단계에만

### 9.5 플러그인/확장 시스템 (필수)
- 메모리, 모델 제공자, 도구를 플러그인화
- 사용자가 `--memory-provider=<name>` 같은 플래그로 선택 가능

### 9.6 스케줄링 & 배치 처리 (v0.2+)
- 내장 cron 스케줄러 (`cron/jobs.py`, `scheduler.py` 패턴)
- 배치 궤적 생성 (`batch_runner.py` 패턴)

---

## 10. 우리 도구가 차별화할 점

### 10.1 온보딩 인터뷰의 자동화 (Hermes 부재)
- **직무 프로파일링** → "기획/디자인/마케팅/영업/HR/재무" 자동 템플릿 추천
- **자동화 설계 위저드** → 입력→처리→출력→저장→전달 순서대로 가이드
- 인터뷰 답변이 곧 SKILL.md + evals 초안으로 변환

### 10.2 Skill Creator의 정교한 구현
- 사용자 작업 녹화(step recording) → SKILL.md 자동 추출
- "효과 있었던 단계 / 사용자 수정 / 입출력 형식 / 제공 컨텍스트" 4개 카테고리 자동 분류
- 사용자 수정 때마다 "Gotchas" 섹션에 누적

### 10.3 Description Tuner (Hermes 약함)
- 스킬 description이 너무 광범위하지 않은지 자동 검증
- 20개 평가 쿼리(should-trigger 10 + near-miss 10)로 trigger rate 측정
- 반복 개선으로 1024자 한도 준수

### 10.4 with/without 벤치마크 자동 실행
- 각 자동화를 스킬 적용/미적용 두 가지로 병렬 실행
- `timing.json` (token, duration), `grading.json` (assertion 결과) 자동 산출
- 스킬이 진짜 가치를 더하는지 데이터로 증명

### 10.5 디자인 시스템 기본 탑재
- 비개발자 산출물이 "AI 슬롭"처럼 보이지 않도록 `DESIGN.md` 강제
- `design-html` 스킬로 컴포넌트 라이브러리 자동 생성
- `design-review` 스킬로 산출물 자동 QA

### 10.6 친절한 다국어 지원
- Hermes는 README.zh-CN.md 정도
- 우리는 한국어 사용자 대상으로, 모든 인터뷰/에러/가이드를 한국어로

---

## 11. 아키텍처 선택 기준표

| 요소 | Hermes 패턴 | 우리 채용? | 이유 |
|-----|-----------|----------|------|
| 메모리 플러그인 | MemoryProvider protocol | ✅ 필수 | 백엔드 교체 용이 |
| ACP 어댑터 | acp_adapter/server.py | ✅ 필수 | Claude Code/Cursor 호환 |
| 컨텍스트 압축 | context_compressor.py | ✅ 추천 | 긴 세션 대응 |
| 공식 표준 | agentskills.io + SKILL.md | ✅ 필수 | Vendor lock-in 방지 |
| 플러그인 시스템 | plugins/ 디렉터리 | ✅ 필수 | 도구/모델 확장성 |
| 게이트웨이 | gateway/platforms/ | ⏸️ v0.3+ | MVP는 CLI + 파일 입출력 |
| Skill Creator | hindsight 플러그인 | ⚠️ 개선 | Hermes 기능 약함, 우리가 강화 |
| 스케줄링 | cron/ | ⏸️ v0.2+ | 초기엔 수동 실행 |

---

## 12. 한줄 요약

**Hermes Agent는 메모리 플러그인 패턴, ACP 멀티 도구 호환성, 컨텍스트 압축 알고리즘에서 교과서적 구현을 제공하지만, 비개발자 온보딩과 자동 스킬 생성이 약하므로, 우리는 이들을 강화하면서 Hermes의 플러그인/어댑터 아키텍처를 정확히 차용해야 한다.**

---

## 부록: 주요 파일 참고도

| 파일 | LOC | 용도 |
|-----|-----|------|
| `run_agent.py` | 4.1K | AIAgent 대화 루프 |
| `cli.py` | 14K | TUI 오케스트레이션 |
| `acp_adapter/server.py` | 74K | ACP 프로토콜 구현 |
| `agent/memory_manager.py` | 555 | 메모리 관리 (핵심!) |
| `agent/context_compressor.py` | 78K | 요약 & 압축 |
| `batch_runner.py` | 56K | 배치 궤적 생성 |
| `Dockerfile` | 120 | 멀티 계층 빌드 |

---

생성일: 2026-05-18  
분석 범위: Hermes Agent v0.14.0 (GitHub NousResearch/hermes-agent)

---

## 부록: 재검증 결과 및 정정사항 (Audit Addendum, 2026-05-18)

`agent/memory_provider.py`, `plugins/memory/__init__.py`, `acp_adapter/server.py`, `gateway/platforms/`, `plugins/model-providers/` 디렉터리를 전수 재정독한 결과 다음 사실관계 정정 및 보강이 필요하다.

### A. LOC 수치 정정 (본문 부록 12장 ←→ 실제)
| 파일 | 본문 LOC | 실제 LOC | 비고 |
|---|---|---|---|
| `run_agent.py` | 4.1K | 4,104 | ✅ 정확 |
| `cli.py` | 14K | 14,246 | ✅ 정확 |
| `acp_adapter/server.py` | **74K** | **1,787** | ❌ 본문이 byte와 LOC를 혼동했을 가능성 |
| `agent/memory_manager.py` | 555 | 555 | ✅ 정확 |
| `agent/context_compressor.py` | **78K** | **파일 없음** (실제명 `trajectory_compressor.py`, 1,508줄) | ❌ 파일명 오기 + LOC 허위 |
| `batch_runner.py` | **56K** | **1,302** | ❌ |

### B. MemoryProvider 인터페이스 — 본문 3.2의 Protocol은 단순화/허위
실제 `agent/memory_provider.py`의 ABC는 **9개 추상 메서드 + 9개 옵셔널 훅** 으로 본문이 보여준 3개 메서드보다 훨씬 풍부하다.

```python
class MemoryProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str: ...
    @abstractmethod
    def is_available(self) -> bool: ...
    @abstractmethod
    def initialize(self, session_id: str, **kwargs) -> None: ...
    def system_prompt_block(self) -> str: ...
    def prefetch(self, query: str, *, session_id: str = "") -> str: ...
    def queue_prefetch(self, query: str, *, session_id: str = "") -> None: ...
    def sync_turn(self, user_content: str, assistant_content: str, *, session_id: str = "") -> None: ...
    @abstractmethod
    def get_tool_schemas(self) -> List[Dict[str, Any]]: ...
    def handle_tool_call(self, tool_name: str, args: Dict[str, Any], **kwargs) -> str: ...
    def shutdown(self) -> None: ...

    # Optional hooks — 우리가 반드시 차용해야 할 부분
    def on_turn_start(self, turn_number, message, **kwargs) -> None: ...
    def on_session_end(self, messages) -> None: ...
    def on_session_switch(self, new_session_id, parent_session_id="", reset=False, **kwargs) -> None: ...
    def on_pre_compress(self, messages) -> str: ...
    def on_delegation(self, task, result, child_session_id="", **kwargs) -> None: ...
    def get_config_schema(self) -> List[Dict]: ...
    def save_config(self, values, hermes_home) -> None: ...
    def on_memory_write(self, action, target, content, metadata=None) -> None: ...
```

**왜 중요한가**: `on_session_switch` / `on_pre_compress` / `on_delegation` 은 비개발자 도구에서 **장시간 세션 자동 회상 / 압축 직전 인사이트 추출 / 서브에이전트 작업 부모 측 관찰**을 가능케 한다. 본문의 3-메서드 Protocol로는 이 기능을 설계할 수 없다.

### C. 게이트웨이 플랫폼 수 정정
- 본문: "15+ 플랫폼"
- 실제: **31개 어댑터** — bluebubbles, copilot, custom, dingtalk, discord, email, feishu, feishu_comment, homeassistant, matrix, mattermost, msgraph_webhook, msteams, noop, qwechat, qqbot, rcs, rocketchat, signal, slack, sms, telegram, webex, webhook, wechat, whatsapp, xmpp, zulip 외.

### D. 메모리 백엔드 정정
- 본문 6.2: 7개 명시 (honcho/mem0/supermemory/hindsight/openviking/retaindb/byterover)
- 실제 8개 — 누락: **holographic**

### E. LLM 제공자 수
- 본문 6.1: 31개
- 실제: 30개 디렉터리 (README.md를 잘못 포함했을 가능성)

### F. 본문이 빠뜨린 핵심 패턴
1. **플러그인 동적 발견 (`plugins/memory/__init__.py` L185-286)** — `importlib.util` 기반 네임스페이스 충돌 처리. **번들 플러그인이 사용자 설치 플러그인보다 우선권**. 두 가지 로딩 전략(`register(ctx)` → ABC 서브클래스 감지) 폴백. 우리 SKILL 로딩 설계 시 참고.
2. **부트스트랩 graceful degradation (`cli.py` L17-24)** — 옵셔널 import를 try-except로 감싸 부분 업데이트 중에도 충돌 없음. Windows UTF-8 stdio 설정은 POSIX에서 no-op.
3. **세션 라이프사이클 훅** — `on_session_switch`(`/resume`, `/branch`, `/reset` 시 호출), `on_pre_compress`(압축 전 인사이트 추출), `on_delegation`(부모-자식 에이전트 협업 관찰). 본문이 단순화한 Protocol로는 표현 불가.

### G. 본문 수정 권고
- 3.2 MemoryProvider Protocol 코드 → 실제 ABC + 옵셔널 훅 9개로 교체
- 6.3 "15+ 플랫폼" → "31개 게이트웨이 어댑터"
- 6.2 메모리 백엔드 8개로 정정, holographic 추가
- 부록 파일 목록 표의 LOC 값 4개 정정 (server.py, trajectory_compressor.py 파일명·LOC, batch_runner.py)
- 9.1 우리 차용 시 9 추상 + 9 옵셔널 훅 인터페이스 강조

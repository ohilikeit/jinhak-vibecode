# 종합 보고서: 비개발자용 AI 하네스 도구 설계 청사진
## 5개 레퍼런스 프로젝트 분석 기반 통합 인사이트 (v2 — 재검증·토큰 경제 반영)

**작성일**: 2026-05-18
**기반 분석 대상**:
1. [REPORT_01] Andrej Karpathy Skills — 행동 지침 미니멀 번들
2. [REPORT_02] Get Shit Done (GSD) — 스펙 주도·멀티 런타임 npm 하네스
3. [REPORT_03] Hermes Agent — 플러그인 메모리·ACP 어댑터의 교과서
4. [REPORT_04] Knowledge Work Plugins — Anthropic 공식 직군 카탈로그
5. [REPORT_05] Superpowers — 환경변수 감지·멀티 AI 호환의 정점

> **v2 변경 사항**: 5개 보고서 재검증으로 발견한 수치/인터페이스 정정을 본문에 직접 반영. "검증을 기본값으로" 원칙을 토큰 경제 관점에서 **Eco-First**로 재정렬. 핵심 의사결정 매트릭스 8개 모두 확정.

---

## 1. 한 줄 요약 (Executive Summary)

> **5개 레퍼런스 중 어느 하나도 우리 목표를 단독 충족하지 못한다.**
> Karpathy는 "왜 LLM이 망치는가"의 사고 프레임,
> GSD는 스펙→실행→검증의 워크플로우 엔진,
> Hermes는 메모리·멀티 어댑터의 아키텍처,
> Knowledge Work Plugins는 직군별 도메인 카탈로그,
> Superpowers는 진정한 멀티 AI 호환·훅 자동화의 기술 패턴을 각각 제공한다.
> **우리 하네스 = (KW Plugins의 직군 카탈로그) × (Superpowers의 멀티 도구 호환 훅) × (GSD의 프로필 설치 + Skill Surface Budget) × (Hermes의 메모리 플러그인 9+9 훅) × (Karpathy의 명확한 4원칙 + `alwaysApply` 시맨틱) + 비개발자 온보딩 인터뷰·Skill Creator·Eval·디자인 시스템·토큰 경제 Eco 모드 (우리 고유 차별화)**

---

## 2. 비교 매트릭스 (5개 프로젝트 한눈에, 재검증 수치 반영)

| 차원 | Karpathy | GSD | Hermes | KW Plugins | Superpowers | 우리 목표 |
|---|---|---|---|---|---|---|
| **1차 대상** | 개발자 | 개발자 | 개발자/파워유저 | **비개발자(직군)** | 개발자 | **비개발자(직군)** |
| **배포 형태** | Plugin/마크다운 + `.cursor/rules` | npm CLI(`npx`) | curl 스크립트/Docker | Plugin 마켓 | 멀티 플러그인 manifest | **npm + plugin 마켓 + 단일 설치 명령** |
| **출력 단위** | CLAUDE.md + SKILL.md(미니멀) | SKILL+에이전트+훅 | SKILL+plugins | plugin(skills+commands+mcp) | SKILL(14개) | **`.agents/skills/<name>/` 표준 번들** |
| **공식 SKILL.md 표준** | 부분 (minimal frontmatter) | ✅ | ✅ | ✅ | ✅ | **✅ 1급 시민** |
| **워크플로/커맨드 수** | 4원칙 | **67 commands** + 33 agents | — | — | 14 skills | — |
| **멀티 AI 호환** | Claude+Cursor (`alwaysApply: true`) | **15개 런타임** | ACP+30 provider | Cowork+Claude | 5개 플랫폼 환경감지 | **5개+ (Claude/Cursor/Codex/Copilot/Gemini)** |
| **온보딩 인터뷰** | ❌ | 6단계(가파름) + gsd-user-profiler | ❌ | 직군 선택만 | 훅 자동 주입 | **✅ 5분 대화형 마법사 + 8 행동 차원 프로파일링** |
| **메모리 시스템** | ❌ | `.planning/state.md` | ✅ 9 추상 + 9 옵셔널 훅 ABC, **8개 백엔드** | settings.local | ❌ | **✅ Hermes ABC 그대로 차용** |
| **도메인(직군) 스킬** | ❌ | ❌ | ❌ | **17개 빌트인 (small-business 31 skills 포함)** | ❌ | **✅ 6~8개 직군 사전 번들 (한국화)** |
| **외부 도구 통합** | ❌ | 부분 | MCP+**31개 게이트웨이** | MCP+카테고리 추상화 | ❌(zero-dep) | **MCP + `~~CRM`식 카테고리** |
| **자동 평가/evals** | ❌ | TDD 게이트 + Nyquist auditor | evals 폴더만 | ❌ | TDD 메타스킬(압박 테스트) | **✅ Description Tuner + 압박 테스트 두 트랙 (옵트인)** |
| **디자인 시스템** | ❌ | ❌ | ❌ | Design 직군만 | ❌ | **✅ DESIGN.md + design-html/review** |
| **Skill Creator** | ❌ | 일부(scratch) | hindsight(약함) | ❌ | writing-skills(개발자용) | **✅ 세션 종료 시 요약 1회** |
| **신뢰 게이팅** | ❌ | `allowed-tools` 사전승인 | 권한 콜백 | ❌ | 하드 게이트 | **✅ allowed-tools + 첫 사용 확인** |
| **토큰 경제 의식** | ❌ | 프로필 설치 (skill surface budget) | aux 모델 압축 | ❌ | zero-dep, 1회 부트스트랩 | **✅ Eco-First 프로필 기본** |
| **다국어/한국어** | 영/중 | **영/포/중/일/한 5개국어 README** | 영/일부중 | 영 | 영 | **✅ 한국어 1차** |

**Key Insight**: 비교표에서 **모든 칸을 ✅로 채울 수 있는 도구가 우리뿐**이라는 점이 시장 기회다.

---

## 3. 5개 프로젝트에서 차용할 핵심 패턴 (Best-of-Breed, 재검증 후)

### 3.1 [Karpathy] — 명확한 문제 정의 → 4대 원칙 + `alwaysApply` 시맨틱
**채택**:
- 모든 SKILL.md 본문 헤더에 "이 도구가 막아주는 안티패턴 1줄" 명시
- 비개발자판 안티패턴: ① 도메인 정보 흘리지 않음 ② 출력 형식 모호 ③ 회사 정책 미반영 ④ 결과 검증 안 함
- **`alwaysApply: true` 시맨틱 1급 도입**: Cursor의 `.cursor/rules/*.mdc`처럼 사용자 호출 없이 자동 강제되는 정책 레이어를 우리 SKILL.md frontmatter 또는 settings.local.json에 도입
- **단일 진실 소스 → 다중 채널 자동 생성**: Karpathy는 CLAUDE.md / .cursor/rules / SKILL.md 3파일을 수기 sync해야 함. 우리는 단일 SOT 템플릿에서 5개 플랫폼 출력 자동 생성

### 3.2 [GSD] — 프로필 기반 설치 + Skill Surface Budget + user-profiler
**채택**:
```bash
npx jinhak-harness@latest                     # 기본 = eco
npx jinhak-harness@latest --profile=standard  # 검증/벤치 옵트인
npx jinhak-harness@latest --profile=power     # 모든 자동 검증 ON
```
- **ADR-0011 Skill Surface Budget 패턴**: Phase 1(install profile) + Phase 2(runtime cluster toggle `gsd:surface`). 우리는 ADR-001로 그대로 포팅.
- **gsd-user-profiler 패턴**: 100~150개 세션 메시지를 recency-weighted/project-proportional 샘플링 → **8개 행동 차원** (verbosity / domain / speed / error tolerance / collaboration style / documentation preference / tool familiarity / verification rigor)을 신뢰도 점수화. 비개발자 한국 버전으로 포팅.
- **`.planning/state.md` 패턴** → 우리는 `.harness/state.md` (사용자가 절대 직접 편집 안 함)
- **36개 템플릿 모델**: marketing-brief / hr-proposal / finance-report 등 직군별 1:1 매핑
- **Nyquist auditor**: 3개 예시 입력 → `grading.json` + `benchmark.json`. "예시 3개 주기" 인터뷰로 위장
- **다국어 README ko-KR 구조 그대로 차용**

### 3.3 [Hermes] — 사용자 facade 4개 + 내부 9+9 훅 ABC (v2 Codex 리뷰 반영)

**사용자/SKILL에게 노출되는 facade** (4개 메서드만):
```ts
memory.saveDecision(key, value)
memory.recallProject()
memory.summarizeSession()
memory.forget(key)
```

facade 뒤에 Hermes의 실제 9 추상 + 9 옵셔널 훅 ABC를 internal로 둔다. SQLite 기본 사용자는 9+9 ABC를 마주칠 일이 없고, 향후 Postgres/벡터DB 백엔드가 필요해질 때만 ABC가 드러난다. spec/문서에는 facade를 1차로 명시하고 ABC는 v0.3+ "고급 통합" 섹션으로 강등.

**내부 ABC (v0.3+ 또는 사내 통합 시에만 등장)**:

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
    def sync_turn(self, user_content, assistant_content, *, session_id="") -> None: ...
    @abstractmethod
    def get_tool_schemas(self) -> List[Dict]: ...
    def handle_tool_call(self, tool_name, args, **kwargs) -> str: ...
    def shutdown(self) -> None: ...

    # 옵셔널 훅 (비개발자 장시간 세션에 결정적)
    def on_turn_start(self, turn_number, message, **kwargs) -> None: ...
    def on_session_end(self, messages) -> None: ...  # ← Skill Creator 요약 트리거
    def on_session_switch(self, new_session_id, parent_session_id="", reset=False, **kwargs) -> None: ...
    def on_pre_compress(self, messages) -> str: ...  # ← 압축 직전 인사이트 추출
    def on_delegation(self, task, result, child_session_id="", **kwargs) -> None: ...
    def get_config_schema(self) -> List[Dict]: ...
    def save_config(self, values, hermes_home) -> None: ...
    def on_memory_write(self, action, target, content, metadata=None) -> None: ...
```

- **메모리 백엔드 8개**: honcho / mem0 / supermemory / hindsight / openviking / retaindb / byterover / **holographic**
- **컨텍스트 압축 알고리즘** (Auxiliary model + Tail 보호) → 긴 세션 대응, **default ON**
- **ACP 어댑터를 1차로 구현**하면 VS Code/Cursor/JetBrains 동시 지원
- **`<memory-context>` XML 펜싱 + `[System note]` 접두사**로 오염 방지
- **플러그인 동적 발견 (`importlib.util` 네임스페이스 충돌 처리)** — 번들 플러그인이 사용자 설치 플러그인보다 우선
- **31개 게이트웨이 어댑터** 아키텍처 (slack/discord/telegram/teams/email 등) — v0.3+ 옵션

> **2026-05-19 추가 조사 결과 — Hermes scheduler.py(1837줄) / batch_runner.py / delegate_tool.py(2228줄)는 차용하지 않는다.**
> 비개발자 하네스에 production-grade cron 데몬·multiprocessing pool·child agent 런타임은 과잉.
> Claude Code `CronCreate`/`Task`/`run_in_background` + OS cron/launchd/schtasks가 이미 처리한다.
> 우리는 한국어 자연어→cron 변환 ~200줄 shim만 갖는다. 상세: [ADR-004](docs/adr/ADR-004-scheduler-and-background.md).

### 3.3-bis [Hermes-tools] — 3계층 분리 + lazy_deps + `tools/` 70+ 레지스트리 (v2 보강)

5개 레퍼런스 중 **유일하게 "재사용 가능한 유틸 스크립트 레이어"를 명시적으로 분리**한 사례. 우리 `common/utils/` 레이어의 직접 모델.

- **3계층 분리**: `tools/`(70+ 저수준 도구) + `plugins/`(메모리·컨텍스트 등 코어 재사용) + `skills/`(사용자 향한 번들). 우리도 직군 스킬과 유틸리티를 분리한다.
- **`lazy_deps.py` 패턴**: 백엔드 의존성(anthropic, firecrawl, pdfplumber, openpyxl 등)을 **첫 사용 시점에 venv-scoped로 설치**, allowlist 기반. 부트스트랩 비대화 방지.
- **`tools/registry.py`**: 도구 발견 + 권한 검증을 1곳에서. 우리 `bin/utils-registry.ts` 가 동일 역할 (compatibility 캐싱 포함).
- **실 PDF/문서 처리 스크립트**:
  - `skills/productivity/ocr-and-documents/scripts/extract_pymupdf.py` (pymupdf, 경량 ~25MB)
  - `skills/productivity/ocr-and-documents/scripts/extract_marker.py` (marker-pdf, OCR+레이아웃, 옵셔널)
- **차용 결정**: 라이브러리 선정은 우리 환경(비개발자·한글·표 추출 빈도)에 맞춰 **pdfplumber + openpyxl로 변경**, 패턴(lazy 디텍션 + Node↔Python spawn+JSON)은 그대로.

### 3.4 [Knowledge Work Plugins] — 17개 직군 카탈로그 + 카테고리 도구 추상화
**채택**: 우리 v0.2~0.3 "직군별 스타터 팩"의 청사진. KW Plugins의 **실제 17개 빌트인**을 기준으로 한국 시장 우선순위 재배치:

```
.agents/skills/
├── planning/         # 기획 (보고서, 요구사항 추출, 경쟁사 분석)
├── marketing/        # 마케팅 (카피 변형, 채널 맞춤, A/B) - KW 8 skills 참고
├── sales/            # 영업 (리드 스코어링, 제안서, follow-up) - KW 9 skills 참고
├── hr/               # 인사 (JD, 면접, 평가) - KW 9 skills 참고
├── finance/          # 재무 (분개, 분석, 변동) - KW 8 skills 참고
├── design/           # 디자인 (시안, 핸드오프) - KW 7 skills 참고
├── customer-support/ # CS (티켓 분류, 응답)
├── productivity/     # 공통 (일정, 회의록)
├── small-business/   # SMB 패키지 (한국 SMB 시장에 직결, KW 31 skills 모델)
└── operations/       # 운영 (KW 9 skills 참고)
```
- **개념 정정**: KW Plugins의 슬래시 "Commands"는 실제로는 **auto-trigger Skills** (자연어 키워드 감지). 명시적 슬래시 커맨드는 product-management 1개뿐. 우리도 auto-trigger를 1차로 채택.
- **`~~CRM`, `~~email`, `~~chat` 카테고리 플레이스홀더** → CONNECTORS.md에서 실제 SaaS 매핑. KW가 일부 플러그인만 적용한 약점은 **우리는 모든 직군에 강제**.
- **`settings.local.json`으로 회사 톤·정책·조직도 1회 주입**
- **`user-invocable` 필드 활용한 RBAC 1급 도입** (KW는 필드만 존재, 사용은 거의 없음 → 우리가 활용)

### 3.4-bis [KW-bio-research] — Tier-fallback 추출 전략 + 스키마 검증 패턴

17개 occupation 중 **bio-research 1곳만** 진짜 PDF/Excel 처리 스크립트를 갖춤. 그 구조를 직군 공통 utils로 끌어올린다.

- **참고 파일**:
  - `bio-research/skills/instrument-data-to-allotrope/scripts/convert_to_asm.py` (543줄) — PDF/CSV/Excel → JSON 변환, allotropy 기반 멀티 포맷
  - `flatten_asm.py` (254줄) — JSON → 2D CSV (Excel import ready)
  - `validate_asm.py` (1102줄) — 스키마 기반 검증
- **차용 패턴**:
  1. **Multi-tier 추출**: Tier 1 native parser → Tier 2 fallback → Tier 3 PDF extraction. 우리 `pdf-extract/compatibility.json`의 tier 구조 그대로.
  2. **JSON 중간 표현 강제**: 모든 추출 결과를 일단 JSON으로 정규화 후 출력 포맷(Excel) 변환. Node↔Python 경계와 자연스럽게 일치.
  3. **스키마 검증 분리**: 추출과 검증을 별도 스크립트로 분리 → 직군 스킬은 검증만 호출 가능.
- **KW의 약점**: bio-research 한 곳에만 존재, 다른 16개 occupation엔 없음 → **우리는 직군 공통화하면 KW를 넘어선다.**

### 3.5 [Superpowers] — 환경변수 감지 훅 + 멀티 manifest + 압박 테스트
**채택**: 멀티 AI 호환의 **유일한 검증된 패턴**:

```bash
# hooks/session-start — 실제 5종 escape 패턴
s="${s//\\/\\\\}"
s="${s//\"/\\\"}"
s="${s//$'\n'/\\n}"
s="${s//$'\r'/\\r}"
s="${s//$'\t'/\\t}"

# 플랫폼별 JSON 스키마 3종 분기
if [ -n "$CURSOR_PLUGIN_ROOT" ]; then
  printf '{"additional_context": "%s"}' "$s"     # snake_case
elif [ -n "$CLAUDE_PLUGIN_ROOT" ] && [ -z "$COPILOT_CLI" ]; then
  printf '{"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "%s"}}' "$s"  # nested
else
  printf '{"additionalContext": "%s"}' "$s"      # SDK 표준
fi
```

- 디렉터리 구조:
```
harness/
├── .agents/skills/<name>/SKILL.md  # 공식 표준 (1급)
├── hooks/session-start             # 플랫폼 감지
├── .claude-plugin/plugin.json
├── .cursor-plugin/plugin.json
├── .codex-plugin/plugin.json
├── gemini-extension.json
└── .opencode/INSTALL.md
```
- **압박 테스트 워크플로**: (1) 스킬 미적용 서브에이전트 베이스라인(RED) → (2) 스킬 적용 후 동일 입력 재실행(GREEN) → (3) 차이를 SKILL.md `## Gotchas` 섹션에 자동 누적. 우리 Skill Creator 메타 스킬의 골격. **단, `power` 프로필에서만**.
- **"human partner" 용어**: 한국어판에서 "사용자" 대신 "사용자분/팀원" 등 호칭 검토.

---

## 4. 우리 도구의 차별화 포인트 (5개 프로젝트가 모두 못 한 것)

| # | 차별화 항목 | 5개 프로젝트의 부재 이유 | 구현 전략 |
|---|---|---|---|
| **1** | **비개발자 직군 프로파일링 인터뷰** | 모두 개발자/파워유저 가정 | `AskUserQuestion` 기반 5분 마법사 + GSD user-profiler의 8 차원 한국 비개발자 버전 |
| **2** | **Skill Creator (세션 종료 시 요약 1회)** | Hermes/Superpowers 모두 풀 캡처는 토큰 폭탄 | Hermes `on_session_end` 훅에서 "효과 단계/사용자 수정/I/O 형식/컨텍스트" 4개 카테고리 자동 분류 — **풀 대화 캡처 X** |
| **3** | **Description Tuner (생성 시점 1회 한정)** | 어떤 프로젝트도 미구현 | 20개 평가 쿼리(should-trigger 10 + near-miss 10) × 3회 = 60콜을 **스킬 생성 시 단 1회만** 실행, 자동 반복 금지 |
| **4** | **with/without 벤치마크 (옵트인)** | Superpowers 메타스킬에만 일부 | `power` 프로필 + 명시 호출 시에만. `iteration-N/timing.json + grading.json + benchmark.json` 산출 |
| **5** | **디자인 시스템 강제 탑재** | KW Plugins의 design 직군만 일부 | `DESIGN.md` 단일 진실 소스 + `design-html` + `design-review` + `design-shotgun`(**2변형, 명시 호출**) |
| **6** | **카테고리 기반 도구 추상화 + 안내 설치** | KW Plugins 외 모두 미흡 | `~~CRM` 추상화 + "이 도구 쓰려면 ① 가입 ② 토큰 ③ 붙여넣기" 단계별 안내 |
| **7** | **한국어 1차 지원** | 모두 영어 중심 | 모든 인터뷰·에러·문서 한국어 기본, 한국 비즈니스 컨벤션(직급, 결재, 보고서) 반영 |
| **8** | **친절한 실패 리포트 (템플릿 기반)** | 모두 기술적 로그 | "지난 주 정상 작동했던 ◯◯ 케이스가 이번엔 △△로 바뀌었어요" — **LLM 변환이 아닌 변수 치환 템플릿** (토큰 절약) |
| **9** | **드라이런(Dry-run) 강제** | 부분만 존재 | 외부 전송·파일 삭제·결제 등 부수효과는 실행 전 미리보기 + 명시 승인 |
| **10** | **토큰 경제 Eco-First 설계** | 모두 미고려 | 월 3만원 구독자의 4시간 윈도우 보호: 검증·벤치·풀캡처는 기본 OFF, 옵트인 |
| **11** | **공용 utils 레이어 (`common/utils/`)** | Hermes만 부분 구현(Python 단일), KW는 bio-research 1곳, 나머지 3개 부재 | Hermes `tools/`+`lazy_deps.py` + KW bio-research multi-tier 추출 전략 + 직군 스킬 `requires:` frontmatter 의존. pdfplumber/openpyxl/pandas를 npm 패키지에 `.py` 동봉, Python 런타임은 `uv tool install`로 lazy 디텍션. OCR은 도입 안 함 |

---

## 5. 통합 아키텍처 청사진 (재검증·토큰 경제 반영)

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 0: 배포 (Distribution) — GSD ADR-0011 모델           │
│   npm package + Plugin marketplace + curl 스크립트 (3-way)   │
│   `npx jinhak-harness@latest` (기본=eco)                     │
│   `--profile=eco|standard|power`                             │
│   토큰 가드 UX: 예상 토큰량 사전 안내, 폭탄 기능 옵트인     │
└──────────────────────────────────────────────────────────────┘
          ↓ install
┌──────────────────────────────────────────────────────────────┐
│  Layer 1: 멀티 AI 호환 어댑터 (Superpowers 패턴)             │
│   hooks/session-start: 환경변수 감지 → 플랫폼별 JSON 출력    │
│   ─ Cursor: additional_context (snake_case)                 │
│   ─ Claude Code: hookSpecificOutput.additionalContext       │
│   ─ Copilot/SDK: additionalContext (top-level)              │
│   .agents/skills/ 표준 경로 (5개 도구 자동 스캔)            │
│   `alwaysApply: true` 시맨틱 frontmatter (Karpathy 차용)    │
│   부트스트랩 컨텍스트 500토큰 이내                          │
└──────────────────────────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────────────────────┐
│  Layer 2: 온보딩 & Skill Creator (우리 고유, Eco 모드)       │
│   - 직군 프로파일링 인터뷰 (AskUserQuestion + 8 행동 차원)  │
│   - 자동화 설계 위저드 (입력→처리→출력→저장→전달)           │
│   - 레퍼런스 파일 수집 프로토콜 (`./inbox/` 감지)            │
│   - Skill Creator: 세션 종료 시 요약 1회 (풀 캡처 X)         │
│   - 인터뷰 질문 생성·요약은 Haiku 라우팅                    │
└──────────────────────────────────────────────────────────────┘
          ↓ generate
┌──────────────────────────────────────────────────────────────┐
│  Layer 2.5: 오케스트레이션 커맨드 (메타 워크플로)            │
│   /onboard /plan /autoplan /build /autopilot /verify /ship   │
│   /handoff — 직군 스킬을 reduce하는 단계별 흐름 제어         │
│   .harness/plans/<slug>.md 단위로 영속화                    │
│   단계 게이트 + 컨텍스트 watchdog (60%/80%) 전 프로필 공통   │
│   스킬 트리거 게이팅: Haiku 라우터로 일반 프롬프트 우회      │
└──────────────────────────────────────────────────────────────┘
          ↓ triggers selective
┌──────────────────────────────────────────────────────────────┐
│  Layer 3: 스킬 카탈로그 (KW Plugins 17개 모델 + 직군 번들)   │
│   .agents/skills/                                            │
│     ├─ planning/  marketing/  sales/  hr/  finance/          │
│     ├─ design/    cs/         productivity/                  │
│     ├─ small-business/    operations/                        │
│     └─ <user-created>/                                       │
│   각 SKILL.md = YAML frontmatter + 본문 (≤500줄)             │
│   500줄 초과 시 references/ 자동 분할 (Progressive Disclosure)│
│   auto-trigger Skills (KW 모델) + RBAC `user-invocable`     │
└──────────────────────────────────────────────────────────────┘
          ↓ requires
┌──────────────────────────────────────────────────────────────┐
│  Layer 3': 공용 유틸리티 (Hermes tools/ + KW bio-research)   │
│   common/utils/{pdf-extract,xlsx-read,xlsx-write,csv-rw}/    │
│   pdfplumber + openpyxl + pandas (Python 단일 런타임)        │
│   lazy 디텍션 + uv tool install 1순위 안내                   │
│   compatibility.json tier-fallback (tier1 fast → tier2 정확) │
│   Node ↔ Python: spawn + JSON stdin/stdout                   │
│   직군 스킬은 `requires:` frontmatter로 의존 선언            │
└──────────────────────────────────────────────────────────────┘
          ↓ uses
┌──────────────────────────────────────────────────────────────┐
│  Layer 4: 도구 통합 (KW Plugins 카테고리 추상화, 강제 표준)  │
│   - `~~CRM`, `~~email`, `~~chat` 플레이스홀더                │
│   - CONNECTORS.md 모든 직군에 강제 (KW는 일부만)             │
│   - .mcp.json + settings.local.json 회사 컨텍스트            │
│   - 신뢰 게이팅 + allowed-tools 사전 승인 (GSD 패턴)         │
└──────────────────────────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────────────────────┐
│  Layer 5: 메모리 (Hermes ABC 9+9 훅, default SQLite)         │
│   MemoryProvider ABC: 9 추상 + 9 옵셔널 훅 그대로 구현       │
│   백엔드: SQLite(default) ← 향후 Postgres 동기화 옵션*       │
│   memory/user/ + memory/projects/ + memory/decisions/        │
│   on_pre_compress 훅 + Tail 보호 (default ON, 토큰 절약)     │
│   `<memory-context>` 펜싱으로 오염 방지                      │
│   자동 prefetch OFF, 태그 fast lookup; semantic은 명시 호출 │
│   * Postgres + 자동 동기화는 별도 ADR-002 문서 (향후)        │
└──────────────────────────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────────────────────┐
│  Layer 6: 디자인 시스템 (우리 고유)                          │
│   DESIGN.md + design-consultation/shotgun/html/review        │
│   AI 슬롭 차단 규칙 + 다크/라이트·반응형 자동 보장           │
│   design-shotgun 변형 수: 2 (기존 3~5에서 축소, 명시 호출)   │
└──────────────────────────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────────────────────┐
│  Layer 7: 검증 & 평가 (Eco-First, 옵트인 게이트)             │
│   기본(eco):                                                 │
│     - Dry-run 강제 (외부 전송/삭제/결제)                     │
│     - 친절 실패 리포트 (변수 치환 템플릿, LLM 변환 X)        │
│   standard 프로필:                                           │
│     - Description Tuner 1회 (스킬 생성 시점 한정)            │
│     - Example-as-Test (인터뷰 예시 → evals.json, 명시 실행) │
│   power 프로필:                                              │
│     - with/without 벤치마크                                  │
│     - Superpowers 압박 테스트 (RED 서브에이전트)             │
│     - 매 실행 자동 회귀 (스킬 버전 bump 시에만)              │
└──────────────────────────────────────────────────────────────┘
```

---

## 5.5 오케스트레이션 커맨드 레이어 (Layer 2.5)

> **상세 스펙**: [docs/orchestration-spec.md](docs/orchestration-spec.md) — 8개 커맨드 CommandDef·HARD-GATE 카탈로그·아티팩트 스키마

직군 스킬은 "재료(verbs)", 메타 커맨드는 "레시피(workflows)"다. 사용자가 PDF→Excel 같은 단일 자동화를 만들어도 실제로는 기획→데이터→디자인→운영을 가로지른다. Layer 2와 Layer 3 사이에 흐름 제어 레이어를 둔다.

### 5개 레퍼런스 차용 패턴 (재검증 후 구체화)
- **GSD**: 얇은 디스패처 + 두꺼운 서브에이전트, 마크다운 아티팩트 상태 머신(PROJECT/ROADMAP/STATE/CONTEXT/PLAN/SUMMARY/VERIFICATION), `requires:` frontmatter 의존성, override 메커니즘, cluster 토글
- **Superpowers**: `<HARD-GATE>` XML 진입 조건, 다음 스킬 CAPS 명시 지목(자동 라우팅 X), 2단계 리뷰(spec compliance → code quality), session-start 1개 스킬만 부트스트랩
- **Hermes**: CommandDef 중앙 레지스트리(CLI/Plugin/marketplace 동시 노출), `on_session_switch` lineage 보존, `on_pre_compress` 압축 직전 인사이트 추출, content-match resume, 자연어 cron 스케줄
- **KW Plugins**: auto-trigger description("Use when X, Y, Z. Trigger with ○○"), Standalone+Supercharged 연결자 graceful degradation, "Related Skills" 제안만(자동 체인 X)
- **Karpathy**: `alwaysApply: true` baseline.mdc 무조건 주입, 0 hooks(선언적 메타데이터로만 강제), 대조 학습 ❌/✅ 구조

### 5.5.1 메타 커맨드 (v2 Codex 리뷰 반영: 노출 3 / 내부 5)
| 커맨드 | visibility | 역할 | eco | standard | power |
|---|---|---|---|---|---|
| **`/start`** | **user** | 최초 1회 — 직군·작업 영역 답하기 (내부에서 baseline 작성 + user-profile + starter 스킬 설치) | ✅ | ✅ | ✅ |
| **`/build <목표>`** | **user** | 자동화 만들기 (내부에서 plan → autoplan → build 자동 진행, 단계 사이 가벼운 확인) | ✅ | ✅ | ✅ |
| **`/verify`** | **user** | "결과 맞아?" 확인 + 게시 결정 (내부에서 verify(Dry-run) → 사용자 OK 시 ship) | Dry-run | + evals | + 압박 테스트 |
| `/plan` | internal | `/build` 내부 phase | Haiku | ✅ | ✅ |
| `/autoplan` | internal | 메모리 회상으로 질문 최소화 | ❌ | ✅ | ✅ |
| `/autopilot` | internal | plan+build 무중단 | ❌ | ⚠️ 1회 | ✅ |
| `/ship` | internal | `/verify` 게시 분기 시 자동 호출 | 명시 | ✅ | ✅ |
| `/handoff` | internal | 도구가 직군 컨텍스트 전환 시 자동 사용 | ✅ | ✅ | ✅ |

내부 커맨드는 `--advanced` 플래그 또는 도구의 내부 phase로만 호출된다. 일반 비개발자에게는 슬래시 자동완성·문서에 노출하지 않는다.

### 5.5.2 plan 파일 (PDF→Excel 예)
```markdown
# .harness/plans/pdf-to-excel.md
goal: 계약서 PDF → Excel 갱신
profile: eco
estimated_tokens: ~8천 (빌드) + ~1.5천 (실행/회)
phases:
  - 표본 수집      | common/inbox-collect
  - 추출 룰        | planning/spec-from-samples + data/pdf-extract-strategy
  - 출력 포맷      | design/excel-layout (lite)
  - 검증           | common/verify  (eco: Dry-run / standard+: evals)
  - 전달           | operations/schedule
handoffs: 기획→데이터→디자인→운영
```

### 5.5.3 단계 게이트 (전 프로필 공통)
- 각 phase 진입 시 "이 단계 진행할까요? (예상 토큰 ○○○)" 사용자 확인
- `/autopilot`도 phase 단위 무중단만, 단계 사이 토큰 잔량 체크
- 컨텍스트 윈도우 사용량 60% → 자동 `on_pre_compress` / 80% → 강제 일시정지 + 세션 분할 제안

## 5.6 스킬 트리거 게이팅 (Skill Trigger Gating)

> **v2 Codex 리뷰 반영**: 2-of-4 휴리스틱과 "40~70% 절감"은 측정 전 약속이라 약화. v1은 **3계층 로딩 정책**으로 단순화.

### 5.6.1 v1 정책 — 3계층 로딩
1. 세션 부팅: 직군 카탈로그의 **frontmatter만** 로드 (스킬당 ~50토큰)
2. 워크플로 단계가 특정 스킬을 명시 요구할 때만 해당 SKILL.md 본문 로드
3. references/는 본문이 본문 내에서 명시 호출할 때만 로드

휴리스틱·라우터 없이 계층 강제만으로 불필요 로드를 줄인다. **절감 효과는 측정 후 보고** (수치 약속 X).

### 5.6.2 측정 기반 v0.2+ 학습 루프
- 일반 프롬프트로 처리됐지만 거절·재요청 → "스킬 필요" 라벨
- 본문 로드했으나 frontmatter만으로 충분했던 케이스 → "본문 불필요" 라벨
- Description Tuner(standard+)가 라벨을 사용해 description을 더 정확히 튜닝

## 6. 토큰 경제 설계 (Eco-First, 전 프로필 공통 가드)

대다수 사용자가 월 3만원 구독으로 4시간당 토큰 한도가 있다는 전제에서, "검증을 백그라운드에서 항상 돌린다"는 청사진의 기본값은 **반대로 뒤집어야** 한다.

### 6.1 기능별 토큰 비용 분류
| 분류 | 항목 | 처리 |
|---|---|---|
| **공짜** (1회 로드) | SKILL.md 표준 / 직군 카탈로그 / `.agents/skills` 경로 / Karpathy 4원칙 / 카테고리 추상화 / Dry-run | 전 프로필 포함 |
| **절약 효과** | Progressive Disclosure 3계층 / 컨텍스트 압축(aux 모델) / 로컬 SQLite / state.md / Anthropic prompt cache | **default ON** |
| **숨은 폭탄** (백그라운드 자동 시 위험) | Description Tuner (60콜/스킬) / with-without 벤치 (2배) / design-shotgun (3~5변형) / Skill Creator 풀 캡처 / 매 턴 의미검색 / 매 실행 evals / 압박 테스트 | **default OFF, 프로필/명시 호출 시 ON** |
| **최고비용** | 서브에이전트 다발 spawn | MVP는 메인 컨텍스트, 입증된 경우만 spawn |

### 6.2 프로필 3단계
- **eco** (기본): 인터뷰 + SKILL 생성 + 압축 메모리. 목표: 4시간 윈도우에 인터뷰 1회 + 자동화 실행 5~10회.
- **standard**: + Description Tuner 1회 + 명시 호출 evals + Skill Creator 요약 1회.
- **power**: + with/without 벤치, design-shotgun(2변형), 압박 테스트, 자동 회귀.

### 6.3 비싼 기능의 Eco 변환 규칙
- Description Tuner → **스킬 생성 시점 1회 한정**
- with/without 벤치 → MVP 컷, `power` + 명시 호출
- design-shotgun → 3~5 → **2**, 명시 호출
- Skill Creator → 풀 캡처 → **세션 종료 시 요약 1회** (`on_session_end` 훅)
- 매 턴 의미검색 → 태그 fast lookup, semantic은 `queue_prefetch` 옵셔널
- 매 실행 evals → 스킬 **버전 bump 시에만**
- 압박 테스트 → `power` 전용

### 6.4 토큰 절약 장치 (전 프로필 공통 default ON — eco 한정 아님)
1. **Haiku 라우팅** — 인터뷰 질문 생성·요약·압축·실패 리포트는 Haiku; Opus는 SKILL 초안과 의사결정만.
2. **컨텍스트 압축 default ON** — Hermes `on_pre_compress` + Tail 보호.
3. **Prompt cache 5분 TTL 활용** — 같은 세션 SKILL.md 재호출은 cache hit.
4. **실패 리포트 템플릿화** — LLM 변환 대신 변수 치환.
5. **session-start 훅 500토큰 이내** — Superpowers 부트스트랩 패턴 유지.
6. **스킬 트리거 게이트 (5.6)** — 일반 프롬프트로 가능한 요청은 SKILL.md 로드 생략.
7. **단계 게이트 (5.5.3)** — 모든 phase 진입 시 사용자 토큰 안내·확인, `power`도 무중단 아님.
8. **컨텍스트 윈도우 watchdog** — 60% 자동 압축, 80% 강제 일시정지·세션 분할 제안.

### 6.5 사용자에게 보이는 토큰 가드 UX (v2 Codex 리뷰: 거친 라벨로 축약)
비개발자는 토큰 산수가 아니라 체감 비용을 본다. 3단계 거친 라벨만 표시:
- **🟢 빠름** — eco 일반 작업
- **🟡 느림** — standard 기능 또는 ~5분 이상
- **🔴 할당량 위험** — power 기능 또는 4시간 한도의 ~30% 이상

eco 사용자가 🔴 호출 시 "이번 한 번만 진행할까요?" 분기. 숫자 노출 X.

---

## 7. 배포 전략 — "쉽게 만들고 쉽게 배포한다"

### 7.1 사용자 설치 경험 (이상적)
```bash
# 단 한 줄로 시작 (기본 = eco 프로필)
npx jinhak-harness@latest

# 자동 흐름:
# 1. 현재 AI 도구 감지 (Claude Code / Cursor / Codex / Gemini / Copilot)
# 2. 토큰 경제 안내 ("기본 eco 모드 — 4시간 한도 보호")
# 3. 직군 묻기 ("기획/마케팅/영업/HR/재무 중 어떤 일을 하세요?")
# 4. 해당 직군 starter skill 3개 자동 설치
# 5. 첫 자동화 인터뷰 시작 (5분, Haiku 라우팅)
# 6. SKILL.md 생성 + evals 후보 + 도구 통합 가이드 출력
```

### 7.2 3-Way 배포 채널
| 채널 | 대상 | 진입 마찰 |
|---|---|---|
| **npm CLI** | 모든 AI 도구 사용자 | `npx` 1줄 (GSD 패턴) |
| **Claude Code Plugin Marketplace** | Claude Code 사용자 | `/plugin install` 1줄 (KW Plugins 패턴) |
| **curl 스크립트** | 비기술 사용자 | curl 1줄 (Hermes 패턴) — Windows는 PowerShell `irm` |

### 7.3 멀티 AI 도구 동시 지원 (Superpowers 패턴)
- 표준 경로 `.agents/skills/<name>/SKILL.md` 1차 생성 (5개 도구 자동 스캔)
- 폴백 어댑터: CLAUDE.md, .cursor/rules/, .github/copilot-instructions.md, gemini-extension.json
- `hooks/session-start`로 런타임 플랫폼 감지·3종 JSON 스키마 출력

---

## 8. 단계별 로드맵 (5개 프로젝트 차용 시점 + Eco 분기)

| 단계 | 기본 프로필 | 포함 기능 | 차용 출처 | 신규(우리 고유) |
|---|---|---|---|---|
| **MVP** | `eco` | npm CLI + 직군 인터뷰 + SKILL.md 생성 + 5개 도구 호환 훅 + 기본 스킬 10개 + **`common/utils/` 4개 (pdf-extract=pdfplumber / xlsx-read=openpyxl / xlsx-write=openpyxl / csv-rw=pandas — Python 단일 런타임)** + Python lazy 디텍션(uv 가이드) + 로컬 SQLite 메모리(prefetch OFF) + 컨텍스트 압축 + Haiku 라우팅 | GSD(설치/프로필), Superpowers(훅/멀티 어댑터), KW Plugins(직군), Karpathy(원칙+alwaysApply), **Hermes(tools/+lazy_deps), KW bio-research(multi-tier)** | 비개발자 인터뷰 + 토큰 가드 UX + **`requires:` frontmatter 의존 선언** |
| **MVP** | `standard` | + Description Tuner 1회 + 명시 호출 evals + Skill Creator 요약 1회 | Hermes(on_session_end 훅) | 1회성 Description Tuner |
| **v0.2** | `standard`+ | 도구 통합 5종(Notion/Gmail/Figma/Slack/Webhook) + `DESIGN.md` + design-html + 직군 스킬 5종 추가 | Hermes(메모리 9+9 훅), KW Plugins(MCP 카테고리) | design-html |
| **v0.3** | `power` | with/without 벤치(명시 호출) + design-shotgun(2변형)/review + 신뢰 게이팅 + compatibility 도구 설치 가이드 + 스케줄링 + 직군 스타터 팩 확장 | GSD(권한 사전 승인), Superpowers(압박 테스트) | 친절 실패 리포트 템플릿 |
| **v1.0** | 전체 | 마켓플레이스 + 시각적 워크플로우 에디터 + 멀티 사용자 협업 + **사내 Postgres 메모리 동기화 (ADR-002 별도 문서)** | KW Plugins(마켓), Hermes(메모리 백엔드) | 한국어 UI, RBAC |

---

## 9. 핵심 의사결정 매트릭스 (확정)

| # | 결정 | 옵션 A | 옵션 B | **확정** | 근거 |
|---|---|---|---|---|---|
| **1** | 언어/런타임 | Node.js (GSD/Superpowers) | Python (Hermes) | **A. Node.js** | Claude Code/Cursor/Copilot 생태계의 1차 언어, npm 배포 마찰 최소 |
| **2** | 1차 배포 채널 | npm | Plugin marketplace | **A. npm 우선, marketplace 병행** | npm은 비기술자에게도 단일 명령, marketplace는 발견성 보조 |
| **3** | SKILL.md 본문 한계 | 500줄(GSD/Superpowers) | 무제한 | **A. 500줄, references/ 자동 분할** | 컨텍스트 부패 방지, 토큰 절약 |
| **4** | 메모리 백엔드 기본 | 로컬 SQLite | Postgres | **A. SQLite + Provider ABC(9+9훅)** | 비개발자는 사내 DB 못 씀. **단, 사내 Postgres + 자동 동기화는 별도 ADR-002 문서로 v1.0 추가 검토** (보안·권한·conflict resolution 설계 필요) |
| **5** | 온보딩 시작점 | 직군 선택 | 자동화 설명 | **A. 직군 선택 우선** | 비개발자는 "내가 뭘 자동화할지조차 모름"이 전제 |
| **6** | 외부 도구 첫 통합 5종 | 다양성 | 빈도 | **A. Notion / Gmail / Slack / Figma / Webhook** | 한국 비개발 직군 빈도 + KW Plugins 검증된 카테고리 |
| **7** | multi-AI 호환 깊이 | 5개 도구(Superpowers) | 2개 도구만 | **eco 모드 분기**: eco 기본은 **현재 감지 도구 1개만** 활성, `standard+` 부터 5개 폴백 어댑터 생성 | Superpowers가 단일 codebase로 5개 가능함을 증명했지만, eco 사용자는 1개만 써도 됨. 부트스트랩 토큰 절약 |
| **8** | 검증 강제 수준 | 항상 자동 실행 | 옵트인 | **적절한 선 — 프로필별 차등**: eco=Dry-run+템플릿 실패 리포트만, standard=Description Tuner 1회+명시 호출 evals, power=with/without+압박 테스트. 모든 자동 검증은 백그라운드 시간/토큰 예산 한도 명시 | "왜 이렇게 오래걸리냐"는 사용자 불만 방지 + 토큰 윈도우 보호. 검증은 가치 있을 때만, 사용자가 인지한 비용으로만 |

---

## 10. 위험 요인 & 완화

| 위험 | 영향 | 완화 방안 |
|---|---|---|
| **비개발자가 npm/curl 자체에 진입 장벽 느낌** | 채택률 ↓ | GUI 인스톨러 v0.3+ / Plugin marketplace 1차 노출 |
| **멀티 AI 호환성 유지 비용 (5개 도구 spec 변화)** | 유지보수 ↑ | Superpowers처럼 표준 경로 우선, 폴백은 standard+ 프로필에서만 생성 |
| **직군별 스킬 품질 편차** | 신뢰 ↓ | KW Plugins처럼 자체 빌트인 8개 + 파트너 모델 / Description Tuner(1회) 강제 |
| **메모리 시스템 오염 / 프라이버시** | 보안 ↑ | Hermes의 `<memory-context>` 펜싱 + `[System note]` 접두사 + 로컬 SQLite 기본 |
| **"인터뷰가 너무 길다" 피로감** | 이탈 ↑ | 5분 안에 첫 산출물 + Progressive Disclosure (필요 시만 심층 질문) |
| **AI 슬롭 결과물 (디자인)** | 브랜드 ↓ | DESIGN.md 강제 + design-review atomic fix loop (`power` 프로필) |
| **토큰 윈도우 소진 (월 3만원 구독자)** | 채택률·만족도 ↓↓ | Eco-First 기본 + 토큰 가드 UX + Haiku 라우팅 + 압축 default ON |
| **"검증이 너무 느림" 불만** | UX ↓ | 프로필별 검증 차등 + 백그라운드 시간/토큰 예산 한도 명시 + 사용자가 인지한 비용으로만 실행 |
| **사내 Postgres 동기화 요구 (엔터프라이즈)** | 도입 차단 | v1.0 ADR-002 별도 문서로 보안·권한·conflict resolution 설계 |

---

## 11. 즉시 실행 가능한 액션 아이템 (다음 7일)

1. **레퍼런스 코드 클로닝 & 직접 실행 검증**
   - `npx get-shit-done-cc@latest` 실행하여 설치 UX 체감
   - Superpowers를 Claude Code/Cursor 양쪽에 깔아 호환성 패턴 직접 확인
   - KW Plugins의 marketing 또는 sales 플러그인 1개 골라 SKILL.md 깊이 읽기
   - GSD의 gsd-user-profiler.md + ADR-0011 정독 후 우리 ADR-001 초안화

2. **MVP 스코프 확정** (Layer 1+2+3 + eco 프로필 only) — ✅ 완료 (2026-05-19)
   - 멀티 AI 호환 훅 + 직군 인터뷰 + SKILL.md 생성 + 기본 스킬 10개
   - 도구 통합·메모리 prefetch·디자인·평가는 v0.2+로 미룸
   - **eco 프로필 토큰 예산 측정 벤치**: 인터뷰 1회 + 자동화 5회 = 4시간 한도 내 가능 확인
   - 진척: 가이드 §8 정식 Phase 1~8 모두 통과, E2E 격리 통합 테스트 13/13 통과

3. **첫 직군 선정** — 기획 또는 마케팅 (한국 시장 가장 큰 비개발 SaaS 사용자층)

4. **레퍼런스 SKILL.md 5개 한국화 추출**
   - KW Plugins → sales/call-prep, marketing/draft-content, finance/journal-entry 등 골격 복사
   - 한국어 변환 + 한국 비즈니스 컨벤션 반영 (존댓말, 결재 라인, 부가세, 계정과목)

5. **`hooks/session-start` 스크립트 prototype** (Superpowers 코드를 기반으로)
   - 환경변수 감지 → 3종 JSON 스키마 출력 분기
   - Bash 5종 escape 패턴 적용
   - 부트스트랩 컨텍스트 500토큰 이내 유지

6. **온보딩 인터뷰 스크립트 작성** (Karpathy식 명확한 문제 정의로 시작)
   - Q1: 직군? Q2: 매주 반복하는 일? Q3: 입력? Q4: 출력 형식? Q5: 전달 채널?
   - 모두 Haiku 라우팅으로 처리

7. **`/home/jihwan/jinhak-vibecode` 레포 초기화**
   - `package.json`, `bin/install.js`, `.agents/skills/` 골격
   - README의 5개 핵심 설계 원칙 (토큰 경제 포함)을 CONTRIBUTING/CLAUDE.md로 명시
   - **ADR-001 (Skill Surface Budget, GSD 차용)** + **ADR-002 (사내 Postgres 메모리 동기화, v1.0 향후 문서)** 골격 작성

---

## 12. 결론

비개발자용 AI 하네스 도구의 시장 기회는 **명확히 존재**한다. 5개 레퍼런스 어느 것도 단독으로 우리 README가 정의한 7개 기능 카테고리(A~G)를 모두 충족하지 못하며, 동시에 **각각이 우리에게 필요한 1~2개 패턴씩을 검증된 형태로 제공**한다.

**우리의 전략**: 5개 프로젝트의 best-of-breed 패턴을 차용 + 비개발자 인터뷰·Skill Creator·Eval·디자인 시스템·한국어 1차 지원·**토큰 경제 Eco-First** 로 차별화 + 단일 `npx` 명령으로 배포 마찰 0에 가깝게.

### 5대 인사이트
1. **승부처는 멀티 AI 도구 호환성과 비개발자 온보딩** — 나머지는 모두 레퍼런스에 답이 있다.
2. **Superpowers의 환경변수 감지 훅 + 공식 `.agents/skills/` 경로**가 멀티 AI 호환의 유일한 검증된 패턴이다 (3종 JSON 스키마 분기 필수).
3. **KW Plugins의 17개 직군 카탈로그 + `~~카테고리` 도구 추상화**가 비개발자 도메인 인코딩의 최고 참조 구현이다 (auto-trigger Skill 모델).
4. **Hermes의 9 추상 + 9 옵셔널 훅 MemoryProvider ABC**는 그대로 차용하되 비개발자가 쓰기 쉽게 default를 SQLite로 설정한다 (Postgres 동기화는 ADR-002 별도 문서).
5. **GSD의 ADR-0011 Skill Surface Budget**이 우리 Eco-First 프로필 모델의 청사진이다 — 토큰 경제 보호의 핵심.

### 일정
**MVP 6주(eco) → v0.2 12주(standard) → v0.3 24주(power) → v1.0** 일정으로, 첫 사용자(기획 또는 마케팅 직군 비개발자) 10명 대상 검증 후 직군 확장이 합리적 경로다. **검증 메트릭은 "4시간 토큰 윈도우 내 자동화 5회 이상 실행 가능"** 을 1차 합격선으로 둔다.

---

**참조 보고서**:
- [REPORT_01_andrej-karpathy-skills.md](REPORT_01_andrej-karpathy-skills.md)
- [REPORT_02_get-shit-done.md](REPORT_02_get-shit-done.md)
- [REPORT_03_hermes-agent.md](REPORT_03_hermes-agent.md)
- [REPORT_04_knowledge-work-plugins.md](REPORT_04_knowledge-work-plugins.md)
- [REPORT_05_superpowers.md](REPORT_05_superpowers.md)

**원본 기획**: [README.md](README.md)

**향후 별도 문서 (v1.0 대비)**:
- ADR-001: Skill Surface Budget (GSD 차용) — MVP 직전 작성
- ADR-002: 사내 Postgres 메모리 자동 동기화 — 보안·권한·conflict resolution 설계, v1.0 진입 전 작성
- **[ADR-003: Common Utils Layer](docs/adr/ADR-003-common-utils-layer.md)** — pdfplumber/openpyxl/pandas를 npm으로 동봉, Python lazy 디텍션, Tier-fallback — MVP 동봉, 작성 완료
- **[ADR-004: Scheduler & Background Strategy](docs/adr/ADR-004-scheduler-and-background.md)** — Subagent/Background/Cron은 호스트·OS 위임. Hermes scheduler.py(1837줄) 차용 거부, ~250줄 shim만 — MVP 적용, 작성 완료

# 하네스 개선 계획 — 카카오임팩트 AX 하네스에서 배운 것

> **대상**: jinhak-harness(Layer 3 도구)를 발전시키는 AX팀 개발자
> **소스**: 카카오임팩트 "재단에서 AX하는 이야기" #1~#4 + 하네스 배치도 2종(FIG.01 Pillar×Phase, Layer 0~3)
> **연관 문서**: [LAYER1_CONTEXT_INFRA.md](./architecture/LAYER1_CONTEXT_INFRA.md) · [LAYER3_HARNESS_TOOLING.md](./architecture/LAYER3_HARNESS_TOOLING.md) · [ADR-001](./adr/ADR-001-skill-surface-budget.md)
> **작성**: 2026-06-15 · 브랜치 feat/ceo

이 문서는 외부 동종 사례(카카오임팩트 재단 AX)를 보고 **무엇을 배웠는지**와, 그걸 우리 하네스에 **어떻게 반영할지**를 정리한다. 코드 구현 플랜이 아니라 방향·우선순위 문서다. 구현은 항목별로 별도 플랜/ADR로 분기한다.

---

## 0. 한 줄 요약

카카오임팩트 하네스는 우리와 도메인이 거의 같다(비개발자 조직 AX, 3-Layer 로드맵, 인터뷰가 진입점). 그래서 단순 참고가 아니라 **peer 벤치마크**다. 가장 큰 격차는 **인터뷰**다 — 우리는 고정 Q&A, 그쪽은 커버리지를 추적하는 대화형 AI 인터뷰어 + 구조화 분석. 가장 큰 검증은 **eco·skill 우선 철학** — 그쪽의 "에이전트=별도 인스턴스(비쌈) vs 스킬=인-세션 절차(저렴)" 범례가 우리 방향이 옳음을 확인해 준다.

---

## 1. 무엇을 봤나 (입력)

### 1.1 다이어그램 2종

**FIG.01 — Pillar × Phase 배치도.** 세로축=관심사, 가로축=시간(이해→정리→실행).

| Pillar \ Phase | 이해 | 정리 | 실행 |
|---|---|---|---|
| **Knowledge Infra** | A:ax-researcher / S:ax-interview | A:ax-architect·ax-publisher / S:ax-data-audit·ax-restructure·ax-deploy-guide | A:ax-builder |
| **AX Culture** | A:ax-storyteller | A:ax-storyteller / S:ax-show-tell | A:ax-storyteller |
| **운영(Infra)** | A:ax-admin / S:ax-infra-ops | A:ax-admin / S:ax-tool-migration | A:ax-admin |
| **통합(Orchestrate)** | S:ax-orchestrate (라우팅·핸드오프·추적, 전 단계 관통) | | |

핵심: 같은 에이전트가 한 Pillar의 3 Phase를 관통한다 → **에이전트=지속 페르소나, 스킬=단계별 플레이북**.

**Layer 0~3 구조도.** Layer0 메인세션(지휘자) → Layer1 커스텀 에이전트 6개(페르소나, 별도 인스턴스) → Layer2 빌트인(Explore/Plan/general-purpose, READ/FULL 권한 배지) → Layer3 스킬 8개(세션이 읽는 매뉴얼).

### 1.2 글 4편 핵심

- **#1**: AX의 본질은 "AI가 잘 일할 환경". 기술 시간(2023년 4개월 → 2026년 1시간)이 줄어든 만큼 **설계·설득에 시간을 쓰는 것**이 진짜 AX 포인트.
- **#2**: 에이전트 6 + 스킬 8을 한 번에 만든 게 아니라 **여러 번 "깎았다"**. 최대 효용은 **컨텍스트 스위칭 비용 절감**.
- **#3**: AI 인터뷰어 = 3-레이어 시스템 프롬프트(페르소나/질문 인벤토리/대화 프로토콜) + **JSON 커버리지 추적**(답변 받은 질문/미답 주제 상태 갱신, 새면 복귀, 토큰 절약). 수집(JSON) → ax-researcher가 분석 리포트로. **구조화 in → 구조화 out**.
- **#4**: Culture(심리적 장벽)는 별도 1급 축. 커뮤니케이션 강점인 사람에게 위임, 격주 Show & Tell.

---

## 2. 무엇을 배웠나

### 2.1 배울 점 (강점)

| # | 배운 점 | 근거 | 우리에게 의미 |
|---|---|---|---|
| L1 | **에이전트 vs 스킬 비용 모델을 범례로 명시** | 그림 범례: ■=별도 인스턴스, ⬚=인-세션 매뉴얼 | eco·skill 우선이 옳음을 검증 |
| L2 | **빌트인을 Layer2로 명시(재구현 금지)** | Explore/Plan/general-purpose + READ/FULL 배지 | 우리 "호스트 기능 재구현 금지" 원칙과 동일 |
| L3 | **2축 분해**(페르소나 지속 / 절차 단계별) | 동일 에이전트가 3 Phase 관통 | 하네스 멘탈모델을 한 장으로 설명 |
| L4 | **오케스트레이션을 1급 시민으로** | ax-orchestrate(라우팅·핸드오프·추적) | 컨텍스트 스위칭 비용 절감의 핵심 |
| L5 | **Culture를 기술과 동급 축으로** | AX Culture Pillar 전체 | 우리 OKR "자립도 30→70%"에 직결 |
| L6 | **구조화 in → 구조화 out** | AI 인터뷰어 JSON → ax-researcher 분석 | 사람이 받아적던 흐름 제거 |
| L7 | **대화형 인터뷰어 + 커버리지 추적** | 3-레이어 프롬프트 + JSON 상태 추적 | 우리 /interview와 가장 큰 격차 |
| L8 | **"깎기" 반복 개발** | #2의 메모 | 우리도 이미 실천(interview→full→Windows) |

### 2.2 한계 / 그대로 베끼지 말 것

- **페르소나 과잉**: 소조직에 커스텀 에이전트 6개는 표면적이 넓고, 에이전트=별도 인스턴스라 토큰이 비싸다. 저자도 일부 스킬은 안 쓰게 됨. → 우리는 eco·skill 우선이 더 맞다.
- **토큰 경제 개념 부재**: 그림에 비용/예산 레이어가 없음(Claude 단일 호스트 전제). → 우리 강점(eco 라벨·프로필).
- **영속/메모리 레이어 미표현**: 세션 간 맥락 유지 방식이 그림에 없음. → 우리는 memory.js·project-memory·notepad 보유.
- **2D 매트릭스의 빈칸**: 현실 업무가 Pillar×Phase에 깔끔히 안 들어가는 칸 존재(Pillar1×Phase3 스킬 "진입 시").

---

## 3. 우리 현황 대비 (Gap)

| 영역 | 카카오임팩트 | jinhak-harness 현재 | 격차 |
|---|---|---|---|
| 인터뷰 | 대화형 + JSON 커버리지 + 팀별 질문팩 + 분석 에이전트 | 결정론적 고정 7/11문항([interview.js](../bin/commands/interview.js)) | **큼** |
| 컨텍스트 주입 | (그림엔 없음) | full/eco 자동 주입([render-digest.js](../bin/render-digest.js)·[session-start.js](../hooks/session-start.js)) | 우리가 앞섬 |
| 하네스 지도 | Pillar×Phase + Layer0~3 다이어그램 | 커맨드 나열만(README) | **있으면 좋음** |
| Culture/도입 | 1급 Pillar(Show&Tell 등) | 전무(전부 기술) | **OKR 직결 공백** |
| 비용/이식성 | Claude 전용, 토큰개념 없음 | eco 라벨·6호스트·dry-run | 우리가 앞섬 |
| 메모리 | 그림 미표현 | memory·notepad·project-memory | 우리가 앞섬 |

---

## 4. 개선 로드맵 (이중 리뷰 반영 v2)

> 초안 v1은 우선순위를 **노력 오름차순**으로 잡았다가 codex·critic 양쪽에서 "OKR 임팩트순이 아니다"로 지적받아 재정렬했다(§6). 정렬 키 = **자립도 30→70% OKR 레버리지**.

### ⚠️ 비용 모델 전제 (모든 인터뷰 항목의 선행 조건)

`/interview`는 **eco가 아니라 full 모드**다 — `personal-context.md`가 있으면 [session-start.js](../hooks/session-start.js)가 매 세션 전체 컨텍스트를 주입한다(FULL_CAP 1800자 vs eco digest 700자). 따라서 **"결정론 = 저비용"이 아니다.** 두 축을 분리해야 한다:
- **capture cost** — 수집 시점(LLM 호출 0, 결정론).
- **boot injection cost** — 이후 **모든** 세션의 주입 토큰(질문팩을 늘리면 여기가 커짐).

→ 인터뷰 확장 항목의 완료조건엔 항상 "eco digest cap 유지, full cap 증가 금지, 세션 시작 payload 회귀 테스트"를 넣는다.

### P0 — OKR 직결 + 측정 (즉시)

- **P0-1. 자립도 측정 + 첫 성공 경험 루프.** 자립도 rubric·측정 이벤트 정의 + 비개발자 1명이 실제 업무 1건을 `/start → /build → /verify`로 끝내는 guided path. 성공기준: **첫 자동화 완료율 ↑, 완료 전 질문 수 ↓**. (OKR 직접 / L5)
- **P0-2. 사내 프롬프트 라이브러리 큐레이션(경량 문서).** 도입 레버리지 최고·리스크 최저(순수 문서 산출물). 비개발자의 "첫 프롬프트 마찰"을 직접 낮춘다. (Culture의 경량 절반을 P0로 / L5)

### P1 — 구조·자산 (단기)

- **P1-1. 하네스 배치도 문서화.** 축은 **우리 3-Layer(맥락→데이터→도구) 세로 × Phase 가로 하이브리드로 확정**(Pillar 억지 모방 금지). 위치 `docs/architecture/HARNESS_MAP.md`. 온보딩·CEO 보고용. (v1에서 P0→P1 강등 / L1·L2·L3)
- **P1-2. /interview progressive profiling + 직군 질문팩.** 선행 온보딩에 질문을 더 얹지 말고, **첫 업무 수행 중 필요한 질문만** 묻고 완료 후 누락 보강. eco 부트엔 핵심 3~5 필드만, 전체 주입은 명시 opt-in. 직군 분기는 [user-profiler.js](../bin/user-profiler.js) `domain` 기반 신규 로직(기존 `questionsFor`는 exec 불리언만 분기 — "확장"이 아니라 신규). 성공기준: **첫 자동화 완료 전 질문 수 감소**. (L7 일부 / DX)
- **P1-3. 공유 가능한 하네스 artifact.** 개인 민감 컨텍스트 / 팀 공용 workflow를 분리, **팀 템플릿·업무 레시피·검증 체크리스트만** 공유. 기존 [handoff.mjs](../bin/commands/handoff.mjs)와 정합(그린필드 아님). (v1에서 P2→P1 승격 / L4·L8)
- **P1-4. 구조화 분석 산출물 계약.** 분석 기능보다 **schema 먼저**: `automation_candidates.json`(업무명·빈도·입력데이터·출력물·위험도·dry-run 가능성·필요 도구·검증 기준). render/digest/plan이 같은 schema를 읽게. **in-session 스킬**(스폰 에이전트 금지 — ax-researcher는 그쪽에선 agent지만 우리는 skill 우선). (L6)

### P2 — 옵트인·고비용 (중기, 별도 ADR)

- **P2-1. 대화형 인터뷰어 — 2단계 분리.** ① **deterministic coverage 엔진**(질문 ID·answered/missing 상태·follow-up 슬롯·JSON 저장·resume) 먼저. ② host별 **LLM 어댑터는 별도 ADR**. **power-only.** host LLM(인-세션, 무료) vs 스폰 에이전트(고비용)를 명시 결정. 순서를 바꾸면 6호스트 호환이 깨지거나 Claude 전용 설계가 된다. ("가장 큰 격차"지만 blast radius 최대라 P2 / L7)
- **P2-2. Culture 확장(기록만).** Show&Tell 기록 등 **경량 캡처 스킬만**. 발표·문화·운영은 사람 몫(taste 결정 2). 비개발자에게 "스킬 조작" 시키지 않는다. (L5)

### 성공지표 · 비용 · 거버넌스

- **성공지표**: 각 P항목은 acceptance 신호를 가진다(P0-1 자립도 측정 이벤트, P1-2 완료 전 질문 수, P2-1 세션 토큰 회귀). "측정 없는 우선순위"는 검증 불가.
- **비용**: ADR-001 예산(boot 10K / body 100K)과 정합. P2 옵트인 항목은 세션당 추가 LLM 비용을 수치로 추정한 뒤 착수.
- **거버넌스**: OKR 재검토 **2026-06-28**(팀/전사AX), **2026-06-30**(수시모델)이 9~15일 앞. P0는 이 날짜 전 자립도 증거를 만드는 데 정렬.
- **롤백**: P2-1 대화형이 실제로 너무 비싸면 off-ramp = eco 고정형 인터뷰로 복귀(현 기본).

---

## 5. 의사결정 (6원칙) + 남은 Taste 결정

### 적용한 확정 수정 (리뷰 합의 → 기계적)

- eco 주장 정정(capture vs boot injection 분리) — CONFIRMED CRITICAL.
- 로드맵 재정렬(도입·측정·프롬프트 라이브러리 → P0; 배치도 → P1; 팀 공유 → P1) — OKR 임팩트.
- 대화형 = coverage 엔진 먼저 + power-only + 별도 ADR — blast radius.
- P1-4 분석은 schema 먼저 + in-session — DRY·명료.
- 질문팩 = progressive profiling, 성공기준 "질문 수 감소" — DX.

### 남은 Taste 결정 (사람이 판단)

1. **재정렬 수용 여부.** v1(기술·문서 먼저) vs v2(도입·측정 먼저). 양 리뷰어는 v2를 강하게 지지. → **추천: v2** (OKR 재검토가 임박).
2. **대화형 인터뷰를 아예 보류할지.** "가장 큰 격차"지만 비개발자 DX엔 progressive profiling이 더 나을 수 있음 — 대화형은 over-engineering 위험. → **추천: P2 유지, coverage 엔진까지만 우선**.
3. **Culture를 스킬화할지 vs 사람/프로세스로 둘지.** → **추천: 경량 기록 스킬만**, 나머지는 사람.

---

## 6. 독립 리뷰 결과 (codex + Claude critic 이중 보이스)

두 리뷰어가 사전 공유 없이 독립 실행 → 강하게 수렴. 둘 다 평결 **REVISE / 우선순위 동의 안 함**.

```
CONSENSUS TABLE
──────────────────────────────────────────────────────────────
  항목                                    critic  codex  합의
  ──────────────────────────────────────  ──────  ─────  ────
  1. eco 주장 정확?("결정론=저비용")        오류    오류   CONFIRMED(critical)
  2. P0/P1/P2가 OKR 임팩트순?               아님    아님   CONFIRMED(critical)
  3. 대화형 blast radius 적정?              과소    과소   CONFIRMED(high)
  4. 질문팩이 DX 마찰?                       위험    위험   CONFIRMED(high)
  5. 팀 공유 시기 적정?(P2)                  늦음    늦음   CONFIRMED(high)
  6. 분석 스킬 산출물 계약 있음?            없음    없음   CONFIRMED(med)
──────────────────────────────────────────────────────────────
```

**critic 추가 지적**: 성공지표 전무, 비용/롤백 기준 부재, 거버넌스 deadline 미반영, /handoff 기존재 미정합, P0-1 "또는"이 §5 하이브리드 추천과 모순. → 모두 §4 v2에 반영.

**codex 추가 지적**: 질문팩 A/B 해석 모호(공유 파일 확장 vs 직군별 모듈), 분석은 schema 먼저. → 반영.

**Skeptic 관점(critic)**: 카카오임팩트 하네스의 **측정된 도입 성과는 알 수 없음**(블로그는 서사). 구조를 베끼는 건 ROI 미검증 cargo-cult 위험 → §2.2 회의주의를 "그들 방식이 실제로 통했나"까지 확장. **→ 채택**: P0를 측정부터 시작하는 근거.

---

## 7. 범위 밖 / 이미 있는 것

**이미 있는 것(재구현 금지):** full/eco 컨텍스트 주입, eco 토큰 라벨·프로필, 6호스트 이식성, dry-run 게이트, memory/notepad/project-memory, /start 5문항 + 8 행동차원, **팀 핸드오프([handoff.mjs](../bin/commands/handoff.mjs))** — P1-3는 이걸 확장하지 그린필드가 아님.

**NOT in scope:** 커스텀 에이전트 6종 페르소나 복제(skill 우선), Claude 전용 가정, 외부 발신/PR 콘텐츠화, 측정 없는 구조 모방.

---

## 부록: 결정 감사 로그

| # | 단계 | 결정 | 분류 | 원칙 | 근거 |
|---|---|---|---|---|---|
| 1 | v1→v2 | eco 주장 정정(capture vs boot injection) | 기계적 | 완전성 | 리뷰 CONFIRMED critical |
| 2 | v1→v2 | 도입·측정·프롬프트 라이브러리 → P0 | 기계적 | OKR 임팩트 | 양 리뷰어 CONFIRMED critical |
| 3 | v1→v2 | 배치도 P0→P1 강등 | 기계적 | 실용 | 도입 레버리지 없음 |
| 4 | v1→v2 | 팀 공유 P2→P1 승격 | 기계적 | 실행편향 | 자립도 핵심 |
| 5 | v1→v2 | 대화형 coverage 엔진 먼저 + power-only | 기계적 | 명료 | blast radius |
| 6 | v1→v2 | 분석 schema 먼저 + in-session | 기계적 | DRY | 산출물 계약 |
| 7 | 게이트 | v2 재정렬 수용 | **taste** | — | 사람 판단(추천 v2) |
| 8 | 게이트 | 대화형 보류 vs 진행 | **taste** | — | 사람 판단(추천 P2) |

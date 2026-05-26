# jinhak-vibecode — 방향성 업그레이드 v2

> 단순한 "태스크 분해/검증 도구"에서 → **전사 비개발자의 바이브코딩 품질을 끌어올리는 3-Layer Context 인프라**로 관점 확장.

---

## 한 줄 미션

**비개발자가 도메인 정보만 전달하면, 회사 맥락과 실제 데이터 위에서 AI가 자동으로 결과물을 만든다.**

---

## 3-Layer 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: 기본 Context 레이어                                   │
│ (암묵지의 자연 주입 — 본부/팀/프로젝트 3계층)                    │
│ → Azure DevOps Wiki + 자동 동기화 + 환경 주입                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: 데이터 접근성                                         │
│ (파편화된 데이터를 일관된 방식으로 — MCP/Notion/Figma)          │
│ → 공유 문서/인터뷰 모드/응답 포맷 강제                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: 업무 프로세스화 도구 = jinhak-vibecode 레포            │
│ (npm 패키지 + 8개 메타 슬래시 커맨드 + 6 호스트)               │
│ → 자동화 템플릿·인터뷰·검증 자동화                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 각 Layer 요약

### Layer 1: 기본 Context 레이어

**목적**: 비개발자의 암묵지(본부 방향성·팀 목표·프로젝트 이해관계)를 **자동 주입**해서, 모든 AI 응답이 회사 맥락 위에서 동작하게 함.

**현 상태**: ❌ 미구현 (`~/.claude/CLAUDE.md` 빈 파일)

**다음 단계**: Azure DevOps Wiki를 단일 진실 소스(SSOT)로 삼고, `jinhak-harness context sync`로 자동 동기화.

👉 **[LAYER1_CONTEXT_INFRA.md](./LAYER1_CONTEXT_INFRA.md) 전체 설계 문서**

---

### Layer 2: 데이터 접근성

**목적**: Teams/OneDrive/Notion/Figma 등 파편화된 데이터에 **안전한 읽기 접근**을 제공해서, AI가 실제 업무 데이터 위에서 응답하게 함.

**현 상태**: ⚠️ 부분 구현
- 인터뷰 모드: ✅ 구현 (`/jinhak:start`)
- 응답 포맷: 🔄 Spec만 있고 hook 미구현
- 공유 문서 MCP: ❌ 보안팀 협의 필요

**다음 단계**: 응답 포맷 hook 구현 → 사내 MCP 서버 설계 (보안팀 협의).

👉 **[LAYER2_DATA_ACCESS.md](./LAYER2_DATA_ACCESS.md) 전체 설계 문서**

---

### Layer 3: 업무 프로세스화 도구

**정체성**: 현재 이 레포 (`jinhak-vibecode`) = Layer 3의 실체. npm 패키지로 배포되는 skill/command/hook 집합.

**현 상태**: ✅ 핵심 구현 완료
- npm 패키지 (v0.1.3)
- 6 호스트 자동 등록
- 8개 메타 커맨드 (3개 비개발자 노출)
- 인터뷰 모드 + 호스트별 인증

**다음 단계**: Layer 1·2 통합 → 토큰 가드 실측 → 자동화 마켓플레이스.

👉 **[LAYER3_HARNESS_TOOLING.md](./LAYER3_HARNESS_TOOLING.md) 현 구현 & 로드맵**

---

## 우선순위 제안

도입 순서 (정치적 비용 × 체감 효과 최적화):

1. **Layer 1 템플릿화** (비용 낮음, 기초 튼튼)
   - `CONTEXT.md` / `TEAM_CONTEXT.md` / `PROJECT_CONTEXT.md` 양식 정립
   - 수동 초기화 가능 (자동화는 v0.2)

2. **Layer 2-3 인터뷰 모드 + 응답 포맷 hook** (비용 낮음, 체감 높음)
   - `/jinhak:start` 확대 (직군별 질문 카탈로그)
   - Stop-hook으로 "어디까지/뭐 남고/다음" 포맷 강제

3. **Layer 2-1 사내 MCP** (비용 높음, 신뢰도 극대)
   - 보안팀 RBAC 협의 필수
   - Teams/OneDrive/Outlook 접근

4. **Layer 3 도구 & 마켓플레이스** (지속적)
   - 직군별 자동화 템플릿 수집
   - 사내 npm registry 정리

---

## 관련 문서 인덱스

| 주제 | 문서 |
|---|---|
| **30초 설치** | [README.md](../../README.md) |
| **사용 시나리오** | [USAGE.md](../../USAGE.md) |
| **비개발자용 가이드** | [GETTING_STARTED.md](../../GETTING_STARTED.md) |
| **메타 커맨드 스펙** | [orchestration-spec.md](../orchestration-spec.md) |
| **Layer 1 설계** | [LAYER1_CONTEXT_INFRA.md](./LAYER1_CONTEXT_INFRA.md) |
| **Layer 2 설계** | [LAYER2_DATA_ACCESS.md](./LAYER2_DATA_ACCESS.md) |
| **Layer 3 현황** | [LAYER3_HARNESS_TOOLING.md](./LAYER3_HARNESS_TOOLING.md) |
| **아키텍처 결정** | [docs/adr/](../adr/) |
| **사전 조사** | [docs/research/](../research/) |

---

## 자율성 설계

> **핵심 원칙**: 강제 플러그인 금지. 사용자가 어떤 skill/agent를 쓰더라도 우리의 개념(맥락·데이터·검증)이 자연스럽게 묻어 나오도록.

- **Layer 1·2 환경 주입**: `CLAUDE.md` / `AGENTS.md` / hook으로 자동 로드
- **다른 도구와 공존**: gstack, oh-my-claudecode 등 외부 plugin이 설치되어도 충돌 없음
- **응답 품질 수렴**: 어떤 skill을 쓰든 "어디까지 했고 / 뭐가 남았고 / 다음 액션" 포맷 강제

---

## 변경 이력

- **2026-05-26**: v2 구조 확정 → Layer별 3개 분할 문서 작성, VISION.md 슬림화
- **2026-05-18**: orchestration-spec v2 (Codex 리뷰 반영)
- **2026-05-01**: 초판 (Layer 1·2·3 3계층 컨셉)

---

**→ 각 Layer의 상세 설계·현황·로드맵은 위의 3개 분할 문서를 참고하세요.**

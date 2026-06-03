# ADR-002 — 사내 Postgres 메모리 동기화 (Enterprise)

> **상태**: 🟡 제안(Proposed) · **미착수** · 타겟 v1.0
> **선행**: [ADR-001](./ADR-001-skill-surface-budget.md) · [REPORT_06](../research/REPORT_06_FINAL_synthesis.md)

---

## 맥락

MVP의 메모리 백엔드는 로컬 SQLite(자동 prefetch OFF)로 고정했다([ADR-001], REPORT_06 §결정 4).
비개발자는 사내 DB에 직접 붙지 못하므로 기본값은 로컬이어야 한다. 그러나 엔터프라이즈 도입 단계에서는
팀·조직 단위로 메모리(결정 로그·핸드오프·실행 이력)를 **사내 Postgres에 동기화**하려는 요구가 예상된다.

본 ADR은 그 동기화 설계를 **별도 문서로 분리**하기 위한 자리표시자(placeholder)다. 여러 문서가 이 결정을
"ADR-002"로 선참조하고 있어, 참조 무결성을 위해 골격만 먼저 둔다. **실제 설계·구현은 v1.0 진입 전 확정한다.**

## 결정 (미확정 — v1.0 전 작성)

다음 항목이 확정되어야 본 ADR이 Accepted로 승격된다:

- **보안·권한**: 누가 어떤 메모리를 사내 DB에 올릴 수 있는가 (RBAC, 분류 등급 연동)
- **Conflict resolution**: 로컬 SQLite ↔ Postgres 양방향 동기화 충돌 해소 전략
- **동기화 대상 범위**: `.harness/state.md`·`plans/*.md`·핸드오프 노트 중 무엇을 동기화 대상으로 둘지
- **MemoryProvider ABC 연동**: Hermes 9+9 훅 ABC를 Postgres provider로 구현하는 경계
  (facade 4개 메서드는 사용자/SKILL에 그대로, ABC는 internal 유지 — REPORT_06)

## 현 상태

❌ **미구현.** MVP는 로컬 SQLite만 사용한다. 본 문서는 참조 대상 자리표시자이며,
v1.0 로드맵에서 보안팀 협의 후 정식 설계로 대체된다.

[ADR-001]: ./ADR-001-skill-surface-budget.md

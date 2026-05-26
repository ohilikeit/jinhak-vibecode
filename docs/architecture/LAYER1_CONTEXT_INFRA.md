# Layer 1: 기본 Context 레이어 — 암묵지의 자연 주입

> **상태**: 설계 문서 (미구현, v0.2 타겟)
> **연관 문서**: [VISION.md](./VISION.md) · [Layer 2](./LAYER2_DATA_ACCESS.md) · [Layer 3](./LAYER3_HARNESS_TOOLING.md)

---

## 1. 목적 & 핵심 가설

비개발자의 바이브코딩 실패 원인 1순위는 **"머릿속 암묵지를 AI에 못 옮기는 것"**.

회사 맥락(본부 방향성·팀 목표·프로젝트 이해관계자) 없이 AI가 응답하면, 결과물이 비즈니스와 동떨어진다. Layer 1은 **본부/팀/프로젝트의 방향성을 기본 컨텍스트로 깔아두어**, 사용자가 의식하지 않아도 모든 응답이 회사 맥락 위에서 동작하게 한다.

---

## 2. 3계층 구성

| 단위 | 담는 것 | 위치 (안) |
|---|---|---|
| **본부** | 연 단위 목표, 사업 방향, 추구 가치 | `~/.claude/CLAUDE.md` 본부 섹션 또는 `org/<division>/CONTEXT.md` |
| **팀** | 연간 목표·KPI·OKR, 방향성 | 팀 공유 `TEAM_CONTEXT.md` |
| **프로젝트** | 이해관계자, 협력사/외부 인물, 시장·도메인 정보, 보안 주의사항, 데이터 접근 방식 | 프로젝트 루트 `PROJECT_CONTEXT.md` (또는 `AGENTS.md`에 병합) |

---

## 3. 작동 원리

- **세션 시작 시**: hook 또는 `CLAUDE.md` import 체인으로 3계층 컨텍스트가 자동 로드
- **명시적 호출 불필요**: 사용자가 `/jinhak:*` 커맨드를 안 불러도 모든 응답이 이 위에서 동작

---

## 4. 갱신·배포 아키텍처 — Azure DevOps Wiki SSOT

### 제약 조건

- 회사 내부 정보 → public repo 절대 불가
- 인증: **Microsoft Entra ID (구 Azure AD)**
- Bitbucket 계정은 **개발자만 보유** → 비개발자에게 git workflow 강요 불가
- 갱신 주체: 비개발자(본부장·팀장·기획자) → **편집 UX 가장 중요**
- 본부 → 팀 → 프로젝트 **계층 트리가 시각적으로 깔끔**해야 함

### 권장 아키텍처: Azure DevOps Wiki를 단일 진실 소스(SSOT)로

```
[편집 계층 — 비개발자]
  Azure DevOps Project: "jinhak-context"
  └─ Wiki (좌측 트리뷰)
      ├─ Division-A/
      │   ├─ CONTEXT.md                    (본부 오너 편집)
      │   ├─ Team-A1/
      │   │   ├─ TEAM_CONTEXT.md           (팀장 편집)
      │   │   ├─ Project-Alpha.md
      │   │   └─ Project-Beta.md
      │   └─ Team-A2/...
      └─ Division-B/...
                │
                │  Azure DevOps REST API + Entra ID OAuth
                ▼
[동기화 계층 — 우리 plugin]
  jinhak-harness  `context sync`
    ├─ Entra device-code / PKCE 로그인 (1회, 토큰 캐시)
    ├─ 사용자 AD 그룹 → 본부·팀 Wiki 경로 자동 매핑
    └─ 로컬 캐시: ~/.claude/jinhak/context/
                │
                ▼
[로드 계층 — Claude/타 도구 자동]
  ~/.claude/CLAUDE.md  →  @import jinhak/context/division.md
                       →  @import jinhak/context/team.md
  프로젝트 루트 AGENTS.md → 프로젝트 컨텍스트만 별도
```

---

## 5. Azure DevOps Wiki 선택 근거

| 기준 | Azure DevOps Wiki | SharePoint | Confluence | Outline 셀프호스트 | Bitbucket |
|---|---|---|---|---|---|
| 본부/팀/프로젝트 트리뷰 | ⭐⭐⭐ 좌측 트리 | ✗ 폴더만 | ⭐⭐⭐ | ⭐⭐⭐ | ✗ git tree |
| MD 네이티브 | ⭐⭐⭐ | △ | △ (변환) | ⭐⭐⭐ | ⭐⭐⭐ |
| Entra ID 통합 | 기본 내장 | 내장 | SSO | OIDC 설정 | 별도 |
| 비개발자 편집 UX | ⭐⭐⭐ 웹에디터 | △ Office | ⭐⭐⭐ | ⭐⭐⭐ | ✗ git 필요 |
| 버전 관리·감사 | git 백엔드 자동 | 파일 히스토리 | 자동 | 자동 | 자동 |
| 권한(본부별) | AD 그룹 직접 매핑 | SP 그룹 | space 권한 | 그룹 | repo 분리 |
| 구축·운영 비용 | **0 (Stakeholder 무료)** | 0 | 유료 | VM 운영 부담 | 0 |
| 개발자 git push 경로 | 가능 (Wiki = git repo) | 어려움 | 어려움 | 어려움 | 기본 |

**결론: Azure DevOps Wiki가 압승**

- 본부 → 팀 → 프로젝트 트리가 좌측 사이드바에 **그대로** 나옴 (사용자가 원한 그림)
- Wiki 뒤에 git repo가 있어서 **비개발자는 웹 GUI / 개발자·CI는 git** 두 세계가 자연스럽게 만남
- **Stakeholder 라이선스 = 무료**. Wiki 편집 권한 포함, Boards 권한만 빠짐 → 비개발자 수백 명 추가해도 0원
- Entra ID 동일 테넌트이므로 추가 SSO 설정 0
- AD 그룹 = Wiki 권한 그룹 직접 매핑

---

## 6. 구체 동작

### 6-1. 최초 설치

```bash
npx jinhak-harness init
```

- device-code/PKCE flow로 회사 계정 로그인
- AD 그룹 멤버십 조회
- 본부·팀 Wiki 경로 자동 매핑
- MSAL이 토큰을 OS 키체인에 저장

### 6-2. 편집

- 본부장/팀장이 Azure DevOps Wiki 웹에서 markdown 직접 편집
- 실시간 미리보기, 트리에서 페이지 추가/이동 자유

### 6-3. 동기화

**자동 모드**:
- SessionStart hook이 Wiki API의 `version` 비교
- 변경 시만 pull (ETag 캐싱)

**수동 모드**:
```
/jinhak:context-sync
```

### 6-4. 거버넌스

- Wiki는 git 백엔드이므로 **branch policy로 본부장 승인 PR 강제** 가능
- 또는 가벼운 안: 권한만 분리 (본부 페이지는 본부 그룹만 편집)

### 6-5. 개발자 경로 (선택)

- 원하면 Bitbucket repo에서 CI로 Wiki git remote에 push 가능
- 비개발자에겐 노출 X

---

## 7. 대안 / 폴백

**Confluence가 이미 있다면**:
- 트리 구조 동일하게 활용 가능
- REST API + Entra SSO 패턴 동일
- MD가 네이티브가 아니라 storage format 변환 레이어만 추가

**사내 운영 인프라가 충분하다면**:
- **Outline 셀프호스트**가 UX 최고지만 운영 책임이 따라옴

**최후의 수단**:
- SharePoint 폴더 트리 + Graph API (계층 시각화는 빈약함)

---

## 8. 거버넌스 메타데이터

각 CONTEXT.md 상단에 고정:

```yaml
---
owner: <AD 계정>
review_cycle: quarterly        # 갱신 주기 강제
last_reviewed: 2026-05-01
next_review_due: 2026-08-01
classification: internal       # public / internal / confidential
---
```

- `next_review_due` 경과 시 hook이 배너 출력: "이 context는 N일 지났습니다, 오너에게 갱신 요청"
- Stale context는 자동으로 신뢰도 표시 하향

---

## 9. 보안 체크리스트

- [ ] 토큰은 OS 키체인(Keychain/Credential Manager/libsecret)에만 저장, 평문 금지
- [ ] Conditional Access 정책 준수 (회사 단말기만 등)
- [ ] `confidential` 등급은 로컬 캐시 평문 금지 → 메모리 only
- [ ] Plugin이 외부 LLM에 context 그대로 송신함을 사용자에게 명시 (Anthropic API 경유 동의)

---

## 10. 현 구현 상태

❌ **완전 미구현**. `~/.claude/CLAUDE.md`는 빈 파일 상태.

### 다음 작업

**(a) postinstall에 CLAUDE.md import 라인 자동 삽입**
- `jinhak-harness init` 후 `~/.claude/CLAUDE.md`에 자동으로 import 문 추가
- 사용자 동의 UI 필수

**(b) Azure DevOps Wiki sync MVP**
- `jinhak-harness context sync` 명령 구현
- Entra ID device-code flow
- Wiki REST API 폴링
- 로컬 캐시 (`~/.claude/jinhak/context/`) 저장

---

## 11. 리스크

**거버넌스 책임자 불명확 시 6개월 stale**

- 각 layer마다 "오너 + 갱신 주기"를 메타데이터로 강제해야 함
- `next_review_due` 위반 시 신뢰도 자동 하향
- 분기별 감사 프로세스 수립 필수

---

## 12. 수집 필요 정보

다음 항목들이 확정되어야 Layer 1 MVP 구현 가능:

- [ ] **사내 본부/팀 조직도** — 정확한 명명 규약 (예: "Product Division" vs "상품본부")
- [ ] **Entra 테넌트 ID** — Azure DevOps 통합 설정 권한 보유자 확인
- [ ] **Azure DevOps 조직명·프로젝트명** — 또는 도입 의사결정자 (신규 프로젝트 생성 가능 여부)
- [ ] **AD 그룹 명명 규약** — 그룹 → Wiki 경로 매핑 룰 정의 (예: `grp-product-a` → `Division-A/Team-A1/`)
- [ ] **Stakeholder 라이선스 할당 정책** — 누가 발급 권한 있는가? (보통 구독 관리자)
- [ ] **회사 Conditional Access 정책** — 단말기 제한 여부? 위치 기반 제한?
- [ ] **토큰 캐시 OS 키체인 경로** — Windows(Credential Manager) / macOS(Keychain) / Linux(libsecret) 표준 위치
- [ ] **분류 등급(public/internal/confidential) 사내 정책** — 매핑 테이블 작성 필요
- [ ] **`next_review_due` 위반 시 배너 카피** — 한국어 어조로 작성 (예: "이 정보는 N일 전에 확인된 것입니다. 담당자에게 확인 부탁합니다.")
- [ ] **confidential 등급 캐시 정책** — 메모리 only 검증 방식 (hook 구현 상세)
- [ ] **Confluence 또는 SharePoint 폴백 시나리오** — 의사결정자 확인 (Azure DevOps 도입 실패 시)

---

## 관련 문서

- [VISION.md](./VISION.md) — 3-Layer 아키텍처 전체 개요
- [LAYER2_DATA_ACCESS.md](./LAYER2_DATA_ACCESS.md) — 데이터 접근성 설계
- [LAYER3_HARNESS_TOOLING.md](./LAYER3_HARNESS_TOOLING.md) — 도구 구현 현황
- [../../README.md](../../README.md) — 패키지 소개 & 설계 배경
- [../../USAGE.md](../../USAGE.md) — 사용 설명서

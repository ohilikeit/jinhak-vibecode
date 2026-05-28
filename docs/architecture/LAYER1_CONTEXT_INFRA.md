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

## 4. 갱신·배포 아키텍처 — SharePoint Online + Graph SSOT

### 제약 조건

- 회사 내부 정보 → public repo 절대 불가
- 인증: **Microsoft Entra ID (구 Azure AD)** — 사내 IdP가 Entra이므로 별도 계정 발급 없이 SSO
- Bitbucket 계정은 **개발자만 보유** → 비개발자에게 git workflow 강요 불가
- 갱신 주체: 비개발자(본부장·팀장·기획자) → **편집 UX 중요**
- 본부 → 팀 → 프로젝트 **계층이 폴더 트리로 표현**되어야 함
- 권한: **SharePoint 폴더 권한 = pull/편집 권한**이 자동으로 일치해야 함

### 권장 아키텍처: SharePoint Online 문서 라이브러리를 단일 진실 소스(SSOT)로

> **핵심 결정**: Azure DevOps Wiki를 후보에서 제외하고 SharePoint Online + Microsoft Graph API로 전환.
> 이유는 (1) M365 테넌트에 **이미 포함**되어 신규 서비스 도입·추가 비용이 없고, (2) Entra ID가 곧 인증 주체라 별도 계정이 불필요하며, (3) **문서 라이브러리 폴더 권한이 그대로 pull/편집 권한이 됨**. ADO Wiki는 조직 생성 권한 차단·device-code Conditional Access 차단·**Azure DevOps OAuth 2026년 폐기 예정** 리스크가 커서 배제. 상세 비교는 §5 참조.

```
[편집 계층 — 비개발자]
  SharePoint 사이트: "jinhak-context"
  └─ 문서 라이브러리 (Documents/) — .md 파일을 "파일"로 보관
      ├─ Division-A/
      │   ├─ CONTEXT.md                    (본부 오너 편집)  ← grp-division-a (편집)
      │   ├─ Team-A1/                                        ← grp-team-a1 (편집)
      │   │   ├─ TEAM_CONTEXT.md           (팀장 편집)
      │   │   ├─ Project-Alpha.md
      │   │   └─ Project-Beta.md
      │   └─ Team-A2/...                                     ← grp-team-a2 (편집)
      └─ Division-B/...
                │
                │  Microsoft Graph REST API + Entra ID (위임 인증)
                │  GET /drives/{id}/root:/<path>:/content  ·  /delta polling
                ▼
[동기화 계층 — 우리 plugin · READ-ONLY]
  jinhak-harness  `context sync`   ← pull 전용, 절대 write 안 함
    ├─ Entra Auth Code + PKCE 로그인 (사용자 본인, 1회 후 토큰 캐시)
    ├─ 읽기 전용 scope (Files.Read / Sites.Read.All) — 편집 권한 요청 안 함
    ├─ 위임 인증 → SharePoint가 "권한 있는 폴더만" 응답 (권한 판정 위임)
    ├─ /delta 쿼리로 변경분만 pull (deltaLink 저장, ETag/429 백오프)
    └─ 로컬 캐시: ~/.claude/jinhak/context/
                │
                ▼
[로드 계층 — Claude/타 도구 자동]
  ~/.claude/CLAUDE.md  →  @import jinhak/context/division.md
                       →  @import jinhak/context/team.md
  프로젝트 루트 AGENTS.md → 프로젝트 컨텍스트만 별도
```

### 역할 경계 — 읽기와 쓰기를 완전히 분리

| 주체 | 행위 | 경로 |
|---|---|---|
| **IDE/CLI** (npm 패키지·skill·plugin) | **읽기 전용 (pull)** | Graph 위임 인증 + 읽기 scope. write 코드·권한 자체가 없음 |
| **사람** (부서장·CEO·임원·실무자) | **편집 (write)** | SharePoint 웹 GUI에서 직접 `.md` 수정 |

→ 코드가 SSOT를 변경할 일이 원천적으로 없으므로, 토큰 유출·버그로 인한 오염 위험이 구조적으로 차단된다. 편집은 권한 가진 사람만 웹에서 수행한다.

### 권한 모델 — 위임 인증이 핵심

CLI가 Graph를 호출하는 방식에 따라 권한 동작이 완전히 달라진다. **본 설계는 위임(delegated) 인증 + 읽기 전용 scope를 채택한다.**

| 방식 | 동작 | 채택 |
|---|---|---|
| **위임(Delegated)** — CLI가 사용자 본인 Entra 계정으로 로그인 | SharePoint에서 그 사용자가 **권한 가진 폴더만** pull/편집됨. 권한 없는 경로는 응답에서 제외되거나 403 | ✅ **채택** |
| 앱 전용(`Sites.Selected`, app-only) | 폴더 ACL을 무시하고 사이트 전체를 읽음 | ✗ (중앙 서버 미러링용. 본 요구에 부적합) |

- 사용자별 pull 권한 통제 = **SharePoint가 수행**. CLI는 "보이는 것만 받는다" → 권한 로직을 코드에 넣지 않아 안전·단순.
- 폴더 단위로 **권한 상속 끊고 Entra 보안그룹 직접 매핑** (예: `Division-A/Team-A1/` → `grp-team-a1` 편집). 인사이동 시 그룹 멤버십만 변경 → 권한 자동 반영.
- 편집 권한도 동일 원리: 사람이 웹에서 편집할 때 편집 권한 있는 폴더에만 저장 가능 (CLI는 읽기만).

---

## 5. SharePoint Online 선택 근거

| 기준 | **SharePoint + Graph** | Azure DevOps Wiki | Confluence | Outline 셀프호스트 | Azure Blob |
|---|---|---|---|---|---|
| Entra ID 통합 | **네이티브 (IdP 동일)** | 네이티브 | SSO 설정 | OIDC 설정 | 네이티브 RBAC |
| 폴더(조직도) 트리 | **⭐⭐⭐ 폴더 트리** | ⭐⭐⭐ 좌측 트리 | ⭐⭐⭐ | ⭐⭐⭐ | △ prefix |
| MD 네이티브 | ⭐⭐⭐ (.md 파일 보관) | ⭐⭐⭐ | △ (변환) | ⭐⭐⭐ | ⭐⭐⭐ |
| API/CLI sync | **Graph `/delta` + content** | REST | REST | REST | azcopy/REST |
| 비개발자 편집 UX | △ raw md (§7 절충안) | ⭐⭐⭐ 웹에디터 | ⭐⭐⭐ | ⭐⭐⭐ | ✗ GUI 없음 |
| 권한(폴더별) | **AD 보안그룹 직접 매핑** | AD 그룹 | space 권한 | 그룹(약함) | 컨테이너 RBAC |
| per-user pull 통제 | **위임 인증 = 폴더 ACL** | 가능 | 가능 | 약함 | ABAC 복잡 |
| 구축·운영 비용 | **0 (M365 포함)** | 0 (단 도입 무거움) | 유료 | VM 운영 부담 | 매우 저렴 |

**결론: SharePoint Online + Graph가 최적**

- **이미 M365 테넌트에 포함** → 신규 서비스 도입·추가 비용 0. 본부장·팀장 수백 명이어도 라이선스 추가 없음.
- **Entra ID가 곧 인증 주체** → 별도 계정·SSO 설정 불필요. 위임 인증으로 폴더 권한이 그대로 pull/편집 권한이 됨.
- **`/delta` 쿼리**로 변경분만 polling → 전체 재다운로드 없이 효율적 sync.
- AD 보안그룹 = 폴더 권한 직접 매핑 → 인사이동은 그룹 멤버십 변경만으로 반영.

### ADO Wiki를 제외한 이유

1. **조직 생성 권한 차단** — 일반 사용자가 새 Azure DevOps 조직을 못 만드는 테넌트가 많음 (관리자 승인 필요).
2. **device-code flow Conditional Access 차단** — Microsoft 자체가 차단을 권고하는 인증 흐름.
3. **Azure DevOps OAuth 2025년 신규 등록 중단 → 2026년 완전 폐기 예정** — 인증 경로의 미래 불확실.
4. **도입 자체가 무거움** — Wiki 하나 쓰자고 별도 서비스 전체를 들여야 함.

### 비개발자 편집 UX의 한계 (정직한 트레이드오프)

SharePoint 웹에는 **위지윅 markdown 편집기가 없다.** `.md`를 브라우저에서 열면 raw 텍스트(메모장 수준) 편집이거나 다운로드 후 재업로드다. 편집자가 markdown 문법(`#`, `|` 표)에 거부감이 있으면 §7의 절충안(로컬 markdown 에디터 + 자동 동기화) 또는 대안(Outline)을 검토한다. 위지윅이 **필수 요건**이면 SharePoint 대신 Outline(OIDC)으로 방향 전환을 권장.

---

## 6. 구체 동작

### 6-1. 최초 설치

```bash
npx jinhak-harness init
```

**Auth Code + PKCE 위임 인증 플로우** (회사 구성원 검증은 Entra가 대행):

```
1. npx jinhak-harness init
2. CLI가 브라우저 자동 오픈 (MSAL이 authorize URL 생성)
   → https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize?...
     redirect_uri=http://localhost  (device-code 미사용)
3. 사용자가 회사 업무 계정(@회사도메인)으로 Microsoft 로그인
   → Entra가 인증 + 테넌트 소속 + Conditional Access 일괄 검사
4. single-tenant 앱이므로:
   ✅ @회사도메인 정식 구성원   → 토큰 발급
   ❌ gmail·외부·게스트 계정     → 거부 ("외부 사용자로 추가 필요" 에러)
   ❌ 미등록 단말기/위치          → Conditional Access 거부
5. localhost로 auth code 회신 → CLI가 code + PKCE verifier로 토큰 교환
   → access token + refresh token 수령
6. MSAL이 토큰 캐시를 OS 키체인에 저장 (이후 silent refresh)
7. 위임 토큰으로 첫 pull → SharePoint가 권한 있는 폴더만 응답 → 로컬 캐싱
```

**핵심**: "이 사람이 회사 사람인가" 검증을 우리 코드가 하지 않는다. **single-tenant 앱 등록 + Entra가 IdP로서 차단**한다. 부서·권한 판정도 SharePoint 폴더 ACL이 위임 호출 응답을 필터하므로 별도 화이트리스트가 불필요. (누가 로그인했는지 표시하려면 `GET /me`로 이름만 조회 — 권한 판정엔 불요.)

### 6-2. 편집 (사람만, 웹에서)

- 부서장·CEO·임원·실무자가 SharePoint 문서 라이브러리에서 `.md` 파일을 직접 편집 — **CLI는 관여하지 않음**
- 웹 raw 편집 또는 **절충안(§7)**: 로컬 markdown 에디터(Obsidian/Typora/VS Code) + OneDrive 자동 동기화
- 폴더 트리에서 파일 추가/이동 자유 (편집 권한 있는 폴더 한정)

### 6-3. 동기화 — 일일 갱신 트리거 & 캐시

문서가 주기적으로 갱신되므로 **하루 1회쯤 차이를 검증해 로컬을 업데이트**해야 한다. 이를 위해 두 종류의 캐시와 트리거가 필요하다.

#### 두 종류의 캐시

| 캐시 | 위치 | 역할 |
|---|---|---|
| **인증 캐시** (MSAL token) | OS 키체인 | access + **refresh token** 보관 → 로그인 창 없이 silent 재발급. 무인 동기화의 전제 |
| **콘텐츠 캐시** (deltaLink + 파일 + ETag) | `~/.claude/jinhak/context/` | 직전 sync 지점 기록 → **변경분만** pull |

> refresh token은 보통 90일 rolling — 그 안에 한 번이라도 silent refresh가 돌면 만료가 갱신되어 사실상 무기한 유지. 따라서 **일일 동기화 자체가 인증을 살아있게 유지**한다.

#### 트리거 방식 (2단 구성 권장)

**① SessionStart hook (1차, 기본)** — 추가 설치 불필요
- IDE/Claude 세션 시작 시 hook 실행
- 마지막 sync 타임스탬프를 보고 **24h 경과 시에만** 동기화 (매 세션 폭주 방지)
- silent token 획득 → Graph `/delta`로 변경분 확인 → 변경 파일만 pull

**② OS 스케줄러 (2차, 선택)** — 사용 안 해도 항상 최신 보장
- cron(Linux) / launchd(macOS) / Task Scheduler(Windows)에 `jinhak-harness context sync --quiet` 1일 1회 등록
- IDE를 안 켜는 날에도 갱신

#### 동기화 절차 (공통)
1. MSAL **silent token** 획득 (키체인의 refresh token 사용)
2. 저장된 `deltaLink`로 `GET /delta` 호출 → 변경된 driveItem 목록만 수신
3. 변경 파일만 `GET /drives/{id}/root:/<path>:/content` (ETag `If-None-Match`로 미변경분 304 skip)
4. 로컬 캐시 갱신 + 새 `deltaLink` 저장
5. 429 → 지수 백오프

#### silent 실패 시 폴백 (중요)
- Conditional Access의 **sign-in frequency** 정책이 주기적 재인증을 강제하면 silent refresh가 실패할 수 있음
- 이 경우 무인 sync는 **조용히 중단하고 사용자에게 알림**: "컨텍스트 갱신을 위해 다시 로그인이 필요합니다 → `jinhak-harness init`"
- 무인 cron이 로그인 창을 띄울 수 없으므로, 다음 대화형 세션에서 재로그인 유도

**수동 모드**:
```
/jinhak:context-sync
```

### 6-4. 거버넌스

- 폴더 단위 **권한 상속 끊기 + Entra 보안그룹 매핑** (본부 폴더는 본부 그룹만 편집)
- 승인 워크플로 필요 시: SharePoint **승인(approval) + 버전관리**로 "수정 후 승인돼야 게시"
- 모든 편집은 웹 GUI에서 사람이 수행 → 변경 이력·감사는 SharePoint 버전관리가 자동 기록

---

## 7. 편집 UX 절충안 / 대안

**절충안 (SharePoint 유지, 비개발자 편집 개선)**:
- SharePoint 라이브러리를 **OneDrive로 로컬 동기화** → 편집자는 **Obsidian / Typora / VS Code**로 위지윅에 가깝게 편집
- 저장 시 OneDrive가 자동으로 SharePoint에 반영 → CLI가 `/delta`로 pull
- 비개발자에겐 "이 폴더에서 이 앱으로 글 써주세요"만 안내

**위지윅이 필수 요건이면 (방향 전환)**:
- **Outline 셀프호스트** — Entra ID OIDC 연결, 위지윅 UX 최고. 단 셀프호스트 운영 부담 + 그룹→컬렉션 자동 매핑 약함
- **Confluence** — 이미 있다면 Entra SSO + REST API. 단 유료 + markdown export가 깔끔하지 않음

**백엔드 단순함만 본다면**:
- **Azure Blob Storage + Entra RBAC** — azcopy로 가장 단순한 sync. 단 비개발자 GUI 편집 불가 → 단독 부적합

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
- [ ] refresh token 만료(약 90일) 시 무인 sync는 중단 + 사용자에게 재로그인 안내 (cron이 로그인 창 못 띄움)
- [ ] **위임 인증(Auth Code + PKCE)** 사용 — device-code flow 회피 (Conditional Access 차단 대상)
- [ ] **읽기 전용 scope 고정** — `Files.Read`/`Sites.Read.All`만. CLI는 write scope를 절대 요청하지 않음 (편집은 사람이 웹에서만)
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

**(b) SharePoint + Graph sync MVP**
- `jinhak-harness context sync` 명령 구현
- Entra ID **Auth Code + PKCE** 위임 인증 (앱 등록 `Sites.Read.All`/`Files.Read`)
- Graph `/delta` 폴링 + `content` 다운로드 (ETag·429 백오프)
- 로컬 캐시 (`~/.claude/jinhak/context/`) 저장

> **선행 가능성 검증** (코딩 전): ① Entra 앱 등록 권한 보유 여부(User settings) ② SharePoint 사이트 생성 가능 여부 ③ 데이터 리전. 셋 다 확인되면 회사 업무 계정으로 `az login` → Graph `content` 호출로 raw markdown pull이 떨어지는지 스모크 테스트.

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
- [ ] **Entra 앱 등록 권한** — 일반 사용자 앱 등록 허용 여부(User settings) / 막혀있으면 IT에 `Files.Read` 앱 1건 요청
- [ ] **SharePoint 사이트 생성 가능 여부** — `jinhak-context` 사이트 + 문서 라이브러리 생성 권한 (또는 IT 요청)
- [ ] **회사 업무 계정 보유** — `@회사도메인` 계정으로 SharePoint/Teams 웹 로그인 가능한가 (gmail 등 외부 계정 불가)
- [ ] **데이터 리전** — M365 admin center Data location 확인 (규제 산업이면 보안팀 컴플라이언스 검토)
- [ ] **AD 그룹 명명 규약** — 그룹 → 폴더 경로 매핑 룰 정의 (예: `grp-product-a` → `Division-A/Team-A1/`)
- [ ] **회사 Conditional Access 정책** — 단말기 제한 여부? 위치 기반 제한? (Auth Code + PKCE 허용 확인)
- [ ] **토큰 캐시 OS 키체인 경로** — Windows(Credential Manager) / macOS(Keychain) / Linux(libsecret) 표준 위치
- [ ] **분류 등급(public/internal/confidential) 사내 정책** — 매핑 테이블 작성 필요
- [ ] **`next_review_due` 위반 시 배너 카피** — 한국어 어조로 작성 (예: "이 정보는 N일 전에 확인된 것입니다. 담당자에게 확인 부탁합니다.")
- [ ] **confidential 등급 캐시 정책** — 메모리 only 검증 방식 (hook 구현 상세)
- [ ] **비개발자 편집 UX 결정** — 웹 raw 편집 OK인가, 절충안(로컬 에디터) 필요한가, 위지윅 필수(→Outline)인가

---

## 관련 문서

- [VISION.md](./VISION.md) — 3-Layer 아키텍처 전체 개요
- [ENV_SETTING.md](./ENV_SETTING.md) — SharePoint 구축·Entra 앱 등록·인증 캐시 실셋업 가이드
- [LAYER2_DATA_ACCESS.md](./LAYER2_DATA_ACCESS.md) — 데이터 접근성 설계
- [LAYER3_HARNESS_TOOLING.md](./LAYER3_HARNESS_TOOLING.md) — 도구 구현 현황
- [../../README.md](../../README.md) — 패키지 소개 & 설계 배경
- [../../USAGE.md](../../USAGE.md) — 사용 설명서

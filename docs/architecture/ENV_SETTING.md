# 환경 설정 가이드 — SharePoint SSOT + Entra 인증

> **대상**: jinhak-vibecode Layer 1 컨텍스트 인프라를 실제로 구축하는 관리자/개발자
> **연관 문서**: [LAYER1_CONTEXT_INFRA.md](./LAYER1_CONTEXT_INFRA.md) (아키텍처 설계) · [VISION.md](./VISION.md)

이 문서는 **SharePoint Online 문서 라이브러리(SSOT) 생성 → Entra 앱 등록 → 권한 설정 → CLI 인증 검증**까지의 실제 셋업 절차를 담는다. 설계 배경과 의사결정 근거는 LAYER1 문서를 참조.

---

## 0. 사전 가능성 검증 (코딩 0줄, 약 10분)

빌드 전에 아래 3개가 모두 가능한지 먼저 확인한다. 막히는 지점이 곧 IT 협조 요청 포인트다.

| # | 확인 항목 | 확인 위치 | 막히면 |
|---|---|---|---|
| 1 | **앱 등록 권한** | Entra 포털 → Microsoft Entra ID → Users → User settings → "Users can register applications" = `Yes` | IT에 "`Files.Read` 읽기 전용 앱 1건 등록" 요청 |
| 2 | **SharePoint 사이트 생성** | https://{tenant}.sharepoint.com → "+ 사이트 만들기" 버튼 노출 여부 | IT에 사이트 1개 생성 요청 |
| 3 | **데이터 리전** | M365 admin center → Settings → Org settings → Organization profile → Data location | 규제 산업이면 보안팀 컴플라이언스 검토 |

> 추가 전제: 작업자가 **회사 업무 계정(@회사도메인)** 을 보유해야 한다. gmail 등 외부 계정으로는 single-tenant 앱 토큰을 받을 수 없다.

3개가 모두 `Yes`면 진행 가능. 1번이 막히면 IT 협조가 유일한 의존성이다.

---

## 1. SharePoint 사이트 & 문서 라이브러리 생성

### 1-1. 사이트 생성

1. https://{tenant}.sharepoint.com 접속 → **+ 사이트 만들기**
2. **팀 사이트** 또는 **커뮤니케이션 사이트** 선택 (권한 관리가 단순한 커뮤니케이션 사이트 권장)
3. 사이트 이름: `jinhak-context` → 생성
4. 생성된 사이트 URL 메모: `https://{tenant}.sharepoint.com/sites/jinhak-context`

### 1-2. 조직도 폴더 트리 구성

기본 **문서(Documents)** 라이브러리 안에 본부 → 팀 → 프로젝트 폴더를 만든다. **반드시 `.md` 파일을 "파일"로 업로드**한다 (SharePoint "페이지"는 markdown이 아니므로 사용 금지).

```
Documents/
├─ Division-A/
│  ├─ CONTEXT.md
│  ├─ Team-A1/
│  │  ├─ TEAM_CONTEXT.md
│  │  ├─ Project-Alpha.md
│  │  └─ Project-Beta.md
│  └─ Team-A2/
│     └─ TEAM_CONTEXT.md
└─ Division-B/
   └─ ...
```

### 1-3. 폴더별 권한 = Entra 보안그룹 매핑

각 폴더에서 권한 상속을 끊고 Entra 보안그룹을 직접 매핑한다.

1. 폴더 우클릭 → **세부 정보 → 액세스 관리 → 고급**
2. **권한 상속 중지(Stop Inheriting Permissions)**
3. 불필요한 기존 권한 제거 후, **Entra 보안그룹 추가**:
   - `Division-A/` → `grp-division-a` (편집 또는 읽기)
   - `Division-A/Team-A1/` → `grp-team-a1` (편집)
4. 역할: 편집자는 **편집(Edit/Contribute)**, 열람만 할 사람은 **읽기(Read)**

> 사람을 개별 추가하지 말고 **보안그룹**에만 매핑한다. 인사이동 시 그룹 멤버십만 바꾸면 권한이 자동 반영된다.

### 1-4. 보안그룹 준비 (Entra)

Entra 포털 → Groups → New group → **Security** 유형으로 본부·팀별 그룹 생성:
- `grp-division-a`, `grp-team-a1`, `grp-team-a2`, ...
- 명명 규약을 폴더 경로와 1:1로 맞춘다 (예: `grp-team-a1` → `Division-A/Team-A1/`)

---

## 2. Entra 앱 등록 (CLI 읽기 전용)

### 2-1. 앱 등록

Entra 포털 → **App registrations → New registration**

| 항목 | 값 |
|---|---|
| 이름 | `jinhak-harness-context-sync` |
| 지원 계정 유형 | **이 조직 디렉터리만 (Single tenant)** ← 회사 구성원만 인증되는 핵심 |
| Redirect URI | **Public client/native** → `http://localhost` |

등록 후 메모:
- **Application (client) ID**
- **Directory (tenant) ID**

### 2-2. 인증 설정 (public client)

App → **Authentication**:
- Platform: **Mobile and desktop applications** 추가
- Redirect URI: `http://localhost` 체크
- **Allow public client flows** = `Yes` (PKCE 사용, client secret 없음)
- device-code flow는 사용하지 않음 (Conditional Access 차단 위험)

### 2-3. API 권한 — 읽기 전용 위임 권한

App → **API permissions → Add a permission → Microsoft Graph → Delegated permissions**:

| 권한 | 용도 |
|---|---|
| `Files.Read` | 문서 파일 읽기 |
| `Files.Read.All` | (필요 시) 공유된 모든 파일 읽기 |
| `Sites.Read.All` | 사이트/라이브러리 메타 읽기 |
| `User.Read` | 로그인 사용자 기본 프로필 (`/me`) |
| `offline_access` | refresh token 발급 (silent refresh·무인 sync 전제) |

- **write/ReadWrite 권한은 추가하지 않는다** — CLI는 읽기 전용. 편집은 사람이 웹에서만.
- 위임 권한은 보통 사용자 동의로 충분하나, 회사 정책상 **관리자 동의(Grant admin consent)** 가 필요할 수 있다.

> **앱 전용(`Sites.Selected`)을 쓰지 않는 이유**: 본 설계는 사용자별 폴더 권한이 그대로 pull 권한이 되어야 하므로 **위임 인증**을 쓴다. 앱 전용은 폴더 ACL을 무시하고 사이트 전체를 읽으므로 부적합. (상세: LAYER1 §4 권한 모델)

---

## 3. CLI 인증 검증 (스모크 테스트)

앱 등록·권한·라이브러리가 끝났으면, markdown이 실제로 당겨지는지 검증한다.

### 3-1. 회사 계정으로 로그인

```bash
az login --tenant <tenant-id> --allow-no-subscriptions
# 브라우저에서 반드시 @회사도메인 계정 선택 (gmail 등 외부 계정 불가)

az account show --query user.name -o tsv   # 외부 주소가 찍히면 그게 원인
```

### 3-2. 액세스 토큰 획득

```bash
TOKEN=$(az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv)
```

### 3-3. site → drive → 파일 content 순서로 확인

```bash
# 1) site ID 조회
curl -H "Authorization: Bearer $TOKEN" \
  "https://graph.microsoft.com/v1.0/sites/{tenant}.sharepoint.com:/sites/jinhak-context"

# 2) 문서 라이브러리(drive) 목록
curl -H "Authorization: Bearer $TOKEN" \
  "https://graph.microsoft.com/v1.0/sites/{site-id}/drives"

# 3) 폴더 안 .md raw 내용 pull  ← 핵심 검증
curl -L -H "Authorization: Bearer $TOKEN" \
  "https://graph.microsoft.com/v1.0/drives/{drive-id}/root:/Division-A/Team-A1/TEAM_CONTEXT.md:/content"
```

3번에서 markdown 원문이 떨어지면 **end-to-end 가능 확정**.

### 3-4. 델타 쿼리 (일일 동기화용)

```bash
# 변경분만 추적 — 전체 재다운로드 방지
curl -H "Authorization: Bearer $TOKEN" \
  "https://graph.microsoft.com/v1.0/drives/{drive-id}/root/delta"
```

응답의 `@odata.deltaLink`를 저장했다가 다음 polling에 사용하면 변경된 파일만 수신한다.

---

## 4. 인증 정보(토큰) 캐시 관리

CLI 실제 구현은 MSAL을 사용해 토큰을 **OS 키체인**에 보관한다 (`az login`은 검증용일 뿐).

| OS | 저장소 |
|---|---|
| Windows | Credential Manager |
| macOS | Keychain |
| Linux | libsecret (gnome-keyring 등) |

- 최초 1회 대화형 로그인 후, **refresh token**으로 silent 재발급 → 로그인 창 없이 동기화 지속
- refresh token은 약 **90일 rolling** — 그 안에 한 번이라도 갱신되면 만료가 연장되어 사실상 무기한 유지
- **평문 파일에 토큰 저장 금지**

### silent 실패 폴백
- Conditional Access의 **sign-in frequency** 정책이 주기적 재인증을 강제하면 silent refresh가 실패할 수 있음
- 무인 cron은 로그인 창을 못 띄우므로, 조용히 중단하고 다음 대화형 세션에서 재로그인 안내: `jinhak-harness init`

---

## 5. 일일 동기화 트리거 설정

문서가 주기적으로 갱신되므로 하루 1회 차이를 검증해 로컬을 업데이트한다. (설계 상세: LAYER1 §6-3)

### ① SessionStart hook (기본, 추가 설치 불필요)
- IDE/Claude 세션 시작 시 hook 실행
- 마지막 sync 타임스탬프 기준 **24h 경과 시에만** 동기화 (매 세션 폭주 방지)

### ② OS 스케줄러 (선택, 항상 최신 보장)

**Linux (cron)** — 매일 09:00:
```cron
0 9 * * * jinhak-harness context sync --quiet
```

**macOS (launchd)** 또는 **Windows (Task Scheduler)** 에 동일 명령을 1일 1회 등록.

---

## 6. 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| "외부 사용자로 추가되어야 합니다" | gmail 등 외부 계정으로 로그인 | `@회사도메인` 업무 계정으로 재로그인 (`az logout && az login --tenant <id>`) |
| 앱 등록 버튼 비활성 | User settings에서 앱 등록 차단 | IT에 `Files.Read` 앱 1건 등록 요청 |
| 사이트 생성 버튼 없음 | SharePoint 사이트 생성 잠금 | IT에 사이트 1개 생성 요청 |
| Graph 호출 403 | 위임 권한 미동의 / 폴더 ACL 없음 | 관리자 동의 확인 + 해당 폴더 보안그룹 멤버 확인 |
| Graph 호출 429 | throttling | `/delta` + ETag + 지수 백오프 |
| silent refresh 실패 | refresh token 만료 / sign-in frequency | `jinhak-harness init` 재로그인 |

---

## 관련 문서

- [LAYER1_CONTEXT_INFRA.md](./LAYER1_CONTEXT_INFRA.md) — 아키텍처 설계·권한 모델·동기화 흐름
- [VISION.md](./VISION.md) — 3-Layer 전체 개요
- [LAYER3_HARNESS_TOOLING.md](./LAYER3_HARNESS_TOOLING.md) — 도구 구현 현황·로드맵

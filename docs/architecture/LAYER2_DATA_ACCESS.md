# Layer 2: 데이터 접근성 — 파편화된 데이터를 일관된 방식으로

> **상태**: 설계 문서 (부분 구현, v0.2 타겟)
> **연관 문서**: [VISION.md](./VISION.md) · [Layer 1](./LAYER1_CONTEXT_INFRA.md) · [Layer 3](./LAYER3_HARNESS_TOOLING.md)

---

## 1. 목적

AX 실패의 진짜 원인은 **"AI 성능"이 아니라 "데이터 파편화 + 안전한 접근 부재"**.

바이브코딩 도구가 **실제 업무 데이터에 proxy 형태**로 닿을 수 있어야 한다. 공유 문서·데이터베이스·노션·피그마 등이 "읽기 전용, 승인된 방식으로" 접근되면, AI 응답의 신뢰도가 수십 배 오른다.

---

## 2. 2-1: 공유 문서 접근 (사내 통제 영역)

### 설계 가설

Teams, OneDrive, Outlook 첨부, 사내 PDF 저장소 등에 **읽기 전용** 접근을 주는 **사내 MCP 서버** 또는 전용 skill 배포.

### 구체 동작

1. **팀 내 공유 문서**일 경우, **프로젝트 루트 `AGENTS.md`에 "읽는 방식·목적"을 명시**
   ```yaml
   # AGENTS.md 예시
   shared_documents:
     - name: "분기 마케팅 계획"
       source: "Teams/MarketingTeam/Plans/"
       read_mode: "OneDrive Graph API"
       classification: "internal"
       freshness_expected: "weekly"
   ```

2. **디렉터리 진입 / 문서 접근 시점 hook**에서 자동 활성화
   - 사용자가 `/jinhak:interview` 호출 → 이 데이터들을 자동으로 로드
   - 권한 체크 (사용자 AD 그룹 vs 문서 공유 권한)

3. **읽기 전용 proxy**
   - 캐시: `~/.claude/jinhak/data/<doc-id>/` (로컬)
   - 갱신: 주기적 또는 trigger-based (사용자가 "데이터 새로고침" 요청)

### 사내 MCP 서버 설계 (보안팀 협의 필수)

```
MCP 서버 (사내 운영)
  ├─ Teams Graph API (채널 → 파일 읽기)
  ├─ OneDrive Graph API (폴더 → 문서 읽기)
  ├─ Outlook Graph API (메일 첨부 → 파싱)
  └─ SharePoint REST API (사내 PDF 저장소)
        │
        ▼ RBAC 레이어 (누가 무엇을 읽을 수 있나)
        │
        ▼ 응답 형식 (MD / JSON / CSV)
        │
        ▼ Claude/Cursor에 노출
```

---

## 3. 2-2: Notion / Figma (공식 도구 활용)

### 설계 가설

Claude 공식 Notion/Figma skill 활용. **강제 X, 설치·권한·활용 사례만 공유**.

### 구체 동작

1. **사용자가 노션·피그마 링크를 던지면**
   - Plugin이 자동 감지
   - "공식 플러그인 설치 안내 + 사내 활용 가이드 링크" 제시
   - 자연 유도 (강압 X)

2. **Hook 구현 (SessionStart 또는 PreToolUse)**
   ```
   링크 감지 (https://notion.so/..., https://figma.com/...)
     ↓
   공식 skill 설치 유무 확인
     ↓ 미설치
   "다음 명령으로 설치 가능합니다: /install notion-skill"
     ↓ 설치됨
   "이 문서는 Notion skill로 자동 로드합니다"
   ```

3. **활용 가이드** (별도 문서)
   - 피그마: 프로토타입·컴포넌트 정보 추출
   - 노션: 데이터베이스·템플릿·위키 조회

---

## 4. 2-3: 데이터 접근 필요성 안내 (인터뷰 모드)

### 설계 배경

비개발자가 가장 자주 빠지는 함정:

- 필요한 정보가 context에 들어왔는지 모름
- 연결이 안 됐는데 됐다고 착각
- 추측으로 동작시킴

### 솔루션: 인터뷰 모드 + 응답 포맷 강제

#### 4-1. 인터뷰 모드 (`/jinhak:interview`)

```
/jinhak:interview

Q1. 이 작업에 필요한 데이터가 뭔가요?
   → 사용자: "분기 실적 엑셀, 마케팅 계획"

Q2. 지금 그 데이터들이 준비되어 있나요?
   → 사용자: "엑셀은 있고, 계획은 노션에"

Q3. 그럼 먼저 이 방법들 중 하나로 데이터를 준비할까요?
   - Teams에서 파일 공유 (동료·AI 모두 접근)
   - Notion link 제시 (공식 skill로 읽기)
   - 파일 직접 업로드
```

**현 구현 상태**: ✅ 인터뷰 모드는 `jinhak-harness start` 구현됨 (8 행동 차원, [README §4.5](../../README.md) 참조)

#### 4-2. 응답 포맷 강제: "어디까지/뭐 남고/다음"

모든 턴 끝에 자동 부착:

```
[응답 본문]

---

**진행 상황**
- 지금까지: N단계 중 M까지 진행 (XX%)
- 남은 것: [목록]
- 다음 추천 행동: [체크리스트]
```

**구현 방식**:
- (선택 1) 시스템 프롬프트에 강제 규칙
- (선택 2) Stop-hook에서 후처리 강제

**현 구현 상태**: ⚠️ orchestration-spec에만 정의되어 있음. Hook 미구현.

---

## 5. 현 구현 상태

| 항목 | 상태 | 설명 |
|---|---|---|
| 2-1: 공유 문서 접근 (사내 MCP) | ❌ 미구현 | 보안팀 RBAC 협의 필요 |
| 2-2: Notion/Figma 링크 감지 hook | ❌ 미구현 | 공식 skill 유도 hook 없음 |
| 2-3a: 인터뷰 모드 | ✅ 구현됨 | `jinhak-harness start` |
| 2-3b: 응답 포맷 강제 | ⚠️ 부분 | spec 정의만, hook 미구현 |

---

## 6. 리스크

**사내 MCP 서버 RBAC 모델이 보안팀 협의 없이는 최대 블로커**

- "누가 무엇을 읽을 수 있나" 정책이 불명확하면 구현 불가
- confidential 등급 문서의 로컬 캐시 정책도 보안팀 승인 필수
- external LLM 전송 동의 절차 필수 (예: Claude API 경유)

---

## 7. 수집 필요 정보

다음 항목들이 확정되어야 Layer 2 MVP 구현 가능:

- [ ] **보안팀 데이터 RBAC 모델 초안** — "누가 무엇 읽을 수 있는가" (예: "분기 리뷰는 팀장 이상만", "인사 데이터는 HR만")
- [ ] **Teams/OneDrive Graph API scope 화이트리스트** — 어떤 권한까지 plugin에 부여 가능?
- [ ] **Outlook 첨부 파싱 정책** — 회사 정책상 가능 여부 (암호화 메일 제외 등)
- [ ] **사내 PDF 저장소 위치** — SharePoint? 파일 서버? DMS?
- [ ] **confidential 등급 데이터의 로컬 캐시 금지 정책** — 메모리 only? 일시 디스크? 정책 명문화
- [ ] **Notion/Figma 공식 plugin 사내 사용 정책** — 외부 LLM 전송 동의 절차 (회사 정책)
- [ ] **인터뷰 질문 카탈로그** — 직군별 5-10개 (기획/디자인/마케팅/영업/HR/재무/CS)
- [ ] **Stop-hook 응답 포맷 한국어 템플릿** — "지금까지 N단계 중 M까지…" 구체 문구
- [ ] **응답 포맷 강제 vs 가이드 정책** — 사용자가 다른 skill 쓸 때도 강제할지 결정
- [ ] **외부 LLM 전송 사용자 명시 동의 UI** — 언제 물어볼지? (처음 1회? 매번?)

---

## 관련 문서

- [VISION.md](./VISION.md) — 3-Layer 아키텍처 전체 개요
- [LAYER1_CONTEXT_INFRA.md](./LAYER1_CONTEXT_INFRA.md) — 기본 context 레이어
- [LAYER3_HARNESS_TOOLING.md](./LAYER3_HARNESS_TOOLING.md) — 도구 구현 현황
- [../../README.md](../../README.md) — 패키지 소개 & 설계 배경
- [../../USAGE.md](../../USAGE.md) — 사용 설명서
- [../orchestration-spec.md](../orchestration-spec.md) — 메타 커맨드 spec

# jinhak-vibecode — 방향성 업그레이드 v2

> 단순한 "태스크 분해/검증 도구"에서 → **전사 비개발자의 바이브코딩 품질을 끌어올리는 3-Layer Context 인프라**로 관점 확장.

---

## 0. 핵심 전제

- **대상**: 전사 비개발자 (본부 → 팀 → 프로젝트 3단 계층)
- **목표**: 모든 비개발자 결과물의 퀄리티 + AI 활용 능력 동시 상승
- **자율성 보장**: 사내 배포 플러그인 "강제" 금지. 사용자가 어떤 skill/agent를 쓰더라도 우리의 개념(맥락·데이터 접근·검증)이 **자연스럽게 묻어 나오도록** 설계한다.
- **주입 경로**: 강제 호출이 아닌 **계정 루트 `CLAUDE.md` / 프로젝트 루트 문서**를 통한 환경 주입. 플러그인은 "좋아서 쓰게 되는" 형태로 배포.

---

## Layer 1. 기본 Context 레이어 — 암묵지의 자연 주입

### 목적
비개발자의 바이브코딩 실패 원인 1순위는 "머릿속 암묵지를 AI에 못 옮기는 것". 본부/팀/프로젝트의 방향성을 **기본 컨텍스트**로 깔아둬서, 사용자가 의식하지 않아도 모든 응답이 회사 맥락 위에서 동작하게 한다.

### 구성
| 단위 | 담는 것 | 위치(안) |
|---|---|---|
| **본부** | 연 단위 목표, 사업 방향, 추구 가치 | `~/.claude/CLAUDE.md` 의 본부 섹션 또는 `org/<division>/CONTEXT.md` |
| **팀** | 연간 목표·KPI·OKR, 방향성 | 팀 공유 `TEAM_CONTEXT.md` |
| **프로젝트** | 이해관계 프로젝트, 협력사/외부 인물, 시장·도메인 정보, 보안 주의사항, 데이터 접근 방식(어떤 엑셀이 언제·어디서 갱신되는지 등) | 프로젝트 루트 `PROJECT_CONTEXT.md` (또는 `AGENTS.md`에 병합) |

### 작동 원리
- 세션 시작 시 hook 또는 `CLAUDE.md` import 체인으로 3계층 컨텍스트가 자동 로드.
- 사용자가 명시적으로 부르지 않아도 모든 응답이 이 위에서 동작.

### Context 갱신·배포 방식 (사내 환경 최적화)

**제약 조건**
- 회사 내부 정보 → public repo 절대 불가
- 인증 기반: **Microsoft Entra ID (구 Azure AD)**
- Bitbucket 계정은 **개발자만 보유** → 비개발자에게 git workflow 강요 불가
- 갱신 주체는 비개발자(본부장·팀장·기획자) → 편집 UX가 가장 중요
- 본부 → 팀 → 프로젝트 **계층 트리**가 시각적으로 깔끔해야 함

**권장 아키텍처: Azure DevOps Wiki를 단일 진실 소스(SSOT)로**

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

**왜 Azure DevOps Wiki인가**
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

→ **Azure DevOps Wiki가 압승.**
- 본부 → 팀 → 프로젝트 트리가 좌측 사이드바에 **그대로** 나옴 (사용자가 원한 그림).
- Wiki 뒤에 git repo가 있어서 **비개발자는 웹 GUI / 개발자·CI는 git** 두 세계가 자연스럽게 만난다.
- **Stakeholder 라이선스 = 무료**. Wiki 편집 권한 포함, Boards 권한만 빠짐 → 비개발자 수백 명 추가해도 0원.
- Entra ID 동일 테넌트이므로 추가 SSO 설정 0.
- AD 그룹 = Wiki 권한 그룹 직접 매핑.

**구체 동작**
1. **최초 설치**: `npx jinhak-harness init` → device-code/PKCE flow로 회사 계정 로그인 → AD 그룹 멤버십 조회 → 본부·팀 Wiki 경로 자동 매핑 → MSAL이 토큰을 OS 키체인에 저장.
2. **편집**: 본부장/팀장이 Azure DevOps Wiki 웹에서 markdown 직접 편집 (실시간 미리보기, 트리에서 페이지 추가/이동 자유).
3. **동기화**:
   - 자동: SessionStart hook이 Wiki API의 `version` 비교 후 변경 시만 pull (ETag 캐싱).
   - 수동: `/jinhak:context-sync` 슬래시.
4. **거버넌스**: Wiki는 git 백엔드이므로 **branch policy로 본부장 승인 PR 강제** 가능. 또는 가벼운 안은 권한만 분리 (본부 페이지는 본부 그룹만 편집).
5. **개발자 경로 (선택)**: 원하면 Bitbucket repo에서 CI로 Wiki git remote에 push 가능. 비개발자에겐 노출 X.

**대안 / 폴백**
- 회사에 이미 **Confluence**가 있다면 → 트리 구조 동일하게 활용 가능. REST API + Entra SSO 패턴 동일. MD가 네이티브가 아니라 storage format 변환 레이어만 추가.
- 사내 운영 인프라가 충분하다면 → **Outline 셀프호스트**가 UX 최고지만 운영 책임이 따라옴.
- 최후의 수단: SharePoint 폴더 트리 + Graph API (계층 시각화는 빈약함).

**거버넌스 메타데이터 (각 CONTEXT.md 상단 고정)**
```yaml
---
owner: <AD 계정>
review_cycle: quarterly        # 갱신 주기 강제
last_reviewed: 2026-05-01
next_review_due: 2026-08-01
classification: internal       # public / internal / confidential
---
```
- `next_review_due` 경과 시 hook이 "이 context는 N일 지났습니다, 오너에게 갱신 요청" 배너 출력.
- Stale context는 자동으로 신뢰도 표시 하향.

**보안 체크리스트**
- [ ] 토큰은 OS 키체인(Keychain/Credential Manager/libsecret)에만 저장, 평문 금지
- [ ] Conditional Access 정책 준수 (회사 단말기만 등)
- [ ] confidential 등급은 로컬 캐시 평문 금지 → 메모리 only
- [ ] Plugin 이 외부 LLM에 context 그대로 송신함을 사용자에게 명시 (Anthropic API 경유 동의)

---

## Layer 2. 데이터 접근성 — 파편화된 데이터를 일관된 방식으로

### 목적
AX 실패의 진짜 원인은 "AI 성능"이 아니라 "데이터 파편화 + 안전한 접근 부재". 바이브코딩 도구가 실제 업무 데이터에 **proxy 형태**로 닿을 수 있어야 한다.

### 구성

**2-1. 공유 문서 접근 (사내 통제 영역)**
- Teams 공유 문서(OneDrive·excel·pdf·word·hwp), Outlook 첨부, 사내 PDF 등에 **읽기 전용** 접근을 주는 사내 MCP 서버 / 전용 skill 배포.
- 팀 내 공유 문서일 경우 **루트 `AGENTS.md`에 "읽는 방식·목적"을 명시**하도록 가이드 → 디렉토리 진입 / 문서 접근 시점 hook에서 자동 활성화.

**2-2. Notion / Figma (공식 도구 활용)**
- Claude 공식 Notion/Figma skill 활용. 강제 X, **설치·권한·활용 사례만 공유**.
- 단, 사용자가 노션·피그마 링크를 던지면 → 플러그인이 "공식 플러그인 설치 안내 + 사내 활용 가이드 링크"를 자동 제시하여 자연 유도.

**2-3. 데이터 접근 필요성 안내 (인터뷰 모드)**
비개발자가 가장 자주 빠지는 함정:
- 필요한 정보가 context에 들어왔는지 모름
- 연결이 안 됐는데 됐다고 착각
- 추측으로 동작시킴

이를 막기 위해:
- **쉬운 언어의 인터뷰 모드**: 팩트 검증이 필요한 정보를 사용자에게 명확히 질문.
- 부족한 데이터는 Layer 2-1/2-2 방식으로 **어떻게 넣을지까지 안내**.
- **기본 응답 포맷 강제**:
  > 지금까지 N단계 중 M까지 진행 / 남은 것 / 다음 추천 행동
  
  → 모든 turn 끝에 자동 부착되도록 시스템 프롬프트 또는 stop-hook으로 강제.

---

## Layer 3. 업무 프로세스화 도구 = 현재 레포 (`jinhak-vibecode`)

### 정체성
**현재 이 레포가 Layer 3의 실체.** npm 패키지(`jinhak-harness` 등)로 배포되어, **agentskill 공통 규격**을 따르는 skill·command·hook 집합체로 동작한다.
→ Claude Code / Cursor / Codex / 기타 어떤 vibe-coding 도구를 쓰더라도, 사용자가 npm 한 줄 설치하면 동일한 작업 프로세스화 능력을 얻는다.

### 핵심 설계 원칙
1. **Tool-agnostic**: skill/agent는 표준 규격(`.md` 프롬프트 + 메타데이터)으로 작성 → Claude Code, Cursor, Codex CLI 등이 모두 읽을 수 있는 형태.
2. **npm 단일 채널 배포**: 사내 npm registry(Azure Artifacts) 또는 public npm + AD 인증 wrapper. 사용자는 `npx jinhak-harness init` 한 번이면 끝.
3. **자율성 보장**: 사용자가 다른 plugin(예: gstack, oh-my-claudecode)을 함께 써도 충돌 없음. Layer 1·2의 환경 주입이 깔려 있어 결과 품질은 일관.
4. **Skill = 도메인 답변만 받고 나머지 자동**: 사용자는 "무엇을 하려는지"만 말함. 분해·자동화 판별·온보딩·인터뷰는 skill이 처리.

### 배포 형태
```
npm package: jinhak-harness
  ├─ bin/                # CLI 진입점 (init / sync / doctor 등)
  ├─ commands/           # 슬래시 커맨드 (.md)
  ├─ hooks/              # SessionStart / PreToolUse / Stop 훅
  ├─ templates/          # CONTEXT.md / AGENTS.md 양식
  └─ skills/             # agentskill 규격 skill 묶음
```

설치 후 동작:
- `~/.claude/CLAUDE.md` 에 jinhak import 라인을 자동 삽입 (사용자 동의 후).
- Hook이 등록되어 다른 skill 사용 시에도 응답 포맷·context 주입이 작동.
- 다른 vibe-coding 도구(예: Cursor)에서도 `AGENTS.md` 규격을 통해 동일 동작.

### 포함될 skill / command (잠정)
| 이름 | 역할 |
|---|---|
| `/jinhak:init` | 본부·팀·프로젝트 식별 + AD 로그인 + CONTEXT 동기화 1회 셋업 |
| `/jinhak:context-sync` | SharePoint에서 최신 본부·팀 CONTEXT pull |
| `/jinhak:onboard` | 신규 사용자 인터뷰 → PROJECT_CONTEXT.md 자동 생성 |
| `/jinhak:plan` | 모호한 업무 요청 → 단계 분해 + 자동화 가능 영역 판별 |
| `/jinhak:interview` | 비개발자 친화 인터뷰 모드 (Layer 2-3 핵심) |
| `/jinhak:verify` | 결과물을 실 데이터 팩트와 대조 검증 |
| `/jinhak:status` | "어디까지/뭐 남고/다음 액션" 포맷 강제 출력 |
| `/jinhak:doctor` | 설치·인증·hook 상태 진단 |

### 다른 도구와 공존하는 법
- **gstack, oh-my-claudecode 등 외부 plugin이 설치되어 있어도** → Layer 1·2 (CLAUDE.md + AGENTS.md + hook)가 환경에 깔려 있으므로 그들의 응답에도 회사 맥락이 묻어남.
- 사용자가 본인이 만든 custom skill을 쓸 때도 동일 — skill이 어떤 LLM 호출을 하든, system context는 우리 것이 깔려있다.
- 충돌 방지를 위해 우리 hook 은 `jinhak:` namespace 만 건드리고, 다른 plugin 동작은 read-only 로 관찰.

---

## 설계 원칙 (= 다른 skill 써도 자연 반영되게 하는 방법)

1. **환경 주입 우선, 도구 호출 차선**
   `CLAUDE.md` / `AGENTS.md` / `PROJECT_CONTEXT.md` 같은 **항상 로드되는 문서**에 우리의 개념을 심는다. 사용자가 `/our-skill`을 안 불러도 응답에 묻어 나온다.

2. **Hook으로 무의식 보강**
   SessionStart / PreToolUse / Stop hook에서 context 로드·응답 포맷 강제·데이터 접근 안내를 자동 수행.

3. **플러그인은 "선물", 강제 아님**
   잘 만든 플러그인은 자연스럽게 쓰게 된다. 다른 skill을 쓰더라도 Layer 1·2가 깔려 있어 결과 품질이 우리 표준에 수렴.

4. **응답 포맷 통일**
   "어디까지 했고 / 뭐가 남았고 / 다음 추천 액션"을 모든 답변에 부착 → 비개발자가 길을 잃지 않음.

---

## 내 의견

**좋은 방향이다.** 특히 세 가지가 강하다:

1. **"강제 플러그인" 함정을 피한 것** — 사내 AX 프로젝트가 망하는 전형적 이유가 "전용 도구 강제 → 사용자가 우회 → 사용률 폭락". 환경 주입 방식은 이 함정을 피한다.
2. **데이터 파편화 진단이 정확** — 실제로 AX 컨설팅 사례 대부분의 bottleneck은 모델이 아니라 데이터 proxy 부재다. Layer 2가 진짜 핵심.
3. **응답 포맷 강제** — 비개발자에게 "지금 어디 와있나"를 알려주는 것만으로도 체감 품질이 크게 오른다.

**다만 짚고 갈 리스크:**

- **3계층 context 거버넌스 누가 책임지나** — 본부/팀 CONTEXT를 누가, 어떤 주기로 갱신하는가가 불명확하면 6개월 뒤 모두 stale. → 각 layer마다 "오너 + 갱신 주기"를 메타데이터로 강제할 것을 권장.
- **자율성 vs 표준화 충돌** — 사용자가 다른 skill을 자유롭게 쓰게 두면, 우리 응답 포맷이 깨질 수 있음. Stop-hook으로 포맷을 후처리 강제할지, 가이드로만 둘지 정책 결정 필요.
- **데이터 접근 권한 모델** — 사내 MCP 서버는 "누가 무엇을 읽을 수 있나"의 RBAC가 선결. 보안팀 협의 없이는 Layer 2-1이 가장 큰 블로커가 될 것.
- **Layer 3가 아직 비어 있음** — 가장 사용자 체감 큰 부분인데 구성이 비어 있다. 다음 단계로 Layer 3 도구 목록 인터뷰 권장.

**우선순위 제안**: Layer 1 템플릿화 → Layer 2-3 인터뷰 모드 + 응답 포맷 hook → Layer 2-1 사내 MCP → Layer 3 도구 순.
Layer 1과 "응답 포맷 hook"만 먼저 깔아도 체감 효과가 가장 크고, 정치적 비용도 가장 낮다.

# Layer 3: 업무 프로세스화 도구 — 현재 jinhak-vibecode 레포

> **상태**: 현 구현 + 로드맵 (v0.1.3 → v0.2 → v1.0)
> **연관 문서**: [VISION.md](./VISION.md) · [Layer 1](./LAYER1_CONTEXT_INFRA.md) · [Layer 2](./LAYER2_DATA_ACCESS.md)

---

## 1. 정체성

**현재 이 레포(`jinhak-vibecode`)가 Layer 3의 실체.**

npm 패키지(`jinhak-harness` 등)로 배포되어, **agentskill 공통 규격**을 따르는 skill·command·hook 집합체로 동작한다.

→ Claude Code / Cursor / Codex / Gemini / Antigravity / OpenCode **6개 호스트**에서 동일한 `/jinhak:*` 슬래시 커맨드로 작동.

---

## 2. 핵심 설계 원칙

### 2-1. Tool-agnostic

- skill/agent는 표준 규격(`.md` 프롬프트 + 메타데이터)으로 작성
- Claude Code, Cursor, Codex CLI 등 **어떤 도구든** 읽을 수 있는 형태

### 2-2. npm 단일 채널 배포

- 사내 npm registry (Azure Artifacts) 또는 public npm + AD 인증 wrapper
- 사용자는 한 줄 설치:
  ```bash
  JINHAK_AUTO_REGISTER=1 npm install -g jinhak-harness@beta
  ```
- postinstall이 6 호스트 CLI 자동 등록

### 2-3. 자율성 보장

- 사용자가 다른 plugin(gstack, oh-my-claudecode 등)을 함께 써도 **충돌 없음**
- Layer 1·2의 환경 주입이 깔려 있어 결과 품질은 일관

### 2-4. Skill = 도메인 답변만 받고 나머지 자동

- 사용자는 "무엇을 하려는지"만 말함
- 분해·자동화 판별·온보딩·인터뷰는 skill이 처리

---

## 3. 현 배포 형태

```
npm package: jinhak-harness (v0.1.3)
  ├─ bin/
  │   ├─ init.js              # 초기화 (AD 로그인 등)
  │   ├─ doctor.js            # 진단 (설치 상태 확인)
  │   └─ ...
  ├─ commands/                # 슬래시 커맨드 (.md + frontmatter)
  │   ├─ autopilot.md         # 자동 모드
  │   ├─ build.md             # 구축
  │   ├─ plan.md              # 계획
  │   ├─ verify.md            # 검증
  │   └─ ... (8개 메타 커맨드)
  ├─ hooks/                   # SessionStart / PreToolUse / Stop
  │   └─ ...
  ├─ templates/               # CONTEXT.md / AGENTS.md 양식
  │   ├─ CONTEXT.md
  │   └─ AGENTS.md
  └─ skills/                  # agentskill 규격 skill 묶음
      ├─ interview/
      ├─ plan/
      ├─ verify/
      └─ ...
```

### 설치 후 동작

1. **~/.claude/CLAUDE.md 자동 수정** (사용자 동의 후)
   ```
   @import jinhak/division.md
   @import jinhak/team.md
   ```

2. **Hook 등록**
   - SessionStart: Layer 1 context 로드
   - PreToolUse: Layer 2 데이터 접근 안내
   - Stop: 응답 포맷 강제

3. **다른 vibe-coding 도구에서도 동작**
   - Cursor / Gemini / Antigravity는 `AGENTS.md` 규격 스캔
   - 동일 기능 자동 로드

---

## 4. 현 포함 커맨드 (8종)

| 이름 | 역할 | 비개발자 노출 |
|---|---|---|
| `/jinhak:autopilot` | 자동 모드 (분해 → 구축 → 검증 자동화) | ✅ 노출 (v0.1) |
| `/jinhak:start` | 사용자 프로파일링 + 인터뷰 모드 시작 | ✅ 노출 (v0.1) |
| `/jinhak:build` | 구체적 결과물 생성 | ✅ 노출 (v0.1) |
| `/jinhak:verify` | 결과물을 팩트와 대조 검증 | ✅ 노출 (v0.1) |
| `/jinhak:plan` | 자동화 계획 수립 (분해) | ❌ 내부 (v0.2) |
| `/jinhak:interview` | 비개발자 친화 인터뷰 (Layer 2-3) | ❌ 내부 (v0.2) |
| `/jinhak:handoff` | 단계 전환 시 결정·리스크 기록 | ❌ 내부 (v0.2) |
| `/jinhak:status` | "어디까지/뭐 남고/다음" 포맷 강제 | ❌ 내부 (v0.2) |

**현 노출 전략**: v0.1.3은 **3개만 비개발자에게 노출** (`/jinhak:autopilot /jinhak:start /jinhak:build /jinhak:verify`). 나머지 5개는 내부 호출용.

자세한 내용은 [orchestration-spec.md](../orchestration-spec.md) 참조.

---

## 5. 다른 도구와 공존하는 법

### gstack, oh-my-claudecode 등 외부 plugin이 설치되어 있어도

- Layer 1·2 (CLAUDE.md + AGENTS.md + hook)가 환경에 깔려 있으므로
- 그들의 응답에도 **회사 맥락이 자동으로 묻어남**

### 사용자가 본인이 만든 custom skill을 쓸 때도 동일

- Skill이 어떤 LLM 호출을 하든
- System context는 우리 것이 깔려있음

### 충돌 방지

- 우리 hook은 `jinhak:` namespace만 건드림
- 다른 plugin 동작은 read-only로 관찰
- 응답 포맷 강제는 우리 커맨드에만 적용 (또는 후처리)

---

## 6. 교차참조 안내

자세한 내용은 다음 문서로 점프:

| 주제 | 문서 |
|---|---|
| 30초 설치 & 빠른 시작 | [README.md](../../README.md) |
| 상세 사용 시나리오 | [USAGE.md](../../USAGE.md) |
| 비개발자용 15분 가이드 | [GETTING_STARTED.md](../../GETTING_STARTED.md) |
| 메타 커맨드 스펙 | [orchestration-spec.md](../orchestration-spec.md) |
| 설계 결정 기록 | [docs/adr/](../adr/) |
| 토큰 경제 & 비용 추정 | [README.md §5](../../README.md) |

---

## 7. 로드맵

### v0.1.x (현재 — 2026-05)

✅ **완료**:
- npm 패키지 (v0.1.3)
- 6 호스트 자동 등록
- 8개 메타 커맨드 (3개 비개발자 노출 + 5개 내부)
- 인터뷰 모드 (`/jinhak:start`)
- 호스트별 인증 채널

### v0.2 (타겟: 2026-07)

🔄 **진행 중 / 계획**:
- Layer 1: SharePoint + Graph sync MVP (`context sync` 명령, 위임 인증)
- Layer 2: 응답 포맷 hook 구현
- Layer 2-3: 인터뷰 질문 카탈로그 확대 (직군별)
- 토큰 가드 라벨(🟢🟡🔴) 실측 데이터 수집
- 사내 npm registry (Azure Artifacts) 연동

### v1.0 (타겟: 2026-11)

🚀 **비전**:
- Layer 2-1: 사내 MCP 서버 (Teams/OneDrive/Outlook)
- 자동화 마켓플레이스 (직군별 템플릿 공유)
- eval 데이터셋 수집 + 벤치마크 정리
- 다른 호스트 확대 (GitHub Copilot 등)
- 사내 배포 자동화 CI/CD

---

## 8. 리스크

**자율성 vs 표준화 충돌**

- 사용자가 다른 skill을 자유롭게 쓰게 두면, 우리 **응답 포맷이 깨질 수 있음**
- Stop-hook으로 포맷을 후처리 강제할지, 가이드로만 둘지 **정책 결정 필수**

**다른 가능한 충돌**

- npm registry 분산 (public npm + 사내 Azure Artifacts) → 버전 관리 복잡도
- 호스트별 hook 구현 방식 차이 (Claude Code vs Cursor vs Codex CLI)
- 토큰 예산 초과 → "비용" 표기의 신뢰도 하락

---

## 9. 수집 필요 정보

다음 항목들이 확정되어야 v0.2+ 구현 가능:

- [ ] **사내 npm registry 운영 가능 여부** — Azure Artifacts 사용? public npm + 인증 wrapper?
- [ ] **AD 인증 wrapper 필요성** — npm 설치 시 AD 로그인 자동 검증?
- [ ] **호스트별 인증 채널 실사** — Claude Code / Cursor / Codex / Gemini / Antigravity / OpenCode 각각의 회사 라이선스 상태
- [ ] **토큰 가드 라벨(🟢🟡🔴) 실측 데이터** — v0.1 측정 후 v0.2 조정 기준 (예: 🟢 = 0~1K 토큰)
- [ ] **eval 데이터셋 사내 수집 동의** — with/without 벤치마크 학습용 (보안팀 승인)
- [ ] **사내 마켓플레이스 운영 책임자** — v1.0+ 마켓플레이스 비전 (skill 공유, 평가)
- [ ] **`dev-home/` 격리 모델의 다른 호스트 적용 검증** — 현재 Claude Code 위주, 다른 도구는?
- [ ] **기여 워크플로 (누가 PR 권한?)** — Bitbucket? GitHub? 내부 승인 프로세스?

---

## 관련 문서

- [VISION.md](./VISION.md) — 3-Layer 아키텍처 전체 개요
- [LAYER1_CONTEXT_INFRA.md](./LAYER1_CONTEXT_INFRA.md) — 기본 context 레이어
- [LAYER2_DATA_ACCESS.md](./LAYER2_DATA_ACCESS.md) — 데이터 접근성 설계
- [../../README.md](../../README.md) — 패키지 소개 & 설계 배경
- [../../USAGE.md](../../USAGE.md) — 사용 설명서
- [../orchestration-spec.md](../orchestration-spec.md) — 메타 커맨드 spec
- [../adr/](../adr/) — 아키텍처 결정 기록

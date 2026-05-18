> ## 문서 인덱스
> 전체 문서 인덱스는 다음 주소에서 확인할 수 있습니다: https://agentskills.io/llms.txt
> 더 깊이 탐색하기 전에 이 파일을 사용해 사용 가능한 모든 페이지를 먼저 확인하세요.

# Agent Skills 개요

> AI 에이전트에 새로운 능력과 전문성을 부여하는 표준화된 방식.

## Agent Skills란?

Agent Skills는 AI 에이전트의 능력을 전문화된 지식과 워크플로우로 확장하기 위한 가볍고 개방된 형식입니다.

본질적으로 skill은 `SKILL.md` 파일을 포함하는 폴더입니다. 이 파일에는 메타데이터(최소한 `name`과 `description`)와 에이전트가 특정 작업을 수행하는 방법을 알려주는 지시문이 들어 있습니다. 또한 skill은 스크립트, 참고 자료, 템플릿, 기타 리소스도 함께 묶을 수 있습니다.

```
my-skill/
├── SKILL.md          # 필수: 메타데이터 + 지시문
├── scripts/          # 선택: 실행 가능한 코드
├── references/       # 선택: 문서 자료
├── assets/           # 선택: 템플릿, 리소스
└── ...               # 추가 파일이나 디렉터리
```

## 왜 Agent Skills인가?

에이전트의 능력은 점점 향상되고 있지만, 실제 업무를 안정적으로 수행하는 데 필요한 컨텍스트가 부족한 경우가 많습니다. Skills는 절차적 지식과 회사·팀·사용자 고유의 컨텍스트를 휴대 가능하고 버전 관리되는 폴더로 패키징하여, 에이전트가 필요할 때 온디맨드로 로드할 수 있게 함으로써 이 문제를 해결합니다. 이를 통해 에이전트는 다음을 얻습니다:

* **도메인 전문성(Domain expertise)**: 법률 검토 프로세스에서부터 데이터 분석 파이프라인, 프레젠테이션 포맷팅에 이르기까지 전문화된 지식을 재사용 가능한 지시문과 리소스로 포착합니다.
* **반복 가능한 워크플로우(Repeatable workflows)**: 다단계 작업을 일관적이고 감사 가능한 절차로 전환합니다.
* **제품 간 재사용(Cross-product reuse)**: skill을 한 번만 만들면 skills를 지원하는 모든 에이전트에서 사용할 수 있습니다.

## Agent Skills는 어떻게 동작하는가?

에이전트는 **progressive disclosure(점진적 공개)** 방식으로 skill을 세 단계에 걸쳐 로드합니다:

1. **Discovery(발견)**: 시작 시점에 에이전트는 각 skill의 이름과 설명만 로드합니다. 해당 skill이 언제 관련이 있을지 알 수 있을 만큼만 가져오는 단계입니다.

2. **Activation(활성화)**: 작업이 어떤 skill의 description과 일치하면, 에이전트는 `SKILL.md`의 전체 지시문을 컨텍스트에 로드합니다.

3. **Execution(실행)**: 에이전트는 지시문을 따르며, 필요에 따라 번들된 코드를 실행하거나 참조 파일을 로드합니다.

전체 지시문은 작업이 필요로 할 때에만 로드되므로, 에이전트는 작은 컨텍스트 풋프린트로 많은 skill을 보유할 수 있습니다.

## Agent Skills는 어디에서 사용할 수 있는가?

Agent Skills는 수많은 AI 도구와 에이전틱 클라이언트에서 지원됩니다 — [Client Showcase](/clients)에서 일부를 살펴보세요!

대표적으로 지원되는 클라이언트에는 다음과 같은 것들이 있습니다: Claude, Claude Code, OpenAI Codex, GitHub Copilot, VS Code, Cursor, Gemini CLI, OpenCode, OpenHands, Goose, Roo Code, Kiro, Factory, Letta, Junie, Amp, Mux, Firebender, Piebald, Databricks Genie Code, Snowflake Cortex Code, Spring AI, Laravel Boost, TRAE, Workshop, Qodo, Ona, VT Code, Command Code, Mistral AI Vibe, Agentman, Autohand Code CLI, Emdash, Google AI Edge Gallery, nanobot, fast-agent, pi 등.

## 오픈 개발(Open development)

Agent Skills 형식은 원래 [Anthropic](https://www.anthropic.com/)에 의해 개발되었으며, 오픈 표준으로 공개되어 점점 더 많은 에이전트 제품에 채택되고 있습니다. 이 표준은 더 넓은 생태계의 기여에 열려 있습니다.

[GitHub](https://github.com/agentskills/agentskills) 또는 [Discord](https://discord.gg/MKPE9g8aUy)에서 토론에 참여하세요!

## Agent Skills 시작하기

<CardGroup cols={2}>
  <Card title="Quickstart" icon="rocket" href="/skill-creation/quickstart">
    첫 Agent Skill을 만들어 동작하는 모습을 확인해 보세요.
  </Card>

  <Card title="Specification" icon="file-code" href="/specification">
    Agent Skills의 완전한 형식 사양(specification)입니다.
  </Card>
</CardGroup>

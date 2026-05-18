> ## 문서 색인
> 전체 문서 색인은 다음 주소에서 가져올 수 있습니다: https://agentskills.io/llms.txt
> 더 깊이 탐색하기 전에 이 파일을 사용해 사용 가능한 모든 페이지를 확인하세요.

# 빠른 시작 (Quickstart)

> 첫 번째 Agent Skill을 만들어 VS Code에서 동작하는 모습을 확인해 봅니다.

이 튜토리얼에서는 난수 생성기를 사용해 주사위를 굴리는 기능을 에이전트에게 부여하는 스킬을 만들어 봅니다.

## 사전 준비

* [VS Code](https://code.visualstudio.com/) 와 [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot)

<Note>
  이 튜토리얼은 VS Code를 사용하지만, Agent Skills는 열린 포맷입니다. 동일한 스킬이 Claude Code와 OpenAI Codex를 포함한 호환 에이전트 어디에서나 작동합니다.
</Note>

## 스킬 만들기

스킬은 `SKILL.md` 파일을 포함한 폴더입니다. VS Code는 기본적으로 `.agents/skills/` 경로에서 스킬을 찾습니다. 프로젝트에 `.agents/skills/roll-dice/SKILL.md`를 생성하세요:

````markdown .agents/skills/roll-dice/SKILL.md theme={null}
---
name: roll-dice
description: Roll dice using a random number generator. Use when asked to roll a die (d6, d20, etc.), roll dice, or generate a random dice roll.
---

To roll a die, use the following command that generates a random number from 1
to the given number of sides:

```bash
echo $((RANDOM % <sides> + 1))
```

```powershell
Get-Random -Minimum 1 -Maximum (<sides> + 1)
```

Replace `<sides>` with the number of sides on the die (e.g., 6 for a standard
die, 20 for a d20).
````

이게 전부입니다 — 파일 하나, 20줄 미만입니다. 각 부분의 역할은 다음과 같습니다:

* **`name`** — 스킬에 대한 짧은 식별자입니다. 폴더 이름과 일치해야 합니다.
* **`description`** — 이 스킬을 언제 사용할지 에이전트에게 알려줍니다. 에이전트는 이를 보고 스킬을 활성화할지 결정합니다.
* **본문(body)** — 스킬이 활성화되었을 때 에이전트가 따르는 지침입니다. 여기서는 사용자 요청에서 받은 면 수를 대입하여 터미널 명령으로 난수를 생성하도록 안내합니다.

## 직접 사용해보기

1. VS Code에서 프로젝트를 엽니다.
2. Copilot Chat 패널을 엽니다.
3. 채팅 패널 하단의 모드 드롭다운에서 **Agent** 모드를 선택합니다.
4. `/skills`를 입력해 목록에 `roll-dice`가 나타나는지 확인합니다. 보이지 않으면 파일이 프로젝트 루트 기준으로 `.agents/skills/roll-dice/SKILL.md` 경로에 있는지 확인하세요.
5. 이렇게 요청하세요: **"Roll a d20"**

에이전트가 `roll-dice` 스킬을 활성화할 것입니다. 터미널 명령 실행 권한을 물어볼 수 있는데, 허용하세요. 명령이 실행되고 1부터 20 사이의 난수가 반환됩니다.

<Note>
  도구 사용의 안정성은 모델마다 차이가 있습니다 — 어떤 모델은 스킬의 지시를 따르고 명령을 일관되게 실행하는 반면, 다른 모델은 스스로 답하려 할 수 있습니다. 에이전트가 터미널 명령을 실행하지 않고 응답한다면 모델 드롭다운에서 다른 모델을 선택해 보세요.
</Note>

## 동작 원리

내부적으로 일어난 일은 다음과 같습니다:

1. **발견(Discovery)** — 채팅 세션이 시작될 때 에이전트는 기본 스킬 디렉터리를 스캔하여 여러분의 스킬을 찾았습니다. 스킬이 언제 관련될 수 있는지 알 수 있을 정도만, 즉 `name`과 `description`만 읽었습니다.

2. **활성화(Activation)** — 주사위 굴리기에 대해 질문하자 에이전트는 그 질문을 스킬의 description과 매칭하여 `SKILL.md` 본문 전체를 컨텍스트에 로드했습니다.

3. **실행(Execution)** — 에이전트는 본문의 지침을 따라, 요청에 명시된 면 수에 맞게 터미널 명령을 조정해 실행했습니다.

이 과정은 **점진적 공개(progressive disclosure)** 를 사용하여 에이전트가 모든 지침을 미리 로드하지 않고도 다수의 스킬에 접근할 수 있게 합니다.

## 다음 단계

이제 동작하는 Agent Skill을 만들었습니다. 다음 단계로 진행해 보세요:

* **[Best practices](/skill-creation/best-practices)** — 잘 한정되고 효과적인 스킬을 작성하는 방법.
* **[Optimizing skill descriptions](/skill-creation/optimizing-descriptions)** — 스킬의 description을 테스트하고 개선해 올바른 프롬프트에서 활성화되도록 하기.
* **[Specification](/specification)** — `SKILL.md` 파일의 전체 포맷 레퍼런스.
* **[Example skills](https://github.com/anthropics/skills)** — GitHub에서 실제 스킬들을 살펴보기.

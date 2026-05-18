> ## 문서 색인
> 전체 문서 색인은 다음에서 가져올 수 있습니다: https://agentskills.io/llms.txt
> 더 자세히 탐색하기 전에 이 파일을 사용해 사용 가능한 모든 페이지를 확인하세요.

# 스킬 출력 품질 평가하기

> eval 기반 반복(eval-driven iteration)을 사용해 스킬이 좋은 출력을 만들어내는지 테스트하는 방법.

스킬을 작성하고, 어떤 프롬프트에 시도해 보았더니 잘 작동하는 것 같았습니다. 하지만 정말로 안정적으로 동작할까요 — 다양한 프롬프트, 엣지 케이스에서, 그리고 스킬이 없을 때보다 더 나은 결과를 낼까요? 구조화된 평가(evals)를 실행하면 이런 질문에 답할 수 있고, 스킬을 체계적으로 개선하기 위한 피드백 루프를 얻을 수 있습니다.

## 테스트 케이스 설계하기

테스트 케이스는 세 부분으로 구성됩니다:

* **Prompt(프롬프트)**: 현실적인 사용자 메시지 — 실제로 누군가가 입력할 법한 종류의 내용입니다.
* **Expected output(기대 출력)**: 성공이 어떤 모습인지에 대한 사람이 읽을 수 있는 설명.
* **Input files(입력 파일)** (선택): 스킬이 작업할 때 필요한 파일들.

테스트 케이스는 스킬 디렉터리 안의 `evals/evals.json`에 저장합니다:

```json evals/evals.json theme={null}
{
  "skill_name": "csv-analyzer",
  "evals": [
    {
      "id": 1,
      "prompt": "I have a CSV of monthly sales data in data/sales_2025.csv. Can you find the top 3 months by revenue and make a bar chart?",
      "expected_output": "A bar chart image showing the top 3 months by revenue, with labeled axes and values.",
      "files": ["evals/files/sales_2025.csv"]
    },
    {
      "id": 2,
      "prompt": "there's a csv in my downloads called customers.csv, some rows have missing emails — can you clean it up and tell me how many were missing?",
      "expected_output": "A cleaned CSV with missing emails handled, plus a count of how many were missing.",
      "files": ["evals/files/customers.csv"]
    }
  ]
}
```

**좋은 테스트 프롬프트를 작성하기 위한 팁:**

* **테스트 케이스 2~3개로 시작하세요.** 첫 결과를 보기 전에는 과도하게 투자하지 마세요. 나중에 얼마든지 확장할 수 있습니다.
* **프롬프트를 다양화하세요.** 표현 방식, 디테일 수준, 격식의 정도를 다르게 하세요. 어떤 프롬프트는 캐주얼하게("hey can you clean up this csv"), 다른 프롬프트는 정확하게("Parse the CSV at data/input.csv, drop rows where column B is null, and write the result to data/output.csv") 작성하세요.
* **엣지 케이스를 다루세요.** 경계 조건을 테스트하는 프롬프트를 최소한 하나는 포함하세요 — 잘못된 형식의 입력, 비정상적인 요청, 또는 스킬의 지시 사항이 모호할 수 있는 경우 등.
* **현실적인 문맥을 사용하세요.** 실제 사용자는 파일 경로, 컬럼 이름, 개인적 맥락을 언급합니다. "process this data" 같은 프롬프트는 너무 모호해서 유의미한 테스트가 되지 않습니다.

아직 구체적인 통과/실패 기준을 정의하는 것에 신경 쓰지 마세요 — 프롬프트와 기대 출력만 작성하면 됩니다. 첫 실행 결과를 본 후에 자세한 검사 항목(assertions, 어서션이라고 부릅니다)을 추가하게 됩니다.

## eval 실행하기

핵심 패턴은 각 테스트 케이스를 두 번 실행하는 것입니다: 한 번은 **스킬을 사용해서(with the skill)**, 또 한 번은 **스킬 없이(without it)** (또는 이전 버전으로). 이렇게 하면 비교할 베이스라인이 생깁니다.

### 워크스페이스 구조

스킬 디렉터리 옆에 워크스페이스 디렉터리를 두고 eval 결과를 정리하세요. 전체 eval 루프를 한 번 거칠 때마다 별도의 `iteration-N/` 디렉터리를 사용합니다. 그 안에서 각 테스트 케이스는 `with_skill/`과 `without_skill/` 하위 디렉터리를 가진 eval 디렉터리를 갖습니다:

```
csv-analyzer/
├── SKILL.md
└── evals/
    └── evals.json
csv-analyzer-workspace/
└── iteration-1/
    ├── eval-top-months-chart/
    │   ├── with_skill/
    │   │   ├── outputs/       # 실행 결과로 만들어진 파일들
    │   │   ├── timing.json    # 토큰과 소요 시간
    │   │   └── grading.json   # 어서션 채점 결과
    │   └── without_skill/
    │       ├── outputs/
    │       ├── timing.json
    │       └── grading.json
    ├── eval-clean-missing-emails/
    │   ├── with_skill/
    │   │   ├── outputs/
    │   │   ├── timing.json
    │   │   └── grading.json
    │   └── without_skill/
    │       ├── outputs/
    │       ├── timing.json
    │       └── grading.json
    └── benchmark.json         # 집계된 통계
```

직접 손으로 작성하는 주요 파일은 `evals/evals.json`입니다. 다른 JSON 파일들(`grading.json`, `timing.json`, `benchmark.json`)은 eval 과정 중 — 에이전트, 스크립트, 또는 당신에 의해 — 생성됩니다.

### 실행 스폰(spawning)하기

각 eval 실행은 깨끗한 컨텍스트에서 시작해야 합니다 — 이전 실행이나 스킬 개발 과정에서 남은 상태가 없어야 합니다. 이렇게 해야 에이전트가 오직 `SKILL.md`가 지시하는 내용만 따르게 됩니다. 서브에이전트(subagent)를 지원하는 환경(예: Claude Code)에서는 이런 격리가 자연스럽게 이뤄집니다 — 각 자식 태스크가 새로운 상태로 시작합니다. 서브에이전트가 없다면 각 실행마다 별도 세션을 사용하세요.

각 실행마다 다음을 제공하세요:

* 스킬 경로 (또는 베이스라인의 경우 스킬 없음)
* 테스트 프롬프트
* 입력 파일
* 출력 디렉터리

다음은 with-skill 단일 실행에 대해 에이전트에게 줄 수 있는 지시 예시입니다:

```
Execute this task:
- Skill path: /path/to/csv-analyzer
- Task: I have a CSV of monthly sales data in data/sales_2025.csv.
  Can you find the top 3 months by revenue and make a bar chart?
- Input files: evals/files/sales_2025.csv
- Save outputs to: csv-analyzer-workspace/iteration-1/eval-top-months-chart/with_skill/outputs/
```

베이스라인의 경우, 같은 프롬프트를 사용하되 스킬 경로 없이 실행하고 `without_skill/outputs/`에 저장합니다.

기존 스킬을 개선할 때는 이전 버전을 베이스라인으로 사용하세요. 편집하기 전에 스냅샷을 떠 두고(`cp -r <skill-path> <workspace>/skill-snapshot/`), 베이스라인 실행을 스냅샷을 가리키도록 한 뒤 `without_skill/` 대신 `old_skill/outputs/`에 저장하세요.

### 타이밍 데이터 수집하기

타이밍 데이터를 사용하면 스킬이 베이스라인 대비 얼마나 많은 시간과 토큰을 소비하는지 비교할 수 있습니다 — 출력 품질을 극적으로 향상시키지만 토큰 사용량을 3배로 늘리는 스킬은, 더 좋으면서 더 저렴한 스킬과는 다른 트레이드오프입니다. 각 실행이 끝나면 토큰 수와 소요 시간을 기록하세요:

```json timing.json theme={null}
{
  "total_tokens": 84852,
  "duration_ms": 23332
}
```

<Tip>
  Claude Code에서는 서브에이전트 태스크가 끝나면 [task completion notification](https://platform.claude.com/docs/en/agent-sdk/typescript#sdk-task-notification-message)에 `total_tokens`와 `duration_ms`가 포함됩니다. 이 값들은 즉시 저장하세요 — 다른 어디에도 영구 저장되지 않습니다.
</Tip>

## 어서션(Assertions) 작성하기

어서션은 출력이 무엇을 포함하거나 달성해야 하는지에 대한 검증 가능한 진술입니다. 어서션은 첫 실행 결과를 본 후에 추가하세요 — 스킬이 실행되기 전까지는 "좋은 결과"가 어떤 모습인지 모르는 경우가 많습니다.

좋은 어서션:

* `"The output file is valid JSON"` — 프로그램적으로 검증 가능합니다.
* `"The bar chart has labeled axes"` — 구체적이며 관찰 가능합니다.
* `"The report includes at least 3 recommendations"` — 셀 수 있습니다.

약한 어서션:

* `"The output is good"` — 채점하기에 너무 모호합니다.
* `"The output uses exactly the phrase 'Total Revenue: $X'"` — 너무 빈약합니다(brittle); 표현만 다른 올바른 출력이 실패로 처리됩니다.

모든 항목에 어서션이 필요한 것은 아닙니다. 어떤 품질(글의 스타일, 시각적 디자인, 출력이 "잘 느껴지는지" 여부)은 통과/실패 검사로 분해하기 어렵습니다. 이런 항목들은 [사람의 리뷰](#reviewing-results-with-a-human)에서 더 잘 잡힙니다. 어서션은 객관적으로 확인할 수 있는 항목에 한정하세요.

`evals/evals.json`의 각 테스트 케이스에 어서션을 추가하세요:

```json evals/evals.json highlight={9-14} theme={null}
{
  "skill_name": "csv-analyzer",
  "evals": [
    {
      "id": 1,
      "prompt": "I have a CSV of monthly sales data in data/sales_2025.csv. Can you find the top 3 months by revenue and make a bar chart?",
      "expected_output": "A bar chart image showing the top 3 months by revenue, with labeled axes and values.",
      "files": ["evals/files/sales_2025.csv"],
      "assertions": [
        "The output includes a bar chart image file",
        "The chart shows exactly 3 months",
        "Both axes are labeled",
        "The chart title or caption mentions revenue"
      ]
    }
  ]
}
```

## 출력 채점하기

채점이란 각 어서션을 실제 출력에 대해 평가하고 **PASS** 또는 **FAIL**과 구체적인 근거를 함께 기록하는 것입니다. 근거는 단순 의견이 아니라 출력의 내용을 인용하거나 참조해야 합니다.

가장 간단한 방법은 출력과 어서션을 LLM에 주고 각각을 평가하도록 하는 것입니다. 코드로 확인 가능한 어서션(유효한 JSON 여부, 정확한 행 수, 예상한 크기의 파일 존재 여부)에 대해서는 검증 스크립트를 사용하세요 — 기계적 검사에서는 스크립트가 LLM 판단보다 더 안정적이고 반복(iteration) 간에 재사용 가능합니다.

```json grading.json theme={null}
{
  "assertion_results": [
    {
      "text": "The output includes a bar chart image file",
      "passed": true,
      "evidence": "Found chart.png (45KB) in outputs directory"
    },
    {
      "text": "The chart shows exactly 3 months",
      "passed": true,
      "evidence": "Chart displays bars for March, July, and November"
    },
    {
      "text": "Both axes are labeled",
      "passed": false,
      "evidence": "Y-axis is labeled 'Revenue ($)' but X-axis has no label"
    },
    {
      "text": "The chart title or caption mentions revenue",
      "passed": true,
      "evidence": "Chart title reads 'Top 3 Months by Revenue'"
    }
  ],
  "summary": {
    "passed": 3,
    "failed": 1,
    "total": 4,
    "pass_rate": 0.75
  }
}
```

### 채점 원칙

* **PASS에는 구체적인 근거를 요구하세요.** 의심스러우면 통과시키지 마세요. 어서션이 "includes a summary"라고 하고 출력에 "Summary"라는 제목의 섹션이 있지만 모호한 한 문장만 들어 있다면, 이는 FAIL입니다 — 라벨은 있지만 실체가 없기 때문입니다.
* **결과뿐만 아니라 어서션 자체도 검토하세요.** 채점하는 과정에서 어떤 어서션이 너무 쉬운지(스킬 품질과 상관없이 항상 PASS), 너무 어려운지(출력이 좋아도 항상 FAIL), 검증 불가능한지(출력만 보고 확인할 수 없음) 알아차리세요. 다음 반복을 위해 이런 것들을 수정하세요.

<Tip>
  두 가지 스킬 버전을 비교할 때는 **블라인드 비교(blind comparison)**를 시도해 보세요: 어떤 출력이 어떤 버전에서 나왔는지 밝히지 않은 채 두 출력을 LLM 심사관(judge)에게 제시합니다. 심사관은 어느 버전이 "더 나아야 하는지"에 대한 편향 없이 자체 기준으로 전체적인 품질(구성, 형식, 사용성, 마감)을 평가합니다. 이는 어서션 채점을 보완합니다: 두 출력이 모든 어서션을 통과하더라도 전체 품질에서는 크게 다를 수 있습니다.
</Tip>

## 결과 집계하기

해당 반복(iteration)의 모든 실행이 채점되면, 설정(configuration)별로 요약 통계를 계산해 eval 디렉터리들 옆의 `benchmark.json`에 저장하세요 (예: `csv-analyzer-workspace/iteration-1/benchmark.json`):

```json benchmark.json theme={null}
{
  "run_summary": {
    "with_skill": {
      "pass_rate": { "mean": 0.83, "stddev": 0.06 },
      "time_seconds": { "mean": 45.0, "stddev": 12.0 },
      "tokens": { "mean": 3800, "stddev": 400 }
    },
    "without_skill": {
      "pass_rate": { "mean": 0.33, "stddev": 0.10 },
      "time_seconds": { "mean": 32.0, "stddev": 8.0 },
      "tokens": { "mean": 2100, "stddev": 300 }
    },
    "delta": {
      "pass_rate": 0.50,
      "time_seconds": 13.0,
      "tokens": 1700
    }
  }
}
```

`delta`는 스킬이 무엇을 비용으로 치르는지(시간 증가, 토큰 증가)와 무엇을 얻는지(더 높은 합격률)를 알려줍니다. 13초가 더 걸리는 대신 합격률이 50%포인트 향상되는 스킬이라면 충분히 가치 있을 것입니다. 반면 토큰 사용량이 두 배로 늘면서 합격률이 2%포인트만 오르는 스킬이라면 그렇지 않을 수 있습니다.

<Note>
  표준편차(`stddev`)는 eval당 여러 번 실행해야 의미가 있습니다. 초기 반복에서 테스트 케이스가 2~3개이고 단일 실행만 한다면, 원시 합격 수와 delta에 집중하세요 — 통계적 척도는 테스트 세트를 확장하고 각 eval을 여러 번 실행할 때 유용해집니다.
</Note>

## 패턴 분석하기

집계 통계는 중요한 패턴을 숨길 수 있습니다. 벤치마크를 계산한 후에는:

* **두 설정 모두에서 항상 통과하는 어서션은 제거하거나 교체하세요.** 이런 어서션은 유용한 정보를 주지 못합니다 — 모델이 스킬 없이도 문제없이 처리합니다. 실제 스킬 가치를 반영하지 않은 채 with-skill 합격률만 부풀립니다.
* **두 설정 모두에서 항상 실패하는 어서션은 조사하세요.** 어서션이 잘못되었거나(모델이 할 수 없는 것을 요구), 테스트 케이스가 너무 어렵거나, 잘못된 것을 확인하고 있는 경우입니다. 다음 반복 전에 이를 고치세요.
* **스킬이 있을 때는 통과하지만 없을 때는 실패하는 어서션을 연구하세요.** 여기서 스킬이 분명히 가치를 더하고 있습니다. *왜* 그런지 이해하세요 — 어떤 지시나 스크립트가 차이를 만들었나요?
* **결과가 실행마다 일관되지 않다면 지시를 더 단단히(tighten) 하세요.** 같은 eval이 어떤 때는 통과하고 어떤 때는 실패한다면(벤치마크에서 높은 `stddev`로 나타남), 그 eval이 불안정(flaky)하거나(모델의 무작위성에 민감), 스킬의 지시가 모델이 매번 다르게 해석할 만큼 모호할 수 있습니다. 모호함을 줄이기 위해 예시나 더 구체적인 가이드를 추가하세요.
* **시간 및 토큰 이상치(outlier)를 확인하세요.** 어떤 eval이 다른 것들보다 3배 더 오래 걸린다면, 실행 트랜스크립트(모델이 실행 중에 한 일의 전체 로그)를 읽어 병목을 찾아내세요.

## 사람과 함께 결과 리뷰하기

어서션 채점과 패턴 분석은 많은 것을 잡아내지만, 당신이 어서션으로 작성하기로 생각한 항목만 확인합니다. 사람 리뷰어는 신선한 관점을 가져옵니다 — 당신이 예상하지 못한 문제를 잡아내고, 출력이 기술적으로 옳지만 핵심을 놓치는 경우를 알아차리며, 통과/실패로 표현하기 어려운 문제를 발견합니다. 각 테스트 케이스에 대해 실제 출력과 채점 결과를 함께 검토하세요.

각 테스트 케이스에 대한 구체적인 피드백을 기록하고 워크스페이스에 저장하세요 (예: eval 디렉터리들 옆의 `feedback.json`):

```json feedback.json theme={null}
{
  "eval-top-months-chart": "The chart is missing axis labels and the months are in alphabetical order instead of chronological.",
  "eval-clean-missing-emails": ""
}
```

"The chart is missing axis labels"는 실행 가능한 피드백이지만, "looks bad"는 그렇지 않습니다. 피드백이 비어 있다는 것은 출력이 괜찮아 보였다는 의미이며 — 그 테스트 케이스는 당신의 리뷰를 통과한 것입니다. [반복 단계](#iterating-on-the-skill)에서는 구체적인 불만이 있었던 테스트 케이스에 개선을 집중하세요.

## 스킬 개선 반복하기

채점과 리뷰가 끝나면 세 가지 신호 원천이 생깁니다:

* **실패한 어서션**은 구체적인 구멍을 가리킵니다 — 누락된 단계, 불명확한 지시, 또는 스킬이 처리하지 못하는 사례.
* **사람의 피드백**은 더 넓은 품질 문제를 가리킵니다 — 접근 방식이 잘못됐거나, 출력 구조가 빈약하거나, 기술적으로는 맞지만 도움이 되지 않는 결과를 만들어낸 경우.
* **실행 트랜스크립트**는 *왜* 일이 잘못됐는지를 드러냅니다. 에이전트가 어떤 지시를 무시했다면 그 지시가 모호할 수 있습니다. 에이전트가 비생산적인 단계에 시간을 썼다면 그런 지시는 단순화하거나 제거할 필요가 있을 수 있습니다.

이 신호들을 스킬 개선으로 바꾸는 가장 효과적인 방법은 세 가지 모두를 — 현재 `SKILL.md`와 함께 — LLM에 주고 변경안을 제안하도록 하는 것입니다. LLM은 실패한 어서션, 리뷰어 불만, 트랜스크립트 동작 사이의 패턴을 종합할 수 있으며, 이를 수동으로 연결하는 일은 지루합니다. LLM에 프롬프트할 때는 다음 가이드를 포함하세요:

* **피드백에서 일반화하세요.** 스킬은 테스트 케이스뿐 아니라 매우 다양한 프롬프트에서 사용될 것입니다. 수정은 특정 사례에 대한 좁은 패치를 추가하는 대신 근본적인 이슈를 넓게 다루어야 합니다.
* **스킬을 가볍게 유지하세요.** 더 적지만 더 나은 지시가 보통 방대한 규칙 모음보다 더 좋은 성능을 냅니다. 트랜스크립트가 낭비된 작업(불필요한 검증, 필요 없는 중간 출력)을 보여준다면 그 지시를 제거하세요. 더 많은 규칙을 추가해도 합격률이 정체된다면 스킬이 과도하게 제약돼 있을 수 있습니다 — 지시를 제거해 보고 결과가 유지되거나 개선되는지 확인하세요.
* **이유를 설명하세요.** 추론에 기반한 지시("X를 하라, 왜냐하면 Y가 Z를 유발하기 때문이다")가 경직된 지시("ALWAYS do X, NEVER do Y")보다 더 잘 작동합니다. 모델은 목적을 이해할 때 지시를 더 안정적으로 따릅니다.
* **반복 작업을 번들로 묶으세요.** 모든 테스트 실행이 비슷한 헬퍼 스크립트(차트 빌더, 데이터 파서)를 독립적으로 작성한다면, 이는 그 스크립트를 스킬의 `scripts/` 디렉터리에 번들로 포함해야 한다는 신호입니다. 자세한 내용은 [Using scripts](/skill-creation/using-scripts)를 참고하세요.

### 루프

1. eval 신호와 현재 `SKILL.md`를 LLM에 주고 개선안을 제안하도록 합니다.
2. 변경 사항을 검토하고 적용합니다.
3. 새로운 `iteration-<N+1>/` 디렉터리에서 모든 테스트 케이스를 다시 실행합니다.
4. 새 결과를 채점하고 집계합니다.
5. 사람과 함께 검토합니다. 반복합니다.

결과에 만족하거나, 피드백이 일관되게 비어 있거나, 반복 간에 더 이상 의미 있는 개선이 보이지 않으면 멈추세요.

<Tip>
  [`skill-creator`](https://github.com/anthropics/skills/tree/main/skills/skill-creator) 스킬은 이 워크플로의 많은 부분을 자동화합니다 — eval 실행, 어서션 채점, 벤치마크 집계, 그리고 사람 리뷰를 위한 결과 제시까지 처리합니다.
</Tip>

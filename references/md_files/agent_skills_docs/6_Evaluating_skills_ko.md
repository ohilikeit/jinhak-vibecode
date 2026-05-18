> ## 문서 인덱스
> 전체 문서 인덱스는 다음에서 가져오세요: https://agentskills.io/llms.txt
> 더 자세히 탐색하기 전에 이 파일을 사용해 사용 가능한 모든 페이지를 확인하세요.

# 스킬 출력 품질 평가하기

> eval 기반 반복(eval-driven iteration)을 활용해 스킬이 좋은 출력을 만들어내는지 테스트하는 방법.

스킬을 작성하고, 어떤 프롬프트로 시도해봤더니 잘 동작하는 것처럼 보였습니다. 하지만 정말로 안정적으로 동작할까요 — 다양한 프롬프트에서, 엣지 케이스에서, 그리고 스킬이 없는 경우보다 더 낫게? 구조화된 평가(evals)를 실행하면 이러한 질문에 답할 수 있고, 스킬을 체계적으로 개선할 수 있는 피드백 루프를 얻을 수 있습니다.

## 테스트 케이스 설계하기

테스트 케이스는 세 가지 부분으로 구성됩니다:

* **Prompt**: 현실적인 사용자 메시지 — 실제로 누군가가 입력할 법한 내용.
* **Expected output**: 성공이 어떤 모습인지에 대한 사람이 읽을 수 있는 설명.
* **Input files** (선택): 스킬이 처리해야 하는 파일들.

테스트 케이스는 스킬 디렉터리 내의 `evals/evals.json`에 저장합니다:

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

* **2~3개의 테스트 케이스로 시작하세요.** 첫 결과를 보기 전에 너무 많이 투자하지 마세요. 나중에 확장할 수 있습니다.
* **프롬프트를 다양화하세요.** 다양한 표현, 디테일 수준, 격식 수준을 사용하세요. 어떤 프롬프트는 캐주얼하게("hey can you clean up this csv"), 어떤 것은 정확하게("Parse the CSV at data/input.csv, drop rows where column B is null, and write the result to data/output.csv") 작성하세요.
* **엣지 케이스를 다루세요.** 경계 조건을 테스트하는 프롬프트를 최소 하나는 포함하세요 — 잘못된 입력, 비정상적인 요청, 또는 스킬의 지시가 모호할 수 있는 케이스.
* **현실적인 컨텍스트를 사용하세요.** 실제 사용자는 파일 경로, 컬럼 이름, 개인적인 맥락을 언급합니다. "process this data" 같은 프롬프트는 너무 모호해서 의미 있는 테스트가 되지 않습니다.

아직은 구체적인 pass/fail 체크를 정의하는 데 신경 쓰지 마세요 — 프롬프트와 expected output만 작성합니다. 첫 실행 결과를 본 뒤에 상세한 체크(어서션, assertions)를 추가하면 됩니다.

## eval 실행하기

핵심 패턴은 각 테스트 케이스를 두 번 실행하는 것입니다: 한 번은 **스킬과 함께**, 다른 한 번은 **스킬 없이**(또는 이전 버전으로). 이렇게 하면 비교할 수 있는 베이스라인을 얻을 수 있습니다.

### 작업공간 구조

스킬 디렉터리 옆에 별도의 작업공간 디렉터리를 만들어 eval 결과를 정리하세요. 전체 eval 루프를 한 바퀴 돌 때마다 각자의 `iteration-N/` 디렉터리를 갖게 됩니다. 그 안에서 각 테스트 케이스는 `with_skill/`과 `without_skill/` 하위 디렉터리를 갖는 eval 디렉터리를 갖습니다:

```
csv-analyzer/
├── SKILL.md
└── evals/
    └── evals.json
csv-analyzer-workspace/
└── iteration-1/
    ├── eval-top-months-chart/
    │   ├── with_skill/
    │   │   ├── outputs/       # Files produced by the run
    │   │   ├── timing.json    # Tokens and duration
    │   │   └── grading.json   # Assertion results
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
    └── benchmark.json         # Aggregated statistics
```

직접 손으로 작성하는 주요 파일은 `evals/evals.json`입니다. 다른 JSON 파일들(`grading.json`, `timing.json`, `benchmark.json`)은 eval 과정에서 — 에이전트, 스크립트, 또는 사람에 의해 — 생성됩니다.

### 실행 띄우기(Spawning runs)

각 eval 실행은 깨끗한 컨텍스트로 시작해야 합니다 — 이전 실행이나 스킬 개발 과정에서 남은 상태가 없어야 합니다. 이렇게 해야 에이전트가 오직 `SKILL.md`가 지시하는 것만 따르게 됩니다. 서브에이전트를 지원하는 환경(예: Claude Code)에서는 이러한 격리가 자연스럽게 이루어집니다 — 각 자식 태스크는 새 상태로 시작합니다. 서브에이전트가 없는 경우, 각 실행마다 별도의 세션을 사용하세요.

각 실행마다 다음을 제공합니다:

* 스킬 경로(또는 베이스라인의 경우 스킬 없음)
* 테스트 프롬프트
* 입력 파일들
* 출력 디렉터리

다음은 with-skill 단일 실행에 대해 에이전트에게 줄 수 있는 지시문의 예시입니다:

```
Execute this task:
- Skill path: /path/to/csv-analyzer
- Task: I have a CSV of monthly sales data in data/sales_2025.csv.
  Can you find the top 3 months by revenue and make a bar chart?
- Input files: evals/files/sales_2025.csv
- Save outputs to: csv-analyzer-workspace/iteration-1/eval-top-months-chart/with_skill/outputs/
```

베이스라인은 같은 프롬프트를 사용하되 스킬 경로를 제외하고, `without_skill/outputs/`에 저장합니다.

기존 스킬을 개선하는 경우, 이전 버전을 베이스라인으로 사용하세요. 편집하기 전에 스냅샷을 만들고(`cp -r <skill-path> <workspace>/skill-snapshot/`), 베이스라인 실행을 스냅샷을 향하도록 한 뒤, `without_skill/` 대신 `old_skill/outputs/`에 저장하세요.

### 타이밍 데이터 수집하기

타이밍 데이터는 스킬이 베이스라인 대비 얼마나 많은 시간과 토큰을 소모하는지 비교할 수 있게 해줍니다 — 출력 품질을 극적으로 개선했지만 토큰 사용량을 세 배로 늘리는 스킬은, 더 좋으면서 더 저렴한 스킬과는 다른 트레이드오프입니다. 각 실행이 완료되면 토큰 수와 소요 시간을 기록하세요:

```json timing.json theme={null}
{
  "total_tokens": 84852,
  "duration_ms": 23332
}
```

<Tip>
  Claude Code에서는 서브에이전트 태스크가 끝나면 [task completion notification](https://platform.claude.com/docs/en/agent-sdk/typescript#sdk-task-notification-message)에 `total_tokens`와 `duration_ms`가 포함됩니다. 이 값들은 다른 곳에 보존되지 않으므로 즉시 저장하세요.
</Tip>

## 어서션 작성하기

어서션(assertions)은 출력이 무엇을 포함해야 하거나 달성해야 하는지에 대한 검증 가능한 진술입니다. 첫 번째 출력 결과를 본 뒤에 추가하세요 — 스킬을 실제로 실행해 보기 전까지는 "좋은" 모습이 어떤 것인지 모르는 경우가 많습니다.

좋은 어서션:

* `"The output file is valid JSON"` — 프로그램으로 검증 가능.
* `"The bar chart has labeled axes"` — 구체적이고 관찰 가능.
* `"The report includes at least 3 recommendations"` — 셀 수 있음.

약한 어서션:

* `"The output is good"` — 채점하기에 너무 모호함.
* `"The output uses exactly the phrase 'Total Revenue: $X'"` — 너무 깨지기 쉬움. 다른 표현이지만 올바른 출력도 실패하게 만듦.

모든 것에 어서션이 필요한 것은 아닙니다. 일부 품질 — 글쓰기 스타일, 시각적 디자인, 출력이 "느낌이 맞는지" — 는 pass/fail 체크로 분해하기 어렵습니다. 이런 것들은 [사람 리뷰](#reviewing-results-with-a-human) 단계에서 잡는 것이 좋습니다. 어서션은 객관적으로 확인할 수 있는 것에만 사용하세요.

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

채점이란 각 어서션을 실제 출력에 대해 평가하고, **PASS** 또는 **FAIL**과 구체적인 증거를 함께 기록하는 것을 의미합니다. 증거는 단순한 의견 진술이 아니라 출력을 인용하거나 참조해야 합니다.

가장 단순한 접근은 출력과 어서션을 LLM에 주고 각각을 평가하도록 요청하는 것입니다. 코드로 확인 가능한 어서션(유효한 JSON, 올바른 행 수, 예상 크기의 파일 존재 여부)에는 검증 스크립트를 사용하세요 — 스크립트는 기계적인 체크에 대해 LLM 판단보다 더 신뢰성이 높고, 반복(iteration) 사이에 재사용할 수 있습니다.

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

* **PASS에는 구체적인 증거를 요구하세요.** 의심스러우면 봐주지 마세요. 어서션이 "includes a summary"라고 하는데 출력에 "Summary"라는 제목 아래 모호한 한 문장만 있다면 FAIL입니다 — 라벨은 있어도 실체가 없는 것이니까요.
* **결과뿐 아니라 어서션 자체도 검토하세요.** 채점하면서 어서션이 너무 쉬운지(스킬 품질과 무관하게 항상 PASS), 너무 어려운지(출력이 좋아도 항상 FAIL), 또는 검증 불가능한지(출력만 보고는 확인할 수 없음)를 살피세요. 다음 반복 전에 이런 것들을 수정하세요.

<Tip>
  두 스킬 버전을 비교할 때는 **blind comparison**을 시도해 보세요: 어느 출력이 어느 버전에서 나왔는지 알리지 않고 두 출력 모두 LLM 심사관에게 제시하는 방식입니다. 심사관은 자기 기준의 루브릭으로 종합적인 품질 — 구성, 형식, 사용성, 완성도 — 을 평가하며, 어느 버전이 "더 나아야 한다"는 편향에서 자유롭습니다. 이는 어서션 채점을 보완해줍니다: 두 출력이 모두 어서션을 통과하더라도 전체 품질에서 크게 다를 수 있습니다.
</Tip>

## 결과 집계하기

해당 반복의 모든 실행이 채점되면, 구성(configuration)별 요약 통계를 계산하고 eval 디렉터리 옆의 `benchmark.json`에 저장하세요(예: `csv-analyzer-workspace/iteration-1/benchmark.json`):

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

`delta`는 스킬이 무엇을 비용으로 치르는지(더 많은 시간, 더 많은 토큰)와 무엇을 얻는지(더 높은 통과율)를 알려줍니다. 13초가 더 들지만 통과율을 50%포인트 올려주는 스킬이라면 충분히 가치가 있을 가능성이 높습니다. 토큰 사용량을 두 배로 늘리는데 2포인트만 개선하는 스킬은 그렇지 않을 수 있습니다.

<Note>
  표준편차(`stddev`)는 eval당 여러 번 실행할 때만 의미가 있습니다. 2~3개의 테스트 케이스와 단일 실행으로 이루어진 초기 반복에서는 원시 통과 수와 delta에 집중하세요 — 통계 지표는 테스트 셋을 확장하고 각 eval을 여러 번 실행할 때 유용해집니다.
</Note>

## 패턴 분석하기

집계 통계는 중요한 패턴을 가릴 수 있습니다. 벤치마크를 계산한 후:

* **두 구성 모두에서 항상 PASS인 어서션은 제거하거나 교체하세요.** 이런 어서션은 유용한 정보를 주지 않습니다 — 모델은 스킬 없이도 잘 처리합니다. 이런 어서션은 실제 스킬 가치를 반영하지 않으면서 with-skill 통과율만 부풀립니다.
* **두 구성 모두에서 항상 FAIL인 어서션을 조사하세요.** 어서션이 잘못된 것이거나(모델이 할 수 없는 것을 요구), 테스트 케이스가 너무 어렵거나, 어서션이 잘못된 것을 체크하고 있을 수 있습니다. 다음 반복 전에 수정하세요.
* **스킬과 함께면 PASS하고 없으면 FAIL인 어서션을 연구하세요.** 이곳이 스킬이 명백하게 가치를 더하는 지점입니다. *왜* 그런지 이해하세요 — 어떤 지시나 스크립트가 차이를 만들었는가?
* **실행 사이에 결과가 일관되지 않을 때는 지시를 더 엄격하게 다듬으세요.** 같은 eval이 어떤 때는 통과하고 어떤 때는 실패한다면(벤치마크에서 높은 `stddev`로 반영됨), eval이 흔들리는 것일 수도 있고(모델 무작위성에 민감), 스킬 지시가 모호해서 모델이 매번 다르게 해석하는 것일 수도 있습니다. 모호함을 줄이기 위해 예시나 더 구체적인 가이던스를 추가하세요.
* **시간과 토큰의 이상치(outlier)를 확인하세요.** 한 eval이 다른 것들보다 3배 더 오래 걸린다면, 그 실행의 execution transcript(실행 중 모델이 한 일의 전체 로그)를 읽어 병목을 찾으세요.

## 사람과 함께 결과 리뷰하기

어서션 채점과 패턴 분석은 많은 것을 잡아내지만, 결국은 당신이 작성하려고 생각한 어서션만 검사합니다. 사람 리뷰어는 신선한 관점을 가져옵니다 — 예상하지 못한 이슈를 잡아내거나, 출력이 기술적으로 정확하지만 핵심을 놓쳤다는 것을 알아차리거나, pass/fail로 표현하기 어려운 문제를 발견합니다. 각 테스트 케이스에 대해 실제 출력과 채점 결과를 함께 검토하세요.

각 테스트 케이스에 대한 구체적인 피드백을 기록하고 작업공간에 저장하세요(예: eval 디렉터리 옆에 `feedback.json` 형태로):

```json feedback.json theme={null}
{
  "eval-top-months-chart": "The chart is missing axis labels and the months are in alphabetical order instead of chronological.",
  "eval-clean-missing-emails": ""
}
```

"The chart is missing axis labels"는 실행 가능한 피드백이고, "looks bad"는 아닙니다. 빈 피드백은 출력이 괜찮아 보였다는 의미입니다 — 그 테스트 케이스가 리뷰를 통과한 것입니다. [반복 단계](#iterating-on-the-skill)에서는 구체적인 불만이 있었던 테스트 케이스에 개선을 집중하세요.

## 스킬을 반복 개선하기

채점과 리뷰를 마치고 나면 세 가지 신호 소스가 있습니다:

* **실패한 어서션**은 구체적인 빈틈을 가리킵니다 — 누락된 단계, 불명확한 지시, 스킬이 처리하지 못하는 케이스.
* **사람 피드백**은 더 폭넓은 품질 이슈를 가리킵니다 — 접근법이 잘못되었거나, 출력 구조가 좋지 않았거나, 스킬이 기술적으로 옳지만 도움이 되지 않는 결과를 만든 경우.
* **실행 transcript**는 *왜* 잘못되었는지 보여줍니다. 에이전트가 지시를 무시했다면, 그 지시가 모호한 것일 수 있습니다. 에이전트가 비생산적인 단계에 시간을 썼다면, 그 지시는 단순화하거나 제거해야 할 수 있습니다.

이 신호들을 스킬 개선으로 전환하는 가장 효과적인 방법은 세 가지 모두 — 그리고 현재 `SKILL.md` — 를 LLM에 주고 변경안을 제안하도록 요청하는 것입니다. LLM은 실패한 어서션, 리뷰어 불만, transcript 동작에 걸친 패턴을 종합할 수 있는데, 이는 수동으로 연결하기에는 지루한 작업입니다. LLM에 프롬프트할 때 다음 가이드라인을 포함하세요:

* **피드백에서 일반화하세요.** 스킬은 테스트 케이스뿐 아니라 수많은 다양한 프롬프트에서 사용됩니다. 수정 사항은 특정 예시에 대한 좁은 패치를 추가하기보다, 근본 문제를 폭넓게 다뤄야 합니다.
* **스킬을 간결하게 유지하세요.** 더 적지만 더 좋은 지시가 종종 광범위한 규칙보다 낫습니다. transcript에 낭비된 작업(불필요한 검증, 불필요한 중간 출력)이 보인다면 그 지시들을 제거하세요. 더 많은 규칙을 추가해도 통과율이 정체된다면, 스킬이 과도하게 제약된 것일 수 있습니다 — 지시를 빼보고 결과가 유지되거나 개선되는지 확인하세요.
* **이유(why)를 설명하세요.** 추론 기반 지시("Y는 Z를 일으키는 경향이 있으므로 X를 하세요")가 경직된 명령("ALWAYS do X, NEVER do Y")보다 잘 작동합니다. 모델은 목적을 이해할 때 지시를 더 신뢰성 있게 따릅니다.
* **반복되는 작업을 번들로 묶으세요.** 모든 테스트 실행이 비슷한 헬퍼 스크립트(차트 빌더, 데이터 파서)를 독립적으로 작성하고 있다면, 그 스크립트를 스킬의 `scripts/` 디렉터리에 번들링하라는 신호입니다. 방법은 [Using scripts](/skill-creation/using-scripts)를 참고하세요.

### 루프

1. eval 신호와 현재 `SKILL.md`를 LLM에 주고 개선안을 제안하도록 요청합니다.
2. 변경 사항을 검토하고 적용합니다.
3. 새 `iteration-<N+1>/` 디렉터리에서 모든 테스트 케이스를 다시 실행합니다.
4. 새 결과를 채점하고 집계합니다.
5. 사람과 리뷰합니다. 반복합니다.

결과에 만족하거나, 피드백이 일관되게 비어 있거나, 반복 사이에 의미 있는 개선이 더 이상 보이지 않으면 멈추세요.

<Tip>
  [`skill-creator`](https://github.com/anthropics/skills/tree/main/skills/skill-creator) 스킬은 이 워크플로의 많은 부분을 자동화합니다 — eval 실행, 어서션 채점, 벤치마크 집계, 그리고 사람 리뷰를 위한 결과 제시까지.
</Tip>

> ## 문서 인덱스
> 전체 문서 인덱스는 다음에서 가져오세요: https://agentskills.io/llms.txt
> 더 깊이 탐색하기 전에 이 파일을 사용하여 사용 가능한 모든 페이지를 확인하세요.

# 스킬 설명(description) 최적화하기

> 관련된 프롬프트에서 스킬이 안정적으로 트리거되도록 description을 개선하는 방법.

스킬은 활성화되어야만 도움이 됩니다. `SKILL.md` 프론트매터의 `description` 필드는 에이전트가 주어진 작업에 대해 스킬을 로드할지 결정하는 핵심 메커니즘입니다. 명세가 부족한 description은 트리거되어야 할 때 트리거되지 않게 만들고, 지나치게 광범위한 description은 트리거되지 않아야 할 때 트리거되게 만듭니다.

이 가이드는 트리거 정확도를 위해 스킬 description을 체계적으로 테스트하고 개선하는 방법을 다룹니다.

## 스킬 트리거링이 작동하는 방식

에이전트는 컨텍스트를 관리하기 위해 [점진적 공개(progressive disclosure)](/specification#progressive-disclosure)를 사용합니다. 시작 시점에는 사용 가능한 각 스킬의 `name`과 `description`만 로드하여, 그 스킬이 언제 관련성이 있을지 판단할 수 있을 정도의 정보만 확보합니다. 사용자의 작업이 description과 일치하면, 에이전트는 `SKILL.md` 전체를 컨텍스트로 읽고 그 지침을 따릅니다.

이것은 description이 트리거링의 부담 전체를 지고 있다는 뜻입니다. description이 스킬이 언제 유용한지를 전달하지 못하면, 에이전트는 그것을 사용해야 한다는 사실을 모릅니다.

한 가지 중요한 뉘앙스: 에이전트는 보통 스스로 처리할 수 있는 능력 이상의 지식이나 역량이 필요한 작업에 대해서만 스킬을 참조합니다. "이 PDF를 읽어줘"와 같은 단순한 한 단계 요청은 description이 완벽히 일치하더라도 PDF 스킬을 트리거하지 않을 수 있습니다. 에이전트가 기본 도구로 처리할 수 있기 때문입니다. 익숙하지 않은 API, 도메인 특화 워크플로, 흔하지 않은 형식과 같이 전문 지식이 필요한 작업에서야말로 잘 작성된 description이 차이를 만듭니다.

## 효과적인 description 작성하기

테스트하기 전에 좋은 description이 어떤 모습인지 알아두면 도움이 됩니다. 몇 가지 원칙:

* **명령형 어법을 사용하세요.** description을 에이전트에게 보내는 지시문처럼 작성하세요: "이 스킬은 ~한다"가 아니라 "~할 때 이 스킬을 사용하라". 에이전트는 행동할지 여부를 결정하는 중이므로, 언제 행동해야 하는지 알려주세요.
* **구현이 아니라 사용자 의도에 초점을 맞추세요.** 스킬의 내부 메커니즘이 아니라 사용자가 달성하려는 목표를 묘사하세요. 에이전트는 사용자가 요청한 내용을 기준으로 매칭합니다.
* **다소 적극적으로 작성하세요.** 사용자가 도메인을 직접 언급하지 않는 경우를 포함하여 스킬이 적용되는 컨텍스트를 명시적으로 나열하세요: "사용자가 'CSV'나 '분석'을 명시적으로 언급하지 않더라도."
* **간결하게 유지하세요.** 보통은 몇 문장에서 짧은 한 단락 정도가 적절합니다 — 스킬의 범위를 포괄할 수 있을 만큼은 길고, 여러 스킬에 걸쳐 에이전트의 컨텍스트를 부풀리지 않을 만큼은 짧게. [명세](/specification#description-field)는 1024자의 엄격한 한도를 강제합니다.

## 트리거 평가(eval) 쿼리 설계하기

트리거링을 테스트하려면, 스킬을 트리거해야 하는지 여부가 라벨링된 현실적인 사용자 프롬프트 세트인 평가 쿼리가 필요합니다.

```json eval_queries.json theme={null}
[
  { "query": "I've got a spreadsheet in ~/data/q4_results.xlsx with revenue in col C and expenses in col D — can you add a profit margin column and highlight anything under 10%?", "should_trigger": true },
  { "query": "whats the quickest way to convert this json file to yaml", "should_trigger": false }
]
```

약 20개 쿼리를 목표로 하세요: 트리거되어야 하는 것 8-10개, 트리거되지 않아야 하는 것 8-10개.

### 트리거되어야 하는 쿼리

이 쿼리들은 description이 스킬의 범위를 포착하는지 테스트합니다. 다음 축을 따라 다양화하세요:

* **표현 방식**: 일부는 격식적으로, 일부는 캐주얼하게, 일부는 오타나 약어 포함.
* **명시성**: 일부는 스킬의 도메인을 직접 언급("이 CSV를 분석해줘"), 다른 일부는 그것을 언급하지 않고 필요를 묘사("상사가 이 데이터 파일로 차트를 만들길 원해").
* **상세도**: 짧은 프롬프트와 컨텍스트가 풍부한 것을 섞어보세요 — 짧은 "내 매출 CSV를 분석하고 차트를 만들어줘"와 파일 경로, 컬럼명, 배경 사정이 담긴 더 긴 메시지를 함께.
* **복잡도**: 단계 수와 결정 지점의 수를 다양화하세요. 단일 단계 작업과 다단계 워크플로를 함께 포함시켜, 스킬이 다루는 작업이 더 큰 체인 속에 묻혀 있을 때도 에이전트가 관련성을 분간할 수 있는지 테스트하세요.

가장 유용한 트리거되어야 하는 쿼리는 스킬이 도움이 되지만 쿼리만 봐서는 그 연관성이 분명하지 않은 경우입니다. 이런 경우에 description의 표현이 차이를 만듭니다 — 쿼리가 이미 스킬이 하는 일을 정확히 요청한다면 합리적인 어떤 description이라도 트리거될 것입니다.

### 트리거되지 않아야 하는 쿼리

가장 가치 있는 부정 테스트 사례는 **근접 오판(near-misses)** — 스킬과 키워드나 개념을 공유하지만 실제로는 다른 것이 필요한 쿼리들입니다. 이것은 description이 단지 넓기만 한 것이 아니라 정밀한지 테스트합니다.

CSV 분석 스킬의 경우, 약한 부정 예시는 다음과 같습니다:

* `"Write a fibonacci function"` — 명백히 무관, 아무것도 테스트하지 않음.
* `"What's the weather today?"` — 키워드 겹침 없음, 너무 쉬움.

강한 부정 예시:

* `"I need to update the formulas in my Excel budget spreadsheet"` — "spreadsheet"와 "data" 개념을 공유하지만, CSV 분석이 아니라 Excel 편집이 필요.
* `"can you write a python script that reads a csv and uploads each row to our postgres database"` — CSV가 관련되지만, 작업은 분석이 아니라 데이터베이스 ETL.

### 현실성을 위한 팁

실제 사용자 프롬프트는 일반적인 테스트 쿼리에는 없는 컨텍스트를 담고 있습니다. 다음을 포함시키세요:

* 파일 경로 (`~/Downloads/report_final_v2.xlsx`)
* 개인적 맥락 (`"my manager asked me to..."`)
* 구체적인 세부사항 (컬럼명, 회사명, 데이터 값)
* 캐주얼한 어투, 약어, 가끔의 오타

## description이 트리거되는지 테스트하기

기본 접근법: 스킬이 설치된 에이전트에서 각 쿼리를 실행하고 에이전트가 그 스킬을 호출하는지 관찰합니다. 스킬이 에이전트에 등록되어 검색 가능한지 확인하세요 — 이 방식은 클라이언트마다 다릅니다(예: 스킬 디렉터리, 설정 파일, CLI 플래그).

대부분의 에이전트 클라이언트는 어떤 형태의 관찰 가능성(observability)을 제공합니다 — 실행 로그, 도구 호출 이력, 또는 verbose 출력 — 이를 통해 실행 중 어떤 스킬이 참조되었는지 볼 수 있습니다. 자세한 내용은 클라이언트 문서를 확인하세요. 에이전트가 스킬의 `SKILL.md`를 로드했다면 스킬이 트리거된 것이고, 참조하지 않고 진행했다면 트리거되지 않은 것입니다.

쿼리가 "통과"하는 경우:

* `should_trigger`가 `true`이고 스킬이 호출되었거나,
* `should_trigger`가 `false`이고 스킬이 호출되지 않았을 때.

### 여러 번 실행하기

모델 동작은 비결정적입니다 — 같은 쿼리가 한 번은 스킬을 트리거하고 다음 번엔 그렇지 않을 수 있습니다. 각 쿼리를 여러 번(3번이 합리적인 출발점) 실행하고 **트리거율**을 계산하세요: 스킬이 호출된 실행 횟수의 비율.

트리거되어야 하는 쿼리는 트리거율이 임계값(기본값 0.5가 합리적) 이상이면 통과합니다. 트리거되지 않아야 하는 쿼리는 트리거율이 그 임계값 이하면 통과합니다.

각각 3번씩 20개의 쿼리면 60번의 호출이 됩니다. 스크립트로 만들고 싶을 것입니다. 일반적인 구조는 다음과 같습니다 — `claude` 호출과 `check_triggered`의 탐지 로직을 사용하는 에이전트 클라이언트에 맞게 교체하세요:

```bash theme={null}
#!/bin/bash
QUERIES_FILE="${1:?Usage: $0 <queries.json>}"
SKILL_NAME="my-skill"
RUNS=3

# This example uses Claude Code's JSON output to check for Skill tool calls.
# Replace this function with detection logic for your agent client.
# Should return 0 (success) if the skill was invoked, 1 otherwise.
check_triggered() {
  local query="$1"
  claude -p "$query" --output-format json 2>/dev/null \
    | jq -e --arg skill "$SKILL_NAME" \
      'any(.messages[].content[]; .type == "tool_use" and .name == "Skill" and .input.skill == $skill)' \
      > /dev/null 2>&1
}

count=$(jq length "$QUERIES_FILE")
for i in $(seq 0 $((count - 1))); do
  query=$(jq -r ".[$i].query" "$QUERIES_FILE")
  should_trigger=$(jq -r ".[$i].should_trigger" "$QUERIES_FILE")
  triggers=0

  for run in $(seq 1 $RUNS); do
    check_triggered "$query" && triggers=$((triggers + 1))
  done

  jq -n \
    --arg query "$query" \
    --argjson should_trigger "$should_trigger" \
    --argjson triggers "$triggers" \
    --argjson runs "$RUNS" \
    '{query: $query, should_trigger: $should_trigger, triggers: $triggers, runs: $runs, trigger_rate: ($triggers / $runs)}'
done | jq -s '.'
```

<Tip>
  에이전트 클라이언트가 지원한다면, 결과가 명확해진 시점에 실행을 조기 종료할 수 있습니다 — 에이전트가 스킬을 참조했거나, 참조 없이 작업을 시작한 시점입니다. 이는 전체 평가 세트를 실행하는 시간과 비용을 상당히 줄일 수 있습니다.
</Tip>

## train/validation 분할로 과적합 피하기

모든 쿼리에 대해 description을 최적화하면 과적합의 위험이 있습니다 — 그 특정 표현들에서는 잘 작동하지만 새로운 것에서는 실패하는 description을 만들게 됩니다.

해결책은 쿼리 세트를 분할하는 것입니다:

* **Train 세트(~60%)**: 실패를 식별하고 개선을 안내하는 데 사용하는 쿼리들.
* **Validation 세트(~40%)**: 따로 떼어두고, 개선이 일반화되는지 확인할 때만 사용하는 쿼리들.

두 세트 모두에 should-trigger와 should-not-trigger 쿼리가 비례적으로 섞이도록 하세요 — 실수로 모든 긍정 사례를 한 세트에 몰아넣지 마세요. 무작위로 섞고 반복 사이에 분할을 고정해, 동일 조건에서 비교가 가능하게 하세요.

[위](#running-multiple-times)와 같은 스크립트를 사용한다면, 쿼리를 두 파일(`train_queries.json`과 `validation_queries.json`)로 나누고 각각에 대해 스크립트를 별도로 실행하면 됩니다.

## 최적화 루프

1. **평가**: *train 및 validation 세트* 모두에서 현재 description을 평가합니다. train 결과는 변경을 안내하고, validation 결과는 그 변경이 일반화되고 있는지 알려줍니다.
2. *train 세트*에서 **실패 식별**: 트리거되어야 하는 쿼리 중 어떤 것이 트리거되지 않았는가? 트리거되지 않아야 하는 쿼리 중 어떤 것이 트리거되었는가?
   * 변경을 안내하는 데에는 train 세트 실패만 사용하세요 — description을 직접 수정하든 LLM에게 프롬프트로 시키든, validation 세트 결과는 과정에서 배제하세요.
3. **description 수정**. 일반화에 집중하세요:
   * 트리거되어야 하는 쿼리가 실패한다면, description이 너무 좁을 수 있습니다. 범위를 넓히거나 스킬이 유용한 상황에 대한 컨텍스트를 추가하세요.
   * 트리거되지 않아야 하는 쿼리가 잘못 트리거된다면, description이 너무 넓을 수 있습니다. 스킬이 *하지 않는* 것에 대한 구체성을 추가하거나, 이 스킬과 인접한 역량 사이의 경계를 명확히 하세요.
   * 실패한 쿼리에서 특정 키워드를 추가하는 것은 피하세요 — 그것이 과적합입니다. 대신, 그 쿼리들이 대표하는 일반적인 카테고리나 개념을 찾아 그것을 다루세요.
   * 몇 번 반복해도 막힌다면, 점진적인 수정 대신 구조적으로 다른 접근을 시도하세요. 다른 프레이밍이나 문장 구조가 점진적 개선으로는 못 뚫는 벽을 뚫을 수 있습니다.
   * description이 1024자 한도 이내인지 확인하세요 — 최적화 중에 description은 늘어나는 경향이 있습니다.
4. *train 세트*의 모든 쿼리가 통과하거나 의미 있는 개선이 멈출 때까지 **1-3단계를 반복**합니다.
5. validation 통과율 — *validation 세트* 쿼리 중 통과한 비율 — 로 **최고의 반복본을 선택**합니다. 가장 좋은 description이 마지막에 만든 것이 아닐 수 있다는 점에 유의하세요. train 세트에 과적합된 후속 버전들보다 이전 반복본의 validation 통과율이 더 높을 수 있습니다.

보통 5번의 반복이면 충분합니다. 성능이 개선되지 않는다면 문제가 description이 아니라 쿼리(너무 쉽거나, 너무 어렵거나, 라벨링이 잘못된)에 있을 수 있습니다.

<Tip>
  [`skill-creator`](https://github.com/anthropics/skills/tree/main/skills/skill-creator) 스킬은 이 루프를 처음부터 끝까지 자동화합니다: 평가 세트를 분할하고, 트리거율을 병렬로 평가하며, Claude를 사용해 description 개선안을 제안하고, 실행 중에 볼 수 있는 라이브 HTML 리포트를 생성합니다.
</Tip>

## 결과 적용하기

가장 좋은 description을 선택했다면:

1. `SKILL.md` 프론트매터의 `description` 필드를 업데이트합니다.
2. description이 [1024자 한도](/specification#description-field) 이내인지 확인합니다.
3. description이 예상대로 트리거되는지 검증합니다. 빠른 정합성 점검으로 몇 개의 프롬프트를 수동으로 시도해 보세요. 더 엄격한 테스트를 위해서는 5-10개의 새 쿼리(트리거되어야 하는 것과 그렇지 않은 것을 섞어서)를 작성해 평가 스크립트에 통과시키세요 — 이 쿼리들은 최적화 과정에 포함된 적이 없으므로, description이 일반화되는지를 정직하게 점검할 수 있습니다.

전/후 비교:

```yaml theme={null}
# Before
description: Process CSV files.

# After
description: >
  Analyze CSV and tabular data files — compute summary statistics,
  add derived columns, generate charts, and clean messy data. Use this
  skill when the user has a CSV, TSV, or Excel file and wants to
  explore, transform, or visualize the data, even if they don't
  explicitly mention "CSV" or "analysis."
```

개선된 description은 스킬이 하는 일에 대해 더 구체적(요약 통계, 파생 컬럼, 차트, 클리닝)이면서, 적용되는 상황에 대해서는 더 넓습니다(CSV, TSV, Excel; 명시적인 키워드 없이도).

## 다음 단계

스킬이 안정적으로 트리거되기 시작하면, 그것이 좋은 출력을 만들어내는지 평가해야 합니다. 테스트 케이스를 설정하고, 결과를 채점하며, 반복하는 방법은 [스킬 출력 품질 평가하기](/skill-creation/evaluating-skills)를 참조하세요.

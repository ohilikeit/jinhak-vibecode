> ## 문서 인덱스
> 전체 문서 인덱스는 다음에서 가져오세요: https://agentskills.io/llms.txt
> 더 자세히 탐색하기 전에 이 파일을 사용해 사용 가능한 모든 페이지를 확인하세요.

# 명세 (Specification)

> Agent Skills의 완전한 형식 명세입니다.

## 디렉터리 구조

Skill은 최소한 `SKILL.md` 파일을 포함하는 디렉터리입니다:

```
skill-name/
├── SKILL.md          # 필수: 메타데이터 + 지침
├── scripts/          # 선택: 실행 가능한 코드
├── references/       # 선택: 문서
├── assets/           # 선택: 템플릿, 리소스
└── ...               # 추가적인 파일이나 디렉터리
```

## `SKILL.md` 형식

`SKILL.md` 파일은 YAML frontmatter 뒤에 Markdown 콘텐츠가 이어지는 형태여야 합니다.

### Frontmatter

| 필드            | 필수 여부 | 제약 조건                                                                                                       |
| --------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| `name`          | 예       | 최대 64자. 소문자 알파벳, 숫자, 하이픈만 허용. 하이픈으로 시작하거나 끝날 수 없음.                                  |
| `description`   | 예       | 최대 1024자. 비어 있을 수 없음. Skill이 무엇을 하고 언제 사용하는지 설명함.                                         |
| `license`       | 아니오    | 라이선스 이름 또는 번들된 라이선스 파일에 대한 참조.                                                                |
| `compatibility` | 아니오    | 최대 500자. 환경 요구 사항(대상 제품, 시스템 패키지, 네트워크 접근 등)을 나타냄.                                     |
| `metadata`      | 아니오    | 추가 메타데이터를 위한 임의의 키-값 매핑.                                                                            |
| `allowed-tools` | 아니오    | Skill이 사용할 수 있도록 사전 승인된 도구의 공백으로 구분된 문자열. (실험적 기능)                                    |

<Card>
  **최소 예시:**

  ```markdown SKILL.md theme={null}
  ---
  name: skill-name
  description: A description of what this skill does and when to use it.
  ---
  ```

  **선택 필드를 포함한 예시:**

  ```markdown SKILL.md theme={null}
  ---
  name: pdf-processing
  description: Extract PDF text, fill forms, merge files. Use when handling PDFs.
  license: Apache-2.0
  metadata:
    author: example-org
    version: "1.0"
  ---
  ```
</Card>

#### `name` 필드

필수 `name` 필드:

* 1-64자여야 함
* 유니코드 소문자 영숫자(`a-z`)와 하이픈(`-`)만 포함할 수 있음
* 하이픈(`-`)으로 시작하거나 끝날 수 없음
* 연속된 하이픈(`--`)을 포함할 수 없음
* 상위 디렉터리 이름과 일치해야 함

<Card>
  **유효한 예시:**

  ```yaml theme={null}
  name: pdf-processing
  ```

  ```yaml theme={null}
  name: data-analysis
  ```

  ```yaml theme={null}
  name: code-review
  ```

  **유효하지 않은 예시:**

  ```yaml theme={null}
  name: PDF-Processing  # 대문자 허용 안 됨
  ```

  ```yaml theme={null}
  name: -pdf  # 하이픈으로 시작할 수 없음
  ```

  ```yaml theme={null}
  name: pdf--processing  # 연속된 하이픈 허용 안 됨
  ```
</Card>

#### `description` 필드

필수 `description` 필드:

* 1-1024자여야 함
* Skill이 무엇을 하는지와 언제 사용해야 하는지를 모두 설명해야 함
* 에이전트가 관련 작업을 식별하는 데 도움이 되는 구체적인 키워드를 포함해야 함

<Card>
  **좋은 예시:**

  ```yaml theme={null}
  description: Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs. Use when working with PDF documents or when the user mentions PDFs, forms, or document extraction.
  ```

  **나쁜 예시:**

  ```yaml theme={null}
  description: Helps with PDFs.
  ```
</Card>

#### `license` 필드

선택 `license` 필드:

* Skill에 적용되는 라이선스를 지정함
* 짧게 유지하는 것을 권장함(라이선스 이름 또는 번들된 라이선스 파일 이름)

<Card>
  **예시:**

  ```yaml theme={null}
  license: Proprietary. LICENSE.txt has complete terms
  ```
</Card>

#### `compatibility` 필드

선택 `compatibility` 필드:

* 제공된 경우 1-500자여야 함
* Skill에 특정한 환경 요구 사항이 있는 경우에만 포함해야 함
* 대상 제품, 필요한 시스템 패키지, 네트워크 접근 요구 사항 등을 나타낼 수 있음

<Card>
  **예시:**

  ```yaml theme={null}
  compatibility: Designed for Claude Code (or similar products)
  ```

  ```yaml theme={null}
  compatibility: Requires git, docker, jq, and access to the internet
  ```

  ```yaml theme={null}
  compatibility: Requires Python 3.14+ and uv
  ```
</Card>

<Note>
  대부분의 Skill은 `compatibility` 필드가 필요하지 않습니다.
</Note>

#### `metadata` 필드

선택 `metadata` 필드:

* 문자열 키에서 문자열 값으로의 매핑
* 클라이언트는 이를 사용해 Agent Skills 사양에 정의되지 않은 추가 속성을 저장할 수 있음
* 우발적인 충돌을 피하기 위해 키 이름을 충분히 고유하게 짓는 것을 권장함

<Card>
  **예시:**

  ```yaml theme={null}
  metadata:
    author: example-org
    version: "1.0"
  ```
</Card>

#### `allowed-tools` 필드

선택 `allowed-tools` 필드:

* 실행이 사전 승인된 도구들의 공백으로 구분된 문자열
* 실험적 기능. 이 필드의 지원 여부는 에이전트 구현에 따라 다를 수 있음

<Card>
  **예시:**

  ```yaml theme={null}
  allowed-tools: Bash(git:*) Bash(jq:*) Read
  ```
</Card>

### 본문 콘텐츠

frontmatter 뒤의 Markdown 본문에는 skill 지침이 포함됩니다. 형식에 제한은 없습니다. 에이전트가 작업을 효과적으로 수행하는 데 도움이 되는 내용을 자유롭게 작성하세요.

권장 섹션:

* 단계별 지침
* 입력 및 출력 예시
* 일반적인 엣지 케이스

에이전트는 skill을 활성화하기로 결정하면 이 파일 전체를 로드한다는 점에 유의하세요. 긴 `SKILL.md` 콘텐츠는 참조되는 파일로 분할하는 것을 고려하세요.

## 선택 디렉터리

### `scripts/`

에이전트가 실행할 수 있는 코드를 포함합니다. 스크립트는 다음과 같아야 합니다:

* 독립적이거나 의존성을 명확하게 문서화해야 함
* 유용한 오류 메시지를 포함해야 함
* 엣지 케이스를 우아하게 처리해야 함

지원되는 언어는 에이전트 구현에 따라 다릅니다. 일반적으로 Python, Bash, JavaScript가 사용됩니다.

### `references/`

필요할 때 에이전트가 읽을 수 있는 추가 문서를 포함합니다:

* `REFERENCE.md` - 상세한 기술 참조
* `FORMS.md` - 양식 템플릿 또는 구조화된 데이터 형식
* 도메인별 파일 (`finance.md`, `legal.md` 등)

각 [참조 파일](#file-references)은 집중된 범위를 유지하세요. 에이전트는 필요할 때 이를 로드하므로, 파일이 작을수록 컨텍스트 사용량이 줄어듭니다.

### `assets/`

정적 리소스를 포함합니다:

* 템플릿 (문서 템플릿, 설정 템플릿)
* 이미지 (다이어그램, 예시)
* 데이터 파일 (조회 테이블, 스키마)

## 점진적 공개 (Progressive disclosure)

에이전트는 skill을 *점진적으로* 로드하여, 작업이 요구할 때에만 더 자세한 내용을 가져옵니다. Skill은 이를 활용할 수 있도록 구조화되어야 합니다:

1. **메타데이터** (~100 토큰): 모든 skill의 `name` 및 `description` 필드는 시작 시 로드됨
2. **지침** (5000 토큰 미만 권장): skill이 활성화될 때 전체 `SKILL.md` 본문이 로드됨
3. **리소스** (필요 시): 파일들(예: `scripts/`, `references/`, `assets/`에 있는 것들)은 필요할 때만 로드됨

메인 `SKILL.md`는 500줄 이하로 유지하세요. 상세한 참조 자료는 별도의 파일로 옮기세요.

## 파일 참조

Skill 내에서 다른 파일을 참조할 때는 skill 루트로부터의 상대 경로를 사용하세요:

```markdown SKILL.md theme={null}
See [the reference guide](references/REFERENCE.md) for details.

Run the extraction script:
scripts/extract.py
```

파일 참조는 `SKILL.md`에서 한 단계 깊이로 유지하세요. 깊게 중첩된 참조 체인은 피하세요.

## 검증 (Validation)

Skill을 검증하려면 [skills-ref](https://github.com/agentskills/agentskills/tree/main/skills-ref) 참조 라이브러리를 사용하세요:

```bash theme={null}
skills-ref validate ./my-skill
```

이는 `SKILL.md` frontmatter가 유효한지, 모든 명명 규칙을 따르는지를 확인합니다.

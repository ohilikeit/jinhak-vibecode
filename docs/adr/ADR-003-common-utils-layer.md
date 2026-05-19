# ADR-003: Common Utils Layer (`common/utils/`)

**상태**: Accepted (MVP 동봉)
**작성일**: 2026-05-19
**관련**: README §2.B', REPORT_06 §3.3-bis / §3.4-bis / §4.11 / Layer 3'

---

## 1. 배경 (Context)

비개발자 직군 30개에 자동화 스킬을 동봉할 때, PDF 파싱·Excel 읽기/쓰기 같은 **고빈도 저수준 작업**이 모든 직군에서 반복된다. 5개 레퍼런스 플러그인 조사 결과:

| 레퍼런스 | PDF/Excel 유틸 | 평가 |
|---|---|---|
| Karpathy | ❌ 없음 | 행동 지침만 |
| GSD | ❌ 없음 | 마크다운 오케스트레이션만 |
| Hermes | ✅ `tools/` 70+ + `lazy_deps.py` + `extract_pymupdf.py` | **유일한 모범 사례** |
| KW Plugins | ⚠️ bio-research 1곳만 (`convert_to_asm.py` 543줄 등) | 직군 공통화 안 됨 |
| Superpowers | ❌ 없음 | 문서에서 pdfplumber 언급만 |

이 상태로 우리 하네스를 구현하면 **30개 직군 × 평균 ~6천 토큰의 PDF/Excel 합성 비용**이 빌드 단계에서 폭발한다. Eco-First 토큰 경제 원칙(README 핵심 설계 원칙 §5)과 정면 충돌.

## 2. 결정 (Decision)

**`common/utils/` 레이어를 1급 시민으로 동봉**하고, 직군 스킬은 `requires:` frontmatter로 의존을 선언한다.

### 2.1 MVP 동봉 utils 4개 (전부 Python 단일 런타임)

| utils | 라이브러리 | 책임 |
|---|---|---|
| `pdf-extract` | Python `pdfplumber` | 텍스트 + 표 추출, 페이지별 JSON 정규화 |
| `xlsx-read` | Python `openpyxl` | 시트 선택, 헤더 매핑, 값 추출 |
| `xlsx-write` | Python `openpyxl` | 템플릿 복사 + 셀 채우기 + 스타일 보존 |
| `csv-rw` | Python `pandas` | 인코딩 자동 감지(cp949/utf-8/euc-kr), dtype 추론, 대용량 chunked 처리, JSON·xlsx 변환 |

**제외 (v0.2+ 옵셔널)**: docx-extract, marker-pdf, docling.
**도입 안 함**: OCR (스캔 PDF는 v1.0 이후에도 재검토). 비개발자 환경에서 tesseract 설치·언어팩 관리 부담 대비 가치 낮음.

**왜 csv도 pandas?** Node `papaparse`는 빠르지만 (1) 한글 CSV의 cp949/euc-kr 인코딩 자동 감지 부재, (2) dtype 추론 X, (3) Excel 변환 시 별도 코드 필요. pandas는 `read_csv(encoding='auto')` + `to_excel()` 한 줄. **Python을 어차피 PDF/Excel용으로 깐 김에 통합**해서 Node↔Python 경계 복잡도를 줄인다 (Node 네이티브 papaparse 분기 코드 제거).

### 2.2 npm 배포 + Python lazy 디텍션

- **`.py` 파일을 npm 패키지에 그대로 동봉** (`package.json`의 `files: ["bin/", "templates/"]`)
- Python 런타임 설치는 **postinstall에서 강제 X** (PEP 668·권한·OS 차이로 실패 빈번)
- 첫 실행 시 lazy 디텍션 → 미설치면 **OS별 1줄 설치 가이드** 출력
- 1순위 안내: `uv tool install --with pdfplumber --with openpyxl --with pandas jinhak-harness-pytools`
- 폴백 안내: macOS는 `brew install python && pip3 install --user pdfplumber openpyxl pandas`, Ubuntu/WSL은 `apt install python3-pdfplumber python3-openpyxl python3-pandas`
- 디텍션 결과는 `~/.harness/env-cache.json`에 7일 캐싱

### 2.3 Node ↔ Python 결합 방식

```
Node 래퍼 (.ts)  ─ spawn ─►  Python 스크립트 (.py)
       ▲                          │
       └────── JSON stdout ───────┘
```

- `child_process.spawn('python3', [script, ...args], { encoding: 'utf-8' })`
- Python 측은 의존성 0개의 one-shot 실행, 세션·라이프사이클 무관
- 모든 입출력은 JSON (`json.dumps(..., ensure_ascii=False)` 으로 한글 보존)

### 2.4 Tier-fallback (`compatibility.json`)

KW Plugins bio-research의 multi-tier 추출 전략 차용.

```json
// common/utils/pdf-extract/compatibility.json
{
  "tiers": [
    { "name": "text",   "requires": ["python3", "pdfplumber"], "tokens": "~200" },
    { "name": "tables", "requires": ["python3", "pdfplumber"], "tokens": "~400" }
  ],
  "auto_install_guide": {
    "uv":  "curl -LsSf https://astral.sh/uv/install.sh | sh && uv tool install --with pdfplumber --with openpyxl --with pandas jinhak-harness-pytools",
    "mac": "brew install python && pip3 install --user pdfplumber openpyxl pandas",
    "wsl": "sudo apt install python3-pdfplumber python3-openpyxl python3-pandas"
  }
}
```

표가 감지되면 자동으로 tier 승격 제안 (사용자 승인).

### 2.5 직군 스킬의 의존 선언

```yaml
# .agents/skills/jobs-pdf-to-excel/SKILL.md
---
name: jobs-pdf-to-excel
requires:
  - common/utils/pdf-extract
  - common/utils/xlsx-write
description: 채용공고 PDF를 정해진 컬럼의 Excel로 정리합니다. Use when 사용자가 "채용공고 정리", "PDF 모아서 Excel" 등을 언급할 때.
---

## 본문
1. `common/utils/pdf-extract` 호출 → 페이지별 JSON
2. 추출 규칙 적용 (이 스킬의 references/extraction-rules.md)
3. `common/utils/xlsx-write` 호출 → assets/template.xlsx 채워서 저장
```

직군 스킬은 **도메인 룰만 갖는 ~50줄 짜리 얇은 정의**. 파싱 로직 합성 없음.

## 3. 디렉터리 구조

```
jinhak-harness/                            # npm publish 대상
├── package.json
├── bin/
│   ├── install.js                         # npx 진입점
│   ├── lazy-deps.js                       # Python·라이브러리 디텍션
│   └── utils-registry.ts                  # compatibility.json 캐싱 + 라우팅
└── templates/
    └── common/utils/
        ├── pdf-extract/
        │   ├── SKILL.md                   # frontmatter: tier 정의
        │   ├── compatibility.json
        │   └── scripts/
        │       ├── extract.py             # pdfplumber 호출
        │       └── extract.ts             # Node 래퍼 (spawn)
        ├── xlsx-read/
        │   ├── SKILL.md
        │   ├── compatibility.json
        │   └── scripts/
        │       ├── read.py                # openpyxl
        │       └── read.ts
        ├── xlsx-write/
        │   └── ... (write_from_template.py + write.ts)
        └── csv-rw/
            ├── SKILL.md
            ├── compatibility.json
            └── scripts/
                ├── csv_io.py              # pandas (read_csv / to_csv / to_excel)
                └── csv.ts                 # Node 래퍼 (spawn)
```

## 4. 토큰 경제 효과 (추정)

| 항목 | utils 없음 | utils 도입 |
|---|---|---|
| `jobs-pdf-to-excel` 빌드 1회 | ~6,000 토큰 (PDF/Excel 로직 합성) | ~2,500 토큰 (utils 호출만) |
| 직군 30개 평균 빌드 | 30 × 6,000 = **180,000** | 30 × 2,500 = **75,000** |
| 절감률 | — | **-58%** |
| 유지보수 | 직군마다 개별 | utils 1곳 |

## 5. 거부된 대안

### Alt-A. postinstall에서 pip install 강제
- ❌ macOS의 PEP 668이 시스템 Python 보호로 거부
- ❌ Windows PATH 문제, WSL의 `python3-pip` 미설치 흔함
- ❌ npm 설치 실패 → 비개발자 멘붕

### Alt-B. PyInstaller로 OS별 바이너리 동봉
- ❌ 빌드 파이프라인(linux/macos-x64/macos-arm64/windows 4종) 폭증
- ❌ 패키지 크기 수십 MB
- ❌ 라이브러리 업그레이드마다 리빌드

### Alt-C. Node 전용 라이브러리만 사용 (`pdf-parse` + `exceljs` + `papaparse`)
- ❌ `pdf-parse`는 표 추출 약함, 한글 PDF에서 종종 깨짐
- ❌ pdfplumber 수준 정확도 부재 → 비개발자에게 결과 신뢰도 ↓
- ❌ `papaparse`는 cp949/euc-kr 한글 인코딩 자동 감지 부재, dtype 추론 부재
- ⚠️ 초안에선 csv만 Node 네이티브로 분기했으나, **Python을 어차피 깐 김에 pandas로 통합**해 Node↔Python 분기 코드 제거 (의사결정 2026-05-19)

### Alt-D. MCP 서버로 외부화 (KW Plugins 방식)
- ❌ 비개발자가 MCP 서버 띄우는 진입 장벽 큼
- ❌ 로컬 파일 처리에 별도 데몬 띄우는 건 과잉
- ⚠️ v0.3+에서 사내 공유 utils MCP는 별도 검토

## 6. 위험 & 완화

| 위험 | 영향 | 완화 |
|---|---|---|
| Python 미설치 사용자가 첫 utils 호출에서 막힘 | 채택률 ↓ | `/start` 단계에서 미리 디텍션 + uv 1줄 가이드 + 클립보드 복사 (standard+) |
| pdfplumber/openpyxl 메이저 업데이트 시 호환성 깨짐 | 회귀 | `compatibility.json`에 버전 범위 명시, 첫 실행 시 버전 체크 |
| uv 미설치 사용자가 curl 1줄도 못 함 | 진입 장벽 | OS별 폴백 가이드 자동 표시 + v0.3 GUI 인스톨러 |
| Python ↔ Node JSON 마샬링 토큰 비용 | 미미하지만 누적 | 페이지 단위 스트리밍 출력, stdout 라인 단위 파싱 |
| 한글 인코딩 깨짐 | 결과 손상 | Python: `ensure_ascii=False`, Node: `encoding: 'utf-8'`, 둘 다 UTF-8 강제 |

## 7. 차용 매핑

| 출처 | 무엇을 가져왔나 |
|---|---|
| Hermes `tools/registry.py` + `lazy_deps.py` | 디텍션·레지스트리·지연 설치 패턴 → `bin/utils-registry.ts` + `bin/lazy-deps.js` |
| Hermes `skills/productivity/ocr-and-documents/scripts/extract_pymupdf.py` | one-shot Python 스크립트 + JSON 출력 구조 |
| KW Plugins `bio-research/.../convert_to_asm.py` (543줄) | Multi-tier 추출 전략·JSON 중간 표현 |
| KW Plugins `validate_asm.py` (1102줄) | 추출과 검증 분리 패턴 |
| GSD `bin/lib/frontmatter.cjs` (389줄) | YAML `requires:` 파싱 (Node 포팅) |

## 8. 후속 액션

1. `bin/lazy-deps.js` 디텍션 스크립트 작성 (python3 / pdfplumber / openpyxl / pandas / uv 5종)
2. `templates/common/utils/{pdf-extract,xlsx-read,xlsx-write,csv-rw}/` 4개 utils 골격 + `.py` + `.ts` 작성
3. `jinhak-harness-pytools` PyPI 메타 패키지 (pdfplumber + openpyxl + pandas 묶음) 발행
4. `/start` 흐름에 디텍션 단계 삽입 + OS별 가이드 메시지
5. 직군 스타터 스킬 10개 중 PDF/Excel 다루는 것들 (jobs-pdf-to-excel, finance/journal-entry 등)을 utils 의존으로 변경

## 9. 결론

> npm 패키지 안에 `.py` 파일을 그대로 동봉하고, Python 런타임은 `uv tool install` 1줄로 사용자가 1회 설치하도록 안내한다. Node ↔ Python은 spawn + JSON으로만 연결. 이게 비개발자 환경에서 실패 지점을 최소화하면서 pdfplumber/openpyxl의 진짜 성능을 그대로 쓰는 깨끗한 방법이다.

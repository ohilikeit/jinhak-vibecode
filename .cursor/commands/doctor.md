# /doctor — 환경 진단

Node.js, Python, pdfplumber/openpyxl/pandas, HARNESS_HOME, 프로필, 스킬 카탈로그, 메모리, 최근 활동을 6 섹션으로 한국어 진단합니다.

## 실행

인자가 없을 때:

```bash
npx -y jinhak-harness doctor
```

`--refresh` 가 포함된 경우 의존성 캐시(env-cache.json)를 무시하고 재측정합니다:

```bash
npx -y jinhak-harness doctor --refresh
```

`$ARGUMENTS` 가 `--refresh` 를 포함하는지 확인하고 그에 맞게 호출하세요.

## 빨간 ❌ 가 보이면

각 줄의 한국어 안내(예: "pdfplumber 누락 — `pip3 install pdfplumber`")를 그대로 실행하면 대부분 해결됩니다.

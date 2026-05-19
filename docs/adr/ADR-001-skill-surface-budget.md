# ADR-001: Skill Surface Budget — 부팅 토큰 캡 + 옵트인 부수효과 게이트

**상태**: Accepted
**작성일**: 2026-05-19
**관련**: README §3 (프로필), REPORT_06 §3.5 / §4 차별화 #10, ADR-003 (공용 utils), ADR-004 (스케줄러)

---

## 1. 배경

50개 이상의 직군 스킬을 깔아도 부팅 시점 토큰이 폭발하지 않아야 한다. 또한 Description Tuner, with/without 벤치, 압박 테스트 같은 "검증 폭탄" 기능은 기본 OFF여야 한다. 사용자가 명시적으로 켜는 단일 손잡이가 필요하다 — 그것이 **프로필**이다.

## 2. Skill Surface Budget — 프로필별 컷오프

| 항목 | `eco`(default) | `standard` | `power` |
|---|---|---|---|
| 부팅 시 frontmatter 로드 | 전부 | 전부 | 전부 |
| 부팅 시 본문 로드 | **0** | **0** | 0 (eligible로 표시만) |
| 본문 로드 트리거 | 명시 require | 명시 require | 명시 require |
| Description Tuner | OFF | **1회/스킬 생성 시** | 1회/스킬 생성 시 |
| with/without 벤치마크 | OFF | OFF | **명시 호출 시 ON** |
| 압박 테스트(RED 서브) | OFF | OFF | **명시 호출 시 ON** |
| Dry-run (외부 전송/삭제) | **강제** | 강제 | 강제 |
| 실패 리포트 변환 | 변수 치환 | 변수 치환 | LLM 변환 허용 |

`eco`가 default인 이유: 월 3만원 구독자의 4시간 윈도우를 보호하기 위함. 비개발자 사용자는 본인이 토큰 한계를 모니터링할 수 없으므로 시스템이 default로 막아준다.

## 3. 결정 방법

1. CLI 인자 `--profile=eco|standard|power` 우선
2. 환경변수 `HARNESS_PROFILE` 다음
3. 둘 다 없으면 `eco`

값이 셋 중 하나가 아니면 에러로 종료(타이포 방지).

## 4. 본문 로드 트리거

- 직군 스킬이 본문이 필요한 작업을 시작할 때, 자체적으로 `loadBody(skillName)`을 호출
- 이 호출은 프로필 무관 — 본문이 필요하면 모든 프로필에서 동일하게 로드
- 차이는 **자동 사전 로드 여부**. eco/standard는 사전 로드 없음, power도 사전 로드 없음 (eligible로만 표시)

## 5. `--debug-loaded` 플래그

검증 가능한 상태를 외부로 노출하기 위한 진단 출력:

```
profile=eco
skills_dir=...
frontmatter_loaded=12
body_loaded=0
body_eligible=0
```

`power` 프로필에서는 `body_eligible`이 양수가 된다 (require 시 즉시 로드될 수 있음을 의미).

## 6. 토큰 가드 (정량 추정)

- 50개 스킬, 각 frontmatter 평균 200토큰 → 부팅 비용 ≈ **10K 토큰**
- 본문 평균 2000토큰 × 50개 = 100K 토큰 → eco/standard에서는 절대 자동 로드 X
- power도 eligible만 표시할 뿐 즉시 로드 X — 100K 토큰 한 번에 들어오는 사고 방지

## 7. 미결

- semantic search 인덱스 비용은 별도 ADR (현재 OFF)
- Skill Creator의 메타 스킬 비용 (60콜)은 ADR-002 후속

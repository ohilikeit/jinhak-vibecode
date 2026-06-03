---
description: 회사 컨텍스트 가져오기 — 본부/팀/프로젝트 목표를 SharePoint(동기화 폴더)에서 읽어 AI에 주입
argument-hint: "[컨텍스트 폴더 경로] (생략 시 $JINHAK_CONTEXT_PATH 또는 demo/jinhak-context)"
allowed-tools: Bash(ls:*), Bash(find:*), Read, Write, Glob
---

# /jinhak:context-sync — 회사 맥락 가져오기 (Layer 1)

당신은 진학사 직원이 쓰는 AI에게 **회사 맥락을 자동으로 깔아주는** 동기화 단계를 수행한다.
정식 환경에서는 이 컨텍스트가 회사 SharePoint 문서 라이브러리(읽기 전용, Entra 위임 인증)에서
내려오지만, 지금은 **OneDrive 동기화 폴더 또는 로컬 시드 폴더**에서 읽는다.

## 1. 컨텍스트 소스 폴더 결정 (우선순위)
1. 사용자가 인자로 준 경로 (`$ARGUMENTS`)
2. 환경변수 `$JINHAK_CONTEXT_PATH` (OneDrive 실경로용 — 예: `/mnt/c/Users/<user>/OneDrive - 진학사/jinhak-context`)
3. 기본값: `demo/jinhak-context`

다음으로 실제 경로를 확인하라:
- `$ARGUMENTS`가 비어있지 않으면 그 경로를 쓴다.
- 아니면 `echo "${JINHAK_CONTEXT_PATH:-demo/jinhak-context}"` 결과를 쓴다.
- 그 폴더가 없으면 사용자에게 "컨텍스트 폴더를 찾을 수 없습니다. 경로를 알려주세요"라고 안내하고 멈춘다.

## 2. 본부/팀/프로젝트 문서 수집
- 해당 폴더 아래 모든 `*.md`를 찾는다 (`find <경로> -name '*.md'` 또는 Glob).
- 각 파일을 읽어 frontmatter의 `unit`(division/team/project)·`name`·`owner`·`next_review_due`·`classification`을 파악한다.
- 본문에서 **목표/방향성/KPI/이해관계자/도메인 주의사항**의 핵심을 추출한다.

## 3. 가져오기 결과 표시 (사용자에게 보이는 핵심 장면)
다음 형식으로 한국어 요약을 출력하라:

```
📥 회사 컨텍스트 가져오기 완료 (읽기 전용)
소스: <경로>

🏢 본부  — 전사CEO직속
   └ 2026 방향: <1줄>
👥 팀    — AX팀
   └ 핵심 OKR: <1줄>
📁 프로젝트 (N건)
   ├ <프로젝트1>: <목표 1줄>
   └ <프로젝트2>: <목표 1줄>

⚠️ 거버넌스: <next_review_due 지난 문서가 있으면 "○○ 문서 갱신 필요" 경고>
```

## 4. 세션 지속을 위한 주입
- 위에서 합성한 회사 맥락 요약을 프로젝트 루트 `CLAUDE.md`의
  `<!-- JINHAK-CONTEXT:START -->` ~ `<!-- JINHAK-CONTEXT:END -->` 블록으로 저장한다
  (블록이 이미 있으면 교체, 없으면 파일 끝에 추가; CLAUDE.md가 없으면 생성).
- 이렇게 하면 다음 세션부터 Claude가 회사 맥락을 자동으로 안다.

## 5. 마무리 안내
사용자에게 한 줄로 알린다:
> ✅ 이제 AI가 회사를 압니다. "우리 팀 올해 목표가 뭐였지?" 처럼 물어보세요.
> (정식 도입 시 이 컨텍스트는 SharePoint에서 자동으로 내려옵니다 — IT 읽기전용 앱 1건 승인 필요)

## 규칙
- **읽기 전용**: 컨텍스트 소스 폴더는 절대 수정하지 않는다 (편집은 SharePoint 웹에서 사람만).
- 개인정보·confidential 내용은 요약에 그대로 노출하지 않는다.
- 추측 금지: 폴더에 없는 본부/팀 정보를 지어내지 않는다.

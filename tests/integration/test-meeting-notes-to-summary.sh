#!/usr/bin/env bash
# tests/integration/test-meeting-notes-to-summary.sh
# Phase 13 통합 테스트: 3개 회의록 .txt → /build → output/meeting-summary.md
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
INSTALL="$ROOT/bin/install.js"

TMP=$(mktemp -d -t jinhak-meeting-XXXXXX)
trap 'rm -rf "$TMP"' EXIT
export HARNESS_HOME="$TMP/harness-home"
export AGENTS_SKILLS_HOME="$ROOT/templates/.agents/skills"
cd "$TMP"

pass=0; fail=0
ok() { pass=$((pass+1)); printf '✅ %s\n' "$1"; }
ng() { fail=$((fail+1)); printf '❌ %s\n' "$1"; }
run_capture() { OUT=$("$@" 2>&1) && RC=0 || RC=$?; }

# 3개 회의록 .txt 생성
mkdir -p inbox/meetings
cat > inbox/meetings/01-kickoff.txt <<'EOF'
프로젝트 킥오프 미팅

날짜: 2026-05-19
참석자: 김PM, 이디자이너, 박개발
결정사항: 진학-하니스 v0.2 출시는 6월 첫째 주
액션: 김PM이 5/22까지 PRD 초안 공유
EOF

cat > inbox/meetings/02-review.txt <<'EOF'
주간 리뷰

일자: 2026-05-22
참석자: 김PM, 박개발
결정: build 커맨드에 회의록 스킬 추가
액션아이템: 박개발이 5/26까지 스킬 prototype 시연
EOF

cat > inbox/meetings/03-design.txt <<'EOF'
디자인 동기화

날짜: 2026-05-25
참석자: 이디자이너, 최마케팅
결정사항: README 미디어를 모두 다크 모드 호환으로 통일
액션: 최마케팅이 5/28까지 헤더 이미지 교체
EOF

# /build 실행 (회의록 키워드)
run_capture node "$INSTALL" build "이번 주 회의록 요약해줘"
printf '\n--- build 출력 ---\n%s\n(exit %d)\n' "$OUT" "$RC"
[ "$RC" -eq 0 ] && ok "build exit 0" || ng "build exit=$RC"

# 결과: stdout JSON에 skill + rows
case "$OUT" in
  *'"skill":"meeting-notes-to-summary"'*) ok "skill 라우팅 정확" ;;
  *) ng "skill 라우팅 실패" ;;
esac
case "$OUT" in
  *'"rows":3'*) ok "3건 처리됨" ;;
  *) ng "행 수 누락" ;;
esac

# output 파일 검사
SUMMARY="output/meeting-summary.md"
[ -f "$SUMMARY" ] && ok "$SUMMARY 생성됨" || ng "summary 파일 누락"
printf '\n--- summary.md ---\n%s\n--- end ---\n' "$(cat "$SUMMARY")"

# 헤더
case "$(cat "$SUMMARY")" in
  *'| 날짜 | 참석자 | 결정사항 | 액션 |'*) ok "마크다운 표 헤더" ;;
  *) ng "표 헤더 누락" ;;
esac
# 3개 모두 + 각 날짜 + 각 참석자 추출
for d in 2026-05-19 2026-05-22 2026-05-25; do
  case "$(cat "$SUMMARY")" in
    *"$d"*) ok "날짜 $d 추출" ;;
    *) ng "날짜 $d 누락" ;;
  esac
done
case "$(cat "$SUMMARY")" in
  *'김PM, 이디자이너, 박개발'*'김PM, 박개발'*'이디자이너, 최마케팅'*) ok "참석자 3행 모두 보존" ;;
  *) ng "참석자 누락" ;;
esac
# 라벨 변형 (일자: / 결정: / 액션아이템:) 모두 인식됨
case "$(cat "$SUMMARY")" in
  *'build 커맨드에 회의록 스킬 추가'*) ok "'결정:' 라벨 변형 인식" ;;
  *) ng "'결정:' 라벨 변형 누락" ;;
esac
case "$(cat "$SUMMARY")" in
  *'박개발이 5/26까지 스킬 prototype'*) ok "'액션아이템:' 라벨 변형 인식" ;;
  *) ng "'액션아이템:' 라벨 변형 누락" ;;
esac

# /plan 도 새 스킬을 매칭하는지 확인
run_capture node "$INSTALL" plan "회의록 요약해줘"
[ "$RC" -eq 0 ] && ok "plan exit 0" || ng "plan exit=$RC"
case "$OUT" in
  *'meeting-notes-to-summary'*) ok "plan: meeting 스킬 매칭" ;;
  *) ng "plan 매칭 실패" ;;
esac

# 기존 jobs-pdf-to-excel 분기는 깨지지 않았는지 (회귀 보호)
# 친절 리포트는 stderr로 가므로 별도 캡처
out_err=$(node "$INSTALL" build "임의 문자열 채용공고만 키워드" 2>&1 || true)
case "$out_err" in
  *'skill=jobs-pdf-to-excel'*'입력 폴더를 찾지 못했어요'*)
    ok "기존 jobs 라우팅 보존 (친절 리포트로 inbox-not-found 안내)" ;;
  *) ng "jobs 라우팅 회귀: $out_err" ;;
esac

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

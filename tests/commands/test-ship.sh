#!/usr/bin/env bash
# tests/commands/test-ship.sh — /ship 커맨드 + 토큰 가드 라벨 검증
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
INSTALL="$ROOT/bin/install.js"

TMP=$(mktemp -d -t jinhak-ship-XXXXXX)
trap 'rm -rf "$TMP"' EXIT
cd "$TMP"

# 임시 git repo 초기화
git init -q
git config user.email "test@example.com"
git config user.name "test"
echo "seed" > seed.txt && git add seed.txt && git commit -qm "init"

mkdir -p .harness handoff
cat > .harness/state.md <<'EOF'
# 프로젝트 상태

## 핸드오프 로그
- 2026-05-19T12:00:00Z  jobs.xlsx → /tmp/jinhak-ship/handoff/jobs-2026-05-19.xlsx
EOF

pass=0; fail=0
ok() { pass=$((pass+1)); printf '✅ %s\n' "$1"; }
ng() { fail=$((fail+1)); printf '❌ %s\n' "$1"; }
run_capture() { OUT=$("$@" 2>&1) && RC=0 || RC=$?; }

# A. cost label이 가장 먼저 출력되는지 (다른 커맨드에서도)
run_capture node "$INSTALL" verify --output /no/such 2>&1 || true
case "$OUT" in
  '🟢'*) ok "cost label 가장 첫 줄에 출력 (verify)" ;;
  *) ng "cost label 누락: ${OUT:0:60}" ;;
esac

# B. /ship dry-run
run_capture node "$INSTALL" ship
printf '\n--- B. ship dry-run ---\n%s\n(exit %d)\n' "$OUT" "$RC"
[ "$RC" -eq 0 ] && ok "ship dry-run exit 0" || ng "ship dry-run exit=$RC"
case "$OUT" in
  *'🟢 빠름'*) ok "ship cost label 출력" ;;
  *) ng "ship cost label 누락" ;;
esac
case "$OUT" in
  *'ship 미리보기'*'jobs-2026-05-19.xlsx'*) ok "ship 미리보기 + 마지막 handoff 로그 인식" ;;
  *) ng "ship 미리보기 누락" ;;
esac
case "$OUT" in
  *'dry-run 모드'*'--confirm'*) ok "dry-run 안내 + --confirm 안내" ;;
  *) ng "dry-run 안내 누락" ;;
esac

# 실제로 커밋되지 않았는지 확인
log_count=$(git log --oneline | wc -l)
[ "$log_count" -eq 1 ] && ok "dry-run에서 git commit 미실행" || ng "dry-run인데 커밋됨"

# C. /ship --confirm
run_capture node "$INSTALL" ship --confirm
printf '\n--- C. ship --confirm ---\n%s\n(exit %d)\n' "$OUT" "$RC"
[ "$RC" -eq 0 ] && ok "ship --confirm exit 0" || ng "ship --confirm exit=$RC"
case "$OUT" in
  *'커밋 완료'*) ok "커밋 완료 메시지" ;;
  *) ng "커밋 완료 메시지 누락" ;;
esac

log_count=$(git log --oneline | wc -l)
[ "$log_count" -eq 2 ] && ok "git 커밋 1건 추가됨" || ng "커밋 수 $log_count (기대 2)"

last=$(git log -1 --pretty=%s)
case "$last" in
  *'ship:'*'jobs.xlsx'*) ok "커밋 메시지에 handoff 로그 인용: $last" ;;
  *) ng "커밋 메시지 형식: $last" ;;
esac

# D. --message override
mkdir -p .harness && echo "edit" >> .harness/state.md
run_capture node "$INSTALL" ship --message "ship: custom test message" --confirm
case "$OUT" in
  *'커밋 완료: ship: custom test message'*) ok "--message override" ;;
  *) ng "--message override 실패" ;;
esac

# E. 변경 없을 때
run_capture node "$INSTALL" ship --confirm
case "$OUT" in
  *'커밋할 게 없습니다'*) ok "변경 없음 안내" ;;
  *) ng "변경 없음 안내 누락" ;;
esac

# F. git repo가 아닌 곳 — $TMP 안에 만들면 부모 git이 인식하므로 별도 mktemp 사용
NOTGIT=$(mktemp -d -t jinhak-notgit-XXXXXX)
cd "$NOTGIT"
run_capture node "$INSTALL" ship
[ "$RC" -eq 1 ] && ok "git repo 아닐 때 exit 1" || ng "exit=$RC"
case "$OUT" in
  *'git 저장소가 아닙니다'*) ok "git repo 안내" ;;
  *) ng "git repo 안내 누락" ;;
esac
cd "$TMP"
rm -rf "$NOTGIT"

printf '\n결과: %d 통과 / %d 실패\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

#!/bin/bash
set -e
TESTDIR=$(mktemp -d -t jinhak-test-XXXXXX)
export HARNESS_HOME="$TESTDIR/harness-home"
export AGENTS_SKILLS_HOME="$TESTDIR/agents/skills"
cd "$TESTDIR"
echo "🧪 격리 테스트 디렉터리: $TESTDIR"
"$@"
echo "🗑  리셋: rm -rf $TESTDIR"

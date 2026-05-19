.PHONY: reset test-fresh check-env bootstrap help

# 기본 타깃 — make 만 치면 도움말
help:
	@echo "jinhak-harness 개발 워크플로"
	@echo ""
	@echo "  make bootstrap   — 첫 셋업: env 점검 + Python 도구 설치 안내"
	@echo "  make check-env   — HARNESS_HOME/AGENTS_SKILLS_HOME export 확인"
	@echo "  make test-fresh CMD='<명령>'  — 격리 mktemp 디렉터리에서 명령 실행"
	@echo "  make reset       — dev-home, test-*, .venv-dev 모두 삭제 + npm unlink"
	@echo ""
	@echo "예시:"
	@echo "  make test-fresh CMD='node bin/install.js --version'"
	@echo "  make test-fresh CMD='jinhak-harness start'   # npm link 후"

# 격리 디렉터리 + npm link 모두 정리
reset:
	@rm -rf dev-home test-* .venv-dev
	@npm unlink -g jinhak-harness 2>/dev/null || true
	@echo "✅ 깨끗한 상태 (dev-home / test-* / .venv-dev 삭제, npm unlink)"

# 격리된 임시 디렉터리에서 명령 실행
test-fresh:
	@if [ -z "$(CMD)" ]; then \
		echo "사용법: make test-fresh CMD='<실행할 명령>'"; \
		exit 1; \
	fi
	@./scripts/fresh-test.sh sh -c "$(CMD)"

# 셸 환경변수 확인 (가이드 §3 Phase 0 자가 점검)
check-env:
	@if [ -z "$$HARNESS_HOME" ]; then \
		echo "❌ HARNESS_HOME 미설정 — export HARNESS_HOME=\$$PWD/dev-home 실행"; \
		exit 1; \
	fi
	@if [ -z "$$AGENTS_SKILLS_HOME" ]; then \
		echo "❌ AGENTS_SKILLS_HOME 미설정"; \
		exit 1; \
	fi
	@echo "✅ HARNESS_HOME=$$HARNESS_HOME"
	@echo "✅ AGENTS_SKILLS_HOME=$$AGENTS_SKILLS_HOME"
	@echo "✅ HARNESS_DEV=$${HARNESS_DEV:-(unset)}"
	@command -v python3 >/dev/null && echo "✅ python3 = $$(python3 --version 2>&1)" || echo "❌ python3 없음"
	@python3 -c "import pdfplumber, openpyxl, pandas" 2>/dev/null \
		&& echo "✅ pdfplumber / openpyxl / pandas import OK" \
		|| echo "❌ Python 도구 누락 — make bootstrap 참고"

# 첫 셋업 가이드 (사용자가 셸에서 직접 export 해야 함)
bootstrap:
	@echo "==================================================="
	@echo " jinhak-harness 첫 셋업 — 아래를 같은 셸에 복사"
	@echo "==================================================="
	@echo ""
	@echo "  export HARNESS_HOME=\$$PWD/dev-home"
	@echo "  export AGENTS_SKILLS_HOME=\$$PWD/dev-home/agents/skills"
	@echo "  export HARNESS_DEV=1"
	@echo ""
	@echo "  # Python 도구 (한 번만)"
	@echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
	@echo "  uv tool install --with pdfplumber --with openpyxl --with pandas jinhak-harness-pytools"
	@echo ""
	@echo "  # 또는 pip 폴백"
	@echo "  pip3 install --user pdfplumber openpyxl pandas"
	@echo ""
	@echo "  # 셋업 검증"
	@echo "  make check-env"
	@echo ""
	@echo "==================================================="

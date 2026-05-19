# jinhak-harness — OpenCode 설치 가이드

## 빠른 설치

```bash
# 1) 클론 + npm link (npm publish 풀리기 전 권장 경로)
cd ~/Downloads
git clone https://github.com/ohilikeit/jinhak-vibecode.git
cd jinhak-vibecode && npm link

# 2) OpenCode 채팅창에 슬래시 커맨드 등록
jinhak-harness register --host=opencode
# 또는 모든 호스트 한 번에:
# jinhak-harness register
```

## OpenCode와 연동

### 슬래시 커맨드

`register` 가 `~/.config/opencode/commands/jinhak-harness/*.md` 로 12개 커맨드를 복사합니다. OpenCode를 재시작하면 채팅창에서 자동완성 후보로 노출:

```
/jinhak-harness:init
/jinhak-harness:doctor
/jinhak-harness:start
/jinhak-harness:autopilot 채용공고 Excel 정리
```

### 스킬 (.agents/skills/)

OpenCode는 `.agents/skills/` 디렉터리도 자동 스캔합니다. `AGENTS_SKILLS_HOME` 환경변수로 가리키거나 작업 디렉터리에 복사하세요:

```bash
export AGENTS_SKILLS_HOME=$(pwd)/templates/.agents/skills
```

## 첫 실행 (CLI로도 동일하게 동작)

```bash
jinhak-harness doctor              # 환경 점검
jinhak-harness init                # 홈 디렉터리 초기화
jinhak-harness start               # 5문항 직군 인터뷰
jinhak-harness plan "<요청>"
jinhak-harness build "<요청>"
jinhak-harness verify
jinhak-harness handoff --confirm
```

## 호환 도구

- Claude Code (v2.1.139+) — `.claude-plugin/plugin.json`
- Cursor (v0.40+) — `.cursor-plugin/plugin.json`
- OpenAI Codex CLI — `.codex-plugin/plugin.json`
- Gemini CLI — `gemini-extension.json`
- Google Antigravity — `.antigravity/plugin.json`
- OpenCode — 이 가이드

자세한 사용법은 레포 루트의 [GETTING_STARTED.md](../GETTING_STARTED.md) (비개발자용) 또는 [USAGE.md](../USAGE.md) (개발자용) 참고.

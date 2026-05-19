# jinhak-harness — OpenCode 설치 가이드

## 빠른 설치

```bash
npx jinhak-harness@latest
# 또는
npm install -g jinhak-harness
```

## OpenCode와 연동

OpenCode는 `.agents/skills/` 디렉터리를 자동 스캔합니다. 이 패키지를 설치하면 `templates/.agents/skills/*` 가 사용자의 작업 디렉터리에 복사되거나, `AGENTS_SKILLS_HOME` 환경변수로 가리킬 수 있습니다.

```bash
export AGENTS_SKILLS_HOME=$(npm root -g)/jinhak-harness/templates/.agents/skills
```

## 첫 실행

```bash
jinhak-harness doctor      # 환경 점검
jinhak-harness start       # 5문항 직군 인터뷰
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

자세한 사용법은 레포 루트의 `USAGE.md` 또는 `README.md` 참고.

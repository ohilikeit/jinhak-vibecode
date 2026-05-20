# /register — 6 호스트에 슬래시 커맨드 등록

CLI를 설치한 후, AI 도구 채팅창에서 `/jinhak:init` `/jinhak:build` 등으로 호출하려면 각 호스트의 user-level commands/ 디렉터리에 사본을 복사해야 합니다. `register` 가 이 단계를 6 호스트 모두에 한 번에 수행합니다.

## 실행

전체 호스트:

```bash
npx -y jinhak-harness register
```

미리 보기만:

```bash
npx -y jinhak-harness register --dry-run
```

특정 호스트만:

```bash
npx -y jinhak-harness register --host=claude,cursor
```

`$ARGUMENTS` 그대로 전달:

```bash
npx -y jinhak-harness register $ARGUMENTS
```

## 등록 위치 (호스트별)

| 호스트 | 경로 | 결과 |
|---|---|---|
| Claude Code | `~/.claude/commands/jinhak/*.md` | `/jinhak:init` |
| Cursor | `~/.cursor/commands/jinhak/*.md` | `/jinhak:init` |
| Codex CLI | `~/.codex/prompts/jinhak/*.md` | `/jinhak:init` |
| Gemini CLI | `~/.gemini/commands/jinhak/*.toml` | `/jinhak:init` |
| Antigravity | `~/.gemini/antigravity/commands/jinhak/*.md` | `/jinhak:init` |
| OpenCode | `~/.config/opencode/commands/jinhak/*.md` | `/jinhak:init` |

## 적용 안 보일 때

해당 AI 도구를 **완전히 종료** 후 다시 실행하세요. 캐시된 슬래시 목록을 재로드해야 새로 등록된 항목이 자동완성에 뜹니다.

## 제거

```bash
npx -y jinhak-harness unregister
```

# ADR-004: Scheduler & Background Strategy

**상태**: Accepted (MVP)
**작성일**: 2026-05-19
**관련**: README §2.C, §4 원칙 7, REPORT_06 §3.3

---

## 1. 결정 (Decision)

**Subagent · Background · Cron 자체 런타임을 만들지 않는다.** 호스트(Claude Code / Cursor / Codex)와 OS(cron / launchd / schtasks)가 이미 제공하는 검증된 기능에 위임하고, 우리는 **비개발자의 자연어를 그 호출로 변환하는 ~250줄 shim**만 갖는다.

## 2. 영역별 정책

### 2.1 Subagent
- **호스트 위임**: Claude Code `Task`, Cursor Composer, Codex sub-tasks, OMC `/team`
- **우리 책임**: SKILL.md 본문에 "별도 컨텍스트 유리하면 호스트 서브에이전트 호출" 패턴 1줄 권장
- **Superpowers 2단계 검증 패턴**(spec compliance → quality) 차용 — 단, **같은 세션 2회 패스**로, 별도 Task 스폰 X
- **Worktree 격리**: MVP 제외, power 프로필에서만 `git worktree` CLI 직접 호출

### 2.2 Background
- **1순위**: Claude Code `run_in_background: true` (Bash 도구 옵션)
- **2순위**: hooks/session-start 1개 (Superpowers 패턴, ~500토큰 부트스트랩)
- **컨텍스트 watchdog**: GSD `gsd-context-monitor.js` 차용 — **새 LLM 호출 0**, 디스크 메트릭만 읽는 1회성 `spawn(detached:true)`
- **거부**: 자체 worker pool · batch runner · asyncio loop · 데몬

### 2.3 Cron
- **호스트 디텍션 + 1줄 위임**

```
common/scheduler/  (~200줄 shim)
├── SKILL.md
├── detect.ts       # 호스트·OS 디텍션
└── scripts/
    ├── schedule.ts # 자연어 → 백엔드 위임
    └── nl-to-cron.ts  # "매주 월요일 9시" → "0 9 * * 1"
```

**디텍션 우선순위**:
| 환경 | 호출 방식 |
|---|---|
| Claude Code 세션 내 | `CronCreate` MCP 도구 (네이티브) |
| macOS | `launchctl bootstrap` + `~/Library/LaunchAgents/*.plist` |
| Linux / WSL | `crontab -l \| { cat; echo "..."; } \| crontab -` |
| Windows | `schtasks /Create /SC WEEKLY ...` |

**자연어 변환**: 한국어 패턴 20~30개 손코딩 (croniter 의존성 X)

## 3. 거부된 대안

### Alt-A. Hermes `scheduler.py` 1837줄 + `jobs.py` 1160줄 포팅
- ❌ 비개발자 하네스에 3,000줄 추가 코드 — 토큰 경제·유지보수 부담
- ❌ croniter Python 의존성 추가
- ❌ 자체 데몬은 노트북 절전·재기동·grace window를 자체 구현 필요 (OS cron이 이미 처리)
- ❌ multi-host(Claude Code/Cursor/Codex) 안에서 우리 데몬이 또 도는 것은 자원 충돌

### Alt-B. Hermes `batch_runner.py` + multiprocessing.Pool 차용
- ❌ MVP eco 사용자(월 3만원 구독)에 multiprocessing은 과잉
- ❌ Claude Code `run_in_background`로 충분
- ⚠️ v0.3+ power 프로필에서 재검토

### Alt-C. Hermes `delegate_tool.py` 2228줄 차용
- ❌ Claude Code `Task` 도구가 이미 동일 기능
- ❌ ThreadPool·승인 콜백 격리는 우리 단일 사용자 환경에 불필요

## 4. 차용은 하되 코드는 안 가져오는 것

| 출처 | 패턴 | 우리 위치 |
|---|---|---|
| Superpowers | 2단계 검증 (spec → quality) | `/verify` standard+에서 같은 세션 2회 패스 |
| GSD | `spawn(detached:true)` 컨텍스트 모니터 | `hooks/context-watchdog.js` (LLM 호출 0) |
| Hermes scheduler | 한국어 자연어 → cron 변환 룰 (개념만) | `common/scheduler/scripts/nl-to-cron.ts` |
| Hermes scheduler | 3가지 스케줄 타입(once/interval/cron) UX | 사용자 입력 분기만 (실행은 OS) |

## 5. 토큰·유지보수 비교

| 항목 | 과잉 차용 | **최소주의 (이 ADR)** |
|---|---|---|
| 추가 코드 | ~3,000줄 | **~250줄** |
| Python 의존성 | croniter 추가 | 불필요 |
| 백그라운드 데몬 | 직접 실행 | **호스트/OS가 처리** |
| 절전·재기동·grace window | 자체 구현 | **OS cron 처리** |
| LLM 호출 (cron tick) | 매번 | **0회** |
| Multi-host 호환 | 우리 데몬이 호스트 안에서 또 동작 | **각 호스트 네이티브** |

## 6. 위험 & 완화

| 위험 | 완화 |
|---|---|
| 호스트별 cron 호출 방식 차이 | `detect.ts`가 한 곳에서 분기. 4종(CronCreate/cron/launchd/schtasks)만 지원, 나머진 "수동 설정 가이드" 출력 |
| 사용자가 잘못된 자연어 입력 | `/verify` 단계에서 Dry-run으로 다음 3회 실행 시각 미리 보여주고 확인 |
| OS cron이 노트북 절전 시 누락 | Anacron 안내 (Linux/macOS), Windows는 `/SC ONLOGON` 옵션 추가 |
| 비개발자가 cron 등록 권한 부족 | 호스트 내 등록(`CronCreate`) 1순위로 권한 회피 |

## 7. 후속 액션

1. `common/scheduler/scripts/detect.ts` — 4종 디텍션
2. `common/scheduler/scripts/nl-to-cron.ts` — 한국어 패턴 20~30개
3. `hooks/context-watchdog.js` — GSD 패턴 차용, LLM 호출 0
4. README §2.C 보강 (완료)
5. SKILL.md 작성 가이드: "스케줄 필요 시 `common/scheduler`에 위임, 자체 setInterval/cron 표현 직접 작성 금지"

## 8. 결론

> Subagent · Background · Cron은 우리가 만들지 않는다. 호스트(Claude Code `Task`/`run_in_background`/`CronCreate`)와 OS(cron/launchd/schtasks)가 이미 처리한다. 우리는 비개발자의 자연어를 그 호출로 변환하는 ~250줄 shim만 갖는다. Hermes의 3,000줄 production 구현은 참고만 하고 차용하지 않는다.

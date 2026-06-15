# jinhak-harness — session-start 훅 PowerShell 폴백 (bash 없는 네이티브 Windows용)
#
# 동일한 Node 엔진(session-start.js)을 호출해 그 stdout(JSON)을 호스트에 그대로 전달한다.
# bash가 없는 순수 Windows(cmd/PowerShell) 환경에서도 개인 컨텍스트 자동 주입이 동작하도록.
#
# 호스트 훅 설정에서 이 파일을 지정하거나, 직접:  powershell -File hooks/session-start.ps1
# 설계 원칙: 절대 세션을 막지 않는다 — node 없거나 실패해도 조용히 빈 출력.

$ErrorActionPreference = 'SilentlyContinue'

$engine = Join-Path $PSScriptRoot 'session-start.js'

if ((Get-Command node -ErrorAction SilentlyContinue) -and (Test-Path $engine)) {
    & node $engine
}

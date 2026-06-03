---
unit: team
name: AX팀
division: 전사CEO직속
owner: aiteam01@jinhakapply.com
review_cycle: monthly
last_reviewed: 2026-05-28
next_review_due: 2026-06-28
classification: internal
---

# AX팀 — 2026 목표 & KPI

> CEO 직속에서 전사 AI 전환(AX)을 실행하고, 진학사 핵심 서비스의 AI 모델을 직접 개발하는 팀.

## 팀 역할 (두 축)
1. **전사 AX 추진** — 직원이 쓰는 AI 도구에 회사 맥락·데이터·검증을 자동 주입하는 공통 하니스 구축·배포
2. **AI 모델 개발** — 진학닷컴 수시 합격예측의 'AI점수'를 비롯한 자체 AI 서비스 고도화

## 2026 OKR
- **O1. 비개발자 AI 자립도 향상**
  - KR1: 사내 AI 도입률 30% → 70%
  - KR2: 비개발자가 직접 만든 자동화 누적 50건
- **O2. 회사 맥락·데이터 인프라(1·2층) 가동**
  - KR1: 본부/팀/프로젝트 컨텍스트 SharePoint SSOT 구축 + 읽기 전용 동기화
  - KR2: 4대 서비스 데이터에 안전한 읽기 접근 경로 확보
- **O3. 수시 합격예측 AI점수 모델 고도화**
  - KR1: 합격예측 적중률 baseline 대비 향상
  - KR2: 학생부 AI진단(교과/비교과) 분석 품질 개선

## 작업 원칙
- 호스트가 주는 기능(subagent·cron·MCP)은 다시 만들지 않는다
- 고비용 기능(벤치마크·압박테스트)은 옵트인, 기본은 eco 프로필
- 학생 개인정보·성적은 모델 학습/산출물에서 엄격 분리

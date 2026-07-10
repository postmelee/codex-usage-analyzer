# Task M010 #30 최종 보고서

GitHub Issue: [#30](https://github.com/postmelee/codex-usage-analyzer/issues/30)
마일스톤: M010

## 작업 요약

- 대상 이슈: #30
- 마일스톤: M010
- 단계 수: 4개(Stage 1, 1.1, 2, 3)
- 작업 목적: remote Codex profile source의 parity와 보안 경계를 검증하고 기본 analyzer 채택 여부를 결정한다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `mydocs/plans/task_m010_30.md` | #30 범위와 보안 경계 | 내부 작업 계획 |
| `mydocs/plans/task_m010_30_impl.md` | 단계별 조사·검증 절차 | 내부 구현 계획 |
| `mydocs/working/task_m010_30_stage1.md` | 공개 source와 credential boundary | 기술 조사 |
| `mydocs/working/task_m010_30_stage1_1.md` | Desktop bundle profile endpoint 분석 | 기술 조사 |
| `mydocs/working/task_m010_30_stage2.md` | 승인된 direct call, parity, mock 전략 | 기술 검증 |
| `mydocs/working/task_m010_30_stage3.md` | 공식 account usage 경로와 최종 판단 | 기술 검증 |
| `mydocs/orders/20260705.md` | #30 완료 처리 | 내부 작업 추적 |

Runtime code, package metadata, public README와 npm artifact는 변경하지 않았다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| 계획서 | `mydocs/plans/` | `mydocs/plans/` | OK | 내부 task 계획 표준 위치 |
| 단계 보고서 | `mydocs/working/` | `mydocs/working/` | OK | feasibility 조사 표준 위치 |
| 최종 보고서 | `mydocs/report/` | `mydocs/report/` | OK | 장기 보관 보고 위치 |
| 사용자-facing 문서 | 이번 task 제외 | 생성하지 않음 | OK | 실제 기능 채택은 M020 후속 이슈로 분리 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---:|---:|
| 확인된 profile endpoint | 0 | 비공식 1개 범주 |
| 공식 account usage method | 미확인 | 1개 |
| live verification | 0 | 비공식 profile 1회, 공식 account usage 1회 |
| runtime 변경 파일 | 0 | 0 |
| 자동 테스트 | 47개 | 47개 통과 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| remote command 가능성 판단 | OK — current build에서는 가능하지만 비공식 profile 경로는 기본 기능에서 거부했다. |
| local과 remote 보안 경계 분리 | OK — credential 직접 접근과 default analyzer 사용을 금지했다. |
| profile parity와 latency 기준 | OK — 동일 시점 화면 parity와 bounded latency 비교 기준을 확정했다. |
| 실제 credential/raw response 없는 mock 전략 | OK — fake transport, synthetic response, redaction failure 시나리오를 정의했다. |
| 후속 구현 범위 분리 | OK — 공식 account usage M020 core와 experimental identity adapter를 분리했다. |
| 공식 account usage 검증 | OK — 공개 app-server handshake와 field/type-only live probe를 통과했다. |

### 단계별 검증 결과

- Stage 1: 공개 source와 local/remote credential boundary를 분류했다.
- Stage 1.1: Desktop bundle에서 `/wham/profiles/me`와 host auth bridge를 확인했다.
- Stage 2: 승인된 live probe에서 profile parity와 latency 우위를 확인하고 mock/no persistence 전략을 확정했다.
- Stage 3: 공식 `account/usage/read`를 확인하고 사용량과 experimental identity 책임을 분리했다.

## 최종 결론

- 사용량 수집은 공식 `account/usage/read` 기반 thin CLI로 전환한다.
- 비공식 `/wham/profiles/me`는 기본 analyzer와 기본 submit payload에서 사용하지 않는다.
- 이름, username, avatar가 필요한 경우에만 별도 experimental identity adapter 이슈에서 검토한다.
- M020은 기존 `UsageSnapshot v2`를 확장하는 작업이 아니라 v0.2.0 breaking architecture reset으로 진행한다.

## 잔여 위험과 후속 작업

### 잔여 위험

- 오래된 Codex CLI와 비 ChatGPT 인증 환경에서는 account usage가 unavailable일 수 있다.
- app-server 실행 실패와 JSON-RPC schema drift를 사용자에게 민감정보 없이 설명해야 한다.
- 비공식 identity endpoint는 예고 없이 변경되거나 차단될 수 있다.

### 후속 작업 후보

- M020 account usage/downstream 제출 계약 문서와 JSON Schema 확정.
- M020 `account/usage/read` thin CLI 및 SDK 구현.
- optional experimental profile identity adapter를 별도 이슈로 검토.

## 작업지시자 승인 요청

- 최종 보고서와 수용 기준 검증 결과를 승인하면 PR 게시 절차와 M020 task 등록을 진행한다.

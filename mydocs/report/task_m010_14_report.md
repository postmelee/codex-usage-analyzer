# Task M010 #14 최종 결과보고서

GitHub Issue: [#14](https://github.com/postmelee/codex-usage-analyzer/issues/14)
마일스톤: M010

## 작업 요약

- 대상 이슈: #14
- 마일스톤: M010
- 단계 수: 4
- 작업 목적: profile smoke 비교 결과를 parser bug 후보와 remote/local source 차이로 더 명확히 구분한다.

이번 task는 `UsageSnapshot v2` schema와 public SDK export를 변경하지 않고, redacted profile smoke baseline에 optional `sourcePolicy` metadata를 추가로 허용했다. source-sensitive field는 source policy 또는 `profileComparison.parity: "not_guaranteed"` diagnostic을 통해 `source_mismatch` 또는 `profile_parity_not_guaranteed` reason을 반환한다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `src/profile-baseline.js` | optional `sourcePolicy` validation, source-aware reason 적용, source-sensitive field 기본 reason 보강 | profile smoke helper 내부 비교 로직 |
| `src/__tests__/profile-baseline.test.js` | source policy, parity fallback, source mismatch fixture, script safety regression test 추가 | test suite |
| `src/__tests__/fixtures/profile-baseline/source-mismatch-baseline.json` | synthetic source mismatch baseline fixture 추가 | test fixture |
| `src/__tests__/fixtures/profile-baseline/README.md` | baseline `sourcePolicy` contract와 `not_comparable` 차이 문서화 | fixture contract 문서 |
| `README.md` | profile smoke result reason taxonomy, `sourcePolicy` 예시, source-aware mismatch 해석 문서화 | 사용자/기여자 문서 |
| `mydocs/plans/task_m010_14.md` | 수행계획서 작성 | 작업 산출물 |
| `mydocs/plans/task_m010_14_impl.md` | 구현계획서 작성 | 작업 산출물 |
| `mydocs/working/task_m010_14_stage1.md` | reason taxonomy와 source policy 설계 보고 | 작업 산출물 |
| `mydocs/working/task_m010_14_stage2.md` | source-aware comparison 구현 보고 | 작업 산출물 |
| `mydocs/working/task_m010_14_stage3.md` | README/fixture 문서 보강 보고 | 작업 산출물 |
| `mydocs/working/task_m010_14_stage4.md` | 통합 검증 보고 | 작업 산출물 |
| `mydocs/report/task_m010_14_report.md` | 최종 결과보고서 | 작업 산출물 |
| `mydocs/orders/20260617.md` | task-start 당시 오늘할일 추가 | 작업 보드 |
| `mydocs/orders/20260629.md` | 최종 완료 상태 기록 | 작업 보드 |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| `README.md` | `README.md` | `README.md` | OK | 기존 profile parity smoke 공식 사용자/기여자 문서 위치를 유지했다. |
| `src/__tests__/fixtures/profile-baseline/README.md` | `src/__tests__/fixtures/profile-baseline/` | `src/__tests__/fixtures/profile-baseline/README.md` | OK | fixture contract 문서로 유지했다. |
| `mydocs/plans/task_m010_14*.md` | `mydocs/plans/` | `mydocs/plans/` | OK | 수행/구현 계획서 위치 규칙과 일치한다. |
| `mydocs/working/task_m010_14_stage{1,2,3,4}.md` | `mydocs/working/` | `mydocs/working/` | OK | 단계 보고서 위치 규칙과 일치한다. |
| `mydocs/report/task_m010_14_report.md` | `mydocs/report/` | `mydocs/report/task_m010_14_report.md` | OK | 최종 보고서 위치 규칙과 일치한다. |
| `mydocs/orders/{date}.md` | `mydocs/orders/` | `mydocs/orders/` | OK | 오늘할일 날짜 파일 규칙과 일치한다. |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| 전체 test count | 40 | 47 |
| profile smoke source-mismatch fixture | 없음 | `source-mismatch-baseline.json` 1개 |
| source-aware mismatch reason | activity non-numeric 일부만 `profile_parity_not_guaranteed` | optional `sourcePolicy` + source-sensitive 기본 reason |
| `UsageSnapshot v2` schema | v2 유지 | v2 유지 |
| profile baseline schemaVersion | 1 | 1 |
| public SDK export | 변경 없음 | 변경 없음 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| remote/local source가 다른 비교에서 단순 numeric mismatch만 쌓이지 않고 source reason이 드러난다 | OK — source-mismatch smoke assertion에서 mismatched 4, sourceMismatch 4 확인 |
| source-sensitive field의 reason이 regression test로 고정된다 | OK — `uses profile parity reason for source-sensitive mismatches without source policy` 등 신규 테스트 통과 |
| `UsageSnapshot v2` schema는 변경하지 않는다 | OK — schema 파일과 public export 변경 없음, test suite 통과 |
| 실제 계정 baseline, raw analyzer JSON, local path, credential, screenshot 원본을 저장소에 남기지 않는다 | OK — synthetic fixture만 추가했고 Stage 3 privacy-pattern-scan 통과 |
| README와 fixture contract가 source-aware reason을 설명한다 | OK — `source_mismatch`, `profile_parity_not_guaranteed`, `not_comparable`, `sourcePolicy` 문서화 |
| `git diff --check`가 경고 없이 통과한다 | OK — Stage 4 통합 검증 통과 |

### 단계별 검증 결과

- Stage 1: [`task_m010_14_stage1.md`](../working/task_m010_14_stage1.md) — reason taxonomy와 optional `sourcePolicy` 설계를 확정했고 `npm test` 40개 통과, 기존 profile smoke 통과.
- Stage 2: [`task_m010_14_stage2.md`](../working/task_m010_14_stage2.md) — source-aware comparison 구현과 regression test 추가, `npm test` 47개 통과.
- Stage 3: [`task_m010_14_stage3.md`](../working/task_m010_14_stage3.md) — README/fixture contract 문서화, reason scan과 privacy-pattern-scan 통과.
- Stage 4: [`task_m010_14_stage4.md`](../working/task_m010_14_stage4.md) — 통합 검증, source-mismatch smoke assertion, 최종 보고서 작성 완료.

## 잔여 위험과 후속 작업

### 잔여 위험

- source-aware mismatch도 aggregate `failed`와 script exit status 1을 유지한다. 이는 값 차이를 숨기지 않기 위한 의도된 동작이며, QA에서는 field reason을 함께 확인해야 한다.
- 실제 screenshot-derived baseline은 저장소에 추가하지 않았다. 실제 profile parity 확인은 작업지시자가 별도 uncommitted redacted baseline을 준비해야 한다.
- `sourcePolicy`는 comparison field path 단위 metadata다. ranking item 단위 policy가 필요하면 별도 schema 설계가 필요하다.

### 후속 작업 후보

- #7 release/publish checklist에서 profile smoke helper를 repo-only QA 도구로 둘지 npm package 포함 대상으로 둘지 다시 확인한다.
- 실제 profile parity 확인이 필요하면 별도 uncommitted redacted baseline으로 `scripts/profile-smoke.js`를 실행한다.

## 작업지시자 승인 요청

- 최종 보고서와 수용 기준 검증 결과를 승인하면 `publish/task14` push와 `main` 대상 Open PR 생성 절차로 진행한다.

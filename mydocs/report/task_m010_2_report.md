# Task M010 #2 최종 보고서

GitHub Issue: [#2](https://github.com/postmelee/codex-usage-analyzer/issues/2)
마일스톤: M010

## 작업 요약

- 대상 이슈: #2
- 마일스톤: M010
- 단계 수: 4
- 작업 목적: fixture-backed 기본 출력과 production analyzer 출력 경로를 분리해 사용자가 sample 값을 실제 Codex usage/profile 값으로 오해하지 않도록 한다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `src/analyze.js` | `analyzeUsage()` 기본 경로를 production unavailable snapshot으로 변경하고 sample helper와 분리했다. | SDK 기본 분석 결과 |
| `src/cli.js` | `--fixture-sample` option을 추가해 sample fixture 출력 경로를 명시화했다. | CLI command surface |
| `src/index.d.ts` | production unavailable snapshot 정책을 타입 주석으로 설명했다. | SDK type consumer |
| `src/__tests__/analyze.test.js` | production baseline, sample sentinel 부재, sample helper marker 유지 검증을 추가했다. | SDK regression test |
| `src/__tests__/cli.test.js` | 기본 CLI와 fixture CLI 경로를 별도 검증하고 unknown flag 실패를 확인했다. | CLI regression test |
| `README.md` | 기본 production 출력 의미와 fixture sample command를 분리해 설명했다. | 사용자/기여자 문서 |
| `mydocs/working/task_m010_2_stage1.md` | fixture 의존 경로와 sample-only sentinel을 고정했다. | 작업 산출물 |
| `mydocs/working/task_m010_2_stage2.md` | production unavailable snapshot 구현 결과를 기록했다. | 작업 산출물 |
| `mydocs/working/task_m010_2_stage3.md` | fixture 전용 CLI 경로 명시 결과를 기록했다. | 작업 산출물 |
| `mydocs/working/task_m010_2_stage4.md` | 회귀 검증과 최종 정리 결과를 기록했다. | 작업 산출물 |
| `mydocs/report/task_m010_2_report.md` | 최종 결과와 PR 전 승인 요청을 정리했다. | 작업 산출물 |
| `mydocs/orders/20260614.md` | #2 상태를 완료로 갱신했다. | 운영 보드 |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| `README.md` | 저장소 루트 `README.md` | `README.md` | OK | 수행계획서에서 사용자/기여자 대상 공식 문서 위치로 승인받은 위치다. |
| `mydocs/plans/task_m010_2_impl.md` | `mydocs/plans/` | `mydocs/plans/task_m010_2_impl.md` | OK | 구현 전 승인용 작업 산출물 위치와 일치한다. |
| `mydocs/working/task_m010_2_stage{N}.md` | `mydocs/working/` | `mydocs/working/task_m010_2_stage1.md` - `stage4.md` | OK | 단계별 완료 보고서 위치와 일치한다. |
| `mydocs/report/task_m010_2_report.md` | `mydocs/report/` | `mydocs/report/task_m010_2_report.md` | OK | 최종 결과보고서 위치와 일치한다. |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| 자동 테스트 수 | 6개 pass | 9개 pass |
| CLI JSON 출력 경로 | 기본 `analyze --json` 1개 | production 기본 경로 + 명시적 fixture sample 경로 |
| 기본 `analyze --json` fixture marker | 존재 | 없음 |
| 기본 `analyze --json` profile/assets sample object | 포함 | 생략 |
| 기본 `analyze --json` usage total | sample fixture nonzero 값 | unavailable baseline `0` |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 기본 `analyze --json`이 sample임을 숨긴 결과를 반환하지 않는다. | OK — 기본 CLI 출력에서 fixture marker, profile/assets sample object가 사라지고 unavailable diagnostic이 출력된다. |
| fixture를 쓰려면 명시적인 옵션 또는 test/helper 경로를 사용해야 한다. | OK — CLI는 `--fixture-sample`, SDK는 `createSampleUsageSnapshotV2()` helper를 사용해야 sample snapshot을 얻는다. |
| README와 테스트가 production path와 fixture path를 각각 검증한다. | OK — README에 두 경로를 분리해 설명했고 CLI/SDK 테스트가 production과 fixture path를 별도 검증한다. |
| 실제 사용자 데이터, 로컬 private path, 인증 토큰, 계정 식별자 원본을 새로 노출하지 않는다. | OK — 새 출력/문서에는 정적 diagnostic과 repo-relative 경로만 사용했다. |
| `git diff --check`가 통과한다. | OK — Stage 4 검증에서 통과했다. |

### 단계별 검증 결과

- Stage 1: [task_m010_2_stage1.md](../working/task_m010_2_stage1.md) — fixture 의존 경로 grep, `npm test`, `git diff --check` 통과.
- Stage 2: [task_m010_2_stage2.md](../working/task_m010_2_stage2.md) — `npm test`, 기본 CLI JSON, `git diff --check`, sample sentinel 부재 직접 확인 통과.
- Stage 3: [task_m010_2_stage3.md](../working/task_m010_2_stage3.md) — `npm test`, 기본 CLI JSON, fixture sample CLI JSON, fixture 경로 grep, `git diff --check` 통과.
- Stage 4: [task_m010_2_stage4.md](../working/task_m010_2_stage4.md) — `npm test`, 기본/fixture CLI JSON, 최종 grep, `git diff --check` 통과.

## 잔여 위험과 후속 작업

### 잔여 위험

- 실제 local parser는 아직 구현되지 않았으므로 production 기본 출력은 unavailable baseline이다.
- fixture sample command는 의도적으로 남아 있으므로, 이후 README와 테스트에서 sample/dev/test 용도 구분을 계속 유지해야 한다.
- public sample helper와 production analyzer가 같은 module에 함께 있으므로, 필요하면 후속 리팩터링에서 파일 분리를 검토할 수 있다.

### 후속 작업 후보

- #3: production unavailable baseline을 실제 usage/activity/model parser 결과로 채우되 sample fallback을 재도입하지 않는다.
- #4: topSkills/topPlugins ranking extractor는 empty array baseline을 실제 ranking으로 대체한다.
- #5: avatar/pet asset discovery는 local private path와 account image URL을 기본 출력에 넣지 않는 safe output 정책을 유지한다.
- #6: 실제 Codex profile 값 비교 smoke test는 fixture sample이 아니라 production path를 기준으로 비교한다.

## 작업지시자 승인 요청

- 최종 보고서와 수용 기준 검증 결과를 승인하면 PR 게시 절차로 진행한다.

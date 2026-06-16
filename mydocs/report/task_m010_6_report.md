# Task M010 #6 최종 보고서

GitHub Issue: [#6](https://github.com/postmelee/codex-usage-analyzer/issues/6)
마일스톤: M010

## 작업 요약

- 대상 이슈: #6
- 마일스톤: M010
- 단계 수: 4
- 작업 목적: 실제 Codex profile UI 값과 analyzer production output을 안전하게 비교할 수 있는 redacted baseline smoke 절차를 구현했다.

이번 task는 Codex Desktop remote profile API나 UI 자동화를 사용하지 않고, 사용자가 수동으로 redaction한 baseline과 local analyzer snapshot을 비교하는 QA 도구를 추가했다. 실제 raw analyzer JSON, local path, account identifier, credential, screenshot 원본을 저장소 문서에 보관하지 않는 정책을 유지했다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `src/profile-baseline.js` | redacted baseline validation, tolerance comparison, `not_comparable`, sample fixture guard, safe summary formatter 추가 | 내부 QA 비교 로직 |
| `scripts/profile-smoke.js` | redacted baseline과 production snapshot을 비교하는 로컬 smoke command 추가 | 개발/릴리즈 QA |
| `src/__tests__/profile-baseline.test.js` | profile smoke 비교 동작과 script safety regression test 추가 | 테스트 |
| `src/__tests__/fixtures/profile-baseline/README.md` | synthetic profile baseline fixture contract와 redaction rules 문서화 | 테스트 fixture 문서 |
| `src/__tests__/fixtures/profile-baseline/redacted-baseline.json` | parser fixture와 비교 가능한 synthetic baseline 예시 추가 | 테스트 fixture |
| `README.md` | profile parity smoke 사용법, 결과 상태, known mismatch reason, redaction rules 추가 | 사용자/기여자 문서 |
| `mydocs/plans/task_m010_6.md` | 수행계획서 | HWF 산출물 |
| `mydocs/plans/task_m010_6_impl.md` | 구현계획서 | HWF 산출물 |
| `mydocs/working/task_m010_6_stage1.md` | Stage 1 완료 보고서 | HWF 산출물 |
| `mydocs/working/task_m010_6_stage2.md` | Stage 2 완료 보고서 | HWF 산출물 |
| `mydocs/working/task_m010_6_stage3.md` | Stage 3 완료 보고서 | HWF 산출물 |
| `mydocs/working/task_m010_6_stage4.md` | Stage 4 완료 보고서 | HWF 산출물 |
| `mydocs/report/task_m010_6_report.md` | 최종 보고서 | HWF 산출물 |
| `mydocs/orders/20260616.md` | #6 오늘할일 상태 완료 갱신 | HWF 운영 문서 |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| `README.md` | `README.md` | `README.md` | OK | 수행계획서에서 사용자/기여자 문서로 README를 선택했고, profile parity smoke 사용법을 README에 추가했다. |
| `scripts/profile-smoke.js` | `scripts/` | `scripts/profile-smoke.js` | OK | public SDK export가 아니라 로컬 QA command로 분리했다. |
| `src/profile-baseline.js` | `src/` | `src/profile-baseline.js` | OK | 테스트 가능한 내부 모듈로 두고 public `src/index.js` export에는 추가하지 않았다. |
| `src/__tests__/fixtures/profile-baseline/` | `src/__tests__/fixtures/` | `src/__tests__/fixtures/profile-baseline/` | OK | synthetic baseline fixture와 README를 test fixture 영역에 추가했다. |
| `mydocs/*` 작업 산출물 | `mydocs/plans`, `mydocs/working`, `mydocs/report`, `mydocs/orders` | 계획된 각 위치 | OK | HWF 계획서, 단계 보고서, 최종 보고서, 오늘할일 위치와 일치한다. |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| profile baseline fixture | 없음 | synthetic redacted baseline 1개 |
| profile smoke command | 없음 | `scripts/profile-smoke.js` |
| profile baseline tests | 없음 | `src/__tests__/profile-baseline.test.js` |
| 전체 테스트 수 | 29개 pass | 39개 pass |
| parser fixture profile smoke | 없음 | total 19, matched 17, not comparable 2, mismatched 0 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 개발자가 로컬에서 analyzer 결과와 profile baseline을 같은 checklist로 비교할 수 있다 | OK — `scripts/profile-smoke.js --baseline ... --snapshot ...` 추가 및 README 문서화 |
| fixture와 실제 parser 값이 섞이는 회귀를 smoke test가 잡을 수 있다 | OK — sample fixture snapshot은 `sample_fixture_not_allowed`로 거부 |
| baseline 파일에 계정 token, local absolute path, 민감 원본 데이터가 들어가지 않는다 | OK — synthetic fixture privacy scan 통과, validation에서 sensitive-looking key/string reject |
| total tokens, peak daily tokens, streaks, activity insights, top skills/plugins, token breakdown, favorite model 비교 대상 포함 | OK — `src/profile-baseline.js` comparison field set과 synthetic baseline에 포함 |
| 허용 오차/날짜 기준 문서화 | OK — baseline `tolerances`, README known mismatch reason, profile comparison `not_comparable` 안내 |
| `UsageSnapshot v2` schema 변경 없음 | OK — public schema와 SDK export 변경 없음 |

### 단계별 검증 결과

- Stage 1: [`task_m010_6_stage1.md`](../working/task_m010_6_stage1.md) — baseline contract와 synthetic fixture 작성, privacy scan 통과.
- Stage 2: [`task_m010_6_stage2.md`](../working/task_m010_6_stage2.md) — comparison module/script 구현, 39개 테스트 통과, parser fixture smoke 통과, sample fixture guard 통과.
- Stage 3: [`task_m010_6_stage3.md`](../working/task_m010_6_stage3.md) — README profile smoke 문서화, README privacy wording scan 통과.
- Stage 4: [`task_m010_6_stage4.md`](../working/task_m010_6_stage4.md) — 실제 local analyzer snapshot 생성, schema valid, privacy scan 통과, final report 작성.

## 잔여 위험과 후속 작업

### 잔여 위험

- 실제 Codex profile UI 값이 redacted baseline으로 제공되지 않았으므로 실제 account-level profile parity 비교는 수행하지 않았다.
- Codex Desktop profile은 remote account-level source일 수 있어 local analyzer와 streak/top usage 값이 다를 수 있다. 이 차이는 smoke result의 `not_comparable` 또는 mismatch reason으로 관리한다.
- `scripts/`가 npm package에 포함되지 않는다. #7 release task에서 배포 패키지에 smoke helper를 포함할지, repo-only QA 도구로 둘지 `npm pack --dry-run` 기준으로 결정해야 한다.

### 후속 작업 후보

- #7: npm publish/release automation 및 npx 실행 검증에서 profile parity smoke를 release checklist에 포함한다.
- 실제 profile parity 확인이 필요하면 작업지시자가 별도 uncommitted redacted baseline을 준비해 `scripts/profile-smoke.js`로 비교한다.

## 작업지시자 승인 요청

- 최종 보고서와 수용 기준 검증 결과를 승인하면 PR 게시 절차로 진행한다.

# Task M04x #54 최종 보고서

GitHub Issue: [#54](https://github.com/postmelee/codex-usage-analyzer/issues/54)
마일스톤: M04x

## 작업 요약

- 대상 이슈: #54
- 마일스톤: M04x
- 단계 수: 3
- 작업 목적: PR #53의 experimental custom pet/Full Profile v2 기능을 npm에
  제공하기 위한 `0.4.1` release preparation과 Trusted Publishing gate 확정

Stable Account Usage Contract v1, Full Profile v1/v2 runtime/schema, default CLI,
root JavaScript SDK와 공개 문서는 변경하지 않았다. 작업지시자의 명시 결정에
따라 stable/root 계약 불변과 experimental opt-in 범위를 근거로 `0.4.1` patch를
사용한다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `package.json` | Package version `0.4.1` | npm package metadata |
| `src/cli.js` | CLI `PACKAGE_VERSION` 갱신 | `--version`, public constant |
| `src/index.d.ts` | SDK version declaration 갱신 | TypeScript consumer |
| `src/app-server-client.js` | Stable app-server `clientInfo.version` 갱신 | Protocol client identity만 영향 |
| `src/experimental-profile-client.js` | Experimental client/originator version 갱신 | Experimental request identity만 영향 |
| `src/__tests__/cli.test.js` | CLI/package bin version assertion 갱신 | Regression test |
| `src/__tests__/index.test.js` | Root SDK version assertion 갱신 | Regression test |
| `src/__tests__/app-server-client.test.js` | Stable clientInfo assertion 갱신 | Regression test |
| `src/__tests__/experimental-profile-client.test.js` | Experimental clientInfo/originator assertion 갱신 | Regression test |
| `mydocs/plans/task_m04x_54.md` | 승인된 release 범위·경계 | 내부 작업 기록 |
| `mydocs/plans/task_m04x_54_impl.md` | Stage와 post-merge runbook | 내부 작업·release 운영 기록 |
| `mydocs/working/task_m04x_54_stage{1,2,3}.md` | 단계별 구현·검증 결과 | 내부 검증 기록 |
| `mydocs/report/task_m04x_54_report.md` | 최종 수용 결과와 잔여 gate | 내부 최종 기록 |
| `mydocs/orders/20260719.md` | #54 오늘할일 완료 처리 | 내부 작업 보드 |

## 문서 위치 검증

공식 제품/사용자/API 문서는 수정하지 않았다. #52에서 확정한 README와 contract
문서를 diff-zero로 보호하고, release 운영 기록만 수행계획서에서 승인된 `mydocs/`
M04x 경로에 배치했다.

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| Public product docs | 변경 없음 | 변경 없음 | OK | `origin/main...HEAD -- README.md docs` diff zero |
| Version source/test | 기존 package/runtime 위치 | `package.json`, `src/`, `src/__tests__/` | OK | 승인된 exact 9-file allowlist |
| Stage/최종 보고 | `mydocs/` M04x 표준 경로 | `mydocs/plans`, `mydocs/working`, `mydocs/report` | OK | 파일명과 중앙 template 준수 |
| Post-release 결과 | Issue #54, npm, GitHub Release | PENDING | OK | PR merge 후 별도 release 실행 승인 gate |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| Source/package version | `0.4.0` | `0.4.1` |
| npm registry latest | `0.4.0` | `0.4.0` — publish 전 PENDING |
| Version product/test 파일 | 9개 `0.4.0` surface | 9개 `0.4.1` surface |
| Full regression | 178 pass | 178 pass |
| Local package artifact | 28 files | 28 files |
| Published package baseline | `0.4.0`, 23 files | `0.4.1`, 28 files 예정 |
| Required 신규 pet/v2 artifact | Published package에 5개 없음 | Candidate package에 5개 포함 |
| Forbidden package artifact | 0개 | 0개 |
| Package `files` allowlist | 20개 | 20개 |
| Runtime/dev dependency | 0/0 | 0/0 |
| Lockfile | 없음 | 없음 |
| `v0.4.1` tag/Release/dispatch | 없음 | 없음 — 별도 승인 전 유지 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| Package/CLI/SDK/stable·experimental client version 일치 | OK — exact 9-file `0.4.1` |
| Stable/default behavior와 public contract 무변경 | OK — protected runtime/schema/docs diff zero, 178 regression pass |
| Full Profile v2 pet/selector/experimental module regression | OK — reader, selector, v1 preservation, v2/API tests 포함 178 pass |
| Package artifact | OK — `0.4.1`, 28 files, 신규 5개 포함, forbidden 0개 |
| Published before baseline | OK — `0.4.0`, 23 files, 신규 5개 미포함 |
| Dependency/lockfile boundary | OK — runtime/dev dependency 0, lockfile 없음 |
| No-auth CLI smoke | OK — help/version/profile help, version `0.4.1` |
| README marker | OK — include-pet/key/selector/subpath/v2 schema 5개 확인 |
| Advisory preflight | OK — FAIL 0, expected tag WARN 1 |
| Strict pre-tag expectation | OK — tag 부재 FAIL 1개만 발생, 나머지 gate OK |
| Origin/product diff | OK — 최신 main 포함, 승인된 product 9개 파일만 변경 |
| Trusted Publishing boundary | OK — OIDC, GitHub-hosted runner, Node 24, plain publish, long-lived token 없음 |
| External mutation 부재 | OK — registry latest `0.4.0`, v0.4.1 tag/Release/dispatch 0 |
| Working tree와 형식 | OK — `git diff --check`, clean tree, temporary cleanup |

### 단계별 검증 결과

- Stage 1: [`task_m04x_54_stage1.md`](../working/task_m04x_54_stage1.md) —
  version source/test 9개, focused 5/5, 외부 mutation 부재.
- Stage 2: [`task_m04x_54_stage2.md`](../working/task_m04x_54_stage2.md) —
  178/178, 28-file candidate, 23-file before baseline, advisory preflight.
- Stage 3: [`task_m04x_54_stage3.md`](../working/task_m04x_54_stage3.md) —
  origin sync, strict tag 단일 failure, release external state와 OIDC gate.

## 잔여 위험과 후속 작업

### 잔여 위험

- Release preparation PR의 CI/CodeQL과 merge가 아직 PENDING이다.
- Tag, strict release-ready 통과, workflow dispatch, npm publish, registry/npx/
  package/subpath/README, signature/provenance와 GitHub Release는 PR merge 후
  작업지시자의 별도 실행 승인을 받아야 한다.
- Publish 후 검증 실패 시 같은 `0.4.1`을 재게시하거나 tag를 이동할 수 없다.
  Issue #54를 partial-release 상태로 유지하고 후속 patch를 결정해야 한다.
- Desktop selected state는 항상 존재하지 않을 수 있으며 spritesheet animation
  계약은 이번 release에 포함되지 않는다.

### 후속 작업 후보

- Published exact `codex-usage-analyzer@0.4.1` 검증 후 Tokenmon profile opt-in
  연동 계획과 인계 내용을 별도 downstream task로 등록한다.
- Tokenmon은 experimental subpath의 `listExperimentalPets`와
  `readExperimentalProfile`만 사용하고 consumer storage/render/delete 경계를
  별도로 설계한다.

## 작업지시자 승인 요청

- Release preparation PR의 CI/CodeQL 통과 후 merge를 승인한다.
- PR merge 후 tag/npm publish/GitHub Release를 수행하기 전에 별도 release 실행
  승인을 요청한다.
- 모든 post-release gate 통과 후에만 Issue #54 close와 branch cleanup을
  승인한다.

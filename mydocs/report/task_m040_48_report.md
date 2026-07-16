# Task M040 #48 최종 보고서

GitHub Issue: [#48](https://github.com/postmelee/codex-usage-analyzer/issues/48)
마일스톤: M040

## 작업 요약

- 대상 이슈: #48
- 마일스톤: M040
- 단계 수: 3
- 작업 목적: PR #47로 병합된 opt-in experimental profile을 npm 사용자에게 제공하도록 version surface를 `0.4.0`으로 일치시키고, Trusted Publishing 전 pre-release 수용 기준과 post-merge runbook을 확정한다.

Release preparation 범위는 완료했다. Package, CLI/SDK declaration, stable app-server client와 experimental profile client의 version surface 및 관련 assertion을 `0.4.0`으로 일치시켰다. Stable Account Usage와 Experimental Full Profile runtime·contract·schema, README/docs, CI/publish workflow와 release tooling은 변경하지 않았다.

전체 regression, package artifact, dependency와 no-auth CLI, source/published README 차이, Trusted Publishing security boundary 및 pre-release remote state를 검증했다. 실제 tag, Publish Package workflow, npm `0.4.0`, provenance/signature와 GitHub Release는 release preparation PR merge와 별도 작업지시자 승인 후 실행하는 `PENDING` gate다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `package.json` | Package version을 `0.3.0`에서 `0.4.0`으로 갱신 | npm package metadata |
| `src/cli.js` | CLI/SDK 공용 package version을 `0.4.0`으로 갱신 | CLI human/JSON metadata |
| `src/index.d.ts` | TypeScript package version literal을 `0.4.0`으로 갱신 | Public declaration |
| `src/app-server-client.js` | Stable initialize client version을 `0.4.0`으로 갱신 | Official Account Usage transport metadata |
| `src/experimental-profile-client.js` | Experimental initialize와 fixed User-Agent version을 `0.4.0`으로 갱신 | Experimental transport metadata |
| `src/__tests__/cli.test.js` | CLI와 package bin version assertion 갱신 | CLI regression |
| `src/__tests__/index.test.js` | Public SDK version assertion 갱신 | SDK regression |
| `src/__tests__/app-server-client.test.js` | Stable initialize metadata assertion 갱신 | Stable client regression |
| `src/__tests__/experimental-profile-client.test.js` | Experimental initialize/User-Agent assertion 갱신 | Experimental client regression |
| `mydocs/plans/task_m040_48.md` | Release 목적, 범위, 순서와 수용 기준 기록 | Internal task plan |
| `mydocs/plans/task_m040_48_impl.md` | 3개 Stage와 post-merge release runbook 기록 | Internal implementation/release plan |
| `mydocs/working/task_m040_48_stage{1,2,3}.md` | 단계별 변경·검증·잔여 위험 기록 | Internal verification history |
| `mydocs/orders/20260716.md` | Task #48 pre-release 준비 완료 상태와 시각 기록 | 오늘할일 보드 |
| `mydocs/report/task_m040_48_report.md` | 수용 기준, release gate와 최종 결과 기록 | Internal final report |

`src/index.js`, Account Usage/Full Profile normalizer·formatter·schema, README/docs, CI/publish workflow와 `scripts/release-preflight.js`는 변경하지 않았다.

## 문서 위치 검증

제품/사용자/기여자/외부 통합/API/아키텍처/로드맵 문서는 생성, 이동 또는 수정하지 않았다. #46에서 확정한 README, Account Usage/Full Profile contract와 downstream integration 문서를 그대로 배포 artifact에 포함하는 작업이다.

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| 제품 문서 | 변경 없음 | 변경 없음 | OK | `README.md`, `docs/`가 `origin/main` 대비 동일 |
| 수행·구현 계획 | `mydocs/plans/task_m040_48*.md` | 동일 | OK | M040 #48 표준 파일명과 승인된 문서 위치 사용 |
| 단계 보고 | `mydocs/working/task_m040_48_stage{1,2,3}.md` | 동일 | OK | 각 Stage 종료 시 검증 결과를 별도 기록 |
| 최종 보고 | `mydocs/report/task_m040_48_report.md` | 동일 | OK | 중앙 최종 보고서 템플릿 위치 사용 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| Source/package version | `0.3.0` | `0.4.0` |
| Version product diff | 없음 | 승인된 9개 파일, literal 11곳 갱신 |
| 전체 regression | 116개 baseline | 116/116 pass |
| npm dry-run artifact | 23개 파일 baseline | 23개 파일, 약 29.1 kB |
| Package `files` allowlist | 16개 path | 16개 path |
| Runtime/development dependency | 각각 0개 | 각각 0개 |
| Published npm `latest` | `0.3.0` | `0.3.0` - post-merge publish 전 PENDING |
| Local/remote `v0.4.0` tag | 없음 | 없음 - 별도 release 승인 전 PENDING |
| `v0.4.0` GitHub Release/publish dispatch | 각각 0개 | 각각 0개 - 별도 release 승인 전 PENDING |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| Version surface 일치 | OK - package, CLI/SDK declaration, stable/experimental client와 test assertion이 모두 `0.4.0` |
| Stable default와 public contract 무변경 | OK - stable runtime/schema와 public SDK export source가 `origin/main` 대비 동일하고 full regression 통과 |
| Experimental profile runtime/contract 무변경 | OK - normalizer, renderer, Full Profile doc/schema가 `origin/main` 대비 동일하고 full regression 통과 |
| Version 변경 범위 제한 | OK - 승인된 product 9개 파일의 11 insertions/11 deletions로 제한 |
| 전체 자동 회귀 | OK - 116 pass, fail/cancelled/skipped/todo 0 |
| No-auth CLI | OK - `--help`, `--version`, `profile --help`가 account access 없이 통과하고 version은 `0.4.0` |
| npm package artifact | OK - exact 23 files, 약 29.1 kB, required stable/experimental runtime·doc·schema 포함 |
| Package privacy/security boundary | OK - `.github`, `mydocs`, scripts, tests, extracted/fixture/auth/raw-response artifact 0개, dependency 0개 |
| README 배포 필요성 | OK - source marker 7개 존재, published `0.3.0` README에는 M040 marker 3개 부재 |
| Trusted Publishing workflow boundary | OK - `contents: read`, `id-token: write`, GitHub-hosted runner, Node 24, no-auth smoke와 plain publish 확인 |
| Long-lived token/provenance override 금지 | OK - `NPM_TOKEN`, `NODE_AUTH_TOKEN`, `_authToken`, explicit provenance disable/override pattern 없음 |
| Pre-release remote state | OK - registry/latest `0.3.0`, local/remote tag·Release·dispatch 없음 |
| Strict preflight pre-tag 분류 | OK - expected tag 부재 한 건만 FAIL; test 116, package 23 files와 나머지 gate는 모두 OK |
| Origin 통합과 same-file 위험 | OK - `origin/main` 포함, protected source diff zero, Dependabot PR #40/#41의 workflow 변경은 범위 밖으로 분리 |
| PR CI/CodeQL과 merge SHA | PENDING - release preparation PR 게시 후 GitHub checks와 merge 시 확인 |
| Tag/Trusted Publish/npm/provenance/GitHub Release | PENDING - PR merge와 별도 작업지시자 승인 후 runbook 순서로 실행 |

Strict release-ready preflight는 pre-merge 상태이므로 non-zero가 정상이다. 유일한 실패인 `v0.4.0 tag is not present`는 tag를 사전 생성하지 않았다는 release mutation gate의 증거이며 source/package 수용 기준 실패가 아니다.

### 단계별 검증 결과

- Stage 1: [`task_m040_48_stage1.md`](../working/task_m040_48_stage1.md) - 승인된 9개 파일의 version literal 11곳 갱신, focused test 65개 통과
- Stage 2: [`task_m040_48_stage2.md`](../working/task_m040_48_stage2.md) - full regression 116개, exact 23-file package와 advisory preflight 통과
- Stage 3: [`task_m040_48_stage3.md`](../working/task_m040_48_stage3.md) - origin/remote state, strict pre-tag 단일 failure와 Trusted Publishing boundary 통과

## 잔여 위험과 후속 작업

### 잔여 위험

- Release preparation PR의 CI/CodeQL, review, merge commit과 최신 main 상태는 아직 확정되지 않았다.
- `v0.4.0` tag 생성·push, strict preflight 전부 OK, Trusted Publishing workflow와 npm registry `0.4.0`은 아직 실행되지 않았다.
- Published package/npx/README, registry signature, SLSA provenance와 GitHub Release 검증이 남아 있다.
- Dependabot PR #40/#41 또는 다른 workflow/main 변경이 tag 전에 merge되면 merge SHA와 OIDC security boundary를 다시 확인해야 한다.
- Experimental Full Profile은 unsupported private endpoint와 identity-bearing data를 사용하는 opt-in 기능이라는 기존 위험을 유지한다.

### 후속 작업 후보

- Release preparation PR merge 후 별도 승인으로 구현계획서의 Post-Merge Release Runbook 실행
- Main CI/CodeQL과 immutable `v0.4.0` tag SHA 확인 후 strict preflight 전부 OK 검증
- Tag ref의 Publish Package workflow 실행 후 npm `0.4.0`, public npx, 23-file package와 README marker 검증
- Registry signature와 SLSA provenance 검증 후 non-draft/non-prerelease GitHub Release 생성
- 모든 release gate 통과 후 Issue #48 close와 `pr-merge-cleanup` 수행

별도 기능 이슈는 제안하지 않는다. 위 항목은 Issue #48의 post-merge release 범위이며 분리하면 승인·실행 순서의 진실 원천이 나뉜다.

## 작업지시자 승인 요청

- Stage 3 승인에 따라 이 최종 보고서를 기준으로 `publish/task48` release preparation PR을 게시한다.
- PR에는 Issue #48 자동 close keyword를 넣지 않고 source/package 기준은 OK, 실제 release gate는 PENDING으로 구분한다.
- PR merge 직후 cleanup하지 않으며, 별도 release 실행 승인과 모든 검증 완료 후 Issue close와 cleanup을 수행한다.

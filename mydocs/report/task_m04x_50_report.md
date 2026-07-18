# Task M04x #50 최종 보고서

GitHub Issue: [#50](https://github.com/postmelee/codex-usage-analyzer/issues/50)
마일스톤: M04x

## 작업 요약

- 대상 이슈: #50
- 마일스톤: M04x
- 단계 수: 3
- 작업 목적: CI와 npm Trusted Publishing workflow에서 불필요한 checkout credential persistence와 automatic package-manager cache를 명시적으로 비활성화하고 release preflight가 해당 policy를 자동 강제하도록 한다.

CI와 Publish Checkout에 `persist-credentials: false`를 추가하고 Publish Setup Node에 `package-manager-cache: false`를 추가했다. Existing action/Node version, trigger, permission, runner, no-auth smoke와 plain `npm publish`는 유지했다.

Repository-owned workflow 구조를 검사하는 side-effect-free helper를 추가하고 release preflight의 CI/Publish check에 연결했다. Current workflow positive integration과 synthetic negative regression은 누락, `true`, quoted `false`, wrong-step 배치와 target action 중복을 거부한다.

Full regression, exact package artifact, dependency/lockfile, no-auth CLI, sensitive scan과 advisory release state를 재검증했다. Product runtime, package metadata, README/docs와 release guide는 변경하지 않았고 tag, workflow dispatch, npm publish와 GitHub Release도 실행하지 않았다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `.github/workflows/ci.yml` | Checkout credential persistence 비활성화 | CI checkout security policy |
| `.github/workflows/publish.yml` | Checkout credential persistence와 automatic package-manager cache 비활성화 | npm Trusted Publishing security policy |
| `scripts/release-workflow-policy.js` | Target action step과 exact false input을 검사하는 pure helper 추가 | Maintainer release tooling |
| `scripts/release-preflight.js` | CI/Publish policy helper 연결과 sensitive scan 대상 확장 | Release preflight gate |
| `src/__tests__/release-workflow-policy.test.js` | Current workflow와 synthetic negative regression 추가 | Repository tooling regression |
| `mydocs/plans/task_m04x_50.md` | 목적, 보안 범위와 3개 Stage 계획 기록 | Internal task plan |
| `mydocs/plans/task_m04x_50_impl.md` | Step-local helper 설계, exact 검증과 diff allowlist 기록 | Internal implementation plan |
| `mydocs/working/task_m04x_50_stage{1,2,3}.md` | 단계별 변경, 검증과 잔여 위험 기록 | Internal verification history |
| `mydocs/orders/202607{17,18,19}.md` | Task 진행과 완료 시각 기록 | 오늘할일 보드 |
| `mydocs/report/task_m04x_50_report.md` | 최종 수용 기준과 잔여 위험 기록 | Internal final report |

`package.json`, lockfile, `bin/`, product runtime, README/docs, contributor/security policy와 `mydocs/manual/npm_release_guide.md`는 변경하지 않았다.

## 문서 위치 검증

제품/사용자/기여자/외부 통합/API/아키텍처/로드맵 문서는 생성, 이동 또는 수정하지 않았다. Workflow policy와 release tooling은 수행계획서에서 선택한 실행 위치에 두고 task 산출물만 `mydocs/` 표준 경로에 기록했다.

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| Workflow policy | `.github/workflows/` | CI/Publish 기존 workflow | OK | 실행 정책의 진실 원천에 exact false 추가 |
| Preflight helper | `scripts/` | `scripts/release-workflow-policy.js` | OK | Published runtime 밖의 pure tooling |
| Policy test | `src/__tests__/` | `src/__tests__/release-workflow-policy.test.js` | OK | 기존 `node --test` 발견 패턴 사용 |
| Public product docs | 변경 없음 | 변경 없음 | OK | CLI/API/privacy contract 무변경 |
| Task 문서 | `mydocs/` M04x 표준 경로 | plans/working/report/orders | OK | 수행계획서의 문서 위치 판단과 일치 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| CI Checkout `persist-credentials: false` | 0개 | 1개 |
| Publish Checkout `persist-credentials: false` | 0개 | 1개 |
| Publish Setup Node `package-manager-cache: false` | 0개 | 1개 |
| Preflight가 강제하는 신규 workflow policy | 0개 | 3개 |
| Workflow policy focused test | 0개 | 18개 pass |
| Synthetic negative policy case | 0개 | 14개 |
| 전체 regression | 116개 baseline | 134/134 pass |
| npm dry-run artifact | 23개 파일, 약 29.1 kB | 23개 파일, 29,804 B |
| Package `files` allowlist | 16개 | 16개 |
| Runtime/development dependency | 각각 0개 | 각각 0개 |
| Lockfile | 없음 | 없음 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| Workflow explicit false policy | OK - CI/Publish checkout 각 1개와 Publish setup-node cache 1개가 exact false |
| Existing workflow 동작 보존 | OK - trigger, permission, concurrency, runner, action/Node version, smoke와 plain publish marker 유지 |
| Long-lived credential 금지 | OK - token/auth assignment와 수동 provenance flag 없음 |
| Step-local enforcement | OK - target action이 정확히 하나이고 해당 `with` mapping의 unquoted false만 통과 |
| Negative regression | OK - missing, `true`, quoted value, wrong-step와 duplicate target action 거부 |
| Safe error boundary | OK - fixed error ID만 노출하고 workflow source/action string 원문을 error에 포함하지 않음 |
| Full regression | OK - 134 pass, fail/cancelled/skipped/todo 0 |
| npm package artifact | OK - version `0.4.0`, exact 23 files, required path 모두 존재, forbidden prefix 0 |
| Package privacy/security boundary | OK - scripts, workflows, tests와 `mydocs/`가 artifact에 포함되지 않고 sensitive scan 통과 |
| Dependency/lockfile boundary | OK - runtime/development dependency 각각 0, package allowlist 16, lockfile 없음 |
| No-auth CLI | OK - `--help`, `--version`, `profile --help` 통과, version `0.4.0` |
| Advisory release preflight | OK - exit 0, FAIL 0, expected registry/tag WARN 2개만 존재 |
| Product/public docs 무변경 | OK - package metadata, product runtime, README/docs와 release guide diff zero |
| Origin main 통합 | OK - fetch 후 task branch가 최신 `origin/main`을 포함하고 protected diff 기준을 충족 |
| PR CI/CodeQL | PENDING - PR 게시 후 GitHub checks에서 확인 |

Advisory WARN 두 건은 이미 배포된 `0.4.0`과 post-release main 상태에 따른 예상 결과다. Local version이 registry `0.4.0`보다 높지 않고 기존 `v0.4.0` tag가 현재 HEAD를 가리키지 않는다는 경고이며 workflow policy failure가 아니다.

### 단계별 검증 결과

- Stage 1: [`task_m04x_50_stage1.md`](../working/task_m04x_50_stage1.md) - workflow 세 explicit false 설정과 기존 보안/실행 marker 보존
- Stage 2: [`task_m04x_50_stage2.md`](../working/task_m04x_50_stage2.md) - pure helper, 18 focused tests와 134-test full regression 통과
- Stage 3: [`task_m04x_50_stage3.md`](../working/task_m04x_50_stage3.md) - advisory preflight, exact 23-file package와 dependency/sensitive boundary 통과

## 잔여 위험과 후속 작업

### 잔여 위험

- GitHub-hosted runner의 CI와 CodeQL 결과는 PR 게시 후 확인해야 한다.
- Publish workflow의 실제 OIDC 실행은 이미 배포된 `0.4.0`의 post-release maintenance 범위에서 의도적으로 수행하지 않았다.
- Helper는 repository-owned named step 구조를 검사한다. 이후 action version 또는 step 구조를 변경할 때 helper policy와 regression을 함께 갱신해야 한다.
- CI Setup Node의 cache policy는 Issue #50 승인 범위 밖이며 현재 package-manager trigger와 lockfile이 없다.

### 후속 작업 후보

- 별도 신규 이슈는 제안하지 않는다. CI package-manager metadata 또는 lockfile을 도입하는 변경이 생길 때 CI cache policy를 해당 이슈에서 함께 검토한다.
- PR CI/CodeQL 통과와 review/merge 후 Issue #50 close 및 `pr-merge-cleanup`을 수행한다.

## 작업지시자 승인 요청

- Stage 1-3와 최종 수용 기준 승인에 따라 이 보고서를 포함한 `publish/task50` PR을 게시한다.
- PR에는 Issue #50을 연결하되 merge 확인 전 self-merge 또는 수동 issue close를 수행하지 않는다.

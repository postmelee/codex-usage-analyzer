# Task M04x #50 Stage 2 완료보고서

GitHub Issue: [#50](https://github.com/postmelee/codex-usage-analyzer/issues/50)
구현계획서: [`task_m04x_50_impl.md`](../plans/task_m04x_50_impl.md)
Stage: 2

## 단계 목적

Stage 1에서 workflow에 명시한 credential/cache policy를 release preflight가 자동으로 강제하도록 pure step-local helper를 추가한다. Current workflow positive integration과 synthetic negative regression으로 누락, `true`, quoted value, wrong-step 배치와 target action 중복을 거부한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/release-workflow-policy.js` | 152줄. CI/Publish target action과 `with` input의 exact false를 검증하는 side-effect-free helper를 추가했다. |
| `scripts/release-preflight.js` | 543줄. CI/Publish check에 helper를 연결하고 신규 helper를 sensitive scan 대상에 포함했다. |
| `src/__tests__/release-workflow-policy.test.js` | 221줄. Current workflow와 14개 synthetic negative subtest를 포함한 18-test regression을 추가했다. |

## 본문 변경 정도 / 본문 무손실 여부

신규 helper와 test를 제외한 기존 파일 변경은 `scripts/release-preflight.js`의 10 insertions, 2 deletions로 제한됐다. 기존 CI/Publish trigger, permission, Node, no-auth smoke, plain publish와 forbidden credential 검사는 삭제하거나 완화하지 않았다. Workflow, package metadata, product runtime, public docs와 release guide는 Stage 2에서 수정하지 않았다.

Helper는 import 시 filesystem, process, command와 network 작업을 수행하지 않는다. Repository-owned named step block만 파싱하며 target `uses:`가 정확히 한 번 존재해야 한다. Target step의 유일한 `with` mapping 안에서 해당 input이 정확히 한 번, unquoted `false`로 존재할 때만 통과한다. Error message는 workflow 원문 대신 고정 식별자만 반환한다.

## 검증 결과

실행 명령:

```bash
node --test src/__tests__/release-workflow-policy.test.js
npm test
node --input-type=module -e 'import {readFileSync} from "node:fs"; import {assertCiWorkflowPolicy,assertPublishWorkflowPolicy} from "./scripts/release-workflow-policy.js"; assertCiWorkflowPolicy(readFileSync(".github/workflows/ci.yml","utf8")); assertPublishWorkflowPolicy(readFileSync(".github/workflows/publish.yml","utf8")); console.log("workflow policy integration passed")'
rg -n 'persist-credentials|package-manager-cache|assertCiWorkflowPolicy|assertPublishWorkflowPolicy' scripts/release-workflow-policy.js scripts/release-preflight.js src/__tests__/release-workflow-policy.test.js
if rg -n 'NPM_TOKEN|NODE_AUTH_TOKEN|_authToken|auth\.json|keychain|raw-response' scripts/release-workflow-policy.js src/__tests__/release-workflow-policy.test.js; then exit 1; fi
git diff --exit-code origin/main -- package.json bin README.md docs CONTRIBUTING.md SECURITY.md mydocs/manual/npm_release_guide.md src/account-usage.js src/app-server-client.js src/cli.js src/errors.js src/experimental-profile-client.js src/experimental-profile.js src/format-account-usage.js src/format-experimental-profile.js src/index.js src/index.d.ts
test ! -e package-lock.json
git diff --check
```

추가 no-network 검증:

```bash
node scripts/release-preflight.js --help
node --check scripts/release-workflow-policy.js
node --check scripts/release-preflight.js
```

결과:

- OK: Focused workflow policy test 18개가 통과했고 fail/cancelled/skipped/todo는 0이었다.
- OK: Full regression 134개가 통과했고 fail/cancelled/skipped/todo는 0이었다.
- OK: Current CI와 Publish workflow를 helper에 직접 전달한 integration assertion이 통과했다.
- OK: CI/Publish checkout과 Publish setup-node의 missing/`true`/wrong-step policy를 모두 거부했다.
- OK: Quoted `false`와 target action 중복도 고정 safe error ID로 거부했다.
- OK: Helper/test에 장기 token, auth file, keychain과 raw response pattern이 없다.
- OK: 기존 product runtime, package metadata, README/docs와 release guide에 origin/main 대비 diff가 없다.
- OK: Lockfile이 없고 `git diff --check`가 whitespace error 없이 통과했다.
- OK: Preflight `--help`와 두 script syntax check가 no-network로 통과했다.
- OK: 실제 Account Usage/Profile command, release preflight network check와 release mutation을 실행하지 않았다.

## 잔여 위험

- Advisory preflight 전체 실행은 npm registry 접근과 post-release WARN 분류를 포함하므로 Stage 3에 남아 있다.
- Exact 23-file package, dependency/lockfile와 package sensitive boundary는 Stage 3에서 통합 검증해야 한다.
- Helper는 범용 YAML parser가 아니라 repository-owned named step 구조를 의도적으로 검사한다. Workflow 구조 변경 시 current-workflow test와 preflight가 함께 실패하도록 설계됐다.
- GitHub-hosted runner의 실제 workflow 실행은 PR 게시 후 CI/CodeQL에서 확인한다.

## 다음 단계 영향

- Stage 3 advisory preflight에서 CI와 Publish workflow check가 모두 `[OK]`인지 확인한다.
- Expected WARN은 registry version과 post-release tag state 두 줄만 허용하며 FAIL은 0이어야 한다.
- Package dry-run은 exact 23 files를 유지하고 신규 helper, test, workflow와 `mydocs/`가 artifact에 포함되지 않아야 한다.
- Runtime/development dependency 0, package allowlist 16, lockfile 부재와 no-auth CLI 세 surface를 재검증한다.

## 승인 요청

- Stage 2 release preflight policy helper, regression과 검증 결과를 승인하면 Stage 3 package/security 통합 검증으로 진행한다.

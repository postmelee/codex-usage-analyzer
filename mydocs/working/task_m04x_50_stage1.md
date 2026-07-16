# Task M04x #50 Stage 1 완료보고서

GitHub Issue: [#50](https://github.com/postmelee/codex-usage-analyzer/issues/50)
구현계획서: [`task_m04x_50_impl.md`](../plans/task_m04x_50_impl.md)
Stage: 1

## 단계 목적

CI와 npm Trusted Publishing workflow에서 checkout credential persistence를 명시적으로 비활성화하고, Publish workflow에서 automatic package-manager cache를 명시적으로 비활성화한다. 기존 trigger, permission, runner, action/Node version, test/no-auth smoke와 plain publish 동작은 보존한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/ci.yml` | 36줄. Checkout step에 `persist-credentials: false`를 추가했다. |
| `.github/workflows/publish.yml` | 76줄. Checkout step에 `persist-credentials: false`, Setup Node step에 `package-manager-cache: false`를 추가했다. |

## 본문 변경 정도 / 본문 무손실 여부

Workflow diff는 승인된 2개 파일의 5 insertions로 제한됐다. CI와 Publish의 `actions/checkout@v7`, `actions/setup-node@v7`, Node 20/24, Publish registry URL, `contents: read`, `id-token: write`, workflow trigger와 plain `npm publish`는 변경하지 않았다.

CI Setup Node에는 cache 설정을 추가하지 않았다. 두 workflow의 checkout 이후 command에는 git fetch/push/submodule 작업이 없으며 장기 npm token이나 수동 provenance flag도 추가하지 않았다. Product runtime, package metadata, README/docs, release guide와 preflight source는 수정하지 않았다.

## 검증 결과

실행 명령:

```bash
git diff -- .github/workflows/ci.yml .github/workflows/publish.yml
node --input-type=module -e 'import {readFileSync} from "node:fs"; const ci=readFileSync(".github/workflows/ci.yml","utf8"); const publish=readFileSync(".github/workflows/publish.yml","utf8"); const count=(text,marker)=>text.split(marker).length-1; if(count(ci,"persist-credentials: false")!==1||count(publish,"persist-credentials: false")!==1||count(publish,"package-manager-cache: false")!==1||count(ci,"package-manager-cache:")!==0) process.exit(1)'
rg -n 'actions/checkout@v7|actions/setup-node@v7|node-version: 20|node-version: 24|registry-url: https://registry.npmjs.org|persist-credentials: false|package-manager-cache: false|contents: read|id-token: write|run: npm publish' .github/workflows/ci.yml .github/workflows/publish.yml
if rg -n 'NPM_TOKEN|NODE_AUTH_TOKEN|_authToken|--provenance|git (fetch|push)|git submodule' .github/workflows/ci.yml .github/workflows/publish.yml; then exit 1; fi
git diff --exit-code origin/main -- scripts package.json bin src README.md docs CONTRIBUTING.md SECURITY.md mydocs/manual/npm_release_guide.md
test ! -e package-lock.json
git diff --check
```

결과:

- OK: CI와 Publish에 `persist-credentials: false`가 각각 정확히 1개 존재한다.
- OK: Publish에 `package-manager-cache: false`가 정확히 1개 존재하고 CI에는 package-manager cache key가 없다.
- OK: Checkout/setup-node action은 v7, Node는 CI 20과 Publish 24, Publish registry URL은 기존 값을 유지한다.
- OK: `contents: read`, Publish `id-token: write`와 plain `npm publish` marker가 유지된다.
- OK: Workflow에 장기 npm token, auth assignment, 수동 provenance flag와 checkout 이후 authenticated git command가 없다.
- OK: Workflow 외 보호 경로에 origin/main 대비 diff가 없고 lockfile도 없다.
- OK: `git diff --check`가 whitespace error 없이 통과했다.
- OK: Tag, workflow dispatch, npm publish와 GitHub Release를 실행하지 않았다.

## 잔여 위험

- 현재 세 policy는 workflow source에만 명시됐으며 release preflight가 아직 자동 강제하지 않는다.
- Missing, `true`, wrong-step와 duplicate target action 회귀는 Stage 2 helper/test 구현 전까지 수동 검증에 의존한다.
- 전체 test, advisory preflight와 23-file package 검증은 Stage 2와 Stage 3에 남아 있다.
- GitHub-hosted runner의 실제 workflow 실행은 PR 게시 후 CI/CodeQL에서 확인한다.

## 다음 단계 영향

- Stage 2는 현재 workflow를 positive integration 입력으로 사용해 `assertCiWorkflowPolicy`와 `assertPublishWorkflowPolicy` helper를 구현한다.
- Helper는 target action step이 정확히 하나인지 확인하고 같은 step block의 exact unquoted `false`만 허용해야 한다.
- 기존 preflight의 permission, Node, no-auth, publish와 forbidden credential 검사는 보존한다.
- Stage 2 source 변경은 `scripts/release-workflow-policy.js`, `scripts/release-preflight.js`, `src/__tests__/release-workflow-policy.test.js`로 제한한다.

## 승인 요청

- Stage 1 workflow explicit false policy와 검증 결과를 승인하면 Stage 2 release preflight policy enforcement로 진행한다.

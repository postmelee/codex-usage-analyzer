# Task M04x #50 구현계획서

수행계획서: [`task_m04x_50.md`](task_m04x_50.md)
GitHub Issue: [#50](https://github.com/postmelee/codex-usage-analyzer/issues/50)
마일스톤: M04x

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | Workflow explicit false policy 적용 | CI/Publish workflow, Stage 1 보고서 | Exact policy count, workflow 불변조건, diff allowlist |
| 2 | Release preflight policy enforcement | Pure policy helper, preflight 연결, regression test, Stage 2 보고서 | Positive/negative focused test, current workflow integration, full regression |
| 3 | Package/security 통합 검증 | Stage 3 보고서 | Advisory preflight, 23-file package, dependency/lockfile/sensitive boundary |

## 문서 위치 확인

수행계획서의 문서 위치 판단과 실제 Stage 산출물 경로를 다음과 같이 고정한다. 공개 제품 문서와 release guide는 변경하지 않는다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| Workflow policy | `.github/workflows/` 기존 파일 | `.github/workflows/ci.yml`, `.github/workflows/publish.yml` | OK | 실행 정책의 진실 원천 |
| Preflight policy helper | `scripts/` | `scripts/release-workflow-policy.js` | OK | Published runtime 밖의 pure repository tooling |
| Policy regression test | `src/__tests__/` | `src/__tests__/release-workflow-policy.test.js` | OK | 기존 `node --test` 발견 패턴 재사용 |
| Public product docs | 변경 없음 | 변경 없음 | OK | CLI/API/privacy 계약 무변경 |
| Stage/최종 보고 | `mydocs/` M04x 표준 경로 | `mydocs/working/task_m04x_50_stage{N}.md`, `mydocs/report/task_m04x_50_report.md` | OK | 승인·검증 이력 |

## 공통 불변조건

### Source diff allowlist

Stage 1-3에서 source/configuration 변경은 다음 5개 파일로 제한한다.

- `.github/workflows/ci.yml`
- `.github/workflows/publish.yml`
- `scripts/release-preflight.js`
- `scripts/release-workflow-policy.js`
- `src/__tests__/release-workflow-policy.test.js`

다음 surface는 명시적으로 변경하지 않는다.

- `package.json`, lockfile와 package version
- `bin/`, `src/` product runtime와 기존 contract test
- `README.md`, `docs/`, `CONTRIBUTING.md`, `SECURITY.md`
- `mydocs/manual/npm_release_guide.md`
- Workflow trigger, job, runner, action/Node version, permission, concurrency와 publish command

Stage 보고서와 최종 보고서는 위 source allowlist와 별도로 승인된 `mydocs/` 산출물이다.

### Release mutation gate

- Tag, workflow dispatch, npm publish와 GitHub Release를 실행하거나 생성하지 않는다.
- Package version `0.4.0`, npm `latest`와 기존 `v0.4.0` tag/Release를 변경하지 않는다.
- `NPM_TOKEN`, `NODE_AUTH_TOKEN`, `_authToken`, 장기 credential과 수동 provenance flag를 추가하지 않는다.
- PR 게시 전 검증과 PR 게시 후 GitHub CI/CodeQL을 구분한다.

### Sensitive data gate

- 실제 Account Usage/Profile command를 실행하지 않는다.
- No-auth `--help`, `--version`, `profile --help`와 synthetic workflow text만 사용한다.
- 계정 식별자, usage/profile 응답, token, keychain, auth file과 local absolute path를 보고서에 기록하지 않는다.

### Expected post-release advisory state

현재 `0.4.0` release 이후 main을 기준으로 advisory preflight의 다음 두 WARN은 expected 상태다.

- `[WARN] registry version: local 0.4.0 is not greater than registry 0.4.0`
- `[WARN] release tag state: v0.4.0 does not point to HEAD`

Stage 3에서는 위 두 WARN 외 WARN과 모든 FAIL을 허용하지 않는다. `--release-ready` strict mode는 현재 release 준비 상태를 검증하는 task가 아니므로 실행하지 않는다.

## Stage 1 — Workflow explicit false policy 적용

### 산출물

신규:

- `mydocs/working/task_m04x_50_stage1.md`

수정:

- `.github/workflows/ci.yml`
- `.github/workflows/publish.yml`

### 변경 내용

- CI의 `Checkout` step에서 `actions/checkout@v7`을 유지하고 `with.persist-credentials: false`를 추가한다.
- Publish의 `Checkout` step에서 `actions/checkout@v7`을 유지하고 `with.persist-credentials: false`를 추가한다.
- Publish의 `Setup Node` step에서 `actions/setup-node@v7`, Node 24와 npm registry URL을 유지하고 `package-manager-cache: false`를 추가한다.
- CI `Setup Node`에는 cache 설정을 추가하지 않는다.
- Workflow의 trigger, permissions, concurrency, runner, step 순서, test/package/no-auth smoke와 plain `npm publish`를 변경하지 않는다.
- Checkout 이후 authenticated git command가 없고 Publish가 OIDC Trusted Publishing만 사용한다는 현재 경계를 재확인한다.

Expected target blocks:

```yaml
- name: Checkout
  uses: actions/checkout@v7
  with:
    persist-credentials: false
```

```yaml
- name: Setup Node
  uses: actions/setup-node@v7
  with:
    node-version: 24
    registry-url: https://registry.npmjs.org
    package-manager-cache: false
```

### 검증

```bash
git diff -- .github/workflows/ci.yml .github/workflows/publish.yml
node --input-type=module -e 'import {readFileSync} from "node:fs"; const ci=readFileSync(".github/workflows/ci.yml","utf8"); const publish=readFileSync(".github/workflows/publish.yml","utf8"); const count=(text,marker)=>text.split(marker).length-1; if(count(ci,"persist-credentials: false")!==1||count(publish,"persist-credentials: false")!==1||count(publish,"package-manager-cache: false")!==1||count(ci,"package-manager-cache:")!==0) process.exit(1)'
rg -n 'actions/checkout@v7|actions/setup-node@v7|node-version: 20|node-version: 24|registry-url: https://registry.npmjs.org|persist-credentials: false|package-manager-cache: false|contents: read|id-token: write|run: npm publish' .github/workflows/ci.yml .github/workflows/publish.yml
if rg -n 'NPM_TOKEN|NODE_AUTH_TOKEN|_authToken|--provenance|git (fetch|push)|git submodule' .github/workflows/ci.yml .github/workflows/publish.yml; then exit 1; fi
git diff --exit-code origin/main -- scripts package.json bin src README.md docs CONTRIBUTING.md SECURITY.md mydocs/manual/npm_release_guide.md
test ! -e package-lock.json
git diff --check
```

### 커밋

```text
Task #50 Stage 1: Workflow credential과 cache policy 명시
```

## Stage 2 — Release preflight policy enforcement

### 산출물

신규:

- `scripts/release-workflow-policy.js`
- `src/__tests__/release-workflow-policy.test.js`
- `mydocs/working/task_m04x_50_stage2.md`

수정:

- `scripts/release-preflight.js`

### 변경 내용

- `scripts/release-workflow-policy.js`를 import 시 filesystem, process, command와 network side effect가 없는 pure ESM helper로 작성한다.
- Helper는 workflow text를 줄 단위로 다루되 범용 YAML parser를 구현하지 않는다. Repository가 소유한 `steps` 구조에서 target `uses:` line을 찾고 같은 indent의 다음 step 전까지를 해당 action step block으로 한정한다.
- CI `actions/checkout@v7`, Publish `actions/checkout@v7`, Publish `actions/setup-node@v7` target step이 각각 정확히 하나인지 검증한다. 0개 또는 중복이면 안전한 고정 error ID로 실패한다.
- Target step의 `with` 아래에서 unquoted exact `false`만 허용한다. Key 누락, `true`, quoted/string 값과 다른 step에만 존재하는 key는 실패한다.
- Public helper API는 CI와 Publish policy를 구분해 호출할 수 있는 `assertCiWorkflowPolicy(workflowText)`와 `assertPublishWorkflowPolicy(workflowText)`로 고정한다.
- Error는 workflow source나 step block 원문을 포함하지 않고 `ci_checkout_persist_credentials_false_missing`, `publish_checkout_persist_credentials_false_missing`, `publish_setup_node_package_manager_cache_false_missing`처럼 고정 식별자만 노출한다.
- `scripts/release-preflight.js`의 기존 `checkCiWorkflow`와 `checkPublishWorkflow`에서 helper를 호출한다. Existing trigger/permission/Node/no-auth/publish marker와 forbidden token 검사는 보존한다.
- Test는 current workflow positive integration과 synthetic fixture를 사용한다. CI/Publish별 누락, `true`, wrong-step placement를 모두 거부하고 target action 중복도 거부한다.
- Test fixture에는 실제 credential, account data와 raw response를 넣지 않는다.

### 검증

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

### 커밋

```text
Task #50 Stage 2: Release preflight workflow policy 검증 추가
```

## Stage 3 — Package/security 통합 검증

### 산출물

신규:

- `mydocs/working/task_m04x_50_stage3.md`

수정:

- 없음. 검증에서 결함이 발견되면 현재 Stage를 완료하지 않고 해당 소유 Stage의 계획과 구현으로 돌아간다.

### 변경 내용

- Full regression에서 기존 116개 이상 test와 신규 workflow policy test가 모두 통과하는지 확인한다.
- Isolated temporary npm cache에서 advisory release preflight를 실행하고 expected WARN 2개, FAIL 0개와 workflow checks OK를 확인한다.
- `npm pack --dry-run --json`에서 exact 23-file package와 required/forbidden path를 검증한다. 신규 helper/test/workflow/mydocs가 package에 포함되면 실패한다.
- Runtime/development dependency 0개, package files allowlist 16개와 lockfile 부재를 확인한다.
- No-auth CLI surface 세 개만 smoke test한다.
- 승인된 source/configuration 5개 외 product/public docs/release guide diff가 없는지 확인한다.
- Temporary cache와 검증 출력은 OS temporary directory에서 사용 후 삭제하고 실제 경로를 보고서에 기록하지 않는다.
- PR 게시 후 GitHub CI/CodeQL 결과는 최종 보고 단계에서 별도로 확인하며 Stage 3 보고서에는 PENDING으로 기록한다.

### 검증

```bash
npm test
CACHE_DIR="$(mktemp -d)"
npm pack --cache "$CACHE_DIR" --dry-run --json > "$CACHE_DIR/pack.json"
node -e 'const fs=require("node:fs"); const result=JSON.parse(fs.readFileSync(process.argv[1],"utf8"))[0]; const paths=result.files.map((entry)=>entry.path); const required=["LICENSE","README.md","CONTRIBUTING.md","SECURITY.md","package.json","bin/codex-usage-analyzer.js","docs/account-usage-contract.md","docs/account-usage.schema.json","docs/downstream-integration.md","docs/experimental-full-profile.md","docs/experimental-full-profile.schema.json","src/account-usage.js","src/app-server-client.js","src/experimental-profile-client.js","src/experimental-profile.js","src/format-experimental-profile.js","src/index.js","src/index.d.ts"]; const prefixes=[".github/","mydocs/","scripts/","src/__tests__/"]; const forbidden=paths.filter((path)=>prefixes.some((prefix)=>path.startsWith(prefix))); if(result.version!=="0.4.0"||paths.length!==23||required.some((path)=>!paths.includes(path))||forbidden.length) process.exit(1); console.log(JSON.stringify({version:result.version,fileCount:paths.length,forbiddenCount:forbidden.length}))' "$CACHE_DIR/pack.json"
env NPM_CONFIG_CACHE="$CACHE_DIR" node scripts/release-preflight.js > "$CACHE_DIR/preflight.log"
node -e 'const fs=require("node:fs"); const text=fs.readFileSync(process.argv[1],"utf8"); const fails=text.split(/\r?\n/u).filter((line)=>line.startsWith("[FAIL]")); const warns=text.split(/\r?\n/u).filter((line)=>line.startsWith("[WARN]")); const expected=["[WARN] registry version: local 0.4.0 is not greater than registry 0.4.0","[WARN] release tag state: v0.4.0 does not point to HEAD"]; if(fails.length||warns.length!==expected.length||expected.some((line)=>!warns.includes(line))||!text.includes("[OK] CI workflow:")||!text.includes("[OK] publish workflow:")) process.exit(1); console.log(JSON.stringify({fails:fails.length,warns:warns.length,workflowChecks:true}))' "$CACHE_DIR/preflight.log"
node -e 'const p=require("./package.json"); if((p.files??[]).length!==16||Object.keys(p.dependencies??{}).length!==0||Object.keys(p.devDependencies??{}).length!==0) process.exit(1)'
node bin/codex-usage-analyzer.js --help
node bin/codex-usage-analyzer.js --version
node bin/codex-usage-analyzer.js profile --help
test ! -e package-lock.json
git diff --exit-code origin/main -- package.json bin README.md docs CONTRIBUTING.md SECURITY.md mydocs/manual/npm_release_guide.md src/account-usage.js src/app-server-client.js src/cli.js src/errors.js src/experimental-profile-client.js src/experimental-profile.js src/format-account-usage.js src/format-experimental-profile.js src/index.js src/index.d.ts
if git diff --name-only origin/main...HEAD | rg -v '^(\.github/workflows/(ci|publish)\.yml|scripts/release-(preflight|workflow-policy)\.js|src/__tests__/release-workflow-policy\.test\.js|mydocs/.*)$'; then exit 1; fi
git diff --check
git status --short
rm -rf "$CACHE_DIR"
```

Sandbox 또는 user-level npm cache ownership 때문에 기본 npm 검증이 실패하면 source를 변경하지 않고 isolated temporary cache로 재수행한다. Network/registry failure는 policy failure와 구분해 보고하고 Stage를 완료하지 않는다.

### 커밋

```text
Task #50 Stage 3: Workflow hardening 통합 검증 완료
```

## 검증

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- 실패한 검증은 단계 완료로 처리하지 않는다.
- Expected post-release WARN 2개 외 경고, workflow policy FAIL과 package surface 변화는 승인 없이 예외 처리하지 않는다.
- 계획 변경이 필요하면 구현계획서를 먼저 갱신하고 작업지시자 승인을 받는다.
- 문서 위치가 수행계획서 판단과 달라지면 source 구현 전에 계획 문서를 갱신하고 승인을 받는다.

## 커밋

- 단계 커밋은 단계 source/configuration 산출물과 `mydocs/working/task_m04x_50_stage{N}.md`를 함께 묶는다.
- 커밋 메시지는 구현계획서에 고정한 `Task #50 Stage {N}: ...` 형식을 따른다.
- 최종 보고서는 `task-final-report` 절차에서 최종 source 상태와 함께 별도 커밋한다.

## 단계 의존성

- Stage 1은 본 구현계획서 승인 후에만 시작한다.
- Stage 2는 Stage 1 산출물과 단계 보고서 승인 후 진행한다.
- Stage 3은 Stage 2 helper API, negative test와 전체 regression 승인 후 진행한다.
- 최종 보고와 PR 게시 전 Stage 3 package/security 결과가 모두 통과해야 한다.

## 위험과 대응

- **문자열 기반 YAML 검사 오탐**: Action step을 정확히 하나 선택하고 같은 step block의 `with`만 검사하며 missing/true/wrong-step/duplicate fixture로 방어한다.
- **검사와 workflow의 동시 drift**: Current workflow positive integration을 test와 release preflight에서 모두 실행한다.
- **기존 preflight 검사의 약화**: Existing permission, Node, no-auth, publish와 forbidden credential assertion을 삭제하지 않고 helper를 추가 호출한다.
- **CI cache 범위 확대**: 승인된 Publish Setup Node만 끄고 CI cache policy는 변경하지 않는다.
- **Package surface 변화**: Exact 23-file dry-run과 forbidden prefix 검사로 신규 tooling 비포함을 보장한다.
- **Release state 오판**: 이미 배포된 `0.4.0`의 expected advisory WARN 2개를 exact line으로 분리하고 strict release mode나 mutation을 실행하지 않는다.

## 승인 요청 사항

- 3개 Stage의 산출물과 source diff allowlist
- Target action step-local exact false 검사, 고정 helper API와 safe error ID 설계
- Missing, `true`, wrong-step, duplicate negative regression 범위
- Expected post-release advisory WARN 2개와 package/security 검증 명령
- Stage별 커밋 메시지와 Stage 1 구현 진입

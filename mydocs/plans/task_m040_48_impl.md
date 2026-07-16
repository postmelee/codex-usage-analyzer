# Task M040 #48 구현계획서

수행계획서: [`task_m040_48.md`](task_m040_48.md)
GitHub Issue: [#48](https://github.com/postmelee/codex-usage-analyzer/issues/48)
마일스톤: M040

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | Version surface를 0.4.0으로 일치 | Version source/test 9개, Stage 1 보고서 | Exact version, focused tests, stable/experimental contract 무손실 |
| 2 | M040 package release readiness 검증 | Stage 2 보고서 | 116-test+, 23-file artifact, README marker, advisory preflight |
| 3 | Pre-release 통합 검증과 post-merge runbook 확정 | Stage 3 보고서 | Origin sync, strict pre-tag 단일 실패, registry/tag/Release 부재, supply-chain gate |

## 문서 위치 확인

수행계획서의 문서 위치 판단과 실제 산출물 경로를 다음과 같이 고정한다. README와 공식 product documentation source는 변경하지 않는다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| Version source/test | 기존 package/runtime 위치 | `package.json`, `src/`, `src/__tests__/` | OK | 신규 version abstraction 없이 기존 surface 갱신 |
| Public product docs | 변경 없음 | 변경 없음 | OK | #46 문서와 schema를 diff-zero로 보호 |
| Post-release 결과 | GitHub/npm external state | Issue #48, npm registry, GitHub Release | OK | Immutable tag와 workflow run에 연결 |
| Stage/최종 보고 | `mydocs/` M040 표준 경로 | `mydocs/working/task_m040_48_stage{N}.md`, `mydocs/report/task_m040_48_report.md` | OK | Release 승인·검증 이력 |

## 공통 불변조건

### Product diff allowlist

Stage 1-3에서 product 변경은 다음 9개 파일로 제한한다.

- `package.json`
- `src/cli.js`
- `src/index.d.ts`
- `src/app-server-client.js`
- `src/experimental-profile-client.js`
- `src/__tests__/cli.test.js`
- `src/__tests__/index.test.js`
- `src/__tests__/app-server-client.test.js`
- `src/__tests__/experimental-profile-client.test.js`

다음 파일과 경로는 명시적으로 변경하지 않는다.

- `src/index.js`
- `src/account-usage.js`
- `src/experimental-profile.js`
- `src/format-account-usage.js`
- `src/format-experimental-profile.js`
- `docs/account-usage.schema.json`
- `docs/experimental-full-profile.schema.json`
- `README.md`, `docs/`
- `.github/workflows/ci.yml`, `.github/workflows/publish.yml`
- `scripts/release-preflight.js`

### Release mutation gate

- Stage 1-3, 최종 보고서와 release preparation PR에서는 tag, workflow dispatch, npm publish와 GitHub Release를 만들지 않는다.
- PR에 `Closes #48`, `Fixes #48` 같은 자동 close keyword를 넣지 않는다.
- PR merge 직후 `pr-merge-cleanup`을 호출하지 않는다. Issue #48과 task branch cleanup은 post-release 성공까지 보류한다.
- Post-Merge Release Runbook은 PR merge와 작업지시자의 별도 명시 승인 후에만 실행한다.
- 첫 mutation은 `git tag v0.4.0`이며, 승인 전에 해당 command를 실행하지 않는다.

### Sensitive data gate

- 실제 Account Usage/Profile command를 실행하지 않는다. No-auth `--help`, `--version`, `profile --help`만 기본 smoke로 사용한다.
- Actual usage/profile 값, identity, avatar URL, invocation name, token, account identifier, raw response/stderr와 local path를 task 문서, Issue, PR, Release에 기록하지 않는다.
- Long-lived npm token, auth assignment, raw signature/attestation을 source나 report에 추가하지 않는다.

## Stage 1 — Version surface를 0.4.0으로 일치

### 산출물

신규:

- `mydocs/working/task_m040_48_stage1.md`

수정:

- `package.json`
- `src/cli.js`
- `src/index.d.ts`
- `src/app-server-client.js`
- `src/experimental-profile-client.js`
- `src/__tests__/cli.test.js`
- `src/__tests__/index.test.js`
- `src/__tests__/app-server-client.test.js`
- `src/__tests__/experimental-profile-client.test.js`

### 변경 내용

- Before snapshot에서 source/local `0.3.0`, npm registry/latest `0.3.0`, existing `v0.3.0` tag/Release와 local/remote `v0.4.0` tag/GitHub Release 부재를 확인한다.
- `npm version --no-git-tag-version 0.4.0`으로 `package.json`만 기계적으로 갱신한다.
- Lockfile이 새로 생성되면 Stage를 중단하고 원인을 확인한다. 현재 repository에는 lockfile이 없다.
- CLI `PACKAGE_VERSION`, TypeScript declaration literal과 stable app-server `clientInfo.version`을 `0.4.0`으로 갱신한다.
- Experimental profile client의 `CLIENT_VERSION`, initialize metadata와 fixed originator/User-Agent assertion을 `0.4.0`으로 갱신한다.
- CLI human/injected output, package bin, SDK export, stable/experimental client assertion을 `0.4.0`으로 갱신한다.
- Global replacement를 사용하지 않고 historical benchmark/release/task 문서의 `0.2.0`/`0.3.0`을 보존한다.
- Account Usage/Full Profile runtime·schema, renderer, README/docs, workflow와 preflight source는 수정하지 않는다.
- Stage 1에서는 tag, workflow dispatch, npm publish, GitHub Release와 registry mutation을 수행하지 않는다.

### 검증

```bash
npm pkg get version
node bin/codex-usage-analyzer.js --version
node --test src/__tests__/cli.test.js src/__tests__/index.test.js src/__tests__/app-server-client.test.js src/__tests__/experimental-profile-client.test.js
rg -n '0\.4\.0' package.json src/cli.js src/index.d.ts src/app-server-client.js src/experimental-profile-client.js src/__tests__/cli.test.js src/__tests__/index.test.js src/__tests__/app-server-client.test.js src/__tests__/experimental-profile-client.test.js
if rg -n '0\.3\.0' package.json src/cli.js src/index.d.ts src/app-server-client.js src/experimental-profile-client.js src/__tests__/cli.test.js src/__tests__/index.test.js src/__tests__/app-server-client.test.js src/__tests__/experimental-profile-client.test.js; then exit 1; fi
test ! -e package-lock.json
git diff --exit-code origin/main -- README.md docs .github scripts src/index.js src/account-usage.js src/experimental-profile.js src/format-account-usage.js src/format-experimental-profile.js
test -z "$(git tag --list v0.4.0)"
git diff --check
```

Before snapshot read-only 조회:

```bash
npm view codex-usage-analyzer version dist-tags --json
git ls-remote --tags origin refs/tags/v0.4.0
gh release list --repo postmelee/codex-usage-analyzer --limit 100 --json tagName,isDraft,isPrerelease --jq '[.[] | select(.tagName=="v0.4.0")] | length'
```

Expected before values:

- Registry version/latest: `0.3.0`
- Existing stable tag/Release: `v0.3.0`
- Local/remote `v0.4.0` tag: 없음
- GitHub Release `v0.4.0`: 없음

### 커밋

```text
Task #48 Stage 1: Version surface를 0.4.0으로 갱신
```

## Stage 2 — M040 package release readiness 검증

### 산출물

신규:

- `mydocs/working/task_m040_48_stage2.md`

수정:

- 없음

### 변경 내용

- Default usage와 experimental profile 경로를 포함한 전체 regression을 실행하고 pass count가 116개 이상인지 확인한다.
- Package dry-run JSON에서 version `0.4.0`, exact file count 23개와 required/forbidden path를 검증한다.
- Required package path에 stable/experimental runtime, Account Usage/Full Profile doc/schema, README와 downstream guide를 포함한다.
- Forbidden path는 `.github/`, `mydocs/`, `scripts/`, `src/__tests__/`와 extracted/fixture/auth/raw-response fragment다.
- Runtime dependency 0개와 package files allowlist 16개를 확인한다.
- CLI `--help`, `--version`, `profile --help`를 account access 없이 실행한다.
- Source README의 stable upstream, Experimental profile, unsupported endpoint와 Full Profile contract/schema marker를 확인한다.
- npm registry `0.3.0` README에는 Experimental profile marker가 없다는 before baseline을 확인한다.
- Advisory preflight는 exit 0이어야 한다. Local `0.4.0 > registry 0.3.0`, clean tree와 package/security checks는 OK이고, `v0.4.0` tag 부재만 WARN이어야 한다.
- Temporary cache/output는 OS temporary directory에 두고 검증 후 삭제하며 actual path를 보고서에 기록하지 않는다.

### 검증

```bash
npm test
CACHE_DIR="$(mktemp -d)"
npm pack --cache "$CACHE_DIR" --dry-run --json > "$CACHE_DIR/pack.json"
node bin/codex-usage-analyzer.js --help
node bin/codex-usage-analyzer.js --version
node bin/codex-usage-analyzer.js profile --help
node -e 'const fs=require("node:fs"); const file=process.argv[1]; const result=JSON.parse(fs.readFileSync(file,"utf8"))[0]; const paths=result.files.map((entry)=>entry.path); const required=["README.md","docs/account-usage-contract.md","docs/account-usage.schema.json","docs/downstream-integration.md","docs/experimental-full-profile.md","docs/experimental-full-profile.schema.json","src/account-usage.js","src/app-server-client.js","src/experimental-profile-client.js","src/experimental-profile.js","src/format-experimental-profile.js","src/index.js","src/index.d.ts"]; const prefixes=[".github/","mydocs/","scripts/","src/__tests__/"]; const fragments=["codex-extracted","fixture","auth.json","auth-response","profile-response","raw-response",".env"]; const forbidden=paths.filter((path)=>prefixes.some((prefix)=>path.startsWith(prefix))||fragments.some((fragment)=>path.toLowerCase().includes(fragment))); if(result.version!=="0.4.0"||paths.length!==23||required.some((path)=>!paths.includes(path))||forbidden.length) process.exit(1); console.log(JSON.stringify({version:result.version,fileCount:paths.length,requiredPresent:true,forbiddenCount:forbidden.length}))' "$CACHE_DIR/pack.json"
node -e 'const p=require("./package.json"); if((p.files??[]).length!==16||Object.keys(p.dependencies??{}).length!==0||Object.keys(p.devDependencies??{}).length!==0) process.exit(1)'
node -e 'const fs=require("node:fs"); const readme=fs.readFileSync("README.md","utf8"); const markers=["Documented upstream:","account/usage/read","## Experimental profile","profile --json","/wham/profiles/me","docs/experimental-full-profile.md","docs/experimental-full-profile.schema.json"]; if(markers.some((marker)=>!readme.includes(marker))) process.exit(1); console.log(JSON.stringify({markers:markers.length}))'
node -e 'const {execFileSync}=require("node:child_process"); const readme=JSON.parse(execFileSync("npm",["view","codex-usage-analyzer@0.3.0","readme","--json"],{encoding:"utf8"})); const markers=["## Experimental profile","profile --json","docs/experimental-full-profile.md"]; if(markers.some((marker)=>readme.includes(marker))) process.exit(1); console.log(JSON.stringify({version:"0.3.0",missingMarkers:markers.length}))'
env NPM_CONFIG_CACHE="$CACHE_DIR" node scripts/release-preflight.js > "$CACHE_DIR/preflight.log"
node -e 'const fs=require("node:fs"); const text=fs.readFileSync(process.argv[1],"utf8"); const fails=text.split(/\r?\n/u).filter((line)=>line.startsWith("[FAIL]")); const warns=text.split(/\r?\n/u).filter((line)=>line.startsWith("[WARN]")); const expected="[WARN] release tag state: v0.4.0 tag is not present"; if(fails.length||warns.length!==1||warns[0]!==expected||!text.includes("release preflight completed with warnings")) process.exit(1); console.log(JSON.stringify({fails:fails.length,warns:warns.length}))' "$CACHE_DIR/preflight.log"
git diff --exit-code origin/main...HEAD -- README.md docs .github scripts src/index.js src/account-usage.js src/experimental-profile.js src/format-account-usage.js src/format-experimental-profile.js
git diff --check
git status --short
rm -rf "$CACHE_DIR"
```

Sandbox 또는 user-level npm cache ownership 때문에 기본 pack/preflight가 실패하면 source를 변경하지 않고 isolated temporary cache로 재수행한다. Cleanup은 검증 결과 확인 후 수행한다.

### 커밋

```text
Task #48 Stage 2: M040 package release readiness 검증
```

## Stage 3 — Pre-release 통합 검증과 post-merge runbook 확정

### 산출물

신규:

- `mydocs/working/task_m040_48_stage3.md`

수정:

- 없음. Origin main 통합이 필요하면 사용자/Dependabot 변경을 보존하는 별도 merge commit만 허용한다.

### 변경 내용

- `origin/main`을 fetch하고 task branch가 최신 main을 포함하는지 확인한다.
- Product diff는 승인된 version source/test 9개로 제한하고 public docs, contracts, feature runtime, workflow와 preflight source가 origin/main과 동일한지 확인한다.
- Registry/latest `0.3.0`, local/remote `v0.4.0` tag와 GitHub Release 부재를 재확인한다.
- Strict preflight는 pre-merge이므로 exit 1이어야 하며 유일한 FAIL은 `release tag state: v0.4.0 tag is not present`여야 한다.
- Publish workflow의 OIDC permission, runner/runtime, no-auth smoke, plain publish와 token/provenance 금지 pattern을 확인한다.
- PR #40/#41의 최신 state와 same-file 변경을 확인하고 #48 diff에 action version update가 없는지 검증한다.
- `v0.4.0` tag/ref의 Publish Package workflow dispatch가 없음을 확인한다.
- PR 본문에는 issue-closing keyword를 넣지 않고 local 수용 기준 OK와 post-merge release PENDING을 분리한다.
- Final report는 source/package 수용 기준은 OK, tag/publish/registry/GitHub Release는 PENDING으로 기록한다.

### 검증

```bash
git fetch origin --prune
test "$(git rev-list --count HEAD..origin/main)" -eq 0
git diff --name-only origin/main...HEAD
git diff --exit-code origin/main...HEAD -- README.md docs .github scripts src/index.js src/account-usage.js src/experimental-profile.js src/format-account-usage.js src/format-experimental-profile.js
npm view codex-usage-analyzer version dist-tags --json
test -z "$(git tag --list v0.4.0)"
git ls-remote --tags origin refs/tags/v0.4.0
gh release list --repo postmelee/codex-usage-analyzer --limit 100 --json tagName,isDraft,isPrerelease --jq '[.[] | select(.tagName=="v0.4.0")] | length'
gh pr view 40 --repo postmelee/codex-usage-analyzer --json number,state,files,url --jq '{number,state,files:[.files[].path],url}'
gh pr view 41 --repo postmelee/codex-usage-analyzer --json number,state,files,url --jq '{number,state,files:[.files[].path],url}'
CACHE_DIR="$(mktemp -d)"
if env NPM_CONFIG_CACHE="$CACHE_DIR" node scripts/release-preflight.js --release-ready > "$CACHE_DIR/strict.log" 2>&1; then exit 1; fi
node -e 'const fs=require("node:fs"); const text=fs.readFileSync(process.argv[1],"utf8"); const fails=text.split(/\r?\n/u).filter((line)=>line.startsWith("[FAIL]")); const expected="[FAIL] release tag state: v0.4.0 tag is not present"; if(fails.length!==1||fails[0]!==expected||!text.includes("release preflight failed")) process.exit(1); console.log(JSON.stringify({expectedFailure:true,failCount:fails.length}))' "$CACHE_DIR/strict.log"
rg -n 'workflow_dispatch:|contents: read|id-token: write|runs-on: ubuntu-latest|node-version: 24|CLI no-auth smoke|run: npm publish' .github/workflows/publish.yml
if rg -n 'NPM_TOKEN|NODE_AUTH_TOKEN|_authToken|--provenance|NPM_CONFIG_PROVENANCE=false|provenance=false' .github/workflows/publish.yml package.json; then exit 1; fi
gh run list --repo postmelee/codex-usage-analyzer --workflow publish.yml --event workflow_dispatch --limit 100 --json headBranch --jq '[.[] | select(.headBranch=="v0.4.0")] | length'
git diff --check
git status --short
rm -rf "$CACHE_DIR"
```

Expected Stage 3 external state:

- Registry/latest: `0.3.0`
- Local/remote `v0.4.0` tag: 없음
- GitHub Release `v0.4.0`: 없음
- Publish workflow dispatch for `v0.4.0`: 없음
- Strict preflight: tag 부재 1개만 expected FAIL

### 커밋

```text
Task #48 Stage 3: Pre-release 통합 검증과 runbook 확정
```

## Post-Merge Release Runbook

이 절차는 release preparation PR merge와 작업지시자의 별도 release 실행 승인 후에만 수행한다. 승인 전에는 첫 mutation command인 `git tag v0.4.0`을 실행하지 않는다.

### 1. Main, merge SHA와 checks 확인

```bash
git fetch origin --prune
git checkout main
git pull --ff-only
git status --short
npm pkg get version
node bin/codex-usage-analyzer.js --version
node bin/codex-usage-analyzer.js profile --help
gh pr view PR_NUMBER --repo postmelee/codex-usage-analyzer --json state,mergeCommit
gh run list --repo postmelee/codex-usage-analyzer --branch main --commit MERGE_SHA --json databaseId,workflowName,status,conclusion,url
```

Required:

- PR state `MERGED`
- `HEAD == origin/main == MERGE_SHA`
- Package/CLI version `0.4.0`
- Main CI/CodeQL success
- Working tree clean
- `profile --help` no-auth success

### 2. Tag 생성과 strict preflight

```bash
git tag v0.4.0
git push origin v0.4.0
test "$(git rev-list -n 1 v0.4.0)" = "$(git rev-parse HEAD)"
git ls-remote --tags origin refs/tags/v0.4.0
CACHE_DIR="$(mktemp -d)"
env NPM_CONFIG_CACHE="$CACHE_DIR" node scripts/release-preflight.js --release-ready
rm -rf "$CACHE_DIR"
```

Strict preflight가 모두 OK가 아니면 workflow를 dispatch하지 않는다. 이미 push한 tag를 임의 이동하거나 재생성하지 않고 원인과 recovery를 보고한다.

### 3. Trusted Publishing workflow

```bash
gh workflow run publish.yml --repo postmelee/codex-usage-analyzer --ref v0.4.0
gh run list --repo postmelee/codex-usage-analyzer --workflow publish.yml --event workflow_dispatch --limit 20 --json databaseId,headBranch,headSha,status,conclusion,url,createdAt
gh run watch PUBLISH_RUN_ID --repo postmelee/codex-usage-analyzer --exit-status
```

`headBranch == v0.4.0`, `headSha == MERGE_SHA`인 newest run 하나를 선택한다. Workflow 실패 시 local publish로 우회하거나 same version publish를 재시도하지 않는다.

### 4. Registry, npx, package와 README marker

Registry propagation은 최대 12회, 10초 간격으로 bounded retry한다.

```bash
for attempt in {1..12}; do
  VERSION="$(npm view codex-usage-analyzer version)"
  if [ "$VERSION" = "0.4.0" ]; then break; fi
  if [ "$attempt" -eq 12 ]; then exit 1; fi
  sleep 10
done
npm view codex-usage-analyzer@0.4.0 version dist-tags --json
npx --yes codex-usage-analyzer@0.4.0 --help
npx --yes codex-usage-analyzer@0.4.0 --version
npx --yes codex-usage-analyzer@0.4.0 profile --help
npx --yes codex-usage-analyzer@latest --version
CACHE_DIR="$(mktemp -d)"
npm pack codex-usage-analyzer@0.4.0 --cache "$CACHE_DIR" --dry-run --json > "$CACHE_DIR/published-pack.json"
node -e 'const fs=require("node:fs"); const result=JSON.parse(fs.readFileSync(process.argv[1],"utf8"))[0]; const paths=result.files.map((entry)=>entry.path); const required=["docs/experimental-full-profile.md","docs/experimental-full-profile.schema.json","src/experimental-profile-client.js","src/experimental-profile.js","src/format-experimental-profile.js"]; if(result.version!=="0.4.0"||paths.length!==23||required.some((path)=>!paths.includes(path))) process.exit(1); console.log(JSON.stringify({version:result.version,fileCount:paths.length,requiredPresent:true}))' "$CACHE_DIR/published-pack.json"
node -e 'const {execFileSync}=require("node:child_process"); const readme=JSON.parse(execFileSync("npm",["view","codex-usage-analyzer@0.4.0","readme","--json"],{encoding:"utf8"})); const markers=["Documented upstream:","account/usage/read","## Experimental profile","profile --json","/wham/profiles/me","docs/experimental-full-profile.md","docs/experimental-full-profile.schema.json"]; if(markers.some((marker)=>!readme.includes(marker))) process.exit(1); console.log(JSON.stringify({version:"0.4.0",markers:markers.length}))'
rm -rf "$CACHE_DIR"
```

Actual account usage/profile command는 실행하지 않는다.

### 5. Signature와 provenance

```bash
node -e 'const {execFileSync}=require("node:child_process"); const meta=JSON.parse(execFileSync("npm",["view","codex-usage-analyzer@0.4.0","version","dist.signatures","dist.attestations","--json"],{encoding:"utf8"})); const signatures=meta["dist.signatures"]??[]; const predicate=meta["dist.attestations"]?.provenance?.predicateType??null; if(meta.version!=="0.4.0"||signatures.length<1||predicate!=="https://slsa.dev/provenance/v1") process.exit(1); console.log(JSON.stringify({version:meta.version,signatureCount:signatures.length,provenancePredicate:predicate}))'
VERIFY_DIR="$(mktemp -d)"
cd "$VERIFY_DIR"
npm init -y
npm install codex-usage-analyzer@0.4.0
npm audit signatures
cd -
rm -rf "$VERIFY_DIR"
```

Temporary directory path, install log, signature/attestation 원문과 credential을 Issue/Release에 기록하지 않는다.

### 6. GitHub Release, Issue close와 cleanup

GitHub Release는 registry/npx/package/README/signature/provenance 검증 후 마지막으로 생성한다.

```bash
gh release create v0.4.0 --repo postmelee/codex-usage-analyzer --verify-tag --title "v0.4.0" --notes-file RELEASE_NOTES_FILE
gh release view v0.4.0 --repo postmelee/codex-usage-analyzer --json tagName,name,isDraft,isPrerelease,publishedAt,url
gh issue close 48 --repo postmelee/codex-usage-analyzer --comment RELEASE_RESULT_SUMMARY
```

Release note/result summary에는 다음만 기록한다.

- Explicit opt-in `profile`/`profile --json`과 Full Profile Envelope v1
- Stable default `account/usage/read`와 public SDK/contract 무변경
- Unsupported private endpoint와 identity/privacy 경고
- npm package `0.4.0`
- Publish workflow run URL
- Structural npx/package/README smoke, signature/provenance pass
- Breaking change 없음과 known private API drift limitation

Issue close 후 `pr-merge-cleanup`으로 `publish/task48`, `local/task48`, worktree와 main 복귀를 정리한다.

## 검증

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- Stage 1-3 product diff는 exact version source/test 9개로 제한한다.
- Stable/experimental contract와 user-facing docs는 diff-zero와 focused/full regression으로 보호한다.
- Strict preflight의 pre-tag failure는 Stage 3 expected condition이며 다른 FAIL이 하나라도 있으면 Stage를 완료하지 않는다.
- PR checks 실패 시 merge 승인을 요청하지 않는다.
- PR merge 후에도 별도 release 실행 승인 전 tag를 만들지 않는다.
- Tag push 후 strict preflight 실패 시 workflow를 dispatch하지 않는다.
- Publish workflow 실패 시 local npm publish로 우회하지 않는다.
- npm publish 후 verification 실패 시 same version을 재게시하지 않는다.
- Registry/npx/package/README/signature/provenance 통과 전 GitHub Release를 만들지 않는다.
- GitHub Release 통과 전 Issue #48을 close하거나 task branch cleanup을 수행하지 않는다.
- Temporary cache/directory는 성공·실패 결과 확인 후 삭제한다.
- 실패한 gate의 raw credential/upstream detail을 보고서에 복사하지 않는다.

## 커밋

- 각 Stage source/test와 `mydocs/working/task_m040_48_stage{N}.md`를 같은 단계 커밋으로 묶는다.
- Stage 2/3은 product source를 수정하지 않고 검증 보고서만 커밋한다.
- 최종 보고서와 오늘할일 완료 갱신은 Stage 3 승인 후 `task-final-report` 절차에서 커밋한다.
- PR에는 자동 close keyword를 넣지 않는다.

## 단계 의존성

- Stage 1은 이 구현계획서 승인 후 진행한다.
- Stage 2는 Stage 1 version/focused test, 보고서와 커밋 승인 후 진행한다.
- Stage 3은 Stage 2 full/package/advisory preflight, 보고서와 커밋 승인 후 진행한다.
- Final report와 release preparation PR은 Stage 3 보고서 승인 후 진행한다.
- Post-Merge Release Runbook은 PR merge와 별도 release 실행 승인에 의존한다.
- Issue #48 close와 `pr-merge-cleanup`은 tag, publish, registry/npx/package/README/signature/provenance와 GitHub Release 성공에 의존한다.

## 위험과 대응

- **Irreversible publish**: Strict preflight, tag SHA와 artifact를 먼저 검증하고 Trusted Publishing workflow만 사용한다.
- **Version over-replacement**: Exact 9-file allowlist만 편집하고 historical docs/task marker를 diff-zero로 보호한다.
- **Stable contract regression**: Account Usage/Full Profile runtime/schema와 README/docs를 수정하지 않고 focused/full test를 실행한다.
- **Unexpected strict failure**: Pre-tag Stage 3에서 tag failure 외 FAIL을 허용하지 않는다.
- **External partial release**: Publish 후 실패를 Issue에 기록하고 same version 재게시 없이 후속 patch를 결정한다.
- **Private API drift**: Release task에서는 private endpoint를 호출·수정하지 않고 no-auth profile help만 published smoke로 사용한다.
- **Trusted Publisher mismatch**: Existing workflow filename, OIDC permission, repository metadata와 GitHub-hosted runner를 유지한다.
- **Credential exposure**: Long-lived token, auth output, signature 원문과 actual usage/profile을 기록하지 않는다.
- **Registry propagation**: Bounded retry 후 불일치면 GitHub Release를 만들지 않고 중단한다.
- **Dependabot concurrency**: Origin main 변경을 되돌리지 않고 action update를 task diff에서 분리한다.
- **Premature cleanup**: PR merge 후에도 post-release 완료까지 Issue와 cleanup gate를 유지한다.

## 승인 요청 사항

- Stage 1 exact 9-file version source/test allowlist와 focused validation
- Stage 2 116-test/23-file artifact, published README before baseline과 advisory preflight expectation
- Stage 3 strict pre-tag 단일 failure, upstream/registry/tag/Release/dispatch 부재와 supply-chain boundary
- PR 자동 close와 merge 직후 cleanup 금지, post-merge 별도 release 실행 승인 gate
- Tag -> strict preflight -> workflow -> registry/npx/package/README -> signature/provenance -> GitHub Release -> Issue close/cleanup runbook
- Stage별 커밋 메시지와 external partial-release 중단 조건

승인되면 Stage 1의 `0.4.0` version surface 변경과 focused test를 진행한다.

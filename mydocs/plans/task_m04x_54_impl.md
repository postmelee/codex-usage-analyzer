# Task M04x #54 구현계획서

수행계획서: [`task_m04x_54.md`](task_m04x_54.md)
GitHub Issue: [#54](https://github.com/postmelee/codex-usage-analyzer/issues/54)
마일스톤: M04x

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | Version surface를 0.4.1로 일치 | Version source/test 9개, Stage 1 보고서 | Exact allowlist, focused tests, contract/runtime 무손실 |
| 2 | M04x package release readiness 검증 | Stage 2 보고서 | 178-test+, 28-file artifact, no-auth smoke, advisory preflight |
| 3 | Pre-release 통합 검증과 runbook 확정 | Stage 3 보고서 | Origin sync, strict pre-tag 단일 실패, 외부 release state 부재, supply-chain gate |

## 문서 위치 확인

수행계획서에서 승인된 문서 위치와 실제 산출물 경로를 다음과 같이 고정한다.
README와 공식 product/API 문서는 수정하지 않는다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| Version source/test | 기존 package/runtime 위치 | `package.json`, `src/`, `src/__tests__/` | OK | 신규 version abstraction 없이 기존 surface만 갱신 |
| Public product docs | 변경 없음 | 변경 없음 | OK | #52에서 확정한 pet opt-in과 privacy 문서를 diff-zero로 보호 |
| Post-release 결과 | GitHub/npm external state | Issue #54, npm registry, GitHub Release | OK | Immutable tag와 workflow run에 연결 |
| Stage/최종 보고 | `mydocs/` M04x 표준 경로 | `mydocs/working/task_m04x_54_stage{N}.md`, `mydocs/report/task_m04x_54_report.md` | OK | 이전 release와 승인·검증 이력 분리 |

## 공통 불변조건

### Product diff allowlist

Stage 1-3의 product 변경은 다음 9개 파일로 제한한다.

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
- `src/experimental-pet.js`
- `src/experimental-pet-selector.js`
- `src/experimental-profile-api.js`
- `src/experimental-profile-api.d.ts`
- `src/format-account-usage.js`
- `src/format-experimental-profile.js`
- `docs/account-usage.schema.json`
- `docs/experimental-full-profile.schema.json`
- `docs/experimental-full-profile-v2.schema.json`
- `README.md`, `docs/`
- `.github/workflows/ci.yml`, `.github/workflows/publish.yml`
- `scripts/release-preflight.js`

### Release mutation gate

- Stage 1-3, 최종 보고서와 release preparation PR에서는 tag, workflow
  dispatch, npm publish와 GitHub Release를 만들지 않는다.
- PR에는 `Closes #54`, `Fixes #54` 같은 자동 close keyword를 넣지 않는다.
- PR merge 직후 `pr-merge-cleanup`을 호출하지 않는다. Issue #54와 task branch는
  post-release 성공까지 유지한다.
- Post-Merge Release Runbook은 PR merge 후 작업지시자의 별도 release 실행
  승인을 받아야 시작할 수 있다.
- Publish 이후 검증이 실패하면 같은 `0.4.1`을 재게시하거나 tag를 이동하지
  않는다. Issue를 열린 partial-release 상태로 유지하고 후속 patch를 결정한다.

### Stable/experimental boundary

- Account Usage Contract v1, Full Profile v1/v2 schema와 root SDK export를
  변경하지 않는다.
- 플래그 없는 default usage/profile 동작은 유지한다.
- Pet 기능은 `--include-pet` 또는 experimental subpath의 명시적 opt-in으로만
  제공된다.
- 이번 release는 compatible feature addition을 minor로 분류하는 일반 guide와
  달리 작업지시자가 stable/root 계약 불변과 experimental opt-in을 근거로
  결정한 patch `0.4.1`이다. 이 판단을 release note에 명시한다.

### Sensitive data boundary

- 실제 account/profile/pet JSON, identity, 로컬 경로, 선택 key, image base64,
  digest, auth/token과 raw upstream response를 명령 출력이나 보고서에 기록하지
  않는다.
- 실제 profile/pet endpoint를 postpublish smoke에서 호출하지 않는다.
- Registry signature와 attestation은 존재 여부, 개수와 predicate category만
  기록하고 원문을 복사하지 않는다.
- Temporary cache/install directory는 검증 후 exact target을 확인해 정리하고
  실제 생성 경로를 보고서에 기록하지 않는다.

## Stage 1 — Version surface를 0.4.1로 일치

### 산출물

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

신규:

- `mydocs/working/task_m04x_54_stage1.md`

### 변경 내용

- `npm version --no-git-tag-version 0.4.1`로 package version만 갱신한다.
- 명령이 lockfile을 만들면 중단하고 source 변경을 완료로 간주하지 않는다.
- CLI와 TypeScript declaration의 `PACKAGE_VERSION`을 `0.4.1`로 맞춘다.
- Stable app-server `clientInfo.version`과 experimental profile client의
  `CLIENT_VERSION`/originator assertion을 `0.4.1`로 맞춘다.
- 대응하는 4개 test assertion만 갱신한다.
- Global replacement를 사용하지 않고 historical `0.4.0` marker는 보존한다.

### 검증

```bash
node --test --test-name-pattern='version|clientInfo|originator' src/__tests__/cli.test.js src/__tests__/index.test.js src/__tests__/app-server-client.test.js src/__tests__/experimental-profile-client.test.js
node bin/codex-usage-analyzer.js --version
node -e 'const p=require("./package.json"); if(p.version!=="0.4.1") process.exit(1)'
node -e 'import("./src/index.js").then((sdk)=>{if(sdk.PACKAGE_VERSION!=="0.4.1") process.exit(1)})'
rg -n '0\.4\.1' package.json src/cli.js src/index.d.ts src/app-server-client.js src/experimental-profile-client.js src/__tests__/cli.test.js src/__tests__/index.test.js src/__tests__/app-server-client.test.js src/__tests__/experimental-profile-client.test.js
test ! -e package-lock.json
git diff --name-only origin/main...HEAD
git diff --exit-code origin/main...HEAD -- README.md docs .github scripts src/index.js src/account-usage.js src/experimental-profile.js src/experimental-pet.js src/experimental-pet-selector.js src/experimental-profile-api.js src/experimental-profile-api.d.ts src/format-account-usage.js src/format-experimental-profile.js
test -z "$(git tag --list v0.4.1)"
git ls-remote --exit-code --tags origin refs/tags/v0.4.1 && exit 1 || test "$?" -eq 2
git diff --check
```

Exact product diff allowlist는 Stage 보고서 작성 전에 다음 방식으로 확인한다.

```bash
git diff --name-only origin/main...HEAD -- package.json src | sort
```

Expected product file은 공통 allowlist의 9개뿐이다. `mydocs/` 산출물은 별도로
허용하며 그 밖의 product path가 나타나면 Stage를 중단한다.

Before snapshot read-only 조회:

```bash
npm view codex-usage-analyzer version dist-tags --json
gh release list --repo postmelee/codex-usage-analyzer --limit 100 --json tagName,isDraft,isPrerelease --jq '[.[] | select(.tagName=="v0.4.1")] | length'
```

Expected before values:

- Registry version/latest: `0.4.0`
- Existing stable tag/Release: `v0.4.0`
- Local/remote `v0.4.1` tag: 없음
- GitHub Release `v0.4.1`: 없음

### 커밋

```text
Task #54 Stage 1: Version surface를 0.4.1로 갱신
```

## Stage 2 — M04x package release readiness 검증

### 산출물

신규:

- `mydocs/working/task_m04x_54_stage2.md`

수정:

- 없음

### 변경 내용

- Default usage, Full Profile v1/v2, pet reader/selector와 experimental subpath를
  포함한 전체 regression을 실행하고 pass count가 178개 이상인지 확인한다.
- Isolated cache의 package dry-run JSON에서 version `0.4.1`, exact file count
  28개와 required/forbidden path를 검증한다.
- Published `0.4.0` package가 23개 artifact이고 신규 pet/v2 surface 5개가
  없다는 before baseline을 구조적으로 확인한다.
- Current artifact에는 pet reader/selector, experimental API/type와 Full Profile
  v2 schema가 모두 포함돼야 한다.
- Package `files` allowlist 20개, runtime/development dependency 0개와 lockfile
  부재를 확인한다.
- CLI `--help`, `--version`, `profile --help`를 account access 없이 실행한다.
- Source README의 pet opt-in, selector, experimental subpath와 v2 schema marker를
  확인한다.
- Advisory preflight는 exit 0이어야 하며 `v0.4.1` tag 부재 1건만 WARN이어야
  한다. 그 밖의 WARN/FAIL은 허용하지 않는다.

### 검증

```bash
npm test
CACHE_DIR="$(mktemp -d)"
npm pack --cache "$CACHE_DIR" --dry-run --json > "$CACHE_DIR/pack.json"
node bin/codex-usage-analyzer.js --help
node bin/codex-usage-analyzer.js --version
node bin/codex-usage-analyzer.js profile --help
node -e 'const fs=require("node:fs"); const result=JSON.parse(fs.readFileSync(process.argv[1],"utf8"))[0]; const paths=result.files.map((entry)=>entry.path); const required=["README.md","docs/account-usage-contract.md","docs/account-usage.schema.json","docs/downstream-integration.md","docs/experimental-full-profile.md","docs/experimental-full-profile.schema.json","docs/experimental-full-profile-v2.schema.json","src/experimental-pet.js","src/experimental-pet-selector.js","src/experimental-profile-api.js","src/experimental-profile-api.d.ts","src/experimental-profile-client.js","src/experimental-profile.js","src/index.js","src/index.d.ts"]; const prefixes=[".github/","mydocs/","scripts/","src/__tests__/"]; const fragments=["codex-extracted","fixture","auth.json","auth-response","profile-response","raw-response",".env"]; const forbidden=paths.filter((path)=>prefixes.some((prefix)=>path.startsWith(prefix))||fragments.some((fragment)=>path.toLowerCase().includes(fragment))); if(result.version!=="0.4.1"||paths.length!==28||required.some((path)=>!paths.includes(path))||forbidden.length) process.exit(1); console.log(JSON.stringify({version:result.version,fileCount:paths.length,requiredPresent:true,forbiddenCount:forbidden.length}))' "$CACHE_DIR/pack.json"
node -e 'const p=require("./package.json"); if((p.files??[]).length!==20||Object.keys(p.dependencies??{}).length!==0||Object.keys(p.devDependencies??{}).length!==0) process.exit(1)'
test ! -e package-lock.json
node -e 'const fs=require("node:fs"); const readme=fs.readFileSync("README.md","utf8"); const markers=["--include-pet","--pet-key","--select-pet","codex-usage-analyzer/experimental-profile","experimental-full-profile-v2.schema.json"]; if(markers.some((marker)=>!readme.includes(marker))) process.exit(1); console.log(JSON.stringify({markers:markers.length}))'
npm pack codex-usage-analyzer@0.4.0 --cache "$CACHE_DIR" --dry-run --json > "$CACHE_DIR/published-040.json"
node -e 'const fs=require("node:fs"); const result=JSON.parse(fs.readFileSync(process.argv[1],"utf8"))[0]; const paths=result.files.map((entry)=>entry.path); const absent=["docs/experimental-full-profile-v2.schema.json","src/experimental-pet.js","src/experimental-pet-selector.js","src/experimental-profile-api.js","src/experimental-profile-api.d.ts"]; if(result.version!=="0.4.0"||paths.length!==23||absent.some((path)=>paths.includes(path))) process.exit(1); console.log(JSON.stringify({version:result.version,fileCount:paths.length,newSurfaceAbsent:true}))' "$CACHE_DIR/published-040.json"
env NPM_CONFIG_CACHE="$CACHE_DIR" node scripts/release-preflight.js > "$CACHE_DIR/preflight.log"
node -e 'const fs=require("node:fs"); const text=fs.readFileSync(process.argv[1],"utf8"); const fails=text.split(/\r?\n/u).filter((line)=>line.startsWith("[FAIL]")); const warns=text.split(/\r?\n/u).filter((line)=>line.startsWith("[WARN]")); const expected="[WARN] release tag state: v0.4.1 tag is not present"; if(fails.length||warns.length!==1||warns[0]!==expected||!text.includes("release preflight completed with warnings")) process.exit(1); console.log(JSON.stringify({fails:fails.length,warns:warns.length}))' "$CACHE_DIR/preflight.log"
git diff --exit-code origin/main...HEAD -- README.md docs .github scripts src/index.js src/account-usage.js src/experimental-profile.js src/experimental-pet.js src/experimental-pet-selector.js src/experimental-profile-api.js src/experimental-profile-api.d.ts src/format-account-usage.js src/format-experimental-profile.js
git diff --check
git status --short
```

Temporary directory는 결과 확인 후 exact `mktemp` target임을 검증해 정리한다.
Sandbox 또는 user-level npm cache ownership 때문에 기본 pack/preflight가 실패하면
source를 수정하지 않고 isolated cache로 다시 수행한다.

### 커밋

```text
Task #54 Stage 2: M04x package release readiness 검증
```

## Stage 3 — Pre-release 통합 검증과 post-merge runbook 확정

### 산출물

신규:

- `mydocs/working/task_m04x_54_stage3.md`

수정:

- 없음. Origin main 통합이 필요하면 사용자/다른 작업자 변경을 보존하는 별도
  merge commit만 허용한다.

### 변경 내용

- `origin/main`을 fetch하고 task branch가 최신 main을 포함하는지 확인한다.
- Product diff가 승인된 version source/test 9개뿐이고 public docs, contracts,
  feature runtime, workflow와 preflight source가 origin/main과 동일한지 확인한다.
- Registry/latest `0.4.0`, local/remote `v0.4.1` tag, GitHub Release와 publish
  dispatch 부재를 재확인한다.
- Strict preflight는 pre-tag이므로 exit 1이어야 하며 유일한 FAIL은
  `[FAIL] release tag state: v0.4.1 tag is not present`여야 한다.
- Publish workflow의 OIDC permission, GitHub-hosted runner, Node/npm minimum,
  no-auth smoke와 plain `npm publish`를 확인한다.
- Long-lived npm token, manual `--provenance`와 provenance disable pattern이
  없음을 확인한다.
- PR body는 issue-closing keyword 없이 local 수용 기준 OK와 post-merge release
  PENDING을 분리한다.
- Final report도 source/package 수용은 OK, tag/publish/registry/GitHub Release는
  PENDING으로 기록한다.

### 검증

```bash
git fetch origin --prune
test "$(git rev-list --count HEAD..origin/main)" -eq 0
git diff --name-only origin/main...HEAD
git diff --exit-code origin/main...HEAD -- README.md docs .github scripts src/index.js src/account-usage.js src/experimental-profile.js src/experimental-pet.js src/experimental-pet-selector.js src/experimental-profile-api.js src/experimental-profile-api.d.ts src/format-account-usage.js src/format-experimental-profile.js
npm view codex-usage-analyzer version dist-tags --json
test -z "$(git tag --list v0.4.1)"
git ls-remote --exit-code --tags origin refs/tags/v0.4.1 && exit 1 || test "$?" -eq 2
gh release list --repo postmelee/codex-usage-analyzer --limit 100 --json tagName,isDraft,isPrerelease --jq '[.[] | select(.tagName=="v0.4.1")] | length'
CACHE_DIR="$(mktemp -d)"
if env NPM_CONFIG_CACHE="$CACHE_DIR" node scripts/release-preflight.js --release-ready > "$CACHE_DIR/strict.log" 2>&1; then exit 1; fi
node -e 'const fs=require("node:fs"); const text=fs.readFileSync(process.argv[1],"utf8"); const fails=text.split(/\r?\n/u).filter((line)=>line.startsWith("[FAIL]")); const expected="[FAIL] release tag state: v0.4.1 tag is not present"; if(fails.length!==1||fails[0]!==expected||!text.includes("release preflight failed")) process.exit(1); console.log(JSON.stringify({expectedFailure:true,failCount:fails.length}))' "$CACHE_DIR/strict.log"
rg -n 'workflow_dispatch:|contents: read|id-token: write|runs-on: ubuntu-latest|node-version: 24|CLI no-auth smoke|run: npm publish' .github/workflows/publish.yml
if rg -n 'NPM_TOKEN|NODE_AUTH_TOKEN|_authToken|--provenance|NPM_CONFIG_PROVENANCE=false|provenance=false' .github/workflows/publish.yml package.json; then exit 1; fi
gh run list --repo postmelee/codex-usage-analyzer --workflow publish.yml --event workflow_dispatch --limit 100 --json headBranch --jq '[.[] | select(.headBranch=="v0.4.1")] | length'
git diff --check
git status --short
```

Expected Stage 3 external state:

- Registry/latest: `0.4.0`
- Local/remote `v0.4.1` tag: 없음
- GitHub Release `v0.4.1`: 없음
- Publish workflow dispatch for `v0.4.1`: 없음
- Strict preflight: tag 부재 1개만 expected FAIL

### 커밋

```text
Task #54 Stage 3: Pre-release 통합 검증과 runbook 확정
```

## Post-Merge Release Runbook

이 절차는 release preparation PR merge와 작업지시자의 별도 release 실행 승인
후에만 수행한다. 승인 전에는 첫 mutation command인 `git tag v0.4.1`을 실행하지
않는다.

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
- Package/CLI version `0.4.1`
- Main CI/CodeQL success
- Working tree clean
- `profile --help` no-auth success

### 2. Tag 생성과 strict preflight

```bash
git tag v0.4.1
git push origin v0.4.1
test "$(git rev-list -n 1 v0.4.1)" = "$(git rev-parse HEAD)"
git ls-remote --tags origin refs/tags/v0.4.1
CACHE_DIR="$(mktemp -d)"
env NPM_CONFIG_CACHE="$CACHE_DIR" node scripts/release-preflight.js --release-ready
```

Strict preflight가 모두 OK가 아니면 workflow를 dispatch하지 않는다. 이미 push한
tag를 임의 이동하거나 재생성하지 않고 원인과 recovery를 보고한다.

### 3. Trusted Publishing workflow

```bash
gh workflow run publish.yml --repo postmelee/codex-usage-analyzer --ref v0.4.1
gh run list --repo postmelee/codex-usage-analyzer --workflow publish.yml --event workflow_dispatch --limit 20 --json databaseId,headBranch,headSha,status,conclusion,url,createdAt
gh run watch PUBLISH_RUN_ID --repo postmelee/codex-usage-analyzer --exit-status
```

`headBranch == v0.4.1`, `headSha == MERGE_SHA`인 newest run 하나를 선택한다.
Workflow 실패 시 local publish로 우회하거나 same version publish를 재시도하지
않는다.

### 4. Registry, npx, package, subpath와 README marker

Registry propagation은 최대 12회, 10초 간격의 bounded polling으로 확인한다.
각 조회는 독립적으로 실행해 장시간 blocking command를 만들지 않는다.

```bash
npm view codex-usage-analyzer@0.4.1 version dist-tags --json
npx --yes codex-usage-analyzer@0.4.1 --help
npx --yes codex-usage-analyzer@0.4.1 --version
npx --yes codex-usage-analyzer@0.4.1 profile --help
npx --yes codex-usage-analyzer@latest --version
CACHE_DIR="$(mktemp -d)"
npm pack codex-usage-analyzer@0.4.1 --cache "$CACHE_DIR" --dry-run --json > "$CACHE_DIR/published-pack.json"
node -e 'const fs=require("node:fs"); const result=JSON.parse(fs.readFileSync(process.argv[1],"utf8"))[0]; const paths=result.files.map((entry)=>entry.path); const required=["docs/experimental-full-profile-v2.schema.json","src/experimental-pet.js","src/experimental-pet-selector.js","src/experimental-profile-api.js","src/experimental-profile-api.d.ts"]; if(result.version!=="0.4.1"||paths.length!==28||required.some((path)=>!paths.includes(path))) process.exit(1); console.log(JSON.stringify({version:result.version,fileCount:paths.length,requiredPresent:true}))' "$CACHE_DIR/published-pack.json"
node -e 'const {execFileSync}=require("node:child_process"); const readme=JSON.parse(execFileSync("npm",["view","codex-usage-analyzer@0.4.1","readme","--json"],{encoding:"utf8"})); const markers=["--include-pet","--pet-key","--select-pet","codex-usage-analyzer/experimental-profile","experimental-full-profile-v2.schema.json"]; if(markers.some((marker)=>!readme.includes(marker))) process.exit(1); console.log(JSON.stringify({version:"0.4.1",markers:markers.length}))'
```

Exact-version module smoke는 별도 temporary package에서 수행한다.

```bash
VERIFY_DIR="$(mktemp -d)"
cd "$VERIFY_DIR"
npm init -y
npm install codex-usage-analyzer@0.4.1
node --input-type=module -e 'import("codex-usage-analyzer/experimental-profile").then((m)=>{const keys=Object.keys(m).sort(); const expected=["listExperimentalPets","readExperimentalProfile"]; if(JSON.stringify(keys)!==JSON.stringify(expected)||expected.some((key)=>typeof m[key]!=="function")) process.exit(1); console.log(JSON.stringify({exports:keys}))})'
cd -
```

Actual account usage/profile/pet command와 local pet bytes는 사용하지 않는다.

### 5. Signature와 provenance

```bash
node -e 'const {execFileSync}=require("node:child_process"); const meta=JSON.parse(execFileSync("npm",["view","codex-usage-analyzer@0.4.1","version","dist.signatures","dist.attestations","--json"],{encoding:"utf8"})); const signatures=meta["dist.signatures"]??[]; const predicate=meta["dist.attestations"]?.provenance?.predicateType??null; if(meta.version!=="0.4.1"||signatures.length<1||predicate!=="https://slsa.dev/provenance/v1") process.exit(1); console.log(JSON.stringify({version:meta.version,signatureCount:signatures.length,provenancePredicate:predicate}))'
cd "$VERIFY_DIR"
npm audit signatures
cd -
```

Temporary directory path, install log, signature/attestation 원문과 credential을
Issue/Release에 기록하지 않는다. 검증 결과를 확인한 뒤 exact temporary target을
정리한다.

### 6. GitHub Release, Issue close와 cleanup

GitHub Release는 registry/npx/package/subpath/README/signature/provenance 검증 후
마지막으로 생성한다.

```bash
gh release create v0.4.1 --repo postmelee/codex-usage-analyzer --verify-tag --title "v0.4.1" --notes-file RELEASE_NOTES_FILE
gh release view v0.4.1 --repo postmelee/codex-usage-analyzer --json tagName,name,isDraft,isPrerelease,publishedAt,url
gh issue close 54 --repo postmelee/codex-usage-analyzer --comment RELEASE_RESULT_SUMMARY
```

Release note/result summary에는 다음만 기록한다.

- Experimental pet opt-in: `--include-pet`, explicit key/selector와 experimental
  module
- Stable default Account Usage v1, Full Profile v1과 root SDK 무변경
- Full Profile v2 schema와 downstream decode/re-encode/re-host/delete 경계
- npm package `0.4.1`
- Publish workflow run URL
- Structural npx/package/subpath/README smoke와 signature/provenance pass
- 작업지시자의 patch classification 결정과 breaking change 없음
- Desktop selected state가 항상 제공되지 않을 수 있고 spritesheet animation
  계약은 아직 지원하지 않는 제한

Issue close 후에만 `pr-merge-cleanup`으로 `publish/task54`, `local/task54`, 관련
worktree와 main 복귀를 정리한다. 이후 published exact `0.4.1`을 Tokenmon 후속
계획의 dependency와 인계 기준으로 전달한다.

## 전체 검증 원칙

- 각 Stage 검증은 단계 보고서 작성 전에 실행한다.
- Stage 1-3 product diff는 exact version source/test 9개로 제한한다.
- Stable/experimental contract와 user-facing docs는 diff-zero와 focused/full
  regression으로 보호한다.
- Strict preflight의 pre-tag failure는 Stage 3 expected condition이며 다른
  FAIL이 하나라도 있으면 Stage를 완료하지 않는다.
- PR checks 실패 시 merge 승인을 요청하지 않는다.
- PR merge 후에도 별도 release 실행 승인 전 tag를 만들지 않는다.
- Tag push 후 strict preflight 실패 시 workflow를 dispatch하지 않는다.
- Publish workflow 실패 시 local npm publish로 우회하지 않는다.
- npm publish 후 verification 실패 시 same version을 재게시하지 않는다.
- Registry/npx/package/subpath/README/signature/provenance 통과 전 GitHub Release를
  만들지 않는다.
- GitHub Release 통과 전 Issue #54를 close하거나 branch cleanup을 수행하지
  않는다.
- 모든 보고서는 실제 사용자 데이터와 raw supply-chain material 대신 구조적
  pass/fail만 기록한다.

## 커밋

- 각 Stage source/test와 `mydocs/working/task_m04x_54_stage{N}.md`를 같은 단계
  커밋으로 묶는다.
- Stage 2/3은 product source를 수정하지 않고 검증 보고서만 커밋한다.
- 최종 보고서와 오늘할일 완료 갱신은 Stage 3 승인 후 `task-final-report`
  절차에서 커밋한다.
- PR에는 자동 close keyword를 넣지 않는다.

## 단계 의존성

- Stage 1은 이 구현계획서 승인 후 진행한다.
- Stage 2는 Stage 1 version/focused test, 보고서와 커밋 승인 후 진행한다.
- Stage 3은 Stage 2 full/package/advisory preflight, 보고서와 커밋 승인 후
  진행한다.
- Final report와 release preparation PR은 Stage 3 보고서 승인 후 진행한다.
- Post-Merge Release Runbook은 PR merge와 별도 release 실행 승인에 의존한다.
- Issue #54 close와 `pr-merge-cleanup`은 tag, publish, registry/npx/package/
  subpath/README/signature/provenance와 GitHub Release 성공에 의존한다.
- Tokenmon 후속 인계는 exact `codex-usage-analyzer@0.4.1` 공개 검증 완료에
  의존한다.

## 위험과 대응

- **Irreversible publish**: Strict preflight, tag SHA와 artifact를 먼저 검증하고
  Trusted Publishing workflow만 사용한다.
- **Patch classification**: Stable/root 계약 불변과 experimental opt-in이라는
  작업지시자 결정을 release note에 남기고 historical policy를 변경하지 않는다.
- **Version over-replacement**: Exact 9-file allowlist만 편집하고 historical
  docs/task marker를 보존한다.
- **Stable contract regression**: Account Usage/Full Profile runtime/schema,
  root SDK와 README/docs를 수정하지 않고 focused/full test를 실행한다.
- **Unexpected strict failure**: Pre-tag Stage 3에서는 tag failure 외 FAIL을
  허용하지 않는다.
- **External partial release**: Publish 후 실패를 Issue에 기록하고 same version
  재게시 없이 후속 patch를 결정한다.
- **Private/local state drift**: Postpublish는 no-auth help/version과 module
  surface만 smoke하고 실제 profile/pet source를 호출하지 않는다.
- **Trusted Publisher mismatch**: Existing workflow filename, OIDC permission,
  repository metadata와 GitHub-hosted runner를 유지한다.
- **Credential exposure**: Long-lived token, auth output, signature 원문과 actual
  profile/pet 값을 기록하지 않는다.
- **Registry propagation**: Bounded polling 후 불일치면 GitHub Release를 만들지
  않고 중단한다.
- **Premature cleanup**: PR merge 후에도 post-release 완료까지 Issue와 branch
  cleanup gate를 유지한다.
- **Downstream sequencing**: Tokenmon 구현은 release task와 분리하고 published
  exact version만 인계한다.

## 승인 요청 사항

- Stage 1 exact 9-file version source/test allowlist와 focused validation
- Stage 2 178-test+/28-file artifact, published 0.4.0 before baseline, README
  marker와 advisory preflight expectation
- Stage 3 strict pre-tag 단일 failure, registry/tag/Release/dispatch 부재와
  Trusted Publishing boundary
- PR 자동 close와 merge 직후 cleanup 금지, post-merge 별도 release 실행 승인
  gate
- Tag -> strict preflight -> workflow -> registry/npx/package/subpath/README ->
  signature/provenance -> GitHub Release -> Issue close/cleanup runbook
- Release 완료 후 exact `0.4.1`을 Tokenmon 후속 인계 기준으로 사용하는 순서

승인되면 Stage 1의 `0.4.1` version surface 변경과 focused test를 진행한다.

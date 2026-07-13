# Task M030 #37 구현계획서

수행계획서: [`task_m030_37.md`](task_m030_37.md)
GitHub Issue: [#37](https://github.com/postmelee/codex-usage-analyzer/issues/37)
마일스톤: M030

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | Version surface를 0.3.0으로 일치 | Version source/test 7개, Stage 1 보고서 | Exact version, focused tests, historical benchmark/PR #44 무손실 |
| 2 | Resolver package와 npm README sync readiness | Stage 2 보고서 | 55-test+, 18-file artifact, README marker, advisory preflight |
| 3 | Pre-release 통합 검증과 post-merge runbook 확정 | Stage 3 보고서 | Origin sync, strict pre-tag failure, registry/tag/Release 부재, release gate |

## 문서 위치 확인

수행계획서의 문서 위치 판단과 실제 Stage 산출물 경로를 다음과 같이 고정한다. README와 공식 product documentation source는 변경하지 않는다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| Version source/test | 기존 package/runtime 위치 | `package.json`, `src/`, `src/__tests__/` | OK | 신규 version abstraction 없이 기존 surface 갱신 |
| Post-release 결과 | GitHub/npm external state | Issue #37 comment, npm registry, GitHub Release | OK | Workflow/tag와 연결된 운영 결과 |
| Stage 보고서 | `mydocs/` M030 표준 경로 | `mydocs/working/task_m030_37_stage{N}.md` | OK | Release 승인·검증 이력 |

## Stage 1 — Version surface를 0.3.0으로 일치

### 산출물

신규:

- `mydocs/working/task_m030_37_stage1.md`

수정:

- `package.json`
- `src/cli.js`
- `src/index.d.ts`
- `src/app-server-client.js`
- `src/__tests__/cli.test.js`
- `src/__tests__/index.test.js`
- `src/__tests__/app-server-client.test.js`

### 변경 내용

- Before snapshot에서 local/source `0.2.0`, npm registry latest `0.2.0`, local/remote `v0.3.0` tag 부재와 GitHub Release 부재를 기록한다.
- `npm version --no-git-tag-version 0.3.0`으로 `package.json` version만 갱신한다.
- Lockfile이 새로 생성되면 Stage를 실패 처리하고 삭제가 아니라 원인을 확인한다. 현재 repository에는 lockfile이 없다.
- `PACKAGE_VERSION`, declaration literal과 app-server `clientInfo.version`을 `0.3.0`으로 갱신한다.
- CLI stdout, package bin, SDK export와 app-server initialize assertion을 `0.3.0`으로 갱신한다.
- `src/codex-executable.js`, resolver test, errors, README, benchmark docs, Account Usage Contract/schema와 publish/CI workflow는 수정하지 않는다.
- Historical benchmark `0.2.0`은 source와 문서에서 그대로 보존한다.
- Stage 1에서는 tag, workflow dispatch, npm publish, GitHub Release와 registry mutation을 수행하지 않는다.

### 검증

```bash
npm pkg get version
node bin/codex-usage-analyzer.js --version
node --test src/__tests__/cli.test.js src/__tests__/index.test.js src/__tests__/app-server-client.test.js src/__tests__/codex-executable.test.js
rg -n '0\.3\.0' package.json src/cli.js src/index.d.ts src/app-server-client.js src/__tests__/cli.test.js src/__tests__/index.test.js src/__tests__/app-server-client.test.js
if rg -n '0\.2\.0' package.json src/cli.js src/index.d.ts src/app-server-client.js src/__tests__/cli.test.js src/__tests__/index.test.js src/__tests__/app-server-client.test.js; then exit 1; fi
rg -n 'codex-usage-analyzer@0\.2\.0|codex-usage-analyzer 0\.2\.0' README.md docs/codex-lookup-benchmark.md
git diff --exit-code origin/main -- README.md docs .github src/codex-executable.js src/__tests__/codex-executable.test.js src/errors.js
test ! -e package-lock.json
test -z "$(git tag --list v0.3.0)"
git diff --check
```

Before snapshot read-only 조회:

```bash
npm view codex-usage-analyzer version dist-tags --json
git ls-remote --tags origin refs/tags/v0.3.0
gh release list --repo postmelee/codex-usage-analyzer --limit 100 --json tagName,isDraft,isPrerelease --jq '[.[] | select(.tagName=="v0.3.0")] | length'
```

Expected before values:

- Registry version/latest: `0.2.0`
- Remote `v0.3.0` tag: empty output
- GitHub Release `v0.3.0` count: `0`

### 커밋

```text
Task #37 Stage 1: Version surface를 0.3.0으로 갱신
```

## Stage 2 — Resolver package와 npm README sync readiness

### 산출물

신규:

- `mydocs/working/task_m030_37_stage2.md`

수정:

- 없음

### 변경 내용

- PR #44의 resolver를 포함한 전체 regression을 실행하며 pass count가 55개 이상인지 확인한다.
- Package dry-run JSON에서 version `0.3.0`, file count 18개 이상과 required/forbidden path를 검증한다.
- Required package path에 `src/codex-executable.js`, README와 public benchmark document를 포함한다.
- Forbidden path는 `.github/`, `mydocs/`, `scripts/`, `src/__tests__/`다.
- CLI help/version을 account access 없이 실행한다.
- Source README의 support/upstream/benchmark/app-only marker가 존재하고 historical benchmark `0.2.0`이 유지되는지 확인한다.
- npm registry `0.2.0` README의 5개 sync marker가 모두 없는 before baseline을 재확인한다.
- Advisory preflight는 exit 0이어야 하며 tag 부재만 WARN이고 FAIL은 없어야 한다.
- Temporary pack/preflight 파일은 `/private/tmp`에 두고 검증 후 삭제한다.

### 검증

```bash
npm test
npm pack --dry-run --json > /private/tmp/task37-stage2-pack.json
node bin/codex-usage-analyzer.js --help
node bin/codex-usage-analyzer.js --version
node -e 'const fs=require("node:fs"); const result=JSON.parse(fs.readFileSync("/private/tmp/task37-stage2-pack.json","utf8"))[0]; const paths=result.files.map((file)=>file.path); const required=["README.md","docs/codex-lookup-benchmark.md","src/codex-executable.js"]; const forbidden=paths.filter((path)=>[".github/","mydocs/","scripts/","src/__tests__/"].some((prefix)=>path.startsWith(prefix))); if(result.version!=="0.3.0"||paths.length<18||required.some((path)=>!paths.includes(path))||forbidden.length) process.exit(1); console.log(JSON.stringify({name:result.name,version:result.version,fileCount:paths.length,unpackedSize:result.unpackedSize,requiredPresent:true,forbidden}))'
node -e 'const fs=require("node:fs"); const readme=fs.readFileSync("README.md","utf8"); const markers=["Documented upstream:","github.com/openai/codex/blob/main/codex-rs/app-server/README.md","Codex for Open Source","## Codex lookup benchmark","docs/codex-lookup-benchmark.md","npx codex-usage-analyzer@latest"]; if(markers.some((marker)=>!readme.includes(marker))||!readme.includes("codex-usage-analyzer@0.2.0")) process.exit(1)'
node -e 'const {execFileSync}=require("node:child_process"); const readme=JSON.parse(execFileSync("npm",["view","codex-usage-analyzer@0.2.0","readme","--json"],{encoding:"utf8"})); const markers=["Documented upstream:","github.com/openai/codex/blob/main/codex-rs/app-server/README.md","Codex for Open Source","## Codex lookup benchmark","docs/codex-lookup-benchmark.md"]; if(markers.some((marker)=>readme.includes(marker))) process.exit(1); console.log(JSON.stringify({version:"0.2.0",missingMarkers:markers.length}))'
npm run release:preflight > /private/tmp/task37-stage2-preflight.log
node -e 'const fs=require("node:fs"); const text=fs.readFileSync("/private/tmp/task37-stage2-preflight.log","utf8"); const fails=text.split(/\r?\n/u).filter((line)=>line.startsWith("[FAIL]")); const warns=text.split(/\r?\n/u).filter((line)=>line.startsWith("[WARN]")); if(fails.length||warns.length!==1||!warns[0].includes("release tag state: v0.3.0 tag is not present")||!text.includes("release preflight completed with warnings")) process.exit(1); console.log(JSON.stringify({fails:fails.length,warns:warns.length}))'
git diff --exit-code origin/main...HEAD -- README.md docs src/codex-executable.js src/__tests__/codex-executable.test.js src/errors.js .github
git diff --check
git status --short
rm -f /private/tmp/task37-stage2-pack.json /private/tmp/task37-stage2-preflight.log
```

`npm pack`과 preflight가 sandbox npm cache 제한으로 실패하면 package/source를 변경하지 않고 승인된 실행으로 같은 command를 재수행한다.

### 커밋

```text
Task #37 Stage 2: Resolver package와 README sync readiness 검증
```

## Stage 3 — Pre-release 통합 검증과 post-merge runbook 확정

### 산출물

신규:

- `mydocs/working/task_m030_37_stage3.md`

수정:

- 없음. Origin main 통합이 필요하면 사용자/Dependabot 변경을 보존하는 별도 merge commit만 허용한다.

### 변경 내용

- `origin/main`을 fetch하고 task branch가 최신 main을 포함하는지 확인한다.
- Product diff는 version source/test 7개로 제한하고 PR #44 source/docs는 upstream과 동일한지 확인한다.
- Registry latest `0.2.0`, local/remote `v0.3.0` tag와 GitHub Release 부재를 재확인한다.
- Strict preflight는 pre-merge이므로 exit 1이어야 하며 유일한 FAIL은 `release tag state: v0.3.0 tag is not present`여야 한다.
- Publish workflow의 OIDC boundary, runner/runtime, token/provenance 금지 pattern을 확인한다.
- PR #40/#41의 state와 same-file 변경을 확인하고 task diff에 action version update가 없는지 확인한다.
- PR 본문에는 issue-closing keyword를 넣지 않고 PR CI/CodeQL check와 post-merge release pending을 구분한다.
- Final report는 source/local 수용 기준은 OK, tag/publish/registry/GitHub Release는 PENDING으로 기록한다.

### 검증

```bash
git fetch origin --prune
test "$(git rev-list --count HEAD..origin/main)" -eq 0
git diff --name-only origin/main...HEAD
git diff --exit-code origin/main...HEAD -- README.md docs src/codex-executable.js src/__tests__/codex-executable.test.js src/errors.js .github scripts
npm view codex-usage-analyzer version dist-tags --json
test -z "$(git tag --list v0.3.0)"
git ls-remote --tags origin refs/tags/v0.3.0
gh release list --repo postmelee/codex-usage-analyzer --limit 100 --json tagName,isDraft,isPrerelease --jq '[.[] | select(.tagName=="v0.3.0")] | length'
gh pr view 40 --repo postmelee/codex-usage-analyzer --json number,state,files,url --jq '{number,state,files:[.files[].path],url}'
gh pr view 41 --repo postmelee/codex-usage-analyzer --json number,state,files,url --jq '{number,state,files:[.files[].path],url}'
if npm run release:preflight -- --release-ready > /private/tmp/task37-stage3-strict.log 2>&1; then exit 1; fi
node -e 'const fs=require("node:fs"); const text=fs.readFileSync("/private/tmp/task37-stage3-strict.log","utf8"); const fails=text.split(/\r?\n/u).filter((line)=>line.startsWith("[FAIL]")); const expected="[FAIL] release tag state: v0.3.0 tag is not present"; if(fails.length!==1||fails[0]!==expected||!text.includes("release preflight failed")) process.exit(1); console.log(JSON.stringify({expectedFailure:true,fails}))'
rg -n 'workflow_dispatch:|contents: read|id-token: write|runs-on: ubuntu-latest|node-version: 24|run: npm publish' .github/workflows/publish.yml
if rg -n 'NPM_TOKEN|NODE_AUTH_TOKEN|_authToken|--provenance|NPM_CONFIG_PROVENANCE=false|provenance=false' .github/workflows/publish.yml package.json; then exit 1; fi
git diff --check
git status --short
rm -f /private/tmp/task37-stage3-strict.log
```

Expected Stage 3 external state:

- Registry/latest: `0.2.0`
- Local/remote `v0.3.0` tag: 없음
- GitHub Release `v0.3.0`: 없음
- Publish workflow dispatch for `v0.3.0`: 없음

### 커밋

```text
Task #37 Stage 3: Pre-release 통합 검증과 runbook 확정
```

## Post-Merge Release Runbook

이 절차는 PR merge와 작업지시자의 별도 release 실행 승인 후에만 수행한다. Approval 전에는 첫 mutation command인 `git tag v0.3.0`을 실행하지 않는다.

### 1. Main과 merge SHA 확인

```bash
git fetch origin --prune
git checkout main
git pull --ff-only
git status --short
npm pkg get version
node bin/codex-usage-analyzer.js --version
gh pr view PR_NUMBER --repo postmelee/codex-usage-analyzer --json state,mergeCommit
gh run list --repo postmelee/codex-usage-analyzer --branch main --commit MERGE_SHA --json databaseId,workflowName,status,conclusion,url
```

Required:

- PR state `MERGED`
- `HEAD == origin/main == MERGE_SHA`
- Package/CLI version `0.3.0`
- Main CI/CodeQL success
- Working tree clean

### 2. Tag 생성과 strict preflight

```bash
git tag v0.3.0
git push origin v0.3.0
test "$(git rev-list -n 1 v0.3.0)" = "$(git rev-parse HEAD)"
git ls-remote --tags origin refs/tags/v0.3.0
npm run release:preflight -- --release-ready
```

Strict preflight가 모두 OK가 아니면 workflow를 dispatch하지 않는다. 이미 push한 tag를 임의 이동하거나 재생성하지 않고 원인과 recovery를 보고한다.

### 3. Trusted Publishing workflow

```bash
gh workflow run publish.yml --repo postmelee/codex-usage-analyzer --ref v0.3.0
gh run list --repo postmelee/codex-usage-analyzer --workflow publish.yml --event workflow_dispatch --limit 20 --json databaseId,headBranch,headSha,status,conclusion,url,createdAt
gh run watch PUBLISH_RUN_ID --repo postmelee/codex-usage-analyzer --exit-status
```

`headBranch == v0.3.0`, `headSha == MERGE_SHA`인 newest run 하나를 선택한다. Workflow 실패 시 local publish로 우회하거나 재게시하지 않는다.

### 4. Registry, npx와 README marker

Registry propagation은 최대 12회, 10초 간격으로 bounded retry한다.

```bash
for attempt in {1..12}; do
  VERSION="$(npm view codex-usage-analyzer version)"
  if [ "$VERSION" = "0.3.0" ]; then break; fi
  if [ "$attempt" -eq 12 ]; then exit 1; fi
  sleep 10
done
npm view codex-usage-analyzer@0.3.0 version dist-tags --json
npx --yes codex-usage-analyzer@0.3.0 --help
npx --yes codex-usage-analyzer@0.3.0 --version
npx --yes codex-usage-analyzer@latest --version
node -e 'const {execFileSync}=require("node:child_process"); const readme=JSON.parse(execFileSync("npm",["view","codex-usage-analyzer@0.3.0","readme","--json"],{encoding:"utf8"})); const markers=["Documented upstream:","github.com/openai/codex/blob/main/codex-rs/app-server/README.md","Codex for Open Source","## Codex lookup benchmark","docs/codex-lookup-benchmark.md","npx codex-usage-analyzer@latest","codex-usage-analyzer@0.2.0"]; if(markers.some((marker)=>!readme.includes(marker))) process.exit(1); console.log(JSON.stringify({version:"0.3.0",markers:markers.length}))'
```

Actual account usage command는 실행하지 않는다.

### 5. Signature와 provenance

```bash
node -e 'const {execFileSync}=require("node:child_process"); const meta=JSON.parse(execFileSync("npm",["view","codex-usage-analyzer@0.3.0","version","dist.signatures","dist.attestations","--json"],{encoding:"utf8"})); const signatures=meta["dist.signatures"]??[]; const predicate=meta["dist.attestations"]?.provenance?.predicateType??null; if(meta.version!=="0.3.0"||signatures.length<1||predicate!=="https://slsa.dev/provenance/v1") process.exit(1); console.log(JSON.stringify({version:meta.version,signatureCount:signatures.length,provenancePredicate:predicate}))'
VERIFY_DIR="$(mktemp -d)"
cd "$VERIFY_DIR"
npm init -y
npm install codex-usage-analyzer@0.3.0
npm audit signatures
cd -
rm -rf "$VERIFY_DIR"
```

Throwaway directory path, install log, signature 원문과 credential을 Issue/Release에 기록하지 않는다.

### 6. GitHub Release와 Issue close

GitHub Release는 registry/npx/README/signature/provenance 검증 후 마지막으로 생성한다.

```bash
gh release create v0.3.0 --repo postmelee/codex-usage-analyzer --verify-tag --title "v0.3.0" --notes-file RELEASE_NOTES_FILE
gh release view v0.3.0 --repo postmelee/codex-usage-analyzer --json tagName,name,isDraft,isPrerelease,publishedAt,url
gh issue close 37 --repo postmelee/codex-usage-analyzer --comment RELEASE_RESULT_SUMMARY
```

Release note/result summary에는 다음만 기록한다.

- macOS app bundle fallback과 public docs sync
- Breaking change 없음
- npm package `0.3.0`
- Publish workflow run URL
- Structural npx smoke, signature/provenance pass
- Known app bundle path limitation

## 검증

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- Stage 1-3에서는 version source/test 외 product source를 변경하지 않는다.
- Strict preflight의 pre-tag failure는 Stage 3 expected condition이며 다른 FAIL이 하나라도 있으면 Stage를 완료하지 않는다.
- PR checks 실패 시 merge 승인을 요청하지 않는다.
- PR merge 후에도 별도 release 실행 승인 전 tag를 만들지 않는다.
- Tag push 후 strict preflight 실패 시 workflow를 dispatch하지 않는다.
- Publish workflow 실패 시 local npm publish로 우회하지 않는다.
- npm publish 후 검증 실패 시 `0.3.0`을 재게시하거나 tag를 이동하지 않는다.
- Registry/Release verification 전 Issue #37을 닫지 않는다.
- 실제 account usage, credential, raw signature와 local path를 기록하지 않는다.
- 계획 변경이 필요하면 구현계획서를 갱신하고 작업지시자 승인을 받는다.

## 커밋

- 단계 커밋은 단계 산출물과 `mydocs/working/task_m030_37_stage{N}.md`를 함께 묶는다.
- Stage 1 version source/test 7개와 보고서를 한 commit으로 묶는다.
- Stage 2/3은 검증 보고서를 각각 독립 commit으로 기록한다.
- 커밋 메시지는 `Task #37 Stage {N}: {핵심 내용 요약}` 형식을 따른다.
- Final report는 pre-merge 완료와 post-merge release PENDING을 구분한다.
- PR body에는 issue-closing keyword를 넣지 않는다.

## 단계 의존성

- Stage 1은 이 구현계획서 승인 후 진행한다.
- Stage 2는 Stage 1 version/focused test 검증, 보고서, 커밋 승인 후 진행한다.
- Stage 3은 Stage 2 full/package/README/advisory preflight 검증, 보고서, 커밋 승인 후 진행한다.
- Final report/PR은 Stage 3 승인 후 진행하고 PR CI/CodeQL pass를 merge gate로 유지한다.
- Post-merge runbook은 PR merge와 별도 release 실행 승인에 의존한다.
- Issue #37 close는 tag, publish, registry/npx/README/signature/provenance와 GitHub Release 성공에 의존한다.

## 위험과 대응

- **Irreversible publish**: Strict preflight, tag SHA와 artifact를 먼저 검증하고 workflow만 사용한다.
- **PR #44 regression**: Resolver source는 변경하지 않고 focused/full test와 package required path로 보존을 검증한다.
- **Historical version corruption**: Version allowlist만 편집하고 README/benchmark docs diff zero와 marker를 검증한다.
- **Unexpected strict failure**: Pre-tag Stage 3에서 tag failure 외 FAIL을 허용하지 않는다.
- **External partial release**: Publish 후 실패를 Issue에 기록하고 same version 재게시 없이 후속 patch를 결정한다.
- **Trusted Publisher mismatch**: Existing workflow filename, OIDC permission, repository metadata와 GitHub-hosted runner를 유지한다.
- **Credential exposure**: Long-lived token, auth output, signature 원문과 actual usage를 기록하지 않는다.
- **Registry propagation**: Bounded retry 후 불일치면 Release를 만들지 않고 중단한다.
- **Dependabot concurrency**: Origin main 변경을 되돌리지 않고 action update를 task diff에서 분리한다.

## 승인 요청 사항

- Stage 1 version source/test exact allowlist와 focused validation
- Stage 2 resolver/package/README marker와 advisory preflight expectation
- Stage 3 strict pre-tag single failure, upstream/registry/tag/Release absence와 sensitive boundary
- PR issue 자동 close 금지와 post-merge 별도 release 실행 승인 gate
- Tag→strict preflight→workflow→registry/npx/README→signature/provenance→GitHub Release→Issue close runbook
- Stage별 커밋 메시지와 external partial-release 중단 조건

승인되면 Stage 1의 `0.3.0` version surface 변경과 focused test를 진행한다.

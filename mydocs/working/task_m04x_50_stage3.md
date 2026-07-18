# Task M04x #50 Stage 3 완료보고서

GitHub Issue: [#50](https://github.com/postmelee/codex-usage-analyzer/issues/50)
구현계획서: [`task_m04x_50_impl.md`](../plans/task_m04x_50_impl.md)
Stage: 3

## 단계 목적

Stage 1 workflow policy와 Stage 2 preflight enforcement를 package/release security boundary 안에서 통합 검증한다. Full regression, advisory preflight, exact package artifact, dependency/lockfile, no-auth CLI와 전체 diff allowlist를 확인하며 실제 release와 Account Usage/Profile 호출은 수행하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/plans/task_m04x_50_impl.md` | Stage 3 allowlist 정규식에서 `mydocs/` 하위 파일을 의도대로 허용하도록 `mydocs/.*`로 오탈자 1곳을 바로잡았다. |
| `mydocs/working/task_m04x_50_stage3.md` | Stage 3 package/security 통합 검증 결과를 기록했다. |
| `mydocs/orders/20260718.md` | Task #50을 Stage 3 완료와 최종 보고 승인 대기 상태로 갱신했다. |

## 본문 변경 정도 / 본문 무손실 여부

Stage 3에서는 workflow, release tooling, test와 product source를 수정하지 않았다. 구현계획서의 source/configuration allowlist와 `mydocs/` 산출물 허용 의도는 변경하지 않고, 하위 문서 경로를 매칭하지 못하던 정규식 suffix만 `mydocs/.*`로 수정했다.

Package version `0.4.0`, exact 23-file artifact, package files allowlist 16개, runtime/development dependency 0개와 lockfile 부재를 유지했다. README/docs, release guide, Account Usage Contract와 Experimental Full Profile runtime/schema도 변경하지 않았다.

## 검증 결과

실행 명령:

```bash
npm test
CACHE_DIR="$(mktemp -d)"
npm pack --cache "$CACHE_DIR" --dry-run --json
env NPM_CONFIG_CACHE="$CACHE_DIR" node scripts/release-preflight.js
node -e 'const p=require("./package.json"); const summary={files:(p.files??[]).length,runtimeDependencies:Object.keys(p.dependencies??{}).length,developmentDependencies:Object.keys(p.devDependencies??{}).length}; if(summary.files!==16||summary.runtimeDependencies!==0||summary.developmentDependencies!==0) process.exit(1); console.log(JSON.stringify(summary))'
node bin/codex-usage-analyzer.js --help
node bin/codex-usage-analyzer.js --version
node bin/codex-usage-analyzer.js profile --help
test ! -e package-lock.json
git diff --exit-code origin/main -- package.json bin README.md docs CONTRIBUTING.md SECURITY.md mydocs/manual/npm_release_guide.md src/account-usage.js src/app-server-client.js src/cli.js src/errors.js src/experimental-profile-client.js src/experimental-profile.js src/format-account-usage.js src/format-experimental-profile.js src/index.js src/index.d.ts
if git diff --name-only origin/main...HEAD | rg -v '^(\.github/workflows/(ci|publish)\.yml|scripts/release-(preflight|workflow-policy)\.js|src/__tests__/release-workflow-policy\.test\.js|mydocs/.*)$'; then exit 1; fi
git diff --check
find . -maxdepth 1 -name '*.tgz' -print
rm -rf "$CACHE_DIR"
```

결과:

- OK: Full regression 134개가 통과했고 fail/cancelled/skipped/todo는 0이었다.
- OK: Package dry-run은 `0.4.0`, exact 23 files, 29,804 B package였고 required path는 모두 존재하며 forbidden prefix는 0개였다.
- OK: Dry-run은 repository root에 tarball을 남기지 않았다.
- OK: Advisory preflight는 exit 0, FAIL 0, expected WARN 2개로 완료됐다.
- OK: Expected WARN은 registry의 local/remote `0.4.0` 동일 상태와 post-release `v0.4.0` tag가 HEAD를 가리키지 않는 상태뿐이었다.
- OK: Preflight의 CI와 Publish workflow policy check가 모두 `[OK]`였고 sensitive pattern scan 18 files가 통과했다.
- OK: 최초 sandbox 실행의 registry 조회 차단은 policy failure와 분리했고, 읽기 전용 network 승인 후 동일 isolated cache로 재실행해 expected 결과를 확인했다.
- OK: Package files allowlist 16개, runtime dependency 0개, development dependency 0개와 lockfile 부재를 확인했다.
- OK: No-auth `--help`, `--version`, `profile --help`가 성공했고 version은 `0.4.0`이었다.
- OK: Product runtime, package metadata, README/docs와 release guide에 origin/main 대비 diff가 없다.
- OK: 전체 변경 파일은 승인된 workflow 2개, release tooling 2개, policy test 1개와 `mydocs/` 산출물로 제한됐다.
- OK: 임시 npm cache를 삭제했고 실제 Account Usage/Profile command, tag, workflow dispatch, npm publish와 GitHub Release를 실행하지 않았다.

## 잔여 위험

- GitHub-hosted runner에서의 CI와 CodeQL 검증은 PR 게시 후 확인해야 한다.
- Publish workflow의 실제 OIDC 실행은 이번 post-release maintenance task에서 의도적으로 수행하지 않는다.
- Action 또는 workflow step 구조가 이후 변경되면 current-workflow regression과 release preflight가 실패하므로 policy helper와 함께 갱신해야 한다.

## 다음 단계 영향

- 최종 보고서는 Stage 1-3 결과, 134-test regression, exact 23-file package와 expected WARN 2개를 수용 기준으로 기록한다.
- PR diff는 workflow 2개, release tooling 2개, policy test 1개와 Task #50 문서로 제한한다.
- PR 게시 후 CI/CodeQL을 확인하고 merge 전까지 Issue #50을 닫거나 release mutation을 수행하지 않는다.

## 승인 요청

- Stage 3 package/security 통합 검증 결과를 승인하면 Task #50 최종 보고와 PR 게시 단계로 진행한다.

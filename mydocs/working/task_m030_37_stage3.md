# Task M030 #37 Stage 3 완료보고서

GitHub Issue: [#37](https://github.com/postmelee/codex-usage-analyzer/issues/37)
구현계획서: [`task_m030_37_impl.md`](../plans/task_m030_37_impl.md)
Stage: 3

## 단계 목적

Task #37 branch가 최신 `origin/main`과 PR #44를 온전히 포함하는지 확인하고, `0.3.0` release 전 source·package·workflow·external state를 strict 기준으로 검증한다. Post-merge release runbook을 실행하기 전 local 수용 기준과 아직 수행하면 안 되는 release mutation의 경계를 확정한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m030_37_stage3.md` | Origin sync, product diff, external release state, strict preflight와 Trusted Publishing 보안 경계 검증 결과를 기록했다. |

제품 source, test, public documentation, script와 workflow 수정은 없다.

## 본문 변경 정도 / 본문 무손실 여부

Stage 3은 읽기 전용 검증만 수행했다. Task product diff는 Stage 1에서 승인된 version source/test 7개로 제한된다. `README.md`, `docs/`, PR #44 resolver source/test, errors, `.github/`와 `scripts/`는 `origin/main` 대비 변경이 없다.

`v0.3.0` tag, Publish Package workflow dispatch, npm publish와 GitHub Release를 생성하지 않았다. 실제 account usage command도 실행하지 않았다.

## 검증 결과

Origin과 task diff:

```bash
git fetch origin --prune
test "$(git rev-list --count HEAD..origin/main)" -eq 0
git diff --name-only origin/main...HEAD
git diff --exit-code origin/main...HEAD -- README.md docs src/codex-executable.js src/__tests__/codex-executable.test.js src/errors.js .github scripts
```

결과:

- OK: task branch의 `origin/main` 대비 behind count는 0이었다.
- OK: Product diff는 `package.json`, version runtime/type 3개와 관련 test 3개 등 계획된 7개 파일뿐이었다.
- OK: public docs, PR #44 resolver, errors, workflow와 release script의 diff는 0이었다.

External pre-release state:

```bash
npm view codex-usage-analyzer version dist-tags --json
test -z "$(git tag --list v0.3.0)"
git ls-remote --tags origin refs/tags/v0.3.0
gh release list --repo postmelee/codex-usage-analyzer --limit 100 --json tagName,isDraft,isPrerelease --jq '[.[] | select(.tagName=="v0.3.0")] | length'
gh run list --repo postmelee/codex-usage-analyzer --workflow publish.yml --event workflow_dispatch --limit 100 --json databaseId,headBranch,headSha,status,conclusion,url --jq '[.[] | select(.headBranch=="v0.3.0")] | length'
```

결과:

- OK: npm registry version과 `latest`는 모두 `0.2.0`이었다.
- OK: local/remote `v0.3.0` tag는 없었다.
- OK: GitHub Release `v0.3.0` count는 0이었다.
- OK: `v0.3.0` Publish Package workflow dispatch count는 0이었다.

관련 PR과 strict preflight:

```bash
gh pr view 40 --repo postmelee/codex-usage-analyzer --json number,state,files,url --jq '{number,state,files:[.files[].path],url}'
gh pr view 41 --repo postmelee/codex-usage-analyzer --json number,state,files,url --jq '{number,state,files:[.files[].path],url}'
if npm run release:preflight -- --release-ready > /private/tmp/task37-stage3-strict.log 2>&1; then exit 1; fi
node -e 'const fs=require("node:fs"); const text=fs.readFileSync("/private/tmp/task37-stage3-strict.log","utf8"); const fails=text.split(/\r?\n/u).filter((line)=>line.startsWith("[FAIL]")); const expected="[FAIL] release tag state: v0.3.0 tag is not present"; if(fails.length!==1||fails[0]!==expected||!text.includes("release preflight failed")) process.exit(1); console.log(JSON.stringify({expectedFailure:true,fails}))'
```

결과:

- OK: PR #40과 #41은 모두 OPEN이며 `.github/workflows/ci.yml`, `.github/workflows/publish.yml`만 변경한다.
- OK: Task #37은 `.github` diff가 없으므로 두 Dependabot PR의 action update를 섞지 않았다.
- OK: strict preflight의 FAIL은 정확히 `[FAIL] release tag state: v0.3.0 tag is not present` 1개뿐이었다.
- OK: strict preflight의 package metadata, registry, clean tree, test 55개, package 18개, CI/publish workflow, release guide와 sensitive scan은 모두 통과했다.

Trusted Publishing boundary:

```bash
rg -n 'workflow_dispatch:|contents: read|id-token: write|runs-on: ubuntu-latest|node-version: 24|run: npm publish' .github/workflows/publish.yml
if rg -n 'NPM_TOKEN|NODE_AUTH_TOKEN|_authToken|--provenance|NPM_CONFIG_PROVENANCE=false|provenance=false' .github/workflows/publish.yml package.json; then exit 1; fi
git diff --check
git status --short
rm -f /private/tmp/task37-stage3-strict.log
```

결과:

- OK: workflow dispatch, `contents: read`, `id-token: write`, Ubuntu runner, Node 24와 plain `npm publish`를 확인했다.
- OK: long-lived npm token과 provenance 비활성화 pattern은 zero-match였다.
- OK: whitespace와 clean tree 검사가 통과했고 strict preflight 임시 로그를 삭제했다.

## 잔여 위험

- PR merge 전이므로 main CI/CodeQL과 실제 merge SHA는 아직 확정되지 않았다.
- `v0.3.0` tag가 의도적으로 없어 strict preflight는 release-ready 상태가 아니다.
- npm Trusted Publisher repository/workflow 설정은 실제 tag 기반 workflow publish 성공으로 최종 검증해야 한다.
- PR #40과 #41이 같은 workflow 파일을 변경하므로 Task #37 merge 또는 release 사이에 병합되면 main workflow를 다시 검증해야 한다.
- Registry propagation, npm README, npx, signature/provenance와 GitHub Release는 post-merge release runbook에서만 확인할 수 있다.

## 다음 단계 영향

- Final report는 source/local 검증을 OK, tag/publish/registry `0.3.0`/GitHub Release를 PENDING으로 구분한다.
- PR body에는 Issue #37 자동 close keyword를 넣지 않고 post-merge release가 완료될 때까지 Issue를 열어 둔다.
- PR merge와 작업지시자의 별도 release 실행 승인 후에만 `v0.3.0` tag를 생성한다.
- Release 순서는 tag push, strict preflight pass, Trusted Publishing workflow, registry/npx/README, signature/provenance, GitHub Release, Issue close를 유지한다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 최종 보고서 작성과 PR 게시 단계로 진행한다.

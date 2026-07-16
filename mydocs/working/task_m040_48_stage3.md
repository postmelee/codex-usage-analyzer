# Task M040 #48 Stage 3 완료보고서

GitHub Issue: [#48](https://github.com/postmelee/codex-usage-analyzer/issues/48)
구현계획서: [`task_m040_48_impl.md`](../plans/task_m040_48_impl.md)
Stage: 3

## 단계 목적

Release preparation PR 게시 전 `origin/main` 통합 상태, 승인된 product diff 경계, npm registry와 GitHub의 pre-release 외부 상태, Trusted Publishing workflow의 보안 경계를 함께 검증한다. Strict release-ready preflight가 pre-merge 상태에서 예상된 tag 부재 한 건으로만 실패하는지 확인하고, PR merge 이후 별도 승인으로 실행할 tag, publish, registry, provenance와 GitHub Release 순서를 구현계획서의 runbook으로 확정한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m040_48_stage3.md` | Stage 3 통합 검증, pre-release 외부 상태, Trusted Publishing 경계와 post-merge release gate를 기록했다. |

Product source, test, public document, workflow, release tooling과 package metadata는 Stage 3에서 수정하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

Stage 3은 read-only integration verification 단계다. Product diff는 Stage 1에서 승인된 version source/test 9개 파일의 `0.3.0`에서 `0.4.0`으로의 literal 변경만 유지한다. README/docs, Account Usage/Full Profile contract와 feature runtime, CI/publish workflow, release preflight source는 `origin/main`과 동일하다.

Actual Account Usage/Profile command, tag 생성·push, Publish Package workflow dispatch, npm publish와 GitHub Release 생성은 실행하지 않았다. Registry, tag, Release, PR과 workflow run은 read-only 명령으로만 조회했다. Strict preflight는 isolated temporary npm cache를 사용했고 cache와 log는 종료 시 자동 삭제했다.

Dependabot PR #40/#41은 모두 `.github/workflows/ci.yml`과 `.github/workflows/publish.yml`을 변경하므로 #48 범위에 포함하지 않았다.

## 검증 결과

실행 명령:

```bash
git fetch origin --prune
test "$(git rev-list --count HEAD..origin/main)" -eq 0
git merge-base --is-ancestor origin/main HEAD
git diff --name-only origin/main...HEAD
git diff --exit-code origin/main...HEAD -- README.md docs .github scripts src/index.js src/account-usage.js src/experimental-profile.js src/format-account-usage.js src/format-experimental-profile.js
npm view codex-usage-analyzer version dist-tags --json
test -z "$(git tag --list v0.4.0)"
git ls-remote --tags origin refs/tags/v0.4.0
gh release list --repo postmelee/codex-usage-analyzer --limit 100 --json tagName,isDraft,isPrerelease --jq '[.[] | select(.tagName=="v0.4.0")] | length'
gh pr view 40 --repo postmelee/codex-usage-analyzer --json number,state,files,url
gh pr view 41 --repo postmelee/codex-usage-analyzer --json number,state,files,url
gh run list --repo postmelee/codex-usage-analyzer --workflow publish.yml --event workflow_dispatch --limit 100 --json headBranch --jq '[.[] | select(.headBranch=="v0.4.0")] | length'
env NPM_CONFIG_CACHE=<isolated-temporary-cache> node scripts/release-preflight.js --release-ready
rg -n 'workflow_dispatch:|contents: read|id-token: write|runs-on: ubuntu-latest|node-version: 24|CLI no-auth smoke|run: npm publish' .github/workflows/publish.yml
if rg -n 'NPM_TOKEN|NODE_AUTH_TOKEN|_authToken|--provenance|NPM_CONFIG_PROVENANCE=false|provenance=false' .github/workflows/publish.yml package.json; then exit 1; fi
git diff --check
git status --short
```

Strict preflight assertion:

```text
[FAIL] release tag state: v0.4.0 tag is not present
```

- 위 `[FAIL]` 한 건만 허용하고 다른 `[FAIL]` 또는 예상 밖 성공이면 Stage 3 실패로 처리했다.

결과:

- OK: `HEAD..origin/main` commit count는 0이고 `origin/main`은 현재 branch의 ancestor다.
- OK: Product diff는 승인된 version source/test 9개 파일로 제한됐다.
- OK: README/docs, public contract, feature runtime, CI/publish workflow와 release tooling은 `origin/main` 대비 diff가 없다.
- OK: npm registry version과 `latest`는 모두 `0.3.0`이고 local package는 `0.4.0`이다.
- OK: Local/remote `v0.4.0` tag와 GitHub Release `v0.4.0`은 없다.
- OK: `v0.4.0` head branch의 Publish Package `workflow_dispatch` run은 0개다.
- OK: Strict preflight는 예상대로 non-zero로 종료했고 유일한 FAIL은 exact `v0.4.0 tag is not present`였다.
- OK: Strict preflight에서 package metadata `0.4.0`, local `0.4.0 > registry 0.3.0`, clean tree, test 116개, package 23 files·약 29.1 kB, CI/publish workflow, release guide와 sensitive scan이 통과했다.
- OK: Publish workflow는 `contents: read`, `id-token: write`, Ubuntu runner, Node 24, no-auth smoke와 plain `npm publish`를 유지한다.
- OK: Workflow/package에는 `NPM_TOKEN`, `NODE_AUTH_TOKEN`, `_authToken`, explicit provenance disable/override pattern이 없다.
- OK: Dependabot PR #40/#41은 OPEN이며 두 PR 모두 CI/publish workflow 파일만 변경한다.
- OK: `git diff --check`가 통과했고 Stage 3 검증 전 작업 트리는 clean이었다.
- OK: Temporary cache/log를 삭제했고 repository에 tarball이나 검증 output을 남기지 않았다.
- OK: Tag, workflow dispatch, npm publish, GitHub Release와 registry mutation을 수행하지 않았다.

## 잔여 위험

- Release preparation PR의 CI/CodeQL과 merge는 아직 수행되지 않았다.
- `v0.4.0` tag 생성·push, strict preflight 성공, Trusted Publishing workflow 실행, npm registry `0.4.0`, provenance/signature와 GitHub Release는 모두 post-merge 별도 승인 gate로 남아 있다.
- Dependabot PR #40/#41 또는 다른 main/workflow 변경이 tag 전에 merge되면 merge SHA와 workflow security boundary를 다시 검증해야 한다.
- Experimental Full Profile은 unsupported private endpoint에 의존하는 opt-in 기능이라는 기존 위험을 그대로 유지한다.

## 다음 단계 영향

- 다음 단계는 최종 보고서 작성, `publish/task48` push와 release preparation PR 게시다. PR 본문에는 issue-closing keyword를 넣지 않고 source/package 수용 기준은 OK, release mutation은 PENDING으로 구분한다.
- Release preparation PR merge 직후에도 Issue #48을 close하거나 branch cleanup을 수행하지 않는다.
- PR merge와 별도 release 실행 승인 후 구현계획서의 Post-Merge Release Runbook 순서대로 main/checks, tag, strict preflight, Publish Package workflow, registry/package/README, provenance/signature, GitHub Release를 확인한다.
- npm `0.4.0`과 GitHub Release 검증까지 완료한 뒤 Issue #48 close와 `pr-merge-cleanup`을 수행한다.

## 승인 요청

- Stage 3 통합 검증과 post-merge runbook gate를 승인하면 최종 보고서 작성과 release preparation PR 게시 단계로 진행한다.

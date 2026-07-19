# Task M04x #54 Stage 3 완료 보고서

GitHub Issue: [#54](https://github.com/postmelee/codex-usage-analyzer/issues/54)
구현계획서: [`task_m04x_54_impl.md`](../plans/task_m04x_54_impl.md)
Stage: 3

## 단계 목적

Release preparation PR 전에 최신 `origin/main` 포함, exact product diff, strict
pre-tag expectation, registry/tag/Release/publish-dispatch 부재와 Trusted Publishing
supply-chain boundary를 확인한다. Post-merge external release gate는 PENDING으로
분리하고 제품 소스를 추가 수정하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m04x_54_stage3.md` | Stage 3 pre-release 통합 검증과 post-merge gate 기록 |

Product source 변경은 없다. Strict preflight 출력은 고정된 OS temporary
directory에서만 생성하고 결과 확인 후 exact target을 정리했다.

## 본문 변경 정도 / 본문 무손실 여부

제품/API/공개 문서 본문 변경은 없다. `origin/main...HEAD` product diff는 승인된
version source/test 9개뿐이다. README/docs, Account Usage/Profile/pet runtime,
root SDK export, schema, workflow와 release-preflight는 `origin/main`과 동일하다.

## 검증 결과

실행 명령:

```bash
git fetch origin --prune
test "$(git rev-list --count HEAD..origin/main)" -eq 0
git rev-list --left-right --count origin/main...HEAD
git diff --name-only origin/main...HEAD
git diff --exit-code origin/main...HEAD -- README.md docs .github scripts src/index.js src/account-usage.js src/experimental-profile.js src/experimental-pet.js src/experimental-pet-selector.js src/experimental-profile-api.js src/experimental-profile-api.d.ts src/format-account-usage.js src/format-experimental-profile.js
npm view codex-usage-analyzer version dist-tags --json
test -z "$(git tag --list v0.4.1)"
git ls-remote --exit-code --tags origin refs/tags/v0.4.1; remote_status=$?; test "$remote_status" -eq 2
gh release list --repo postmelee/codex-usage-analyzer --limit 100 --json tagName,isDraft,isPrerelease --jq '[.[] | select(.tagName=="v0.4.1")] | length'
CACHE_DIR="$(mktemp -d /private/tmp/codex-usage-analyzer-task54-stage3.XXXXXX)"
if env NPM_CONFIG_CACHE="$CACHE_DIR" node scripts/release-preflight.js --release-ready > "$CACHE_DIR/strict.log" 2>&1; then exit 1; fi
node -e 'const fs=require("node:fs"); const text=fs.readFileSync(process.argv[1],"utf8"); const fails=text.split(/\r?\n/u).filter((line)=>line.startsWith("[FAIL]")); const expected="[FAIL] release tag state: v0.4.1 tag is not present"; if(fails.length!==1||fails[0]!==expected||!text.includes("release preflight failed")) process.exit(1)' "$CACHE_DIR/strict.log"
rg -n 'workflow_dispatch:|contents: read|id-token: write|runs-on: ubuntu-latest|node-version: 24|CLI no-auth smoke|run: npm publish' .github/workflows/publish.yml
if rg -n 'NPM_TOKEN|NODE_AUTH_TOKEN|_authToken|--provenance|NPM_CONFIG_PROVENANCE=false|provenance=false' .github/workflows/publish.yml package.json; then exit 1; fi
gh run list --repo postmelee/codex-usage-analyzer --workflow publish.yml --event workflow_dispatch --limit 100 --json headBranch --jq '[.[] | select(.headBranch=="v0.4.1")] | length'
git diff --check
git status --short
```

결과:

- OK — Latest main 포함: `HEAD..origin/main` commit 0개; task branch는 main보다
  4 commits 앞섬.
- OK — Product diff는 승인된 9개 version source/test 파일과 task 문서뿐이다.
- OK — Protected runtime/docs/schema/workflow/scripts diff zero.
- OK — npm registry version/latest는 모두 `0.4.0`.
- OK — Local/remote `v0.4.1` tag 없음.
- OK — GitHub Release `v0.4.1` 조회 결과 0개.
- OK — `v0.4.1` Publish Package workflow dispatch 조회 결과 0개.
- OK — Strict preflight expected failure: tag 부재 FAIL 1개만 발생.
- OK — Strict preflight의 package metadata, registry ordering, clean tree,
  178 tests, 28-file package, CI/publish policy, release guide와 sensitive scan은
  모두 통과.
- OK — Publish workflow에 `workflow_dispatch`, `contents: read`,
  `id-token: write`, GitHub-hosted runner, Node 24, CLI no-auth smoke와 plain
  `npm publish`가 존재.
- OK — Long-lived npm token, manual provenance와 provenance-disable pattern 없음.
- OK — `git diff --check`, clean worktree와 temporary directory cleanup 통과.

## 잔여 위험

- Tag, workflow dispatch, npm publish, public npx/package/subpath, signature,
  provenance와 GitHub Release는 release preparation PR merge 후 별도 실행 승인을
  받아야 하므로 현재 PENDING이다.
- npm publish는 되돌릴 수 없다. Tag push 후 strict preflight가 전부 OK가
  아니면 workflow를 dispatch할 수 없다.
- Publish 후 검증 실패 시 같은 `0.4.1`을 재게시하거나 tag를 이동하지 않고
  Issue #54를 partial-release 상태로 유지해야 한다.
- Desktop selected state가 항상 존재하지 않을 수 있고 spritesheet animation
  계약은 이번 release 범위가 아니다.

## 다음 단계 영향

- Stage 3 승인 후 `task-final-report` 절차로 최종 보고서, 오늘할일 완료 처리,
  publish branch와 release preparation PR을 준비한다.
- PR에는 Issue #54 closing keyword를 넣지 않고 source/package 수용은 OK,
  post-merge external release는 PENDING으로 구분한다.
- PR merge 직후 cleanup하지 않는다. 작업지시자의 별도 승인 후
  tag -> strict preflight -> Trusted Publishing workflow -> registry/npx/package/
  subpath/README -> signature/provenance -> GitHub Release -> Issue close/cleanup
  순서를 따른다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 최종 보고서와 release preparation PR
  단계로 진행한다.

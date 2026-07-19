# Task M04x #54 Stage 1 완료 보고서

GitHub Issue: [#54](https://github.com/postmelee/codex-usage-analyzer/issues/54)
구현계획서: [`task_m04x_54_impl.md`](../plans/task_m04x_54_impl.md)
Stage: 1

## 단계 목적

Package, CLI/SDK declaration, stable app-server client와 experimental profile
client의 version surface를 `0.4.1`로 일치시키고 대응 test assertion만 갱신한다.
Account Usage, Full Profile v1/v2, pet reader/selector, root SDK export와 공개 문서는
변경하지 않으며 tag/publish/GitHub Release mutation을 수행하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `package.json` | Package version을 `0.4.1`로 갱신 |
| `src/cli.js` | CLI `PACKAGE_VERSION`을 `0.4.1`로 갱신 |
| `src/index.d.ts` | SDK declaration의 version literal을 `0.4.1`로 갱신 |
| `src/app-server-client.js` | Stable app-server `clientInfo.version` 갱신 |
| `src/experimental-profile-client.js` | Experimental client/originator version 갱신 |
| `src/__tests__/cli.test.js` | CLI와 package bin version assertion 2개 갱신 |
| `src/__tests__/index.test.js` | Root SDK version assertion 갱신 |
| `src/__tests__/app-server-client.test.js` | Stable clientInfo assertion 갱신 |
| `src/__tests__/experimental-profile-client.test.js` | Experimental clientInfo/originator assertion 2개 갱신 |
| `mydocs/working/task_m04x_54_stage1.md` | Stage 1 변경·검증·잔여 위험 기록 |

Product diff는 9개 파일, 11 insertions와 11 deletions다. 신규 dependency와
lockfile은 없다.

## 본문 변경 정도 / 본문 무손실 여부

제품/API 동작은 변경하지 않았다. 승인된 9개 source/test 파일의 `0.4.0` version
literal만 `0.4.1`로 교체했다. `src/index.js`, Account Usage/Profile/pet runtime,
세 schema, README/docs, workflow와 release-preflight는 worktree diff zero다.

## 검증 결과

실행 명령:

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
git ls-remote --exit-code --tags origin refs/tags/v0.4.1; remote_status=$?; test "$remote_status" -eq 2
npm view codex-usage-analyzer version dist-tags --json
gh release list --repo postmelee/codex-usage-analyzer --limit 100 --json tagName,isDraft,isPrerelease --jq '[.[] | select(.tagName=="v0.4.1")] | length'
git diff --name-only -- package.json src
git diff --exit-code -- README.md docs .github scripts src/index.js src/account-usage.js src/experimental-profile.js src/experimental-pet.js src/experimental-pet-selector.js src/experimental-profile-api.js src/experimental-profile-api.d.ts src/format-account-usage.js src/format-experimental-profile.js
git diff --check
```

결과:

- OK — Focused version/client 검증: 5 tests, 5 pass, 0 fail.
- OK — CLI, package와 root SDK version: 모두 `0.4.1`.
- OK — Exact product allowlist: 9개 파일만 변경, 11개 literal 교체.
- OK — 승인된 9개 파일에 범위 밖 `0.4.0` literal 없음.
- OK — `package-lock.json` 없음, dependency 변경 없음.
- OK — README/docs, contract/feature runtime, workflow/scripts diff zero.
- OK — Local/remote `v0.4.1` tag 없음.
- OK — npm registry version/latest는 `0.4.0` 유지.
- OK — GitHub Release `v0.4.1` 조회 결과 0개.
- OK — `git diff --check` 경고 없음.

## 잔여 위험

- 전체 178-test 이상 regression과 28-file package artifact audit는 Stage 2에서
  수행해야 한다.
- Advisory preflight의 tag 부재 단일 WARN과 published `0.4.0` 23-file before
  baseline은 Stage 2에서 확인해야 한다.
- PR merge와 별도 승인 전에는 tag, workflow dispatch, npm publish와 GitHub
  Release를 만들 수 없다.

## 다음 단계 영향

- Stage 2는 source를 추가 수정하지 않고 전체 regression, isolated-cache package
  audit, CLI no-auth smoke, README marker와 advisory preflight를 수행한다.
- Package version과 모든 runtime/client assertion의 Stage 2 기준은 `0.4.1`이다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2로 진행한다.

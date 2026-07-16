# Task M040 #48 Stage 1 완료보고서

GitHub Issue: [#48](https://github.com/postmelee/codex-usage-analyzer/issues/48)
구현계획서: [`task_m040_48_impl.md`](../plans/task_m040_48_impl.md)
Stage: 1

## 단계 목적

M040의 backward-compatible experimental profile 기능을 minor release `0.4.0`으로 준비하기 위해 package, CLI/SDK declaration, stable/experimental app-server client와 관련 test assertion의 version surface를 일치시킨다. Feature runtime, public contract/schema, README/docs, workflow와 release tooling은 변경하지 않고 release mutation도 수행하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `package.json` | 57줄. Package version을 `0.3.0`에서 `0.4.0`으로 갱신했다. |
| `src/cli.js` | 112줄. CLI와 SDK가 공유하는 `PACKAGE_VERSION`을 `0.4.0`으로 갱신했다. |
| `src/index.d.ts` | 76줄. TypeScript package version literal을 `0.4.0`으로 갱신했다. |
| `src/app-server-client.js` | 246줄. Stable app-server initialize의 `clientInfo.version`을 `0.4.0`으로 갱신했다. |
| `src/experimental-profile-client.js` | 544줄. Experimental client initialize와 User-Agent에 사용하는 `CLIENT_VERSION`을 `0.4.0`으로 갱신했다. |
| `src/__tests__/cli.test.js` | 294줄. Injected CLI와 package bin version assertion 두 개를 `0.4.0`으로 갱신했다. |
| `src/__tests__/index.test.js` | 63줄. Public SDK version assertion을 `0.4.0`으로 갱신했다. |
| `src/__tests__/app-server-client.test.js` | 285줄. Stable initialize metadata version assertion을 `0.4.0`으로 갱신했다. |
| `src/__tests__/experimental-profile-client.test.js` | 604줄. Experimental initialize metadata와 fixed User-Agent assertion을 `0.4.0`으로 갱신했다. |

## 본문 변경 정도 / 본문 무손실 여부

Product diff는 구현계획서가 승인한 9개 파일의 version literal 11곳으로 제한되며 11 insertions, 11 deletions다. `npm version --no-git-tag-version 0.4.0`은 `package.json`만 변경했고 lockfile을 생성하지 않았다.

`src/index.js`, Account Usage/Full Profile normalizer와 formatter, 두 contract schema, README/docs, CI/publish workflow와 release preflight source는 수정하지 않았다. Public SDK export key set, Account Usage Contract v1, Experimental Full Profile Envelope v1과 stable/default·explicit profile 동작 의미는 변경하지 않았다.

Global replacement를 사용하지 않았으므로 benchmark, 과거 release와 task 문서의 historical `0.2.0`/`0.3.0` evidence는 보존됐다.

## 검증 결과

실행 명령:

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
gh release list --repo postmelee/codex-usage-analyzer --limit 100 --json tagName,isDraft,isPrerelease
```

결과:

- OK: npm registry version과 `latest`는 모두 `0.3.0`이었다.
- OK: Local/remote `v0.4.0` tag와 GitHub Release `v0.4.0`은 없었다.
- OK: Package metadata와 CLI `--version`은 모두 `0.4.0`을 반환했다.
- OK: Focused test 65개가 통과했고 fail/cancelled/skipped/todo는 0이었다.
- OK: 승인된 9개 파일에 `0.4.0` literal 11개가 존재하고 이전 `0.3.0` literal은 없었다.
- OK: Diff는 승인된 9개 파일의 11 insertions/11 deletions로 제한됐다.
- OK: Lockfile이 생성되지 않았고 local `v0.4.0` tag도 생성되지 않았다.
- OK: Public docs, contracts, feature runtime, workflow와 release tooling diff가 없었다.
- OK: `git diff --check`가 whitespace error 없이 통과했다.
- OK: Tag, workflow dispatch, npm publish, GitHub Release와 registry mutation을 수행하지 않았다.

## 잔여 위험

- 전체 116-test regression과 23-file npm artifact는 Stage 2에서 검증해야 한다.
- Advisory preflight의 local `0.4.0 > registry 0.3.0`, clean tree, tag-only warning과 package/security gate는 Stage 2까지 남아 있다.
- Strict release-ready preflight, origin sync, Dependabot same-file 상태와 post-merge runbook 검증은 Stage 3 범위다.
- npm `0.4.0`은 아직 게시되지 않았고 `v0.4.0` tag, workflow run과 GitHub Release도 없다.

## 다음 단계 영향

- Stage 2는 product source를 추가 수정하지 않고 전체 regression, package exact 23 files, experimental runtime/doc/schema와 README marker, forbidden artifact, dependency 0, no-auth CLI와 advisory preflight를 검증한다.
- Stage 2 검증은 user-level npm cache 상태에 의존하지 않도록 isolated temporary cache를 사용하고 actual temporary path는 보고서에 기록하지 않는다.
- Tag/publish/GitHub Release는 계속 금지되며 post-merge 별도 release 승인 전까지 생성하지 않는다.

## 승인 요청

- Stage 1 version surface 변경과 focused 검증 결과를 승인하면 Stage 2 M040 package release readiness 검증으로 진행한다.

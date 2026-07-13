# Task M030 #37 Stage 1 완료보고서

GitHub Issue: [#37](https://github.com/postmelee/codex-usage-analyzer/issues/37)
구현계획서: [`task_m030_37_impl.md`](../plans/task_m030_37_impl.md)
Stage: 1

## 단계 목적

PR #44의 macOS app bundle runtime fallback을 포함하는 다음 minor release를 위해 package, CLI/SDK, TypeScript declaration, app-server client metadata와 관련 test의 version surface를 `0.3.0`으로 일치시킨다. Resolver source와 public documentation, historical benchmark, workflow에는 손대지 않고 release 전 버전 기준만 확정한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `package.json` | npm package version을 `0.2.0`에서 `0.3.0`으로 갱신했다. |
| `src/cli.js` | CLI와 SDK가 노출하는 `PACKAGE_VERSION`을 `0.3.0`으로 갱신했다. |
| `src/index.d.ts` | TypeScript `PACKAGE_VERSION` literal type을 `0.3.0`으로 갱신했다. |
| `src/app-server-client.js` | app-server initialize의 `clientInfo.version`을 `0.3.0`으로 갱신했다. |
| `src/__tests__/cli.test.js` | in-process CLI와 package bin version assertion을 `0.3.0`으로 갱신했다. |
| `src/__tests__/index.test.js` | SDK package version assertion을 `0.3.0`으로 갱신했다. |
| `src/__tests__/app-server-client.test.js` | app-server initialize metadata assertion을 `0.3.0`으로 갱신했다. |

## 본문 변경 정도 / 본문 무손실 여부

Stage 1은 계획된 version source/test 7개에서 리터럴 8줄만 교체했다. Account Usage Contract, CLI command와 output shape, runtime resolver 동작, error mapping, dependency와 package allowlist는 변경하지 않았다.

`README.md`, `docs/`, `.github/`, `src/codex-executable.js`, `src/__tests__/codex-executable.test.js`, `src/errors.js`는 `origin/main`과 동일하다. README와 benchmark document의 historical `codex-usage-analyzer@0.2.0` 측정값도 보존했다.

## 검증 결과

변경 전 read-only snapshot:

```bash
npm view codex-usage-analyzer version dist-tags --json
git ls-remote --tags origin refs/tags/v0.3.0
gh release list --repo postmelee/codex-usage-analyzer --limit 100 --json tagName,isDraft,isPrerelease --jq '[.[] | select(.tagName=="v0.3.0")] | length'
```

결과:

- OK: npm registry version과 `latest`는 모두 `0.2.0`이었다.
- OK: origin의 `v0.3.0` tag 조회 결과는 empty output이었다.
- OK: GitHub Release `v0.3.0` count는 `0`이었다.

Stage 검증 명령:

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

결과:

- OK: package metadata와 CLI `--version`이 각각 `0.3.0`을 출력했다.
- OK: focused test 30개가 모두 통과했고 fail/cancelled/skipped/todo는 0이었다.
- OK: version allowlist 7개 파일에서 `0.3.0`을 확인했고 `0.2.0` 잔존은 없었다.
- OK: README와 benchmark document에서 historical `0.2.0` marker 3개를 확인했다.
- OK: 보호 경로는 `origin/main`과 diff zero였다.
- OK: `package-lock.json`과 local `v0.3.0` tag는 생성되지 않았다.
- OK: `git diff --check`는 whitespace error 없이 통과했다.

## 잔여 위험

- 전체 55개 이상 regression과 실제 package artifact의 version/file allowlist는 Stage 2에서 검증해야 한다.
- npm registry와 npm README는 아직 `0.2.0`이며 PR merge 후 Trusted Publishing workflow가 성공해야 `0.3.0`으로 전환된다.
- `v0.3.0` tag, workflow dispatch와 GitHub Release는 아직 생성하지 않았다.

## 다음 단계 영향

- Stage 2는 resolver를 포함한 전체 test suite를 실행하고 package dry-run이 `0.3.0`, 18개 이상 파일과 required/forbidden path 조건을 충족하는지 확인한다.
- Source README marker와 npm `0.2.0` README의 sync 전 baseline을 비교한다.
- Advisory preflight에서 `v0.3.0` tag 부재가 유일한 WARN이고 FAIL은 없는지 확인한다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2로 진행한다.

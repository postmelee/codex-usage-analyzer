# Task M040 #48 Stage 2 완료보고서

GitHub Issue: [#48](https://github.com/postmelee/codex-usage-analyzer/issues/48)
구현계획서: [`task_m040_48_impl.md`](../plans/task_m040_48_impl.md)
Stage: 2

## 단계 목적

Stage 1에서 `0.4.0`으로 일치시킨 source를 추가 수정하지 않고, default Account Usage와 experimental profile 전체 regression, npm artifact의 M040 runtime/doc/schema 포함·forbidden artifact 제외, dependency 0, no-auth CLI, source/published README 차이와 advisory preflight를 검증한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m040_48_stage2.md` | Stage 2 자동/package/security 검증과 잔여 pre-release gate를 기록했다. |

Product source, test, public document, workflow, release tooling과 package metadata는 수정하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

Stage 2는 read-only verification 단계로 repository product diff가 없다. Stage 1의 exact 9-file version diff를 그대로 유지하며 README/docs, Account Usage/Full Profile runtime·schema, CI/publish workflow와 release preflight source는 `HEAD` 대비 변경되지 않았다.

Actual Account Usage/Profile command는 실행하지 않았다. `--help`, `--version`, `profile --help`만 실행했으며 profile help는 app-server/network/account access 없이 종료했다. Package/preflight는 isolated temporary npm cache를 사용했고 검증 후 자동 삭제했다. Tarball과 verification output은 repository에 남기지 않았다.

## 검증 결과

실행 명령:

```bash
npm test
node bin/codex-usage-analyzer.js --help
node bin/codex-usage-analyzer.js --version
node bin/codex-usage-analyzer.js profile --help
npm pack --cache <isolated-temporary-cache> --dry-run --json
node scripts/release-preflight.js
git diff --exit-code origin/main...HEAD -- README.md docs .github scripts src/index.js src/account-usage.js src/experimental-profile.js src/format-account-usage.js src/format-experimental-profile.js
git diff --check
git status --short
```

추가 assertion:

- Package version `0.4.0`, exact 23 files와 required stable/experimental runtime/doc/schema path
- `.github`, `mydocs`, scripts, tests와 extracted/fixture/auth/raw-response artifact 0개
- `package.json` files allowlist 16개, runtime/development dependency 0개
- Source README marker 7개와 npm `0.3.0` README의 M040 marker 3개 부재
- Advisory preflight FAIL 0, WARN 1과 exact `v0.4.0 tag is not present`

결과:

- OK: 전체 regression 116개가 통과했고 fail/cancelled/skipped/todo는 0이었다.
- OK: CLI help, version `0.4.0`, experimental `profile --help`가 account access 없이 통과했다.
- OK: Package dry-run은 `0.4.0`, exact 23 files, 약 29.1 kB였고 required path가 모두 존재했다.
- OK: Package forbidden prefix/fragment는 0개였고 tarball을 남기지 않았다.
- OK: Package files allowlist는 16개, runtime/development dependency는 각각 0개였다.
- OK: Source README의 official upstream, `account/usage/read`, Experimental profile, `profile --json`, unsupported endpoint와 Full Profile doc/schema marker 7개가 존재했다.
- OK: Published npm `0.3.0` README에는 Experimental profile, `profile --json`, Full Profile contract marker 3개가 없어 `0.4.0` release 필요성을 재확인했다.
- OK: Advisory preflight의 package metadata, registry ordering, clean tree, test, package, CI/publish workflow, release guide와 sensitive scan이 통과했다.
- OK: Preflight FAIL은 0개였고 유일한 WARN은 예상된 `v0.4.0` tag 부재였다.
- OK: Stage 2 시작·종료 시 product source diff가 없고 `git diff --check`와 clean working tree를 확인했다.
- OK: Isolated temporary cache와 output은 삭제됐다.
- OK: Tag, workflow dispatch, npm publish, GitHub Release와 registry mutation을 수행하지 않았다.

## 잔여 위험

- Strict release-ready preflight는 pre-merge 상태에서 tag 부재 하나만 FAIL인지 Stage 3에서 확인해야 한다.
- `origin/main` 최신 포함, exact version-only product diff와 Dependabot PR #40/#41의 same-file 상태는 Stage 3까지 남아 있다.
- Publish workflow의 OIDC/sensitive boundary와 `v0.4.0` workflow dispatch 부재를 remote state와 함께 재확인해야 한다.
- npm `0.4.0`, tag, publish workflow run과 GitHub Release는 아직 존재하지 않는다.

## 다음 단계 영향

- Stage 3은 source를 추가 수정하지 않고 origin sync, registry/tag/Release/dispatch 부재, strict pre-tag 단일 failure와 post-merge runbook을 검증한다.
- Stage 3 완료와 최종 보고/PR merge 후에도 tag·publish·GitHub Release는 별도 작업지시자 승인 전 실행하지 않는다.
- PR #40/#41이 먼저 merge되면 최신 workflow를 보존하되 action update를 #48 product diff에 포함하지 않는다.

## 승인 요청

- Stage 2 full regression, package/README/security와 advisory preflight 결과를 승인하면 Stage 3 pre-release 통합 검증과 post-merge runbook 확정으로 진행한다.

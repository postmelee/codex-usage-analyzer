# Task M010 #7 Stage 2 보고서

GitHub Issue: [#7](https://github.com/postmelee/codex-usage-analyzer/issues/7)
구현계획서: [`task_m010_7_impl.md`](../plans/task_m010_7_impl.md)
Stage: 2

## 단계 목적

Stage 2는 Stage 1에서 확인한 release gap을 최소 수정으로 보강하는 단계다. npm package contents를 runtime surface로 좁히고, README에 release checklist와 repository-only smoke 범위를 명시했으며, 기존 CI에 `npm pack --dry-run` 검증을 추가했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `package.json` | GitHub metadata 추가, `files`를 runtime allowlist로 축소 |
| `README.md` | published CLI entry point, repository-only profile smoke, package contents, release checklist, status 문구 보강 |
| `.github/workflows/ci.yml` | 기존 CI에 `npm pack --dry-run` 단계 추가 |
| `mydocs/working/task_m010_7_stage2.md` | Stage 2 변경 사항과 검증 결과 기록 |
| `mydocs/orders/20260629.md` | #7 비고를 Stage 2 완료 및 Stage 3 승인 대기로 갱신 |

## 본문 변경 정도 / 본문 무손실 여부

README는 기존 CLI, profile smoke, SDK, tests, non-goals 내용을 유지하면서 release 관련 설명을 추가했다. `package.json`은 런타임 package surface와 npm metadata만 수정했고, version, bin, exports, type declarations, scripts, engines는 유지했다. CI는 기존 test와 CLI smoke를 유지하고 pack dry-run만 추가했다. `UsageSnapshot v2` schema와 analyzer 동작은 변경하지 않았다.

## 변경 내용

### package metadata와 contents

- `homepage`, `repository`, `bugs` metadata를 GitHub repository 기준으로 추가했다.
- `files`를 `bin`, runtime `src` files, parser modules, snapshot validators, sample snapshot fixture, README 중심으로 좁혔다.
- `src/__tests__`, parser fixtures, profile baseline fixtures, `scripts/profile-smoke.js`, `mydocs`는 npm package contents에서 제외된다.
- `license`는 작업지시자 명시 지시 없이 임의 추가하지 않았다.

### README

- CLI 섹션에서 `npx codex-usage-analyzer@latest analyze --json`이 published CLI entry point임을 명시했다.
- Profile Parity Smoke를 repository-only QA helper로 명시했고, npm package binary로 publish하지 않는다고 설명했다.
- Package Contents 섹션을 추가해 published package에 포함/제외되는 범위를 설명했다.
- Release Checklist 섹션을 추가해 publish 전 `npm test`, `npm pack --dry-run`, local CLI smoke, GitHub source `npx` smoke와 publish 후 npm latest `npx` smoke를 기록했다.
- raw production snapshot output을 release notes, PR body, issue comments에 붙이지 말라는 privacy guardrail을 추가했다.
- Status 문구를 npm release checklist 기반 상태로 갱신했다.

### CI

- 기존 `.github/workflows/ci.yml`에 `Package dry run` 단계를 추가했다.
- 신규 release workflow는 만들지 않았다.

## 검증 결과

실행 명령:

```bash
npm test
npm_config_cache=<writable-temp-cache> npm pack --dry-run --json
node bin/codex-usage-analyzer.js analyze --json
git diff --check
```

결과:

- OK: `npm test` 통과. 47 tests, 47 pass, 0 fail.
- OK: `npm pack --dry-run --json` 통과. total files 18, package size 19,391 bytes, unpacked size 83,965 bytes.
- OK: package contents에서 `src/__tests__`, parser fixtures, profile baseline fixtures, `scripts/profile-smoke.js`가 제외됨을 확인했다.
- OK: package contents에 `README.md`, `package.json`, `bin/codex-usage-analyzer.js`, runtime `src` files, `src/index.d.ts`, `src/snapshot/v2-types.d.ts`가 포함됨을 확인했다.
- OK: CLI smoke 통과. raw snapshot은 출력하지 않고 `validateUsageSnapshotV2` 기준 schema validation만 확인했다.
- OK: `git diff --check` 통과.

## 잔여 위험

- npm 기본 cache ownership 문제는 아직 남아 있다. Stage 4 publish 전에는 기본 cache를 정리하거나 writable cache를 지정해야 한다.
- `codex-usage-analyzer@0.1.0`은 Stage 1 기준 registry 미등록이었지만, Stage 4 publish 직전에 다시 확인해야 한다.
- GitHub source `npx` smoke는 아직 수행하지 않았다. 이는 Stage 3 범위다.
- 실제 npm publish와 npm latest `npx` smoke는 아직 수행하지 않았다. 이는 Stage 4 범위이며 publish 직전 별도 명시 승인이 필요하다.
- `license` metadata는 추가하지 않았다. 필요하면 별도 지시 또는 별도 task로 다룬다.

## 다음 단계 영향

- Stage 3에서는 GitHub source install 기반 `npx --yes github:postmelee/codex-usage-analyzer analyze --json` smoke를 수행한다.
- Stage 3에서 필요하면 local package tarball 실행 smoke를 추가해 `files` allowlist가 실제 install path에서도 충분한지 확인한다.
- Stage 4에서는 registry/version/auth 상태를 다시 확인한 뒤 publish 직전 명시 승인을 받아야 한다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3으로 진행한다.
- Stage 3에서 GitHub source `npx` smoke와 필요한 경우 local tarball install smoke를 수행하는 것을 승인 요청한다.
- Stage 3에서도 raw analyzer JSON, local path, credential, account identifier를 보고서에 기록하지 않는다.

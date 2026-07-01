# Task M010 #7 Stage 1 보고서

GitHub Issue: [#7](https://github.com/postmelee/codex-usage-analyzer/issues/7)
구현계획서: [`task_m010_7_impl.md`](../plans/task_m010_7_impl.md)
Stage: 1

## 단계 목적

Stage 1은 npm 배포 전에 현재 package contents, package metadata, README, CI, registry 상태를 점검하고 Stage 2에서 수정할 release gap을 확정하는 단계다. 소스 동작은 변경하지 않고, `npm pack --dry-run`, CLI smoke, npm registry 조회 결과를 근거로 다음 단계 수정 범위를 정리했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m010_7_stage1.md` | package/release gap, 검증 결과, Stage 2 승인 요청 사항 작성 |
| `mydocs/orders/20260629.md` | #7 비고를 Stage 1 완료 및 Stage 2 승인 대기로 갱신 |

## 본문 변경 정도 / 본문 무손실 여부

코드, README, package metadata, CI 본문은 이 Stage에서 수정하지 않았다. 기존 동작과 `UsageSnapshot v2` 계약은 변경하지 않았고, 신규 단계 보고서와 오늘할일 상태만 추가/갱신했다.

## 점검 결과

### package metadata

- `package.json`은 `name`, `version`, `description`, `type`, `types`, `bin`, `exports`, `files`, `scripts`, `engines`를 갖추고 있다.
- `bin.codex-usage-analyzer`는 `./bin/codex-usage-analyzer.js`를 가리키고, 해당 파일은 `../src/cli.js`의 `runCli`를 실행한다.
- `exports["."]`는 `./src/index.js`와 `./src/index.d.ts`를 노출한다.
- npm publish에 필수는 아니지만 `repository`, `bugs`, `homepage` metadata는 없다. Stage 2에서 GitHub repo 기준으로 추가하는 것이 release readiness에 유리하다.
- `license`는 없다. 라이선스는 정책/법무 성격이 있으므로 이번 Stage 2에서는 작업지시자 명시 지시 없이 임의 추가하지 않는 것이 안전하다.

### package contents

- `npm pack --dry-run`은 isolated writable npm cache에서 통과했다.
- tarball summary: package size 33.9 kB, unpacked size 161.3 kB, total files 43.
- 포함 확인: `README.md`, `package.json`, `bin/codex-usage-analyzer.js`, runtime `src` files.
- gap: 현재 `files: ["bin", "src", "README.md"]` 때문에 `src/__tests__`와 fixture 파일도 package에 포함된다. 테스트/fixture는 published runtime surface가 아니므로 Stage 2에서 `files`를 runtime allowlist로 좁히는 것이 좋다.
- gap: `scripts/profile-smoke.js`는 package에 포함되지 않는다. 이 helper는 현재 README의 repo-local QA 명령에 가깝고 npm binary로 노출되지 않으므로, Stage 2에서는 package에 포함하지 않고 README에 repo-only 도구임을 명시하는 방향이 적절하다.

### README

- README 첫 CLI 예시는 `npx codex-usage-analyzer@latest analyze --json`이다.
- README Status는 npm publishing, release automation, broader profile parity work를 follow-up으로 남겨둔 상태다.
- gap: Stage 2에서 npm/npx 사용법은 유지하되, release checklist와 publish 전후 smoke 절차를 추가하고 Status 문구를 현재 진행 상태와 맞춰야 한다.
- gap: Profile Parity Smoke 섹션의 `node scripts/profile-smoke.js ...` 명령은 npm package 사용자용이 아니라 repository checkout용이다. Stage 2에서 이 범위를 분명히 해야 한다.

### CI

- 현재 `.github/workflows/ci.yml`은 `npm test`와 `node bin/codex-usage-analyzer.js analyze --json`만 수행한다.
- gap: release readiness에는 `npm pack --dry-run` 자동 검증이 빠져 있다.
- Stage 2에서는 신규 release workflow보다 기존 CI에 `npm pack --dry-run`을 추가하는 편이 현재 범위에 맞는 최소 보강이다.

### npm registry

- `npm view codex-usage-analyzer versions --json` 결과 registry에서 package를 찾지 못했다.
- 이는 `codex-usage-analyzer@0.1.0` 최초 publish 가능성을 시사하지만, registry 상태는 외부 상태이므로 Stage 4 publish 직전에 다시 확인해야 한다.

### local npm cache

- 기본 npm cache로 `npm pack --dry-run`을 실행하면 local cache ownership 문제로 실패했다.
- isolated writable npm cache를 지정하면 `npm pack --dry-run`과 registry 조회가 정상 수행됐다.
- Stage 4에서 `npm publish`를 실행할 때도 기본 cache 상태를 고치거나 writable npm cache를 지정해야 한다.

## 검증 결과

실행 명령:

```bash
npm test
npm_config_cache=<writable-temp-cache> npm pack --dry-run
node bin/codex-usage-analyzer.js analyze --json
npm_config_cache=<writable-temp-cache> npm view codex-usage-analyzer versions --json
git diff --check
```

결과:

- OK: `npm test` 통과. 47 tests, 47 pass, 0 fail.
- OK: `npm pack --dry-run` 통과. total files 43, package size 33.9 kB, unpacked size 161.3 kB.
- OK: CLI smoke 통과. raw snapshot은 출력하지 않고 `validateUsageSnapshotV2` 기준 schema validation만 확인했다.
- OK/외부 상태: npm registry 조회는 E404로 package 미등록 상태를 확인했다. 네트워크 조회 자체는 수행됐고, package 결함은 아니다.
- OK: `git diff --check` 통과.

## 잔여 위험

- npm 기본 cache ownership 문제가 남아 있어 Stage 4 publish 전 cache 정리 또는 writable cache 지정이 필요하다.
- npm registry는 Stage 4 전까지 외부에서 같은 package name/version이 publish될 수 있으므로 publish 직전 재조회가 필요하다.
- `license` metadata는 임의로 추가하지 않았다. 필요하면 작업지시자가 라이선스 값을 별도로 지정해야 한다.
- 현재 package contents는 테스트와 fixtures를 포함하므로 Stage 2에서 `files` allowlist를 좁히지 않으면 npm package가 불필요한 개발 자산을 포함한다.

## 다음 단계 영향

- Stage 2 수정 범위는 README release checklist 보강, `package.json` package contents/runtime metadata 보강, CI `npm pack --dry-run` 추가로 제한한다.
- `scripts/profile-smoke.js`는 package에 포함하지 않고 repo-only QA helper로 유지하는 방향을 Stage 2에 반영한다.
- `version`은 registry 미등록 상태를 근거로 `0.1.0` 유지가 가능해 보이지만, Stage 4 publish 직전에 다시 확인한다.
- 신규 `.github/workflows/release-check.yml`은 만들지 않고, 기존 CI에 최소 검증을 추가하는 방향이 적절하다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2로 진행한다.
- Stage 2에서 `package.json`의 `files`를 runtime allowlist로 좁히고 `repository`/`bugs`/`homepage` metadata를 추가하는 것을 승인 요청한다.
- Stage 2에서 README에 release checklist, publish 전후 smoke 절차, profile smoke helper의 repo-only 범위를 명시하는 것을 승인 요청한다.
- Stage 2에서 기존 CI에 `npm pack --dry-run`을 추가하고, 신규 release workflow는 만들지 않는 것을 승인 요청한다.
- Stage 2에서 `scripts/profile-smoke.js`는 npm package에 포함하지 않고 repo-only QA helper로 유지하는 것을 승인 요청한다.

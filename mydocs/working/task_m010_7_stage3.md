# Task M010 #7 Stage 3 보고서

GitHub Issue: [#7](https://github.com/postmelee/codex-usage-analyzer/issues/7)
구현계획서: [`task_m010_7_impl.md`](../plans/task_m010_7_impl.md)
Stage: 3

## 단계 목적

Stage 3은 publish 전에 외부 설치 경로에서 CLI가 실행 가능한지 확인하는 단계다. GitHub source install 기반 `npx` smoke를 수행했고, Stage 2에서 좁힌 npm package `files` allowlist가 실제 tarball 설치에서도 충분한지 local tarball smoke로 추가 확인했다. raw analyzer JSON은 기록하지 않고 `UsageSnapshot v2` schema validation 결과만 남겼다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m010_7_stage3.md` | Stage 3 npx smoke와 local tarball smoke 검증 결과 기록 |
| `mydocs/orders/20260629.md` | #7 비고를 Stage 3 완료 및 Stage 4 승인 대기로 갱신 |

## 본문 변경 정도 / 본문 무손실 여부

코드, README, package metadata, CI 본문은 이 Stage에서 수정하지 않았다. 기존 동작과 `UsageSnapshot v2` 계약은 변경하지 않았고, 신규 단계 보고서와 오늘할일 상태만 추가/갱신했다.

## 검증 결과

실행 명령:

```bash
npm test
npm_config_cache=<writable-temp-cache> npm pack --dry-run --json
npm_config_cache=<writable-temp-cache> npm pack --pack-destination <tmp-dir> --json
npm exec --yes --package <tmp-tarball> -- codex-usage-analyzer analyze --json
npx --yes github:postmelee/codex-usage-analyzer analyze --json
git diff --check
```

결과:

- OK: `npm test` 통과. 47 tests, 47 pass, 0 fail.
- OK: `npm pack --dry-run --json` 통과. total files 18, package size 19,391 bytes, unpacked size 83,965 bytes.
- OK: 실제 tarball을 임시 디렉터리에 생성했고 dry-run과 같은 package contents를 확인했다.
- OK: local tarball smoke 통과. `npm exec --package <tmp-tarball>`로 설치한 CLI가 valid `UsageSnapshot v2` JSON을 출력했고, raw snapshot은 기록하지 않았다.
- OK: GitHub source `npx` smoke 통과. `npx --yes github:postmelee/codex-usage-analyzer analyze --json` 출력이 schema validation을 통과했고, raw snapshot은 기록하지 않았다.
- OK: `git diff --check` 통과.

## 검증 한계

- GitHub source `npx` smoke는 `github:postmelee/codex-usage-analyzer` ref를 지정하지 않았으므로 현재 원격 기본 브랜치 기준으로 실행된다. Stage 2의 local branch package contents는 local tarball smoke로 별도 검증했다.
- smoke 명령은 기본 Codex home을 읽는 실제 analyzer 경로를 실행하므로, 결과 문서에는 raw output, local path, account identifier, credential을 기록하지 않았다.
- 실제 npm latest 설치 경로는 아직 검증하지 않았다. 이는 Stage 4 publish 이후 검증 범위다.

## 잔여 위험

- npm 기본 cache ownership 문제는 아직 남아 있다. Stage 4 publish 전에는 기본 cache를 정리하거나 writable cache를 지정해야 한다.
- `codex-usage-analyzer@0.1.0` registry 상태는 Stage 1 기준 미등록이었지만, Stage 4 publish 직전에 다시 확인해야 한다.
- 실제 `npm publish`는 아직 수행하지 않았다. Stage 4 진입 승인 후에도 publish 직전 별도 명시 승인이 필요하다.
- `license` metadata는 추가하지 않았다. 필요하면 별도 지시 또는 별도 task로 다룬다.

## 다음 단계 영향

- Stage 4에서는 npm auth 상태, registry version 상태, package dry-run을 다시 확인한다.
- `npm publish`는 Stage 4 승인과 별도로 publish 직전 작업지시자 명시 승인을 받은 뒤 실행한다.
- publish가 성공하면 `npx --yes codex-usage-analyzer@latest analyze --json` smoke를 수행하고, raw snapshot 없이 schema validation 결과만 기록한다.
- publish가 인증, 권한, version 중복, registry 상태로 막히면 blocker와 재시도 조건을 최종 보고서에 기록한다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 Stage 4로 진행한다.
- Stage 4에서 npm auth/registry 상태를 확인하고, publish 직전 별도 명시 승인을 요청하는 절차를 승인 요청한다.
- Stage 4에서도 raw analyzer JSON, local path, credential, account identifier를 보고서에 기록하지 않는다.

# Task M010 #7 Stage 4 보고서

GitHub Issue: [#7](https://github.com/postmelee/codex-usage-analyzer/issues/7)
구현계획서: [`task_m010_7_impl.md`](../plans/task_m010_7_impl.md)
Stage: 4

## 단계 목적

Stage 4는 npm publish, postpublish npm latest `npx` smoke, 최종 보고를 수행하는 단계다. 실제 publish 전 보안 전수 점검을 추가로 수행했고, registry에서 `codex-usage-analyzer@0.1.0` publish를 확인한 뒤 `npx --yes codex-usage-analyzer@latest analyze --json` smoke를 실행했다. raw analyzer JSON, local path, npm account identifier, credential은 보고서에 기록하지 않았다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `package.json` | npm publish dry-run 경고를 해소하기 위해 `bin` 경로를 npm canonical form으로 정리 |
| `README.md` | Status를 npm `0.1.0` publish 및 npm latest npx 검증 완료 상태로 갱신 |
| `mydocs/working/task_m010_7_stage4.md` | Stage 4 publish, 보안 점검, postpublish smoke 결과 기록 |
| `mydocs/report/task_m010_7_report.md` | #7 최종 결과와 수용 기준 검증 기록 |
| `mydocs/orders/20260629.md` | #7 상태를 완료로 갱신 |

## 본문 변경 정도 / 본문 무손실 여부

README는 Status 문장만 publish 완료 상태에 맞춰 갱신했다. `package.json`은 `bin` 경로의 leading `./`를 제거해 npm canonical form으로 정리했으며 CLI entry point 자체는 동일하다. analyzer runtime, SDK export, `UsageSnapshot v2` schema, parser 동작은 변경하지 않았다.

## publish 전 보안 점검

- dependencies, devDependencies, optionalDependencies, peerDependencies, bundledDependencies 모두 0개임을 확인했다.
- lifecycle script 점검 결과 `preinstall`, `install`, `postinstall`, `prepare`, `prepublishOnly`, `postpublish` 등 publish/install hook은 0개다.
- package contents allowlist 검사 결과 published package는 18 files이며 `src/__tests__`, parser fixtures, profile baseline fixtures, `scripts`, `mydocs`, `.github`, `.env`, `.npmrc`를 포함하지 않는다.
- publish package text files secret/path scan 결과 예상 밖 민감값 hit는 0개다. 유일한 hit는 secret 차단 정규식 자체다.
- runtime package에는 `child_process`, shell exec, network client, file write/delete 동작이 없다.
- `npm audit --omit=dev`는 lockfile이 없어 `ENOLOCK`으로 종료됐지만, 감사 대상 dependency가 없는 상태임을 `npm ls --omit=dev --all`과 package metadata로 확인했다.
- npm auth는 로그인 상태로 확인했고 account identifier는 기록하지 않았다.
- npm 2FA mode는 `auth-and-writes`로 확인했다.

## publish 결과

- 첫 `npm publish` 시도는 2FA one-time password 요구로 `EOTP`에서 중단됐다.
- 이후 작업지시자가 npm 2FA 인증을 완료한 뒤 registry 조회로 `codex-usage-analyzer@0.1.0` publish를 확인했다.
- publish package summary: total files 18, package size 19.4 kB, unpacked size 84.0 kB.
- npm registry 조회 결과 `codex-usage-analyzer@0.1.0` version이 확인됐다.

## 검증 결과

실행 명령:

```bash
npm test
npm_config_cache=<writable-temp-cache> npm pack --dry-run --json
npm publish --dry-run --json
npm view codex-usage-analyzer@0.1.0 version --json
npx --yes codex-usage-analyzer@latest analyze --json
git diff --check
```

결과:

- OK: `npm test` 통과. 47 tests, 47 pass, 0 fail.
- OK: 최종 `npm pack --dry-run --json` 통과. total files 18, package size 19,425 bytes, unpacked size 84,074 bytes. README Status 갱신 전 publish dry-run package size는 19,389 bytes였다.
- OK: `npm publish --dry-run --json` 통과. `bin` 경로 canonical 수정 후 publish dry-run 경고가 사라졌다.
- OK: npm registry에서 `codex-usage-analyzer@0.1.0` publish 확인.
- OK: npm latest `npx` smoke 통과. `npx --yes codex-usage-analyzer@latest analyze --json` 출력이 schema validation을 통과했고 raw snapshot은 기록하지 않았다.
- OK: `git diff --check` 통과.

## 잔여 위험

- npm publish는 manual publish였다. GitHub trusted publishing 또는 provenance statement는 이번 task 범위에 포함하지 않았다.
- `license` metadata는 추가하지 않았다. 필요하면 별도 지시 또는 별도 task로 다룬다.
- npm package는 현재 `0.1.0`으로 publish되어 version 재사용이 불가능하다. 후속 수정은 version bump가 필요하다.

## 다음 단계 영향

- PR에는 npm `0.1.0` publish와 npm latest `npx` smoke 완료 사실을 기록한다.
- 후속 release부터는 README release checklist와 CI `npm pack --dry-run`을 기준으로 publish readiness를 반복 검증할 수 있다.
- publish 이후 발견되는 package 문구, license, provenance, trusted publishing 보강은 별도 issue로 다루는 것이 안전하다.

## 승인 요청

- Stage 4 산출물과 검증 결과를 승인하면 PR 게시 절차로 진행한다.
- PR 게시 전 raw analyzer JSON, local path, credential, account identifier가 PR 본문에 포함되지 않았는지 다시 확인한다.

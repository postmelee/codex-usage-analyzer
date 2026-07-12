# Task M02x #43 Stage 2 완료보고서

GitHub Issue: [#43](https://github.com/postmelee/codex-usage-analyzer/issues/43)
구현계획서: [`task_m02x_43_impl.md`](../plans/task_m02x_43_impl.md)
Stage: 2

## 단계 목적

Stage 1의 internal resolver를 app-server transport에 연결해 PATH의 `codex` 또는 선택된 macOS 앱 번들 실행 파일로 기존 initialization handshake와 `account/usage/read`를 수행하게 한다. resolver no-runtime/예외와 spawn `ENOENT`를 기존 safe error code에 매핑하고 public SDK type과 Account Usage Contract를 보존한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/app-server-client.js` | resolver를 await한 뒤 선택 command를 spawn하도록 연결하고, `null`과 unexpected resolver failure를 기존 safe error로 분기했다. |
| `src/errors.js` | `CODEX_NOT_FOUND` 고정 메시지를 CLI 또는 호환 앱을 안내하도록 일반화했다. error code enum은 유지했다. |
| `src/__tests__/app-server-client.test.js` | 73줄 추가/8줄 변경. synthetic 앱 command, no-runtime spawn 미호출, resolver detail 비노출, spawn race와 기존 protocol 회귀 test를 추가·정렬했다. |

## 본문 변경 정도 / 본문 무손실 여부

transport는 child command 선택 전에 resolver를 호출하는 단계만 추가했다. 기존 `app-server` argument, stdio options, request id, initialize → initialized → `account/usage/read` 순서, timeout, stderr drain, child cleanup, RPC/response handling은 유지했다.

`resolveExecutable` injection은 `requestAccountUsageFromAppServer()`의 internal test seam으로만 사용하며 root SDK export와 `src/index.d.ts`에는 노출하지 않았다. Account Usage Contract, schema, normalizer, dependency, bin/exports는 변경하지 않았다.

## 검증 결과

실행 명령:

```bash
node --test src/__tests__/codex-executable.test.js src/__tests__/app-server-client.test.js src/__tests__/account-usage.test.js
rg -n "resolveCodexExecutable|spawnProcess\(command|CODEX_NOT_FOUND|APP_SERVER_START_FAILED|account/usage/read" src/app-server-client.js src/errors.js src/__tests__/app-server-client.test.js
rg -n "readFile|keychain|auth\.json|accessToken|refreshToken|Authorization|ChatGPT-Account-Id|/wham/|experimentalApi" src/codex-executable.js src/app-server-client.js src/errors.js && exit 1 || true
node --input-type=module -e 'import fs from "node:fs"; const source=fs.readFileSync("src/index.d.ts","utf8"); if (/codexPath|resolveExecutable/u.test(source)) throw new Error("internal resolver leaked into public SDK types"); console.log("public SDK types unchanged");'
git diff --check
```

결과:

- OK: resolver, app-server client, account contract focused test 33개가 모두 통과했고 fail/cancelled/skipped/todo는 0이었다.
- OK: selected command spawn, `CODEX_NOT_FOUND`, `APP_SERVER_START_FAILED`, `account/usage/read` 연결 keyword를 source/test에서 확인했다.
- OK: auth/keychain/token/header/private endpoint 금지 pattern은 runtime source에서 zero-match였다.
- OK: public type scan은 `public SDK types unchanged`를 출력했다.
- OK: `git diff --check`는 whitespace error 없이 통과했다.
- OK: synthetic 앱 command는 protocol result 반환 후 child cleanup까지 완료했다.
- OK: resolver `null`은 spawn을 호출하지 않았고, resolver throw와 spawn `ENOENT`는 상세 원문 없이 기존 safe error로 변환됐다.

## 잔여 위험

- 실제 macOS 앱 번들의 resolver 선택과 account usage 구조는 Stage 3의 app-only structural smoke에서 최종 확인해야 한다.
- `CODEX_NOT_FOUND` message가 일반화됐으므로 README Requirements/Troubleshooting 설명을 Stage 3에서 일치시켜야 한다.
- 앱 번들 경로 drift와 service/network/auth 실패는 기존 safe app-server error로 나타나며 raw upstream detail은 계속 숨긴다.

## 다음 단계 영향

- Stage 3은 README user-facing Quick Start에서 `--yes`를 제거하고 CLI PATH 또는 지원 macOS 앱 요구사항을 설명한다.
- full test와 npm pack dry-run으로 resolver 포함, task/test artifact 제외, dependency-free package 경계를 검증한다.
- child PATH에서 Codex CLI를 제거한 app-only live smoke는 raw JSON을 validator memory에서만 처리하고 contract structure만 보고한다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3으로 진행한다.

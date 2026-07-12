# Task M02x #43 Stage 1 완료보고서

GitHub Issue: [#43](https://github.com/postmelee/codex-usage-analyzer/issues/43)
구현계획서: [`task_m02x_43_impl.md`](../plans/task_m02x_43_impl.md)
Stage: 1

## 단계 목적

macOS에서 PATH의 Codex CLI를 우선하고, PATH에 실행 파일이 없을 때만 표준 system/user Applications의 ChatGPT/Codex 앱 번들 고정 후보를 검사하는 internal resolver를 추가한다. non-macOS 동작, no-runtime 결과, 후보 순서와 privacy/security 경계를 실제 설치나 로그인 없이 synthetic test로 고정한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/codex-executable.js` | 71줄. non-macOS 기존 command 보존, macOS PATH 우선, 4개 고정 앱 후보 fallback, regular executable file 검사와 safe candidate failure 처리를 구현했다. |
| `src/__tests__/codex-executable.test.js` | 126줄. non-macOS, PATH 우선, 4개 앱 후보 순서, no-runtime, probe failure 비노출, PATH 부재 시 fallback 등 9개 test를 추가했다. |
| `package.json` | npm package `files` allowlist에 resolver runtime module을 추가했다. |

## 본문 변경 정도 / 본문 무손실 여부

Stage 1은 신규 internal resolver와 focused test, package file allowlist만 변경했다. 기존 `src/app-server-client.js`, CLI/SDK export, TypeScript type, error enum/message, Account Usage Contract, schema, README, dependency와 bin/exports는 수정하지 않았다.

resolver는 non-macOS에서 probe 없이 기존 command string `codex`를 반환한다. macOS 후보 검사는 Node.js built-in filesystem/path/os API만 사용하고 shell, recursive scan, Spotlight/LaunchServices, app data/cache와 credential source를 사용하지 않는다.

## 검증 결과

실행 명령:

```bash
node --test src/__tests__/codex-executable.test.js
node --input-type=module -e 'import fs from "node:fs"; const pkg=JSON.parse(fs.readFileSync("package.json","utf8")); if (!pkg.files.includes("src/codex-executable.js")) throw new Error("resolver missing from package allowlist"); console.log("resolver package entry present");'
rg -n "resolveCodexExecutable|ChatGPT\.app|Codex\.app|Applications|homedir|X_OK|isFile" src/codex-executable.js src/__tests__/codex-executable.test.js
rg -n "child_process|execFile|execSync|spawn|readdir|opendir|glob|Spotlight|mdfind|LaunchServices" src/codex-executable.js && exit 1 || true
rg -n "/Users/|/home/|auth\.json|keychain|accessToken|refreshToken|Authorization|ChatGPT-Account-Id|/wham/" src/codex-executable.js src/__tests__/codex-executable.test.js && exit 1 || true
git diff --check
```

결과:

- OK: focused test 9개가 모두 통과했고 fail/cancelled/skipped/todo는 0이었다.
- OK: package allowlist 검사에서 `resolver package entry present`를 확인했다.
- OK: resolver, 앱 후보, executable file 검사와 test coverage keyword가 source/test에 존재했다.
- OK: shell process, recursive directory scan, Spotlight/LaunchServices 금지 pattern은 zero-match였다.
- OK: 실제 사용자 경로, auth/keychain/token/header/private endpoint 금지 pattern은 zero-match였다.
- OK: `git diff --check`는 whitespace error 없이 통과했다.

## 잔여 위험

- 앱 번들 내부 경로는 공개 안정 계약이 아니며 실제 app-only 동작은 Stage 2 transport 통합과 Stage 3 structural-only live smoke에서 검증해야 한다.
- Stage 1 resolver는 아직 app-server client가 호출하지 않으므로 현재 public 실행 동작은 바뀌지 않았다.
- executable resolve 이후 spawn 전 파일이 사라지는 TOCTOU는 Stage 2의 기존 `ENOENT` safe mapping으로 다룬다.

## 다음 단계 영향

- Stage 2는 `resolveCodexExecutable()`을 `requestAccountUsageFromAppServer()`에 연결한다.
- resolver result `null`, unexpected resolver failure, spawn `ENOENT`를 기존 safe error code로 구분해 검증한다.
- initialization protocol, timeout, stderr drain, child cleanup, Account Usage Contract normalization은 변경하지 않는다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2로 진행한다.

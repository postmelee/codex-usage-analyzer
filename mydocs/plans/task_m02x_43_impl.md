# Task M02x #43 구현계획서

수행계획서: [`task_m02x_43.md`](task_m02x_43.md)
GitHub Issue: [#43](https://github.com/postmelee/codex-usage-analyzer/issues/43)
마일스톤: M02x

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | macOS Codex 실행 파일 resolver | `src/codex-executable.js`, focused test, package allowlist | PATH/app 후보 순서, no-runtime, non-macOS 보존, no-shell 경계 |
| 2 | app-server transport 통합과 안전한 오류 처리 | `src/app-server-client.js`, `src/errors.js`, focused test | 선택 command, protocol/cleanup, safe error, contract 회귀 |
| 3 | 사용자 문서와 package/live 통합 검증 | `README.md`, full/package/live 검증 | 대화형/자동화 npx 구분, pack audit, app-only structural smoke |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| 사용자 진입점 | 저장소 root | `README.md` | OK | Stage 3에서 기존 Quick Start, Requirements, How it works, Troubleshooting만 보정한다. |
| task 단계 보고서 | `mydocs/working/` | `mydocs/working/task_m02x_43_stage{N}.md` | OK | 각 Stage source/doc와 같은 커밋에 묶는다. |
| task 최종 보고서 | `mydocs/report/` | `mydocs/report/task_m02x_43_report.md` | OK | 모든 Stage 승인 후 `task-final-report` 절차에서 작성한다. |
| Account Usage Contract | 변경하지 않음 | `docs/account-usage-contract.md`, schema 무변경 | OK | resolver source는 JSON contract에 포함하지 않는다. |

## Stage 1 — macOS Codex 실행 파일 resolver

### 산출물

신규:

- `src/codex-executable.js`
- `src/__tests__/codex-executable.test.js`
- `mydocs/working/task_m02x_43_stage1.md`

수정:

- `package.json`

### 변경 내용

- package public API에 export하지 않는 internal async resolver `resolveCodexExecutable()`을 추가한다.
- resolver 기본 입력은 `process.platform`, `process.env`, `node:os.homedir()`, Node.js filesystem executable check를 사용하고, test에서는 platform/env/home/executable predicate를 주입할 수 있게 한다.
- non-macOS에서는 후보 탐지를 수행하지 않고 기존 command string `codex`를 반환해 현재 spawn/error 의미를 유지한다.
- macOS에서는 `PATH` 항목을 POSIX delimiter 기준으로 순서대로 검사하고 실행 가능한 `codex`가 하나라도 있으면 command string `codex`를 반환한다. PATH에 없는 경우에만 앱 번들 후보를 검사한다.
- macOS 앱 후보는 다음 순서의 고정 allowlist로 제한한다.
  1. system Applications의 `ChatGPT.app/Contents/Resources/codex`
  2. system Applications의 `Codex.app/Contents/Resources/codex`
  3. user Applications의 `ChatGPT.app/Contents/Resources/codex`
  4. user Applications의 `Codex.app/Contents/Resources/codex`
- filesystem 확인은 regular file과 executable permission만 확인한다. 개별 후보의 not-found, permission, stat 오류는 후보 불일치로 취급하고 상세 오류나 경로를 반환하지 않는다.
- PATH와 앱 후보가 모두 없으면 `null`을 반환한다.
- shell command, `which`, Spotlight/LaunchServices, directory recursion, app data/cache, credential source를 사용하지 않는다.
- focused test는 synthetic platform/env/home과 predicate를 사용해 실제 사용자 경로나 설치 상태에 의존하지 않고 다음을 검증한다.
  - non-macOS는 probe 없이 `codex` 유지
  - macOS PATH hit가 앱 후보보다 우선
  - PATH miss 후 system ChatGPT, system Codex, user ChatGPT, user Codex 순서
  - unreadable/non-file 후보 skip
  - PATH와 앱 후보가 모두 없을 때 `null`
  - 후보 검사 오류 원문이 반환값이나 예외로 노출되지 않음
- `package.json`의 `files` allowlist에 `src/codex-executable.js`를 추가한다. dependency, bin, exports, contract version은 변경하지 않는다.

### 검증

```bash
node --test src/__tests__/codex-executable.test.js
node --input-type=module -e 'import fs from "node:fs"; const pkg=JSON.parse(fs.readFileSync("package.json","utf8")); if (!pkg.files.includes("src/codex-executable.js")) throw new Error("resolver missing from package allowlist"); console.log("resolver package entry present");'
rg -n "resolveCodexExecutable|ChatGPT\.app|Codex\.app|Applications|homedir|X_OK|isFile" src/codex-executable.js src/__tests__/codex-executable.test.js
rg -n "child_process|execFile|execSync|spawn|readdir|opendir|glob|Spotlight|mdfind|LaunchServices" src/codex-executable.js && exit 1 || true
rg -n "/Users/|/home/|auth\.json|keychain|accessToken|refreshToken|Authorization|ChatGPT-Account-Id|/wham/" src/codex-executable.js src/__tests__/codex-executable.test.js && exit 1 || true
git diff --check
```

### 커밋

```text
Task #43 Stage 1: macOS Codex 실행 파일 resolver 추가
```

## Stage 2 — app-server transport 통합과 안전한 오류 처리

### 산출물

신규:

- `mydocs/working/task_m02x_43_stage2.md`

수정:

- `src/app-server-client.js`
- `src/errors.js`
- `src/__tests__/app-server-client.test.js`

### 변경 내용

- `requestAccountUsageFromAppServer()`가 child를 spawn하기 전에 resolver를 await하고 선택된 command로 기존 `app-server` argument와 stdio 옵션을 그대로 사용하게 한다.
- test 전용 internal option으로 resolver function을 주입할 수 있게 하되, `readAccountUsage()`의 public SDK option과 `src/index.d.ts`에는 새 option을 노출하지 않는다.
- resolver가 `null`을 반환하면 child를 spawn하지 않고 기존 `CODEX_NOT_FOUND`를 반환한다.
- resolver 자체의 예상 밖 예외는 원문을 노출하지 않고 `APP_SERVER_START_FAILED`로 매핑한다.
- 선택 이후 executable이 사라지는 TOCTOU 상황의 spawn `ENOENT`도 기존 `CODEX_NOT_FOUND`로 안전하게 매핑한다.
- 앱 bundle command를 선택해도 initialization handshake, request id, timeout 시작/정리, stderr drain, child cleanup, RPC/response normalization은 현재 구현을 그대로 유지한다.
- `CODEX_NOT_FOUND` 고정 메시지는 CLI뿐 아니라 호환 Codex 앱도 확인하도록 일반화하되 local candidate path는 포함하지 않는다. error enum/type union은 변경하지 않는다.
- focused test는 synthetic command만 사용해 다음을 검증한다.
  - PATH resolver 결과 `codex` spawn과 기존 exact options
  - 앱 resolver 결과 synthetic absolute command spawn
  - resolver `null`에서 spawn 미호출과 `CODEX_NOT_FOUND`
  - resolver throw에서 상세 원문 부재와 `APP_SERVER_START_FAILED`
  - spawn `ENOENT` race의 safe mapping
  - initialize → initialized → `account/usage/read` 순서와 child cleanup

### 검증

```bash
node --test src/__tests__/codex-executable.test.js src/__tests__/app-server-client.test.js src/__tests__/account-usage.test.js
rg -n "resolveCodexExecutable|spawnProcess\(command|CODEX_NOT_FOUND|APP_SERVER_START_FAILED|account/usage/read" src/app-server-client.js src/errors.js src/__tests__/app-server-client.test.js
rg -n "readFile|keychain|auth\.json|accessToken|refreshToken|Authorization|ChatGPT-Account-Id|/wham/|experimentalApi" src/codex-executable.js src/app-server-client.js src/errors.js && exit 1 || true
node --input-type=module -e 'import fs from "node:fs"; const source=fs.readFileSync("src/index.d.ts","utf8"); if (/codexPath|resolveExecutable/u.test(source)) throw new Error("internal resolver leaked into public SDK types"); console.log("public SDK types unchanged");'
git diff --check
```

### 커밋

```text
Task #43 Stage 2: 앱 번들 resolver를 app-server transport에 통합
```

## Stage 3 — 사용자 문서와 package/live 통합 검증

### 산출물

신규:

- `mydocs/working/task_m02x_43_stage3.md`

수정:

- `README.md`
- Stage 3 검증에서 발견된 #43 범위 내 결함이 있을 때만 Stage 1/2 source, test 또는 `package.json`

### 변경 내용

- README의 두 user-facing 예시를 다음 대화형 명령으로 바꾼다.

  ```text
  npx codex-usage-analyzer@latest
  npx codex-usage-analyzer@latest --json
  ```

- README에서는 `--yes`를 제거하지만 `mydocs/manual/npm_release_guide.md`의 public smoke와 CI/maintainer 비대화형 검증 명령은 변경하지 않는다.
- Requirements는 Node.js 20+, PATH의 recent Codex CLI 또는 지원되는 macOS Codex/ChatGPT 앱, ChatGPT-backed sign-in을 설명한다.
- How it works는 PATH 우선과 macOS app fallback 후 선택된 official Codex process에서 app-server를 실행한다고 설명한다.
- Troubleshooting의 `CODEX_NOT_FOUND`는 CLI PATH와 지원되는 macOS 앱 설치를 함께 확인하도록 보정한다.
- Small runtime, credential reader 없음, private endpoint fallback 없음, Account Usage Contract와 non-affiliation 문구는 유지한다.
- full test와 npm pack dry-run을 실행해 resolver runtime file이 package에 포함되고 `mydocs`, tests, local path가 package artifact에 들어가지 않는지 확인한다.
- 실제 macOS app-only smoke는 child `PATH`에서 Codex CLI 위치를 제거한 뒤 local package JSON command를 실행한다. raw JSON은 validator memory에서만 parse하고 다음 구조만 출력한다.
  - `contractVersion`
  - 정렬된 summary field 이름
  - daily buckets의 `null`/`array` 구분
- live smoke 실패 시 child stderr, command path, account/usage value를 출력하지 않고 generic failure로 종료한다.

### 검증

```bash
npm test
node --input-type=module -e 'import fs from "node:fs"; const readme=fs.readFileSync("README.md","utf8"); if (readme.includes("npx --yes codex-usage-analyzer@latest")) throw new Error("interactive README still forces --yes"); const matches=readme.match(/npx codex-usage-analyzer@latest/gu) ?? []; if (matches.length !== 2) throw new Error(`expected 2 interactive commands, got ${matches.length}`); const manual=fs.readFileSync("mydocs/manual/npm_release_guide.md","utf8"); if (!manual.includes("npx --yes codex-usage-analyzer@latest --help")) throw new Error("maintainer smoke lost --yes"); console.log("interactive and automation commands separated");'
rg -n "PATH|macOS|ChatGPT app|Codex app|app bundle|CODEX_NOT_FOUND|npx codex-usage-analyzer@latest" README.md
rg -n "Small runtime|no runtime package dependencies|never asks you to paste a token|private profile endpoint|not affiliated|not endorsed|not sponsored" README.md
npm pack --dry-run --json > /private/tmp/task43-stage3-pack.json
node --input-type=module -e 'import fs from "node:fs"; const [pack]=JSON.parse(fs.readFileSync("/private/tmp/task43-stage3-pack.json","utf8")); const paths=pack.files.map(({path})=>path); if (!paths.includes("src/codex-executable.js")) throw new Error("resolver missing from package"); const forbidden=paths.filter((path)=>path.startsWith("mydocs/") || path.startsWith("src/__tests__/")); if (forbidden.length) throw new Error(forbidden.join(",")); console.log(`${paths.length} packaged files; resolver included; private task files excluded`);'
node --input-type=module -e 'import {spawnSync} from "node:child_process"; const env={...process.env,PATH:"/usr/bin:/bin"}; const result=spawnSync(process.execPath,["bin/codex-usage-analyzer.js","--json"],{env,encoding:"utf8",timeout:30000}); if(result.status!==0) throw new Error("app-bundle structural smoke failed"); const value=JSON.parse(result.stdout); console.log(JSON.stringify({contractVersion:value.contractVersion,summaryKeys:Object.keys(value.summary).sort(),dailyKind:value.dailyUsageBuckets===null?"null":"array"}));'
rg -n -g '!src/__tests__/**' "readFile|keychain|auth\.json|accessToken|refreshToken|Authorization|ChatGPT-Account-Id|/wham/|experimentalApi" src bin && exit 1 || true
git diff --check
git status --short
```

live smoke는 승인된 현재 사용자 환경에서만 실행하고 raw usage value, raw stderr, account identifier, 실제 executable path를 terminal·파일·Stage 보고서에 남기지 않는다. Stage 보고서에는 structural validator output과 pass/fail만 기록한다.

### 커밋

```text
Task #43 Stage 3: 앱-only 사용자 문서와 통합 검증 완료
```

## 검증

- 각 Stage 검증 명령은 해당 단계 보고서 작성 전에 실행한다.
- 실패한 검증은 단계 완료로 처리하지 않고 같은 Stage에서 원인을 수정한다.
- Stage 1/2 unit test는 실제 Codex 설치, 실제 앱 bundle, network, login 없이 synthetic dependency로 재현 가능해야 한다.
- macOS 앱 후보는 승인된 고정 allowlist만 사용하고 shell·재귀 scan·private app data 접근이 발견되면 Stage 1을 종료하지 않는다.
- existing PATH command, initialization protocol, timeout, cleanup, safe error mapping이 회귀하면 Stage 2를 종료하지 않는다.
- Account Usage Contract, schema, public SDK type, dependency, bin/exports가 변경되면 계획 밖 변경으로 처리한다.
- package audit에서 resolver가 누락되거나 `mydocs`/tests가 포함되면 Stage 3을 종료하지 않는다.
- live smoke는 raw JSON을 terminal/file로 직접 출력하지 않고 validator memory에서 structural summary로 축약한다.
- 계획 밖 Windows/Linux 앱 탐지, runtime bootstrap, `cua` alias, direct auth/backend 호출이 필요하면 구현계획서를 먼저 갱신하고 작업지시자 승인을 받는다.

## 커밋

- 구현계획서: `Task #43: 구현계획서 작성`
- Stage 1: `Task #43 Stage 1: macOS Codex 실행 파일 resolver 추가`
- Stage 2: `Task #43 Stage 2: 앱 번들 resolver를 app-server transport에 통합`
- Stage 3: `Task #43 Stage 3: 앱-only 사용자 문서와 통합 검증 완료`
- 각 Stage source/doc와 `mydocs/working/task_m02x_43_stage{N}.md`는 같은 commit에 묶는다.

## 단계 의존성

- Stage 1은 이 구현계획서 승인 후 시작한다.
- Stage 2는 Stage 1 resolver/test와 package allowlist 검증 및 단계 보고서가 승인된 뒤 시작한다.
- Stage 3은 Stage 2 transport/error 통합 검증과 단계 보고서가 승인된 뒤 시작한다.
- 최종 보고서와 PR은 Stage 3 통합 검증 보고가 승인된 뒤 작성한다.

## 위험과 대응

- **App path drift**: 공개 계약이 아닌 bundle 경로는 best-effort fallback으로 두고 기존 PATH command를 우선한다.
- **PATH semantics drift**: macOS에서만 POSIX PATH를 검사하고 hit 시 command string `codex`를 유지하며 synthetic ordering test를 둔다.
- **Unexpected executable selection**: system/user Applications의 승인된 ChatGPT/Codex 후보만 순서대로 검사한다.
- **TOCTOU**: resolve 후 spawn 시점에 executable이 사라져도 spawn `ENOENT`를 기존 safe error로 처리한다.
- **Platform regression**: non-macOS는 resolver가 즉시 `codex`를 반환해 기존 spawn 동작을 보존한다.
- **Protocol regression**: resolver는 command 선택만 담당하고 app-server handshake/normalizer는 변경하지 않으며 focused tests를 반복한다.
- **Sensitive path/error leak**: resolver 상세 오류, app candidate path, raw stderr를 public error나 Stage 보고서에 포함하지 않는다.
- **Package expansion**: runtime dependency를 추가하지 않고 resolver 단일 module만 package allowlist에 포함하며 pack artifact를 검사한다.
- **Misleading Quick Start**: `--yes` 제거는 사용자 README에만 적용하고 CI/릴리스 smoke는 비대화형 확인을 유지한다.

## 승인 요청 사항

- 위 3개 Stage의 파일·검증·커밋 경계
- macOS PATH 우선 후 system ChatGPT → system Codex → user ChatGPT → user Codex 후보 순서
- non-macOS 기존 `codex` spawn 보존과 macOS no-runtime `null` 처리
- resolver를 internal module로 유지하고 public SDK option/type에 노출하지 않는 기준
- 기존 error enum을 유지하고 `CODEX_NOT_FOUND` message만 일반화하는 호환성 판단
- README user-facing `--yes` 제거와 maintainer/CI `--yes` 유지
- Stage 3 structural-only live smoke와 raw data 비노출 검증 방식

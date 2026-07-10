# Task M020 #32 구현계획서

수행계획서: [`task_m020_32.md`](task_m020_32.md)
GitHub Issue: [#32](https://github.com/postmelee/codex-usage-analyzer/issues/32)
마일스톤: M020

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | Account usage contract와 app-server transport | `src/app-server-client.js`, `src/account-usage.js`, schema/contract | focused unit test, protocol/credential boundary scan |
| 2 | CLI/SDK 전환과 legacy 제거 | `src/cli.js`, `src/index.*`, package v0.2.0 | full test, legacy zero-match, npm pack file audit |
| 3 | 사용자·downstream·maintainer 문서 재구성 | README, `docs/`, contribution/security, npm release guide | heading/link/schema/preflight/CI config 검증 |
| 4 | End-to-end package와 npx 검증 | live/npx 검증 결과와 Stage 4 보고서 | Node 20/24, pack, app-server live, npx structural smoke |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| 사용자 진입점 | root | `README.md` | OK | npm/GitHub 첫 화면 |
| account usage contract | `docs/` | `docs/account-usage-contract.md` | OK | Stage 1에서 runtime contract와 함께 고정 |
| machine-readable schema | `docs/` | `docs/account-usage.schema.json` | OK | Stage 1 contract test의 기준 |
| downstream 책임 문서 | `docs/` | `docs/downstream-integration.md` | OK | Stage 3 공개 통합 문서 |
| 기여 문서 | root | `CONTRIBUTING.md` | OK | GitHub 표준 위치 |
| 보안 정책 | root | `SECURITY.md` | OK | GitHub 표준 위치 |
| npm release 절차 | `mydocs/manual/` | `mydocs/manual/npm_release_guide.md` | OK | repo maintainer용 반복 절차 |
| task 보고서 | `mydocs/working`, `mydocs/report` | `mydocs/working/task_m020_32_stage{N}.md`, `mydocs/report/task_m020_32_report.md` | OK | 내부 작업 이력 |

## Stage 1 — Account usage contract와 app-server transport

### 산출물

신규:

- `src/errors.js`
- `src/app-server-client.js`
- `src/account-usage.js`
- `src/__tests__/app-server-client.test.js`
- `src/__tests__/account-usage.test.js`
- `docs/account-usage-contract.md`
- `docs/account-usage.schema.json`
- `mydocs/working/task_m020_32_stage1.md`

수정:

- 없음

### 변경 내용

- dependency 없이 `node:child_process`와 line-delimited JSON parser로 app-server stdio client를 구현한다.
- subprocess command는 기본 `codex`, argument는 `app-server`로 고정하고 shell을 사용하지 않는다.
- 다음 protocol 순서를 강제한다.
  1. `initialize` request
  2. initialize result 확인
  3. `initialized` notification
  4. `account/usage/read` request
  5. result 또는 safe RPC error 처리
- request id는 initialize와 usage를 구분하는 고정 내부 id를 사용하고 notification/server request는 무시한다.
- raw stderr는 drain만 하고 반환·로그하지 않는다.
- spawn error, early exit, timeout, malformed JSON, protocol ordering, RPC error를 `CodexUsageError`의 safe code/message로 변환한다.
- settle 경로에서 timer, readline, stdin, listener, child process를 정리한다.
- response normalizer는 summary 5개 field와 bucket 2개 field만 allowlist한다.
- missing summary metric은 null, missing/null daily buckets는 null로 정규화하고 빈 배열은 보존한다.
- invalid/negative/unsafe integer와 잘못된 date shape는 `INVALID_ACCOUNT_USAGE_RESPONSE`로 거부한다.
- successful result에 `contractVersion: 1`과 response 수신 시점 `capturedAt`을 추가한다.
- official Markdown contract와 Draft-07 JSON Schema를 같은 field/null semantics로 작성한다.
- test는 fake child/stream을 주입해 실제 Codex 설치나 network 없이 실행한다.

### 검증

```bash
node --test src/__tests__/account-usage.test.js src/__tests__/app-server-client.test.js
node -e 'JSON.parse(require("node:fs").readFileSync("docs/account-usage.schema.json", "utf8"))'
rg -n "contractVersion|capturedAt|lifetimeTokens|peakDailyTokens|longestRunningTurnSec|currentStreakDays|longestStreakDays|dailyUsageBuckets" src/account-usage.js docs/account-usage-contract.md docs/account-usage.schema.json
rg -n "readFile|keychain|auth\\.json|accessToken|refreshToken|Authorization|ChatGPT-Account-Id|/wham/|experimentalApi" src/errors.js src/app-server-client.js src/account-usage.js && exit 1 || true
git diff --check
```

Stage 보고서에는 test pass 수, protocol message 순서, schema parse, credential boundary scan 결과만 기록하고 synthetic test value나 raw RPC body를 길게 복사하지 않는다.

### 커밋

```text
Task #32 Stage 1: account usage contract와 app-server transport 구현
```

## Stage 2 — CLI/SDK 전환과 legacy 제거

### 산출물

신규:

- `src/format-account-usage.js`
- 필요 시 formatter focused test
- `mydocs/working/task_m020_32_stage2.md`

수정:

- `src/cli.js`
- `src/index.js`
- `src/index.d.ts`
- `bin/codex-usage-analyzer.js`
- `src/__tests__/cli.test.js`
- `package.json`

삭제:

- `src/analyze.js`
- `src/profile-baseline.js`
- `src/parser/**`
- `src/snapshot/**`
- `src/fixtures/**`
- Stage 1/2 신규 test를 제외한 기존 `src/__tests__/**`
- `scripts/profile-smoke.js`

### 변경 내용

- package/runtime version을 0.2.0으로 맞춘다.
- CLI parser는 다음 surface만 허용한다.
  - no args 또는 `usage`: human-readable account usage
  - no args/`usage` + `--json`: exact public JSON contract
  - `--help`, `-h`, `--version`, `-v`: app-server 미기동 즉시 출력
- unknown command/flag와 duplicate/conflicting flag는 usage error로 종료한다.
- human formatter는 null을 unavailable로 표현하고 compact number/duration/day count를 안정적으로 출력한다.
- CLI error는 safe message와 error code만 stderr에 출력하고 stack, raw stderr, RPC body를 출력하지 않는다.
- SDK root export는 `readAccountUsage`, `CodexUsageError`, version/contract constants만 제공한다.
- TypeScript declaration은 public contract, summary, bucket, error code, timeout option을 정확히 반영한다.
- package files allowlist는 새 runtime/types/docs만 포함하고 legacy tree와 `mydocs`를 제외한다.
- package description/keywords/status를 official account usage thin CLI에 맞게 갱신한다.
- old local parser, sample fixture, profile baseline, asset discovery와 관련 test를 전부 삭제한다.

### 검증

```bash
npm test
node bin/codex-usage-analyzer.js --help
node bin/codex-usage-analyzer.js --version
rg -n "UsageSnapshot v2|UsageSnapshotV2|analyzeUsage|fixture-sample|profile-baseline|session_jsonl" README.md package.json src scripts docs .github && exit 1 || true
npm pack --dry-run --json > /private/tmp/task32-stage2-pack.json
node --input-type=module -e 'import fs from "node:fs"; const [pack] = JSON.parse(fs.readFileSync("/private/tmp/task32-stage2-pack.json", "utf8")); const paths = pack.files.map((file) => file.path); const forbidden = paths.filter((path) => /^(mydocs|src\\/(parser|snapshot|fixtures|__tests__))\\//u.test(path) || path.includes("profile-smoke")); if (forbidden.length) throw new Error(forbidden.join(",")); console.log(`${paths.length} packaged files`);'
git diff --check
```

### 커밋

```text
Task #32 Stage 2: thin CLI와 SDK 전환 및 legacy analyzer 제거
```

## Stage 3 — 사용자·downstream·maintainer 문서 재구성

### 산출물

신규:

- `docs/downstream-integration.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `mydocs/manual/npm_release_guide.md`
- `mydocs/working/task_m020_32_stage3.md`

수정:

- `README.md`
- `docs/account-usage-contract.md`와 schema는 Stage 1 이후 설명 보정이 필요한 경우에만 수정
- `scripts/release-preflight.js`
- `.github/workflows/ci.yml`
- `.github/workflows/publish.yml`
- `mydocs/manual/README.md`

### 변경 내용

- README를 다음 사용자 흐름으로 재작성한다.
  1. 제품 한 줄 가치와 privacy boundary
  2. `npx` quick start
  3. human/JSON output과 supported metrics
  4. requirements와 auth compatibility
  5. CLI/SDK reference
  6. downstream contract 링크
  7. privacy/security와 troubleshooting
  8. contributing/support/license/non-affiliation
- README에서 version bump, tag, publish workflow, registry signature, GitHub Release 순서와 운영 기록을 제거한다.
- README에는 개발용 `npm test`, `npm pack --dry-run`과 maintainer guide 링크만 남긴다.
- downstream 문서에 다음 책임 경계를 고정한다.
  - CLI payload는 identity-free usage contract만 담당
  - downstream은 GitHub identity, submit token, validation/storage, rendering/cache, privacy/deletion을 담당
  - optional profile identity adapter는 별도 experimental task이며 authorization에 사용하지 않음
- `CONTRIBUTING.md`는 issue-first, Hyper-Waterfall 승인 경계, test/PR 기준을 공개 기여자 관점으로 요약한다.
- `SECURITY.md`는 supported release line, private vulnerability report 경로, credential/raw response 금지 정책을 명시한다.
- `npm_release_guide.md`에 version bump, preflight, tag, trusted publish, registry/signature/npx/GitHub Release 순서를 이동한다.
- release preflight가 README 대신 maintainer guide와 새 package artifact를 검증하도록 수정한다.
- CI smoke를 no-auth `--help`/`--version`으로 바꾸고 full behavior는 unit test가 검증한다.

### 검증

```bash
npm test
npm run release:preflight
rg -n "Quick start|Supported metrics|Requirements|Privacy|Security|Troubleshooting|SDK|Contributing|Support|License|affiliated" README.md
rg -n "npm version|npm publish|git tag|Publish Package|npm audit signatures|GitHub Release" README.md && exit 1 || true
rg -n "npm version|npm publish|git tag|Publish Package|npm audit signatures|GitHub Release" mydocs/manual/npm_release_guide.md
rg -n "GitHub identity|submit token|render|cache|delete|identity-free|experimental" docs/downstream-integration.md
node -e 'JSON.parse(require("node:fs").readFileSync("docs/account-usage.schema.json", "utf8"))'
git diff --check
```

### 커밋

```text
Task #32 Stage 3: 사용자 문서와 npm 운영 경계 재구성
```

## Stage 4 — End-to-end package와 npx 검증

### 산출물

신규:

- `mydocs/working/task_m020_32_stage4.md`

수정:

- Stage 4 검증에서 발견된 #32 범위 내 결함이 있을 때만 해당 source/test/doc 수정

### 변경 내용

- current Node runtime과 Node 20 runtime에서 full test를 실행한다.
- npm pack dry run의 file list, entry count, unpacked/package size를 확인한다.
- 실제 Codex app-server 로그인 환경에서 human output과 JSON output 경로를 실행하되, pipe validator가 구조와 타입만 출력하도록 한다.
- local package를 실제 `npx`로 실행해 package bin resolution과 app-server 연동을 검증한다.
- raw usage values, daily bucket values, stderr, account identifier, local path는 console transcript와 보고서에 남기지 않는다.
- active product surface legacy zero-match, package denylist, sensitive pattern scan을 다시 수행한다.
- GitHub CI Node 20은 PR 게시 후 원격 검증으로 최종 보고서에 추가하고, PR 전에는 local Node 20 실행 결과를 근거로 사용한다.

### 검증

```bash
npm test
npx --yes --package node@20 node --test
npm pack --dry-run --json > /private/tmp/task32-stage4-pack.json
node --input-type=module -e 'import fs from "node:fs"; const [pack] = JSON.parse(fs.readFileSync("/private/tmp/task32-stage4-pack.json", "utf8")); console.log(JSON.stringify({entryCount: pack.entryCount, size: pack.size, unpackedSize: pack.unpackedSize}));'
node bin/codex-usage-analyzer.js --json | node --input-type=module -e 'let input=""; for await (const chunk of process.stdin) input += chunk; const value=JSON.parse(input); console.log(JSON.stringify({contractVersion:value.contractVersion, summaryKeys:Object.keys(value.summary).sort(), dailyKind:value.dailyUsageBuckets === null ? "null" : "array"}));'
npx --yes --package . codex-usage-analyzer --json | node --input-type=module -e 'let input=""; for await (const chunk of process.stdin) input += chunk; const value=JSON.parse(input); console.log(JSON.stringify({contractVersion:value.contractVersion, summaryKeys:Object.keys(value.summary).sort(), dailyKind:value.dailyUsageBuckets === null ? "null" : "array"}));'
rg -n "UsageSnapshot v2|UsageSnapshotV2|analyzeUsage|fixture-sample|profile-baseline|session_jsonl" README.md package.json src scripts docs .github && exit 1 || true
rg -n "readFile|keychain|auth\\.json|accessToken|refreshToken|Authorization|ChatGPT-Account-Id|/wham/|experimentalApi" src bin && exit 1 || true
git diff --check
git status --short
```

`npx`와 live CLI 명령은 raw JSON을 terminal/file에 출력하지 않고 validator process로 직접 전달한다. 보고서에는 validator의 field/type summary만 기록한다.

### 커밋

```text
Task #32 Stage 4: package와 npx end-to-end 검증
```

## 검증

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- 실패한 검증은 단계 완료로 처리하지 않고 같은 Stage에서 원인을 수정한다.
- runtime test는 network/auth 없이 fake transport로 재현 가능해야 한다.
- live app-server/npx 검증은 별도 승인된 현재 사용자 환경에서 structural summary만 출력한다.
- official contract 문서와 runtime normalizer의 field/null semantics가 다르면 Stage를 종료하지 않는다.
- package file audit에서 `mydocs`, tests, old parser/schema/fixture가 발견되면 실패한다.
- 계획 밖 public field, command, dependency, document root가 필요하면 구현계획서를 먼저 수정하고 승인받는다.

## 커밋

- 구현계획서: `Task #32: 구현계획서 작성`
- Stage 1: `Task #32 Stage 1: account usage contract와 app-server transport 구현`
- Stage 2: `Task #32 Stage 2: thin CLI와 SDK 전환 및 legacy analyzer 제거`
- Stage 3: `Task #32 Stage 3: 사용자 문서와 npm 운영 경계 재구성`
- Stage 4: `Task #32 Stage 4: package와 npx end-to-end 검증`
- 각 Stage source/doc와 해당 Stage 보고서는 같은 commit에 묶는다.

## 단계 의존성

- Stage 1은 이 구현계획서 승인 후 시작한다.
- Stage 2는 Stage 1 contract/transport와 focused test가 승인된 뒤 시작한다.
- Stage 3은 Stage 2 public CLI/SDK/package surface가 승인된 뒤 시작한다.
- Stage 4는 Stage 3 public/maintainer 문서와 preflight가 승인된 뒤 시작한다.
- 최종 보고서와 PR은 Stage 4 검증 보고가 승인된 뒤 작성한다.

## 위험과 대응

- **Protocol race**: initialize result 전 usage request를 보내지 않고 fake transport message order를 검증한다.
- **Process cleanup race**: resolve/reject를 단일 settle 함수로 통합하고 timeout/exit/error test에서 child 종료를 확인한다.
- **Sensitive error echo**: upstream stderr/message는 저장·출력하지 않고 enum code와 고정 message만 사용한다.
- **Schema mismatch**: runtime normalizer, JSON Schema, TypeScript type, docs example을 Stage 1/2 test에서 교차 확인한다.
- **CLI ambiguity**: 무인자와 `usage` alias 외 command를 거부하고 help에서 exact surface를 보여준다.
- **Package regression**: `files` allowlist와 pack denylist를 동시에 검증한다.
- **Historical over-delete**: git removal은 active runtime/test에 한정하고 `mydocs` 과거 기록은 수정하지 않는다.
- **Live data exposure**: live JSON은 pipe로 validator memory에만 전달하고 structural summary만 출력한다.

## 승인 요청 사항

- 4개 Stage 분할과 각 Stage의 파일/삭제 경계
- Stage 1에서 JSON contract와 `docs/` schema를 함께 고정하는 순서
- Stage 2에서 v0.1.0 public API/CLI를 호환 layer 없이 제거하는 breaking 전환
- Stage 3에서 공개 문서와 maintainer release runbook을 분리하는 기준
- Stage 4의 official app-server 및 actual npx structural-only live 검증
- 위 검증 명령과 단계별 커밋 메시지

# Task M020 #32 Stage 4 완료보고서

GitHub Issue: [#32](https://github.com/postmelee/codex-usage-analyzer/issues/32)
구현계획서: [`task_m020_32_impl.md`](../plans/task_m020_32_impl.md)
Stage: 4

## 단계 목적

Stage 1~3에서 구현한 v0.2.0 thin CLI를 실제 package 실행 경계에서 검증한다. Current Node와 Node 20, npm tarball, 로그인된 Codex app-server, local `npx` bin resolution, privacy/supply-chain scan을 모두 확인하되 실제 account usage 값과 raw upstream data는 terminal, 파일, 보고서에 남기지 않는다.

## 산출물

| 파일/영역 | 변경 요약 |
|---|---|
| `mydocs/working/task_m020_32_stage4.md` | runtime/package/live/npx/privacy 검증 결과와 release 전 잔여 위험을 기록했다. |
| `mydocs/plans/task_m020_32_impl.md` | credential scan이 public metadata를 읽는 test를 오탐하지 않도록 publish runtime 기준으로 `src/__tests__` 제외 조건을 명시했다. |
| `mydocs/orders/20260711.md` | #32를 Stage 4 완료, 최종 보고와 PR 승인 대기 상태로 갱신했다. |

Stage 4에서 runtime, test, public document, package metadata 수정이 필요한 제품 결함은 발견되지 않았다.

## 실행 환경

| 항목 | 확인값 |
|---|---|
| Current Node | 24.15.0 |
| npm | 11.12.1 |
| Codex CLI | 0.144.0-alpha.4 |
| Compatibility Node | 20.x, npm registry의 `node@20` runner |
| Package | `codex-usage-analyzer@0.2.0` |

## End-to-end 결과

### Runtime compatibility

- Current Node에서 full suite 34개가 모두 통과했다.
- Node 20 runner에서도 동일한 34개 test가 모두 통과했다.
- Help와 version command는 app-server 로그인 없이 정상 종료했다.
- Node 20 runner의 최초 sandbox 실행은 registry DNS 제한으로 종료됐고, 승인된 normal user network에서 동일 command를 재실행해 통과했다.

### Live app-server

Live command는 parent validator가 child stdout을 메모리에서만 읽고 검증 후 폐기하도록 실행했다. Child stderr는 내용 대신 byte count만 관리했다.

- JSON path는 contract version, root key 4개, summary key 5개가 exact contract와 일치했다.
- Summary value는 모두 nullable non-negative safe integer 규칙을 만족했다.
- Daily usage collection kind와 present row의 key/date/token type이 유효했다.
- Captured timestamp가 parse 가능한 ISO timestamp였다.
- Human path는 heading, metric label 6개, 각 row value 존재, captured timestamp 구조를 만족했다.
- JSON과 human path 모두 stderr byte count는 0이었다.
- Sandbox live 호출은 restricted environment에서 safe error로 종료됐고, 승인된 로그인/network environment에서 동일 structural validator가 통과했다.

실제 token, streak, duration, daily bucket 값과 captured timestamp 원문은 출력하거나 기록하지 않았다.

### Local npx

`npx --yes --package . codex-usage-analyzer --json`을 child process로 실행해 local package 설치, bin resolution, app-server 호출을 한 번에 검증했다.

- Bin resolution과 exit code가 정상이다.
- Contract/root/summary/type/daily collection 검증이 통과했다.
- stdout의 실제 값은 validator 밖으로 출력하지 않았고 stderr byte count는 0이었다.

### Package artifact

`npm pack --dry-run --json` 결과:

| 항목 | 결과 |
|---|---|
| Entry count | 16 |
| Package size | 15,372 bytes |
| Unpacked size | 47,494 bytes |
| Forbidden files | 0 |
| Dry-run tarball residue | 0 |

Tarball은 LICENSE, README, contribution/security 문서, bin, contract/downstream 문서, package metadata, 7개 runtime/type file만 포함한다. `mydocs`, workflow, script, test, removed runtime tree는 포함하지 않는다.

## 본문 변경 정도 / 본문 무손실 여부

- 제품 source, test, public contract/schema, README, workflow는 수정하지 않았다.
- Stage 1~3 behavior와 package artifact는 검증 전후 동일하다.
- 구현계획서의 broad credential scan은 test의 `readFileSync`가 공개 schema와 `package.json`을 읽는 정상 동작까지 match했다. 실제 검증 목적이 publish runtime의 credential access 금지이므로 `src/__tests__` 제외 조건으로 범위만 보정했다.
- Test file match는 private file, auth material, local session 접근이 아니며 runtime credential scan은 match 0건이다.

## 검증 결과

실행 명령:

```bash
npm test
npx --yes --package node@20 node --test
node bin/codex-usage-analyzer.js --help
node bin/codex-usage-analyzer.js --version
npm pack --dry-run --json
node --input-type=module -e '<live JSON CLI structural validator>'
node --input-type=module -e '<live human CLI structural validator>'
node --input-type=module -e '<local npx JSON structural validator>'
rg -n "UsageSnapshot v2|UsageSnapshotV2|analyzeUsage|fixture-sample|profile-baseline|session_jsonl" README.md package.json src scripts docs .github
rg -n -g '!src/__tests__/**' "readFile|keychain|auth\\.json|accessToken|refreshToken|Authorization|ChatGPT-Account-Id|/wham/|experimentalApi" src bin
rg -n '<secret, private-key, local-user-path patterns with token boundary>' README.md CONTRIBUTING.md SECURITY.md package.json docs .github scripts/release-preflight.js mydocs/manual/npm_release_guide.md
npm run release:preflight
node -e '<account-usage schema JSON parse>'
git diff --check
git status --short
```

결과:

| 검증 | 결과 | 근거 |
|---|---|---|
| Current Node full suite | OK | 34 tests, 34 pass, fail 0 |
| Node 20 full suite | OK | 34 tests, 34 pass, fail 0 |
| Help/version no-auth | OK | expected help와 version 0.2.0, account access 없음 |
| Live JSON CLI | OK | contract/root/summary/value/daily/timestamp structural validation |
| Live human CLI | OK | heading, 6 metric rows, timestamp; 실제 값 미출력 |
| Local package npx | OK | bin resolution과 live contract structural validation |
| Package dry run | OK | 16 entries, size/unpacked size 확인, forbidden 0 |
| Active product legacy scan | OK | match 0 |
| Publish runtime credential scan | OK | test 제외 runtime match 0 |
| Sensitive pattern scan | OK | boundary-aware broad scan match 0, preflight 11 files 통과 |
| Account schema | OK | JSON parse 성공 |
| Advisory release preflight | OK | package/version/tree/test/artifact/workflow/guide/sensitive checks 통과 |
| Diff/worktree hygiene | OK | 검증 시작과 제품 검증 종료 시 clean, tarball residue 없음 |

Advisory preflight는 local version 0.2.0이 registry 0.1.0보다 높고 working tree가 clean임을 확인했다. `v0.2.0` tag 미생성만 release 전 예상 WARN이며 FAIL은 없었다.

## 잔여 위험

- GitHub-hosted Node 20 CI는 PR 게시 후 원격 check에서 최종 확인해야 한다.
- npm registry의 `@latest`는 v0.2.0 publish 전까지 기존 release를 가리키므로 published `npx` 검증은 merge 이후 release 절차에 남아 있다.
- `v0.2.0` tag가 아직 없어 strict `--release-ready` preflight는 실행 대상이 아니다.
- Official app-server response가 향후 변경되면 allowlist validator가 safe error로 거부할 수 있으며 새 field 지원은 별도 contract review가 필요하다.
- Live human value의 정확성은 upstream account result를 formatter가 표현하는 경로까지만 검증했다. 실제 account 값을 별도 화면과 대조하거나 기록하지 않았다.

## 다음 단계 영향

- #32의 구현 Stage는 모두 완료됐고 최종 보고서와 PR 게시 절차만 남았다.
- Final report에는 Stage 1~4의 contract, breaking surface, privacy, package, live/npx 검증을 통합한다.
- PR 원격 CI 통과 전에는 merge 준비 완료로 판정하지 않는다.
- Merge 후 release 준비는 `mydocs/manual/npm_release_guide.md` 순서를 따르며 tag, Trusted Publishing, registry/signature/published npx, GitHub Release는 별도 승인된 release 단계에서 수행한다.

## 승인 요청

- Stage 4 end-to-end 검증 결과를 승인하면 최종 보고서 작성과 `publish/task32` PR 게시 단계로 진행한다.

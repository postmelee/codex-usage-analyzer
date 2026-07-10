# Task M020 #32 Stage 2 완료보고서

GitHub Issue: [#32](https://github.com/postmelee/codex-usage-analyzer/issues/32)
구현계획서: [`task_m020_32_impl.md`](../plans/task_m020_32_impl.md)
Stage: 2

## 단계 목적

Stage 1에서 고정한 Account Usage Contract와 app-server transport를 package의 유일한 public CLI/SDK로 전환한다. 동시에 v0.1.0 local parser, snapshot schema, sample/profile baseline, asset discovery, fixture/test를 제거하고 npm artifact를 v0.2.0 thin CLI에 필요한 파일로 축소한다.

## 산출물

| 파일/영역 | 변경 요약 |
|---|---|
| `src/format-account-usage.js` | compact token, duration, streak, bucket count를 표현하는 deterministic human formatter를 추가했다. |
| `src/cli.js` | no-arg/`usage`, `--json`, `--help`, `--version` surface와 safe error output으로 전면 교체했다. |
| `src/index.js` | account usage SDK, error, package/contract constants만 export하도록 교체했다. |
| `src/index.d.ts` | Account Usage Contract, SDK option, error code의 public TypeScript declaration으로 교체했다. |
| `bin/codex-usage-analyzer.js` | unexpected error detail을 출력하지 않는 최종 guard를 적용했다. |
| `package.json` | version 0.2.0, description/keywords, 새 runtime/docs files allowlist로 갱신했다. |
| `src/__tests__/cli.test.js` | human/JSON/help/version/invalid/error redaction/bin resolution test로 재작성했다. |
| `src/__tests__/format-account-usage.test.js` | compact value와 unavailable/zero 구분을 검증한다. |
| `src/__tests__/index.test.js` | exact SDK export와 package metadata/artifact allowlist 정합성을 검증한다. |
| legacy runtime/test/fixture | parser, snapshot, sample/profile baseline, asset fixture, profile smoke를 삭제했다. |

Stage 2 diff는 보고서 제외 46개 파일에 걸쳐 5,045줄을 제거했다. 신규 formatter와 신규 test는 active runtime 검증 범위에 추가됐다.

## 구현 결과

### CLI surface

지원 command는 다음으로 제한했다.

```text
codex-usage-analyzer [usage] [--json]
codex-usage-analyzer [usage] --help
codex-usage-analyzer --version
```

- no args와 `usage`는 동일한 human summary를 출력한다.
- `--json`은 Stage 1 contract를 변형 없이 pretty JSON으로 출력한다.
- help/version은 app-server를 시작하지 않는다.
- unknown command, unknown flag, duplicate/conflicting flag는 account access 없이 usage error로 종료한다.
- known/unknown runtime error 모두 raw upstream detail과 stack을 출력하지 않는다.

### Human formatter

- token은 `14.35B`, `700M`처럼 최대 소수 둘째 자리까지 compact format으로 표시한다.
- duration은 day/hour/minute/second 중 상위 두 단위를 표시한다.
- streak와 daily bucket count는 singular/plural을 구분한다.
- `null`은 `Unavailable`, 실제 0은 `0`/`0 days`로 구분한다.
- ANSI/locale dependency 없이 deterministic plain text를 반환한다.

### SDK와 package

Package root export는 다음 8개로 고정했다.

- `ACCOUNT_USAGE_CONTRACT_VERSION`
- `ACCOUNT_USAGE_SUMMARY_FIELDS`
- `CODEX_USAGE_ERROR_CODES`
- `CodexUsageError`
- `PACKAGE_NAME`
- `PACKAGE_VERSION`
- `readAccountUsage`
- `runCli`

`package.json`, CLI, app-server client metadata는 목표 version 0.2.0과 일치한다. npm files allowlist는 bin, docs, 새 runtime, types와 root public docs만 허용한다.

### Legacy removal

다음 active product 영역을 제거했다.

- local session JSONL parser와 model/activity/token/skill/plugin aggregate
- local Codex home/asset discovery
- UsageSnapshot schema/types/sample producer
- redacted profile baseline comparator와 profile smoke script
- parser, asset, profile, sample fixture와 관련 test

과거 설계 근거인 `mydocs/**`는 수정하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

- CLI/SDK/package는 v0.2.0 breaking change로 의도적으로 호환성을 유지하지 않았다.
- Account Usage Contract와 Stage 1 transport/error semantics는 보존했다.
- Stage 1 focused test는 유지하고 CLI/SDK/formatter/package test를 추가했다.
- README, CI/publish workflow, release preflight는 Stage 3 소유이므로 이번 단계에서 수정하지 않았다. 현재 branch 중간 상태의 README는 v0.1.0 설명을 포함하며 Stage 3 완료 전 public release 대상이 아니다.
- historical `mydocs`와 merged task 기록은 보존했다.

## 검증 결과

실행 명령:

```bash
npm test
node bin/codex-usage-analyzer.js --help
node bin/codex-usage-analyzer.js --version
rg -n "UsageSnapshot v2|UsageSnapshotV2|analyzeUsage|fixture-sample|profile-baseline|session_jsonl" package.json src scripts
npm pack --dry-run --json
node --input-type=module -e '<tarball file denylist validator>'
git diff --check
```

결과:

| 검증 | 결과 | 근거 |
|---|---|---|
| Full v0.2 suite | OK | 34 tests, 34 pass, fail 0 |
| Human CLI | OK | no-arg와 `usage` alias summary test 통과 |
| JSON CLI | OK | parsed output이 injected contract와 deep equal |
| Help/version no-auth path | OK | app-server dependency 미호출과 bin version 0.2.0 확인 |
| Invalid/error redaction | OK | account access 미호출, fixed safe output, synthetic detail 미노출 |
| Formatter | OK | compact/duration/day/null/zero test 통과 |
| SDK root | OK | exact 8 exports와 package version/contract version 확인 |
| Active code legacy scan | OK | `package.json`, `src`, `scripts` match 없음 |
| Package dry run | OK | `codex-usage-analyzer-0.2.0.tgz`, 13 entries, 13,327 bytes |
| Package denylist | OK | tests, `mydocs`, parser, snapshot, fixtures, profile smoke 0개 |
| Diff hygiene | OK | whitespace/error 출력 없음 |

Package dry run은 sandbox 내부 npm cache 권한으로 한 번 실패했으나, 동일 command를 승인된 normal user environment에서 재실행해 성공했다. Source나 npm cache ownership은 변경하지 않았다.

## 잔여 위험

- README는 아직 v0.1.0 user flow와 release runbook을 포함한다. Stage 3 완료 전 npm publish하면 안 된다.
- `.github/workflows/ci.yml`의 old `analyze --json` smoke와 `scripts/release-preflight.js`의 old artifact 기대값은 Stage 3에서 갱신해야 한다.
- `CONTRIBUTING.md`, `SECURITY.md`, downstream integration 문서가 아직 없어 현재 tarball은 13개 파일이다.
- 실제 account usage와 local `npx` execution은 Stage 4 structural-only live 검증 전까지 미검증이다.
- Public TypeScript declaration은 static text와 runtime export test로 확인했으며 standalone TypeScript compiler 검증은 Stage 2 환경에 compiler가 없어 수행하지 않았다.

## 다음 단계 영향

- Stage 3 README는 `analyze` command가 아니라 no-arg/`usage`와 `--json`만 설명해야 한다.
- Release preflight의 required file list를 13개 baseline과 Stage 3 public docs에 맞게 교체해야 한다.
- CI smoke는 auth가 필요 없는 `--help`와 `--version`으로 바꿔야 한다.
- Downstream 문서는 identity-free Account Usage Contract를 그대로 사용하고 GitHub identity/rendering/storage 책임을 별도로 정의해야 한다.
- Stage 3 전체 active product scan에서 README, docs, workflow까지 legacy 표현 zero-match를 달성해야 한다.

## 승인 요청

- Stage 2 CLI/SDK breaking 전환, legacy 제거, package 검증 결과를 승인하면 Stage 3 `사용자·downstream·maintainer 문서 재구성`으로 진행한다.

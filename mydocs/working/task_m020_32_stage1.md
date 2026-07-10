# Task M020 #32 Stage 1 완료보고서

GitHub Issue: [#32](https://github.com/postmelee/codex-usage-analyzer/issues/32)
구현계획서: [`task_m020_32_impl.md`](../plans/task_m020_32_impl.md)
Stage: 1

## 단계 목적

공식 Codex app-server `account/usage/read`를 호출하는 dependency-free stdio transport를 만들고, downstream이 소비할 identity-free Account Usage Contract version 1을 runtime normalizer, Markdown, JSON Schema로 함께 고정한다.

이번 단계에서는 기존 v0.1 CLI/export/parser를 변경하지 않고 새 contract와 transport를 독립적으로 추가했다. 실제 public CLI/SDK 전환과 legacy 제거는 Stage 2 범위다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/errors.js` | raw upstream detail을 노출하지 않는 stable error code/message를 정의했다. |
| `src/app-server-client.js` | app-server spawn, stable handshake, account usage request, timeout/cleanup을 구현했다. |
| `src/account-usage.js` | allowlist normalizer와 contract version 1 document 생성을 구현했다. |
| `src/__tests__/app-server-client.test.js` | protocol 순서, ENOENT, RPC error redaction, malformed JSON, early exit, timeout을 검증했다. |
| `src/__tests__/account-usage.test.js` | nullable semantics, allowlist, integer/date validation, schema alignment을 검증했다. |
| `docs/account-usage-contract.md` | field 의미, null semantics, forward compatibility, privacy boundary를 공식화했다. |
| `docs/account-usage.schema.json` | downstream 검증용 Draft-07 JSON Schema를 추가했다. |

Stage 1 신규 source/test/docs는 보고서 제외 7개 파일, 940줄이다.

## 구현 결과

### App-server protocol

Transport는 shell 없이 `codex app-server`를 spawn하고 다음 순서만 사용한다.

1. `initialize` request
2. initialize result 확인
3. `initialized` notification
4. `account/usage/read` request
5. account usage result 수신

`experimentalApi` capability, `account/read`, internal auth method, `/wham` endpoint는 사용하지 않는다. stderr는 drain만 하고 error에 복사하지 않는다.

모든 성공/실패 경로는 timer와 line reader를 정리하고 stdin을 닫은 뒤 child를 종료한다. process-level one-shot error/exit listener는 늦은 child event가 unhandled event가 되지 않도록 실제 event까지 유지한다.

### Safe error contract

다음 failure category를 fixed code/message로 변환한다.

- invalid timeout
- Codex executable unavailable
- app-server start failure 또는 early exit
- bounded timeout
- malformed JSON/protocol ordering
- JSON-RPC error
- invalid account usage response

Upstream RPC message와 spawn error detail은 `cause` 또는 public message에 보존하지 않는다. Numeric RPC code만 optional diagnostic category로 허용한다.

### Account usage normalization

Root output은 다음 field로 고정했다.

- `contractVersion`
- `capturedAt`
- `summary`
- `dailyUsageBuckets`

Summary 5개 field는 항상 존재하며 missing/null은 `null`로 정규화한다. Daily bucket의 missing/null은 `null`, 빈 배열은 `[]`로 유지한다. Unknown root/summary/bucket field는 drop한다.

숫자는 non-negative JavaScript safe integer만 허용한다. Date-only field는 실제 calendar date인 `YYYY-MM-DD`만 허용한다. 이 규칙은 runtime test와 JSON Schema에서 교차 확인한다.

## 본문 변경 정도 / 본문 무손실 여부

- 기존 `README.md`, `package.json`, CLI, SDK export, parser, fixture, profile baseline은 수정하지 않았다.
- Stage 1은 additive 변경으로 기존 47개 test를 보존했다.
- 공식 문서 루트 `docs/`에는 수행계획서에서 승인된 account usage contract와 schema만 추가했다.
- synthetic test/example만 사용했고 실제 account usage, credential, local path를 기록하지 않았다.

## 검증 결과

실행 명령:

```bash
node --test src/__tests__/account-usage.test.js src/__tests__/app-server-client.test.js
npm test
node -e 'JSON.parse(require("node:fs").readFileSync("docs/account-usage.schema.json", "utf8"))'
rg -n "contractVersion|capturedAt|lifetimeTokens|peakDailyTokens|longestRunningTurnSec|currentStreakDays|longestStreakDays|dailyUsageBuckets" src/account-usage.js docs/account-usage-contract.md docs/account-usage.schema.json
rg -n "readFile|keychain|auth\.json|accessToken|refreshToken|Authorization|ChatGPT-Account-Id|/wham/|experimentalApi" src/errors.js src/app-server-client.js src/account-usage.js
git diff --check
```

결과:

| 검증 | 결과 | 근거 |
|---|---|---|
| Focused contract/transport test | OK | 21 tests, 21 pass, fail 0 |
| Full regression | OK | 68 tests, 68 pass, fail 0 |
| Stable protocol order | OK | initialize result 이후 initialized와 account usage request를 보내는 message sequence 확인 |
| Error redaction | OK | synthetic upstream detail이 public error string에 포함되지 않음 |
| Timeout/process cleanup | OK | unresponsive fake child timeout 후 stop 확인 |
| Nullable/allowlist contract | OK | missing/null/empty, unknown field drop, invalid integer/date test 통과 |
| Runtime/schema alignment | OK | root/summary required field와 safe integer maximum 교차 확인 |
| JSON Schema parse | OK | Draft-07 schema JSON parse 성공 |
| Credential boundary scan | OK | 대상 runtime 3개 파일에서 match 없음 |
| Diff hygiene | OK | whitespace/error 출력 없음 |

구현 중 invalid timeout이 동기 throw로 발생해 rejected Promise 계약과 달랐던 초기 test 1건을 발견했다. Transport entrypoint를 `async`로 통일한 뒤 focused test 전체가 통과했다.

## 잔여 위험

- 실제 installed Codex app-server와의 live call은 Stage 4에서 structural-only 방식으로 검증한다.
- 신규 `readAccountUsage()`는 아직 package root에서 export되지 않으며 Stage 2에서 public SDK로 전환한다.
- app-server client metadata version은 목표 package version 0.2.0을 사용하지만 현재 `package.json`은 Stage 2 전까지 0.1.0이다.
- subprocess가 SIGTERM과 stdin close를 모두 무시하는 비정상 환경은 fake test 범위 밖이다. 기본 Codex app-server와의 실제 종료 동작은 Stage 4에서 확인한다.

## 다음 단계 영향

- Stage 2는 이 contract와 error code를 public SDK/type/CLI의 단일 source로 사용한다.
- Stage 2에서 v0.1.0 local parser와 old tests를 제거한 뒤 신규 test만으로 full suite를 재구성한다.
- Human formatter는 `null`을 0으로 표시하지 않고 unavailable로 표현해야 한다.
- Package files allowlist에 `docs/`, 새 runtime/types를 포함하고 tests, `mydocs`, old parser/schema/fixture를 제외해야 한다.

## 승인 요청

- Stage 1 contract, transport, 검증 결과를 승인하면 Stage 2 `CLI/SDK 전환과 legacy 제거`로 진행한다.

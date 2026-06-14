# Task M010 #3 Stage 2 보고서

GitHub Issue: [#3](https://github.com/postmelee/codex-usage-analyzer/issues/3)
구현계획서: [`task_m010_3_impl.md`](../plans/task_m010_3_impl.md)
Stage: 2

## 단계 목적

Stage 2는 Codex session JSONL source를 discovery/streaming parse하고, `token_count` 이벤트의 `last_token_usage`를 기준으로 `usage.totalTokens`, `usage.peakDailyTokens`, `usage.tokenBreakdown`, `usage.daily` aggregate를 계산하는 단계다. production analyzer 연결은 Stage 4로 남기고, 이번 단계에서는 parser 모듈과 fixture 기반 단위 테스트로 계약을 고정했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/parser/codex-home.js` | `codexHome` source를 option, `CODEX_HOME`, 기본 home 후보 순서로 해석하는 helper를 추가했다. |
| `src/parser/session-jsonl.js` | `<codex-home>/sessions` 하위 `.jsonl` discovery와 line streaming parser를 추가했다. parse/file error는 count용 event로만 전달한다. |
| `src/parser/token-aggregate.js` | `token_count` 이벤트의 `last_token_usage`를 합산해 total, breakdown, daily, peak daily와 count/status diagnostic을 생성한다. |
| `src/__tests__/parser-token.test.js` | synthetic session JSONL fixture 기반 token/daily aggregate와 source missing unavailable baseline을 검증한다. diagnostic raw path/line detail 비노출도 함께 고정했다. |
| `src/index.d.ts` | Stage 4 parser integration에 사용할 `codexHome`, `now` option 타입을 추가했다. |
| `mydocs/working/task_m010_3_stage2.md` | Stage 2 구현 내용, 검증 결과, 다음 단계 영향을 기록했다. |

## 본문 변경 정도 / 본문 무손실 여부

production `analyzeUsage()`와 CLI 출력 계약은 아직 변경하지 않았다. 기본 CLI는 #2에서 만든 unavailable baseline을 유지하며, 새 parser aggregate는 별도 모듈과 테스트에서만 호출된다. fixture sample 경로도 production fallback으로 연결하지 않았다.

## 구현 메모

- session discovery diagnostic에는 raw file path를 넣지 않고 code/severity만 남겼다.
- malformed JSONL line은 raw line이나 line number를 aggregate diagnostic에 보존하지 않고 count만 증가시킨다.
- token total은 `total_tokens`가 있으면 우선 사용하고, 없으면 allowlist breakdown field 합산으로 계산한다.
- `cacheWriteTokens`처럼 source field가 없는 breakdown은 `null`로 유지한다.
- timestamp가 유효한 token event만 daily bucket에 반영하며, bucket key는 UTC `YYYY-MM-DD` 형식으로 정규화한다.

## 검증 결과

실행 명령:

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json
git diff --check
```

추가 직접 확인:

```bash
node -e 'import("./src/parser/token-aggregate.js").then(async ({ aggregateTokenUsageFromCodexHome }) => { const result = await aggregateTokenUsageFromCodexHome({ codexHome: new URL("./src/__tests__/fixtures/parser", import.meta.url).pathname }); console.log(JSON.stringify({ usage: result.usage, diagnostics: result.diagnostics }, null, 2)); })'
```

결과:

- OK: `npm test` 통과. 총 12개 테스트가 모두 pass했다.
- OK: 기본 `node bin/codex-usage-analyzer.js analyze --json` 실행 성공. Stage 4 통합 전이므로 `local_parser_not_implemented` unavailable baseline이 유지된다.
- OK: `git diff --check` 통과.
- OK: fixture direct aggregate 결과는 `totalTokens=6780`, `peakDailyTokens=3680`, daily bucket 3개로 계산됐다.
- OK: aggregate diagnostic은 `status=ok`, `source=option`, `filesScanned=3`, `entriesScanned=7`, `tokenEventsWithUsage=5`, `malformedLines=1`로 count/status 중심이다.
- OK: parser diagnostic에 raw local path, raw line, session id, prompt/response 원문을 출력하지 않는 것을 test와 수동 확인으로 검증했다.

## 잔여 위험

- parser는 아직 production analyzer에 연결되지 않았다. production snapshot 반영과 CLI option 경로는 Stage 4에서 처리한다.
- Stage 2는 token/daily만 다룬다. `models`, `activity` 필드가 sample 값으로 채워지지 않도록 Stage 3에서도 unavailable/null 기준을 유지해야 한다.
- 실제 Codex JSONL shape가 추가 alias를 쓰는 경우 Stage 3-5 smoke 과정에서 allowlist field를 보강해야 할 수 있다.

## 다음 단계 영향

- Stage 3은 `readSessionJsonlEntries()`와 fixture layout을 재사용해 model/activity aggregate를 구현한다.
- Stage 3 model aggregate는 token aggregate와 동일하게 raw session id, cwd, title, prompt/response를 출력하지 않아야 한다.
- Stage 4 통합 전까지 기본 CLI unavailable baseline은 유지한다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3 `model/activity aggregate 구현`으로 진행한다.

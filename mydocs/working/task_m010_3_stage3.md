# Task M010 #3 Stage 3 보고서

GitHub Issue: [#3](https://github.com/postmelee/codex-usage-analyzer/issues/3)
구현계획서: [`task_m010_3_impl.md`](../plans/task_m010_3_impl.md)
Stage: 3

## 단계 목적

Stage 3은 Stage 2의 session JSONL discovery/streaming parser를 재사용해 `models`와 `activity` aggregate를 구현하는 단계다. model ranking은 token 기준으로 계산하고, activity는 session file count, duration, daily streak, reasoning effort를 계산한다. `fastModePercent`는 local source 확정 전이라 sample 값으로 채우지 않고 `null`과 diagnostic으로 유지했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/parser/model-aggregate.js` | `token_count` 이벤트의 model별 total token, usage count, token breakdown, favorite model ranking을 계산한다. |
| `src/parser/activity-aggregate.js` | session file 수 기반 `totalThreads`, duration max, token usage date 기반 streak, effort distribution을 계산한다. |
| `src/parser/session-jsonl.js` | token/model/activity aggregate가 공유할 `normalizeSessionTokenCountEvent()`를 추가했다. |
| `src/parser/token-aggregate.js` | token total, breakdown, UTC date helper를 model/activity aggregate가 재사용할 수 있도록 export했다. |
| `src/__tests__/parser-activity.test.js` | model/activity aggregate fixture expected value, missing source baseline, diagnostic privacy를 검증한다. |
| `mydocs/working/task_m010_3_stage3.md` | Stage 3 구현 내용, 검증 결과, 다음 단계 영향을 기록했다. |

## 본문 변경 정도 / 본문 무손실 여부

production `analyzeUsage()`와 CLI 출력은 아직 변경하지 않았다. 기본 CLI는 #2 unavailable baseline을 유지한다. Stage 3의 새 aggregate는 parser 모듈과 전용 테스트에서만 호출되며, fixture sample이나 production fallback 경로와 섞지 않았다.

## 구현 메모

- model aggregate는 `payload.model`이 있는 `token_count` 이벤트만 사용한다.
- model ranking은 `totalTokens` 내림차순, `usageCount` 내림차순, model 이름 오름차순으로 정렬한다.
- model `displayName`은 source가 없으므로 `null`로 둔다.
- activity `totalThreads`는 safe thread title/session id 대신 session JSONL file 수로 계산한다.
- streak는 `last_token_usage` total이 0보다 큰 UTC date set 기준으로 계산한다.
- reasoning effort는 non-null effort distribution의 최다 값을 사용한다. 동률이면 먼저 관측된 값을 선택한다.
- `fastModePercent`는 mode 후보 count만 diagnostic에 남기고 snapshot 값은 `null`로 유지한다.

## 검증 결과

실행 명령:

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json
git diff --check
```

추가 직접 확인:

```bash
node -e 'const home = new URL("./src/__tests__/fixtures/parser", import.meta.url).pathname; const [{ aggregateModelUsageFromCodexHome }, { aggregateActivityFromCodexHome }] = await Promise.all([import("./src/parser/model-aggregate.js"), import("./src/parser/activity-aggregate.js")]); const models = await aggregateModelUsageFromCodexHome({ codexHome: home }); const activity = await aggregateActivityFromCodexHome({ codexHome: home, now: "2026-06-12T23:59:59.000Z" }); console.log(JSON.stringify({ models: models.models, modelDiagnostics: models.diagnostics, activity: activity.activity, activityDiagnostics: activity.diagnostics }, null, 2));'
```

결과:

- OK: `npm test` 통과. 총 15개 테스트가 모두 pass했다.
- OK: 기본 `node bin/codex-usage-analyzer.js analyze --json` 실행 성공. Stage 4 통합 전이므로 `local_parser_not_implemented` unavailable baseline이 유지된다.
- OK: `git diff --check` 통과.
- OK: model aggregate는 `favoriteModel.model=gpt-5-codex`, `favoriteModel.totalTokens=5230`, `items.length=2`로 계산됐다.
- OK: activity aggregate는 `longestTaskDurationMs=240000`, `currentStreakDays=3`, `longestStreakDays=3`, `reasoningEffort=high`, `reasoningEffortPercent=40`, `totalThreads=3`으로 계산됐다.
- OK: `fastModePercent`는 `null`이고 diagnostic은 `unavailableFields=["fastModePercent"]`, `fastModeReason=source_unconfirmed`를 반환한다.
- OK: model/activity diagnostic에 raw local path, raw line, session id, prompt/response 원문을 출력하지 않는 것을 test와 수동 확인으로 검증했다.

## 잔여 위험

- parser aggregate는 아직 production `analyzeUsage()`에 연결되지 않았다. Stage 4에서 usage/model/activity를 하나의 snapshot으로 병합하고 schema validation을 통과시켜야 한다.
- `fastModePercent`는 이번 단계에서 의도적으로 계산하지 않았다. 실제 local source 의미가 확정되기 전까지 null과 diagnostic을 유지해야 한다.
- 실제 Codex JSONL에서 model/effort/duration field alias가 다르면 Stage 5 smoke에서 allowlist 확장이 필요할 수 있다.

## 다음 단계 영향

- Stage 4는 `usage`, `models`, `activity` aggregate를 production analyzer에 통합한다.
- Stage 4 CLI/README 갱신 시 source 없음 baseline과 parser 성공 output을 명확히 구분해야 한다.
- Stage 4에서도 fixture sample path가 production fallback으로 유입되지 않도록 regression test를 유지해야 한다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 Stage 4 `analyzer integration, CLI/README, regression hardening`으로 진행한다.

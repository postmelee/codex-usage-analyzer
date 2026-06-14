# Task M010 #3 Stage 4 보고서

GitHub Issue: [#3](https://github.com/postmelee/codex-usage-analyzer/issues/3)
구현계획서: [`task_m010_3_impl.md`](../plans/task_m010_3_impl.md)
Stage: 4

## 단계 목적

Stage 4는 Stage 2-3 parser aggregate를 production `analyzeUsage()` path에 연결하고, CLI/README/test를 실제 parser 기준으로 정리하는 단계다. source가 없을 때는 sample fixture를 반환하지 않고 unavailable baseline을 유지하며, source가 있을 때는 session JSONL aggregate로 `usage`, `models`, `activity` core fields를 채운다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/analyze.js` | token/model/activity aggregate를 `UsageSnapshot v2`로 병합하고, parser/source/field별 diagnostic을 생성하도록 연결했다. |
| `src/cli.js` | `analyze --json --codex-home <path>` 옵션을 추가하고, `--fixture-sample`은 sample 전용 경로로 유지했다. |
| `src/index.d.ts` | `codexHome` option 설명을 실제 parser source discovery 옵션으로 갱신했다. |
| `src/__tests__/analyze.test.js` | source missing baseline, parser fixture production snapshot, fixture/sample 분리, diagnostic privacy를 검증한다. |
| `src/__tests__/cli.test.js` | `--codex-home` parser CLI, source missing CLI, sample-only CLI, invalid flag handling을 검증한다. |
| `README.md` | production parser source, unavailable baseline, parser fixture smoke, sample fixture 경계를 설명했다. |
| `mydocs/working/task_m010_3_stage4.md` | Stage 4 구현 내용, 검증 결과, 다음 단계 영향을 기록했다. |

## 본문 변경 정도 / 본문 무손실 여부

README의 CLI/SDK/Tests/Status 설명을 실제 parser integration 기준으로 갱신했다. 기존 sample fixture 설명은 삭제하지 않고 “fixture-only” 경계가 더 분명하게 보이도록 유지했다. production path는 더 이상 `local_parser_not_implemented`를 사용하지 않으며, source missing은 `session_jsonl_not_found`와 unavailable fields diagnostic으로 표현한다.

## 구현 메모

- `analyzeUsage()`는 parser aggregate가 `ok`인 field만 snapshot에 반영한다.
- skills/plugins는 아직 local source가 없으므로 `null`/empty baseline과 `local_source_not_identified` diagnostic을 유지한다.
- activity의 `fastModePercent`는 Stage 3 결정대로 `null`이며 `activity.fastModePercent` unavailable field로 남긴다.
- CLI `--codex-home <path>`는 tests/smoke용 source root 주입 경로다. `--fixture-sample`은 여전히 packaged sample snapshot만 반환한다.
- 실제 CLI smoke raw JSON은 작업 문서에 붙이지 않았다. schema validation과 diagnostic status만 기록했다.

## 검증 결과

실행 명령:

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json
node bin/codex-usage-analyzer.js analyze --json --fixture-sample
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser
rg -n "fixture-sample|codexUsageAnalyzer.fixture|local_parser_not_implemented|token_count" README.md src
git diff --check
```

개인 데이터 노출 방지를 위해 CLI stdout은 임시 파일로 redirect한 뒤 schema와 핵심 diagnostic만 확인했고, 검증 후 임시 파일은 삭제했다.

결과:

- OK: `npm test` 통과. 총 18개 테스트가 모두 pass했다.
- OK: 기본 `node bin/codex-usage-analyzer.js analyze --json` 실행 성공. 출력은 `UsageSnapshot v2` schema valid이고 sample fixture marker가 없다.
- OK: `node bin/codex-usage-analyzer.js analyze --json --fixture-sample` 실행 성공. 출력은 schema valid이고 sample fixture marker가 있다.
- OK: `node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser` 실행 성공. 출력은 schema valid이고 sample fixture marker가 없다.
- OK: parser fixture production snapshot은 `usage.totalTokens=6780`, `models.favoriteModel.model=gpt-5-codex`, `activity.longestStreakDays=3`을 반환한다.
- OK: `rg` 확인에서 `local_parser_not_implemented`는 no matches였다. `codexUsageAnalyzer.fixture`는 packaged sample fixture와 sample-only tests에만 남아 있다.
- OK: `git diff --check` 통과.
- OK: production parser output과 diagnostic에 raw local path, raw JSONL line, session id, prompt/response 원문을 출력하지 않는 것을 tests와 수동 확인으로 검증했다.

## 잔여 위험

- 기본 CLI smoke는 실제 local session source 크기에 따라 시간이 걸릴 수 있다. Stage 5 실제 환경 smoke에서 성능과 privacy를 다시 확인해야 한다.
- skills/plugins aggregate source는 아직 구현하지 않았으므로 unavailable baseline으로 유지된다.
- `fastModePercent`는 source 의미가 확정되지 않아 `null`과 diagnostic으로 남아 있다.

## 다음 단계 영향

- Stage 5는 실제 환경 smoke를 다시 실행하되 raw JSON을 보고서에 붙이지 않고 schema/privacy 판정만 기록한다.
- Stage 5 final report에는 #4-#6 handoff로 skills/plugins/profile/API 외부 source와 remaining unavailable field를 정리해야 한다.
- PR 전 README와 CLI test가 production parser와 fixture sample 경계를 계속 보장하는지 최종 확인한다.

## 승인 요청

- Stage 4 산출물과 검증 결과를 승인하면 Stage 5 `실제 환경 smoke와 최종 정리`로 진행한다.

# Task M010 #3 Stage 5 보고서

GitHub Issue: [#3](https://github.com/postmelee/codex-usage-analyzer/issues/3)
구현계획서: [`task_m010_3_impl.md`](../plans/task_m010_3_impl.md)
Stage: 5

## 단계 목적

Stage 5는 실제 환경 smoke를 수행하고, Stage 1-4 산출물이 실제 Codex session source에서 schema/privacy 기준을 지키는지 확인하는 단계다. smoke 중 실제 `token_count` shape가 fixture 초기 계약과 다른 alias를 사용하는 것을 확인해 `payload.info.last_token_usage`와 `payload.info.total_token_usage`를 parser에 추가 지원했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/parser/session-jsonl.js` | 실제 session JSONL shape에 맞춰 `payload.info.last_token_usage`, `payload.info.total_token_usage` alias를 지원했다. |
| `src/__tests__/fixtures/parser/sessions/2026/06/12/evening.jsonl` | nested `payload.info` token usage fixture를 추가해 실제 shape 회귀를 고정했다. |
| `src/__tests__/fixtures/parser/README.md` | parser fixture allowlist에 nested `payload.info.*token_usage` alias를 추가했다. |
| `mydocs/working/task_m010_3_stage5.md` | Stage 5 smoke, privacy review, alias 보강 결과를 기록했다. |
| `mydocs/report/task_m010_3_report.md` | 전체 task 최종 결과와 PR 게시 전 승인 사항을 정리했다. |
| `mydocs/orders/20260614.md` | #3 오늘할일 상태를 완료로 갱신했다. |

## 본문 변경 정도 / 본문 무손실 여부

production snapshot 계약은 변경하지 않았다. parser 입력 alias만 확장했으며, snapshot/diagnostic에는 raw local path, raw line, session id, prompt/response 원문을 추가하지 않았다. README는 Stage 4에서 이미 갱신했으므로 Stage 5에서 추가 수정하지 않았다.

## 실제 Shape 보강

- 실제 `token_count` payload는 token usage가 `payload.info.last_token_usage`와 `payload.info.total_token_usage` 아래에 들어오는 case가 있었다.
- parser는 기존 top-level `payload.last_token_usage`를 우선하고, 없을 때 nested `payload.info.last_token_usage`를 읽도록 보강했다.
- fixture 한 건을 nested shape로 바꿨지만 token 총량, daily bucket, model/activity expected value는 유지했다.

## 검증 결과

실행 명령:

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json
node bin/codex-usage-analyzer.js analyze --json --fixture-sample
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser
rg -n "local_parser_not_implemented" README.md src
git diff --check
```

개인 데이터 노출 방지를 위해 실제 CLI stdout은 임시 파일로 redirect한 뒤 schema/privacy scanner로만 확인했고, 검증 후 임시 파일은 삭제했다.

결과:

- OK: `npm test` 통과. 총 18개 테스트가 모두 pass했다.
- OK: 실제 `node bin/codex-usage-analyzer.js analyze --json` smoke 통과. 출력은 `UsageSnapshot v2` schema valid이며 sample fixture marker가 없다.
- OK: 실제 smoke privacy review 통과. raw local path, credential-like value, prompt/response key가 출력에 없었다.
- OK: 실제 smoke에서 `usage`와 `activity`는 parsed 상태가 됐다.
- OK: 실제 smoke에서 `models`는 실제 token event에 model field가 없어 `no_model_events` unavailable 상태로 남았다.
- OK: `node bin/codex-usage-analyzer.js analyze --json --fixture-sample` smoke 통과. sample marker가 있는 fixture-only output이다.
- OK: `node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser` smoke 통과. sample marker 없이 parser fixture aggregate가 반환된다.
- OK: `rg -n "local_parser_not_implemented" README.md src`는 no matches였다.
- OK: `git diff --check` 통과.

## 잔여 위험

- 실제 local session source에서 model 이름 field가 token event에 없어 `models`는 unavailable로 남는다. 모델별 집계는 별도 source 탐색 또는 다른 event alias 확인이 필요하다.
- skills/plugins source는 아직 구현하지 않아 unavailable baseline이다.
- `fastModePercent`는 source 의미가 확정되지 않아 `null`과 diagnostic으로 유지된다.

## 다음 단계 영향

- 최종 보고서 승인 후 PR 게시 절차로 진행한다.
- 후속 이슈에서는 모델 source, skills/plugins source, profile/API source를 별도 scope로 다루는 것이 안전하다.

## 승인 요청

- Stage 5 산출물과 검증 결과를 승인하면 PR 게시 절차로 진행한다.

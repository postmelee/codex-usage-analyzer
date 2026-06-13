# Task M010 #3 Stage 1 보고서

GitHub Issue: [#3](https://github.com/postmelee/codex-usage-analyzer/issues/3)
구현계획서: [`task_m010_3_impl.md`](../plans/task_m010_3_impl.md)
Stage: 1

## 단계 목적

Stage 1은 실제 parser 구현 전에 source 계약과 fixture layout을 고정하는 단계다. session JSONL parser가 읽을 synthetic fixture를 만들고, fixture에 raw private content나 credential-like value가 들어가지 않도록 test guard를 추가했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/__tests__/fixtures/parser/README.md` | parser fixture의 allowlist field, 금지 데이터, expected aggregate coverage를 문서화했다. |
| `src/__tests__/fixtures/parser/sessions/2026/06/10/morning.jsonl` | normal token count, unknown event ignore, multi-model ranking 후보 fixture를 추가했다. |
| `src/__tests__/fixtures/parser/sessions/2026/06/11/afternoon.jsonl` | missing optional breakdown field와 malformed JSONL line fixture를 추가했다. |
| `src/__tests__/fixtures/parser/sessions/2026/06/12/evening.jsonl` | multi-day daily/streak와 model ranking 후보 fixture를 추가했다. |
| `src/__tests__/analyze.test.js` | parser fixture 디렉터리에 private path, credential-like value가 없는지 검증하는 test를 추가했다. |
| `mydocs/working/task_m010_3_stage1.md` | Stage 1 구현 내용, 검증 결과, 다음 단계 영향을 기록했다. |

## 본문 변경 정도 / 본문 무손실 여부

production analyzer, CLI, README 본문은 수정하지 않았다. 기존 `analyzeUsage()` 동작과 `--fixture-sample` 경로도 변경하지 않았다. 테스트 파일에는 parser fixture privacy guard만 추가했다.

## Fixture Contract

- fixture는 synthetic session JSONL만 사용한다.
- fixture allowlist field는 `timestamp`, `type`, `payload.type`, `payload.model`, `payload.effort`, `payload.mode`, `payload.duration_ms`, `payload.last_token_usage`, `payload.total_token_usage`로 제한했다.
- Stage 2-3 parser 구현이 확인할 대표 case를 포함했다.
  - normal `token_count` aggregation
  - missing optional token breakdown field
  - malformed JSONL line
  - unknown event ignored
  - multi-day daily buckets
  - multi-model ranking
  - effort and fast-mode distribution candidates
- `capturedAt`, `codexHome`, `now` option 확장은 Stage 2-4에서 구현하되, deterministic parser tests에 필요하다는 계약을 fixture README와 구현계획서에 남겼다.

## 검증 결과

실행 명령:

```bash
npm test
rg -n "/Users/|/home/|/private/var/|access_token|refresh_token|Bearer |sk-|github_pat_" src/__tests__/fixtures/parser
git diff --check
```

결과:

- OK: `npm test` 통과. 총 10개 테스트가 모두 pass했다.
- OK: fixture privacy guard test가 pass했다.
- OK: `rg` privacy check는 no matches였다. `rg`는 no-match 상황에서 exit code 1을 반환하므로, 출력 없음과 test guard 통과를 함께 pass 근거로 사용했다.
- OK: `git diff --check` 통과.
- OK: fixture와 보고서에 raw local absolute path, credential-like value, account identifier, prompt/response 원문을 추가하지 않았다.

## 잔여 위험

- Stage 1 fixture는 parser contract 후보만 고정한다. 실제 parser가 지원할 JSONL shape와 field alias는 Stage 2에서 구현하며 필요 시 fixture를 보강해야 한다.
- malformed line 처리와 cumulative token 방어는 fixture에 case를 넣었지만, 실제 diagnostic shape는 Stage 2에서 확정한다.
- model/activity aggregate의 exact expected values는 Stage 3 parser tests에서 고정한다.

## 다음 단계 영향

- Stage 2는 이 fixture layout을 사용해 session discovery, line streaming parse, token/daily aggregate를 구현한다.
- Stage 2 diagnostic은 raw file path나 raw line을 출력하지 않고 count/status 중심으로 작성해야 한다.
- Stage 3은 multi-model/multi-day fixture를 이어받아 model/activity aggregate를 deterministic하게 검증한다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2로 진행한다.

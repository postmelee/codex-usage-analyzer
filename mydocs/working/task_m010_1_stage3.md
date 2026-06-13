# Task M010 #1 Stage 3 완료 보고서

GitHub Issue: [#1](https://github.com/postmelee/codex-usage-analyzer/issues/1)
구현계획서: [`task_m010_1_impl.md`](../plans/task_m010_1_impl.md)
Stage: 3

## 단계 목적

Stage 3의 목적은 Stage 2 source inventory를 바탕으로 `UsageSnapshot v2` 필드별 source 우선순위, confidence, fallback/null policy, privacy note, follow-up issue를 확정하는 것이다. 추가로 Codex Desktop 원격 profile API와 `tokscale` 참고 구현이 parser 전략에 어떤 의미를 갖는지 분리해 기록했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/tech/task_m010_1_codex_data_source_inventory.md` | Codex Desktop 원격 profile API 참고, `openai/codex` 대조 결과, `tokscale` Codex JSONL parser 참고 구현, Stage 3 필드별 mapping/fallback 정책, source 우선순위 결론을 추가했다. |
| `mydocs/orders/20260614.md` | 날짜 변경 후 현재 작업 보드를 추가하고 #1 Stage 3 진행 상태를 기록했다. |
| `mydocs/working/task_m010_1_stage3.md` | Stage 3 완료 보고서를 작성했다. |

## 본문 변경 정도 / 본문 무손실 여부

기존 Stage 1-2 조사 내용은 유지하고 Stage 3 섹션을 추가했다. 문서의 기존 schema 관찰, Stage 2 inventory, 결정/보류/적용 영향 섹션은 필요한 문장만 보강했으며 원문을 대량 재작성하지 않았다. 코드와 `UsageSnapshot v2` 계약은 변경하지 않았다.

## 검증 결과

실행 명령:

```bash
git diff --check
```

결과:

- OK: 공백 오류 없이 통과했다.

추가 수동 확인:

- OK: Stage 3 mapping 표에 `source 우선순위`, `confidence`, `fallback/null policy`, `privacy note`, `follow-up` 컬럼이 포함됐다.
- OK: token totals, token breakdown, daily, models, activity, skills, plugins, avatar/pet, extensions 항목이 모두 mapping 표에 포함됐다.
- OK: 실제 사용자 경로, credential 원문, token 원문, account identifier 원문을 추가하지 않았다.
- OK: remote profile API와 `tokscale`는 analyzer 기본 source가 아니라 의미론 비교 기준과 parser 참고 구현으로 분리했다.

## 잔여 위험

- `token_count` event schema와 fork/replay dedup key는 후속 #3 parser 테스트에서 실제 fixture로 고정해야 한다.
- `thread_dynamic_tools`는 아직 actual invocation인지 enabled/available catalog인지 확정하지 않았다. #4에서 별도 검증이 필요하다.
- remote profile API의 service-side 지표와 local parser 지표는 정의 차이가 있을 수 있다. #6 smoke baseline에서 차이를 기록해야 한다.
- required numeric field source unavailable 시 zero-value와 diagnostic을 조합하는 구체 extension shape는 #2/#3에서 정해야 한다.

## 다음 단계 영향

- Stage 4에서는 후속 이슈 #2-#6의 범위가 Stage 3 mapping과 충돌하지 않는지 점검한다.
- #2는 production analyzer가 fixture 값을 반환하지 않도록 path 분리와 diagnostic 정책을 반영해야 한다.
- #3은 session JSONL `token_count.last_token_usage` 중심 parser와 SQLite fallback 전략을 구현 범위로 잡아야 한다.
- #4는 skills/plugins ranking에서 actual invocation과 catalog presence를 분리해야 한다.
- #5는 avatar/pet safe output 정책을 유지해야 한다.
- #6은 remote profile API를 analyzer 기본 동작으로 만들지 않고 redacted baseline 비교에만 사용해야 한다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 Stage 4로 진행한다.

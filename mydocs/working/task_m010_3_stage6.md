# Task M010 #3 Stage 6 보고서

GitHub Issue: [#3](https://github.com/postmelee/codex-usage-analyzer/issues/3)
구현계획서: [`task_m010_3_impl.md`](../plans/task_m010_3_impl.md)
Stage: 6

## 단계 목적

`junhoyeo/tokscale`와 Codex Desktop profile 화면 비교에서 확인한 차이를 PR 게시 전에 보강한다. 실제 Codex session JSONL에서 `token_count`가 model을 직접 담지 않고 같은 session file의 `turn_context`가 model을 담는 흐름을 지원해 `models`와 `favoriteModel`을 실제 local parser 출력에 연결하고, Codex Desktop profile streak와 local session JSONL streak 차이를 문서화한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/plans/task_m010_3_impl.md` | Stage 6 범위, 검증 명령, 의존성, 승인 항목 추가 |
| `src/parser/session-jsonl.js` | JSONL entry에 내부 file context를 유지하고 model alias 추출 helper 추가 |
| `src/parser/model-aggregate.js` | file boundary별 current model을 추적해 model-less `token_count`에 상속 |
| `src/__tests__/fixtures/parser/README.md` | model alias와 `turn_context` fixture coverage 설명 추가 |
| `src/__tests__/fixtures/parser/sessions/2026/06/12/evening.jsonl` | `turn_context` model + model-less `token_count` case 추가 |
| `src/__tests__/parser-token.test.js` | fixture entry count 변경 반영 |
| `src/__tests__/parser-activity.test.js` | model context/inherited model diagnostics 검증 추가 |
| `mydocs/report/task_m010_3_report.md` | 최종 보고서를 Stage 6 포함 상태로 갱신 |
| `mydocs/orders/20260614.md` | #3 비고를 Stage 6 보강 완료 상태로 갱신 |

## 본문 변경 정도 / 본문 무손실 여부

코드 변경은 `UsageSnapshot v2` schema를 변경하지 않고 parser 내부 model source 해석만 확장했다. JSONL entry의 `file` 값은 file boundary 추적용 내부 값이며 snapshot/diagnostic/report에는 raw path로 출력하지 않는다. 문서 변경은 기존 Stage 1-5 결과를 유지하면서 Stage 6 보강 결과와 후속 리스크를 추가했다.

## 검증 결과

실행 명령:

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser
git diff --check
```

결과:

- OK — `npm test`: 18 pass.
- OK — 실제 CLI smoke: `UsageSnapshot v2` schema valid, fixture marker 없음, raw local path/credential/prompt/response 패턴 없음, parsed fields에 `usage`, `models`, `activity` 포함, `favoriteModel` 존재.
- OK — fixture CLI smoke: `UsageSnapshot v2` schema valid, fixture marker 없음, raw local path/credential/prompt/response 패턴 없음, `turn_context`에서 model을 상속한 token event 1건 확인.
- OK — `git diff --check`: whitespace error 없음.

## 잔여 위험

- Codex Desktop profile의 streak는 원격 profile/API 또는 account-level 산식으로 보이며, 이번 parser의 local UTC session JSONL streak와 일치한다고 보장하지 않는다. 화면 기준 longest streak와 local parser longest streak 차이는 source/scope/timezone 차이로 남긴다.
- skills/plugins, `fastModePercent`, profile/assets는 이번 Stage에서 새로 구현하지 않았다.
- `tokscale`처럼 Rust/SIMD/parallel native core를 도입하지 않았다. 현재 JS parser는 기능 보강이 목적이며 대형 session directory 성능 최적화는 후속 이슈로 분리한다.

## 다음 단계 영향

- PR 게시 전 최종 보고서는 Stage 6 포함 상태를 기준으로 검토해야 한다.
- 후속으로 profile/API streak alignment, one-pass JS parser 또는 Rust native core 성능 실험, skills/plugins source 식별을 별도 이슈로 등록할 수 있다.

## 승인 요청

- Stage 6 산출물과 검증 결과를 승인하면 PR 게시 절차로 진행한다.

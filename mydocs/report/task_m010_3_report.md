# Task M010 #3 최종 보고서

GitHub Issue: [#3](https://github.com/postmelee/codex-usage-analyzer/issues/3)
마일스톤: M010

## 작업 요약

- 대상 이슈: #3
- 마일스톤: M010
- 단계 수: 7
- 작업 목적: local Codex session JSONL parser를 구현해 `UsageSnapshot v2` production output에 실제 usage/model/activity aggregate를 연결한다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `src/parser/codex-home.js` | Codex home discovery helper 추가 | parser source root 결정 |
| `src/parser/session-jsonl.js` | session JSONL discovery, streaming read, token_count normalizer, nested usage/model alias 지원 | 모든 local parser aggregate 입력 |
| `src/parser/token-aggregate.js` | token total, breakdown, daily bucket, peak daily aggregate 구현 | `usage` field |
| `src/parser/model-aggregate.js` | model별 token/usage ranking aggregate와 file-local model context 상속 구현 | `models` field, `favoriteModel` |
| `src/parser/activity-aggregate.js` | totalThreads, duration, streak, reasoning effort aggregate와 local-only profile parity diagnostic 구현 | `activity` field |
| `src/analyze.js` | parser aggregate를 production `UsageSnapshot v2`에 병합하고 remote profile comparison 미수행 diagnostic 추가 | SDK production output |
| `src/cli.js` | `--codex-home <path>` option 추가, sample fixture 분리 유지 | CLI test/smoke와 custom source 주입 |
| `src/index.d.ts` | `AnalyzeUsageOptions`에 `codexHome`, `now` option 반영, public SDK 주석을 production parser 기준으로 갱신 | TypeScript 소비자 |
| `src/__tests__/fixtures/parser/` | synthetic parser fixture와 privacy contract 추가 | parser regression tests |
| `src/__tests__/analyze.test.js` | production parser snapshot, unavailable baseline, privacy guard 검증 | SDK regression |
| `src/__tests__/cli.test.js` | parser CLI, sample-only CLI, invalid flag 검증 | CLI regression |
| `src/__tests__/parser-token.test.js` | token/daily aggregate 검증 | parser unit tests |
| `src/__tests__/parser-activity.test.js` | model/activity aggregate 검증 | parser unit tests |
| `README.md` | production parser, unavailable baseline, fixture sample 경계, local-only streak/profile parity 설명 | 사용자/기여자 문서 |
| `mydocs/working/task_m010_3_stage1.md` ~ `task_m010_3_stage7.md` | 단계별 검증과 판단 기록 | 하이퍼-워터폴 작업 문서 |
| `mydocs/report/task_m010_3_report.md` | 최종 결과와 PR 게시 전 승인 요청 | 하이퍼-워터폴 최종 보고 |
| `mydocs/orders/20260614.md` | #3 오늘할일 완료 처리 | 운영 보드 |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| `README.md` | 저장소 루트 `README.md` | `README.md` | OK | 구현계획서 Stage 4 공식 문서 위치와 일치 |
| `mydocs/working/task_m010_3_stage{N}.md` | `mydocs/working/` | `mydocs/working/task_m010_3_stage1.md` ~ `task_m010_3_stage7.md` | OK | 단계 보고서 위치와 파일명 규칙 일치 |
| `mydocs/report/task_m010_3_report.md` | `mydocs/report/` | `mydocs/report/task_m010_3_report.md` | OK | 최종 보고서 위치와 파일명 규칙 일치 |
| `mydocs/tech/` 추가 문서 | 해당 없음 | 해당 없음 | OK | 이번 task는 parser 구현 범위이며 tech 문서 추가는 #1 inventory와 후속 이슈 판단으로 분리 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| 전체 테스트 | 10 pass | 18 pass |
| parser source modules | 0개 | 5개 |
| parser fixture source | 없음 | synthetic session JSONL fixture + contract README |
| production `analyzeUsage()` | unavailable baseline only | session JSONL parser aggregate 병합 |
| CLI parser source 주입 | 없음 | `--codex-home <path>` 지원 |
| sample fixture 경계 | `--fixture-sample` 전용 | `--fixture-sample` 전용 유지, production fallback 유입 없음 |
| 실제 local model 출력 | token event direct model 부재 시 unavailable | same-file `turn_context` model 상속으로 `models`/`favoriteModel` 산출 |
| profile streak parity 표시 | 없음 | diagnostic과 README에서 `not_guaranteed`로 명시 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| source 없음은 sample 값 없이 unavailable baseline으로 표현 | OK — missing source tests와 CLI source-missing test 통과 |
| parser fixture source는 JSONL aggregate로 usage/model/activity core fields를 계산 | OK — fixture production snapshot test와 parser unit tests 통과 |
| 실제 local source에서 model-less `token_count`와 `turn_context` model 조합을 해석 | OK — 실제 CLI smoke에서 parsed fields에 `models` 포함, `favoriteModel` 존재 |
| `--fixture-sample`은 sample fixture 전용 경로로 유지 | OK — sample marker는 sample CLI에서만 확인 |
| production output은 `UsageSnapshot v2` schema valid | OK — `npm test`, 실제 CLI smoke schema validation 통과 |
| diagnostic에 raw local path, raw line, session id, prompt/response 원문 미노출 | OK — parser tests와 Stage 6 smoke privacy scanner 통과 |
| Codex Desktop profile/API parity 미보장 상태를 출력과 문서에서 명시 | OK — `profileComparison.parity: "not_guaranteed"`와 README non-goal 추가 |
| 실제 environment smoke 수행 | OK — raw JSON 미보관 원칙으로 schema/privacy/model status만 확인 |
| whitespace 검증 | OK — `git diff --check` 통과 |

### 단계별 검증 결과

- Stage 1: [`task_m010_3_stage1.md`](../working/task_m010_3_stage1.md) — parser fixture contract와 privacy guard를 고정했다.
- Stage 2: [`task_m010_3_stage2.md`](../working/task_m010_3_stage2.md) — session JSONL discovery와 token/daily aggregate를 구현했다.
- Stage 3: [`task_m010_3_stage3.md`](../working/task_m010_3_stage3.md) — model/activity aggregate를 구현하고 unavailable field 기준을 고정했다.
- Stage 4: [`task_m010_3_stage4.md`](../working/task_m010_3_stage4.md) — production analyzer, CLI, README, regression tests를 parser 기준으로 통합했다.
- Stage 5: [`task_m010_3_stage5.md`](../working/task_m010_3_stage5.md) — 실제 smoke와 privacy review를 수행하고 nested token usage alias를 보강했다.
- Stage 6: [`task_m010_3_stage6.md`](../working/task_m010_3_stage6.md) — `turn_context` 기반 stateful model tracking을 추가하고 profile streak 차이를 문서화했다.
- Stage 7: [`task_m010_3_stage7.md`](../working/task_m010_3_stage7.md) — local-only streak 산식과 remote profile parity 미보장 diagnostic을 추가하고 README에 반영했다.

## 잔여 위험과 후속 작업

### 잔여 위험

- Codex Desktop profile streak는 원격 profile/API 또는 account-level 산식으로 보이며, local UTC session JSONL streak와 일치한다고 보장하지 않는다. 현재 output은 이 상태를 diagnostic으로 표시한다.
- skills/plugins source는 아직 식별/구현하지 않았다.
- `fastModePercent`는 source 의미가 확정되지 않아 `null`과 diagnostic으로 유지한다.
- 실제 source scan은 session 파일 수에 따라 시간이 걸릴 수 있다. 성능 최적화는 별도 이슈로 다루는 것이 안전하다.

### 후속 작업 후보

- 별도 후속: Codex Desktop profile/API streak 산식과 local session JSONL streak alignment 검토. 단, 기본 analyzer가 internal profile API를 직접 호출하는 방향은 현재 권장하지 않는다.
- #5 또는 별도 후속: skills/plugins local source 식별과 aggregate 구현
- #6 또는 별도 후속: Codex Desktop profile/API source와 `codexProfile`/assets integration 범위 확정
- 별도 후속: large session directory scan 성능 최적화, one-pass JS parser, Rust native core 도입 필요성 검토

## 작업지시자 승인 요청

- 최종 보고서와 수용 기준 검증 결과를 승인하면 PR 게시 절차로 진행한다.

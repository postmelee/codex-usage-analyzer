# Task M010 #15 Stage 3 완료보고서

GitHub Issue: [#15](https://github.com/postmelee/codex-usage-analyzer/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 3

## 단계 목적

Stage 3은 Stage 2 source classification을 바탕으로 #16 parser 구현 후보, #17 date/timezone 판단, #18 redacted baseline generator 요구사항을 분리해 handoff하는 단계다. 또한 #15 최종 보고서를 작성하고 오늘할일 상태를 완료로 갱신한다.

이번 단계에서도 parser 구현, `UsageSnapshot v2` schema 변경, README 변경은 수행하지 않았다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m010_15_stage3.md` | #16/#17/#18 후속 handoff와 parser feasibility 결정을 정리했다. |
| `mydocs/report/task_m010_15_report.md` | #15 전체 source inventory 결과와 수용 기준 검증을 최종 보고서로 정리했다. |
| `mydocs/orders/20260705.md` | #15 오늘할일 상태를 완료로 갱신했다. |

## 본문 변경 정도 / 본문 무손실 여부

문서-only 변경이다. 기존 Stage 1/Stage 2 보고서의 내용을 재작성하지 않고, 후속 작업자가 참고할 결정만 Stage 3와 최종 보고서에 요약했다. 제품/사용자-facing 문서와 runtime source는 변경하지 않았다.

## Parser feasibility 결정

| 후보 | 최종 판단 | Classification | 후속 |
|---|---|---|---|
| active session JSONL | 현재 primary parser source로 유지한다. | `usable_local_source` | #16에서 event coverage 보강과 regression fixture 확장을 검토한다. |
| archived session JSONL | coverage 확장 후보지만 active session과 dedup이 선행되어야 한다. | `usable_local_source` | #16 후보. dedup 없이는 total/daily 중복 위험이 있다. |
| SQLite `threads` aggregate | numeric/date/model/effort fallback 후보로 유지한다. | `usable_local_source` | #16 후보. private context columns는 allowlist 밖으로 둔다. |
| SQLite `thread_dynamic_tools` | catalog/display metadata 후보일 뿐 actual invocation source로 보지 않는다. | `usable_local_source` with restriction | #16/#4 계열에서 display normalization 보조로만 사용한다. |
| `models_cache.json` | model display normalization 후보로 유지한다. | `usable_local_source` | #16 후보. cache 원문 복제 금지. |
| local skills/plugins/cache directories | catalog/display normalization 후보로만 유지한다. | `usable_local_source` with restriction | usage count source로 쓰지 않는다. |
| session index/log DB | discovery나 diagnostics 참고 가능성은 있지만 private content 위험이 크다. | `privacy_risk` | 기본 parser source에서 제외한다. |
| Electron app data/cache/localStorage | profile cache 가능성보다 credential/session/account data 위험이 크다. | `privacy_risk` | #16 구현 후보에서 제외한다. |
| auth/config/generated images | analyzer source로 사용하지 않는다. | `privacy_risk` | 제외 유지. |
| remote profile endpoint | profile parity 비교 기준일 수 있으나 local analyzer source가 아니다. | `remote_only_or_internal` | redacted baseline 또는 wrapper product 영역으로 유지한다. |
| Desktop app preference/cache 후보 | profile usage stats source로 확인되지 않았다. | `unavailable_or_absent` | #16 후보에서 제외한다. |

## 외부 reference: tokscale 확인

작업지시자 요청에 따라 `junhoyeo/tokscale`의 Codex 처리 방식을 추가로 확인했다. 확인 시점은 2026-07-05이며, 참조 경로는 공개 저장소의 `crates/tokscale-core/src/sessions/codex.rs`, `crates/tokscale-core/src/scanner.rs`, `crates/tokscale-cli/src/commands/usage/codex.rs`다.

확인 결과:

- `tokscale`의 Codex session analyzer는 `~/.codex/sessions/**/*.jsonl`와 `~/.codex/archived_sessions/**/*.jsonl`을 스캔하고, `token_count` event의 `last_token_usage`/`total_token_usage`를 상태 기반으로 해석한다.
- parser는 model context, session metadata, fork/subagent replay, stale cumulative regression, headless `turn.completed` fallback, workspace metadata를 다룬다.
- 별도의 `usage codex` 계열 명령은 Codex auth file/keychain에서 credential을 읽고 ChatGPT backend usage/rate-limit API를 호출한다. 이는 local session analyzer가 아니라 인증된 account usage 조회 기능이다.

이 reference는 #16이 local parser를 확장할 때 참고할 수 있는 구현 단서를 제공한다. 반면 credential/keychain을 읽는 원격 조회 경로는 이 패키지의 안전한 local analyzer 기본 동작에는 포함하지 않는다.

## #16 handoff

#16 `analyzer local source coverage 확장`은 Desktop profile parity 구현이 아니라 local-only coverage 보강으로 진행하는 것이 맞다.

권장 범위:

- archived session JSONL 포함 여부와 dedup 정책 설계
- `token_count`의 `last_token_usage`와 `total_token_usage`를 함께 사용하는 delta/regression 처리 검토
- fork/subagent replay dedup과 headless `turn.completed` fallback 검토
- SQLite `threads`를 totalThreads, total token fallback, model/effort/date fallback 후보로 검토
- `models_cache.json` 기반 model display normalization 검토
- skill/plugin catalog display normalization 보조 source 검토
- diagnostics에 source별 degraded/fallback reason을 명확히 남기는 정책 검토

명시 제외:

- Electron `Cookies`, `Local Storage`, `Session Storage`, cache/blob store 읽기
- auth/config file 읽기
- Codex auth file/keychain credential 읽기
- generated image artifact 승격
- remote `/profiles/me` endpoint 호출
- authenticated account usage/rate-limit API 호출
- local path, thread title, first message, git metadata, prompt/response/tool payload 출력

## #17 handoff

#17 `activity 날짜 기준 및 timezone 옵션 보강`은 Stage 2에서 확인한 source 차이를 바탕으로 별도 진행해야 한다.

판단:

- 현재 analyzer의 streak/daily는 local session timestamp 기반 UTC date bucket이다.
- remote profile daily/streak는 account-level source와 service-side date basis를 사용할 수 있어 local result와 같다고 보장하지 않는다.
- #17은 remote parity를 맞추는 작업이 아니라 local analyzer date bucket basis를 명시하고, 필요한 경우 timezone option을 추가하는 작업으로 좁히는 것이 안전하다.
- diagnostics의 `profileComparison.localStreakBasis` 또는 activity diagnostics가 date basis를 명확히 드러내야 한다.

## #18 handoff

#18 `redacted profile baseline generator CLI 추가`는 실제 profile 값과 local analyzer 값을 안전하게 비교하기 위한 helper로 유지한다.

요구사항:

- generator는 실제 계정 baseline을 commit 대상으로 만들지 않는다.
- raw analyzer JSON, local private path, account identifier, credential, screenshot/image capture를 포함하지 않는다.
- profile-visible number/model/ranking id와 tolerance, sourcePolicy만 남기는 방식이어야 한다.
- source-sensitive field에는 `source_mismatch` 또는 `profile_parity_not_guaranteed` reason을 명시할 수 있어야 한다.
- Desktop remote profile source 자체를 CLI가 호출하지 않고, 사용자가 수동으로 제공한 redacted 값만 다룬다.

## 최종 판단

- Desktop profile parity를 높일 수 있는 privacy-safe local Desktop profile cache는 확인하지 못했다.
- 안전하게 구현 가능한 다음 단계는 remote profile clone이 아니라 local source coverage 확장이다.
- #16은 `usable_local_source`로 분류된 local session/SQLite/cache metadata 후보만 다루고, `privacy_risk`와 `remote_only_or_internal` 후보는 제외해야 한다.
- `tokscale`의 공개 구현도 Codex session 분석은 local JSONL 중심이며, remote/auth 기반 account usage 조회는 별도 보안 경계로 분리되어 있다.
- profile parity가 계속 보장되지 않는 field는 `profileComparison` diagnostics와 profile smoke reason taxonomy로 관리한다.

## 검증 결과

실행 명령:

```bash
npm test
rg -n "usable_local_source|remote_only_or_internal|privacy_risk|unavailable_or_absent" mydocs/working/task_m010_15_stage*.md mydocs/report/task_m010_15_report.md
rg -n "#16|#17|#18|parser feasibility|profile parity" mydocs/working/task_m010_15_stage3.md mydocs/report/task_m010_15_report.md
rg -n "tokscale|last_token_usage|Codex auth|account usage" mydocs/working/task_m010_15_stage3.md mydocs/report/task_m010_15_report.md
rg -n -f /private/tmp/cua-task15-sensitive-patterns.txt mydocs/working/task_m010_15_stage*.md mydocs/report/task_m010_15_report.md
git diff --check
git status --short
```

결과:

- OK: `npm test` 통과. 47개 test, 47개 pass, fail 0.
- OK: source classification scan에서 네 가지 classification token이 Stage 1-3 보고서와 최종 보고서에 존재함을 확인했다.
- OK: handoff scan에서 #16, #17, #18, parser feasibility, profile parity 판단이 Stage 3와 최종 보고서에 존재함을 확인했다.
- OK: `tokscale` reference scan에서 local JSONL parser와 auth/account usage 제외 판단이 Stage 3와 최종 보고서에 존재함을 확인했다.
- OK: privacy pattern scan은 match 없음으로 통과했다.
- OK: `git diff --check` 통과.
- OK: 최종 커밋 전 `git status --short`는 Stage 3 산출물만 표시했고, 최종 커밋 후 빈 출력이어야 한다.

## 잔여 위험

- Stage 2 local environment 기준으로 확인한 source 후보는 Codex Desktop version이나 account state에 따라 달라질 수 있다.
- SQLite fallback은 local-only estimate를 개선할 수 있지만 remote profile account-level total과 일치한다고 보장하지 않는다.
- Electron app data를 제외했으므로 local profile cache가 실제로 있어도 analyzer 기본 parser는 사용하지 않는다.

## 다음 단계 영향

- #16은 local-only coverage 확장으로 진행한다.
- #17은 date/timezone basis를 명시하는 방향으로 진행한다.
- #18은 redacted baseline generator의 privacy guardrail과 sourcePolicy 지원을 중심으로 진행한다.
- #15 최종 보고서가 승인되면 PR 게시 절차로 넘어간다.

## 승인 요청

- Stage 3 산출물과 최종 보고서 검증 결과를 승인하면 PR 게시 절차로 진행한다.

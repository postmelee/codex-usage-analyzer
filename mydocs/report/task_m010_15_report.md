# Task M010 #15 최종 결과보고서

GitHub Issue: [#15](https://github.com/postmelee/codex-usage-analyzer/issues/15)
마일스톤: M010

## 작업 요약

- 대상 이슈: #15
- 마일스톤: M010
- 단계 수: 3
- 작업 목적: Codex Desktop profile cache/source 후보를 inventory하고, local analyzer가 안전하게 사용할 수 있는 source와 제외해야 할 source를 분류한다.

이번 task는 parser 구현이 아니라 source feasibility decision 작업이다. 최종 결론은 Desktop profile remote 값을 privacy-safe local cache에서 재사용하는 경로는 확인하지 못했고, 후속 #16은 local-only source coverage 확장으로 진행해야 한다는 것이다.

작업지시자 요청에 따라 2026-07-05에 `junhoyeo/tokscale`의 Codex 처리 방식도 추가 확인했다. `tokscale`의 Codex session analyzer는 local `~/.codex/sessions/*.jsonl`와 archived sessions를 읽는 구조이고, Codex auth credential을 사용하는 account usage 조회는 별도 명령 경계로 분리되어 있었다. 따라서 이 결과는 local parser 확장 방향은 보강하지만, 이 패키지가 remote/auth 기반 analyzer가 되어야 한다는 근거는 아니다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `mydocs/plans/task_m010_15.md` | 수행계획서 작성 | #15 범위, 문서 위치, 검증 기준 |
| `mydocs/plans/task_m010_15_impl.md` | Stage 1-3 구현계획서 작성 | 단계별 산출물, source classification, privacy-safe 조사 방식 |
| `mydocs/working/task_m010_15_stage1.md` | 기존 source contract와 #6/#14 prior findings 정리 | Stage 2 inventory 기준 |
| `mydocs/working/task_m010_15_stage2.md` | Desktop/local source 후보 inventory와 privacy classification 작성 | #16/#17/#18 handoff 기준 |
| `mydocs/working/task_m010_15_stage3.md` | parser feasibility 결정과 후속 task handoff 작성 | 최종 결정, 후속 진행 방향 |
| `mydocs/report/task_m010_15_report.md` | 최종 결과보고서 작성 | PR 게시 전 승인 자료 |
| `mydocs/orders/20260705.md` | #15 상태 완료 처리 | 작업 보드 |

## 문서 위치 검증

#15는 제품/사용자-facing 문서가 아니라 내부 source inventory 조사 작업으로 승인됐다. 수행계획서 판단에 따라 조사 결과는 `mydocs/working/`과 `mydocs/report/`에만 기록했고, README나 runtime source는 수정하지 않았다.

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| `mydocs/plans/task_m010_15.md` | `mydocs/plans/` | `mydocs/plans/task_m010_15.md` | OK | task-start 산출물 위치와 일치한다. |
| `mydocs/plans/task_m010_15_impl.md` | `mydocs/plans/` | `mydocs/plans/task_m010_15_impl.md` | OK | 구현계획서 위치 판단과 일치한다. |
| `mydocs/working/task_m010_15_stage{1,2,3}.md` | `mydocs/working/` | `mydocs/working/` | OK | source inventory와 privacy 판단을 내부 단계 보고서로 기록했다. |
| `mydocs/report/task_m010_15_report.md` | `mydocs/report/` | `mydocs/report/task_m010_15_report.md` | OK | 최종 조사 보고서 위치와 일치한다. |
| `README.md` | 해당 없음 | 변경 없음 | OK | #15에서는 공식 사용자 문서를 수정하지 않기로 했다. |
| `src/**` | 해당 없음 | 변경 없음 | OK | #15에서는 parser 구현과 schema 변경을 제외했다. |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---:|---:|
| #15 수행계획서 | 0 | 1 |
| #15 구현계획서 | 0 | 1 |
| #15 단계 보고서 | 0 | 3 |
| #15 최종 보고서 | 0 | 1 |
| runtime code 변경 | 0 | 0 |
| README 변경 | 0 | 0 |
| `UsageSnapshot v2` schema 변경 | 0 | 0 |
| test count | 47 pass | 47 pass |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| Desktop profile parity를 높일 수 있는 local source가 있는지 판단된다 | OK — privacy-safe Desktop profile cache는 확인하지 못했고, local-only coverage 후보만 #16으로 넘겼다. |
| 사용 가능한 source, 사용할 수 없는 source, privacy 위험 source가 구분된다 | OK — `usable_local_source`, `unavailable_or_absent`, `remote_only_or_internal`, `privacy_risk` classification으로 분류했다. |
| total/streak/top plugins/activity insight 관련 source 후보와 한계가 field별로 정리된다 | OK — Stage 2 field matrix와 Stage 3 handoff에서 token, daily/streak, ranking, activity, asset-like source를 분리했다. |
| #16 parser 구현 필요 여부와 구현 후보 범위가 명확해진다 | OK — #16 후보를 archived session JSONL dedup, SQLite aggregate fallback, model/catalog normalization으로 좁혔다. |
| 외부 reference 구현이 안전한 local analyzer 결정을 바꾸는지 판단된다 | OK — `tokscale`의 Codex session 분석은 local JSONL 중심이고, auth credential 기반 account usage 조회는 별도 보안 경계라 analyzer 기본 범위에서 제외했다. |
| `UsageSnapshot v2` schema는 변경하지 않는다 | OK — runtime source와 schema 파일 변경 없음. |
| 실제 사용자 raw profile 값, raw analyzer JSON, local absolute path, account identifier, credential을 저장소에 남기지 않는다 | OK — 보고서는 placeholder path와 schema summary만 사용했고 privacy scan match 없음. |
| `git diff --check`가 경고 없이 통과한다 | OK — Stage 3 검증에서 통과. |

### 단계별 검증 결과

- Stage 1: [`task_m010_15_stage1.md`](../working/task_m010_15_stage1.md) — `npm test` 47개 통과, source/diagnostics scan, `git diff --check` 통과.
- Stage 2: [`task_m010_15_stage2.md`](../working/task_m010_15_stage2.md) — source classification scan, privacy pattern scan, `git diff --check` 통과.
- Stage 3: [`task_m010_15_stage3.md`](../working/task_m010_15_stage3.md) — `npm test` 47개 통과, classification/handoff scan, privacy pattern scan, `git diff --check` 통과.

## 최종 결정

| 항목 | 결정 |
|---|---|
| Desktop Electron app data/cache | `privacy_risk`로 분류하고 analyzer default parser source에서 제외한다. |
| remote profile endpoint | `remote_only_or_internal`로 분류하고 redacted baseline/wrapper 비교 기준으로만 둔다. |
| local session JSONL | 현재 primary source로 유지하고 #16에서 coverage와 dedup을 확장한다. |
| archived session JSONL | #16 후보로 넘기되 active overlap dedup을 선행한다. |
| SQLite `threads` aggregate | #16 fallback 후보로 넘기되 numeric/date/model/effort allowlist만 허용한다. |
| session index/log DB/auth/config/generated images | `privacy_risk`로 분류하고 기본 parser source에서 제외한다. |
| date/timezone mismatch | #17에서 local analyzer date basis와 timezone option으로 다룬다. |
| redacted baseline generator | #18에서 실제 profile value를 commit하지 않는 helper로 다룬다. |
| 외부 reference: `junhoyeo/tokscale` | Codex session 분석은 local JSONL 중심으로 참고하고, auth credential 기반 account usage 조회는 analyzer 기본 범위에서 제외한다. |

## 잔여 위험과 후속 작업

### 잔여 위험

- local environment 한 곳에서 확인한 source 후보이므로 다른 Codex Desktop version이나 account state에서는 app data/cache shape가 달라질 수 있다.
- SQLite fallback은 local estimate를 개선할 수 있지만 Desktop remote profile account-level total과 일치한다고 보장하지 않는다.
- Electron app data를 제외했기 때문에 Desktop profile cache가 실제로 local에 있어도 analyzer 기본 parser는 사용하지 않는다.
- 공개 `openai/codex` source와 Desktop app bundle의 profile UI field set은 완전히 같지 않을 수 있다.

### 후속 작업 후보

- #16: analyzer local source coverage 확장. archived session JSONL dedup, SQLite aggregate fallback, model/catalog normalization을 검토한다.
- #16 참고 구현 단서: `tokscale`처럼 `token_count`의 `last_token_usage`/`total_token_usage` delta 처리, stale regression guard, fork/subagent replay dedup, headless `turn.completed` fallback을 local-only 범위에서 검토한다.
- #17: activity 날짜 기준 및 timezone 옵션 보강. local UTC basis와 remote profile date basis 차이를 명확히 한다.
- #18: redacted profile baseline generator CLI 추가. 실제 profile value, local path, account identifier, credential을 commit하지 않는 guardrail을 포함한다.

## 작업지시자 승인 요청

- 최종 보고서와 수용 기준 검증 결과를 승인하면 PR 게시 절차로 진행한다.

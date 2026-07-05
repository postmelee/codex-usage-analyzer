# Task M010 #15 Stage 1 완료보고서

GitHub Issue: [#15](https://github.com/postmelee/codex-usage-analyzer/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 1

## 단계 목적

Stage 1은 #15의 source inventory를 시작하기 전에 현재 analyzer가 어떤 local source를 읽고, 어떤 profile parity 한계를 이미 계약으로 노출하는지 정리하는 단계다. 이번 단계에서는 구현계획서를 확정하고, README/소스/#6/#14 보고서에서 기존 source contract와 prior findings를 재검토했다.

이 단계에서는 local Desktop/app data/cache 후보를 상세 조사하지 않았고, 코드·README·package metadata도 수정하지 않았다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/plans/task_m010_15_impl.md` | Stage 1-3 구현계획, source classification 기준, read-only inventory 범위, privacy-safe 보고 방식을 고정했다. |
| `mydocs/working/task_m010_15_stage1.md` | 현재 source contract, prior findings, Stage 2 inventory 대상과 금지 대상을 정리했다. |

## 본문 변경 정도 / 본문 무손실 여부

문서-only 변경이다. 기존 README, `src/**`, `package.json`, `UsageSnapshot v2` schema는 수정하지 않았다. 기존 문서와 코드의 원문은 그대로 두고, Stage 1 조사 결과를 신규 작업 산출물에 요약했다.

## 현재 source contract 요약

| 영역 | 현재 source | 출력/diagnostics 계약 | Stage 2 영향 |
|---|---|---|---|
| Codex home discovery | `--codex-home`, `CODEX_HOME`, default `{home}/.codex` 순서 | aggregate별 diagnostics `source`는 `option`, `env`, `default` 중 하나 | 기존 `{codex-home}` 기준 source와 Desktop app data/cache 후보를 분리해 본다. |
| session discovery | `{codex-home}/sessions/**/*.jsonl` | 없거나 읽을 수 없으면 `session_jsonl_not_found`, `sessions_unavailable` 등 safe diagnostics | profile parity 개선 후보가 session JSONL 밖에 있는지 확인한다. |
| token/model/activity | session token count event와 model context | token totals, daily UTC bucket, model ranking, duration, effort, streak, thread count 계산 | token/streak/thread field는 remote profile과 source range가 다를 수 있다. |
| skills/plugins | session tool catalog + actual invocation events | catalog/enable list만으로 ranking을 올리지 않고 실제 invocation만 집계 | top skills/plugins remote ranking 또는 catalog cache가 있어도 usage count source로 바로 쓰지 않는다. |
| assets | `{codex-home}`의 persisted atom state, `pets/` manifest, built-in catalog | pet은 opaque logical ref만 출력, avatar는 analyzer-owned source가 아니라 unavailable | asset-like source는 profile usage parity와 별도 트랙으로 유지한다. |
| profile comparison | remote profile baseline 비교 미수행 | `profileComparison.status: "not_performed"`, `reason: "remote_profile_api_not_used"`, `parity: "not_guaranteed"` | remote/internal source를 호출하지 않는 한 parity gap은 diagnostics와 smoke reason으로 표현한다. |

## prior findings 요약

- #6은 실제 profile UI 값을 저장소에 넣지 않고, 사용자가 별도 redacted baseline을 준비해 local analyzer snapshot과 비교하는 repository-only smoke helper를 추가했다.
- #6의 잔여 위험은 Codex Desktop profile이 remote account-level source일 수 있어 local analyzer와 streak/top usage 값이 다를 수 있다는 점이었다.
- #14는 `UsageSnapshot v2` schema와 public SDK export를 변경하지 않고, redacted baseline의 optional `sourcePolicy`와 source-sensitive field fallback reason을 추가했다.
- #14 이후에도 source-aware mismatch는 aggregate 실패를 유지한다. 값 차이를 숨기지 않고 field reason으로 parser bug 후보와 source 차이를 구분한다.
- 실제 screenshot-derived baseline 또는 raw analyzer JSON은 저장소에 추가하지 않는 정책이 유지된다.

## Stage 2 inventory 대상

Stage 2는 다음 후보를 read-only로 확인한다. 결과는 raw dump가 아니라 placeholder path, file kind, high-level schema/key category, privacy classification, parser feasibility만 기록한다.

| 후보 | 확인 목적 | 기록 방식 |
|---|---|---|
| `{codex-home}` session/metadata 후보 | 기존 parser source 밖에서 profile parity에 도움이 되는 local metadata가 있는지 확인 | `{codex-home}` placeholder와 schema summary |
| `{app-support}` Desktop support/cache 후보 | Desktop profile UI 값이 local cache에 남는지 확인 | app/cache 후보 이름과 file kind 중심 |
| `{cache}` Desktop cache 후보 | token/activity/ranking cache 가능성 확인 | key category와 profile field 관련성만 기록 |
| `{preferences}` Desktop preference 후보 | persisted setting이 usage/profile source인지 단순 UI setting인지 분류 | high-level key category만 기록 |
| 공개 reference 또는 기존 `codex-extracted` 결과 | local 후보가 implementation detail인지 일반화 가능한지 재검토 | source 종류와 field mapping summary |

## Stage 2 금지 대상

- Codex Desktop remote/internal profile API 호출
- 인증 토큰, 쿠키, session credential 추출 또는 사용
- raw JSONL, raw profile value, raw conversation text, prompt/response/tool payload 문서화
- absolute local private path 기록
- Desktop UI 자동 조작, screenshot OCR, profile page scraping
- parser 구현, `UsageSnapshot v2` schema 변경, README 수정

## 검증 결과

실행 명령:

```bash
npm test
rg -n "profileComparison|profile parity|source_mismatch|profile_parity_not_guaranteed|remote profile|local session" README.md src scripts mydocs/report/task_m010_6_report.md mydocs/report/task_m010_14_report.md
rg -n "session_jsonl|local_sources|remote_profile_api_not_used|profileParity|sourcePolicy" src README.md
git diff --check
```

결과:

- OK: `npm test` 통과. 47개 test, 47개 pass, fail 0.
- OK: 첫 번째 source/profile scan에서 README, #6/#14 보고서, `src/analyze.js`, `src/profile-baseline.js`, fixture 문서에 source parity와 reason taxonomy가 문서화되어 있음을 확인했다.
- OK: 두 번째 diagnostics scan에서 `session_jsonl`, `local_sources_partially_available`, `remote_profile_api_not_used`, `profileParity`, `sourcePolicy` 계약이 코드와 문서에 존재함을 확인했다.
- OK: `git diff --check` 통과.

## 잔여 위험

- Stage 1은 기존 source contract 정리 단계라 Desktop app data/cache 후보의 실제 존재 여부는 아직 판단하지 않았다.
- README와 코드에서 remote profile parity가 보장되지 않는다는 계약은 확인했지만, 어떤 local cache가 그 gap을 줄일 수 있는지는 Stage 2에서 별도로 조사해야 한다.
- 한 local 환경에서 확인한 source 후보만으로 일반화할 수 없으므로 Stage 2 보고서에 확인 범위와 한계를 함께 기록해야 한다.

## 다음 단계 영향

- Stage 2는 `usable_local_source`, `unavailable_or_absent`, `remote_only_or_internal`, `privacy_risk` 네 가지 classification으로 source 후보를 분류한다.
- Stage 2는 실제 경로와 raw content를 기록하지 않고, `{codex-home}`, `{app-support}`, `{cache}`, `{preferences}` placeholder와 schema summary만 남긴다.
- session JSONL과 asset setting처럼 이미 parser가 읽는 source와 Desktop profile/cache 후보를 분리해 field별 candidate matrix를 작성한다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2 `Desktop/local source 후보 inventory와 privacy 분류`로 진행한다.

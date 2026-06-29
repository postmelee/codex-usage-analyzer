# Task M010 #14 Stage 1 보고서

GitHub Issue: [#14](https://github.com/postmelee/codex-usage-analyzer/issues/14)
구현계획서: [`task_m010_14_impl.md`](../plans/task_m010_14_impl.md)
Stage: 1

## 단계 목적

Stage 1은 profile smoke 결과의 reason taxonomy와 baseline source policy 설계 방향을 확정하는 단계다. 이번 단계에서는 구현 파일을 수정하지 않고, 기존 `src/profile-baseline.js`의 비교 흐름과 이슈 #14의 요구를 대조해 Stage 2에서 구현할 최소 변경 범위를 정리했다.

목표는 screenshot-derived baseline처럼 Codex Desktop remote profile source와 local analyzer source가 다른 비교에서 모든 차이가 단순 `numeric_mismatch`로 쌓이지 않게 만드는 것이다. 단, `UsageSnapshot v2` schema, public SDK export, 기존 redacted baseline schemaVersion은 변경하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m010_14_stage1.md` | Stage 1 reason taxonomy, source-sensitive field, optional source policy 설계와 검증 결과를 기록했다. |

## 본문 변경 정도 / 본문 무손실 여부

이번 단계는 신규 단계 보고서만 추가했다. 제품 코드, README, fixture, 기존 계획서 본문은 수정하지 않았다.

## 설계 결정

### Reason Taxonomy

Stage 2에서 field-level result reason을 다음 범주로 유지·보강한다.

| 범주 | reason | 처리 방향 |
|---|---|---|
| 비교 성공 | `exact_match`, `numeric_within_tolerance`, `empty_ranking_matches` | 기존 의미 유지 |
| parser bug 후보 | `numeric_mismatch`, `value_mismatch`, `actual_field_absent`, ranking shape mismatch reason | source policy가 없으면 기존처럼 mismatch로 유지 |
| source 차이 | `source_mismatch`, `profile_parity_not_guaranteed`, `remote_profile_source_differs` | remote/local source 차이가 명시된 field에 사용 |
| 비교 제외 | `not_comparable`, `expected_field_absent` | 기존 marker와 skipped 흐름 유지 |

새로 추가할 핵심 reason은 `source_mismatch` 하나로 제한한다. `profile_parity_not_guaranteed`와 `remote_profile_source_differs`는 기존 의미를 재사용한다. reason이 과도하게 늘어나면 smoke 결과 해석이 어려워지므로 parser bug 후보와 source 차이를 구분하는 데 필요한 최소 단위만 둔다.

### Source-Sensitive Field

다음 field는 Codex Desktop remote profile과 local analyzer source 차이가 비교 결과에 영향을 줄 가능성이 높다.

| Field | source-aware 기본 판단 |
|---|---|
| `activity.currentStreakDays` | remote account activity와 local UTC token date bucket 차이가 크므로 source-sensitive |
| `activity.longestStreakDays` | remote account activity와 local UTC token date bucket 차이가 크므로 source-sensitive |
| `activity.longestTaskDurationMs` | remote profile activity insight와 local session event duration 차이가 날 수 있으므로 source-sensitive |
| `activity.fastModePercent` | 현재 local source가 `source_unconfirmed`일 수 있으므로 source-sensitive |
| `activity.reasoningEffort` | profile aggregation 기준과 local event basis가 다를 수 있으므로 source-sensitive |
| `activity.reasoningEffortPercent` | profile aggregation 기준과 local event basis가 다를 수 있으므로 source-sensitive |
| `activity.totalThreads` | remote account-level thread count와 local retained session count가 다를 수 있으므로 source-sensitive |
| `skills.exploredCount` | remote/catalog/profile semantics와 local actual invocation semantics가 다를 수 있으므로 source-sensitive |
| `skills.totalUsed` | remote/catalog/profile semantics와 local actual invocation semantics가 다를 수 있으므로 source-sensitive |
| `skills.topSkills` | local analyzer는 actual invocation + session catalog 기준이므로 source-sensitive |
| `plugins.topPlugins` | local analyzer는 actual invocation + session catalog 기준이므로 source-sensitive |

`usage.*` token fields와 `models.favoriteModel.model`은 기본적으로 comparable field로 유지한다. 사용자가 source 차이를 알고 있는 screenshot-derived baseline에서만 `sourcePolicy`로 reason을 바꿀 수 있게 한다. 이 기준은 numeric mismatch masking 위험을 줄이기 위한 것이다.

### Baseline Source Policy

Stage 2에서는 baseline schemaVersion을 올리지 않고 optional top-level `sourcePolicy` object를 허용한다.

```json
{
  "sourcePolicy": {
    "activity.totalThreads": "source_mismatch",
    "skills.topSkills": "source_mismatch",
    "plugins.topPlugins": "source_mismatch"
  }
}
```

정책은 field path를 key로 하고, value는 승인된 source-aware reason 중 하나로 제한한다. 1차 허용 reason은 다음 세 가지다.

- `source_mismatch`
- `profile_parity_not_guaranteed`
- `remote_profile_source_differs`

기존 `expected.<field>`의 `{ "status": "not_comparable", "reason": "remote_profile_source_differs" }` marker는 계속 지원한다. 차이는 다음과 같이 둔다.

| 방식 | status | 용도 |
|---|---|---|
| `not_comparable` marker | `not_comparable` | field 자체를 비교하지 않는다. |
| `sourcePolicy` | `mismatch` 유지, reason만 source-aware | 값 차이는 보여주되 parser bug 후보와 source 차이를 구분한다. |

### Stage 2 구현 범위

Stage 2는 다음 변경만 수행한다.

- `validateProfileBaseline()`에서 optional `sourcePolicy` object와 허용 reason을 검증한다.
- scalar comparison에 field source policy를 전달해 numeric/string mismatch reason을 source-aware reason으로 바꾼다.
- source policy가 없는 source-sensitive field는 snapshot diagnostics의 `profileComparison.parity: "not_guaranteed"`가 있을 때 `profile_parity_not_guaranteed`를 기본 mismatch reason으로 사용한다.
- ranking field는 field-level source policy가 있을 때 top-level ranking result 또는 item/key mismatch reason에 source-aware reason을 적용한다.
- 새 synthetic fixture `source-mismatch-baseline.json`과 regression test를 추가한다.

Stage 2에서 하지 않는 일:

- `UsageSnapshot v2` schema 변경
- `src/index.js` public export 추가
- remote profile API 호출
- local source coverage 확장
- timezone/date bucket 산식 변경
- baseline generator 구현
- 실제 profile baseline 또는 raw analyzer JSON 커밋

## 검증 결과

실행 명령:

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser
node scripts/profile-smoke.js --baseline src/__tests__/fixtures/profile-baseline/redacted-baseline.json --snapshot <tmp-parser-snapshot.json>
git diff --check
```

결과:

- OK: `npm test` 통과. tests 40, pass 40, fail 0.
- OK: parser fixture CLI 출력이 `UsageSnapshot v2` JSON을 생성했고 `profileComparison.parity: "not_guaranteed"` diagnostic을 포함했다.
- OK: 기존 profile smoke 통과. summary는 total 19, matched 17, mismatched 0, notComparable 2, skipped 0.
- OK: `git diff --check` 통과.

## 잔여 위험

- `sourcePolicy`가 너무 넓게 쓰이면 실제 parser bug를 source 차이로 오인할 수 있다. Stage 2에서는 source policy가 없는 core comparable field의 `numeric_mismatch`를 유지하는 regression test를 추가한다.
- ranking field의 item-level mismatch에 source policy를 적용하는 방식은 결과 해석에 영향을 준다. Stage 2 test에서 top-level ranking unavailable과 item mismatch를 분리한다.
- 기존 baseline validator의 sensitive string pattern이 새 reason 문자열을 오탐하지 않는지 Stage 2에서 fixture validation test로 확인해야 한다.

## 다음 단계 영향

- Stage 2는 optional `sourcePolicy`를 구현하고, source-sensitive field + `profileComparison.parity: "not_guaranteed"` 조합의 기본 reason을 `profile_parity_not_guaranteed`로 고정한다.
- Stage 2는 `source-mismatch-baseline.json` synthetic fixture를 추가하되 실제 profile 값이나 local path를 포함하지 않는다.
- Stage 2 이후 README와 fixture contract 문서화는 Stage 3에서 수행한다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2 `source-aware comparison 구현과 regression test`로 진행한다.

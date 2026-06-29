# Task M010 #14 Stage 2 보고서

GitHub Issue: [#14](https://github.com/postmelee/codex-usage-analyzer/issues/14)
구현계획서: [`task_m010_14_impl.md`](../plans/task_m010_14_impl.md)
Stage: 2

## 단계 목적

Stage 2는 Stage 1에서 승인한 reason taxonomy와 optional `sourcePolicy` 설계를 실제 profile smoke 비교 로직과 regression test로 구현하는 단계다.

이번 단계에서는 baseline schemaVersion을 올리지 않고 optional top-level `sourcePolicy`를 허용했다. source policy가 지정된 field는 값 차이가 있어도 parser bug 후보인 `numeric_mismatch`나 `value_mismatch` 대신 source-aware reason을 반환한다. source policy가 없는 core comparable field는 기존 mismatch reason을 유지한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/profile-baseline.js` | optional `sourcePolicy` validation, source-sensitive field 목록, source-aware mismatch reason 적용을 추가했다. |
| `src/__tests__/profile-baseline.test.js` | source policy numeric mismatch, comparable field fallback, source-sensitive parity fallback, source mismatch fixture, invalid policy, script safety regression test를 추가했다. |
| `src/__tests__/fixtures/profile-baseline/source-mismatch-baseline.json` | synthetic source mismatch baseline fixture를 추가했다. |
| `mydocs/working/task_m010_14_stage2.md` | Stage 2 구현 결과와 검증 결과를 기록했다. |

## 본문 변경 정도 / 본문 무손실 여부

`src/profile-baseline.js`는 기존 public export를 늘리지 않고 내부 comparison 흐름만 보강했다. `PROFILE_BASELINE_SCHEMA_VERSION`은 1로 유지했고, 기존 `redacted-baseline.json`과 `not_comparable` marker 동작은 유지했다.

새 fixture는 synthetic value만 사용하며 실제 profile 값, raw analyzer JSON, local path, account identifier, credential, screenshot 원본을 포함하지 않는다.

## 구현 내용

- `sourcePolicy`는 optional top-level object로 추가했다.
- 허용 reason은 다음 세 가지로 제한했다.
  - `source_mismatch`
  - `profile_parity_not_guaranteed`
  - `remote_profile_source_differs`
- `sourcePolicy` key는 기존 comparison field path만 허용한다.
- scalar mismatch는 다음 순서로 reason을 결정한다.
  - field source policy가 있으면 해당 source-aware reason
  - source-sensitive field이고 snapshot diagnostic이 `profileComparison.parity: "not_guaranteed"`이면 `profile_parity_not_guaranteed`
  - 아니면 기존 fallback reason인 `numeric_mismatch`, `value_mismatch`, `actual_field_absent`
- ranking mismatch는 field-level source policy가 있으면 `actual_ranking_unavailable`, `actual_ranking_not_empty`, `actual_ranking_item_missing`, item key mismatch reason 대신 source-aware reason을 사용한다.
- source policy가 없는 `usage.totalTokens` mismatch는 기존처럼 `numeric_mismatch`로 남도록 regression test를 추가했다.
- profile smoke script는 source-aware mismatch summary를 안전하게 출력하되, failed summary이므로 exit status 1을 유지한다. script safety test에서 input path와 parser fixture path가 stdout에 노출되지 않음을 확인했다.

## 검증 결과

실행 명령:

```bash
npm test
node --input-type=module -e '<source-mismatch smoke assertion>'
git diff --check
```

결과:

- OK: `npm test` 통과. tests 47, pass 47, fail 0.
- OK: source-mismatch smoke assertion 통과. summary는 status `failed`, mismatched 4, sourceMismatch 4.
- OK: fixture-sample guard는 `npm test` 안의 `rejects sample fixture snapshots for profile smoke`와 script guard test에서 계속 통과했다.
- OK: 기존 redacted baseline fixture validation과 script safe summary test가 계속 통과했다.
- OK: `git diff --check` 통과.

## 잔여 위험

- source-aware mismatch도 aggregate status는 기존처럼 `failed`다. 이는 Stage 1 결정대로 field-level reason을 보강하되 값 차이는 계속 드러내기 위한 선택이다. README에서 Stage 3에 이 해석을 명확히 설명해야 한다.
- `sourcePolicy`는 비교 field path 단위만 지원한다. ranking item 단위 policy가 필요하면 별도 task에서 schema 확장 여부를 검토해야 한다.
- source-sensitive 기본 reason은 `profileComparison.parity: "not_guaranteed"` diagnostic에 의존한다. diagnostic이 없는 외부 snapshot은 source policy 없이 기존 fallback reason을 받는다.

## 다음 단계 영향

- Stage 3는 README와 fixture README에 `sourcePolicy`와 `not_comparable` marker의 차이를 설명해야 한다.
- Stage 3는 source-aware mismatch가 CLI exit status 1을 유지한다는 점을 문서화해야 한다.
- Stage 3 문서 작업에서도 실제 profile 값, raw analyzer JSON, local path, credential, screenshot 원본은 포함하지 않는다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3 `README와 fixture 문서 보강`으로 진행한다.

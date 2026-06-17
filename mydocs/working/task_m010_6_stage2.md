# Task M010 #6 Stage 2 완료 보고서

GitHub Issue: [#6](https://github.com/postmelee/codex-usage-analyzer/issues/6)
구현계획서: [`task_m010_6_impl.md`](../plans/task_m010_6_impl.md)
Stage: 2

## 단계 목적

Stage 2는 Stage 1에서 정의한 redacted profile baseline 계약을 실제로 비교할 수 있는 내부 모듈과 smoke command로 구현하는 단계다.

이번 단계에서는 baseline validation, tolerance 비교, `not_comparable` 처리, sample fixture guard, safe summary 출력, script usage를 구현했다. public SDK export와 `UsageSnapshot v2` schema는 변경하지 않았다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/profile-baseline.js` | redacted baseline loader/validator, UsageSnapshot loader, baseline comparison, safe summary formatter를 추가했다. |
| `scripts/profile-smoke.js` | redacted baseline과 production snapshot JSON 파일을 비교하는 로컬 QA command를 추가했다. |
| `src/__tests__/profile-baseline.test.js` | exact match, tolerance, mismatch, not comparable, skipped, privacy validation, sample fixture guard, script output safety를 검증했다. |
| `src/__tests__/fixtures/profile-baseline/redacted-baseline.json` | parser fixture smoke가 통과하도록 synthetic expected 값을 parser fixture aggregate와 맞췄고, streak은 `not_comparable`로 유지했다. |
| `mydocs/working/task_m010_6_stage2.md` | Stage 2 완료 보고서다. |

## 본문 변경 정도 / 본문 무손실 여부

기존 analyzer production output, public SDK export, CLI `analyze` command는 변경하지 않았다.

새 smoke helper는 `src/index.js`와 `src/index.d.ts`에 export하지 않는 내부 QA 용도다. `scripts/profile-smoke.js`는 입력 파일 경로와 raw snapshot JSON을 stdout/stderr에 다시 출력하지 않고, field-level safe summary만 출력한다.

## 검증 결과

실행 명령:

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser > <tmp-parser-snapshot.json>
node scripts/profile-smoke.js --baseline src/__tests__/fixtures/profile-baseline/redacted-baseline.json --snapshot <tmp-parser-snapshot.json>
node bin/codex-usage-analyzer.js analyze --json --fixture-sample > <tmp-sample-snapshot.json>
! node scripts/profile-smoke.js --baseline src/__tests__/fixtures/profile-baseline/redacted-baseline.json --snapshot <tmp-sample-snapshot.json>
node scripts/profile-smoke.js --help
git diff --check
```

결과:

- OK: `npm test` 통과. 39개 테스트 모두 pass.
- OK: parser fixture snapshot과 redacted baseline smoke 통과.
  - summary: total 19, matched 17, within tolerance 0, mismatched 0, not comparable 2, skipped 0.
  - `activity.currentStreakDays`와 `activity.longestStreakDays`는 `remote_profile_source_differs`로 `not_comparable` 처리.
- OK: sample fixture snapshot은 `sample_fixture_not_allowed`로 거부됨.
- OK: `node scripts/profile-smoke.js --help`는 raw input file 접근 없이 usage 출력.
- OK: `git diff --check` 통과.

## 잔여 위험

- 실제 Codex profile UI 값과의 parity는 아직 수행하지 않았다. Stage 4에서 실제 local analyzer output과 사용자가 제공 가능한 redacted baseline 범위를 확인해야 한다.
- profile UI 축약값의 tolerance 기본값은 synthetic fixture 기준이다. 실제 UI 표시 단위에 맞춘 tolerance 예시는 Stage 3 README와 Stage 4 smoke에서 더 구체화해야 한다.
- smoke script는 로컬 QA 도구이며, npm package publish 대상 파일 정책은 #7 release task에서 다시 확인해야 한다.

## 다음 단계 영향

- Stage 3는 README에 profile parity smoke 사용법, redacted baseline 작성 원칙, 결과 해석, known mismatch reason을 문서화한다.
- Stage 3 문서에서는 sample fixture가 smoke에서 거부된다는 점과 `not_comparable`의 의미를 명확히 설명해야 한다.
- Stage 4 실제 smoke는 raw analyzer JSON이나 raw baseline을 보고서에 보관하지 않고 safe summary만 남겨야 한다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3 — README와 QA checklist 정리로 진행한다.

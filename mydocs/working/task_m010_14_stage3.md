# Task M010 #14 Stage 3 보고서

GitHub Issue: [#14](https://github.com/postmelee/codex-usage-analyzer/issues/14)
구현계획서: [`task_m010_14_impl.md`](../plans/task_m010_14_impl.md)
Stage: 3

## 단계 목적

Stage 3는 Stage 2에서 구현한 source-aware profile smoke 비교 정책을 README와 fixture contract 문서에 반영하는 단계다. 사용자와 기여자가 `mismatch` 결과를 parser bug 후보와 remote/local source 차이로 구분할 수 있게 하는 것이 목적이다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `README.md` | profile smoke result reason taxonomy, `sourcePolicy` 예시, source-aware mismatch의 nonzero exit 의미, source-sensitive known mismatch reason을 추가했다. |
| `src/__tests__/fixtures/profile-baseline/README.md` | fixture allowed shape에 `sourcePolicy`를 추가하고 `not_comparable` marker와의 차이를 문서화했다. |
| `mydocs/working/task_m010_14_stage3.md` | Stage 3 문서 보강과 검증 결과를 기록했다. |

## 본문 변경 정도 / 본문 무손실 여부

README는 기존 profile parity smoke 절차와 redaction rules를 유지하고, 결과 reason 해석과 `sourcePolicy` 설명만 추가했다. fixture README도 기존 allowed shape와 redaction rules를 보존한 채 `sourcePolicy` 설명을 삽입했다.

새 문서 내용은 baseline metadata 설명만 다루며 `UsageSnapshot v2` 출력 계약이 변경되지 않는다는 점을 명시했다. 실제 profile 값, raw analyzer JSON, local path, account identifier, credential, screenshot 원본은 추가하지 않았다.

## 검증 결과

실행 명령:

```bash
npm test
rg -n "source_mismatch|not_comparable|profile_parity_not_guaranteed|remote account-level|local session" README.md src/__tests__/fixtures/profile-baseline
node --input-type=module -e '<privacy-pattern-scan>'
git diff --check
```

결과:

- OK: `npm test` 통과. tests 47, pass 47, fail 0.
- OK: README와 fixture 문서에서 `source_mismatch`, `not_comparable`, `profile_parity_not_guaranteed`, `remote account-level`, `local session` 문구가 확인됐다.
- OK: privacy-pattern-scan 통과. README와 profile-baseline fixture 문서/JSON에서 금지한 민감 패턴을 찾지 못했다.
- OK: `git diff --check` 통과.

참고: 민감 패턴 확인용 `rg`는 매치 없음이 성공 조건이라 exit 1을 반환한다. 단계 검증에는 같은 패턴을 검사하는 Node scanner의 exit 0 결과를 기록했다.

## 잔여 위험

- source-aware mismatch는 여전히 aggregate `failed`와 script exit status 1을 반환한다. README에 이 점을 명시했지만, 실제 release checklist에서는 failed summary를 reason 기준으로 해석해야 한다.
- `sourcePolicy`는 baseline-local metadata이므로 wrapper나 외부 문서에서 snapshot schema처럼 오해하지 않도록 Stage 4 최종 보고에도 한 번 더 요약해야 한다.

## 다음 단계 영향

- Stage 4는 전체 통합 검증과 최종 보고에서 `sourcePolicy`가 `UsageSnapshot v2` schema를 바꾸지 않았다는 점을 다시 확인한다.
- Stage 4는 source-mismatch smoke를 synthetic fixture와 parser fixture snapshot으로만 실행하고, 실제 profile baseline은 저장소에 만들지 않는다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 Stage 4 `통합 검증과 최종 정리`로 진행한다.

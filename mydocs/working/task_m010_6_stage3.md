# Task M010 #6 Stage 3 완료 보고서

GitHub Issue: [#6](https://github.com/postmelee/codex-usage-analyzer/issues/6)
구현계획서: [`task_m010_6_impl.md`](../plans/task_m010_6_impl.md)
Stage: 3

## 단계 목적

Stage 3는 Stage 2에서 구현한 profile smoke helper를 README에 문서화하고, 실제 사용자가 redacted baseline을 만들 때 지켜야 할 QA checklist와 known mismatch reason을 정리하는 단계다.

이번 단계에서는 `README.md`에 profile parity smoke 사용법, 결과 상태 의미, known mismatch reason, redaction rules를 추가했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `README.md` | `Profile Parity Smoke` 섹션을 추가하고, redacted baseline 작성 방법, smoke command, 결과 상태, known mismatch reason, redaction rules를 문서화했다. Non-goal의 private profile endpoint 표현도 명확히 했다. |
| `mydocs/working/task_m010_6_stage3.md` | Stage 3 완료 보고서다. |

## 본문 변경 정도 / 본문 무손실 여부

README는 기존 CLI/SDK/Ownership/Tests 구조를 유지하고, fixture sample 설명 뒤에 profile parity smoke 섹션을 추가했다. 기존 analyzer 동작 설명과 public API 문서는 삭제하지 않았다.

Non-goal 항목 한 줄은 private Codex Desktop profile endpoint를 사용하지 않는다는 의미가 더 명확하도록 표현만 조정했다.

## 검증 결과

실행 명령:

```bash
npm test
node scripts/profile-smoke.js --help
rg -n "Profile parity smoke|redacted baseline|not_comparable|remote account-level|local session" README.md
! rg -n "call.*internal|internal.*profile API|screenshot OCR|raw session|/Users/|access_token|refresh_token|Bearer |sk-|github_pat_" README.md
git diff --check
```

결과:

- OK: `npm test` 통과. 39개 테스트 모두 pass.
- OK: `node scripts/profile-smoke.js --help`가 usage를 출력했다.
- OK: README에서 redacted baseline, `not_comparable`, remote account-level source, local session source 설명이 확인됐다.
- OK: README privacy wording scan에서 금지 패턴 match 없음.
- OK: `git diff --check` 통과.

## 잔여 위험

- README는 command 사용법과 redaction 원칙을 설명하지만, 실제 사용자 profile 값과의 비교는 Stage 4에서 redacted baseline 제공 가능 범위를 확인해야 한다.
- `scripts/profile-smoke.js`가 npm package에 포함될지 여부는 #7 release/publish 작업에서 `npm pack --dry-run`으로 다시 확인해야 한다.

## 다음 단계 영향

- Stage 4는 README에 적힌 절차대로 실제 local analyzer output과 smoke command를 실행하고, raw JSON 없이 safe summary만 보고서에 남긴다.
- Stage 4 final report는 #7 release checklist에 profile parity smoke command를 넘겨야 한다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 Stage 4 — 실제 smoke와 최종 정리로 진행한다.

# Task M010 #6 Stage 1 완료 보고서

GitHub Issue: [#6](https://github.com/postmelee/codex-usage-analyzer/issues/6)
구현계획서: [`task_m010_6_impl.md`](../plans/task_m010_6_impl.md)
Stage: 1

## 단계 목적

Stage 1은 실제 Codex Desktop profile 화면 값을 저장소에 직접 보관하지 않고도 profile parity smoke test를 설계할 수 있도록 redacted baseline 계약과 synthetic fixture를 만드는 단계다.

이번 단계에서는 baseline의 top-level 구조, 비교 대상 필드, 비교 불가능 상태 표현, redaction 금지 원칙을 fixture README와 JSON 예시로 고정했다. 비교 로직과 CLI smoke command 구현은 Stage 2로 남겼다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/__tests__/fixtures/profile-baseline/README.md` | redacted baseline fixture 목적, 허용 구조, 비교 불가능 표현, 금지 원본 유형을 문서화했다. |
| `src/__tests__/fixtures/profile-baseline/redacted-baseline.json` | synthetic baseline 예시를 추가했다. total tokens, peak daily tokens, token breakdown, activity, favorite model, skills/plugins 기대값과 tolerance 예시를 포함한다. |
| `mydocs/working/task_m010_6_stage1.md` | Stage 1 완료 보고서다. |

## 본문 변경 정도 / 본문 무손실 여부

기존 본문을 수정하지 않고 Stage 1 fixture 파일과 보고서만 신규 추가했다.

`UsageSnapshot v2` schema, public SDK export, CLI 동작은 변경하지 않았다. baseline fixture는 Stage 2 비교 로직을 위한 synthetic test input이며 production analyzer output에는 영향을 주지 않는다.

## 검증 결과

실행 명령:

```bash
npm test
if rg -n "/Users/|/home/|/private/var/|access_token|refresh_token|Bearer |sk-|github_pat_|npm_[A-Za-z0-9]|session_id|thread_id|thread title|screenshot|data:image" src/__tests__/fixtures/profile-baseline; then exit 1; else exit 0; fi
node -e "JSON.parse(require('fs').readFileSync('src/__tests__/fixtures/profile-baseline/redacted-baseline.json','utf8')); console.log('baseline json ok')"
git diff --check
```

결과:

- OK: `npm test` 통과. 29개 테스트 모두 pass.
- OK: profile-baseline fixture privacy scan에서 금지 패턴 match 없음.
- OK: `redacted-baseline.json` JSON parse 성공.
- OK: `git diff --check` 통과.

## 잔여 위험

- Stage 1은 baseline 계약과 fixture만 정의했다. 실제 baseline validation, tolerance comparison, fixture-sample guard는 Stage 2에서 구현해야 한다.
- profile UI 축약값의 실제 허용 오차는 Stage 2 구현과 Stage 4 실제 smoke에서 조정 가능성을 확인해야 한다.

## 다음 단계 영향

- Stage 2는 이 fixture 계약을 기준으로 `src/profile-baseline.js`와 `scripts/profile-smoke.js`를 구현한다.
- `redacted-baseline.json`은 synthetic fixture이므로 실제 Codex profile parity 성공 기준으로 사용하지 않는다.
- Stage 2 smoke command는 `extensions["codexUsageAnalyzer.fixture"]`가 있는 sample snapshot을 거부해야 한다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2 — 비교 로직과 smoke command 구현으로 진행한다.

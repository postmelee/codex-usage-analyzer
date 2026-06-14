# Task M010 #5 수행계획서

GitHub Issue: [#5](https://github.com/postmelee/codex-usage-analyzer/issues/5)
마일스톤: M010

## 목적

이 task는 `UsageSnapshot v2`의 선택 필드인 `codexAssets.avatar`와 `codexAssets.pet`을 실제 analyzer production output에서 어떻게 다룰지 확정한다. 목표는 로컬 Codex 환경에서 avatar/pet asset을 재현 가능하게 찾을 수 있는지 검증하고, 찾을 수 없거나 privacy 위험이 있는 경우 sample 값이나 private path로 위장하지 않는 safe output 정책을 구현하는 것이다.

최종 결과는 analyzer가 asset source를 발견할 수 있는 환경에서는 안전한 `assetRef` 또는 허용된 asset 형태만 출력하고, 발견할 수 없는 환경에서는 `codexAssets`를 생략하거나 `null`/diagnostic으로 이유를 추적할 수 있게 만드는 것이다.

## 배경

Issue #5는 #1 inventory에서 deferred로 남긴 avatar/pet asset source를 후속 처리하기 위해 등록됐다. #1은 `<codex-home>/generated_images/`와 `<codex-home>/pets/`를 asset 후보로 보았지만, generated output은 private artifact일 수 있고 pet source는 확인되지 않았으므로 기본 analyzer JSON에 local path를 넣으면 안 된다고 정리했다.

현재 `UsageSnapshot v2` schema는 `codexAssets`를 optional field로 허용하고, `avatar`/`pet` asset item에는 `kind`, `url`, `assetRef`, `contentType`을 요구한다. sample fixture에는 remote URL 형태의 avatar가 있지만, production `analyzeUsage()`는 wrapper-owned profile/avatar 정보를 반환하지 않는다. 따라서 이번 task는 sample fixture와 production analyzer를 다시 섞지 않으면서, 실제 source discovery와 safe output 기준을 별도로 고정해야 한다.

## 범위

### 포함

- `codexAssets.avatar`와 `codexAssets.pet`의 local source 후보를 재검토한다.
- 로컬 asset discovery가 안전하게 가능한지 확인한다.
- 기본 analyzer JSON에서 local absolute path, account image URL, private file content가 노출되지 않도록 safe output 정책을 확정한다.
- asset을 찾을 수 없는 경우의 unavailable/null diagnostic 정책을 정한다.
- 필요한 경우 production analyzer에 asset aggregate를 연결한다.
- synthetic fixture와 regression test를 추가한다.
- README에 asset output 의미, privacy 한계, wrapper responsibility를 문서화한다.
- 실제 local analyzer smoke로 `codexAssets`와 diagnostics를 확인한다.

### 제외

- 웹 서비스 이미지 업로드/storage 구현
- 카드 UI 이미지 합성
- GitHub profile image/bio 수집
- Codex Desktop remote profile API 호출
- account identity 기반 avatar URL 수집
- private local image file content를 기본 JSON에 data URL로 포함
- `UsageSnapshot v2` schema 변경

## 설계 방향

- production analyzer는 sample fixture의 `/assets/...` avatar URL을 실제 결과처럼 반환하지 않는다.
- local absolute path는 snapshot core field와 diagnostics에 출력하지 않는다.
- `assetRef`는 출력하더라도 local path가 아니라 analyzer가 정의한 안전한 logical reference만 허용한다.
- `remote-url`은 analyzer가 직접 수집하지 않는다. 원격 profile image URL은 wrapper/product-owned 영역으로 둔다.
- `data-url`은 기본 analyzer output에서 사용하지 않는다. private image content 유출 위험이 있으므로 별도 opt-in export 설계 없이는 제외한다.
- source가 불충분하면 `codexAssets`를 생략하거나 `avatar`/`pet`을 `null`로 두고, `extensions["codexUsageAnalyzer.diagnostics"]`에 reason을 남긴다.
- asset source discovery는 file metadata와 allowlisted identifier만 사용하고, image binary 내용은 기본 parser 경로에서 읽지 않는다.
- 기존 parser 구조를 따른다.
  - `src/parser/codex-home.js`
  - 별도 aggregate module
  - `src/analyze.js` diagnostics merge
  - fixture + unit/integration tests

## 문서 위치 판단

이번 task는 analyzer 사용자가 `codexAssets`의 의미와 privacy 한계를 알아야 하므로 README를 수정한다. 상세 source 판단과 smoke 결과는 HWF 작업 산출물에 기록한다. 별도 `mydocs/tech/` 문서는 이번 task에서 새로 만들지 않고, #1 inventory와 단계 보고서로 추적한다.

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| `README.md` | 공식 사용자/기여자 문서 | 사용자, 기여자, wrapper 구현자 | `README.md` | `mydocs/tech/` | asset output이 기본 analyzer 책임인지 wrapper 책임인지 CLI/SDK 사용자도 알아야 한다. |
| `mydocs/plans/task_m010_5.md` | 작업 산출물 | 내부 작업자, 에이전트 | `mydocs/plans/` | 해당 없음 | 구현 전 승인용 수행계획서다. |
| `mydocs/plans/task_m010_5_impl.md` | 작업 산출물 | 내부 작업자, 에이전트 | `mydocs/plans/` | 해당 없음 | 승인 후 단계별 산출물과 검증 명령을 구체화한다. |
| `mydocs/working/task_m010_5_stage{N}.md` | 작업 산출물 | 내부 작업자, 에이전트 | `mydocs/working/` | 해당 없음 | 단계별 source 판단, 검증, privacy review를 기록한다. |
| `mydocs/report/task_m010_5_report.md` | 작업 산출물 | 내부 작업자, 에이전트 | `mydocs/report/` | 해당 없음 | 최종 결과와 PR 게시 전 승인 기록이다. |

## 예상 변경 파일

신규:

- `src/parser/asset-aggregate.js`
- `src/__tests__/parser-asset.test.js`
- `src/__tests__/fixtures/assets/README.md`
- `src/__tests__/fixtures/assets/{fixture files}`
- `mydocs/plans/task_m010_5_impl.md`
- `mydocs/working/task_m010_5_stage1.md`
- `mydocs/working/task_m010_5_stage2.md`
- `mydocs/working/task_m010_5_stage3.md`
- `mydocs/working/task_m010_5_stage4.md`
- `mydocs/report/task_m010_5_report.md`

수정:

- `README.md`
- `src/analyze.js`
- `src/__tests__/analyze.test.js`
- 필요 시 `src/index.d.ts`
- `mydocs/orders/20260614.md`

이번 task 산출물:

- `mydocs/orders/20260614.md`
- `mydocs/plans/task_m010_5.md`
- `mydocs/plans/task_m010_5_impl.md`
- `mydocs/working/task_m010_5_stage{N}.md`
- `mydocs/report/task_m010_5_report.md`

## 잠정 단계

- **Stage 1 — asset source contract와 fixture 설계**
  - #1 inventory를 기준으로 local avatar/pet 후보 source를 재검토한다.
  - local path, file content, account URL을 출력하지 않는 safe output contract를 확정한다.
  - synthetic fixture에서 발견 가능/불가능/민감 source 제외 case를 만든다.
  - 검증 관점: fixture에 실제 local path, credential, private image binary, account identifier가 없는지 확인한다.
- **Stage 2 — asset aggregate 구현**
  - `asset-aggregate` parser를 추가한다.
  - 안전한 `assetRef` 또는 unavailable diagnostic을 반환한다.
  - raw path와 file content가 diagnostics에 들어가지 않도록 unit test로 고정한다.
  - 검증 관점: source 없음, safe source 있음, unsafe source 제외 case를 테스트한다.
- **Stage 3 — analyzer integration과 README 문서화**
  - `analyzeUsage()` production path에 asset aggregate를 연결한다.
  - `codexAssets`를 채울지, 생략할지, `null`로 둘지 Stage 1 정책에 맞게 구현한다.
  - README에 analyzer와 wrapper의 asset 책임 경계를 문서화한다.
  - 검증 관점: `UsageSnapshot v2` schema valid, sample fixture와 production output 분리 유지.
- **Stage 4 — 실제 smoke, privacy review, 최종 보고**
  - 실제 local analyzer output의 `codexAssets`와 diagnostics를 확인한다.
  - raw JSON과 local path는 문서에 보존하지 않고 summary만 기록한다.
  - 최종 보고서와 오늘할일 완료 처리 후 PR 준비 상태로 정리한다.

## 검증 계획

### 단계별 검증

- Stage 1
  - `npm test`
  - fixture privacy pattern review
  - `git diff --check`
- Stage 2
  - `npm test`
  - asset aggregate unavailable/safe-source/unsafe-source unit test 확인
  - diagnostic raw path/file content 미노출 수동 확인
- Stage 3
  - `npm test`
  - `node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser`
  - `node bin/codex-usage-analyzer.js analyze --json --fixture-sample`
  - README가 remote profile/API 또는 wrapper-owned URL 수집을 암시하지 않는지 확인
- Stage 4
  - `npm test`
  - `node bin/codex-usage-analyzer.js analyze --json`
  - `git diff --check`
  - 실제 smoke 결과를 raw JSON 없이 stage/final report에 요약

### 통합 검증

- 기본 analyzer JSON에 local absolute path가 노출되지 않는다.
- 기본 analyzer JSON에 credential/token-like value가 노출되지 않는다.
- 기본 analyzer JSON에 private image binary 또는 data URL이 포함되지 않는다.
- source unavailable 환경에서 sample avatar URL로 fallback하지 않는다.
- asset discovery가 가능한 fixture에서는 재현 가능한 safe asset reference가 나온다.
- `pet`이 비어 있는 경우 diagnostic으로 이유를 추적할 수 있다.
- `UsageSnapshot v2` schema 변경 없이 구현한다.
- `git status --short`가 PR 준비 전 빈 출력이다.
- `git diff --check`가 경고 없이 통과한다.

## 리스크

- **source 부재**: local environment에 pet source가 없을 수 있다. 이 경우 `null` 또는 omitted output과 diagnostic으로 처리한다.
- **privacy leakage**: generated image path, file name, account image URL, binary content가 민감할 수 있다. 기본 output은 safe logical reference와 summary diagnostics만 허용한다.
- **schema 압력**: 현재 asset schema는 unavailable reason을 core field에 담을 수 없다. schema 변경 없이 diagnostics extension을 우선 사용한다.
- **wrapper 책임 혼동**: avatar URL은 product/wrapper 영역일 수 있다. README에서 analyzer가 remote profile image를 수집하지 않는다고 명확히 쓴다.
- **실제 Codex Desktop parity 불확실**: Desktop의 avatar/pet 정책이 local file과 직접 연결되지 않을 수 있다. remote profile/API 호출은 #6 또는 별도 승인 범위로 남긴다.

## 승인 요청 사항

- #5를 local asset source discovery와 safe output 정책 구현으로 진행하는 것
- 기본 analyzer JSON에 local absolute path, remote profile image URL, data URL image content를 넣지 않는 것
- asset source가 없거나 안전하지 않으면 sample 값으로 fallback하지 않고 unavailable/null diagnostic을 유지하는 것
- 웹 업로드/storage, 카드 합성, GitHub profile image/bio 수집, Codex Desktop remote profile API 호출, schema 변경을 제외하는 것
- README에 `codexAssets` 의미와 wrapper 책임 경계를 문서화하는 것
- Stage 1-4 잠정 단계와 검증 계획

승인되면 `task_m010_5_impl.md`에서 단계별 산출물, 검증 명령, 커밋 메시지를 구체화한다.

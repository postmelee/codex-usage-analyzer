# Task M010 #6 구현계획서

수행계획서: [`task_m010_6.md`](task_m010_6.md)
GitHub Issue: [#6](https://github.com/postmelee/codex-usage-analyzer/issues/6)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | baseline contract와 fixture 설계 | redacted baseline 구조, synthetic fixture, `task_m010_6_stage1.md` | `npm test`, fixture privacy review, `git diff --check` |
| 2 | 비교 로직과 smoke command 구현 | `src/profile-baseline.js`, `scripts/profile-smoke.js`, tests, stage report | `npm test`, synthetic smoke command, fixture-sample guard, `git diff --check` |
| 3 | README와 QA checklist 정리 | README smoke 사용법, known mismatch reason, stage report | `npm test`, README snippet review, privacy wording review, `git diff --check` |
| 4 | 실제 smoke와 최종 정리 | 실제 local smoke summary, privacy review, final report, 오늘할일 완료 | `npm test`, 실제 CLI/smoke 실행, `git diff --check` |

## 문서 위치 확인

수행계획서의 "문서 위치 판단"과 실제 Stage 산출물 경로를 일치시킨다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `README.md` | 저장소 루트 `README.md` | `README.md` | OK | profile parity smoke 사용법과 redaction 원칙을 사용자/기여자에게 설명한다. |
| `scripts/profile-smoke.js` | `scripts/` | `scripts/profile-smoke.js` | OK | public SDK export가 아니라 로컬 QA command로 둔다. |
| `src/profile-baseline.js` | `src/` | `src/profile-baseline.js` | OK | 비교 로직을 테스트 가능한 내부 module로 둔다. `src/index.js` public export에는 추가하지 않는다. |
| `src/__tests__/fixtures/profile-baseline/` | `src/__tests__/fixtures/` | `src/__tests__/fixtures/profile-baseline/` | OK | synthetic redacted baseline fixture를 둔다. |
| `mydocs/plans/task_m010_6_impl.md` | `mydocs/plans/` | `mydocs/plans/task_m010_6_impl.md` | OK | 구현 전 승인용 내부 산출물 |
| `mydocs/working/task_m010_6_stage{N}.md` | `mydocs/working/` | `mydocs/working/task_m010_6_stage{N}.md` | OK | 단계별 baseline 정책, 검증, privacy review를 기록한다. |
| `mydocs/report/task_m010_6_report.md` | `mydocs/report/` | `mydocs/report/task_m010_6_report.md` | OK | 최종 결과보고서 |
| `docs/` 또는 별도 공식 문서 루트 | 수행계획서에서 미선택 | 해당 없음 | OK | 현재 프로젝트의 공식 문서 루트는 README만 사용한다. |

## Stage 1 — baseline contract와 fixture 설계

### 산출물

신규:

- `src/__tests__/fixtures/profile-baseline/README.md`
- `src/__tests__/fixtures/profile-baseline/redacted-baseline.json`
- `mydocs/working/task_m010_6_stage1.md`

수정:

- `mydocs/plans/task_m010_6_impl.md` (필요 시 baseline contract 보강)

### 변경 내용

- redacted baseline JSON 구조를 확정한다.
  - `schemaVersion`: profile smoke baseline format version. 초깃값 `1`.
  - `source`: `"manual-profile-ui"` 같은 redacted source label. raw screenshot path나 account handle은 금지한다.
  - `capturedProfileAt`: profile 값을 사용자가 기록한 시각. ISO timestamp만 허용한다.
  - `profileDateBasis`: `"codex_desktop_remote_profile"` 등 비교 기준 설명.
  - `tolerances`: 숫자 필드별 `absolute` 또는 `relativePercent`.
  - `expected`: 비교 대상 값.
  - `notes`: 민감하지 않은 known mismatch hint만 허용한다.
- `expected`의 1차 필드 계약을 정한다.
  - `usage.totalTokens`
  - `usage.peakDailyTokens`
  - `usage.tokenBreakdown.inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `reasoningTokens`
  - `activity.currentStreakDays`, `longestStreakDays`, `longestTaskDurationMs`, `fastModePercent`, `reasoningEffort`, `reasoningEffortPercent`, `totalThreads`
  - `models.favoriteModel.model`
  - `skills.exploredCount`, `skills.totalUsed`, `skills.topSkills`
  - `plugins.topPlugins`
- 비교 불가능 상태를 baseline에서 표현할 수 있게 한다.
  - 필드 값이 `null`이면 analyzer null과 exact 비교한다.
  - 필드가 없으면 비교 대상에서 제외한다.
  - object에 `{ "status": "not_comparable", "reason": "..." }`를 허용해 source 차이를 명시한다.
- 금지 데이터 정책을 fixture README에 고정한다.
  - raw local absolute path
  - account handle, display name, email
  - access/refresh token, bearer token, npm/GitHub token-like value
  - raw session id, thread id, thread title
  - prompt/response, tool input/output
  - screenshot path 또는 image binary
- synthetic baseline fixture는 실제 사용자 값이 아닌 작은 deterministic 숫자와 fake public-looking field name이 아닌 generic id만 사용한다.
- Stage 2에서 사용할 comparison result contract를 stage report에 기록한다.
  - `status`: `"ok"`, `"failed"`, `"not_comparable"`, `"invalid_baseline"`, `"invalid_snapshot"`
  - `summary`: total/matched/withinTolerance/mismatched/notComparable/skipped
  - `results[]`: field, status, reason, expected, actual 중 safe scalar만 포함
  - diagnostics에는 raw path나 raw snapshot body를 넣지 않는다.

### 검증

```bash
npm test
! rg -n "/Users/|/home/|/private/var/|access_token|refresh_token|Bearer |sk-|github_pat_|npm_[A-Za-z0-9]|session_id|thread_id|thread title|screenshot|data:image" src/__tests__/fixtures/profile-baseline
git diff --check
```

수동 확인:

- baseline fixture가 synthetic data만 담는지 확인한다.
- Codex Desktop remote profile source와 local analyzer source 차이를 baseline metadata에서 설명할 수 있는지 확인한다.
- baseline format이 `UsageSnapshot v2` schema 변경을 요구하지 않는지 확인한다.

### 커밋

```text
Task #6 Stage 1: profile baseline 계약과 fixture 설계
```

## Stage 2 — 비교 로직과 smoke command 구현

### 산출물

신규:

- `src/profile-baseline.js`
- `scripts/profile-smoke.js`
- `src/__tests__/profile-baseline.test.js`
- `mydocs/working/task_m010_6_stage2.md`

수정:

- `package.json` (필요 시 `profile:smoke` npm script 추가)
- 필요 시 `src/__tests__/fixtures/profile-baseline/redacted-baseline.json`

### 변경 내용

- `src/profile-baseline.js` 내부 module을 구현한다.
  - `loadProfileBaseline(path)` 또는 script 내부에서 사용할 pure helper.
  - `compareProfileBaseline(snapshot, baseline)` pure function.
  - `formatProfileSmokeSummary(result)` 또는 script에서 사용할 safe summary helper.
- baseline validation을 구현한다.
  - `schemaVersion === 1`
  - top-level unknown sensitive key reject까지는 과도하게 하지 않고, known contract 중심으로 검증한다.
  - string value privacy scan은 local path/token-like/session-like pattern을 최소한으로 reject한다.
  - date fields는 ISO timestamp로 검증한다.
- comparison behavior를 구현한다.
  - exact scalar 비교: string, integer, null.
  - tolerance number 비교: field-specific absolute 또는 relative percent tolerance.
  - missing expected field: skipped.
  - expected `not_comparable`: notComparable.
  - analyzer unavailable/null vs expected number: mismatch.
  - analyzer diagnostics `profileComparison.parity === "not_guaranteed"`이면 streak/source mismatch reason에 반영한다.
- `--fixture-sample` guard를 구현한다.
  - `extensions["codexUsageAnalyzer.fixture"]`가 있으면 smoke comparison은 실패 또는 invalid snapshot으로 처리한다.
  - 개발자가 sample fixture로 실제 profile parity를 통과시키지 못하게 한다.
- `scripts/profile-smoke.js`를 구현한다.
  - 입력 예시:
    - `node scripts/profile-smoke.js --baseline src/__tests__/fixtures/profile-baseline/redacted-baseline.json --snapshot path/to/snapshot.json`
    - `node bin/codex-usage-analyzer.js analyze --json > /tmp/codex-usage-snapshot.json`
  - stdout에는 safe comparison summary JSON 또는 사람이 읽는 짧은 summary만 출력한다.
  - stderr에는 usage/error만 출력한다.
  - raw analyzer JSON, raw baseline body, local path를 echo하지 않는다.
- tests를 추가한다.
  - exact match
  - tolerance match
  - mismatch
  - not comparable
  - skipped missing expected
  - invalid baseline privacy pattern
  - fixture-sample guard
  - output에 fixture path/raw local path가 포함되지 않음

### 검증

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser > /private/tmp/codex-usage-parser-snapshot.json
node scripts/profile-smoke.js --baseline src/__tests__/fixtures/profile-baseline/redacted-baseline.json --snapshot /private/tmp/codex-usage-parser-snapshot.json
node bin/codex-usage-analyzer.js analyze --json --fixture-sample > /private/tmp/codex-usage-sample-snapshot.json
! node scripts/profile-smoke.js --baseline src/__tests__/fixtures/profile-baseline/redacted-baseline.json --snapshot /private/tmp/codex-usage-sample-snapshot.json
git diff --check
```

수동 확인:

- smoke command가 raw snapshot JSON을 다시 출력하지 않는지 확인한다.
- failure output도 field-level safe summary만 포함하는지 확인한다.
- sample fixture guard가 false positive를 막는지 확인한다.

### 커밋

```text
Task #6 Stage 2: profile smoke 비교 로직 구현
```

## Stage 3 — README와 QA checklist 정리

### 산출물

신규:

- `mydocs/working/task_m010_6_stage3.md`

수정:

- `README.md`
- 필요 시 `scripts/profile-smoke.js` usage text
- 필요 시 `package.json`

### 변경 내용

- README에 "Profile parity smoke" 섹션을 추가한다.
  - analyzer JSON 생성 command
  - redacted baseline 생성 방법
  - smoke command
  - 결과 해석: match, within tolerance, mismatch, not comparable
- redaction 원칙을 문서화한다.
  - 실제 계정명, local path, token, raw session id, prompt/response, screenshot 경로를 baseline에 넣지 않는다.
  - UI에 보이는 숫자는 축약/반올림될 수 있으므로 tolerance를 사용한다.
- known mismatch reason을 문서화한다.
  - Codex Desktop profile은 remote account-level source일 수 있다.
  - analyzer는 local session JSONL과 selected local metadata만 본다.
  - local session cleanup/migration/archive/delete 후 profile UI와 analyzer가 다를 수 있다.
  - streak 기준은 analyzer UTC date, profile remote activity 기준일 수 있다.
  - top skills/plugins는 local actual invocation event가 있어야 비교 가능하다.
- README가 Codex internal profile API 호출 또는 automated UI scraping을 권장하지 않도록 문구를 검토한다.

### 검증

```bash
npm test
node scripts/profile-smoke.js --help
rg -n "Profile parity smoke|redacted baseline|not_comparable|remote account-level|local session" README.md
! rg -n "call.*internal|internal.*profile API|screenshot OCR|raw session|/Users/|access_token|refresh_token|Bearer |sk-|github_pat_" README.md
git diff --check
```

수동 확인:

- README 명령이 실제 script usage와 일치하는지 확인한다.
- README가 실제 사용자 raw JSON을 저장소에 커밋하라고 오해시킬 표현을 쓰지 않는지 확인한다.
- `UsageSnapshot v2` public schema 변경을 요구하지 않는지 확인한다.

### 커밋

```text
Task #6 Stage 3: profile smoke 문서화
```

## Stage 4 — 실제 smoke와 최종 정리

### 산출물

신규:

- `mydocs/working/task_m010_6_stage4.md`
- `mydocs/report/task_m010_6_report.md`

수정:

- `mydocs/orders/20260616.md`

### 변경 내용

- 실제 local analyzer output을 생성해 smoke command가 실행 가능한지 확인한다.
  - raw analyzer JSON은 저장소 문서나 PR 본문에 붙이지 않는다.
  - `/private/tmp` 같은 임시 위치는 명령 실행용으로만 사용하고 문서에는 raw path를 기록하지 않는다.
- 실제 profile UI baseline이 없거나 불완전하면 synthetic baseline 검증 + local output generation까지만 기록하고, 실제 parity는 사용자가 redacted baseline을 제공해야 가능하다고 명시한다.
- 사용자가 이미 제공한 profile UI 값 중 민감하지 않은 숫자 summary가 있으면 redacted baseline 후보로 수동 비교 가능성을 확인한다.
- Stage 4 report에는 safe summary만 기록한다.
  - analyzer diagnostics status
  - parsed/unavailable field categories
  - smoke command status
  - mismatch/not comparable count
  - privacy review 결과
- 최종 보고서에 #7 handoff를 정리한다.
  - #7 npm publish 전 실행해야 할 smoke command
  - release checklist에 포함할 profile parity smoke 항목
- 오늘할일 #6 행을 완료 상태로 갱신한다.

### 검증

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser
node scripts/profile-smoke.js --baseline src/__tests__/fixtures/profile-baseline/redacted-baseline.json --snapshot /private/tmp/codex-usage-parser-snapshot.json
git diff --check
git status --short
```

수동 확인:

- 실제 smoke 결과에 raw local path, token-like value, account identifier, session id, prompt/response가 없는지 요약 기준으로 확인한다.
- stage/final report가 raw JSON과 raw profile baseline을 보관하지 않는지 확인한다.
- #7 release/publish task가 이 smoke 절차를 사용할 수 있게 README와 final report가 충분한지 확인한다.

### 커밋

```text
Task #6 Stage 4 + 최종 보고서: profile smoke 절차 정리
```

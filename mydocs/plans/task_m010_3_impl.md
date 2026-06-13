# Task M010 #3 구현계획서

수행계획서: [`task_m010_3.md`](task_m010_3.md)
GitHub Issue: [#3](https://github.com/postmelee/codex-usage-analyzer/issues/3)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | parser source 계약과 fixture 설계 | `src/__tests__/fixtures/parser/`, `mydocs/working/task_m010_3_stage1.md` | `npm test`, fixture privacy review, `git diff --check` |
| 2 | session JSONL discovery와 token/daily aggregate 구현 | `src/parser/`, parser tests, `mydocs/working/task_m010_3_stage2.md` | `npm test`, token/daily aggregate 확인, `git diff --check` |
| 3 | model/activity aggregate 구현 | `src/parser/`, parser/analyze tests, `mydocs/working/task_m010_3_stage3.md` | `npm test`, model/activity aggregate 확인, `git diff --check` |
| 4 | analyzer integration, CLI/README, regression hardening | `src/analyze.js`, `README.md`, tests, `mydocs/working/task_m010_3_stage4.md` | `npm test`, 기본/fixture CLI 실행, `git diff --check` |
| 5 | 실제 환경 smoke와 최종 정리 | `mydocs/working/task_m010_3_stage5.md`, `mydocs/report/task_m010_3_report.md` | `npm test`, 실제 CLI smoke, privacy review, `git diff --check` |

## 문서 위치 확인

수행계획서의 "문서 위치 판단"과 실제 Stage 산출물 경로를 일치시킨다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `README.md` | 저장소 루트 `README.md` | `README.md` | OK | production CLI 출력 의미 변경을 사용자/기여자에게 설명하는 공식 문서 |
| `mydocs/plans/task_m010_3_impl.md` | `mydocs/plans/` | `mydocs/plans/task_m010_3_impl.md` | OK | 구현 전 승인용 내부 산출물 |
| `mydocs/working/task_m010_3_stage{N}.md` | `mydocs/working/` | `mydocs/working/task_m010_3_stage{N}.md` | OK | 단계별 완료 보고서 |
| `mydocs/report/task_m010_3_report.md` | `mydocs/report/` | `mydocs/report/task_m010_3_report.md` | OK | 최종 결과보고서 |
| `mydocs/tech/` 추가 문서 | 구현계획서에서 미선택 | 해당 없음 | OK | #1 inventory를 기준으로 사용하고, 이번 task는 stage/final report에 parser 판단을 기록한다. |

## Stage 1 — parser source 계약과 fixture 설계

### 산출물

신규:

- `src/__tests__/fixtures/parser/sessions/`
- `src/__tests__/fixtures/parser/README.md`
- `mydocs/working/task_m010_3_stage1.md`

수정:

- `src/__tests__/analyze.test.js`

### 변경 내용

- parser test fixture layout을 만든다.
  - synthetic session JSONL만 사용한다.
  - prompt/response/cwd/local absolute path/token-like value를 fixture에 넣지 않는다.
  - `token_count`, timestamp, model, effort, mode, duration 후보만 포함한다.
- Stage 2-3에서 사용할 representative cases를 fixture로 고정한다.
  - normal token_count aggregate
  - missing optional breakdown field
  - malformed JSONL line
  - unknown event ignored
  - multi-day daily/streak data
  - multi-model ranking data
- `AnalyzeUsageOptions` 확장 방향을 고정한다.
  - `capturedAt`: 기존 동작 유지
  - `codexHome`: 테스트와 실제 parser source root 주입용
  - `now`: deterministic date/streak test용
- 아직 parser implementation을 production path에 연결하지 않는다.

### 검증

```bash
npm test
rg -n "/Users/|/home/|/private/var/|access_token|refresh_token|Bearer |sk-|github_pat_" src/__tests__/fixtures/parser
git diff --check
```

수동 확인:

- fixture가 synthetic data만 담고 raw private content가 없는지 확인한다.
- `--fixture-sample`과 sample helper 경로가 production parser fixture와 섞이지 않았는지 확인한다.

### 커밋

```text
Task #3 Stage 1: parser source 계약과 fixture 설계
```

## Stage 2 — session JSONL discovery와 token/daily aggregate 구현

### 산출물

신규:

- `src/parser/codex-home.js`
- `src/parser/session-jsonl.js`
- `src/parser/token-aggregate.js`
- `src/__tests__/parser-token.test.js`
- `mydocs/working/task_m010_3_stage2.md`

수정:

- `src/index.d.ts`
- `src/__tests__/analyze.test.js`

### 변경 내용

- `codexHome` discovery를 구현한다.
  - option 우선
  - 환경 변수 후보
  - 기본 home 후보
  - 존재하지 않거나 unreadable이면 unavailable diagnostic
- session JSONL discovery를 구현한다.
  - `<codex-home>/sessions/YYYY/MM/DD/*.jsonl`
  - file path는 aggregate 내부에서만 사용하고 snapshot/diagnostic에는 raw path를 넣지 않는다.
- line streaming parser를 구현한다.
  - parse 실패 line은 count만 diagnostic에 반영한다.
  - raw line이나 payload는 보존/출력하지 않는다.
- token aggregate를 구현한다.
  - `last_token_usage` primary
  - `input_tokens`, `output_tokens`, `cached_input_tokens` 또는 `cache_read_input_tokens`, `reasoning_output_tokens`
  - `cacheWriteTokens`는 source가 없으면 `null`
  - daily bucket과 `peakDailyTokens`
- source 없음은 #2 unavailable baseline과 diagnostic을 유지한다.

### 검증

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json
git diff --check
```

수동 확인:

- token/daily fixture 결과가 sample 값이 아니라 JSONL aggregate에서 계산되는지 확인한다.
- diagnostic에 raw local path, raw line, session id, prompt/response가 없는지 확인한다.

### 커밋

```text
Task #3 Stage 2: session token aggregate 구현
```

## Stage 3 — model/activity aggregate 구현

### 산출물

신규:

- `src/parser/model-aggregate.js`
- `src/parser/activity-aggregate.js`
- `src/__tests__/parser-activity.test.js`
- `mydocs/working/task_m010_3_stage3.md`

수정:

- `src/parser/session-jsonl.js`
- `src/__tests__/parser-token.test.js`
- `src/__tests__/analyze.test.js`

### 변경 내용

- model aggregate를 구현한다.
  - token aggregate 기준 `models.items`
  - token total 1위 `models.favoriteModel`
  - displayName source가 없으면 `null`
  - token 기준이 없고 usage count만 있으면 `basis: "usage_count"`를 허용한다.
- activity aggregate를 구현한다.
  - `totalThreads`: unique session file 또는 safe thread event count
  - `longestTaskDurationMs`: allowlist duration 후보가 있는 경우만 계산
  - `currentStreakDays`, `longestStreakDays`: daily totalTokens > 0 date set 기준
  - `reasoningEffort`, `reasoningEffortPercent`: non-null effort distribution 기준
  - `fastModePercent`: local source 확정 전까지 `null` + diagnostic
- activity/model aggregate에서 raw thread title, cwd, session id를 출력하지 않는다.

### 검증

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json
git diff --check
```

수동 확인:

- model/activity fixture 결과가 deterministic한지 확인한다.
- unavailable activity field가 sample 값으로 채워지지 않는지 확인한다.

### 커밋

```text
Task #3 Stage 3: model activity aggregate 구현
```

## Stage 4 — analyzer integration, CLI/README, regression hardening

### 산출물

신규:

- `mydocs/working/task_m010_3_stage4.md`

수정:

- `src/analyze.js`
- `src/cli.js`
- `src/index.d.ts`
- `src/__tests__/analyze.test.js`
- `src/__tests__/cli.test.js`
- `README.md`

### 변경 내용

- `analyzeUsage()` production path에 parser를 연결한다.
- `AnalyzeUsageOptions` 타입에 parser source 주입 option을 반영한다.
- source가 없는 환경은 #2 unavailable baseline과 diagnostic을 유지한다.
- source가 있는 fixture 환경은 usage/activity/model core fields를 실제 aggregate로 채운다.
- `--fixture-sample`은 sample fixture 전용 경로로 계속 유지한다.
- README를 업데이트한다.
  - production path는 local parser를 시도한다.
  - source 없음은 unavailable baseline으로 표현한다.
  - fixture sample은 명시적 dev/test command다.

### 검증

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json
node bin/codex-usage-analyzer.js analyze --json --fixture-sample
rg -n "fixture-sample|codexUsageAnalyzer.fixture|local_parser_not_implemented|token_count" README.md src
git diff --check
```

수동 확인:

- fixture sample path가 production fallback으로 재유입되지 않았는지 확인한다.
- README가 실제 parser와 unavailable baseline을 혼동 없이 설명하는지 확인한다.

### 커밋

```text
Task #3 Stage 4: analyzer parser 통합
```

## Stage 5 — 실제 환경 smoke와 최종 정리

### 산출물

신규:

- `mydocs/working/task_m010_3_stage5.md`
- `mydocs/report/task_m010_3_report.md`

수정:

- `mydocs/orders/20260614.md`

### 변경 내용

- 로컬 실제 환경에서 `node bin/codex-usage-analyzer.js analyze --json`을 실행한다.
- smoke output은 보고서에 raw JSON으로 붙이지 않고 핵심 판정만 기록한다.
- output privacy review를 수행한다.
  - raw local absolute path 없음
  - credential/token-like value 없음
  - account identifier 원본 없음
  - prompt/response 원문 없음
- final report에 #4-#6 handoff를 정리한다.
- 오늘할일 #3 행을 완료 상태로 갱신한다.

### 검증

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json
node bin/codex-usage-analyzer.js analyze --json --fixture-sample
git diff --check
```

수동 확인:

- 실제 환경 smoke 결과가 source 있음/없음 중 어느 상태인지 보고서에 기록한다.
- output privacy review 결과를 stage/final report에 기록한다.
- PR 준비 전 `git status --short`가 빈 출력인지 확인한다.

### 커밋

```text
Task #3 Stage 5: 실제 환경 smoke와 최종 정리
```

## 검증

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- 실패한 검증은 단계 완료로 처리하지 않는다.
- 계획 변경이 필요하면 구현계획서를 먼저 갱신하고 작업지시자 승인을 받는다.
- 문서 위치가 수행계획서 판단과 달라지면 구현 전에 수행계획서 또는 구현계획서를 갱신하고 작업지시자 승인을 받는다.

## 커밋

- 단계 커밋은 단계 산출물과 `mydocs/working/task_m010_3_stage{N}.md`를 함께 묶는다.
- 커밋 메시지는 `Task #3 Stage {N}: {핵심 내용 요약}` 형식을 따른다.
- 최종 보고서와 오늘할일 완료 갱신은 Stage 5 커밋에 함께 포함한다.

## 단계 의존성

- Stage 2는 Stage 1에서 fixture와 parser contract가 승인된 뒤 진행한다.
- Stage 3은 Stage 2의 token/daily aggregate와 diagnostics가 승인된 뒤 진행한다.
- Stage 4는 Stage 2-3 parser가 tests로 고정된 뒤 production analyzer에 연결한다.
- Stage 5는 Stage 4 통합 결과가 승인된 뒤 실제 환경 smoke와 최종 정리를 수행한다.
- 각 단계는 완료보고서 승인 후 다음 단계로 넘어간다.

## 위험과 대응

- **JSONL schema 변동**: allowlist parser와 fixture variants를 두고 unknown event는 diagnostic으로만 반영한다.
- **중복 집계**: `last_token_usage` primary 정책, session/fork dedup 후보, cumulative total 방어를 test로 고정한다.
- **민감정보 노출**: raw line/payload/path/session id/thread title/cwd를 snapshot과 report에 넣지 않는다.
- **실제 환경 smoke 불안정**: 실제 source가 없거나 unreadable이면 실패가 아니라 unavailable diagnostic으로 처리한다.
- **범위 침범**: skills/plugins, avatar/pet, remote profile smoke는 #4-#6으로 유지한다.

## 승인 요청 사항

- Stage 1-5 분할과 각 단계 산출물
- `codexHome`/`now` option을 test와 parser source 주입용으로 추가하는 방향
- session JSONL primary parser와 SQLite deep fallback 제외
- Stage별 검증 명령과 privacy review 기준
- 단계별 커밋 메시지

승인되면 Stage 1부터 진행한다.

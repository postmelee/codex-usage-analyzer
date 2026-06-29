# Task M010 #14 구현계획서

수행계획서: [`task_m010_14.md`](task_m010_14.md)
GitHub Issue: [#14](https://github.com/postmelee/codex-usage-analyzer/issues/14)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | reason taxonomy와 baseline source policy 설계 | `mydocs/working/task_m010_14_stage1.md` | `npm test`, 기존 profile smoke, `git diff --check` |
| 2 | source-aware comparison 구현과 regression test | `src/profile-baseline.js`, `src/__tests__/profile-baseline.test.js`, `src/__tests__/fixtures/profile-baseline/source-mismatch-baseline.json` | `npm test`, source-mismatch smoke, fixture-sample guard |
| 3 | README와 fixture 문서 보강 | `README.md`, `src/__tests__/fixtures/profile-baseline/README.md` | `npm test`, README/fixture reason scan, privacy wording scan |
| 4 | 통합 검증과 최종 정리 | `mydocs/report/task_m010_14_report.md`, `mydocs/orders/{yyyymmdd}.md` | `npm test`, source-mismatch smoke, `git diff --check`, `git status --short` |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `README.md` | `README.md` | `README.md` | OK | 기존 profile parity smoke 문서 위치를 유지한다. |
| `src/profile-baseline.js` | `src/` | `src/profile-baseline.js` | OK | 내부 QA 비교 모듈로 유지하고 public export는 늘리지 않는다. |
| `src/__tests__/profile-baseline.test.js` | `src/__tests__/` | `src/__tests__/profile-baseline.test.js` | OK | 기존 profile smoke regression test 파일을 확장한다. |
| `src/__tests__/fixtures/profile-baseline/redacted-baseline.json` | `src/__tests__/fixtures/profile-baseline/` | `src/__tests__/fixtures/profile-baseline/redacted-baseline.json` | OK | 기존 synthetic success baseline은 호환성 검증용으로 유지한다. |
| `src/__tests__/fixtures/profile-baseline/source-mismatch-baseline.json` | `src/__tests__/fixtures/profile-baseline/` | `src/__tests__/fixtures/profile-baseline/source-mismatch-baseline.json` | OK | 수행계획서의 synthetic source-mismatch baseline test를 별도 fixture로 구체화한다. |
| `src/__tests__/fixtures/profile-baseline/README.md` | `src/__tests__/fixtures/profile-baseline/` | `src/__tests__/fixtures/profile-baseline/README.md` | OK | baseline source policy 작성 예와 금지 값을 문서화한다. |
| `mydocs/plans/task_m010_14_impl.md` | `mydocs/plans/` | `mydocs/plans/task_m010_14_impl.md` | OK | 승인 후 Stage별 산출물과 검증 명령을 고정한다. |
| `mydocs/working/task_m010_14_stage{N}.md` | `mydocs/working/` | `mydocs/working/task_m010_14_stage{N}.md` | OK | 단계별 결과와 검증을 기록한다. |
| `mydocs/report/task_m010_14_report.md` | `mydocs/report/` | `mydocs/report/task_m010_14_report.md` | OK | 최종 결과와 PR 준비 상태를 기록한다. |
| `mydocs/orders/20260617.md` | `mydocs/orders/` | `mydocs/orders/20260617.md` | OK | task-start 당시 오늘할일 산출물로 유지한다. |
| `mydocs/orders/20260629.md` | `mydocs/orders/` | `mydocs/orders/20260629.md` | OK | 현재 작업일 기준 진행 상태를 추가 기록한다. |

## Stage 1 — reason taxonomy와 baseline source policy 설계

### 산출물

신규:

- `mydocs/working/task_m010_14_stage1.md`

수정:

- 없음

### 변경 내용

- 현재 `src/profile-baseline.js`의 comparison status와 reason 흐름을 정리한다.
- field-level result reason을 다음 범주로 고정한다.
  - comparable exact/tolerance success: `exact_match`, `numeric_within_tolerance`
  - parser bug 후보: `numeric_mismatch`, `value_mismatch`, `actual_field_absent`, ranking shape mismatch reason
  - source 차이: `source_mismatch`, `profile_parity_not_guaranteed`, `remote_profile_source_differs`
  - 비교 제외: `not_comparable`, `expected_field_absent`
- source-sensitive field 후보를 확정한다.
  - `activity.currentStreakDays`
  - `activity.longestStreakDays`
  - `activity.longestTaskDurationMs`
  - `activity.fastModePercent`
  - `activity.reasoningEffort`
  - `activity.reasoningEffortPercent`
  - `activity.totalThreads`
  - `skills.exploredCount`
  - `skills.totalUsed`
  - `skills.topSkills`
  - `plugins.topPlugins`
- baseline schema v1을 유지하면서 optional `sourcePolicy` object를 추가하는 방향을 검토한다.
  - 예: `"sourcePolicy": { "activity.totalThreads": "source_mismatch" }`
  - 기존 `expected.<field>.status = "not_comparable"` marker는 계속 지원한다.
- `UsageSnapshot v2` schema와 public SDK export를 변경하지 않는다는 기준을 Stage 1 보고서에 명시한다.

### 검증

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser
git diff --check
```

### 커밋

```text
Task #14 Stage 1: source-aware profile smoke 설계 정리
```

## Stage 2 — source-aware comparison 구현과 regression test

### 산출물

신규:

- `src/__tests__/fixtures/profile-baseline/source-mismatch-baseline.json`
- `mydocs/working/task_m010_14_stage2.md`

수정:

- `src/profile-baseline.js`
- `src/__tests__/profile-baseline.test.js`
- `src/__tests__/fixtures/profile-baseline/redacted-baseline.json`, 필요한 경우

### 변경 내용

- `validateProfileBaseline()`에서 optional `sourcePolicy` object를 허용하고, 비교 대상 field path의 policy value가 허용 reason인지 검증한다.
- `compareProfileBaseline()`에서 field path별 source policy를 scalar와 ranking comparison에 전달한다.
- 숫자 field가 tolerance 밖으로 벗어나더라도 source policy가 있으면 `status: "mismatch"`를 유지하되 reason을 `source_mismatch` 또는 승인된 source-aware reason으로 반환한다.
- snapshot diagnostics가 `profileComparison.parity: "not_guaranteed"`이고 field가 source-sensitive이면 기본 mismatch reason으로 `profile_parity_not_guaranteed`를 사용한다.
- `expected`에 명시된 `not_comparable` marker는 기존처럼 `status: "not_comparable"`을 유지한다.
- ranking field는 다음 경우를 분리한다.
  - baseline source policy 있음: source-aware reason 사용
  - actual ranking absent/unavailable: `actual_ranking_unavailable`
  - item/key mismatch: 기존 parser bug 후보 reason 유지
- regression test를 추가한다.
  - source policy가 numeric mismatch reason을 `source_mismatch`로 바꾸는지 확인
  - source-sensitive activity field가 parity diagnostic으로 `profile_parity_not_guaranteed`를 받는지 확인
  - source policy가 없는 core comparable field는 기존 `numeric_mismatch`를 유지하는지 확인
  - 기존 redacted baseline과 fixture-sample guard가 계속 통과하는지 확인

### 검증

```bash
npm test
node scripts/profile-smoke.js --baseline src/__tests__/fixtures/profile-baseline/source-mismatch-baseline.json --snapshot <tmp-parser-snapshot.json>
git diff --check
```

### 커밋

```text
Task #14 Stage 2: source-aware profile comparison 구현
```

## Stage 3 — README와 fixture 문서 보강

### 산출물

신규:

- `mydocs/working/task_m010_14_stage3.md`

수정:

- `README.md`
- `src/__tests__/fixtures/profile-baseline/README.md`

### 변경 내용

- README의 profile smoke result status 설명에 source-aware reason을 추가한다.
- README의 known mismatch reason을 `source_mismatch`, `profile_parity_not_guaranteed`, `not_comparable` 관점으로 정리한다.
- source policy는 baseline local QA metadata이며 `UsageSnapshot v2` 출력 계약이 아니라는 점을 명시한다.
- fixture README에 optional `sourcePolicy` 예와 `not_comparable` marker의 차이를 문서화한다.
- 실제 account handle, email, local path, credential, conversation id, screenshot/image path, raw analyzer JSON을 커밋하지 않는 규칙을 유지한다.

### 검증

```bash
npm test
rg -n "source_mismatch|not_comparable|profile_parity_not_guaranteed|remote account-level|local session" README.md src/__tests__/fixtures/profile-baseline
rg -n "/Users/|/home/|/private/var/|access_token|refresh_token|Bearer |sk-|github_pat_|session_id|thread_id|data:image" README.md src/__tests__/fixtures/profile-baseline
git diff --check
```

### 커밋

```text
Task #14 Stage 3: source-aware profile smoke 문서화
```

## Stage 4 — 통합 검증과 최종 정리

### 산출물

신규:

- `mydocs/working/task_m010_14_stage4.md`
- `mydocs/report/task_m010_14_report.md`

수정:

- `mydocs/orders/{yyyymmdd}.md`

### 변경 내용

- 전체 test와 source-mismatch smoke를 재실행한다.
- 실제 profile baseline은 저장소에 만들지 않는다. smoke command는 synthetic fixture와 parser fixture snapshot으로 검증한다.
- 단계별 결과, 수용 기준 충족 여부, 남은 리스크를 최종 보고서에 정리한다.
- 오늘할일 상태를 완료로 갱신한다.
- PR 게시 전 `git status --short`가 빈 출력인지 확인한다.

### 검증

```bash
npm test
node scripts/profile-smoke.js --baseline src/__tests__/fixtures/profile-baseline/source-mismatch-baseline.json --snapshot <tmp-parser-snapshot.json>
git diff --check
git status --short
```

### 커밋

```text
Task #14 Stage 4 + 최종 보고서: source-aware profile smoke 정리
```

## 검증

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- 실패한 검증은 단계 완료로 처리하지 않는다.
- 계획 변경이 필요하면 구현계획서를 먼저 갱신하고 작업지시자 승인을 받는다.
- 문서 위치가 수행계획서 판단과 달라지면 구현 전에 수행계획서 또는 구현계획서를 갱신하고 작업지시자 승인을 받는다.
- 실제 profile baseline, raw analyzer JSON, local path, account identifier, credential, screenshot 원본은 작업 문서와 fixture에 남기지 않는다.

## 커밋

- 단계 커밋은 단계 산출물과 `mydocs/working/task_m010_14_stage{N}.md`를 함께 묶는다.
- 커밋 메시지는 `Task #14 Stage {N}: {핵심 내용 요약}` 형식을 따른다.
- 최종 단계는 최종 보고서와 오늘할일 갱신을 함께 묶어 `Task #14 Stage 4 + 최종 보고서: source-aware profile smoke 정리`로 커밋한다.

## 단계 의존성

- Stage 2는 Stage 1의 source policy와 reason taxonomy가 승인된 뒤 진행한다.
- Stage 3은 Stage 2의 구현과 regression test가 승인된 뒤 진행한다.
- Stage 4는 Stage 3의 문서 보강이 승인된 뒤 진행한다.

## 위험과 대응

- **baseline schema compatibility**: `sourcePolicy`는 optional field로만 추가하고 기존 `redacted-baseline.json`이 계속 유효해야 한다.
- **numeric mismatch masking**: source policy가 없는 core comparable field는 기존 `numeric_mismatch`를 유지한다.
- **reason taxonomy 과잉 분화**: 새 reason은 `source_mismatch`와 기존 `profile_parity_not_guaranteed`, `not_comparable` 중심으로 제한한다.
- **privacy leakage**: 새 fixture는 synthetic 값만 사용하고, 실제 screenshot-derived baseline이나 raw analyzer JSON을 커밋하지 않는다.
- **scope creep**: remote API 호출, local source coverage 확장, timezone/date bucket 산식 변경, baseline generator는 구현하지 않는다.

## 승인 요청 사항

- Stage 1-4 분할과 각 Stage 산출물
- optional `sourcePolicy` 기반 source-aware reason 설계
- source-sensitive field 목록과 기본 reason 정책
- 새 synthetic `source-mismatch-baseline.json` fixture 추가
- 각 Stage 검증 명령과 커밋 메시지

승인되면 Stage 1 `reason taxonomy와 baseline source policy 설계`부터 진행한다.

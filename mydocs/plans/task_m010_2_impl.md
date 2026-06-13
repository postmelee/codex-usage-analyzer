# Task M010 #2 구현계획서

수행계획서: [`task_m010_2.md`](task_m010_2.md)
GitHub Issue: [#2](https://github.com/postmelee/codex-usage-analyzer/issues/2)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 현재 fixture 의존 경로 고정 | `mydocs/working/task_m010_2_stage1.md` | fixture 의존 grep, `npm test`, `git diff --check` |
| 2 | production unavailable snapshot 분리 구현 | `src/analyze.js`, `src/index.d.ts`, `src/__tests__/analyze.test.js`, `mydocs/working/task_m010_2_stage2.md` | `npm test`, 기본 CLI JSON 확인, `git diff --check` |
| 3 | fixture/dev/test 경로 명시화 | `src/cli.js`, `src/__tests__/cli.test.js`, `README.md`, `mydocs/working/task_m010_2_stage3.md` | `npm test`, fixture 경로 grep, CLI fixture/manual 확인, `git diff --check` |
| 4 | 회귀 검증과 최종 정리 | `README.md`, `mydocs/working/task_m010_2_stage4.md`, `mydocs/report/task_m010_2_report.md` | `npm test`, 기본 CLI JSON 확인, sample sentinel 부재 확인, `git diff --check` |

## 문서 위치 확인

수행계획서의 "문서 위치 판단"과 실제 Stage 산출물 경로를 일치시킨다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `README.md` | 저장소 루트 `README.md` | `README.md` | OK | 사용자/기여자에게 production 출력과 fixture 출력의 의미를 설명하는 공식 문서 |
| `mydocs/plans/task_m010_2_impl.md` | `mydocs/plans/` | `mydocs/plans/task_m010_2_impl.md` | OK | 구현 전 승인용 내부 산출물 |
| `mydocs/working/task_m010_2_stage{N}.md` | `mydocs/working/` | `mydocs/working/task_m010_2_stage{N}.md` | OK | 단계별 완료 보고서 |
| `mydocs/report/task_m010_2_report.md` | `mydocs/report/` | `mydocs/report/task_m010_2_report.md` | OK | 최종 결과보고서 |

## Stage 1 — 현재 fixture 의존 경로 고정

### 산출물

신규:

- `mydocs/working/task_m010_2_stage1.md`

수정:

- 해당 없음

### 변경 내용

- `src/analyze.js`, `src/cli.js`, `src/index.js`, `src/index.d.ts`, `src/__tests__/`, `README.md`, `src/fixtures/sample-v2-snapshot.js`의 fixture 의존 경로를 정리한다.
- production path에서 금지할 sample-only sentinel을 확정한다.
  - `extensions["codexUsageAnalyzer.fixture"]`
  - sample `codexProfile` 값
  - sample `usage.totalTokens`와 `models.favoriteModel` 값
  - sample `codexAssets.avatar`
- Stage 2-3에서 테스트로 고정할 assertion 목록을 stage 보고서에 기록한다.
- 이 단계는 조사/보고만 수행하며 코드와 README는 수정하지 않는다.

### 검증

```bash
rg -n "sampleUsageSnapshotV2|createSampleUsageSnapshotV2|codexUsageAnalyzer.fixture|sample-backed" src README.md mydocs/tech/task_m010_1_codex_data_source_inventory.md
npm test
git diff --check
```

수동 확인:

- stage 보고서가 production path와 fixture path를 구분해 기록했는지 확인한다.
- 실제 사용자 데이터, 로컬 private path, 인증 토큰, 계정 식별자 원본을 새로 문서화하지 않았는지 확인한다.

### 커밋

```text
Task #2 Stage 1: fixture 의존 경로 고정
```

## Stage 2 — production unavailable snapshot 분리 구현

### 산출물

신규:

- `mydocs/working/task_m010_2_stage2.md`

수정:

- `src/analyze.js`
- `src/index.d.ts`
- `src/__tests__/analyze.test.js`

### 변경 내용

- `analyzeUsage()` 기본 경로가 `sampleUsageSnapshotV2`를 clone하거나 fallback으로 사용하지 않도록 분리한다.
- production 기본 snapshot 생성 함수를 추가한다. 이름은 구현 시 코드 맥락에 맞춰 확정하되, 역할은 unavailable baseline 생성으로 제한한다.
- production 기본 snapshot은 `UsageSnapshot v2` 필수 필드를 다음 최소값으로 채운다.
  - `schemaVersion`: `2`
  - `capturedAt`: 옵션값이 있으면 검증 후 ISO string, 없으면 실행 시각
  - `producer`: analyzer name/version
  - `usage.totalTokens`: `0`
  - `usage.peakDailyTokens`: `null`
  - `usage.tokenBreakdown.*`: `null`
  - `usage.daily`: `[]`
  - `models.favoriteModel`: `null`
  - `models.items`: `[]`
  - `activity.*`: `null`
  - `skills.exploredCount`, `skills.totalUsed`: `null`
  - `skills.topSkills`, `plugins.topPlugins`: `[]`
- unavailable 상태는 `extensions`의 namespaced key에 정적 diagnostic으로 기록한다. raw local path, account identifier, profile URL, token-like value는 넣지 않는다.
- `createSampleUsageSnapshotV2()`는 fixture helper로 유지하되 production `analyzeUsage()`와 공유하지 않는다.
- `AnalyzeUsageOptions.capturedAt` 타입과 동작을 유지한다.

### 검증

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json
git diff --check
```

수동 확인:

- 기본 CLI JSON에 `codexUsageAnalyzer.fixture`, sample profile, sample avatar, sample token/model 값이 없는지 확인한다.
- 기본 CLI JSON이 `UsageSnapshot v2` 검증을 통과하는지 테스트와 수동 실행 결과로 확인한다.

### 커밋

```text
Task #2 Stage 2: production unavailable snapshot 분리
```

## Stage 3 — fixture/dev/test 경로 명시화

### 산출물

신규:

- `mydocs/working/task_m010_2_stage3.md`

수정:

- `src/cli.js`
- `src/__tests__/cli.test.js`
- `src/__tests__/analyze.test.js`
- `README.md`

### 변경 내용

- CLI에서 fixture 출력을 명시적으로 요청하는 경로를 추가한다. 옵션명은 `--fixture-sample`을 우선 사용한다.
- `codex-usage-analyzer analyze --json`은 production unavailable snapshot만 출력한다.
- `codex-usage-analyzer analyze --json --fixture-sample`은 개발/문서 확인용 sample snapshot을 출력한다.
- usage text는 기본 사용법과 fixture 사용법을 구분해 stderr/stdout 정책을 유지한다.
- CLI 테스트를 production path와 fixture path로 분리한다.
  - production path는 sample sentinel 부재와 unavailable baseline을 검증한다.
  - fixture path는 sample sentinel 존재와 valid snapshot을 검증한다.
- README의 CLI, SDK, Status 섹션을 수정해 sample-backed skeleton이 기본 출력이 아님을 명시한다.

### 검증

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json
node bin/codex-usage-analyzer.js analyze --json --fixture-sample
rg -n "fixture-sample|sample-backed|codexUsageAnalyzer.fixture|createSampleUsageSnapshotV2" README.md src
git diff --check
```

수동 확인:

- README에서 fixture 출력이 production 결과처럼 읽히지 않는지 확인한다.
- fixture 전용 옵션이 기본 `analyze --json`과 혼동되지 않는지 확인한다.

### 커밋

```text
Task #2 Stage 3: fixture 전용 경로 명시
```

## Stage 4 — 회귀 검증과 최종 정리

### 산출물

신규:

- `mydocs/working/task_m010_2_stage4.md`
- `mydocs/report/task_m010_2_report.md`

수정:

- `README.md`
- `mydocs/orders/20260614.md`

### 변경 내용

- 전체 변경을 재검토해 수행계획서 범위를 벗어난 parser 구현이나 스키마 변경이 없는지 확인한다.
- 기본 CLI/SDK path와 fixture path가 문서, 테스트, export에서 일관되게 분리되어 있는지 점검한다.
- 최종 결과보고서에 검증 결과, 남은 리스크, 후속 이슈 #3-#6 handoff를 정리한다.
- 오늘할일 #2 행을 완료 상태로 갱신한다.

### 검증

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json
node bin/codex-usage-analyzer.js analyze --json --fixture-sample
rg -n "sampleUsageSnapshotV2|createSampleUsageSnapshotV2|codexUsageAnalyzer.fixture|fixture-sample|sample-backed" README.md src mydocs/report/task_m010_2_report.md
git diff --check
```

수동 확인:

- 기본 `analyze --json` 출력에 sample-only sentinel이 없는지 확인한다.
- fixture를 쓰려면 명시적인 CLI 옵션 또는 SDK helper가 필요하다는 점이 README와 테스트에 남아 있는지 확인한다.
- 실제 사용자 데이터, 로컬 private path, 인증 토큰, 계정 식별자 원본이 새 산출물에 포함되지 않았는지 확인한다.
- PR 준비 전 `git status --short`가 빈 출력인지 확인한다.

### 커밋

```text
Task #2 Stage 4: 회귀 검증과 최종 정리
```

## 검증

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- 실패한 검증은 단계 완료로 처리하지 않는다.
- 계획 변경이 필요하면 구현계획서를 먼저 갱신하고 작업지시자 승인을 받는다.
- 문서 위치가 수행계획서 판단과 달라지면 구현 전에 수행계획서 또는 구현계획서를 갱신하고 작업지시자 승인을 받는다.

## 커밋

- 단계 커밋은 단계 산출물과 `mydocs/working/task_m010_2_stage{N}.md`를 함께 묶는다.
- 커밋 메시지는 `Task #2 Stage {N}: {핵심 내용 요약}` 형식을 따른다.
- 최종 보고서와 오늘할일 완료 갱신은 Stage 4 커밋에 함께 포함한다.

## 단계 의존성

- Stage 2는 Stage 1에서 production/fixture 의존 경로와 sample sentinel이 확정된 뒤 진행한다.
- Stage 3은 Stage 2에서 production 기본 출력이 sample-free valid snapshot으로 고정된 뒤 진행한다.
- Stage 4는 Stage 3에서 fixture 전용 CLI/문서 경로가 검증된 뒤 진행한다.
- 각 단계는 완료보고서 승인 후 다음 단계로 넘어간다.

## 위험과 대응

- **스키마 필수 필드 제약**: 실제 parser가 없어도 필수 필드는 채워야 한다. 스키마 변경 없이 0, `null`, 빈 배열, diagnostic extension 조합을 사용한다.
- **fixture 옵션 오용**: fixture 옵션이 일반 사용법처럼 보이면 사용자 혼동이 남는다. 옵션명과 README에서 sample/dev 용도임을 명시한다.
- **후속 parser 범위 침범**: 이번 task는 unavailable baseline과 경로 분리에 집중하고, 실제 token/model/activity 계산은 #3-#5로 넘긴다.
- **민감정보 노출**: diagnostic extension과 문서에는 raw local path, account identifier, profile URL, token-like value를 넣지 않는다.
- **테스트가 fixture에 재의존**: production 테스트는 sample helper를 기대값으로 사용하지 않고 sample sentinel 부재와 unavailable baseline을 직접 검증한다.

## 승인 요청 사항

- Stage 1-4 분할과 각 단계 산출물
- production unavailable snapshot 최소값 정책
- fixture CLI 옵션명을 `--fixture-sample`로 두는 방향
- README 수정 범위와 공식 문서 위치 유지
- 단계별 검증 명령과 수동 privacy review 기준
- 단계별 커밋 메시지

승인되면 Stage 1부터 진행한다.

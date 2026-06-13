# Task M010 #1 구현계획서

수행계획서: [`task_m010_1.md`](task_m010_1.md)
GitHub Issue: [#1](https://github.com/postmelee/codex-usage-analyzer/issues/1)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 현재 계약과 skeleton 동작 확인 | `mydocs/tech/task_m010_1_codex_data_source_inventory.md`, `mydocs/working/task_m010_1_stage1.md` | `npm test`, `node bin/codex-usage-analyzer.js analyze --json`, `git diff --check` |
| 2 | 로컬 Codex 데이터 소스 inventory | `mydocs/tech/task_m010_1_codex_data_source_inventory.md`, `mydocs/working/task_m010_1_stage2.md` | privacy review, credential 접근 없음 확인, `git diff --check` |
| 3 | 필드별 mapping과 fallback 정책 확정 | `mydocs/tech/task_m010_1_codex_data_source_inventory.md`, `mydocs/working/task_m010_1_stage3.md` | 필드별 필수 컬럼 수동 확인, `git diff --check` |
| 4 | 후속 이슈 정합성 검토와 최종 정리 | `mydocs/tech/task_m010_1_codex_data_source_inventory.md`, `mydocs/working/task_m010_1_stage4.md`, `mydocs/report/task_m010_1_report.md` | 후속 이슈 #2-#6 정합성 확인, `git diff --check` |

## 문서 위치 확인

수행계획서의 "문서 위치 판단"과 실제 Stage 산출물 경로를 일치시킨다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `mydocs/tech/task_m010_1_codex_data_source_inventory.md` | `mydocs/tech/` | `mydocs/tech/task_m010_1_codex_data_source_inventory.md` | OK | 후속 parser 구현자를 위한 내부 기술 조사 문서 |
| `mydocs/working/task_m010_1_stage{N}.md` | `mydocs/working/` | `mydocs/working/task_m010_1_stage{N}.md` | OK | 단계별 완료 보고서 |
| `mydocs/report/task_m010_1_report.md` | `mydocs/report/` | `mydocs/report/task_m010_1_report.md` | OK | 최종 결과보고서 |

## Stage 1 — 현재 계약과 skeleton 동작 확인

### 산출물

신규:

- `mydocs/tech/task_m010_1_codex_data_source_inventory.md`
- `mydocs/working/task_m010_1_stage1.md`

수정:

- 해당 없음

### 변경 내용

- README, CLI entrypoint, `analyzeUsage()`, fixture, schema/type, tests를 읽고 현재 `UsageSnapshot v2` 필드와 sample-backed 동작을 정리한다.
- 기술 조사 노트의 기본 구조를 만든다.
- 현재 CLI가 fixture-backed snapshot을 실제 결과처럼 반환하는 위험과 후속 #2 기준을 기록한다.
- 이 단계에서는 로컬 Codex 사용자 데이터 디렉터리나 credential 후보를 탐색하지 않는다.

### 검증

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json
git diff --check
```

수동 확인:

- 기술 조사 노트에 실제 사용자 경로, 토큰, 계정 식별자 원문이 없는지 확인한다.
- `UsageSnapshot v2` 필드 목록과 skeleton 동작 요약이 누락되지 않았는지 확인한다.

### 커밋

```text
Task #1 Stage 1: 현재 계약과 skeleton 동작 조사
```

## Stage 2 — 로컬 Codex 데이터 소스 inventory

### 산출물

신규:

- `mydocs/working/task_m010_1_stage2.md`

수정:

- `mydocs/tech/task_m010_1_codex_data_source_inventory.md`

### 변경 내용

- 로컬 Codex 데이터 후보를 설정 파일, 세션/대화 로그, usage ledger, SQLite/JSONL/JSON 파일, 앱 캐시, 원격 API 후보로 분류한다.
- 각 후보에 대해 형태, 접근 조건, 갱신 주기, 필드 후보, 신뢰도, privacy/security note를 적는다.
- credential, token, 계정 식별자 원문, raw 로그 본문은 열람하거나 문서화하지 않는다.
- 실제 환경 확인이 필요하면 파일명과 스키마 수준의 metadata만 확인하고, 문서에는 일반화된 경로 패턴과 redacted 예시만 남긴다.

### 검증

```bash
git diff --check
```

수동 확인:

- 기술 조사 노트에 실제 사용자 경로, token, credential, 계정 식별자 원문, raw 로그 본문이 없는지 확인한다.
- credential을 요구하는 원격 API 호출을 수행하지 않았는지 확인한다.
- source 후보마다 confidence와 privacy/security note가 있는지 확인한다.

### 커밋

```text
Task #1 Stage 2: 로컬 Codex 데이터 소스 inventory 정리
```

## Stage 3 — 필드별 mapping과 fallback 정책 확정

### 산출물

신규:

- `mydocs/working/task_m010_1_stage3.md`

수정:

- `mydocs/tech/task_m010_1_codex_data_source_inventory.md`

### 변경 내용

- `UsageSnapshot v2`의 tokens, daily activity, activity insights, model, top skills/plugins, avatar/pet 관련 필드별 mapping 표를 작성한다.
- 각 필드에 `source`, `confidence`, `fallback/null policy`, `privacy note`, `follow-up issue`를 채운다.
- fixture/sample 출력과 실제 analyzer 출력의 분리 기준을 후속 #2 구현 기준으로 명시한다.
- 수집 불가능하거나 보류해야 하는 값은 이유와 후속 이슈를 연결한다.

### 검증

```bash
git diff --check
```

수동 확인:

- 모든 대상 필드에 `source`, `confidence`, `fallback/null policy`, `privacy note`가 있는지 확인한다.
- 수집 불가능 또는 보류 필드에 이유와 후속 이슈 번호가 있는지 확인한다.
- `UsageSnapshot v2` 계약 변경을 구현 범위로 끌어오지 않았는지 확인한다.

### 커밋

```text
Task #1 Stage 3: UsageSnapshot 필드 mapping 정책 확정
```

## Stage 4 — 후속 이슈 정합성 검토와 최종 정리

### 산출물

신규:

- `mydocs/working/task_m010_1_stage4.md`
- `mydocs/report/task_m010_1_report.md`

수정:

- `mydocs/tech/task_m010_1_codex_data_source_inventory.md`
- `mydocs/orders/20260613.md`

### 변경 내용

- 후속 이슈와 inventory 결과의 정합성을 점검한다.
- #2: fixture 출력과 실제 analyze 출력 분리 기준이 inventory 결론과 맞는지 확인한다.
- #3: core usage/activity/model parser 범위가 Stage 3 mapping과 맞는지 확인한다.
- #4: topSkills/topPlugins extractor의 source와 normalization 기준이 mapping에 반영됐는지 확인한다.
- #5: avatar/pet asset discovery와 safe output 정책이 privacy note와 충돌하지 않는지 확인한다.
- #6: smoke test baseline과 redaction 기준이 inventory의 fallback/null policy와 맞는지 확인한다.
- 최종 결과보고서에 검증 결과, 남은 리스크, 후속 이슈 handoff를 정리한다.

### 검증

```bash
gh issue view 2 --repo postmelee/codex-usage-analyzer --json number,title,state,body,milestone
gh issue view 3 --repo postmelee/codex-usage-analyzer --json number,title,state,body,milestone
gh issue view 4 --repo postmelee/codex-usage-analyzer --json number,title,state,body,milestone
gh issue view 5 --repo postmelee/codex-usage-analyzer --json number,title,state,body,milestone
gh issue view 6 --repo postmelee/codex-usage-analyzer --json number,title,state,body,milestone
git diff --check
```

수동 확인:

- 최종 문서에 실제 사용자 경로, token, credential, 계정 식별자 원문, raw 로그 본문이 없는지 확인한다.
- 후속 이슈 #2-#6 중 inventory 결과와 충돌하는 범위가 있으면 최종 보고서에 명시한다.
- PR 준비 전 `git status --short`가 빈 출력인지 확인한다.

### 커밋

```text
Task #1 Stage 4: 후속 이슈 정합성 검토와 최종 정리
```

## 검증

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- 실패한 검증은 단계 완료로 처리하지 않는다.
- 계획 변경이 필요하면 구현계획서를 먼저 갱신하고 작업지시자 승인을 받는다.
- 문서 위치가 수행계획서 판단과 달라지면 구현 전에 수행계획서 또는 구현계획서를 갱신하고 작업지시자 승인을 받는다.

## 커밋

- 단계 커밋은 단계 산출물과 `mydocs/working/task_m010_1_stage{N}.md`를 함께 묶는다.
- 커밋 메시지는 `Task #1 Stage {N}: {핵심 내용 요약}` 형식을 따른다.
- 최종 보고서와 오늘할일 갱신은 Stage 4 커밋에 함께 포함한다.

## 단계 의존성

- Stage 2는 Stage 1의 현재 계약 조사 결과와 기술 조사 노트 구조가 확정된 뒤 진행한다.
- Stage 3은 Stage 2의 source inventory가 승인된 뒤 진행한다.
- Stage 4는 Stage 3의 필드별 mapping과 fallback 정책이 승인된 뒤 진행한다.
- 각 단계는 완료보고서 승인 후 다음 단계로 넘어간다.

## 위험과 대응

- **민감정보 노출**: 실제 사용자 경로, token, credential, 계정 식별자 원문, raw 로그 본문을 문서에 남기지 않는다. 모든 예시는 redacted 형태로 제한한다.
- **로컬 데이터 후보 오판**: 확정, 추정, 보류를 나누고 confidence를 명시한다. parser 구현이 필요한 세부 검증은 후속 이슈로 넘긴다.
- **후속 이슈 범위 침범**: 이번 task는 조사와 mapping 문서화만 수행한다. 코드, README, 스키마 변경은 후속 이슈로 남긴다.
- **계약 변경 필요성 발견**: `UsageSnapshot v2` 변경은 별도 이슈 후보로 기록하고 이번 task에서 수정하지 않는다.

## 승인 요청 사항

- Stage 1-4 분할과 각 단계 산출물
- 기술 조사 문서와 단계 보고서 위치
- 단계별 검증 명령과 수동 privacy review 기준
- 단계별 커밋 메시지

승인되면 Stage 1부터 진행한다.

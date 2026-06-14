# Task M010 #4 구현계획서

수행계획서: [`task_m010_4.md`](task_m010_4.md)
GitHub Issue: [#4](https://github.com/postmelee/codex-usage-analyzer/issues/4)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | source contract와 fixture 설계 | actual invocation source 판단, parser fixture 확장, `task_m010_4_stage1.md` | `npm test`, fixture privacy review, `git diff --check` |
| 2 | skill/plugin aggregate 구현 | `src/parser/skill-plugin-aggregate.js`, parser tests, stage report | `npm test`, ranking/unavailable 확인, `git diff --check` |
| 3 | analyzer integration과 README 문서화 | `src/analyze.js`, README, analyze tests, stage report | `npm test`, fixture/sample CLI smoke, `git diff --check` |
| 4 | 실제 smoke와 최종 정리 | 실제 analyzer smoke, privacy review, final report, 오늘할일 완료 | `npm test`, 실제 CLI smoke, `git diff --check` |

## 문서 위치 확인

수행계획서의 "문서 위치 판단"과 실제 Stage 산출물 경로를 일치시킨다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `README.md` | 저장소 루트 `README.md` | `README.md` | OK | skills/plugins 출력 의미와 local-only 한계를 사용자/기여자에게 설명한다. |
| `mydocs/plans/task_m010_4_impl.md` | `mydocs/plans/` | `mydocs/plans/task_m010_4_impl.md` | OK | 구현 전 승인용 내부 산출물 |
| `mydocs/working/task_m010_4_stage{N}.md` | `mydocs/working/` | `mydocs/working/task_m010_4_stage{N}.md` | OK | 단계별 완료 보고서 |
| `mydocs/report/task_m010_4_report.md` | `mydocs/report/` | `mydocs/report/task_m010_4_report.md` | OK | 최종 결과보고서 |
| `mydocs/tech/` 추가 문서 | 수행계획서에서 미선택 | 해당 없음 | OK | #1 inventory와 stage/final report로 source 판단을 추적한다. |

## Stage 1 — source contract와 fixture 설계

### 산출물

신규:

- `mydocs/working/task_m010_4_stage1.md`

수정:

- `src/__tests__/fixtures/parser/README.md`
- `src/__tests__/fixtures/parser/sessions/2026/06/12/evening.jsonl`
- 필요 시 `src/__tests__/fixtures/parser/sessions/2026/06/11/afternoon.jsonl`

### 변경 내용

- 실제 local Codex source에서 skill/plugin actual invocation 후보를 조사한다.
  - session JSONL event type과 payload key schema 중심으로 확인한다.
  - prompt, response, tool input/output body, cwd, raw local path, credential은 읽거나 문서화하지 않는다.
  - source가 catalog/enabled 목록인지 actual invocation인지 분리한다.
- parser fixture contract를 확장한다.
  - synthetic event만 추가한다.
  - actual invocation으로 볼 수 있는 allowlisted shape만 fixture에 포함한다.
  - skill/plugin/unknown classification case를 만든다.
  - deterministic tie-break case를 만든다.
- Stage 2 구현이 기대할 normalizer input shape를 stage report에 기록한다.
- 실제 source가 actual invocation으로 확인되지 않으면 구현계획서를 갱신하고 작업지시자 승인 후 범위를 조정한다.

### 검증

```bash
npm test
rg -n "/Users/|/home/|/private/var/|access_token|refresh_token|Bearer |sk-|github_pat_" src/__tests__/fixtures/parser
git diff --check
```

수동 확인:

- fixture에 prompt/response/tool input/output/raw path/session id/credential-like 값이 없는지 확인한다.
- source contract가 catalog/enabled list와 actual invocation을 구분하는지 확인한다.
- Stage 2에서 구현할 분류 규칙이 임의 보정이 아닌 source key에 근거하는지 확인한다.

### 커밋

```text
Task #4 Stage 1: skill plugin source 계약과 fixture 설계
```

## Stage 2 — skill/plugin aggregate 구현

### 산출물

신규:

- `src/parser/skill-plugin-aggregate.js`
- `src/__tests__/parser-skill-plugin.test.js`
- `mydocs/working/task_m010_4_stage2.md`

수정:

- `src/parser/session-jsonl.js`
- 필요 시 `src/__tests__/fixtures/parser/README.md`

### 변경 내용

- session JSONL allowlist normalizer를 확장한다.
  - Stage 1에서 확정한 actual invocation event만 normalize한다.
  - `kind`/`category`/`source` 등 classification key가 없거나 불명확한 event는 ranking에서 제외하고 diagnostic만 증가시킨다.
  - raw payload 전체를 반환하지 않는다.
- skill/plugin aggregate를 구현한다.
  - `skills.exploredCount`: unique classified skill id count
  - `skills.totalUsed`: classified skill invocation count sum
  - `skills.topSkills`: skill ranking items
  - `plugins.topPlugins`: plugin ranking items
  - top N은 고정 상한을 둔다. 기본 상한은 10개로 하고, 출력 schema 변경 없이 배열 길이만 제한한다.
- ranking sort를 deterministic하게 고정한다.
  - usageCount 내림차순
  - displayName/name/id 오름차순 fallback
- diagnostic을 구현한다.
  - files/entries/malformed/fileErrors
  - invocation events
  - classified skill/plugin count
  - unknown/unclassified count
  - unavailable reason
  - raw path/session id/payload 미노출
- source 없음은 unavailable baseline을 유지한다.

### 검증

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser
git diff --check
```

수동 확인:

- fixture ranking이 deterministic한지 확인한다.
- source missing fixture에서 `skills`/`plugins`가 sample 값으로 채워지지 않는지 확인한다.
- diagnostic에 raw path, raw line, session id, tool input/output body가 없는지 확인한다.

### 커밋

```text
Task #4 Stage 2: skill plugin aggregate 구현
```

## Stage 3 — analyzer integration과 README 문서화

### 산출물

신규:

- `mydocs/working/task_m010_4_stage3.md`

수정:

- `src/analyze.js`
- `src/__tests__/analyze.test.js`
- `README.md`
- 필요 시 `src/index.d.ts`

### 변경 내용

- `analyzeUsage()` production path에 skill/plugin aggregate를 연결한다.
- analyzer diagnostics에서 `skills`/`plugins`를 별도 aggregate 결과로 병합한다.
  - aggregate status가 `ok`이면 parsed field에 포함한다.
  - aggregate status가 unavailable이면 `skills`, `plugins` unavailable field를 유지한다.
  - partial classification 상태이면 diagnostic reason과 unavailable/unknown count를 노출한다.
- source가 없는 환경은 #2 unavailable baseline을 유지한다.
- fixture 환경은 실제 aggregate 결과로 `skills`/`plugins` core fields를 채운다.
- `--fixture-sample`은 sample fixture 전용 경로로 계속 유지한다.
- README를 업데이트한다.
  - skills/plugins는 local actual invocation source 기준이다.
  - catalog/enabled tool 목록과 remote profile stats는 기본 analyzer source가 아니다.
  - custom/local skill 이름은 출력될 수 있으나 path/content/input/output은 출력하지 않는다.

### 검증

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser
node bin/codex-usage-analyzer.js analyze --json --fixture-sample
rg -n "topSkills|topPlugins|local_source_not_identified|skill-plugin" README.md src
git diff --check
```

수동 확인:

- production parser source와 sample fixture source가 다시 섞이지 않았는지 확인한다.
- README가 remote profile/API 또는 plugin store API 호출을 암시하지 않는지 확인한다.
- `UsageSnapshot v2` schema 변경 없이 구현됐는지 확인한다.

### 커밋

```text
Task #4 Stage 3: skill plugin analyzer 통합
```

## Stage 4 — 실제 smoke와 최종 정리

### 산출물

신규:

- `mydocs/working/task_m010_4_stage4.md`
- `mydocs/report/task_m010_4_report.md`

수정:

- `mydocs/orders/20260614.md`

### 변경 내용

- 로컬 실제 환경에서 `node bin/codex-usage-analyzer.js analyze --json`을 실행한다.
- 실제 smoke output은 raw JSON으로 문서에 붙이지 않는다.
- smoke report에는 다음만 기록한다.
  - `skills`/`plugins` aggregate status
  - top item 존재 여부
  - unknown/unclassified count 존재 여부
  - Codex profile 화면과 비교 가능 여부
  - privacy review 결과
- output privacy review를 수행한다.
  - raw local absolute path 없음
  - credential/token-like value 없음
  - account identifier 원본 없음
  - prompt/response/tool input/output 원문 없음
- final report에 #5-#7 handoff를 정리한다.
- 오늘할일 #4 행을 완료 상태로 갱신한다.

### 검증

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser
git diff --check
```

수동 확인:

- 실제 환경 smoke 결과가 source 있음/없음 중 어느 상태인지 보고서에 기록한다.
- output privacy review 결과를 stage/final report에 기록한다.
- PR 준비 전 `git status --short`가 빈 출력인지 확인한다.

### 커밋

```text
Task #4 Stage 4 + 최종 보고서: skill plugin ranking 정리
```

## 검증

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- 실패한 검증은 단계 완료로 처리하지 않는다.
- 계획 변경이 필요하면 구현계획서를 먼저 갱신하고 작업지시자 승인을 받는다.
- 문서 위치가 수행계획서 판단과 달라지면 구현 전에 수행계획서 또는 구현계획서를 갱신하고 작업지시자 승인을 받는다.

## 커밋

- 단계 커밋은 단계 산출물과 `mydocs/working/task_m010_4_stage{N}.md`를 함께 묶는다.
- 커밋 메시지는 `Task #4 Stage {N}: {핵심 내용 요약}` 형식을 따른다.
- 최종 보고서와 오늘할일 완료 갱신은 Stage 4 커밋에 함께 포함한다.

## 단계 의존성

- Stage 2는 Stage 1에서 actual invocation source contract와 fixture가 승인된 뒤 진행한다.
- Stage 3은 Stage 2 aggregate가 tests로 고정된 뒤 production analyzer에 연결한다.
- Stage 4는 Stage 3 통합 결과가 승인된 뒤 실제 환경 smoke와 최종 정리를 수행한다.
- 각 단계는 완료보고서 승인 후 다음 단계로 넘어간다.

## 위험과 대응

- **actual invocation source 불명확**: source가 catalog/enabled 목록뿐이면 ranking을 만들지 않는다. Stage 1에서 범위 조정을 요청한다.
- **민감정보 노출**: raw line/payload/path/session id/thread title/tool input/output을 snapshot과 report에 넣지 않는다.
- **classification ambiguity**: skill/plugin 구분이 불명확하면 unknown diagnostic으로 남기고 ranking에서 제외한다.
- **remote profile 불일치**: Codex Desktop profile API는 기본 analyzer 범위에서 제외하고, local-only semantics를 README와 diagnostic에 명시한다.
- **schema 확장 압력**: ranking item에 source/category가 필요해 보여도 이번 task에서는 schema 변경 없이 diagnostics extension으로 보조한다.

## 승인 요청 사항

- Stage 1-4 분할과 각 단계 산출물
- Stage 1에서 actual invocation source가 불명확하면 구현 범위를 중단/조정하는 기준
- top N 기본 상한 10개
- ranking 정렬 기준: usageCount desc, display/name/id asc
- `skills.exploredCount`와 `skills.totalUsed` 정의
- plugin store API, remote profile API, asset/icon resolution, schema 변경 제외
- Stage별 검증 명령과 privacy review 기준
- 단계별 커밋 메시지

승인되면 Stage 1부터 진행한다.

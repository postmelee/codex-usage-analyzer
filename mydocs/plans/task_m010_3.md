# Task M010 #3 수행계획서

GitHub Issue: [#3](https://github.com/postmelee/codex-usage-analyzer/issues/3)
마일스톤: M010

## 목적

`UsageSnapshot v2`의 core usage, activity, model 필드를 sample이나 unavailable baseline이 아니라 실제 로컬 Codex 사용 데이터에서 계산하는 MVP parser를 구현한다. #2에서 분리한 production 기본 경로를 유지하면서, 접근 가능한 로컬 source가 있으면 실제 aggregate를 채우고 source가 없거나 계산 불가능한 값은 `null`, `0`, 빈 배열, diagnostic extension으로 명시한다.

완료 기준은 `analyze --json` 기본 경로가 fixture 값을 반환하지 않으면서도, 로컬 session JSONL 등 safe source가 있는 환경에서는 core fields를 계산하는 것이다. parser는 raw prompt/response, 로컬 절대 경로, 인증 토큰, 계정 식별자 원본을 출력하거나 문서화하지 않는다.

## 배경

#1 데이터 소스 inventory는 core usage/activity/model parser의 primary source를 session JSONL `token_count` event로 두고, fallback은 가능한 경우에만 degraded aggregate로 제한하라고 정리했다. #2는 기본 `analyze --json`이 sample fixture를 반환하지 않도록 production unavailable snapshot과 명시적 `--fixture-sample` 경로를 분리했다.

Issue #3은 이 기반 위에서 실제 parser를 추가하는 작업이다. 이번 task는 `UsageSnapshot v2` 스키마를 변경하지 않고, skills/plugins ranking(#4), avatar/pet asset discovery(#5), remote profile smoke 비교(#6)는 후속 이슈로 유지한다.

## 범위

### 포함

- 로컬 Codex session JSONL discovery와 line streaming parser 구현
- `token_count` event의 numeric allowlist 추출과 aggregate 계산
- `usage.totalTokens`, `usage.peakDailyTokens`, `usage.tokenBreakdown`, `usage.daily` 계산
- `models.favoriteModel`, `models.items` 계산
- `activity.longestTaskDurationMs`, `currentStreakDays`, `longestStreakDays`, `fastModePercent`, `reasoningEffort`, `reasoningEffortPercent`, `totalThreads` 계산 또는 unavailable diagnostic 처리
- timezone/date boundary 정책 고정
- parser fixture와 unit tests 추가
- `analyze --json` production path와 README 상태 설명 업데이트
- 로컬 실제 환경 smoke 실행과 privacy review

### 제외

- top skills/plugins ranking 구현
- avatar/pet asset discovery
- GitHub-facing profile fields 또는 원격 Codex profile API 호출
- 웹 서비스 저장/조회 API
- `UsageSnapshot v2` 필드 추가, 삭제, 타입 변경
- SQLite parsing dependency 추가가 필요한 deep fallback 구현

## 설계 방향

- parser source 우선순위는 #1 결론을 따른다. 이번 task의 primary source는 `<codex-home>/sessions/YYYY/MM/DD/*.jsonl` 형태의 session JSONL이다.
- raw JSONL object 전체를 보존하거나 출력하지 않는다. line 단위로 parse하고 `token_count`, timestamp, model, effort, mode, duration 후보 같은 allowlist numeric/string enum field만 aggregate에 사용한다.
- `last_token_usage`를 token increment primary source로 사용한다. cumulative total만 있는 경우에는 중복 집계 위험이 있으므로 직접 delta로 단정하지 않고 diagnostic을 남긴다.
- `totalTokens`는 실제 token source가 있으면 aggregate 합계, source가 없으면 #2 unavailable baseline인 `0`을 유지한다.
- nullable breakdown은 field별 source가 있을 때만 채운다. `cacheWriteTokens`처럼 명시 source가 없으면 `null`을 유지한다.
- daily bucket은 UTC date 기준을 기본으로 둔다. local timezone 보정이 필요하다고 판단되면 구현계획서에서 별도 test fixture로 고정한다.
- model ranking은 token aggregate 기준을 우선하고, token 기준이 불가능할 때만 usage count basis를 사용한다.
- activity field는 계산 가능한 source만 채운다. `fastModePercent`처럼 local source가 확정되지 않은 값은 `null`과 diagnostic으로 둔다.
- diagnostic extension은 `codexUsageAnalyzer.*` namespace만 사용하고, raw file path, session id, thread title, cwd, prompt/response, account identifier는 넣지 않는다.

## 문서 위치 판단

이번 task는 production CLI 동작이 unavailable baseline에서 실제 parser 기반 출력으로 바뀌므로 사용자/기여자가 보는 `README.md`를 수정한다. parser 내부 source와 privacy 판단은 단계 보고서와 최종 보고서에 기록하고, 별도 장기 기술 노트가 필요하면 구현계획서 승인 후 `mydocs/tech/` 추가 여부를 다시 고정한다. 현 수행계획 기준 신규 공식 docs 루트는 만들지 않는다.

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| `README.md` | 공식 문서 | 사용자, 기여자 | 저장소 루트 `README.md` | `docs/`, `mydocs/tech/` | 기본 CLI 출력 의미가 바뀌므로 패키지 첫 진입점에 반영해야 한다. |
| `mydocs/plans/task_m010_3.md` | 작업 산출물 | 작업지시자, 내부 작업자, 에이전트 | `mydocs/plans/` | `docs/` | 구현 전 승인용 계획서이며 제품 문서가 아니다. |
| `mydocs/plans/task_m010_3_impl.md` | 작업 산출물 | 작업지시자, 내부 작업자, 에이전트 | `mydocs/plans/` | `docs/` | 승인 후 단계별 구현 계획을 보존하는 내부 산출물이다. |
| `mydocs/working/task_m010_3_stage{N}.md` | 작업 산출물 | 작업지시자, 내부 작업자, 에이전트 | `mydocs/working/` | `docs/` | 단계별 구현/검증 기록이며 사용자 문서가 아니다. |
| `mydocs/report/task_m010_3_report.md` | 작업 산출물 | 작업지시자, 내부 작업자, 에이전트 | `mydocs/report/` | `docs/` | 최종 보고와 PR 근거를 보존하는 내부 산출물이다. |

## 예상 변경 파일

신규:

- `mydocs/plans/task_m010_3.md`
- `mydocs/plans/task_m010_3_impl.md`
- `mydocs/working/task_m010_3_stage1.md`
- `mydocs/working/task_m010_3_stage2.md`
- `mydocs/working/task_m010_3_stage3.md`
- `mydocs/working/task_m010_3_stage4.md`
- `mydocs/working/task_m010_3_stage5.md`
- `mydocs/report/task_m010_3_report.md`
- `src/parser/` 하위 parser module
- `src/__tests__/fixtures/` 하위 parser fixture
- `src/__tests__/parser*.test.js` 또는 기존 analyze 테스트 확장

수정:

- `mydocs/orders/20260614.md`
- `README.md`
- `src/analyze.js`
- `src/index.d.ts`
- `src/__tests__/analyze.test.js`
- `src/__tests__/cli.test.js`

검토 대상:

- `mydocs/tech/task_m010_1_codex_data_source_inventory.md`
- `mydocs/report/task_m010_2_report.md`
- `src/snapshot/v2-schema.js`
- `src/snapshot/v2-types.d.ts`
- `src/cli.js`
- `package.json`

## 잠정 단계

- **Stage 1 — parser source 계약과 fixture 설계**
  - session JSONL allowlist schema, diagnostics shape, codex home discovery option, fixture layout을 고정한다.
  - 기존 unavailable baseline과 sample fixture path가 유지되어야 하는 조건을 정리한다.
- **Stage 2 — session JSONL discovery와 token/daily aggregate 구현**
  - session file discovery, line streaming parse, token increment aggregate, daily/peak/breakdown 계산을 구현한다.
  - source 없음, malformed line, partial field의 diagnostic 정책을 테스트한다.
- **Stage 3 — model/activity aggregate 구현**
  - model token ranking, favorite model, thread count, duration/streak/reasoning effort 계열 aggregate를 구현한다.
  - 계산 불가능한 activity field는 `null`과 diagnostic으로 유지한다.
- **Stage 4 — analyzer integration, CLI/README, regression hardening**
  - `analyzeUsage()` production path에 parser를 연결하고 README와 tests를 갱신한다.
  - `--fixture-sample` 경로와 sample helper가 production fallback으로 재유입되지 않는지 검증한다.
- **Stage 5 — 실제 환경 smoke와 최종 정리**
  - 로컬 실제 환경에서 `node bin/codex-usage-analyzer.js analyze --json`을 실행한다.
  - output privacy review, diagnostic review, 최종 보고서와 오늘할일 완료 처리를 수행한다.

## 검증 계획

### 단계별 검증

- Stage 1
  - `npm test`
  - `git diff --check`
  - parser fixture에 raw private content, local absolute path, token-like value가 없는지 수동 확인
- Stage 2
  - `npm test`
  - token/daily fixture 결과가 sample 값이 아니라 JSONL aggregate에서 계산되는지 확인
  - `git diff --check`
- Stage 3
  - `npm test`
  - model/activity fixture 결과와 unavailable diagnostic이 기대와 맞는지 확인
  - `git diff --check`
- Stage 4
  - `npm test`
  - `node bin/codex-usage-analyzer.js analyze --json`
  - `node bin/codex-usage-analyzer.js analyze --json --fixture-sample`
  - `git diff --check`
- Stage 5
  - `npm test`
  - `node bin/codex-usage-analyzer.js analyze --json`
  - output에 raw local path, token, account identifier, prompt/response 원문이 없는지 수동 확인
  - `git diff --check`

### 통합 검증

- sample이 아닌 실제 parser 경로에서 MVP core fields가 계산된다.
- source가 없거나 계산 불가능한 값은 sample fallback 없이 `0`, `null`, 빈 배열, diagnostic extension으로 표현된다.
- Codex profile 화면과 비교할 때 값 차이가 발생하면 원인 추적이 가능한 diagnostic이 남는다.
- 개인정보나 로컬 절대 경로는 기본 JSON 출력에 포함되지 않는다.
- `--fixture-sample`은 여전히 명시적 fixture 경로로만 동작한다.
- `git status --short`가 PR 준비 전 빈 출력이다.
- `git diff --check`가 경고 없이 통과한다.

## 리스크

- **JSONL schema 변동**: Codex 버전별 event shape가 다를 수 있다. allowlist parser와 diagnostic을 두고 unknown shape는 무시하거나 degraded로 처리한다.
- **중복 집계**: session replay, fork, cumulative total 오해로 overcount가 생길 수 있다. `last_token_usage` primary 정책과 dedup key를 Stage 1-2에서 테스트로 고정한다.
- **민감정보 노출**: JSONL line에는 prompt/response/cwd 등이 섞일 수 있다. parser는 raw payload를 저장/출력하지 않고 fixture도 redacted synthetic data만 사용한다.
- **실제 환경 검증 불안정**: 로컬 Codex 데이터 유무와 버전에 따라 smoke 결과가 달라질 수 있다. source 없음은 실패가 아니라 unavailable diagnostic으로 처리하되, parser fixture test로 결정적 검증을 보완한다.
- **후속 이슈 범위 침범**: skills/plugins, avatar/pet, remote profile smoke는 각각 #4-#6으로 남긴다.

## 승인 요청 사항

- session JSONL을 #3 parser의 primary source로 두는 것
- SQLite deep fallback과 remote profile API 호출을 이번 task에서 제외하는 것
- parser fixture와 stage 보고서에 synthetic/redacted data만 사용하는 것
- README를 공식 사용자/기여자 문서 위치로 수정하는 것
- Stage 1-5 잠정 단계와 검증 계획

승인되면 `task_m010_3_impl.md`에서 단계별 산출물, 검증 명령, 커밋 메시지를 구체화한다.

# Task M010 #4 수행계획서

GitHub Issue: [#4](https://github.com/postmelee/codex-usage-analyzer/issues/4)
마일스톤: M010

## 목적

이 task는 `UsageSnapshot v2`의 `skills`와 `plugins` 필드를 실제 로컬 Codex 데이터에서 계산 가능한 ranking으로 채우는 parser를 구현한다. 현재 production analyzer는 core usage/model/activity를 계산하지만, skills/plugins는 source 미식별 상태로 `null` 또는 빈 배열을 반환한다.

최종 목표는 Codex profile 화면의 "Most used plugins"와 비교 가능한 local ranking을 제공하되, plugin catalog나 enabled tool 목록을 실제 invocation으로 오인하지 않는 것이다. 계산 근거가 불충분한 값은 sample 값으로 채우지 않고 unavailable diagnostic을 유지한다.

## 배경

Issue #4는 #1 inventory와 #3 parser 구현 이후 진행하도록 등록됐다. #1 inventory는 session JSONL의 `dynamic_tools`, local skills/catalog files, `thread_dynamic_tools`가 skills/plugins 후보 source가 될 수 있지만, enabled/available 목록과 actual invocation count를 구분해야 한다고 정리했다. #3 최종 보고서도 skills/plugins source 미구현을 잔여 위험으로 남겼다.

Codex Desktop profile은 remote stats의 `top_invocations`, `unique_skills_used`, `total_skills_used`를 profile insights에 매핑한다. 이번 task는 remote profile API를 호출하지 않고, local analyzer가 직접 확인 가능한 invocation source만 사용한다.

## 범위

### 포함

- local Codex source에서 skill/plugin actual invocation event 후보를 식별한다.
- skill/plugin invocation count를 집계한다.
- deterministic ranking 정렬, 동률 처리, top N 제한을 구현한다.
- `skills.exploredCount`, `skills.totalUsed`, `skills.topSkills`를 채운다.
- `plugins.topPlugins`를 채운다.
- local/custom skill, bundled/plugin store item, unknown tool의 분류 기준을 코드와 문서에 남긴다.
- source가 없거나 actual invocation으로 검증되지 않은 경우 unavailable diagnostic을 유지한다.
- synthetic fixture와 regression test를 추가한다.
- 실제 로컬 analyzer output을 Codex profile의 top plugins/skills 영역과 수동 비교한다.

### 제외

- plugin store 원격 API 연동
- Codex Desktop remote profile API 호출
- 아이콘 이미지 또는 asset resolution
- 웹 UI rendering 변경
- `UsageSnapshot v2` schema 변경
- prompt, response, tool input/output body, local absolute path, skill file content 원문 출력

## 설계 방향

- actual invocation으로 확인된 event만 usage count에 반영한다. catalog presence, installed skill 목록, enabled tool 목록, `thread_dynamic_tools`만으로는 ranking을 만들지 않는다.
- ranking item은 `id`, `name`, `displayName`, `usageCount`만 채운다. description, input schema, file path, raw payload, session id, thread title은 snapshot과 diagnostics에 넣지 않는다.
- custom/local skill 이름은 ranking value로 노출될 수 있으므로, source는 allowlisted identifier/name field로 제한한다. path, content, description은 출력하지 않는다.
- plugin과 skill 분류가 불명확한 source는 `unknown` 또는 diagnostic으로 남기고, 임의로 plugin ranking에 합산하지 않는다.
- `skills.exploredCount`는 local source에서 확인한 unique skill id 수, `skills.totalUsed`는 classified skill invocation count 합계로 정의한다. source가 불충분하면 `null`을 유지한다.
- `plugins.topPlugins`는 plugin으로 분류 가능한 invocation만 포함한다. source가 없으면 빈 배열과 diagnostic을 유지한다.
- 기존 parser 구조를 따른다.
  - `src/parser/codex-home.js`
  - `src/parser/session-jsonl.js`
  - aggregate module + unit tests
  - `src/analyze.js`에서 diagnostic merge
- remote profile parity는 #6 smoke test에서 다루고, 이번 task는 local-only parser 의미론을 고정한다.

## 문서 위치 판단

이번 task는 사용자/기여자가 `skills`와 `plugins` 출력의 의미를 알아야 하므로 README에 짧은 공식 설명을 추가한다. source discovery와 단계별 판단은 하이퍼-워터폴 작업 산출물에 기록한다. 별도 `mydocs/tech/` 문서는 이번 task에서 새로 만들지 않고, #1 inventory와 Stage 보고서로 충분히 추적한다.

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| `README.md` | 공식 사용자/기여자 문서 | 사용자, 기여자, wrapper 구현자 | `README.md` | `mydocs/tech/` | skills/plugins 출력 의미와 local-only 한계를 CLI 사용자도 알아야 한다. |
| `mydocs/plans/task_m010_4.md` | 작업 산출물 | 내부 작업자, 에이전트 | `mydocs/plans/` | 해당 없음 | 구현 전 승인용 수행계획서다. |
| `mydocs/plans/task_m010_4_impl.md` | 작업 산출물 | 내부 작업자, 에이전트 | `mydocs/plans/` | 해당 없음 | 승인 후 단계별 산출물과 검증 명령을 구체화한다. |
| `mydocs/working/task_m010_4_stage{N}.md` | 작업 산출물 | 내부 작업자, 에이전트 | `mydocs/working/` | 해당 없음 | 단계별 source 판단, 검증, privacy review를 기록한다. |
| `mydocs/report/task_m010_4_report.md` | 작업 산출물 | 내부 작업자, 에이전트 | `mydocs/report/` | 해당 없음 | 최종 결과와 PR 게시 전 승인 기록이다. |

## 예상 변경 파일

신규:

- `src/__tests__/fixtures/skill-plugin/README.md`
- `src/__tests__/fixtures/skill-plugin/sessions/2026/06/13/invocations.jsonl`
- `src/parser/skill-plugin-aggregate.js`
- `src/__tests__/parser-skill-plugin.test.js`
- `mydocs/plans/task_m010_4_impl.md`
- `mydocs/working/task_m010_4_stage1.md`
- `mydocs/working/task_m010_4_stage2.md`
- `mydocs/working/task_m010_4_stage3.md`
- `mydocs/working/task_m010_4_stage4.md`
- `mydocs/report/task_m010_4_report.md`

수정:

- `README.md`
- `src/analyze.js`
- `src/parser/session-jsonl.js`
- `src/__tests__/fixtures/parser/README.md`
- `src/__tests__/analyze.test.js`
- `mydocs/orders/20260614.md`
- `mydocs/plans/task_m010_4.md`

이번 task 산출물:

- `mydocs/orders/20260614.md`
- `mydocs/plans/task_m010_4.md`
- `mydocs/plans/task_m010_4_impl.md`
- `mydocs/working/task_m010_4_stage{N}.md`
- `mydocs/report/task_m010_4_report.md`

## 잠정 단계

- **Stage 1 — source contract와 fixture 설계**
  - 실제 session JSONL/source 후보를 검토하고 actual invocation으로 볼 수 있는 event shape를 allowlist로 정의한다.
  - synthetic fixture에 skill/plugin invocation cases, unknown classification cases, tie-break cases를 추가한다.
  - 검증 관점: fixture에 raw prompt/response/path/credential이 없는지 확인한다.
- **Stage 2 — skill/plugin aggregate 구현**
  - `skill-plugin-aggregate` parser를 추가하고 unique skill count, total skill usage, top skills/plugins ranking을 계산한다.
  - deterministic sort와 classification diagnostic을 구현한다.
  - 검증 관점: unit test로 count, classification, tie-break, unavailable fallback을 고정한다.
- **Stage 3 — analyzer integration과 README 문서화**
  - `analyzeUsage()` production snapshot에 skills/plugins aggregate를 병합한다.
  - source가 없거나 불충분하면 sample 값이 아니라 unavailable diagnostic을 유지한다.
  - README에 local-only skills/plugins 의미와 remote/plugin-store 제외 범위를 문서화한다.
  - 검증 관점: analyze fixture snapshot과 CLI smoke가 schema valid인지 확인한다.
- **Stage 4 — 실제 smoke, privacy review, 최종 보고**
  - 실제 로컬 analyzer output의 skills/plugins 값을 Codex profile 화면과 비교 가능한지 확인한다.
  - raw JSON은 문서에 보존하지 않고 status, classification, privacy 판정만 기록한다.
  - 최종 보고서와 오늘할일 완료 처리 후 PR 준비 상태로 정리한다.

## 검증 계획

### 단계별 검증

- Stage 1
  - `npm test`
  - `rg -n "/Users/|/home/|/private/var/|access_token|refresh_token|Bearer |sk-|github_pat_" src/__tests__/fixtures/parser`
  - fixture가 synthetic data만 담는지 수동 확인
- Stage 2
  - `npm test`
  - ranking sort와 unavailable fallback unit test 확인
  - diagnostic에 raw path, raw payload, session id가 없는지 수동 확인
- Stage 3
  - `npm test`
  - `node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser`
  - `node bin/codex-usage-analyzer.js analyze --json --fixture-sample`
  - README가 source semantics와 non-goals를 정확히 설명하는지 확인
- Stage 4
  - `npm test`
  - `node bin/codex-usage-analyzer.js analyze --json`
  - `git diff --check`
  - 실제 smoke 결과를 raw JSON 없이 stage/final report에 요약

### 통합 검증

- `skills.topSkills`와 `plugins.topPlugins`가 fixture source에서 deterministic하게 계산된다.
- source unavailable 환경에서는 sample ranking으로 fallback하지 않는다.
- `plugins.topPlugins`가 actual plugin invocation source 없이 임의로 채워지지 않는다.
- local/custom skill과 plugin 분류 이유가 diagnostic 또는 문서에서 추적 가능하다.
- production snapshot과 diagnostics에 raw local path, raw line, session id, prompt/response, tool input/output body가 없다.
- `git status --short`가 PR 준비 전 빈 출력이다.
- `git diff --check`가 경고 없이 통과한다.

## 리스크

- **actual invocation source 불명확**: session JSONL이나 SQLite에 보이는 tool 목록이 실제 실행이 아니라 enabled catalog일 수 있다. Stage 1에서 source를 검증하고, 불명확하면 해당 값은 ranking에 넣지 않는다.
- **custom name privacy**: custom skill/plugin 이름 자체가 민감할 수 있다. 이번 task는 ranking item schema상 이름을 출력하되, path/content/description/input/output은 출력하지 않는 최소 공개 정책을 둔다.
- **remote profile과 local 의미 차이**: Codex Desktop profile의 `top_invocations`는 remote account-level source다. 이번 task는 local-only 결과를 만들고, profile parity는 #6에서 redacted baseline으로 검증한다.
- **classification ambiguity**: skill/plugin/unknown 경계가 모호할 수 있다. 임의 보정 대신 diagnostic과 deterministic rule을 남긴다.
- **schema 확장 압력**: 현재 `UsageSnapshot v2` ranking item은 category나 source field가 없다. schema 변경은 이번 task에서 제외하고 diagnostics extension으로 보조한다.

## 승인 요청 사항

- #4를 local-only actual invocation ranking 구현으로 진행하는 것
- catalog/enabled tool 목록만으로 ranking을 만들지 않는 것
- `skills.exploredCount`를 unique local skill id count, `skills.totalUsed`를 classified skill invocation count로 정의하는 것
- plugin store 원격 API, Codex Desktop remote profile API, 아이콘/asset resolution, schema 변경을 제외하는 것
- README에 skills/plugins output 의미와 한계를 짧게 문서화하는 것
- Stage 1-4 잠정 단계와 검증 계획

승인되면 `task_m010_4_impl.md`에서 단계별 산출물, 검증 명령, 커밋 메시지를 구체화한다.

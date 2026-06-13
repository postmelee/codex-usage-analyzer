# Task M010 #1 Codex 데이터 소스 inventory

## 조사 배경

`codex-usage-analyzer`는 `UsageSnapshot v2` JSON을 내보내는 CLI/SDK 패키지다. 현재 `analyze --json` 기본 경로는 실제 로컬 Codex 사용량이 아니라 sample-backed snapshot을 반환한다. 후속 parser 구현 전에 현재 출력 계약과 skeleton 동작을 먼저 고정해, fixture와 실제 분석 결과가 섞이지 않도록 기준을 세운다.

Stage 1은 저장소 내부 계약과 현재 동작만 조사한다. 로컬 Codex 사용자 데이터 위치, credential 파일, 원본 로그 후보는 Stage 2에서 별도 privacy guardrail에 따라 다룬다.

## 조사 질문

- 현재 `UsageSnapshot v2`의 필수/선택 필드는 무엇인가?
- 기본 CLI/SDK 경로는 어떤 source에서 값을 채우는가?
- validator가 이미 막고 있는 민감 정보와 외부 product-owned field는 무엇인가?
- 후속 #2-#6이 이어받아야 할 skeleton 위험과 구현 기준은 무엇인가?

## 조사 대상

| 대상 | 이유 | 위치 |
|---|---|---|
| `README.md` | 패키지 역할, 현재 한계, ownership boundary 확인 | `README.md` |
| `package.json` | CLI bin, test script, package entrypoint 확인 | `package.json` |
| `bin/codex-usage-analyzer.js` | 실제 CLI entrypoint 확인 | `bin/codex-usage-analyzer.js` |
| `src/cli.js` | `analyze --json` 처리와 stdout/stderr 정책 확인 | `src/cli.js` |
| `src/analyze.js` | 기본 analyzer source와 sample merge 방식 확인 | `src/analyze.js` |
| `src/snapshot/v2-types.d.ts` | `UsageSnapshot v2` 타입 계약 확인 | `src/snapshot/v2-types.d.ts` |
| `src/snapshot/v2-schema.js` | runtime validator와 privacy guardrail 확인 | `src/snapshot/v2-schema.js` |
| `src/fixtures/sample-v2-snapshot.js` | sample-backed skeleton 값의 출처 확인 | `src/fixtures/sample-v2-snapshot.js` |
| `src/__tests__/` | 현재 테스트가 보장하는 동작 확인 | `src/__tests__/` |

## 발견 내용

### 패키지와 CLI 경계

- 패키지명은 `codex-usage-analyzer`이고, CLI bin은 `bin/codex-usage-analyzer.js`다.
- CLI는 `analyze --json`만 성공 경로로 지원한다. `--help`는 usage를 stdout에 쓰고, 명령이나 flag가 맞지 않으면 usage를 stderr에 쓰며 실패한다.
- `analyze --json`은 `analyzeUsage()`를 호출한 뒤 pretty JSON을 stdout에 쓴다. stderr에는 정상 JSON을 쓰지 않는다.
- README는 현재 구현을 contract-first skeleton으로 설명하고, real local source parser는 follow-up work라고 밝힌다.

### 현재 analyzer source

- `analyzeUsage(options)`는 실제 로컬 데이터를 읽지 않는다.
- `analyzeUsage()`는 `sampleUsageSnapshotV2`를 clone한 뒤 `capturedAt`과 `producer` override를 병합하고 `assertUsageSnapshotV2()`로 검증한다.
- `createSampleUsageSnapshotV2(overrides)`는 sample fixture를 deep clone하고 object override를 재귀 병합한다.
- `capturedAt` 옵션이 없으면 sample fixture의 timestamp가 유지된다.
- 현재 production path와 fixture path가 같은 sample module을 공유한다. 따라서 기본 CLI 결과가 실제 분석 결과처럼 보일 수 있다.

### UsageSnapshot v2 필드 계약

| 그룹 | 필수 여부 | 필드 | validator 정책 | 현재 source |
|---|---|---|---|---|
| top-level | 필수 | `schemaVersion`, `capturedAt`, `usage`, `models`, `activity`, `skills`, `plugins` | unknown field 금지, `schemaVersion`은 `2`, `capturedAt`은 ISO date-time | fixture |
| `producer` | 선택 | `name`, `version` | 둘 다 non-empty string | analyzer override + fixture |
| `codexProfile` | 선택 | `displayName`, `username`, `planLabel` | string 또는 `null` | fixture |
| `usage` | 필수 | `totalTokens`, `peakDailyTokens`, `tokenBreakdown`, `daily` | non-negative integer 또는 nullable breakdown, daily date는 `YYYY-MM-DD` | fixture |
| `tokenBreakdown` | 필수 하위 객체 | `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `reasoningTokens` | 각 필드는 non-negative integer 또는 `null` | fixture |
| `models` | 필수 | `favoriteModel`, `items` | model item 배열, favorite은 model item 또는 `null` | fixture |
| `model item` | 조건부 | `model`, `displayName`, token breakdown, `totalTokens`, `usageCount`, `basis` | `basis`는 `tokens`, `usage_count`, `duration`, `unknown` 중 하나 | fixture |
| `activity` | 필수 | `longestTaskDurationMs`, `currentStreakDays`, `longestStreakDays`, `fastModePercent`, `reasoningEffort`, `reasoningEffortPercent`, `totalThreads` | duration/count는 nullable non-negative integer, percent는 0-100 또는 `null` | fixture |
| `skills` | 필수 | `exploredCount`, `totalUsed`, `topSkills` | counts는 nullable non-negative integer, ranking 배열 | fixture |
| `plugins` | 필수 | `topPlugins` | ranking 배열 | fixture |
| ranking item | 조건부 | `id`, `name`, `displayName`, `usageCount` | `id`는 non-empty string, `usageCount`는 non-negative integer | fixture |
| `codexAssets` | 선택 | `avatar`, `pet` | asset 또는 `null`; asset은 `url` 또는 `assetRef` 중 하나 필요 | fixture |
| `extensions` | 선택 | namespaced object | extension key는 namespace dot 필요 | fixture |

### Validator privacy guardrail

- validator는 모든 문자열 값을 순회하며 credential-like value와 private local path pattern을 금지한다.
- validator는 field key를 단어로 나눈 뒤 GitHub-facing field와 credential-like field를 금지한다.
- 금지되는 값의 범주에는 bearer token, access/refresh token JSON key, OpenAI/GitHub token 형태, private key header 등이 포함된다.
- private local path pattern은 절대 로컬 경로가 기본 JSON에 들어가지 않도록 막는다.
- `extensions`는 namespaced key만 허용되므로 product-specific metadata가 섞이더라도 namespace를 강제한다.
- snapshot validator는 GitHub login, submit token, public profile/card field를 analyzer 계약에서 배제하려는 README의 ownership boundary와 같은 방향이다.

### Fixture-backed skeleton 위험

- sample fixture에는 profile-like 값, 큰 token totals, model usage, activity metrics, skill ranking, empty plugin ranking, asset-like avatar, fixture marker extension이 들어 있다.
- 기본 CLI 경로가 이 fixture를 그대로 반환하므로 사용자는 실제 로컬 Codex profile 값으로 오해할 수 있다.
- 테스트도 현재는 `analyzeUsage()`와 `analyze --json`이 valid `UsageSnapshot v2`를 반환하는지만 확인한다. production path가 fixture를 쓰지 않는다는 보장은 아직 없다.
- 후속 #2는 기본 analyze path와 fixture/dev/test path를 분리해야 한다. 특히 production output에서 fixture marker extension 또는 sample-only profile-like 값이 나오는 회귀를 테스트로 잡아야 한다.

### Stage 1 source confidence

| 항목 | 현재 source | confidence | privacy note |
|---|---|---|---|
| `usage.*` | `src/fixtures/sample-v2-snapshot.js` | High for current code path, None for real local usage | sample 값이 실제 사용량처럼 보이면 안 된다. |
| `models.*` | `src/fixtures/sample-v2-snapshot.js` | High for current code path, None for real local usage | model display/value는 실제 profile 비교 근거가 아니다. |
| `activity.*` | `src/fixtures/sample-v2-snapshot.js` | High for current code path, None for real local usage | streak/thread/duration은 실제 데이터 source가 아직 없다. |
| `skills.*` | `src/fixtures/sample-v2-snapshot.js` | High for current code path, None for real local usage | top skill count는 sample이며 local/custom 분류 근거가 없다. |
| `plugins.*` | `src/fixtures/sample-v2-snapshot.js` | High for current code path, None for real local usage | empty array가 실제 plugin 미사용을 뜻하지 않는다. |
| `codexAssets.*` | `src/fixtures/sample-v2-snapshot.js` | High for current code path, None for real asset discovery | local path를 기본 출력에 넣으면 안 된다. |
| `codexProfile.*` | `src/fixtures/sample-v2-snapshot.js` | High for current code path, None for analyzer ownership | profile/account identity는 wrapper product-owned field다. |

## 결정

- Stage 1 기준으로 실제 데이터 source는 아직 확정하지 않는다. 현재 production CLI/SDK 값의 source는 fixture로 기록한다.
- `UsageSnapshot v2` 계약은 이번 task에서 변경하지 않는다. source mapping은 현 계약 안에서 `null`, empty array, diagnostics extension 가능성을 우선 검토한다.
- 후속 #2는 fixture와 production analyzer path를 분리하는 선행 작업이어야 한다.
- 후속 parser는 값이 없거나 계산 불가능한 필드를 sample 값으로 채우지 않는다. 가능한 경우 `null`, empty array, 또는 namespaced diagnostic extension으로 unavailable reason을 남긴다.
- 기술 조사와 보고서에는 실제 사용자 경로, token, credential, 계정 식별자 원문, raw 로그 본문을 남기지 않는다.

## 비결정 / 보류

- 로컬 Codex 데이터 후보의 실제 파일/DB/API 형태, 접근 조건, 갱신 주기는 Stage 2에서 조사한다.
- token totals, daily buckets, model usage, activity insights, skills/plugins ranking, avatar/pet discovery의 실제 source 우선순위는 Stage 3에서 확정한다.
- `extensions`에 어떤 diagnostic namespace와 shape를 둘지는 후속 #2 또는 #3에서 구현 범위와 함께 결정한다.
- `codexProfile`을 analyzer가 계속 허용만 할지, production 기본 출력에서 생략할지는 후속 #2에서 분리 정책과 함께 결정한다.

## 적용 영향

- #2는 기본 `analyze --json`이 fixture-backed snapshot을 반환하지 않는다는 테스트를 추가해야 한다.
- #3은 core usage/activity/model parser가 계산 불가능한 값을 sample로 대체하지 않도록 `null`/diagnostic 정책을 따라야 한다.
- #4는 `topPlugins: []`가 실제 미사용인지, 아직 source 없음인지 구분해야 한다.
- #5는 asset discovery에서 local private path를 기본 JSON에 노출하지 않는 safe output 정책을 유지해야 한다.
- #6은 redacted baseline에서 account identifier, local path, credential 원문을 제외해야 한다.

## 참고 링크

- [README](../../README.md)
- [수행계획서](../plans/task_m010_1.md)
- [구현계획서](../plans/task_m010_1_impl.md)

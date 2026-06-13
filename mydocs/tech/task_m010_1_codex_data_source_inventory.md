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

### Stage 2 로컬 데이터 후보 inventory

Stage 2에서는 `<codex-home>` 아래의 파일명, 디렉터리 구조, SQLite schema, JSONL key schema만 확인했다. `auth.json`, `config.toml`, 원본 로그 body, 세션 메시지 content, stdout/stderr payload 값은 열람하거나 문서화하지 않았다.

| 후보 | 형태 | 접근 조건 | 갱신 주기 | 수집 가능 필드 후보 | confidence | privacy/security note |
|---|---|---|---|---|---|---|
| `<codex-home>/state_5.sqlite` | SQLite DB | local read-only SQLite 연결. WAL 동반 가능성 고려 필요 | Codex thread 생성/갱신 시점 | `activity.totalThreads`, daily activity, thread duration, `usage.totalTokens` 후보, model/provider, reasoning effort | High | `cwd`, `title`, `first_user_message`, git remote URL 등 민감 컬럼이 있어 output에서 제외해야 한다. |
| `<codex-home>/sqlite/state_5.sqlite` | SQLite DB mirror/copy 후보 | local read-only SQLite 연결 | main state DB와 함께 갱신될 수 있음 | 위 `state_5.sqlite` fallback 후보 | Medium | 중복 DB일 수 있으므로 freshness와 row overlap 검증 필요. |
| `<codex-home>/sessions/YYYY/MM/DD/*.jsonl` | JSONL event log | 파일명과 JSON key schema만 확인. parser 구현 시 line streaming 필요 | thread event append 시점 | model, provider, effort, duration, dynamic tools, turn timing, possible token detail | High | `payload.content`, `user_instructions`, `stdout`, `stderr`, local images, cwd 등 raw private content가 포함될 수 있어 기본 출력 금지. |
| `<codex-home>/archived_sessions/*.jsonl` | JSONL event log archive | 파일명과 JSON key schema만 확인 | session archive/rollout 시점 | historical sessions, older tool/model/event detail | Medium | active sessions와 중복 가능. encrypted/raw content field가 있어 strict redaction 필요. |
| `<codex-home>/session_index.jsonl` | JSONL index 후보 | 내용 미열람. 파일 존재와 형태만 확인 | session index 갱신 시점 | session discovery, dedup, date range 후보 | Medium | index에 제목/경로/요약이 있을 수 있어 raw value 출력 금지. |
| `<codex-home>/logs_2.sqlite` | SQLite DB | local read-only SQLite 연결. 큰 DB라 집계/인덱스 중심 접근 필요 | runtime logging 시점 | diagnostics, thread/process join, event byte estimate, timestamp coverage | Medium | `feedback_log_body`, file/module info가 민감할 수 있다. token usage source로 직접 신뢰하지 않는다. |
| `<codex-home>/generated_images/` | image files grouped by thread-like ids | 파일 존재만 확인 | image generation 시점 | generated image asset reference 후보 | Low | generated outputs may be private artifacts. 기본 analyzer JSON에 local path를 넣지 않는다. |
| `<codex-home>/pets/` | asset directory 후보 | 파일명 수준 확인 | unknown | pet asset discovery 후보 | Low | Stage 2 환경에서는 파일 후보가 확인되지 않았다. absence를 product-level null로 단정하지 않는다. |
| `<codex-home>/cache/`, `<codex-home>/plugins/`, `<codex-home>/vendor_imports/skills/`, `<codex-home>/skills/` | JSON/cache/local skill/plugin files | file metadata와 catalog schema 중심 접근 | plugin/skill catalog sync 시점 | skill/plugin catalog, display name normalization | Medium | catalog presence는 invocation count가 아니다. custom skill 이름이 private일 수 있어 redaction 필요. |
| `<codex-home>/models_cache.json` | JSON cache | key/schema 수준 접근 가능 | model catalog refresh 시점 | model id/display normalization | Medium | model list 자체는 낮은 민감도지만 cache content를 output에 복제하지 않는다. |
| `<codex-home>/auth.json`, `<codex-home>/config.toml` | auth/config files | Stage 2에서 내용 미열람 | login/config update 시점 | analyzer source로 사용하지 않음 | None | credential 또는 account 식별자가 있을 수 있어 parser 기본 경로에서 읽지 않는다. |
| 원격 API | remote service | credential 필요 가능성 높음 | service-side | profile/avatar/pet/usage official source 가능성 | Deferred | 이번 task 범위와 parser MVP 기본 경로에서 제외. 별도 승인 필요. |

### Stage 2 관찰한 schema metadata

| source | 관찰한 schema/key | 해석 |
|---|---|---|
| `state_5.sqlite.threads` | `id`, `rollout_path`, `created_at`, `updated_at`, `tokens_used`, `model`, `reasoning_effort`, `model_provider`, `archived`, `source`, `created_at_ms`, `updated_at_ms` 등 | core usage/activity/model source의 1순위 후보. `cwd`, `title`, `first_user_message`, git 관련 컬럼은 private context이므로 output 제외 대상. |
| `state_5.sqlite.thread_dynamic_tools` | `thread_id`, `position`, `name`, `description`, `input_schema`, `namespace` 등 | thread별 사용 가능 tool/plugin/skill metadata 후보. 실제 invocation count인지 enabled tool 목록인지 Stage 3에서 구분 필요. |
| `state_5.sqlite.agent_jobs*` | job/item status, instruction, CSV path, result JSON 등 | multi-agent/batch 작업 metadata 후보. 일반 usage snapshot 기본 필드에는 우선순위 낮음. |
| `logs_2.sqlite.logs` | `ts`, `level`, `target`, `feedback_log_body`, `module_path`, `thread_id`, `process_uuid`, `estimated_bytes` 등 | diagnostics와 coverage 확인 후보. raw body는 private content 가능성이 높아 기본 analyzer source로 직접 쓰지 않는다. |
| session JSONL | top-level `type`, `timestamp`, `payload`; payload key로 `model`, `model_provider`, `effort`, `duration`, `dynamic_tools`, `rate_limits`, `thread_id`, `turn_id`, `status` 등 | event-level detail source 후보. content/stdout/stderr/cwd 관련 key는 strict redaction 필요. |
| archived session JSONL | active session JSONL과 유사하며 `encrypted_content`, `completed_at`, `last_agent_message` 등 추가 key 관찰 | historical coverage 후보. active sessions와 dedup 필요. |

### Stage 2 필드 후보별 source 판단

| 필드 그룹 | 1순위 후보 | 보조 후보 | Stage 2 판단 | privacy note |
|---|---|---|---|---|
| `usage.totalTokens` | `state_5.sqlite.threads.tokens_used` | session JSONL token/rate-limit detail 후보 | High confidence 후보. profile 값과 의미가 같은지는 Stage 3/후속 #3에서 비교 필요. | thread별 aggregate만 사용하고 title/content/cwd는 제외. |
| `usage.tokenBreakdown` | session JSONL token detail 후보 | unavailable diagnostic | Medium/Deferred. Stage 2 schema만으로 breakdown source를 확정하지 못했다. | raw event payload에 private content가 섞일 수 있어 필요한 numeric fields만 allowlist로 추출. |
| `usage.daily`, `peakDailyTokens` | `state_5.sqlite.threads.created_at_ms/updated_at_ms` + `tokens_used` | session file date path, session JSONL timestamp | High for daily aggregate 후보. timezone/date boundary 정책은 Stage 3에서 확정. | local path date 구조를 output하지 않고 date bucket만 계산. |
| `activity.totalThreads` | `state_5.sqlite.threads` | session index | High. archived 포함 여부와 source filter는 Stage 3에서 결정. | thread title/source/cwd는 제외. |
| streaks | thread timestamps | session timestamps | Medium. daily active bucket 정의가 필요. | date-only aggregate로 제한. |
| `activity.longestTaskDurationMs` | `threads.created_at_ms/updated_at_ms` 또는 session event duration | JSONL `duration` key | Medium. thread lifecycle duration과 task duration 의미 차이 검증 필요. | raw messages 불필요. |
| `activity.reasoningEffort*` | `state_5.sqlite.threads.reasoning_effort` | session JSONL `effort` key | High for effort distribution 후보. percent denominator는 Stage 3에서 정의. | effort enum/count만 출력. |
| `models.*` | `state_5.sqlite.threads.model`, `model_provider`, `tokens_used` | session JSONL model keys, `models_cache.json` display normalization | High. favorite basis는 tokens 또는 usage_count 중 Stage 3에서 확정. | model names are low sensitivity, but cache content not copied. |
| `skills.topSkills` | session JSONL `dynamic_tools`, local skills/catalog files | `thread_dynamic_tools` | Medium. enabled tool 목록과 actual invocation을 구분해야 한다. | custom skill names may be private; normalization/redaction policy 필요. |
| `plugins.topPlugins` | session JSONL dynamic tools / plugin invocation events | plugin cache/catalog | Medium. `thread_dynamic_tools` alone may not prove actual use. | remote catalog와 local custom plugin 구분 필요. |
| `codexAssets.avatar` | remote/profile source or asset cache 후보 | generated image/cache files | Low/Deferred. Stage 2 local files만으로 safe avatar source 확정 불가. | local private path 기본 출력 금지. |
| `codexAssets.pet` | `<codex-home>/pets/` or profile/asset source 후보 | generated images | Low/Deferred. Stage 2에서 pet file 후보 없음. | absence를 실제 `null`로 단정하지 않음. |

## 결정

- Stage 1 기준으로 실제 데이터 source는 아직 확정하지 않는다. 현재 production CLI/SDK 값의 source는 fixture로 기록한다.
- `UsageSnapshot v2` 계약은 이번 task에서 변경하지 않는다. source mapping은 현 계약 안에서 `null`, empty array, diagnostics extension 가능성을 우선 검토한다.
- 후속 #2는 fixture와 production analyzer path를 분리하는 선행 작업이어야 한다.
- 후속 parser는 값이 없거나 계산 불가능한 필드를 sample 값으로 채우지 않는다. 가능한 경우 `null`, empty array, 또는 namespaced diagnostic extension으로 unavailable reason을 남긴다.
- 기술 조사와 보고서에는 실제 사용자 경로, token, credential, 계정 식별자 원문, raw 로그 본문을 남기지 않는다.
- Stage 2 기준으로 `state_5.sqlite`를 core usage/activity/model source의 1순위 후보로 둔다.
- session JSONL은 event-level detail과 skills/plugins 후보 source로 둔다. 단, allowlist parser 없이는 raw payload를 output에 연결하지 않는다.
- `logs_2.sqlite`는 diagnostics/coverage 보조 후보로 두고, token 계산의 primary source로 삼지 않는다.
- `auth.json`, `config.toml`, remote credential 기반 API는 analyzer 기본 parser source에서 제외한다.

## 비결정 / 보류

- token totals, daily buckets, model usage, activity insights, skills/plugins ranking, avatar/pet discovery의 실제 source 우선순위는 Stage 3에서 확정한다.
- `extensions`에 어떤 diagnostic namespace와 shape를 둘지는 후속 #2 또는 #3에서 구현 범위와 함께 결정한다.
- `codexProfile`을 analyzer가 계속 허용만 할지, production 기본 출력에서 생략할지는 후속 #2에서 분리 정책과 함께 결정한다.
- `thread_dynamic_tools`가 실제 invocation count인지, thread에서 enabled/available한 tool catalog인지 아직 확정하지 않았다.
- active sessions와 archived sessions의 중복 제거 기준은 Stage 3에서 정한다.
- local generated images와 `pets/` directory를 `codexAssets`로 연결할지는 safe output 정책이 먼저 필요하다.

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

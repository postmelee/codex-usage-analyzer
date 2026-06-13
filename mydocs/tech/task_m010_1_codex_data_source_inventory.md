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

### Codex Desktop 원격 profile API 참고

Codex Desktop 추출 bundle과 공개 `openai/codex` 저장소를 대조한 결과, Desktop profile 화면의 주요 지표는 로컬 DB가 아니라 인증된 원격 profile API를 통해 조회된다. 이 경로는 analyzer 기본 parser source가 아니며, local parser 산출값의 의미론을 비교하는 참고 기준으로만 사용한다.

| 항목 | 관찰 내용 | Stage 3 판단 | privacy/security note |
|---|---|---|---|
| profile 조회 | Desktop UI는 `/wham/profiles/me`를 조회해 profile 화면 값을 구성한다. 공개 `openai/codex` backend client도 ChatGPT API 경로로 `/wham/profiles/me`, Codex API 경로로 `/api/codex/profiles/me` 계열을 둔다. | remote profile API는 default analyzer source에서 제외한다. #6 smoke baseline 비교 또는 wrapper product에서만 사용한다. | 인증 토큰과 account context가 필요할 수 있으므로 analyzer CLI가 호출하지 않는다. |
| token summary | remote stats의 `lifetime_tokens`, `peak_daily_tokens`, `daily_usage_buckets[].tokens`, `daily_usage_buckets[].start_date`가 profile 카드의 total/peak/daily 값으로 매핑된다. | local parser는 이 의미론을 목표 기준으로 삼되, source는 local JSONL/SQLite에서 계산한다. | remote aggregate 자체도 account-owned usage data이므로 작업 문서에 실제 값을 기록하지 않는다. |
| activity summary | remote stats의 `current_streak_days`, `longest_streak_days`, `longest_running_turn_sec`, `fast_mode_usage_percentage`, `most_used_reasoning_effort`, `most_used_reasoning_effort_percentage`, `total_threads`가 profile activity 값으로 매핑된다. | local parser에서 계산 가능한 값만 채우고, fast mode처럼 local source가 불명확한 값은 `null`을 유지한다. | service-side 정의와 local 정의가 다를 수 있어 #6에서 차이를 baseline으로 기록한다. |
| skills/profile insights | remote stats의 `top_invocations`, `unique_skills_used`, `total_skills_used`가 profile insights로 매핑된다. | local `skills.*`/`plugins.*` 구현의 비교 기준으로만 둔다. `thread_dynamic_tools`를 실제 사용량으로 단정하지 않는다. | invocation 이름에는 custom skill/plugin 이름이 포함될 수 있어 redaction/allowlist 필요. |
| profile identity | remote profile의 `display_name`, `username`, `profile_picture_url`가 Desktop UI에서 사용된다. | `codexProfile`과 `codexAssets.avatar`는 analyzer 기본 출력이 아니라 wrapper/product-owned 영역으로 둔다. | display name, username, profile image URL은 계정 식별자로 취급한다. |
| rate limit | Desktop bundle의 `/wham/usage`는 rate-limit/credit UI에 사용된다. | `UsageSnapshot v2` token totals의 source로 사용하지 않는다. | quota/status 정보도 account-owned remote data다. |

### tokscale 참고 구현 분석

`junhoyeo/tokscale`는 Codex 지원을 위해 `<codex-home>/sessions/**/*.jsonl`의 `token_count` 이벤트를 parsing한다. 이는 Stage 2에서 잡은 session JSONL 후보와 일치하며, 원격 profile API에 없는 token breakdown, model grouping, local daily aggregation의 parser 전략을 보강하는 참고 구현으로 가치가 있다.

| 참고 항목 | tokscale 구현 관찰 | Stage 3 적용 판단 | privacy/security note |
|---|---|---|---|
| Codex data root | Codex client root는 `CODEX_HOME`이 있으면 해당 값을 쓰고, 없으면 `<home>/.codex` fallback을 사용한다. 상대 경로는 `sessions`, pattern은 `*.jsonl`이다. | analyzer도 `<codex-home>/sessions/**/*.jsonl`을 token breakdown의 1순위 후보로 둔다. archived session은 dedup 검증 후 보조 후보로 둔다. | 실제 home path를 output이나 문서에 기록하지 않는다. |
| token event | `event_msg` + payload `type=token_count`를 token-bearing event로 처리한다. | #3 parser는 JSONL line streaming으로 `token_count` numeric fields만 allowlist 추출한다. | 같은 payload에 private content key가 섞일 수 있으므로 전체 payload를 log/report하지 않는다. |
| token increment | `last_token_usage`를 primary increment source로 사용하고, `total_token_usage`는 dedup/monotonicity 검증에 사용한다. cumulative total을 직접 delta로 쓰지 않는다. | #3 parser의 기본 전략으로 채택한다. local SQLite `threads.tokens_used`는 cross-check/fallback으로 둔다. | overcount를 막기 위해 session resume, compaction, out-of-order snapshot을 방어해야 한다. |
| token breakdown | `input_tokens`, `output_tokens`, `cached_input_tokens` 또는 `cache_read_input_tokens`, `reasoning_output_tokens`를 normalized breakdown으로 합산한다. `cache_write`는 Codex source에서 명확히 확인되지 않으면 0으로 normalize한다. | `inputTokens`, `outputTokens`, `cacheReadTokens`, `reasoningTokens`는 JSONL에서 계산 가능 후보로 확정한다. `cacheWriteTokens`는 명시 source가 없으면 `null`을 유지한다. | `cached_input_tokens`가 input보다 큰 비정상 값을 방어해야 한다. |
| model context | model은 payload model, `info.model`, `turn_context`, session meta를 조합해 보정한다. | `models.*` source 우선순위는 JSONL token event model, SQLite thread model, model cache display normalization 순서로 둔다. | unknown model은 `model: "unknown"` 같은 synthetic value보다 해당 model item 제외 또는 diagnostic을 우선 검토한다. |
| fork/replay dedup | forked child session이 parent token history를 replay할 수 있어 parent/fork metadata와 cumulative total key로 중복 집계를 줄인다. | #3 parser 요구사항으로 dedup key 설계를 포함한다. #6 smoke baseline에서 duplicated session 의심을 점검한다. | session id 자체는 output에 노출하지 않는다. |
| daily/streak | daily aggregate, active days, current/longest streak, contribution graph를 계산한다. current streak은 오늘이 비어 있으면 yesterday 기준도 허용한다. | `usage.daily`, `peakDailyTokens`, streak 계산의 local 참고 구현으로 사용한다. 단, analyzer는 contribution graph/cost 중심 지표를 v2에 추가하지 않는다. | 날짜 bucket만 출력하고 workspace/session/path는 제외한다. |
| model ranking | TUI/wrapped 경로의 top model 정렬은 cost 기준인 곳이 있다. | `UsageSnapshot v2`의 `favoriteModel`은 기본 `tokens` 기준으로 정한다. cost 기준 ranking은 이번 task와 v2 범위에서 제외한다. | pricing table이나 원격 price sync는 analyzer 기본 기능에 넣지 않는다. |
| social/wrapped 기능 | wrapped image, leaderboard, public profile, submit flow가 있다. | analyzer ownership 밖이다. 후속 product wrapper 또는 별도 schema 후보로만 기록한다. | submit token, username, public URL은 analyzer snapshot에 넣지 않는다. |

### Stage 3 필드별 mapping 및 fallback 정책

아래 표는 후속 #2-#6이 이어받을 `UsageSnapshot v2` 필드별 source 우선순위다. `fallback/null policy`는 fixture 값을 대체값으로 쓰지 않는 것을 전제로 한다.

| 필드 | source 우선순위 | confidence | fallback/null policy | privacy note | follow-up |
|---|---|---|---|---|---|
| `schemaVersion` | package constant | High | 항상 `2` | 민감정보 없음 | #2 |
| `capturedAt` | analyzer 실행 시각 또는 caller override | High | ISO date-time. test fixture 외 production은 실행 시각 사용 | 민감정보 없음 | #2 |
| `producer` | package name/version | High | package metadata를 넣거나 생략. fixture marker를 production에 넣지 않음 | 민감정보 없음 | #2 |
| `codexProfile.*` | wrapper product 또는 remote profile API | Deferred | analyzer default output에서는 생략 권장. caller가 제공할 때만 validator 통과 값 사용 | displayName/username/plan은 account identity로 취급 | #2, #6 |
| `usage.totalTokens` | session JSONL `token_count.last_token_usage` aggregate | High if token_count exists, Medium with SQLite fallback | source 없음은 `0` + namespaced diagnostic. sample 값 금지 | raw JSONL content/path 제외, numeric aggregate만 출력 | #3 |
| `usage.peakDailyTokens` | `usage.daily[].totalTokens` max | High if daily aggregate exists | daily source 없음은 `null` | date bucket만 출력 | #3 |
| `usage.tokenBreakdown.inputTokens` | JSONL `input_tokens` minus safe cache-read adjustment | High if token_count exists | unavailable은 `null` | raw prompt text는 읽거나 출력하지 않음 | #3 |
| `usage.tokenBreakdown.outputTokens` | JSONL `output_tokens` | High if token_count exists | unavailable은 `null` | raw assistant text는 읽거나 출력하지 않음 | #3 |
| `usage.tokenBreakdown.cacheReadTokens` | JSONL `cached_input_tokens` 또는 `cache_read_input_tokens` | Medium/High | unavailable은 `null` | malformed cached > input 방어 필요 | #3 |
| `usage.tokenBreakdown.cacheWriteTokens` | 명시 token field가 확인될 때만 사용 | Low/Deferred | Codex source에서 명확하지 않으면 `null` | 0으로 단정하지 않음 | #3 |
| `usage.tokenBreakdown.reasoningTokens` | JSONL `reasoning_output_tokens` | Medium/High | unavailable은 `null` | numeric field만 추출 | #3 |
| `usage.daily[]` | JSONL `token_count` timestamp를 UTC date로 bucket | High if timestamp exists | JSONL 없고 SQLite만 있으면 `threads` timestamp+tokens로 degraded aggregate. source 없음은 `[]` | date와 totals만 출력 | #3, #6 |
| `models.favoriteModel` | model별 token aggregate 1위 | High if JSONL model+tokens exists | token 기준 불가하고 thread count만 있으면 `basis: "usage_count"`. source 없음은 `null` | model id/display only. workspace/session id 제외 | #3 |
| `models.items[]` | JSONL model aggregate, SQLite `threads.model` fallback, `models_cache.json` display normalization | High/Medium | source 없음은 `[]`. displayName 불명확하면 `null` | model cache 원문 전체 복제 금지 | #3 |
| `activity.longestTaskDurationMs` | JSONL turn start to token event duration 또는 explicit duration key | Medium | unavailable은 `null`. SQLite updated-created duration은 degraded fallback으로만 사용 | thread title/cwd 제외 | #3 |
| `activity.currentStreakDays` | daily totalTokens > 0 date set, `capturedAt` 기준 | Medium/High | daily source 없음은 `null`. 오늘 사용이 없으면 yesterday-ending streak 허용 여부를 #3 test에 고정 | date-only aggregate | #3, #6 |
| `activity.longestStreakDays` | daily totalTokens > 0 date set | Medium/High | daily source 없음은 `null` | date-only aggregate | #3, #6 |
| `activity.fastModePercent` | remote profile stats or local service-tier event 후보 | Low/Deferred | local source를 검증하기 전까지 `null` | remote profile 호출 금지 | #3 |
| `activity.reasoningEffort` | SQLite `threads.reasoning_effort`, JSONL `effort` | High if non-null values exist | unavailable은 `null`. most-used effort 기준 | enum/count만 출력 | #3 |
| `activity.reasoningEffortPercent` | reasoning effort distribution | High if denominator defined | denominator는 non-null effort rows/events. 없으면 `null` | raw thread fields 제외 | #3 |
| `activity.totalThreads` | SQLite `threads` distinct count | High | SQLite unreadable이면 unique session count fallback. source 없음은 `null` | thread id/title/cwd 출력 금지 | #3 |
| `skills.exploredCount` | remote profile stats or validated local invocation extractor | Deferred | local actual usage source 검증 전까지 `null` | catalog/enabled tool count를 사용량으로 오인하지 않음 | #4 |
| `skills.totalUsed` | remote profile stats or validated local invocation extractor | Deferred | local actual usage source 검증 전까지 `null` | custom skill 이름과 호출 내용 redaction 필요 | #4 |
| `skills.topSkills[]` | session JSONL actual invocation event, local skill catalog display normalization | Medium/Deferred | actual invocation 검증 전까지 `[]` | enabled/available tool 목록만으로 ranking 생성 금지 | #4 |
| `plugins.topPlugins[]` | session JSONL actual plugin/tool invocation event, plugin catalog display normalization | Medium/Deferred | actual invocation 검증 전까지 `[]` | remote/local custom plugin 구분, private name 정책 필요 | #4 |
| `codexAssets.avatar` | wrapper product, remote profile image, safe asset mapper | Deferred | analyzer default output은 `null` 또는 `codexAssets` 생략 | local path와 account image URL 기본 출력 금지 | #5 |
| `codexAssets.pet` | Codex Desktop avatar/pet asset policy 또는 wrapper product | Deferred | safe source 확정 전까지 `null` | generated/private image artifact 기본 출력 금지 | #5 |
| `extensions` | analyzer diagnostics namespace | Medium | unavailable source, degraded fallback, parser warnings를 `codexUsageAnalyzer.*`에 기록 가능. raw values 금지 | extension key namespace 강제, 민감 문자열 validator 유지 | #2, #3, #6 |

### Stage 3 source 우선순위 결론

| 영역 | primary | fallback | default unavailable |
|---|---|---|---|
| token totals/breakdown | session JSONL `token_count.last_token_usage` | SQLite `threads.tokens_used` for total-only | total `0` + diagnostic, nullable breakdown `null` |
| daily/peak/streak | session JSONL timestamp bucket | SQLite thread timestamp bucket | `daily: []`, nullable activity `null` |
| model ranking | JSONL token event model aggregate | SQLite model/thread count aggregate | `favoriteModel: null`, `items: []` |
| thread/activity count | SQLite `threads` | unique session files | `null` |
| reasoning effort | SQLite or JSONL effort fields | none | `null` |
| skills/plugins | validated actual invocation events | remote profile comparison only | counts `null`, arrays `[]` |
| avatar/pet/profile | wrapper/remote product source | none | omitted or `null` |

### Stage 4 후속 이슈 정합성 검토

Stage 4에서는 GitHub Issue #2-#6의 범위를 다시 확인하고 Stage 3 mapping과 충돌하는지 점검했다. 모든 후속 이슈는 M010 milestone의 열린 이슈이며, 이 task의 조사 결과를 이어받는 구조와 대체로 일치한다.

| Issue | 제목 | Stage 3 mapping과의 정합성 | 보강/주의 사항 |
|---|---|---|---|
| #2 | fixture 출력과 실제 analyze 출력 분리 | OK. fixture/sample 출력과 production analyzer source 분리 요구가 Stage 1-3 결론과 일치한다. | production unavailable 값은 sample 값으로 채우지 말고 zero/null/diagnostic 정책을 적용해야 한다. |
| #3 | UsageSnapshot v2 실제 parser 구현 | OK. core usage/activity/model 범위가 Stage 3의 session JSONL primary, SQLite fallback 전략과 일치한다. | parser 설계에 `token_count.last_token_usage`, cumulative total dedup, date boundary, remote profile 비교 diagnostic을 포함해야 한다. |
| #4 | topSkills/topPlugins ranking extractor 구현 | OK with caution. skills/plugins ranking 구현 범위는 Stage 3의 보류 영역을 후속 구현으로 받는다. | `thread_dynamic_tools`나 catalog presence를 actual invocation으로 단정하지 말고 invocation source 검증을 선행해야 한다. |
| #5 | Codex avatar/pet asset discovery 및 safe output 정책 구현 | OK. asset discovery와 safe output 범위가 Stage 3의 Deferred 판단과 일치한다. | 기본 analyzer JSON에 local path나 account image URL을 직접 넣지 않는 정책을 유지해야 한다. |
| #6 | 실제 Codex profile 값 비교 smoke test 구현 | OK. remote profile/API와 local parser 결과를 비교하는 baseline 목적이 Stage 3 결론과 일치한다. | remote profile API는 analyzer 기본 동작이 아니라 smoke/manual baseline의 비교 기준으로만 사용해야 한다. |

Stage 4 기준으로 후속 이슈 범위 변경이나 신규 이슈 생성은 필요하지 않다. 다만 #3/#4/#6은 local parser와 remote profile의 의미 차이를 문서와 diagnostic으로 추적해야 한다.

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
- Stage 3 기준으로 token breakdown과 daily/model aggregate의 primary source는 session JSONL `token_count` event로 둔다.
- Stage 3 기준으로 remote profile API와 `tokscale`는 각각 의미론 비교 기준과 parser 참고 구현으로만 사용한다.
- Stage 3 기준으로 `UsageSnapshot v2`의 required numeric field가 source unavailable일 때는 sample 값 대신 zero-value와 namespaced diagnostic을 조합하는 정책을 후속 #2/#3에서 구현한다.
- Stage 4 기준으로 #2-#6 후속 이슈는 현재 mapping과 충돌하지 않는다. 별도 신규 이슈 없이 기존 후속 이슈로 handoff한다.

## 비결정 / 보류

- `extensions`에 어떤 diagnostic namespace와 shape를 둘지는 후속 #2 또는 #3에서 구현 범위와 함께 결정한다.
- `codexProfile`을 analyzer가 계속 허용만 할지, production 기본 출력에서 생략할지는 후속 #2에서 분리 정책과 함께 결정한다.
- `thread_dynamic_tools`가 실제 invocation count인지, thread에서 enabled/available한 tool catalog인지 아직 확정하지 않았다.
- active sessions와 archived sessions의 구체 dedup key는 후속 #3에서 parser test와 함께 고정한다.
- local generated images와 `pets/` directory를 `codexAssets`로 연결할지는 safe output 정책이 먼저 필요하다.
- `tokscale`의 cost, wrapped image, leaderboard, public profile 계열 지표는 현재 `UsageSnapshot v2` 범위에서 제외한다. 필요하면 별도 schema issue가 필요하다.

## 적용 영향

- #2는 기본 `analyze --json`이 fixture-backed snapshot을 반환하지 않는다는 테스트를 추가해야 한다.
- #3은 core usage/activity/model parser가 계산 불가능한 값을 sample로 대체하지 않도록 `null`/diagnostic 정책을 따라야 한다.
- #4는 `topPlugins: []`가 실제 미사용인지, 아직 source 없음인지 구분해야 한다.
- #5는 asset discovery에서 local private path를 기본 JSON에 노출하지 않는 safe output 정책을 유지해야 한다.
- #6은 redacted baseline에서 account identifier, local path, credential 원문을 제외해야 한다.
- #6은 local parser 산출값과 remote profile API의 의미 차이를 baseline에 기록하되, remote API 호출을 analyzer 기본 동작으로 만들지 않아야 한다.

## 참고 링크

- [README](../../README.md)
- [수행계획서](../plans/task_m010_1.md)
- [구현계획서](../plans/task_m010_1_impl.md)
- [openai/codex](https://github.com/openai/codex)
- [junhoyeo/tokscale](https://github.com/junhoyeo/tokscale)

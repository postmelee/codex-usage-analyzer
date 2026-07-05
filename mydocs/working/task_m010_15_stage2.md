# Task M010 #15 Stage 2 완료보고서

GitHub Issue: [#15](https://github.com/postmelee/codex-usage-analyzer/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 2

## 단계 목적

Stage 2는 Codex Desktop/local source 후보를 read-only로 inventory하고, profile parity 개선에 사용할 수 있는 source와 제외해야 하는 source를 privacy 기준으로 분류하는 단계다.

이번 단계에서는 실제 경로, raw JSONL, raw profile value, prompt/response/tool payload, credential 값을 보고서에 기록하지 않았다. local 후보는 `{codex-home}`, `{app-support}`, `{cache}`, `{preferences}` placeholder와 file kind/schema category 수준으로만 정리했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m010_15_stage2.md` | Desktop/local source 후보 inventory, privacy classification, field별 candidate matrix를 기록했다. |

## 본문 변경 정도 / 본문 무손실 여부

문서-only 변경이다. `README.md`, `src/**`, `package.json`, `UsageSnapshot v2` schema는 수정하지 않았다. Stage 2는 현재 local filesystem과 공개 `openai/codex` source를 read-only로 확인하고, safe summary만 신규 단계 보고서에 작성했다.

## Source 후보 분류

| 후보 | 관찰한 형태 | 관련 field | Classification | #16 handoff |
|---|---|---|---|---|
| `{codex-home}/sessions/**/*.jsonl` | active session JSONL source가 존재한다. 현재 analyzer의 primary event source다. | token totals, breakdown, daily, model, effort, duration, skill/plugin invocation | `usable_local_source` | 이미 사용 중인 primary source다. #16에서는 event coverage와 archived/dedup 확장을 검토한다. |
| `{codex-home}/archived_sessions/*.jsonl` | archived JSONL source가 존재한다. active session과 유사한 event source일 수 있다. | historical usage, daily, model, invocation | `usable_local_source` | dedup key와 active overlap 검증 후 coverage 확장 후보로 넘긴다. |
| `{codex-home}/session_index.jsonl` | session index-like file이 존재한다. | discovery, dedup, date coverage 후보 | `privacy_risk` | title/path/summary 가능성이 있어 기본 parser source로 직접 쓰지 않는다. 필요 시 #16에서 key allowlist를 별도 설계한다. |
| `{codex-home}/state_5.sqlite` and `{codex-home}/sqlite/state_5.sqlite` | SQLite state DB 후보가 존재한다. `threads`, `thread_dynamic_tools` 등 schema가 확인된다. | totalThreads, total tokens fallback, model, reasoning effort, date/duration fallback | `usable_local_source` | aggregate numeric columns만 allowlist로 읽는 #16 후보다. `cwd`, `title`, message, git metadata columns는 제외한다. |
| `{codex-home}/logs_2.sqlite` | logs DB 후보가 존재한다. | diagnostics/coverage 보조 후보 | `privacy_risk` | raw log body와 module/process metadata가 있을 수 있어 usage parser source에서 제외한다. |
| `{codex-home}/.codex-global-state.json` | persisted atom state file이 존재하고 sensitive-looking key category가 있다. | selected pet/avatar state | `usable_local_source` + `privacy_risk` | 현재 pet selected state처럼 좁은 key allowlist만 유지한다. profile/identity/cache source로 일반화하지 않는다. |
| `{codex-home}/models_cache.json` | model cache JSON 후보가 존재한다. | model display normalization 후보 | `usable_local_source` | #16에서 model display/name normalization 보조 source로 검토할 수 있다. raw cache 복제는 금지한다. |
| `{codex-home}/cache`, `{codex-home}/plugins`, `{codex-home}/skills`, `{codex-home}/vendor_imports/skills` | catalog/cache/custom skill/plugin directories가 존재한다. | skill/plugin display normalization, catalog availability | `usable_local_source` | usage count source가 아니다. #16/#4 후속에서는 actual invocation과 분리해 사용해야 한다. |
| `{codex-home}/pets` | custom pet manifest 후보가 존재한다. | `codexAssets.pet` | `usable_local_source` | 이미 #5에서 best-effort logical reference source로 사용 중이다. profile usage parity와는 별도다. |
| `{codex-home}/generated_images` | generated image artifact directory가 존재한다. | avatar/pet asset-like 후보 | `privacy_risk` | private generated artifact로 유지하고 default analyzer asset source로 승격하지 않는다. |
| `{codex-home}/auth.json`, `{codex-home}/config.toml` | auth/config files가 존재한다. | analyzer source 아님 | `privacy_risk` | credential/account/config 위험이 있어 #16 parser source에서 제외한다. |
| `{app-support}/Codex` | Electron app data directory가 존재한다. Cookies, Local Storage, Session Storage, Cache, blob/cache stores가 있다. | Desktop profile/cache 가능성 | `privacy_risk` | profile cache가 있을 수 있어도 token/cookie/session/localStorage 위험 때문에 default analyzer source에서 제외한다. |
| `{app-support}/com.openai.codex`, `{cache}/com.openai.codex`, `{preferences}/com.openai.codex.plist` | app support/cache/preference 후보가 존재한다. | Desktop app/service setting 후보 | `unavailable_or_absent` | profile usage stats source는 확인되지 않았다. preference/cache는 #16 parser source로 넘기지 않는다. |
| adjacent OpenAI/ChatGPT/CUAService app containers | related app/service data 후보가 보인다. | Codex Desktop profile과 간접 관련 가능성 | `remote_only_or_internal` + `privacy_risk` | 다른 app/service container이므로 analyzer default source에서 제외한다. |
| 공개 `openai/codex` backend client profile endpoint | `get_token_usage_profile()`가 remote `/api/codex/profiles/me` 또는 `/wham/profiles/me` path를 사용한다. | remote profile total/peak/streak/daily | `remote_only_or_internal` | local analyzer가 호출하지 않는다. redacted baseline 또는 wrapper product 비교 기준으로만 둔다. |

## 공개 source 재검토 결과

GitHub primary source 검색으로 현재 공개 `openai/codex` repository에서 profile endpoint가 `codex-rs/backend-client/src/client.rs`에 남아 있음을 확인했다. 같은 repository의 `codex-rs/backend-client/src/types.rs`는 remote token usage profile stats에 `lifetime_tokens`, `peak_daily_tokens`, `longest_running_turn_sec`, `current_streak_days`, `longest_streak_days`, `daily_usage_buckets[].start_date`, `daily_usage_buckets[].tokens` shape를 둔다.

이 결과는 Desktop profile의 token/streak/daily 값이 local file cache가 아니라 authenticated remote account-level source일 수 있다는 #1/#6/#14 결론과 일치한다. Stage 2 기준으로 이 remote profile endpoint는 `remote_only_or_internal`이며 analyzer default parser source로 사용하지 않는다.

현재 공개 source 검색에서는 prior Desktop extraction 문서에 있던 `top_invocations`, `total_threads`, `fast_mode_usage`류 field가 같은 형태로 확인되지 않았다. 따라서 top skills/plugins/activity insight parity는 local source로 무리하게 보정하지 않고, source-aware smoke reason과 diagnostics로 계속 구분한다.

## Field별 candidate matrix

| field group | local 후보 | Desktop/remote 후보 | Stage 2 판단 | Classification |
|---|---|---|---|---|
| token totals/token breakdown | session JSONL token event, SQLite `threads.tokens_used` total-only fallback | remote token usage profile | session JSONL은 primary 유지. SQLite total은 #16 fallback 후보. remote total은 비교 기준일 뿐 source 아님. | `usable_local_source`, remote는 `remote_only_or_internal` |
| daily activity/streak/date basis | session timestamp UTC bucket, SQLite thread timestamps fallback | remote daily usage/streak profile | local date bucket과 remote account-level date basis가 다를 수 있다. timezone/date basis는 #17로 넘긴다. | `usable_local_source`, remote는 `remote_only_or_internal` |
| top skills/plugins ranking | actual invocation events, session catalog join, local catalog/display metadata | remote profile insight/cache 가능성 | catalog/cache presence만으로 usage count를 만들지 않는다. actual invocation source만 local usage로 인정한다. | `usable_local_source` with strict allowlist |
| thread count/task duration/activity insights | SQLite `threads` aggregate columns, session file fallback | remote profile activity stats | `totalThreads`, reasoning effort, duration fallback은 #16 후보. fast mode/activity insight parity는 local source 불명확. | partial `usable_local_source`, 일부 `unavailable_or_absent` |
| pet/avatar/profile asset-like source | selected pet state, `pets` manifest, generated image exclusion | remote profile image, Electron cache/localStorage | pet logical ref는 기존 best-effort 유지. avatar/profile identity는 wrapper-owned 또는 remote-only로 유지. | pet `usable_local_source`, avatar/cache `privacy_risk` |

## Privacy 판단

- Electron app data의 `Cookies`, `Local Storage`, `Session Storage`, cache/blob stores는 profile cache를 포함할 가능성이 있어도 credential/session/account data 위험이 크므로 parser source에서 제외한다.
- SQLite `threads` schema에는 aggregate 후보 columns와 private context columns가 함께 존재한다. #16에서 사용한다면 numeric/date/model/effort allowlist만 허용하고 `cwd`, title/message/git-related columns는 읽거나 출력하지 않아야 한다.
- JSONL source는 이미 analyzer가 allowlisted token/model/tool event만 streaming하는 방향이다. archived sessions를 확장할 경우 active sessions와 dedup이 선행되어야 한다.
- generated images와 remote profile image/cache는 private artifact 또는 account-owned asset으로 취급한다.
- auth/config files는 존재 여부와 관계없이 analyzer source에서 제외한다.

## 검증 결과

실행 명령:

```bash
rg --files
rg -n "profileComparison|remote_profile_api_not_used|session_jsonl|sourcePolicy|topPlugins|topSkills" README.md src scripts mydocs
node -e "<sanitized local candidate lister>"
sqlite3 "{codex-home}/state_5.sqlite" ".tables"
sqlite3 "{codex-home}/state_5.sqlite" "PRAGMA table_info(threads); PRAGMA table_info(thread_dynamic_tools);"
sqlite3 "{codex-home}/logs_2.sqlite" ".tables"
gh search code '"/wham/profiles/me" repo:openai/codex'
gh search code '"/api/codex/profiles/me" repo:openai/codex'
gh search code '"struct TokenUsageProfile" repo:openai/codex'
rg -n "usable_local_source|remote_only_or_internal|privacy_risk|unavailable_or_absent" mydocs/working/task_m010_15_stage2.md
rg -n -f /private/tmp/cua-task15-sensitive-patterns.txt mydocs/working/task_m010_15_stage2.md
git diff --check
```

결과:

- OK: repository source scan에서 현재 analyzer의 `session_jsonl`, `remote_profile_api_not_used`, `sourcePolicy`, `topSkills`, `topPlugins` 관련 계약을 확인했다.
- OK: sanitized local candidate lister로 `{codex-home}` source 후보와 Desktop app data/cache/preference 후보를 file kind와 store category 수준으로 확인했다.
- OK: SQLite schema 확인은 table/column metadata만 조회했고 row data는 조회하지 않았다.
- OK: 공개 `openai/codex` source에서 remote profile endpoint와 token usage profile field shape를 확인했다.
- OK: classification scan에서 네 가지 classification token이 모두 Stage 2 보고서에 존재함을 확인했다.
- OK: privacy pattern scan은 match 없음으로 통과했다.
- OK: `git diff --check` 통과.

## 잔여 위험

- Stage 2는 local environment 한 곳의 source 후보를 확인한 결과다. 다른 Codex Desktop version 또는 account state에서는 app data/cache shape가 달라질 수 있다.
- SQLite `threads.tokens_used`와 remote `lifetime_tokens`의 의미가 같다고 단정할 수 없다. #16에서는 local-only estimate와 diagnostics를 유지해야 한다.
- Electron cache/localStorage를 제외했기 때문에 Desktop profile cache가 실제로 local에 있더라도 analyzer 기본 parser는 사용하지 않는다.
- 공개 `openai/codex` source와 Desktop app bundle의 profile UI field set은 완전히 같지 않을 수 있다.

## 다음 단계 영향

- Stage 3은 #16으로 넘길 후보를 `session JSONL archived coverage`, `SQLite threads aggregate fallback`, `models_cache display normalization`, `catalog metadata display normalization` 중심으로 좁힌다.
- Stage 3은 #17로 넘길 date/timezone 판단을 분리한다.
- Stage 3은 #18 redacted baseline generator가 실제 profile values를 커밋하지 않도록 source/redaction 요구사항을 정리한다.
- Desktop app Electron data, auth/config, generated images, remote profile endpoint는 parser 구현 후보에서 제외한다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3 `parser feasibility 결정과 후속 task handoff`로 진행한다.

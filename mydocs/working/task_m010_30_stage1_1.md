# Task M010 #30 Stage 1.1 보고서

GitHub Issue: [#30](https://github.com/postmelee/codex-usage-analyzer/issues/30)  
구현계획서: [`task_m010_30_impl.md`](../plans/task_m010_30_impl.md)  
Stage: 1.1

## 단계 목적

작업지시자가 제공한 `{codex-extracted}` 추출 폴더에서 Codex Desktop의 API 및 profile 관련 기능을 정적으로 분석한다. 목적은 #30 Stage 2에서 experimental remote command/probe를 설계할 때 쓸 endpoint 후보, response mapping, credential boundary, Desktop host bridge 의존성을 확인하는 것이다.

이번 단계는 read-only bundle inspection이다. no live endpoint 호출, no keychain 접근, no auth file 접근, no raw response 저장 원칙을 유지했다.

## 조사 범위와 제외

| 구분 | 내용 |
|---|---|
| 포함 | 추출 번들의 `package.json`, webview HTML entry, webview asset chunks, host `.vite/build` chunks |
| 제외 | 실제 Codex 로그인 세션, keychain, auth file, live remote endpoint, raw profile response, raw token, local user data |
| 한계 | source map 파일은 실제로 존재하지 않아 minified production bundle 기준으로 분석했다. |

## 산출물

| 파일 | 변경 |
|---|---|
| `mydocs/working/task_m010_30_stage1_1.md` | 신규 Stage 1.1 분석 보고서 |
| `mydocs/plans/task_m010_30_impl.md` | Stage 1.1 단계와 Stage 2 입력 조건 추가 |

## 분석 결과

### Bundle 구조

- 추출 번들은 `openai-codex-electron` production build이며 version은 `26.623.42026`, build number는 `4514`로 식별된다.
- main entry는 `.vite/build/bootstrap.js`이고, host-side 주요 chunk는 `.vite/build/main-r5HnecX_.js`다.
- webview 쪽에는 `profile`, `usage-settings`, `remote-conversation-page` 관련 asset chunk가 분리되어 있다.
- 일부 파일에는 source map 주석이 있지만 실제 `.map` 파일은 확인되지 않았다.

### Entry와 CSP

- webview HTML entry는 module script로 webview app asset을 로드한다.
- profile/usage 관련 chunk는 avatar overlay composition surface HTML에서도 preload 대상으로 나타난다.
- CSP `connect-src`에는 ChatGPT backend 계열 websocket/HTTPS origin과 telemetry/CDN/mapbox origin이 포함된다.
- 이 항목은 네트워크 허용 origin의 힌트일 뿐, CLI에서 같은 API를 직접 호출할 수 있다는 의미는 아니다.

### Profile endpoint와 mapping

Profile 관련 chunk에서 다음 endpoint 후보가 확인됐다.

| Method | Path | 용도 |
|---|---|---|
| GET | `/wham/profiles/me` | profile 화면용 profile/usage summary 조회 |
| PATCH | `/wham/profiles/me` | profile field update |
| POST | `/wham/profiles/me/photo` | profile photo multipart upload |

`GET /wham/profiles/me` 결과는 webview model로 다음처럼 매핑된다.

| Remote field category | Webview field category |
|---|---|
| `stats.daily_usage_buckets` | daily usage entries |
| `profile.display_name` | display name |
| `profile.profile_picture_url` | image URL |
| `profile.username` | username |
| `metadata.stats_error` | stats error flag |
| `summary.current_streak_days` | current streak |
| `summary.longest_streak_days` | longest streak |
| `summary.longest_running_turn_sec` | longest task duration in milliseconds |
| `summary.peak_daily_tokens` | peak daily tokens |
| `summary.lifetime_tokens` | lifetime tokens |
| `activity_insights.fast_mode_usage_percentage` | fast mode usage percentage |
| `activity_insights.top_invocations` | top invocations |
| `activity_insights.most_used_reasoning_effort` | most used reasoning effort |
| `activity_insights.unique_skills_used` | unique skills count |
| `activity_insights.total_skills_used` | total skills usage |
| `activity_insights.total_threads` | total threads |

Query key는 profile, usage, user identity category, account identity category를 함께 사용한다. profile query stale time은 feature/config key로 조정 가능하며 기본값은 six hours 계열 상수다. identity 없이 query가 시작되거나 query가 실패할 때의 log는 raw identifier 대신 boolean/status/error-code category만 남기도록 되어 있다.

### Usage와 rate-limit endpoint

Usage/rate-limit 관련 chunk에서 다음 endpoint 후보가 확인됐다.

| Method | Path | 용도 |
|---|---|---|
| GET | `/wham/usage` | rate limit status 조회 |
| GET | `/wham/usage/daily-token-usage-breakdown` | usage settings의 daily token usage breakdown |
| GET | `/wham/usage/credit-usage-events` | credit usage event history |

`/wham/usage` query는 rate-limit status key를 사용하며 refresh interval은 one minute 계열 상수다. 401, 403, 404 응답은 null-like 결과로 처리하고 그 외 오류는 throw하는 형태다. usage settings 쪽 daily/credit history query는 별도 key로 관리된다.

이 구조상 Codex profile UI의 일부 수치와 local analyzer 수치가 다른 것은 자연스럽다. UI는 Desktop 앱이 backend profile/usage endpoint에서 받은 summary를 사용하고, 현재 local analyzer는 local session source를 계산한다.

### Webview safe client와 fetch bridge

webview bundle에는 generated safe client 형태의 wrapper가 있다. 이 wrapper는 path parameter와 query parameter를 조립하고 request body를 JSON으로 직렬화한 뒤 `safeGet`, `safePost`, `safePatch`, `safeDelete` 형태로 호출한다.

다만 이 wrapper는 browser fetch를 직접 호출하지 않는다. webview HTTP layer는 `fetch`, `fetch-stream`, `cancel-fetch`, `cancel-fetch-stream` 메시지를 host로 보내고, host에서 `fetch-response`, `fetch-stream-event`, `fetch-stream-error`, `fetch-stream-complete` 메시지를 돌려받는다. 즉 profile/usage endpoint 호출은 webview code만 복제해도 재현되지 않고, Desktop host bridge와 host-side auth/session 처리가 함께 필요하다.

### Host-side auth와 credential boundary

host-side chunk에는 ChatGPT backend base URL과 Electron `net.fetch` 기반 request path가 확인된다. host는 app server client에서 auth token을 얻은 뒤 request header category를 구성한다.

확인된 header category는 다음과 같다.

| Header category | 의미 |
|---|---|
| `Authorization` | bearer token category. 실제 token 값은 조사하지 않았다. |
| `ChatGPT-Account-Id` | token claim에서 추출되는 account identity category |
| `originator` | Desktop client originator category |
| `User-Agent` | Desktop client user agent category |

host chunk는 token payload claim에서 auth/profile category를 읽는다. 확인된 claim category에는 account id, user id, plan type, compute residency, email category가 포함된다. 이 분석은 claim name/category 확인에 한정했고 실제 token이나 실제 claim value는 읽지 않았다.

또한 host fetch path에는 session credential과 device/integrity 계열 처리가 결합될 수 있는 흔적이 있다. 따라서 npm CLI에서 `/wham/profiles/me`를 단순 HTTP endpoint처럼 호출하는 설계는 안전하지도, 충분하지도 않다.

## Feasibility 영향

| 질문 | 판단 |
|---|---|
| Codex profile 화면 값과 더 가까운 remote source가 존재하는가? | 존재한다. `/wham/profiles/me`가 profile/usage summary를 직접 제공한다. |
| 현재 local analyzer보다 UI profile 수치와 일치할 가능성이 높은가? | 높다. UI가 같은 endpoint의 summary를 소비하기 때문이다. |
| npm CLI가 바로 같은 값을 안전하게 사용할 수 있는가? | 아니다. Desktop host bridge, auth token, account header, session/device boundary가 필요하다. |
| 기본 analyzer source로 채택할 수 있는가? | 아니다. internal/non-public endpoint이며 credential boundary가 local analyzer와 다르다. |
| experimental opt-in command 후보로 검토할 가치는 있는가? | 있다. 단, Stage 2에서 no-persistence, explicit consent, mock-only test, redaction, failure handling을 먼저 설계해야 한다. |

## Open uncertainty

- source map이 없어 generated type name과 exact schema contract는 확인하지 못했다.
- live endpoint 호출을 하지 않았으므로 실제 응답 필드, 계정별 차이, latency, rate-limit behavior는 검증하지 않았다.
- endpoint는 public stable API로 문서화된 계약이 아니며, Desktop 앱 build와 함께 drift될 수 있다.
- host-side auth/session/device integrity 처리가 minified code에 섞여 있어 CLI 재현 가능성은 별도 승인 없는 정적 분석만으로 확정할 수 없다.

## 본문 변경 정도

- runtime code, package metadata, README, UsageSnapshot v2 schema는 변경하지 않았다.
- 신규 Stage 1.1 보고서와 구현계획서의 단계/검증 항목만 수정했다.

## 본문 무손실 여부

- 기존 Stage 1 결론과 local analyzer 기본 정책은 유지했다.
- Stage 1.1은 사용자 제공 추출 번들에서 확인한 endpoint/bridge evidence를 추가한 보강 단계다.

## 검증 결과

아래 명령을 Stage 1.1 보고서 작성 후 실행했다.

```bash
rg -n "codex-extracted|/wham/profiles/me|/wham/usage|fetch bridge|Authorization|no live endpoint|credential boundary" mydocs/working/task_m010_30_stage1_1.md
rg -n -f /private/tmp/cua-task30-sensitive-patterns.txt mydocs/plans/task_m010_30*.md mydocs/working/task_m010_30_stage*.md
git diff --check
```

결과:

| 검증 | 결과 |
|---|---|
| endpoint/bridge keyword scan | 통과. Stage 1.1 보고서에서 profile/usage endpoint와 fetch bridge 경계를 확인했다. |
| 민감정보 pattern scan | 통과. token-like value, account identifier, private local path match 없음. |
| `git diff --check` | 통과. whitespace error 없음. |

## 잔여 위험

- `/wham/profiles/me`와 `/wham/usage*`는 internal/non-public endpoint로 보이며 안정 계약이 없다.
- Desktop host가 수행하는 auth/session/device boundary를 npm CLI에서 그대로 재현하려 하면 보안 신뢰도가 떨어진다.
- raw response fixture를 저장하면 실제 profile/account data 유출 위험이 있다. Stage 2 mock 전략은 synthetic shape만 허용해야 한다.

## 다음 단계 영향

Stage 2는 experimental remote command/probe를 구현하지 않고 먼저 설계한다. 설계에는 다음 조건을 반영한다.

- 기본 `analyze`와 완전히 분리한 opt-in command surface
- `/wham/profiles/me`와 `/wham/usage*`를 Desktop host bridge 의존 source로 분류
- live probe가 필요하면 endpoint, credential source category, redacted output, raw response 미저장 방식에 대한 별도 승인 요청
- mock-only 테스트 전략과 token/account/local-path pattern rejection

## 승인 요청

Stage 1.1 승인 후 Stage 2로 진행한다.

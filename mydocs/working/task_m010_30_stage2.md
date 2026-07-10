# Task M010 #30 Stage 2 완료보고서

GitHub Issue: [#30](https://github.com/postmelee/codex-usage-analyzer/issues/30)
구현계획서: [`task_m010_30_impl.md`](../plans/task_m010_30_impl.md)
Stage: 2

## 단계 목적

Stage 2는 `/wham/profiles/me`와 `/wham/usage*` 계열 endpoint를 확인한 뒤, 이를 기본 analyzer와 분리된 experimental source로 설계할 수 있는지 판단하는 단계다.

초기 설계와 mock 전략을 정리한 뒤, 2026-07-10 작업지시자의 명시 승인에 따라 standalone direct-call probe와 동일 시점 local analyzer 비교를 추가 수행했다. runtime code, CLI, package metadata, README, `UsageSnapshot v2` schema는 변경하지 않았다. keychain과 auth file은 직접 읽지 않았고 raw response, token, account identifier, profile identity field도 저장하거나 출력하지 않았다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/plans/task_m010_30_impl.md` | live probe 승인 기록, direct-call 검증 범위, Stage 2 검증 항목을 추가했다. |
| `mydocs/working/task_m010_30_stage2.md` | experimental remote source 설계, command 후보 비교, mock 전략, direct-call parity/latency 결과를 정리했다. |

## Stage 1/1.1 입력 요약

| 입력 | Stage 2 반영 |
|---|---|
| 공개 `openai/codex` source에서 profile endpoint stable contract를 확인하지 못함 | public/stable API로 취급하지 않는다. |
| `tokscale`은 local parser와 remote usage command를 분리함 | remote 기능은 기본 analyzer가 아니라 별도 command로만 설계한다. |
| Codex Desktop bundle에서 `/wham/profiles/me`와 `/wham/usage*` 확인 | remote profile parity 후보로 채택하되 internal/non-public source로 분류한다. |
| Desktop webview는 host fetch bridge에 의존함 | CLI가 단순 HTTP endpoint 호출로 재현 가능하다고 전제하지 않는다. |
| host-side auth/session/device boundary 존재 | credential source와 live probe는 별도 승인 gate로 둔다. |

## 승인된 live direct-call probe

작업지시자는 별도 experimental command 구현이 아니라 실제 endpoint를 standalone process에서 직접 호출해 첨부 Codex profile 화면과 비교하도록 승인했다. probe는 다음 경계로 수행했다.

| 항목 | 적용 내용 |
|---|---|
| endpoint | `GET /wham/profiles/me`로 제한하고 retry하지 않음 |
| auth source | Codex app-server의 internal `getAuthStatus` request로 현재 ChatGPT login token을 process memory에서만 수신 |
| account context | token claim의 account category를 request header에 사용하고 값은 출력하지 않음 |
| Desktop surface | bundle에서 확인한 originator와 user-agent category만 적용 |
| timeout | bounded timeout 적용 |
| persistence | raw response, token, identifier, profile identity field를 disk에 쓰지 않음 |
| output | numeric/enum aggregate, status, latency, parity boolean만 일시 출력 |
| repository | probe script와 live response를 source tree나 package artifact에 포함하지 않음 |

Codex app-server가 생성한 public/experimental JSON schema에는 `getAuthStatus`가 나타나지 않았다. Desktop bundle은 이 method를 `sendInternalRequest`로 호출하고 있었다. 따라서 direct call 성공은 현재 build에서의 기술적 가능성을 증명하지만 public/stable auth contract를 의미하지 않는다.

## Direct-call parity와 latency 결과

Live response의 개인 aggregate 수치는 저장소 문서에 기록하지 않고, 첨부 화면 대비 결과만 남긴다.

| 검증 | 결과 |
|---|---|
| HTTP | 성공 범주(`2xx`) |
| profile summary | 누적/최대 token, 최장 작업, 현재/최장 streak가 화면 표시와 모두 일치 |
| activity insights | fast mode, reasoning effort/비율, unique/total skills, total threads가 화면 표시와 모두 일치 |
| top invocations | 상위 5개 label, 순서, 실행 횟수가 화면과 모두 일치 |
| stats metadata | stats error 없음 |
| request latency | 1초 미만 범주 |
| app-server startup/auth 포함 end-to-end latency | 1초 미만 범주 |
| raw data handling | raw response 미저장, identifier 미출력 |

동일 시점 local analyzer safe summary와 비교한 결과는 다음과 같다.

| 비교 항목 | 결과 |
|---|---|
| end-to-end latency | local session scan은 1분 이상, remote direct call은 1초 미만으로 remote가 60배 이상 빠름 |
| Codex profile parity | remote는 첨부 화면 전 항목 일치, local은 일부 field만 일치 |
| token aggregate | local lifetime/peak가 remote profile보다 큰 방향으로 불일치 |
| activity aggregate | current streak는 일치했지만 longest streak는 local이 작은 방향으로 불일치 |
| unavailable local fields | longest task, fast mode, reasoning effort/비율 |
| skills/threads coverage | local이 remote보다 크게 작은 방향으로 불일치 |

이 결과로 별도 opt-in command는 기술적 필수 조건이 아니라 사용자 동의와 npm trust를 표현하기 위한 제품 경계임이 확인됐다. standalone module이나 SDK function에서 직접 호출하는 구현도 가능하다. 다만 기본 `analyzeUsage()`가 고지 없이 network와 bearer token을 사용하게 해서는 안 된다.

## Command 후보 비교

| 후보 | 장점 | 단점 | Stage 2 판단 |
|---|---|---|---|
| `codex-usage-analyzer analyze --json --experimental-remote-profile` | 기존 command 안에 있어 discoverability가 높다. | 기본 analyzer와 remote credential/network 동작이 섞여 오해 가능성이 크다. | 보류. 기본 `analyze` contract를 흐린다. |
| `codex-usage-analyzer remote-profile-probe --json` | profile parity 검증 목적이 명확하다. | `remote`라는 이름만으로는 experimental/non-public 위험이 약하게 보인다. | 보완 필요. |
| `codex-usage-analyzer experimental-remote-profile --json` | experimental, opt-in, non-default 성격이 command name에 직접 드러난다. | 긴 이름이지만 실수 실행 가능성이 낮다. | 권장 후보. |
| `node scripts/remote-profile-probe.js` | npm package public CLI와 분리 가능하다. | 사용자가 package 기능으로 발견하기 어렵고, 배포 artifact 관리가 애매하다. | 초기 내부 검증용 후보. public CLI 채택 전 단계에 적합하다. |

권장 command surface는 후속 구현 이슈에서 다음처럼 시작하는 것이다.

```bash
codex-usage-analyzer experimental-remote-profile --json --allow-network --auth-source <source-category>
```

필수 조건:

- command name에 `experimental`을 포함한다.
- network 동작은 `--allow-network` 없이는 실행하지 않는다.
- credential source는 `<source-category>`처럼 category로만 문서화하고, default 자동 탐색을 만들지 않는다.
- stdout은 redacted JSON summary만 출력한다.
- stderr는 safe error code만 출력하고 path, token, raw account identifier, raw profile field를 출력하지 않는다.
- 기본 `analyze --json` 경로와 `UsageSnapshot v2` schema를 변경하지 않는다.

Live probe 이후의 보정 결론은 다음과 같다.

- 별도 CLI command는 구현상 필수가 아니다.
- 후속 구현은 명시적 network/credential consent를 받는 SDK function 또는 source option으로도 제공할 수 있다.
- default local analyzer가 remote로 자동 fallback하는 동작은 npm package 신뢰 경계를 바꾸므로 채택하지 않는다.
- auth adapter는 Codex app-server internal method 의존성을 드러내고 method/endpoint drift를 정상 failure로 처리해야 한다.

## Output contract 후보

Stage 2 권장 output은 `UsageSnapshot v2`가 아니라 별도 probe summary다. remote endpoint가 internal/non-public이고 schema drift 위험이 있으므로, remote response를 곧바로 `UsageSnapshot v2` producer로 승격하지 않는다.

후속 구현 이슈의 synthetic output shape 후보:

```json
{
  "schemaVersion": 1,
  "kind": "codex-usage-analyzer.experimentalRemoteProfileProbe",
  "status": "ok",
  "source": "codex_desktop_remote_profile_api",
  "capturedAt": "ISO_TIMESTAMP",
  "endpoints": [
    {
      "name": "profile",
      "path": "/wham/profiles/me",
      "status": "ok",
      "httpStatusCategory": "2xx",
      "latencyMs": 123
    }
  ],
  "comparableFields": [],
  "values": {},
  "redaction": {
    "rawResponsePersisted": false,
    "rawIdentifiersPersisted": false,
    "rawProfileFieldsPersisted": false
  }
}
```

`values`에는 numeric/enum summary만 허용한다. display name, username, email category, image URL, raw account identifier, raw token-derived claim value는 출력하지 않는다. 필요한 경우 presence boolean이나 unavailable reason만 사용한다.

## Remote-to-local field mapping 후보

| Remote category | Local/UsageSnapshot v2 후보 | 판단 |
|---|---|---|
| profile display name | `codexProfile.displayName` | raw profile field라 probe default output에서 제외한다. |
| profile username | `codexProfile.username` | raw profile field라 probe default output에서 제외한다. |
| profile image URL | `codexAssets.avatar` 후보 | private/profile asset risk가 있어 제외한다. |
| `summary.lifetime_tokens` | `usage.totalTokens` | 비교 가능. remote source가 더 UI에 가깝다. |
| `summary.peak_daily_tokens` | `usage.peakDailyTokens` | 비교 가능. |
| `stats.daily_usage_buckets` | `usage.daily[].totalTokens` | 비교 가능. token breakdown은 null로만 둘 수 있다. |
| `summary.current_streak_days` | `activity.currentStreakDays` | 비교 가능하지만 date basis 차이 reason 필요. |
| `summary.longest_streak_days` | `activity.longestStreakDays` | 비교 가능하지만 date basis 차이 reason 필요. |
| `summary.longest_running_turn_sec` | `activity.longestTaskDurationMs` | seconds to milliseconds 변환으로 비교 가능. |
| `activity_insights.fast_mode_usage_percentage` | `activity.fastModePercent` | 비교 가능. |
| `activity_insights.most_used_reasoning_effort` | `activity.reasoningEffort` | 비교 가능. |
| `activity_insights.most_used_reasoning_effort_percentage` | `activity.reasoningEffortPercent` | 비교 가능. |
| `activity_insights.total_threads` | `activity.totalThreads` | 비교 가능하지만 local session coverage 차이 reason 필요. |
| `activity_insights.unique_skills_used` | `skills.exploredCount` | 후보. remote definition 확인 전까지 tentative. |
| `activity_insights.total_skills_used` | `skills.totalUsed` | 후보. remote definition 확인 전까지 tentative. |
| `activity_insights.top_invocations` | `skills.topSkills` 또는 별도 extension | 불확실. Stage 3에서 not comparable 후보로 둔다. |

## Failure handling

후속 구현 이슈의 probe result는 process exit code와 JSON status를 분리한다.

| 상황 | JSON status | Exit code | 출력 원칙 |
|---|---|---:|---|
| probe 성공 | `ok` | 0 | redacted summary JSON |
| `--allow-network` 없음 | `network_not_allowed` | 1 | stderr usage + safe code |
| credential source 미지정 | `auth_source_required` | 1 | credential category만 표시 |
| auth token 없음 | `auth_required` | 1 | token path/value 출력 금지 |
| 401/403 | `forbidden` | 1 | status category만 표시 |
| 404 | `endpoint_unavailable` | 1 | endpoint path category만 표시 |
| 429 | `rate_limited` | 1 | retry-after raw value가 민감하면 category만 표시 |
| timeout | `network_timeout` | 1 | target origin/category만 표시 |
| schema drift | `schema_drift` | 1 | missing/invalid field path category만 표시 |
| redaction guard failure | `redaction_guard_failed` | 1 | offending value는 출력 금지 |

## No-persistence guardrail

후속 구현은 다음을 만족해야 한다.

- raw endpoint response를 disk에 쓰지 않는다.
- token, cookie, account identifier, email category, username, display name, image URL을 stdout/stderr에 쓰지 않는다.
- debug flag를 만들더라도 raw response 출력은 허용하지 않는다.
- fixture는 synthetic shape만 사용한다.
- request/response logging helper는 기본 disabled가 아니라 존재하지 않는 편이 낫다.
- process memory 내 raw response는 parsing/redaction 이후 즉시 safe summary로 축소한다.
- CI는 network/keychain/auth file 없이 실행 가능해야 한다.

## Mock fixture/test 전략

Stage 2 기준 테스트는 live network나 실제 credential 없이 fake transport와 synthetic response만 사용한다.

권장 파일 후보:

| 파일 후보 | 목적 |
|---|---|
| `src/remote-profile/probe.js` | fake transport를 주입받아 probe summary를 만드는 pure-ish module |
| `src/remote-profile/redaction.js` | safe value, forbidden key/value pattern 검사 |
| `src/remote-profile/mapper.js` | synthetic profile response를 comparable field summary로 변환 |
| `src/__tests__/remote-profile-probe.test.js` | success/failure/schema drift/redaction tests |
| `src/__tests__/fixtures/remote-profile/README.md` | synthetic fixture 원칙 명시 |

필수 test scenario:

- success: synthetic `/wham/profiles/me` response를 numeric/enum summary로 변환한다.
- success: synthetic `/wham/usage` response의 latency/status category만 남긴다.
- auth failure: credential value를 출력하지 않는다.
- forbidden/not found/rate limit: status category만 반환한다.
- network timeout: raw URL query나 header를 출력하지 않는다.
- schema drift: missing field path category를 기록하고 raw body를 출력하지 않는다.
- redaction guard: token-like value, local path, email-like value, account identifier-like value가 output에 남으면 실패한다.
- default CLI regression: `analyze --json`이 remote module을 import/call하지 않는다.
- fixture policy: sample fixture와 실제 profile raw response를 혼동하지 않는다.

## Local analyzer 비교 프로토콜

Stage 3에서 parity/latency 검증 프로토콜을 확정할 때 다음 비교 형식을 사용한다.

| 항목 | 기준 |
|---|---|
| 비교 대상 | local `UsageSnapshot v2` safe fields와 remote probe comparable fields |
| 비교 제외 | display name, username, email category, image URL, account identifier |
| numeric tolerance | absolute 또는 relative percent tolerance를 field별로 둔다. |
| source-sensitive reason | `remote_profile_source_differs`, `profile_parity_not_guaranteed`, `source_mismatch` 중 하나로 기록한다. |
| not comparable | remote definition이 불확실하거나 local source coverage와 정의가 다른 field |
| output | aggregate summary와 field-level status only |

기존 `profile-baseline` helper는 source-aware mismatch와 sensitive-looking value rejection 선례로 재사용 가능하다. 다만 remote probe 자체는 manual profile baseline이 아니라 endpoint-derived summary이므로 별도 module/test로 분리하는 편이 낫다.

## Npm package trust impact

| 항목 | 영향 | 대응 |
|---|---|---|
| 기본 설치 후 실행 | remote call이 있으면 npm package 신뢰 부담이 커진다. | default `analyze`는 local-only 유지. |
| credential access | keychain/auth file 직접 접근은 피할 수 있지만 bearer token이 npm package process memory를 통과한다. | auth adapter 격리, token logging 금지, explicit consent 필수. |
| network access | package가 내부 endpoint를 호출하면 공급망 리스크 인식이 커진다. | command 또는 SDK option에서 network 사용을 명시하고 default local path와 분리. |
| internal endpoint drift | 장애와 schema 변경이 사용자에게 노출된다. | failure status를 first-class로 만들고 stable output contract로 포장하지 않는다. |
| provenance/trusted publishing | 원격 credential 기능과 직접 관계는 없지만 신뢰 문맥에 중요하다. | release trust 개선 이슈와 별도 유지. |

## Live probe 결론

승인된 minimal live probe로 다음을 확인했다.

- standalone process에서 Codex app-server login context를 사용한 direct call이 현재 build에서 가능하다.
- Desktop session cookie나 device/integrity state를 직접 복제하지 않아도 이번 profile GET은 성공했다.
- remote aggregate는 Codex profile 화면과 완전한 parity를 보였고 local analyzer보다 현저히 빨랐다.
- app-server auth method와 remote endpoint 모두 public/stable contract가 아니므로 장기 호환성은 보장되지 않는다.
- bearer token이 package process memory를 통과하므로 default analyzer에 숨겨 넣을 수 있는 단순 source 개선이 아니다.

따라서 Stage 3의 feasibility 후보는 `adopt_experimental` 쪽 근거가 확보됐다. 여기서 `experimental`은 반드시 별도 command를 뜻하지 않으며, explicit-consent SDK/source path도 포함한다. default analyzer 채택은 계속 `reject_for_default_analyzer`로 분리한다.

## 본문 변경 정도 / 본문 무손실 여부

문서-only 변경이다. 기존 Stage 1/1.1의 internal/non-public 분류는 유지했고, "host bridge 의존으로 direct call 재현이 미확정"이던 부분만 승인된 live evidence로 보정했다. 코드, README, package metadata, schema는 변경하지 않았다.

## 검증 결과

아래 명령을 Stage 2 보고서 작성 후 실행했다.

```bash
rg -n "opt-in|experimental|no persistence|mock|failure|schema drift|timeout|rate limit" mydocs/working/task_m010_30_stage2.md
rg -n "direct call|getAuthStatus|parity|latency|local analyzer|public schema" mydocs/working/task_m010_30_stage2.md
git diff --name-only | rg -n "^(src/|README.md|package.json|bin/)" || true
rg -n -f /private/tmp/cua-task30-sensitive-patterns.txt mydocs/plans/task_m010_30*.md mydocs/working/task_m010_30_stage*.md
git diff --check
```

결과:

| 검증 | 결과 |
|---|---|
| live direct-call scenario | 통과. bounded timeout과 no-retry 조건에서 profile endpoint가 `2xx`를 반환했고 raw response를 저장하지 않았다. |
| attached profile parity scenario | 통과. 화면의 profile/activity/top-invocation 표시 전 항목이 remote aggregate와 일치했다. |
| local comparison scenario | 통과. safe summary만 사용해 latency와 coverage 차이 방향을 확인했다. |
| app-server schema inspection | 통과. generated public/experimental schema에 `getAuthStatus`가 없음을 확인했다. |
| Stage 2 keyword scan | 통과. opt-in, experimental, mock, failure, schema drift, timeout, rate limit 설계 항목을 확인했다. |
| direct-call evidence scan | 통과. direct call, internal auth method, parity, latency, local comparison, public schema 경계를 확인했다. |
| runtime/user-facing 변경 없음 확인 | 통과. `src/`, `README.md`, `package.json`, `bin/` 변경 없음. |
| 민감정보 pattern scan | 통과. token-like value, account identifier, private local path match 없음. |
| `git diff --check` | 통과. whitespace error 없음. |

## 잔여 위험

- Codex app-server `getAuthStatus`는 generated public schema에 없으므로 version update에서 제거되거나 변경될 수 있다.
- internal auth token이 npm package process memory를 통과하므로 악성 dependency나 debug logging에 대한 보안 영향이 커진다.
- internal/non-public endpoint는 app build와 함께 drift될 수 있다.
- 이번 GET은 별도 device/integrity state 없이 성공했지만 서버 정책이 바뀌면 같은 방식이 차단될 수 있다.
- remote source가 추가되면 npm package trust 부담이 커지므로 후속 구현 이슈에서 별도 threat model과 보안 리뷰가 필요하다.

## 다음 단계 영향

- Stage 3는 live parity/latency evidence를 반영해 explicit-consent remote source는 `adopt_experimental`, default analyzer는 `reject_for_default_analyzer`로 분리 판단한다.
- 별도 command와 SDK/source option 중 어떤 surface를 후속 구현 후보로 선택할지 결정한다.
- 후속 구현 이슈를 만든다면 먼저 transport injection, synthetic mock, redaction guard, hidden auth method drift 처리부터 구현해야 한다.

## 승인 요청

Stage 2 산출물과 검증 결과를 승인하면 Stage 3 `parity/latency 검증 프로토콜과 최종 feasibility 판단`으로 진행한다.

# Task M040 #46 구현계획서

수행계획서: [`task_m040_46.md`](task_m040_46.md)
GitHub Issue: [#46](https://github.com/postmelee/codex-usage-analyzer/issues/46)
마일스톤: M040

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | Full Profile Envelope와 synthetic normalizer 확정 | `src/experimental-profile.js`, schema, focused test, Stage 1 보고서 | complete/partial/unavailable fixture, stable usage deep-equality, schema/runtime key alignment |
| 2 | 격리된 app-server auth와 private profile transport 구현 | `src/experimental-profile-client.js`, transport test, Stage 2 보고서 | fake child/fetch, fixed target, timeout/size/redirect, cleanup, secret redaction |
| 3 | Profile CLI와 terminal renderer 구현 | `src/cli.js`, `src/format-experimental-profile.js`, CLI/renderer test, Stage 3 보고서 | command matrix, stdout/stderr, exit/status, heatmap, stable usage regression |
| 4 | 공식 문서, package artifact, 통합 보안 검증 | README, `docs/`, package allowlist, Stage 4 보고서 | full test, schema, pack dry-run, preflight, sensitive scan, 승인된 live structural smoke |

## 문서 위치 확인

수행계획서의 문서 위치 판단을 그대로 적용한다. stable Account Usage 문서와 experimental Full Profile 문서를 같은 `docs/` root에서 서로 다른 계약으로 유지하고, 내부 승인·검증 이력은 `mydocs/`에만 둔다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| 사용자 명령과 위험 고지 | 저장소 root `README.md` | Stage 4 `README.md` | OK | 기본 소개 문단은 유지하고 Experimental profile 절을 별도 추가한다. |
| Full Profile 설명 | `docs/experimental-full-profile.md` | Stage 4 동일 경로 | OK | 실제 CLI machine contract와 보안 경계의 진실 원천이다. |
| Full Profile Schema | `docs/experimental-full-profile.schema.json` | Stage 1 동일 경로 | OK | runtime normalizer와 함께 먼저 고정한다. |
| Stable usage cross-link | `docs/account-usage-contract.md` | Stage 4 동일 경로 | OK | v1 shape 무변경과 실험 계약 분리를 짧게 명시한다. |
| Downstream 실험 경계 | `docs/downstream-integration.md` | Stage 4 동일 경로 | OK | GitHub identity/account binding 원칙을 유지하며 envelope 소비 조건만 보정한다. |
| 단계/최종 보고 | `mydocs/working`, `mydocs/report` | `task_m040_46_stage{N}.md`, `task_m040_46_report.md` | OK | 실제 값·token·identifier 없이 검증 결과만 기록한다. |

## 공통 계약과 안전 불변조건

### CLI surface

```text
codex-usage-analyzer [usage] [--json]
codex-usage-analyzer profile [--json]
codex-usage-analyzer [usage|profile] --help
codex-usage-analyzer --version
```

- 인자 없음, `usage`, `--json`, `usage --json`은 현재 공식 usage 경로와 출력을 유지한다.
- `profile` token이 명시된 경우에만 실험 모듈을 호출한다.
- `--full`, `--profile`, 환경변수, 설정 파일, 자동 fallback은 추가하지 않는다.
- `profile`과 `profile --json`은 항상 unsupported endpoint와 identity 출력 위험을 stderr 한 줄로 고지한다.

### Full Profile Envelope v1

Stage 1에서 다음 root shape를 machine-readable schema와 runtime test로 고정한다.

```json
{
  "fullProfileContractVersion": 1,
  "kind": "codex-usage-analyzer.fullProfile",
  "stability": "experimental",
  "status": "ok",
  "usage": {
    "contractVersion": 1,
    "capturedAt": "2026-01-01T00:00:00.000Z",
    "summary": {
      "lifetimeTokens": 1000,
      "peakDailyTokens": 200,
      "longestRunningTurnSec": 300,
      "currentStreakDays": 4,
      "longestStreakDays": 5
    },
    "dailyUsageBuckets": []
  },
  "profile": {
    "displayName": "Example Name",
    "username": "example",
    "avatarUrl": "https://example.invalid/avatar.png",
    "planType": "example-plan"
  },
  "activityInsights": {
    "fastModePercent": 25,
    "reasoningEffort": "example-effort",
    "reasoningEffortPercent": 50,
    "skillsExplored": 6,
    "totalSkillsUsed": 7,
    "totalThreads": 8,
    "topInvocations": [
      {
        "type": "skill",
        "name": "example-skill",
        "usageCount": 9
      }
    ]
  }
}
```

모든 값은 synthetic example이다. 실제 계정 값이나 실제 avatar origin을 fixture와 문서에 사용하지 않는다.

### 상태와 종료 코드

| 조건 | `status` | profile/activity | 종료 코드 |
|---|---|---|---:|
| remote profile root와 stats/activity category가 구조적으로 유효 | `ok` | allowlist object | 0 |
| remote root는 유효하지만 stats error 또는 일부 category/field가 unavailable | `partial` | 항상 같은 field set, unavailable은 `null`; 빈 invocation source는 `[]` | 0 |
| internal auth, account context, HTTP, body limit, root validation 실패 | `unavailable` | 둘 다 `null` | 1 |
| official `account/usage/read` 자체 실패 | envelope 미출력 | 해당 없음 | 기존 safe usage error와 1 |

- Full Profile root에는 중복 `capturedAt`을 추가하지 않는다. canonical observation time은 nested `usage.capturedAt`이다.
- `profile` object가 존재하면 네 field를 항상 포함하고 각 값은 bounded string 또는 `null`이다.
- `activityInsights` object가 존재하면 일곱 field를 항상 포함한다. integer/percentage는 non-negative safe integer 또는 `null`이고 percentage는 0~100으로 제한한다.
- `topInvocations`는 source category가 없으면 `null`, source category가 존재하지만 row가 없으면 `[]`다. row는 `type`, `name`, `usageCount`만 포함한다.
- item `type`은 `plugin` 또는 `skill`만 허용하고 내부 plugin/skill id, unknown type, extra field는 폐기한다.

### 데이터 경계

- `usage`는 official app-server response를 기존 `normalizeAccountUsageResult()`로 변환한 object를 그대로 사용한다.
- private response의 usage summary와 daily bucket을 canonical output으로 복사하지 않는다.
- identity는 `displayName`, `username`, `avatarUrl`, `planType`만 허용한다. Human output은 avatar URL 대신 `available`/`unavailable`만 표시한다.
- `avatarUrl`은 HTTPS absolute URL과 보수적 길이 제한을 통과한 경우만 JSON에 포함하며 CLI가 fetch하지 않는다.
- account id는 request header 작성 직전까지 memory에만 보관하고 output normalizer 입력에 넘기지 않는다.
- email, user id, account id, token, raw JWT claim, upstream error/body/headers는 output/error/document/test assertion 대상에서 제외한다.

## Stage 1 — Full Profile Envelope와 synthetic normalizer 확정

### 산출물

신규:

- `src/experimental-profile.js`
- `src/__tests__/experimental-profile.test.js`
- `docs/experimental-full-profile.schema.json`
- `mydocs/working/task_m040_46_stage1.md`

수정:

- 없음

### 변경 내용

- `FULL_PROFILE_CONTRACT_VERSION`, fixed kind/stability와 allowlisted field constants를 experimental module 내부에 정의한다.
- 기존 `normalizeAccountUsageResult()` 결과와 remote response/account metadata를 입력받아 새 object를 재구성하는 normalizer를 만든다.
- remote complete response, stats error, missing category, empty invocation, malformed root를 구분한다.
- raw response field는 Desktop에서 검증된 `profile`, `metadata.stats_error`와 flat `stats` category만 읽는다. Summary는 `stats.lifetime_tokens` 등 flat metric, daily source는 `stats.daily_usage_buckets`, activity source는 `stats.fast_mode_usage_percentage`, `stats.top_invocations` 등 flat field다. Private stats metric/daily bucket은 상태 판단 외 output usage에 복사하지 않는다.
- invocation row는 plugin/skill name과 count만 채택하고 namespace/prefix presentation은 renderer로 미룬다.
- profile root를 얻지 못한 경우 canonical usage를 보존한 unavailable envelope factory를 제공한다.
- schema는 모든 root/nested object에서 `additionalProperties: false`를 사용하고 Account Usage Contract v1 shape를 nested schema로 고정한다.
- normalizer와 schema test의 모든 fixture는 clearly synthetic 값과 `example.invalid`만 사용한다.

### 검증

```bash
node --test src/__tests__/account-usage.test.js src/__tests__/experimental-profile.test.js
node -e 'const fs=require("node:fs");const s=JSON.parse(fs.readFileSync("docs/experimental-full-profile.schema.json","utf8"));const required=["fullProfileContractVersion","kind","stability","status","usage","profile","activityInsights"];if(required.some((key)=>!s.required.includes(key))||s.additionalProperties!==false)process.exit(1)'
git diff --exit-code HEAD -- src/index.js src/index.d.ts docs/account-usage.schema.json
git diff --check
```

추가 assertion:

- complete/partial/unavailable envelope key set과 status matrix
- nested `usage` deep-equality와 private stats 불채택
- null과 empty invocation semantics
- unknown field/id/email/account category가 output JSON에 없음
- unsafe integer, out-of-range percentage, invalid avatar URL/length의 null normalization

### 커밋

```text
Task #46 Stage 1: Full Profile 계약과 normalizer 구현
```

## Stage 2 — 격리된 app-server auth와 private profile transport 구현

### 산출물

신규:

- `src/experimental-profile-client.js`
- `src/__tests__/experimental-profile-client.test.js`
- `mydocs/working/task_m040_46_stage2.md`

수정:

- `src/experimental-profile.js`
- `src/__tests__/experimental-profile.test.js`
- 필요할 경우 `src/errors.js` 대신 experimental module 내부 safe error taxonomy

명시적 무변경:

- `src/app-server-client.js`
- `src/__tests__/app-server-client.test.js`
- `src/index.js`
- `src/index.d.ts`

수행계획서에서 검토 대상으로 둔 stable app-server client 수정은 하지 않는다. Profile 전용 child/session을 별도 module로 두어 default usage transport의 protocol과 오류 의미를 보존한다.

### 변경 내용

- `resolveCodexExecutable()` 결과로 shell 없이 `codex app-server` child를 시작한다.
- 한 child session에서 initialize/initialized 이후 official `account/usage/read`, official account metadata request, internal auth request를 bounded request id와 phase로 처리한다.
- Stage 2 시작 시 현재 설치된 app-server generated protocol/source에서 exact method name, params, response category를 다시 확인한다. 확인 결과가 #30과 달라 credential을 안전하게 얻을 수 없으면 구현을 추측하지 않고 Stage를 중단해 계획 변경 승인을 요청한다.
- account metadata에서는 plan type만 allowlist하고 email/id를 반환 object에 넣지 않는다.
- internal auth response에서는 bearer token만 closure-local로 유지한다. ChatGPT account header에 필요한 claim 하나만 bounded base64url JSON decode로 읽고 나머지 claim object를 output 계층에 넘기지 않는다.
- fixed request target은 current ChatGPT HTTPS backend origin과 `GET /wham/profiles/me` 상수로 제한한다. caller가 URL, method, auth/header 값을 주입하는 public option은 만들지 않는다.
- header는 bearer auth, account context, honest package originator/User-Agent의 고정 category만 사용한다. Desktop client를 사칭하는 값이 없으면 endpoint가 실패하더라도 별도 승인 없이 spoofing fallback을 추가하지 않는다.
- Node.js built-in HTTPS/fetch adapter에 timeout, 1 MiB 이하 response limit, `redirect: "manual"`, JSON content-type/parse 검증을 적용하고 retry하지 않는다.
- 2xx만 성공으로 처리한다. redirect, 401/403/404, 429, 5xx, malformed/oversized body는 raw detail 없이 coarse internal reason으로 unavailable envelope에 전달한다.
- child stderr는 drain 후 폐기하고 RPC/HTTP/body/token/account detail을 오류 message에 포함하지 않는다.
- 성공·실패·timeout 모든 경로에서 readline, stdin, child, timer, response body reader를 정리한다.
- JavaScript token memory zeroization을 보장한다고 표현하지 않고 참조 수명과 child/process scope를 최소화한다.

### 검증

```bash
node --test src/__tests__/experimental-profile-client.test.js src/__tests__/experimental-profile.test.js src/__tests__/app-server-client.test.js src/__tests__/codex-executable.test.js
git diff --exit-code HEAD -- src/app-server-client.js src/__tests__/app-server-client.test.js src/index.js src/index.d.ts docs/account-usage.schema.json
rg -n 'redirect: "manual"|account/usage/read|wham/profiles/me|1_048_576|app-server' src/experimental-profile-client.js
if rg -n 'console\.(log|error)|writeFile|appendFile|createWriteStream|keychain|Cookies|auth\.json|process\.env.*TOKEN' src/experimental-profile*.js; then exit 1; fi
git diff --check
```

Fake transport 시나리오:

- stable initialize와 세 request category 성공, one-child cleanup
- missing executable, spawn failure, early exit, timeout, malformed JSON-RPC, RPC error
- missing/malformed token, malformed claim, missing account context
- fixed URL/method/headers category와 caller override 부재
- 2xx JSON success, redirect, auth denial, rate limit, server error, malformed JSON, wrong content type, oversized/chunked body, request timeout
- synthetic secret marker가 thrown error, envelope, stdout/stderr용 safe detail에 포함되지 않음
- retry call count가 항상 1

### 커밋

```text
Task #46 Stage 2: 격리된 profile transport 구현
```

## Stage 3 — Profile CLI와 terminal renderer 구현

### 산출물

신규:

- `src/format-experimental-profile.js`
- `src/__tests__/format-experimental-profile.test.js`
- `mydocs/working/task_m040_46_stage3.md`

수정:

- `src/cli.js`
- `src/__tests__/cli.test.js`
- `src/experimental-profile.js`
- `src/__tests__/experimental-profile.test.js`

명시적 무변경:

- `src/index.js`
- `src/index.d.ts`
- `src/account-usage.js`
- `src/format-account-usage.js`
- `docs/account-usage.schema.json`

### 변경 내용

- argument parser가 default/usage와 profile command를 독립 action으로 반환하도록 확장한다.
- help에 `profile [--json]`과 experimental 표시를 추가하고 `profile --help`, `profile -h`는 app-server/network 없이 동작하게 한다.
- profile action은 explicit warning을 stderr에 먼저 한 줄 출력한 뒤 experimental orchestrator를 호출한다.
- `profile --json`은 envelope 한 개만 stdout에 pretty JSON으로 출력한다. Diagnostic/error 원문은 JSON에 넣지 않는다.
- `ok`와 `partial`은 exit 0, `unavailable`은 envelope를 stdout에 출력한 뒤 exit 1, official usage 실패는 기존 safe error만 stderr에 출력하고 envelope는 출력하지 않는 matrix를 고정한다.
- 사람이 읽는 출력은 `Codex profile (experimental)`, Profile, Usage, Token activity, Activity insights, Top invocations 순서로 구성한다.
- 기존 `formatAccountUsage()`를 Usage section에 재사용하되 중복 title/captured-at layout은 renderer test에서 안정적으로 고정한다.
- avatar는 human output에서 URL을 출력하지 않고 availability만 표시한다. JSON에서만 validated URL을 제공한다.
- top invocation은 plugin `@`, skill `$` prefix를 presentation에서만 붙이고 source 순서를 유지한다.
- heatmap은 canonical `usage.dailyUsageBuckets`만 사용한다. UTC date-only, Sunday week start, current date가 포함된 week까지 최대 52주, relative intensity `0..4`, ASCII fixed-width symbols와 legend를 사용한다.
- daily bucket이 `null`이면 unavailable, `[]`이면 empty 상태를 구분한다. terminal width나 ANSI color에 의존하지 않는다.
- default action에서는 experimental dependency가 호출되지 않는 injection test를 추가한다.

### 검증

```bash
node --test src/__tests__/cli.test.js src/__tests__/format-experimental-profile.test.js src/__tests__/format-account-usage.test.js src/__tests__/experimental-profile.test.js
npm test
node bin/codex-usage-analyzer.js --help
node bin/codex-usage-analyzer.js --version
git diff --exit-code HEAD -- src/index.js src/index.d.ts src/account-usage.js src/format-account-usage.js docs/account-usage.schema.json
git diff --check
```

CLI/renderer assertion:

- no-arg, `usage`, `--json`, `usage --json`, help/version 회귀
- `profile`, `profile --json`, `profile --help`, invalid duplicate/conflicting flags
- warning은 profile에서만 stderr에 정확히 한 번 출력
- JSON stdout parse와 raw warning/detail 부재
- status/exit matrix와 official usage failure matrix
- human identity/usage/activity/invocation order, avatar URL suppression
- Sunday boundary, 52-week clipping, zero/max intensity, duplicate date policy, null/empty buckets

### 커밋

```text
Task #46 Stage 3: Profile CLI와 terminal renderer 구현
```

## Stage 4 — 공식 문서, package artifact, 통합 보안 검증

### 산출물

신규:

- `docs/experimental-full-profile.md`
- `mydocs/working/task_m040_46_stage4.md`

수정:

- `README.md`
- `docs/account-usage-contract.md`
- `docs/downstream-integration.md`
- `package.json`
- 필요 시 release preflight의 package required-path assertion test/source

명시적 무변경:

- `src/index.js`
- `src/index.d.ts`
- `docs/account-usage.schema.json`

### 변경 내용

- README 상단의 기존 identity-free 소개 문단은 수정하지 않는다.
- Quick Start/Usage 다음에 Experimental profile 절을 추가해 `profile`, `profile --json`, unsupported API, process-memory token, identity output, no-fallback을 설명한다.
- 공식 `account/usage/read` 링크와 stable/default path를 experimental 설명에서도 명확히 대비한다.
- `docs/experimental-full-profile.md`에 CLI surface, schema field, status/exit matrix, null/empty semantics, security/privacy/drift, downstream 처리 지침을 기록한다.
- Account Usage Contract에는 stable v1이 Full Profile로 확장되지 않았다는 cross-link만 추가하고 기존 schema/shape/semantics는 변경하지 않는다.
- Downstream guide의 기존 experimental identity 절을 새 envelope와 맞춘다. GitHub identity가 account binding 기본값이고 remote identity는 cosmetic/untrusted input이라는 원칙을 유지한다.
- private endpoint stats는 canonical usage로 저장하지 않고 nested official usage만 신뢰하도록 명시한다. Activity insights 저장은 downstream의 별도 opt-in/privacy policy가 있을 때만 허용한다.
- remote avatar는 downstream에서 HTTPS host policy, size/content decode, safe re-encode 후 re-host하도록 유지한다.
- package `files`에 experimental runtime modules와 공식 schema/doc이 포함되도록 갱신하고 tests/`mydocs`/extracted bundle은 제외한다.
- dependency를 추가하지 않고 zero-runtime-dependency 상태를 유지한다.
- 실제 계정 smoke는 작업지시자 별도 승인 후 실행한다. 출력/기록은 method success, field presence/type, status category, profile 화면 parity boolean, latency 범주만 허용하고 actual value, raw response, identity, URL, token, account id는 남기지 않는다.

### 검증

```bash
npm test
npm pack --dry-run --json
npm run release:preflight
node bin/codex-usage-analyzer.js --help
rg -n 'profile|profile --json|experimental|unsupported|identity|process memory|account/usage/read' README.md docs/experimental-full-profile.md docs/account-usage-contract.md docs/downstream-integration.md
if rg -n 'UsageSnapshot v2|--full|--profile|allow-network' README.md docs/experimental-full-profile.md src/experimental-profile*.js src/cli.js; then exit 1; fi
if rg -n 'keychain|auth\.json|Cookies|writeFile|appendFile|createWriteStream|console\.(log|error)' src/experimental-profile*.js; then exit 1; fi
git diff --exit-code HEAD -- src/index.js src/index.d.ts docs/account-usage.schema.json
git diff --check
git status --short
```

Package dry-run assertion:

- required: experimental runtime modules, README, Full Profile doc/schema, Account Usage doc/schema, Downstream guide
- forbidden: `mydocs/`, `.github/`, `scripts/`, `src/__tests__/`, local/extracted analysis assets, auth/response fixture
- dependencies: runtime dependency 0개 유지

Live smoke gate:

1. Stage 4 자동·package·보안 검증을 먼저 완료한다.
2. 작업지시자에게 actual account network smoke 승인을 별도로 요청한다.
3. 승인 전에는 `profile` live command를 실행하지 않는다.
4. 승인 후 safe probe 또는 CLI를 1회 호출하고 raw stdout을 task 문서/Issue/PR에 복사하지 않는다.
5. screen parity는 field별 boolean/count category만 기록하고 identity 및 usage actual value는 기록하지 않는다.

### 커밋

```text
Task #46 Stage 4: 실험 기능 문서와 package 보안 검증 완료
```

## 검증

- 각 Stage focused test와 `git diff --check`를 단계 보고서 작성 전에 실행한다.
- Stage 1 이후부터 runtime output과 JSON Schema key/null semantics를 함께 검증한다.
- Stage 2에서 current protocol evidence가 승인된 설계와 다르면 method/header를 추측하거나 Desktop spoofing을 추가하지 않고 중단한다.
- Stage 3의 full test가 default Account Usage path 회귀를 발견하면 profile 기능보다 stable path 복구를 우선한다.
- Stage 4 live smoke는 별도 승인이 없으면 실행하지 않고 검증 한계로 기록한다.
- 실패한 검증은 단계 완료로 처리하지 않는다.
- source/document 위치나 contract/status가 바뀌면 구현 전에 계획서를 갱신하고 작업지시자 승인을 받는다.
- 모든 fixture와 문서 example은 synthetic marker 및 reserved/example origin만 사용한다.
- raw token/response/identity/account id/local path를 terminal capture, task report, Issue, PR에 기록하지 않는다.

## 커밋

- 각 Stage source/test/doc과 `mydocs/working/task_m040_46_stage{N}.md`를 같은 단계 커밋으로 묶는다.
- 커밋 메시지는 구현계획서에 고정한 `Task #46 Stage {N}: ...` 형식을 사용한다.
- 단계 보고서는 actual sensitive value가 아닌 test count, status category, structural assertion만 기록한다.
- 구현계획서 보정이 필요하면 해당 Stage source보다 먼저 승인받고 별도 `Task #46: 구현계획서 보정` 커밋으로 남긴다.
- 최종 보고서와 오늘할일 완료 갱신은 Stage 4 승인 후 `task-final-report` 절차에서 커밋한다.

## 단계 의존성

- Stage 1은 이 구현계획서 승인 후 진행한다.
- Stage 2는 Stage 1 contract/schema/normalizer 검증, 보고서, 커밋 승인 후 진행한다.
- Stage 3은 Stage 2 transport/redaction 검증, 보고서, 커밋 승인 후 진행한다.
- Stage 4는 Stage 3 CLI/renderer/full regression 검증, 보고서, 커밋 승인 후 진행한다.
- Stage 4 actual account smoke는 automatic/package/security 검증 완료와 별도 작업지시자 승인에 의존한다.
- Final report와 PR은 Stage 4 보고서 승인 후 진행한다.
- npm version bump/publish/GitHub Release는 #46 merge 이후 별도 release task와 승인 절차에 의존한다.

## 위험과 대응

- **Internal RPC drift**: current app-server evidence와 다르면 추측 구현을 금지하고 safe unavailable 또는 계획 변경으로 전환한다.
- **Credential exfiltration**: fixed HTTPS target, no caller URL/header, manual redirect, no retry, bounded response로 token 사용 범위를 제한한다.
- **Desktop impersonation**: honest package originator/User-Agent를 우선하고 실패 시 별도 승인 없이 Desktop identity를 흉내 내지 않는다.
- **Stable path regression**: dedicated experimental child/session module과 explicit command injection으로 default usage module을 그대로 유지한다.
- **Contract leakage**: allowlist reconstruction과 `additionalProperties: false` schema로 unknown raw field가 JSON에 들어오지 못하게 한다.
- **Partial-state ambiguity**: status/null/empty/exit matrix를 Stage 1 schema와 Stage 3 CLI test에서 중복 강제한다.
- **Sensitive test artifact**: fake token/account/identity는 synthetic marker만 사용하고 package scan에서 tests와 task docs가 제외됨을 확인한다.
- **Human terminal exposure**: explicit warning을 항상 먼저 표시하고 avatar URL은 human output에서 숨긴다.
- **Unofficial API breakage after release**: failure를 stable usage에 전파하지 않고 README와 contract에 unsupported/no-guarantee를 명시한다.
- **Live verification leakage**: 별도 approval gate와 structural-only 기록 정책으로 actual profile data의 task 산출물 유입을 차단한다.

## 승인 요청 사항

- 별도 Full Profile Envelope v1 root/field/status/null shape와 stable usage deep-equality 정책
- `ok`/`partial` exit 0, `unavailable` structured output 후 exit 1, official usage 실패 시 no-envelope 정책
- stable app-server client를 수정하지 않고 profile 전용 one-child session을 구현하는 source 배치 조정
- current protocol evidence를 Stage 2에서 재확인하고 drift 시 추측 없이 중단하는 gate
- fixed HTTPS target, no redirect/retry/caller URL, 1 MiB body limit, honest originator/User-Agent 정책
- Human avatar URL suppression과 ASCII 52주 token heatmap 출력
- 4개 Stage 산출물·검증·커밋 메시지와 Stage별 승인 경계
- README/experimental contract/schema/downstream 문서의 공식 위치와 stable SDK 무변경
- actual account live smoke를 Stage 4 별도 승인으로 유지하고 version bump/release를 후속 task로 분리하는 범위

승인되면 Stage 1의 Full Profile Envelope, synthetic normalizer, JSON Schema와 focused test를 구현한다.

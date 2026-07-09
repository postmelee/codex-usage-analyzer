# Task M010 #30 구현계획서

수행계획서: [`task_m010_30.md`](task_m010_30.md)
GitHub Issue: [#30](https://github.com/postmelee/codex-usage-analyzer/issues/30)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | remote source와 credential boundary 조사 | `mydocs/working/task_m010_30_stage1.md` | public/source scan, boundary matrix, 민감정보 pattern scan, `git diff --check` |
| 1.1 | codex-extracted API/profile bundle 분석 | `mydocs/working/task_m010_30_stage1_1.md` | extracted bundle endpoint/bridge scan, 민감정보 pattern scan, `git diff --check` |
| 2 | experimental source 설계, mock 전략, 승인된 direct-call probe | `mydocs/working/task_m010_30_stage2.md` | consent/no-persistence scan, direct-call parity/latency 확인, 기본 analyzer 변경 없음 확인, mock strategy 검토, `git diff --check` |
| 3 | parity/latency 검증 프로토콜과 최종 feasibility 판단 | `mydocs/working/task_m010_30_stage3.md`, `mydocs/report/task_m010_30_report.md`, `mydocs/orders/20260705.md` | feasibility decision scan, 민감정보 pattern scan, `npm test`, `git diff --check`, `git status --short` |

## 문서 위치 확인

수행계획서의 "문서 위치 판단"과 실제 Stage 산출물 경로는 일치한다. #30은 remote profile command feasibility 조사 작업이며, 사용자-facing README나 analyzer runtime code는 이번 task 기본 산출물로 수정하지 않는다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `mydocs/plans/task_m010_30_impl.md` | `mydocs/plans/` | 구현계획서 신규 | OK | 단계별 조사 방법, 승인 gate, 산출물, 검증 명령을 고정한다. |
| `mydocs/working/task_m010_30_stage1.md` | `mydocs/working/` | Stage 1 신규 | OK | endpoint 후보와 credential boundary를 정리한다. |
| `mydocs/working/task_m010_30_stage1_1.md` | `mydocs/working/` | Stage 1.1 신규 | OK | 사용자 제공 Codex Desktop 추출 번들의 API/profile/usage 호출 구조를 정리한다. |
| `mydocs/working/task_m010_30_stage2.md` | `mydocs/working/` | Stage 2 신규 | OK | experimental source 설계, mock 전략, 승인된 direct-call 검증을 정리한다. |
| `mydocs/working/task_m010_30_stage3.md` | `mydocs/working/` | Stage 3 신규 | OK | parity/latency 검증 프로토콜과 feasibility 결론을 기록한다. |
| `mydocs/report/task_m010_30_report.md` | `mydocs/report/` | Stage 3 신규 | OK | 최종 feasibility 결론, 수용 기준, 후속 구현 여부를 보존한다. |
| `README.md` | 해당 없음 | 변경 없음 | OK | command 채택 전 사용자-facing 문서는 작성하지 않는다. |
| `src/**` | 해당 없음 | 변경 없음 | OK | 이번 task는 feasibility decision이며 기본 analyzer runtime 변경을 하지 않는다. |

## 현재 기준

- #15 결론은 Desktop profile 값을 privacy-safe local cache에서 재사용하는 경로를 확인하지 못했다는 것이다.
- local analyzer는 기본적으로 local Codex session source만 읽는 안전한 analyzer로 유지한다.
- remote profile endpoint는 `remote_only_or_internal` 성격이며, 기본 analyzer source가 아니다.
- `tokscale`은 Codex local session parser와 별도 usage command를 분리한다. 후자는 credential을 사용해 ChatGPT backend usage/rate-limit API를 호출하므로 보안 경계가 다르다.
- #30에서는 이 분리 원칙을 유지하면서 explicit-consent experimental source의 가능성과 검증 조건을 판단한다. surface는 별도 command 또는 SDK/source option이 될 수 있다.
- 2026-07-10 승인된 live probe에서 Codex app-server의 internal auth status method와 `/wham/profiles/me`를 조합한 standalone direct call이 성공했다.
- direct call은 기술적으로 가능하지만 public app-server schema와 stable remote API 계약에 포함되지 않으므로 기본 analyzer 채택 여부와는 별도 판단한다.

## Feasibility 판단 기준

Stage 3 최종 보고서는 다음 중 하나로 결론을 낸다.

| 결론 | 의미 | 후속 |
|---|---|---|
| `adopt_experimental` | explicit-consent experimental remote source로 구현할 가치가 있고 guardrail이 충분히 정의됨 | 별도 구현 이슈 생성 또는 #30 후속 작업으로 분리 |
| `defer_pending_evidence` | 가능성은 있지만 endpoint/auth/profile parity 근거가 부족함 | local analyzer 우선, 추가 evidence 수집 이슈 제안 |
| `reject_for_default_analyzer` | 기본 analyzer에는 부적합하며 experimental source와 별도로 default path 채택을 거절함 | default local-only 방향 유지 |

결론은 profile parity 가능성만으로 결정하지 않는다. credential boundary, endpoint stability, opt-in UX, no-persistence guardrail, mockability, failure handling, latency 측정 가능성을 함께 본다.

## Live Probe 승인 gate

이번 구현계획서 승인은 실제 credential/keychain 접근이나 live remote profile 호출 승인이 아니다.

Live probe가 필요하다고 판단되면 Stage 2 또는 Stage 3 진입 전에 별도 승인 요청을 올린다. 승인 요청에는 다음을 포함한다.

- 호출할 endpoint 후보와 목적
- 사용할 credential source 후보와 접근 방식
- raw response를 저장하지 않는 방법
- stdout/stderr에 남길 redacted summary 형태
- 실패 시 중단 조건
- 로컬 파일, 토큰, account identifier, raw profile field를 저장소에 남기지 않는 검증 방법

승인이 없으면 #30은 public source 조사, local code inspection, mock strategy, 비교 프로토콜만으로 최종 판단한다.

### Live Probe 승인 기록

2026-07-10 작업지시자가 opt-in command 구현이 아닌 standalone direct call 실행과 첨부 Codex profile 화면 대비 검증을 명시 승인했다. 승인 범위는 다음과 같이 제한했다.

- `GET /wham/profiles/me` 단일 profile endpoint
- Codex app-server가 제공하는 로그인 토큰을 process memory에서만 사용
- auth file과 keychain 직접 접근 없음
- timeout 적용, retry 없음
- raw response, bearer token, account identifier, profile identity field 미저장·미출력
- 첨부 화면과의 비교는 aggregate field parity와 latency category만 저장소 문서에 기록

승인된 probe는 Stage 2 보고서 커밋 전에 수행했으며 runtime code나 npm package artifact에는 포함하지 않는다.

## Stage 1 — remote source와 credential boundary 조사

### 산출물

신규:

- `mydocs/working/task_m010_30_stage1.md`

수정:

- 없음

### 변경 내용

- #15 Stage 3와 최종 보고서에서 넘어온 remote/source 결론을 요약한다.
- `tokscale`의 Codex local parser와 remote usage command를 다시 분리해 기록한다.
- 현재 공개 source에서 `profiles/me`, `wham`, usage/rate-limit 관련 endpoint 흔적을 확인하되, raw credential이나 private local file은 읽지 않는다.
- endpoint 후보를 다음 기준으로 분류한다.
  - source visibility
  - auth requirement
  - public/stable API 여부
  - expected response sensitivity
  - local analyzer source로 사용할 수 있는지
  - experimental command 후보로만 둘 수 있는지
- credential source 후보는 값이 아니라 category만 기록한다.
- Stage 2 설계에 필요한 boundary matrix를 작성한다.

### 허용 조사

```bash
gh search code 'repo:openai/codex profiles/me' --json path,repository,sha,url
gh search code 'repo:openai/codex wham' --json path,repository,sha,url
gh search code 'repo:junhoyeo/tokscale backend-api/wham usage' --json path,repository,sha,url
rg -n "profileComparison|remote_profile_api_not_used|sourcePolicy|profile_parity_not_guaranteed" README.md src scripts mydocs/report/task_m010_15_report.md
```

네트워크가 필요한 `gh` 조회는 공개 repository source 확인에만 사용한다. private credential, local keychain, auth file, live profile endpoint는 조회하지 않는다.

### 금지 사항

- Codex auth file/keychain 접근
- live profile endpoint 호출
- raw response, token-like value, account identifier, private local path 기록
- endpoint response schema를 실제 user data로 캡처

### 검증

```bash
rg -n "credential|keychain|auth|raw response|remote_only|non-default|experimental" mydocs/working/task_m010_30_stage1.md
rg -n -f /private/tmp/cua-task30-sensitive-patterns.txt mydocs/plans/task_m010_30*.md mydocs/working/task_m010_30_stage1.md
git diff --check
```

### 커밋

```text
Task #30 Stage 1: remote source와 credential boundary 조사
```

## Stage 1.1 — codex-extracted API/profile bundle 분석

### 산출물

신규:

- `mydocs/working/task_m010_30_stage1_1.md`

수정:

- `mydocs/plans/task_m010_30_impl.md`

### 변경 내용

- 작업지시자가 제공한 `{codex-extracted}` 추출 폴더를 read-only로 분석한다.
- 실제 keychain, auth file, live remote endpoint, raw credential에는 접근하지 않는다.
- webview HTML entry, profile/usage 관련 asset chunk, host-side fetch bridge chunk를 확인한다.
- `/wham/profiles/me`와 `/wham/usage*` 계열 endpoint 후보, response mapping, query/cache 경계, 인증 header 주입 위치를 분류한다.
- Stage 2 설계에 필요한 "직접 CLI 재사용 가능 여부"와 "Desktop host bridge 의존성"을 정리한다.

### 검증

```bash
rg -n "codex-extracted|/wham/profiles/me|/wham/usage|fetch bridge|Authorization|no live endpoint|credential boundary" mydocs/working/task_m010_30_stage1_1.md
rg -n -f /private/tmp/cua-task30-sensitive-patterns.txt mydocs/plans/task_m010_30*.md mydocs/working/task_m010_30_stage*.md
git diff --check
```

### 커밋

```text
Task #30 [Stage 1.1]: codex-extracted api/profile 분석
```

## Stage 2 — experimental source 설계, mock 검증 전략, 승인된 direct-call probe

### 산출물

신규:

- `mydocs/working/task_m010_30_stage2.md`

수정:

- `mydocs/plans/task_m010_30_impl.md`

### 변경 내용

- opt-in experimental command 후보를 설계한다.
  - 예: `analyze-remote-profile`, `profile-remote-probe`, 또는 `analyze --experimental-remote-profile`
- 기본 `analyze` 경로와의 분리 원칙을 정리한다.
- Stage 1.1에서 확인한 `/wham/profiles/me`와 `/wham/usage*` 계열 endpoint 후보를 Desktop host auth bridge 의존성 있는 non-default source로 취급한다.
- command 후보별로 다음 항목을 비교한다.
  - discovery 가능성
  - 사용자 동의 명확성
  - credential access scope
  - no-persistence 보장
  - stdout/stderr redaction
  - CI/mock 테스트 가능성
  - npm package trust impact
- mock fixture/test 전략을 정리한다.
  - 실제 raw response 기반 fixture 금지
  - synthetic response shape만 사용
  - token/account/local path pattern rejection
  - auth failure, forbidden, schema drift, network timeout, rate limit scenario
- local analyzer와 remote profile-derived value 비교 프로토콜을 설계한다.
  - field mapping
  - tolerance
  - missing/not comparable reason
  - source mismatch reason
- live probe가 필요한지 여부와 별도 승인 요청 내용을 Stage 2 보고서에 명시한다.
- 별도 승인 후 Codex app-server auth context를 이용한 standalone direct call을 수행한다.
  - endpoint는 `/wham/profiles/me` 하나로 제한한다.
  - raw response, token, account identifier, profile identity field는 저장하거나 출력하지 않는다.
  - 첨부 화면의 aggregate display와 field-level parity만 확인한다.
  - 동일 시점 local analyzer를 safe summary로 실행해 end-to-end latency와 coverage 방향만 비교한다.
  - public app-server schema에 auth token method가 포함되는지 확인해 안정 계약 여부를 분리한다.

### 검증

```bash
rg -n "opt-in|experimental|no persistence|mock|failure|schema drift|timeout|rate limit" mydocs/working/task_m010_30_stage2.md
rg -n "direct call|getAuthStatus|parity|latency|local analyzer|public schema" mydocs/working/task_m010_30_stage2.md
git diff --name-only | rg -n "^(src/|README.md|package.json|bin/)" || true
rg -n -f /private/tmp/cua-task30-sensitive-patterns.txt mydocs/plans/task_m010_30*.md mydocs/working/task_m010_30_stage*.md
git diff --check
```

`git diff --name-only` 검증은 기본 analyzer/runtime/user-facing 문서 변경이 없음을 확인하기 위한 보조 검증이다. 변경이 있으면 Stage 2에서 즉시 중단하고 범위 승인을 다시 받는다.

### 커밋

```text
Task #30 Stage 2: direct profile probe와 mock 전략 정리
```

## Stage 3 — parity/latency 검증 프로토콜과 최종 feasibility 판단

### 산출물

신규:

- `mydocs/working/task_m010_30_stage3.md`
- `mydocs/report/task_m010_30_report.md`

수정:

- `mydocs/orders/20260705.md`

### 변경 내용

- Stage 1/2 결과를 바탕으로 profile parity와 latency 검증 프로토콜을 확정한다.
- live remote probe를 수행하지 않은 경우, 그 이유와 한계를 명시한다.
- live remote probe가 별도 승인되어 수행된 경우에도 raw response나 민감값을 기록하지 않고 redacted summary만 남긴다.
- 다음 항목을 기준으로 최종 결론을 낸다.
  - remote command 구현 가능성
  - profile UI parity 기대 수준
  - local analyzer 대비 latency 기대 수준
  - credential/keychain boundary 위험
  - endpoint stability와 schema drift 위험
  - failure handling과 mockability
  - npm package trust impact
- 결론은 `adopt_experimental`, `defer_pending_evidence`, `reject_for_default_analyzer` 중 하나로 기록한다.
- 최종 보고서에 수용 기준, 검증 결과, 잔여 리스크, 후속 이슈 후보를 정리한다.
- 오늘할일 상태를 완료로 갱신한다.

### 검증

```bash
npm test
rg -n "profile parity|latency|adopt_experimental|defer_pending_evidence|reject_for_default_analyzer|guardrail|no persistence" mydocs/working/task_m010_30_stage3.md mydocs/report/task_m010_30_report.md
rg -n "live probe|credential|keychain|raw response|mock|schema drift" mydocs/working/task_m010_30_stage*.md mydocs/report/task_m010_30_report.md
rg -n -f /private/tmp/cua-task30-sensitive-patterns.txt mydocs/plans/task_m010_30*.md mydocs/working/task_m010_30_stage*.md mydocs/report/task_m010_30_report.md
git diff --check
git status --short
```

privacy pattern scan은 token-like value, account identifier, raw profile response marker, private local path, email-like identifier를 담은 임시 pattern file을 사용한다. match가 있으면 placeholder 또는 generic category로 바꾼 뒤 다시 실행한다. 단계 보고서와 최종 보고서에는 pattern 본문을 붙이지 않는다.

### 커밋

```text
Task #30 Stage 3 + 최종 보고서: remote profile feasibility 판단 정리
```

## 검증 공통 규칙

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- 검증 실패 상태로 단계 보고서와 커밋을 만들지 않는다.
- 기본 `analyze` 경로와 `UsageSnapshot v2` schema는 변경하지 않는다.
- 사용자-facing README나 package metadata는 이번 task에서 수정하지 않는다.
- 실제 credential/keychain 접근과 live remote endpoint 호출은 별도 승인 없이는 수행하지 않는다.
- raw response, token-like value, account identifier, private local path, screenshot, raw analyzer JSON을 작업 문서나 PR 본문에 남기지 않는다.
- public source 조사 결과도 URL/path/shape 수준으로만 기록하고 긴 원문이나 raw dump를 붙이지 않는다.

## 커밋

- 구현계획서 커밋은 `Task #30: 구현계획서 작성` 형식으로 별도 생성한다.
- Stage 1 커밋은 Stage 1 보고서를 묶는다.
- Stage 2 커밋은 Stage 2 보고서를 묶는다.
- Stage 3 커밋은 Stage 3 보고서, 최종 보고서, 오늘할일 완료 갱신을 함께 묶는다.
- 커밋 메시지는 단계별로 위에 명시한 형식을 사용한다.

## 단계 의존성

- Stage 1은 이 구현계획서 승인 후 진행한다.
- Stage 2는 Stage 1과 Stage 1.1에서 endpoint/auth boundary가 정리되고 Stage 2 진입 승인을 받은 뒤 진행한다.
- Stage 3은 Stage 2의 experimental command/probe 설계와 live probe 필요 여부가 승인된 뒤 진행한다.
- 실제 credential/keychain 접근 또는 live remote profile 호출은 Stage 승인과 별도 승인 없이는 수행하지 않는다.

## 위험과 대응

- **credential boundary 오해**: experimental command가 기본 analyzer로 오해되지 않도록 command surface와 문서에서 `experimental`, `opt-in`, `non-default`를 반복한다.
- **비공식 endpoint drift**: endpoint가 없어지거나 schema가 바뀔 수 있다. stable contract로 전제하지 않고 failure mode를 수용한다.
- **민감정보 유출**: live probe 없이도 raw endpoint shape를 과하게 기록할 수 있다. summary-only 원칙과 pattern scan을 적용한다.
- **profile parity 과신**: remote source가 profile UI와 가까워도 계정/플랜/지역/시점에 따라 다를 수 있다. parity는 기대 수준과 검증 프로토콜로만 표현한다.
- **scope creep**: feasibility 결론이 구현으로 확장될 수 있다. command 구현은 후속 이슈로 분리한다.

## 승인 요청 사항

- Stage 1-3 분할, 산출물, 검증 명령, 커밋 메시지를 이 구현계획서대로 고정하는 것
- #30에서 기본 analyzer/runtime/schema/user-facing README를 변경하지 않는 것
- live remote probe와 credential/keychain 접근을 별도 승인 gate로 두는 것
- 최종 결론을 `adopt_experimental`, `defer_pending_evidence`, `reject_for_default_analyzer` 중 하나로 내리는 것

승인되면 Stage 1 `remote source와 credential boundary 조사`부터 진행한다.

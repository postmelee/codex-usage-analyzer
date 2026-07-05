# Task M010 #15 구현계획서

수행계획서: [`task_m010_15.md`](task_m010_15.md)
GitHub Issue: [#15](https://github.com/postmelee/codex-usage-analyzer/issues/15)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 기존 source contract와 prior findings 정리 | `mydocs/plans/task_m010_15_impl.md`, `mydocs/working/task_m010_15_stage1.md` | `npm test`, profile/source 관련 코드·문서 scan, `git diff --check` |
| 2 | Desktop/local source 후보 inventory와 privacy 분류 | `mydocs/working/task_m010_15_stage2.md` | read-only 후보 확인, sanitized path/schema summary, privacy pattern scan, `git diff --check` |
| 3 | parser feasibility 결정과 후속 task handoff | `mydocs/working/task_m010_15_stage3.md`, `mydocs/report/task_m010_15_report.md`, `mydocs/orders/20260705.md` | `npm test`, classification/handoff scan, privacy pattern scan, `git diff --check`, `git status --short` |

## 문서 위치 확인

수행계획서의 "문서 위치 판단"과 실제 Stage 산출물 경로는 일치한다. #15는 source inventory 조사 작업이며, 사용자-facing README나 analyzer code는 수정하지 않는다. 조사 결과는 내부 작업 산출물인 `mydocs/working/`과 `mydocs/report/`에만 기록한다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `mydocs/plans/task_m010_15_impl.md` | `mydocs/plans/` | Stage 1 신규 | OK | 단계별 조사 방법, 산출물, 검증 명령을 고정한다. |
| `mydocs/working/task_m010_15_stage1.md` | `mydocs/working/` | Stage 1 신규 | OK | 기존 analyzer/source contract와 prior findings를 정리한다. |
| `mydocs/working/task_m010_15_stage2.md` | `mydocs/working/` | Stage 2 신규 | OK | Desktop/local source 후보와 privacy classification을 기록한다. |
| `mydocs/working/task_m010_15_stage3.md` | `mydocs/working/` | Stage 3 신규 | OK | #16/#17/#18 handoff 판단을 기록한다. |
| `mydocs/report/task_m010_15_report.md` | `mydocs/report/` | Stage 3 신규 | OK | 최종 source inventory와 parser feasibility decision을 보존한다. |
| `README.md` | 해당 없음 | 변경 없음 | OK | #15에서는 공식 사용자 문서를 수정하지 않는다. |
| `src/**` | 해당 없음 | 변경 없음 | OK | #15에서는 parser 구현과 schema 변경을 수행하지 않는다. |

## 현재 기준

- production `analyze --json` 경로는 local Codex session JSONL을 읽고 sample fixture를 반환하지 않는다.
- analyzer는 token totals, daily token buckets, model ranking, skill/plugin ranking, task duration, streaks, reasoning effort, thread count를 allowlisted local session event field에서 계산한다.
- README는 Codex Desktop profile screen이 remote account-level source를 사용할 수 있으며 local analyzer와 profile parity가 보장되지 않는다고 설명한다.
- diagnostics extension은 `profileComparison.parity: "not_guaranteed"`와 `reason: "remote_profile_api_not_used"`를 포함한다.
- #6은 redacted profile baseline smoke helper를 추가했고, #14는 source-aware reason taxonomy와 optional `sourcePolicy`를 추가했다.
- #15에서는 이 source 차이를 parser 구현으로 바로 해결하지 않고, local source 후보와 privacy boundary를 먼저 분류한다.

## Source 분류 기준

Stage 2와 Stage 3 보고서는 source 후보를 다음 classification 중 하나로 기록한다.

| Classification | 의미 | #16 handoff 기준 |
|---|---|---|
| `usable_local_source` | local analyzer가 read-only로 안전하게 사용할 수 있고, profile parity 또는 coverage 개선에 도움이 되는 후보 | #16 parser source 후보로 전달 |
| `unavailable_or_absent` | 현재 local 환경 또는 공개 reference에서 확인되지 않았거나 일반화하기 어려운 후보 | 구현 제외, 필요하면 추가 확인 항목으로 기록 |
| `remote_only_or_internal` | Desktop profile remote/internal data에 의존하거나 local analyzer가 호출하면 안 되는 source | 구현 제외, diagnostics/reason으로만 관리 |
| `privacy_risk` | token, cookie, account identifier, raw conversation/user content, private path 등 leakage 위험이 큰 source | 구현 제외, 문서에는 shape 수준 요약만 허용 |

## Stage 1 — 기존 source contract와 prior findings 정리

### 산출물

신규:

- `mydocs/plans/task_m010_15_impl.md`
- `mydocs/working/task_m010_15_stage1.md`

수정:

- 없음

### 변경 내용

- README의 local analyzer source, Desktop profile parity, redaction rules를 요약한다.
- `src/analyze.js`, `src/parser/*`, `src/profile-baseline.js`, `scripts/profile-smoke.js`의 source/diagnostics contract를 정리한다.
- #6과 #14 최종 보고서에서 남긴 source mismatch 결론을 요약한다.
- Stage 2 inventory 대상과 금지 대상을 확정한다.
- Stage 1에서는 local Desktop/app data/cache를 아직 자세히 조사하지 않는다.

### 검증

```bash
npm test
rg -n "profileComparison|profile parity|source_mismatch|profile_parity_not_guaranteed|remote profile|local session" README.md src scripts mydocs/report/task_m010_6_report.md mydocs/report/task_m010_14_report.md
rg -n "session_jsonl|local_sources|remote_profile_api_not_used|profileParity|sourcePolicy" src README.md
git diff --check
```

### 커밋

```text
Task #15 Stage 1: source contract와 prior findings 정리
```

## Stage 2 — Desktop/local source 후보 inventory와 privacy 분류

### 산출물

신규:

- `mydocs/working/task_m010_15_stage2.md`

수정:

- 없음

### 변경 내용

- read-only로 local source 후보를 확인한다.
- 실제 경로는 `{home}`, `{codex-home}`, `{app-support}`, `{cache}`, `{preferences}` placeholder로 치환해 보고서에 기록한다.
- 실제 파일 내용은 raw dump하지 않고 다음 수준만 기록한다.
  - file kind
  - high-level schema/key category
  - profile field 후보와의 관련성
  - privacy classification
  - parser feasibility
- 공개 reference 또는 기존 `codex-extracted` 분석 결과가 확인되면 source 후보와 비교한다.
- profile UI 관련 field를 다음 묶음으로 나눠 candidate matrix를 작성한다.
  - token totals/token breakdown
  - daily activity/streak/date basis
  - top skills/plugins ranking
  - thread count/task duration/activity insights
  - pet/avatar/profile asset-like source

### Read-only 조사 후보

조사 명령은 shell output을 그대로 보고서에 붙이지 않는다. 결과를 검토한 뒤 safe summary만 수동으로 기록한다.

```bash
rg --files
rg -n "profileComparison|remote_profile_api_not_used|session_jsonl|sourcePolicy|topPlugins|topSkills" README.md src scripts mydocs
node -e "<sanitized local candidate lister>"
```

local filesystem 후보는 다음 placeholder 범위 안에서만 본다.

- `{codex-home}`: analyzer가 이미 사용하는 Codex home/session source 후보
- `{app-support}`: Desktop app support/cache 후보 이름과 file kind
- `{cache}`: Desktop cache 후보 이름과 file kind
- `{preferences}`: Desktop preference plist 후보 이름과 high-level key category

### 금지 사항

- token/cookie/session credential 값을 읽거나 기록하지 않는다.
- raw JSONL, raw profile value, raw conversation text, prompt/response/tool payload를 문서화하지 않는다.
- absolute local private path를 보고서에 기록하지 않는다.
- Desktop remote/internal API endpoint를 호출하지 않는다.
- screenshot OCR 또는 UI 자동화를 수행하지 않는다.

### 검증

```bash
rg -n "usable_local_source|remote_only_or_internal|privacy_risk|unavailable_or_absent" mydocs/working/task_m010_15_stage2.md
rg -n -f /private/tmp/cua-task15-sensitive-patterns.txt mydocs/working/task_m010_15_stage2.md
git diff --check
```

두 번째 privacy pattern scan은 private path, token, credential, email, data URL 후보 pattern을 담은 임시 pattern file을 사용하며 match가 없어야 한다. 명령이 match를 찾아 exit code 0이 되면 내용을 제거하거나 placeholder로 바꾼 뒤 다시 실행한다. 단계 보고서에는 pattern 본문을 붙이지 않고 match 여부만 기록한다.

### 커밋

```text
Task #15 Stage 2: Desktop profile source 후보 분류
```

## Stage 3 — parser feasibility 결정과 후속 task handoff

### 산출물

신규:

- `mydocs/working/task_m010_15_stage3.md`
- `mydocs/report/task_m010_15_report.md`

수정:

- `mydocs/orders/20260705.md`

### 변경 내용

- Stage 2 classification을 바탕으로 #16 parser 구현 후보를 확정한다.
- #17 activity 날짜 기준/timezone 옵션에 넘길 판단을 분리한다.
- #18 redacted baseline generator에 넘길 source/redaction 요구사항을 분리한다.
- local source parity가 높아지지 않는 field는 기존 `profileComparison` diagnostics와 profile smoke reason으로 관리한다는 결론을 명시한다.
- 최종 보고서에 수용 기준, 검증 결과, 잔여 리스크, 후속 작업 순서를 정리한다.
- 오늘할일 상태를 완료로 갱신한다.

### 검증

```bash
npm test
rg -n "usable_local_source|remote_only_or_internal|privacy_risk|unavailable_or_absent" mydocs/working/task_m010_15_stage*.md mydocs/report/task_m010_15_report.md
rg -n "#16|#17|#18|parser feasibility|profile parity" mydocs/working/task_m010_15_stage3.md mydocs/report/task_m010_15_report.md
rg -n -f /private/tmp/cua-task15-sensitive-patterns.txt mydocs/working/task_m010_15_stage*.md mydocs/report/task_m010_15_report.md
git diff --check
git status --short
```

privacy pattern scan은 private path, token, credential, email, data URL 후보 pattern을 담은 임시 pattern file을 사용하며 match가 없어야 한다. 단계 보고서에는 pattern 본문을 붙이지 않는다. `git status --short`는 최종 커밋 후 빈 출력이어야 한다.

### 커밋

```text
Task #15 Stage 3 + 최종 보고서: source inventory 결과 정리
```

## 검증 공통 규칙

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- 검증 실패 상태로 단계 보고서와 커밋을 만들지 않는다.
- #15에서는 `README.md`, `src/**`, `package.json`, `UsageSnapshot v2` schema를 수정하지 않는다.
- source 후보 확인은 read-only로 제한한다.
- raw local data, raw profile value, raw analyzer JSON, prompt/response/tool payload, account identifier, credential, absolute private path를 작업 문서에 남기지 않는다.
- source 후보의 실제 경로는 placeholder로만 기록한다.

## 커밋

- Stage 1 커밋은 구현계획서와 Stage 1 보고서를 함께 묶는다.
- Stage 2 커밋은 Stage 2 source inventory 보고서만 묶는다.
- Stage 3 커밋은 Stage 3 보고서, 최종 보고서, 오늘할일 완료 갱신을 함께 묶는다.
- 커밋 메시지는 단계별로 위에 명시한 형식을 사용한다.

## 단계 의존성

- Stage 1은 이 구현계획서 승인 후 진행한다.
- Stage 2는 Stage 1에서 inventory 대상과 금지 대상이 승인된 뒤 진행한다.
- Stage 3은 Stage 2의 source classification과 privacy review가 승인된 뒤 진행한다.

## 위험과 대응

- **privacy leakage**: 조사 결과에는 placeholder path와 schema summary만 기록하고 privacy pattern scan을 반복한다.
- **false confidence**: 한 local 환경에서 source가 없다고 일반화하지 않는다. 보고서에 확인 범위와 한계를 명시한다.
- **remote/internal source 유혹**: profile parity가 좋아져도 remote/internal endpoint나 token/cookie 기반 source는 제외한다.
- **scope creep**: source 후보가 확인돼도 #15에서는 parser 구현하지 않는다. 구현은 #16에서 수행한다.
- **문서 위치 변경**: 사용자-facing README 수정이 필요해 보이면 #15에서 직접 수정하지 않고 #16 또는 별도 task 판단으로 넘긴다.

## 승인 요청 사항

- Stage 1-3 분할과 각 Stage 산출물
- #15에서 code/README/package/schema 변경을 하지 않는 범위
- source classification 네 가지 기준
- Stage 2 read-only inventory와 placeholder-only 보고 방식
- 각 Stage 검증 명령과 커밋 메시지

승인되면 Stage 1 `기존 source contract와 prior findings 정리`부터 진행한다.

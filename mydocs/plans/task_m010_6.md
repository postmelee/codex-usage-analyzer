# Task M010 #6 수행계획서

GitHub Issue: [#6](https://github.com/postmelee/codex-usage-analyzer/issues/6)
마일스톤: M010

## 목적

이 task는 실제 Codex Desktop profile 화면에서 사용자가 눈으로 확인하는 값과 `codex-usage-analyzer`의 production `UsageSnapshot v2` 출력이 어느 범위에서 일치하거나 불일치하는지 반복 검증할 수 있는 smoke test 절차를 만든다.

최종 결과는 계정 식별자, 로컬 절대 경로, 인증 정보, raw session JSON, screenshot 원본을 저장하지 않는 redacted baseline 형식과, analyzer JSON을 해당 baseline과 비교하는 로컬 QA 절차다. 이를 통해 #7 npm publish 전에 fixture와 production output 혼동, profile parity 오해, local-only 산식 회귀를 릴리즈 전 단계에서 잡을 수 있게 한다.

## 배경

#3은 session JSONL 기반 core usage/activity/model parser를 구현했고, #4는 top skills/plugins ranking을 local invocation source 기준으로 구현했으며, #5는 Codex pet asset을 safe logical reference로 제한했다. 이 결과 production analyzer는 실제 로컬 데이터에서 많은 필드를 계산하지만, Codex Desktop profile은 remote account-level profile source를 사용할 수 있다.

특히 streak, total tokens, top plugins, favorite model 같은 profile-visible 값은 사용자가 화면과 직접 비교한다. 그러나 현재 README는 profile parity가 보장되지 않는다고 설명할 뿐, 개발자가 같은 기준으로 redacted baseline을 만들고 analyzer output과 비교하는 절차는 없다. 이 task는 remote profile API를 호출하지 않고, 사용자가 제공하거나 수동으로 기록한 profile-visible baseline과 analyzer output을 안전하게 비교하는 QA 층을 추가한다.

## 범위

### 포함

- 실제 Codex profile 화면 값과 analyzer JSON을 비교하기 위한 redacted baseline schema를 정의한다.
- baseline에 허용되는 값과 금지되는 민감 원본 값을 문서화한다.
- analyzer JSON과 baseline을 비교하는 smoke test script 또는 문서화된 command를 제공한다.
- 비교 대상은 total tokens, peak daily tokens, streaks, activity insights, top skills/plugins, token breakdown, favorite model을 우선 포함한다.
- profile remote source와 local session-derived source의 날짜 기준, 허용 오차, known mismatch reason을 명시한다.
- fixture와 production analyzer output이 섞이는 회귀를 잡는 테스트를 추가한다.
- README에 profile parity smoke 절차와 baseline redaction 원칙을 문서화한다.

### 제외

- Codex Desktop UI 자동 조작
- Codex Desktop remote/internal profile API 호출
- screenshot OCR 또는 이미지 파싱
- 웹 서비스 end-to-end 테스트
- profile/tokenmon submit command 구현
- 원격 analytics 수집
- `UsageSnapshot v2` schema 변경
- 실제 사용자 raw analyzer JSON, raw session JSONL, screenshot 원본을 저장소에 보관

## 설계 방향

- smoke baseline은 수동 입력 또는 사용자가 별도로 redaction한 JSON만 입력으로 받는다.
- analyzer는 계속 local-only source를 읽고, Codex Desktop remote profile API는 호출하지 않는다.
- 비교 결과는 pass/fail만이 아니라 `match`, `within_tolerance`, `mismatch`, `not_comparable` 같은 reasoned result로 제공한다.
- 숫자 필드는 profile UI 표시 단위 때문에 허용 오차를 둔다. 예를 들어 "114.3만"처럼 축약된 profile UI 값은 exact raw token count가 아니므로 tolerance 기반 비교를 허용한다.
- streak 비교는 local analyzer의 UTC session date 기준과 Codex Desktop profile remote account activity 기준이 다를 수 있음을 baseline metadata와 결과 reason에 남긴다.
- top skills/plugins와 favorite model은 local sessions에 source event가 없으면 `not_comparable`로 처리하고, sample fixture fallback으로 통과시키지 않는다.
- redacted baseline fixture는 synthetic value만 사용한다.
- raw local path, account handle, token, session id, thread title, prompt/response, tool input/output, screenshot 파일명은 baseline과 report에 넣지 않는다.
- 기존 CLI와 SDK의 public contract를 깨지 않는다. smoke helper는 개발/QA 용도이며 public `UsageSnapshot v2` schema를 확장하지 않는다.

## 문서 위치 판단

이번 task는 사용자가 로컬에서 profile parity smoke를 직접 수행해야 하므로 README에 최소 사용법을 추가한다. baseline 형식과 세부 비교 정책은 개발/QA 성격이 강하므로 source fixture와 HWF 작업 산출물에 둔다. 별도 공식 docs 루트는 현재 프로젝트에 선택되어 있지 않으므로 새 `docs/` 루트는 만들지 않는다.

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| `README.md` | 공식 사용자/기여자 문서 | 사용자, 기여자, wrapper 구현자 | `README.md` | `docs/` | 현재 공식 사용자 문서가 README 하나이며, smoke command는 설치/검증 문맥에 바로 연결된다. |
| `scripts/profile-smoke.js` | 개발/QA 스크립트 | 기여자, 릴리즈 작업자 | `scripts/` | `src/` | package public API가 아니라 로컬 검증 도구이므로 배포 surface와 분리한다. |
| `src/profile-baseline.js` | 내부 비교 로직 | 기여자, 테스트 | `src/` | `scripts/` | 비교 로직을 testable module로 두고 CLI script는 얇게 유지한다. public export에는 추가하지 않는다. |
| `src/__tests__/fixtures/profile-baseline/` | synthetic test fixture | 기여자, 테스트 | `src/__tests__/fixtures/` | `mydocs/working/` | regression test가 직접 사용하는 synthetic baseline이므로 test fixture에 둔다. |
| `mydocs/plans/task_m010_6.md` | 작업 산출물 | 내부 작업자, 에이전트 | `mydocs/plans/` | 해당 없음 | 구현 전 승인용 수행계획서다. |
| `mydocs/plans/task_m010_6_impl.md` | 작업 산출물 | 내부 작업자, 에이전트 | `mydocs/plans/` | 해당 없음 | 승인 후 단계별 산출물과 검증 명령을 구체화한다. |
| `mydocs/working/task_m010_6_stage{N}.md` | 작업 산출물 | 내부 작업자, 에이전트 | `mydocs/working/` | 해당 없음 | 단계별 baseline 정책, 검증, privacy review를 기록한다. |
| `mydocs/report/task_m010_6_report.md` | 작업 산출물 | 내부 작업자, 에이전트 | `mydocs/report/` | 해당 없음 | 최종 결과와 PR 게시 전 승인 기록이다. |

## 예상 변경 파일

신규:

- `scripts/profile-smoke.js`
- `src/profile-baseline.js`
- `src/__tests__/profile-baseline.test.js`
- `src/__tests__/fixtures/profile-baseline/README.md`
- `src/__tests__/fixtures/profile-baseline/redacted-baseline.json`
- `mydocs/plans/task_m010_6_impl.md`
- `mydocs/working/task_m010_6_stage1.md`
- `mydocs/working/task_m010_6_stage2.md`
- `mydocs/working/task_m010_6_stage3.md`
- `mydocs/working/task_m010_6_stage4.md`
- `mydocs/report/task_m010_6_report.md`

수정:

- `README.md`
- `package.json` 또는 npm scripts, 필요한 경우
- `src/__tests__/cli.test.js`, 필요한 경우
- `mydocs/orders/20260616.md`

이번 task 산출물:

- `mydocs/orders/20260616.md`
- `mydocs/plans/task_m010_6.md`
- `mydocs/plans/task_m010_6_impl.md`
- `mydocs/working/task_m010_6_stage{N}.md`
- `mydocs/report/task_m010_6_report.md`

## 잠정 단계

- **Stage 1 — baseline contract와 fixture 설계**
  - redacted baseline JSON 구조, 허용 필드, 금지 필드를 확정한다.
  - synthetic baseline fixture와 README를 추가한다.
  - 비교 대상별 tolerance와 `not_comparable` 조건을 정한다.
  - 검증 관점: fixture에 실제 계정 식별자, local path, token, screenshot 원본, raw session data가 없는지 확인한다.
- **Stage 2 — 비교 로직과 smoke command 구현**
  - baseline과 analyzer snapshot을 비교하는 내부 module을 구현한다.
  - 로컬에서 실행 가능한 smoke script 또는 npm script를 추가한다.
  - sample fixture를 production 결과처럼 통과시키지 않는 guard를 추가한다.
  - 검증 관점: match, tolerance, mismatch, not comparable case가 deterministic하게 테스트된다.
- **Stage 3 — README와 QA checklist 정리**
  - README에 profile parity smoke 사용법과 redaction 원칙을 추가한다.
  - Codex Desktop profile 값과 analyzer 값이 다를 수 있는 known reasons를 문서화한다.
  - 검증 관점: README가 internal API 호출이나 raw local data 저장을 암시하지 않는다.
- **Stage 4 — 실제 smoke, privacy review, 최종 보고**
  - 실제 local analyzer output으로 smoke command를 실행하되 raw JSON은 문서에 보존하지 않는다.
  - 사용자가 제공한 profile UI 값이 있으면 redacted summary 기준으로 비교 가능성을 확인한다.
  - 최종 보고서와 오늘할일 완료 처리 후 PR 준비 상태로 정리한다.

## 검증 계획

### 단계별 검증

- Stage 1
  - `npm test`
  - `rg -n "/Users/|/home/|/private/var/|access_token|refresh_token|Bearer |sk-|github_pat_|session_id|thread_id" src/__tests__/fixtures/profile-baseline`
  - `git diff --check`
- Stage 2
  - `npm test`
  - synthetic baseline smoke command
  - fixture-sample guard test
- Stage 3
  - `npm test`
  - README command snippet 수동 확인
  - `rg -n "remote profile API|internal API|screenshot" README.md scripts src/__tests__/fixtures/profile-baseline`
- Stage 4
  - `npm test`
  - `node bin/codex-usage-analyzer.js analyze --json`
  - 실제 smoke command 실행
  - `git diff --check`

### 통합 검증

- 개발자가 redacted baseline과 analyzer JSON을 같은 command/checklist로 비교할 수 있다.
- baseline fixture와 실제 production output이 명확히 분리된다.
- fixture sample output을 실제 profile parity smoke 성공으로 오인하지 않는다.
- baseline과 compare result에 raw local path, account token, session id, prompt/response, screenshot 원본이 포함되지 않는다.
- Codex Desktop remote profile source와 local analyzer source의 불일치가 reason으로 설명된다.
- `UsageSnapshot v2` schema 변경 없이 구현한다.
- `git status --short`가 PR 준비 전 빈 출력이다.
- `git diff --check`가 경고 없이 통과한다.

## 리스크

- **profile UI 축약값**: profile 화면은 "114.3만"처럼 반올림된 값을 보여줄 수 있다. baseline은 raw number가 아니라 displayed value/tolerance를 지원해야 한다.
- **remote/local source mismatch**: Codex Desktop profile은 remote account-level source이고 analyzer는 local session source다. 비교 실패가 parser bug인지 source 차이인지 reason을 나눠야 한다.
- **privacy leakage**: baseline에 계정명, screenshot 경로, raw session id, local path가 들어갈 수 있다. fixture, tests, README에서 금지 패턴을 고정한다.
- **QA script scope creep**: smoke script가 public SDK나 schema로 오해될 수 있다. package export는 늘리지 않고 개발/릴리즈 검증 도구로 제한한다.
- **불완전한 실제 baseline**: 사용자가 직접 profile 값을 전달하지 않으면 실제 parity는 일부 항목만 확인 가능하다. 이 경우 command와 checklist 자체를 검증하고, 실제 값 비교는 가능한 범위로 제한한다.

## 승인 요청 사항

- #6을 redacted baseline과 local profile parity smoke 절차 구현으로 진행하는 것
- Codex Desktop remote/internal profile API 호출, UI 자동화, screenshot OCR, schema 변경을 제외하는 것
- baseline과 보고서에 raw analyzer JSON, raw session JSONL, local path, account identifier, token, screenshot 원본을 저장하지 않는 것
- smoke helper를 public `UsageSnapshot v2` schema가 아닌 개발/QA 도구로 두는 것
- README에 profile parity smoke 사용법과 known mismatch reason을 문서화하는 것
- Stage 1-4 잠정 단계와 검증 계획

승인되면 `task_m010_6_impl.md`에서 단계별 산출물, 검증 명령, 커밋 메시지를 구체화한다.

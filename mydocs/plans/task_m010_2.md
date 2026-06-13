# Task M010 #2 수행계획서

GitHub Issue: [#2](https://github.com/postmelee/codex-usage-analyzer/issues/2)
마일스톤: M010

## 목적

현재 `codex-usage-analyzer analyze --json` 기본 경로는 실제 로컬 Codex 사용량을 분석하지 않고 fixture 기반 `UsageSnapshot v2`를 반환한다. 이 task는 사용자가 기본 CLI/SDK 결과를 실제 profile/usage 값으로 오해하지 않도록 production analyzer 경로와 fixture/dev/test 경로를 명확히 분리한다.

완료 기준은 기본 `analyze --json` 및 `analyzeUsage()`가 sample fixture 값을 숨겨서 반환하지 않는 것이다. 실제 parser가 아직 구현되지 않은 필드는 `UsageSnapshot v2` 계약 안에서 0, `null`, 빈 배열, namespaced diagnostic extension으로 명시적인 unavailable 상태를 표현한다.

## 배경

Issue #1의 데이터 소스 inventory는 현재 production path와 fixture path가 같은 sample module을 공유한다고 정리했다. 특히 sample-only profile-like 값, 큰 token totals, fixture marker extension, avatar-like 값이 기본 CLI 결과로 나와 사용자가 실제 로컬 Codex profile 값으로 오해할 수 있다.

Issue #2는 실제 parser 구현(#3-#5) 전에 이 혼동을 막는 기반 작업이다. 이번 task는 `UsageSnapshot v2` 스키마를 바꾸지 않고, sample 데이터는 명시적인 fixture/dev/test 경로에서만 사용되도록 코드와 문서를 정리한다.

## 범위

### 포함

- CLI command option/entrypoint에서 production analyze 경로와 fixture/sample 경로 분리
- `analyzeUsage()` 기본 동작이 `sampleUsageSnapshotV2`를 fallback으로 사용하지 않도록 변경
- 실제 parser 미구현 필드를 위한 valid `UsageSnapshot v2` unavailable snapshot 생성 정책 구현
- fixture helper와 sample export는 테스트/문서 예시용으로 유지하되 명시적인 이름과 경로로만 사용
- README의 현재 한계, production 기본 출력 의미, fixture 사용법 업데이트
- 테스트에서 기본 analyze 경로가 sample-backed output을 반환하지 않는지 검증

### 제외

- 실제 로컬 Codex 데이터 parser 전체 구현
- token/model/activity/skill/plugin ranking의 실제 계산 로직 구현
- `UsageSnapshot v2` 필드 추가, 삭제, 타입 변경
- npm publish/release automation
- 원격 Codex Desktop profile API 호출 또는 인증 기반 smoke test 구현

## 설계 방향

- 기본 production analyzer는 `sampleUsageSnapshotV2`를 import하거나 clone하지 않는다.
- production unavailable snapshot은 `schemaVersion`, 실행 시각 기반 `capturedAt`, `producer`를 채우고, 필수 영역은 스키마가 허용하는 최소값으로 둔다.
  - `usage.totalTokens`: `0`
  - `usage.peakDailyTokens`: `null`
  - `usage.tokenBreakdown.*`: `null`
  - `usage.daily`: `[]`
  - `models.favoriteModel`: `null`, `models.items`: `[]`
  - `activity.*`: `null`
  - `skills.exploredCount`, `skills.totalUsed`: `null`, `skills.topSkills`: `[]`
  - `plugins.topPlugins`: `[]`
- unavailable 이유는 `extensions`의 namespaced key에 기록한다. raw local path, account identifier, token, profile URL 같은 민감 값은 넣지 않는다.
- sample fixture는 `createSampleUsageSnapshotV2()`와 fixture 전용 CLI 옵션 또는 테스트 helper에서만 사용한다. CLI 옵션명은 구현 계획서에서 최종 확정하되, 기본 `analyze --json`과 혼동되지 않는 명시적 이름을 사용한다.
- README는 사용자와 기여자가 모두 보는 공식 문서이므로, fixture 출력이 production 결과가 아니라는 점과 실제 parser가 후속 task에서 구현된다는 점을 명시한다.

## 문서 위치 판단

이번 task는 사용자와 기여자가 직접 보는 CLI 사용법과 현재 한계를 수정하므로 `README.md`를 공식 문서 위치로 사용한다. 구현 과정 기록, 승인 산출물, 단계 보고서는 `mydocs/`에 둔다. 별도 `docs/` 루트는 이 저장소에서 아직 공식 문서 루트로 선택되지 않았으므로 새로 만들지 않는다.

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| `README.md` | 공식 문서 | 사용자, 기여자 | 저장소 루트 `README.md` | `docs/`, `mydocs/tech/` | CLI 사용법과 현재 한계는 패키지 첫 진입점에 있어야 하며, 별도 공식 docs 루트는 아직 선택되지 않았다. |
| `mydocs/plans/task_m010_2.md` | 작업 산출물 | 작업지시자, 내부 작업자, 에이전트 | `mydocs/plans/` | `docs/` | 구현 전 승인용 계획서이며 제품 문서가 아니다. |
| `mydocs/plans/task_m010_2_impl.md` | 작업 산출물 | 작업지시자, 내부 작업자, 에이전트 | `mydocs/plans/` | `docs/` | 승인 후 단계별 구현 계획을 보존하는 내부 산출물이다. |
| `mydocs/working/task_m010_2_stage{N}.md` | 작업 산출물 | 작업지시자, 내부 작업자, 에이전트 | `mydocs/working/` | `docs/` | 단계별 구현/검증 기록이며 사용자 문서가 아니다. |
| `mydocs/report/task_m010_2_report.md` | 작업 산출물 | 작업지시자, 내부 작업자, 에이전트 | `mydocs/report/` | `docs/` | 최종 보고와 PR 근거를 보존하는 내부 산출물이다. |

## 예상 변경 파일

신규:

- `mydocs/plans/task_m010_2.md`
- `mydocs/plans/task_m010_2_impl.md`
- `mydocs/working/task_m010_2_stage1.md`
- `mydocs/working/task_m010_2_stage2.md`
- `mydocs/working/task_m010_2_stage3.md`
- `mydocs/working/task_m010_2_stage4.md`
- `mydocs/report/task_m010_2_report.md`

수정:

- `mydocs/orders/20260614.md`
- `README.md`
- `src/analyze.js`
- `src/cli.js`
- `src/index.d.ts`
- `src/__tests__/analyze.test.js`
- `src/__tests__/cli.test.js`

검토 대상:

- `src/index.js`
- `src/fixtures/sample-v2-snapshot.js`
- `src/snapshot/v2-schema.js`
- `src/snapshot/v2-types.d.ts`
- `mydocs/tech/task_m010_1_codex_data_source_inventory.md`

## 잠정 단계

- **Stage 1 — 현재 fixture 의존 경로 고정**
  - CLI, SDK, fixture, 테스트에서 sample 값이 production 결과로 흘러가는 경로를 정리한다.
  - production path에서 금지해야 할 sample-only sentinel을 정의한다.
- **Stage 2 — production unavailable snapshot 분리 구현**
  - `analyzeUsage()` 기본 경로가 fixture를 사용하지 않도록 변경한다.
  - 스키마를 유지하는 최소 unavailable snapshot과 diagnostic extension을 구현한다.
- **Stage 3 — fixture/dev/test 경로 명시화**
  - sample fixture를 명시적으로 호출하는 helper와 CLI 옵션 또는 테스트 전용 경로를 정리한다.
  - 기본 CLI 사용법과 fixture 사용법이 혼동되지 않도록 README와 tests를 갱신한다.
- **Stage 4 — 회귀 검증과 문서 정리**
  - 기본 analyze 결과에 sample-only 값이 포함되지 않는지 테스트와 grep로 확인한다.
  - 최종 보고서와 PR 준비용 검증 결과를 정리한다.

## 검증 계획

### 단계별 검증

- Stage 1
  - `rg -n "sampleUsageSnapshotV2|createSampleUsageSnapshotV2|codexUsageAnalyzer.fixture|sample-backed" src README.md mydocs/tech/task_m010_1_codex_data_source_inventory.md`
  - 현재 production/fixture 의존 경로가 stage 보고서에 정리됐는지 수동 확인
- Stage 2
  - `npm test`
  - `node bin/codex-usage-analyzer.js analyze --json`
  - 기본 출력이 `UsageSnapshot v2` 검증을 통과하고 sample token/profile/asset 값을 포함하지 않는지 확인
- Stage 3
  - `npm test`
  - fixture 전용 경로가 테스트와 README에서 명시적으로만 사용되는지 `rg`로 확인
- Stage 4
  - `npm test`
  - `node bin/codex-usage-analyzer.js analyze --json`
  - `git diff --check`

### 통합 검증

- `analyze --json`이 sample임을 숨긴 결과를 반환하지 않는다.
- fixture를 쓰려면 명시적인 옵션 또는 test/helper 경로를 사용해야 한다.
- README와 테스트가 production path와 fixture path를 각각 검증한다.
- 실제 사용자 데이터, 로컬 private path, 인증 토큰, 계정 식별자 원본이 출력/문서/테스트 fixture에 새로 추가되지 않는다.
- `git status --short`가 PR 준비 전 빈 출력이다.
- `git diff --check`가 경고 없이 통과한다.

## 리스크

- **스키마 필수 필드 제약**: 실제 parser가 없더라도 `UsageSnapshot v2` 필수 영역은 채워야 한다. 스키마 변경 없이 0, `null`, 빈 배열, diagnostic extension 조합으로 표현한다.
- **사용자 혼동 지속**: fixture 전용 옵션이나 README 문구가 모호하면 sample output이 다시 production처럼 보일 수 있다. 옵션명과 문서에서 fixture/sample임을 반복해서 명시한다.
- **후속 parser와 충돌**: #3-#5가 채울 필드를 이번 task에서 임의 계산하면 중복 구현이 된다. 이번 task는 unavailable baseline과 경로 분리에 집중한다.
- **민감정보 노출**: diagnostic extension에 raw local path나 계정 식별자가 들어갈 수 있다. 이번 task에서는 정적 unavailable reason과 source 상태만 기록한다.

## 승인 요청 사항

- 기본 `analyze --json`과 `analyzeUsage()`가 fixture 값을 반환하지 않고 최소 unavailable snapshot을 반환하도록 바꾸는 것
- sample fixture는 명시적인 fixture/dev/test 경로에서만 사용하는 것으로 분리하는 것
- README를 공식 사용자/기여자 문서 위치로 수정하는 것
- `UsageSnapshot v2` 스키마 변경과 실제 parser 구현은 이번 task에서 제외하는 것
- Stage 1-4 잠정 단계와 검증 계획

승인되면 `task_m010_2_impl.md`에서 단계별 산출물, 검증 명령, 커밋 메시지를 구체화한다.

# Task M010 #1 수행계획서

GitHub Issue: [#1](https://github.com/postmelee/codex-usage-analyzer/issues/1)
마일스톤: M010

## 목적

현재 `codex-usage-analyzer analyze --json`은 실제 로컬 Codex 사용량을 읽지 않고 sample-backed `UsageSnapshot v2`를 반환한다. 이 task는 parser 본 구현 전에 CLI가 안전하게 접근할 수 있는 로컬 데이터 소스와 `UsageSnapshot v2` 필드별 수집 가능성을 확정한다.

최종 산출물은 후속 이슈 #2-#6에서 parser를 구현할 때 기준으로 삼을 데이터 소스 inventory와 필드 mapping 정책이다. 조사 결과에는 `source`, `confidence`, `fallback/null policy`, `privacy note`를 포함한다.

## 배경

README는 현재 구현을 contract-first skeleton으로 설명하며, `analyzeUsage()`가 sample-backed snapshot을 반환한다고 명시한다. Issue #1은 M010의 선행 조사 작업으로, 실제 parser 구현 전에 로컬 데이터 후보의 접근 조건, 갱신 주기, 개인정보/보안 위험을 먼저 확정하라고 요구한다.

이 task는 `UsageSnapshot v2` 계약 자체를 바꾸지 않는다. 스키마 변경 필요성이 발견되면 영향 분석과 소비자 호환성 검토를 별도 후속 이슈로 분리한다.

## 범위

### 포함

- 현재 CLI 코드, README, `UsageSnapshot v2` 타입/validator, fixture-backed analyzer 동작 검토
- 로컬 Codex 데이터 후보의 파일, DB, 로그, API 형태와 접근 가능 조건 조사
- tokens, daily activity, activity insights, model, top skills/plugins, avatar/pet 필드별 수집 가능성 분류
- 필드별 `source`, `confidence`, `fallback/null policy`, `privacy note` 정리
- analyzer 기본 동작에서 fixture가 실제 결과처럼 보이면 안 된다는 후속 구현 기준 명시
- 후속 이슈 #2-#6과 충돌하는 mapping이 없는지 검토

### 제외

- 실제 parser 본 구현
- `UsageSnapshot v2` 스키마 변경
- 웹 서비스, GitHub login, README 이미지 갱신 기능
- 비공개 credential을 요구하는 원격 API 호출
- raw credential, 계정 식별자 원문, 실제 사용자 데이터 원문 수집 또는 문서화

## 설계 방향

- 이번 task의 제품 산출물은 코드 변경이 아니라 기술 조사 노트로 둔다.
- 조사 문서에는 실제 사용자 경로, 토큰, 계정 식별자, 원본 로그 본문을 그대로 쓰지 않는다. 필요하면 일반화한 경로 패턴과 redacted 예시만 기록한다.
- `UsageSnapshot v2` 계약을 유지한 상태에서 필드별 source 우선순위와 unavailable/null 정책을 먼저 고정한다.
- 수집 가능성이 낮거나 보안 위험이 큰 필드는 parser에서 무리하게 추론하지 않고 `null` 또는 unavailable 정책과 후속 이슈로 분리한다.
- fixture/sample 출력과 실제 analyzer 출력의 경계를 후속 구현 기준으로 명확히 적는다.

## 문서 위치 판단

이번 task는 후속 parser 구현자를 위한 기술 조사 문서를 생성한다. 사용자, 외부 통합자, 공개 API 소비자가 직접 참조할 공식 제품 문서가 아니므로 공식 문서 루트나 README가 아니라 `mydocs/tech/`에 둔다.

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| `mydocs/tech/task_m010_1_codex_data_source_inventory.md` | 기술 조사 | 내부 작업자, 에이전트, 후속 parser 구현자 | `mydocs/tech/` | `README.md`, `docs/` | 아직 공식 사용자/통합 문서가 아니라 후속 구현 판단 근거이며, 민감정보 redaction 기준과 조사 판단을 보존해야 한다. |

## 예상 변경 파일

신규:

- `mydocs/orders/20260613.md`
- `mydocs/plans/task_m010_1.md`
- `mydocs/plans/task_m010_1_impl.md`
- `mydocs/tech/task_m010_1_codex_data_source_inventory.md`
- `mydocs/working/task_m010_1_stage1.md`
- `mydocs/working/task_m010_1_stage2.md`
- `mydocs/working/task_m010_1_stage3.md`
- `mydocs/working/task_m010_1_stage4.md`
- `mydocs/report/task_m010_1_report.md`

수정:

- 해당 없음. 이번 task는 조사와 작업 산출물 작성만 수행하며, parser 구현과 README/스키마 변경은 범위에서 제외한다.

검토 대상:

- `README.md`
- `package.json`
- `src/analyze.js`
- `src/cli.js`
- `src/snapshot/v2-types.d.ts`
- `src/snapshot/v2-schema.js`
- `src/fixtures/sample-v2-snapshot.js`
- `src/__tests__/`

## 잠정 단계

- **Stage 1 — 현재 계약과 skeleton 동작 확인**
  - README, CLI, analyzer, schema/type, fixture, test 구조를 검토한다.
  - `UsageSnapshot v2` 필드 목록과 현재 sample-backed 동작의 후속 구현 위험을 기술 조사 노트에 정리한다.
- **Stage 2 — 로컬 Codex 데이터 소스 inventory**
  - 로컬에서 접근 가능한 데이터 후보를 파일/DB/로그/API 형태, 접근 조건, 갱신 주기, 보안 위험 기준으로 분류한다.
  - credential 또는 원본 사용자 데이터가 필요한 후보는 읽지 않고 보류 또는 후속 승인 대상으로 표시한다.
- **Stage 3 — 필드별 mapping과 fallback 정책 확정**
  - tokens, daily activity, activity insights, model, top skills/plugins, avatar/pet의 source 우선순위와 `confidence`, `fallback/null policy`, `privacy note`를 표로 정리한다.
  - 실제 parser에서 fixture를 실제 결과처럼 반환하지 않기 위한 구현 기준을 명시한다.
- **Stage 4 — 후속 이슈 정합성 검토와 최종 정리**
  - 후속 이슈 #2-#6의 방향과 inventory 결과가 충돌하지 않는지 검토한다.
  - 최종 보고서와 PR 준비용 검증 결과를 정리한다.

## 검증 계획

### 단계별 검증

- Stage 1
  - `npm test`
  - `node bin/codex-usage-analyzer.js analyze --json`
  - `UsageSnapshot v2` 필드 목록과 fixture-backed 동작이 조사 노트에 빠짐없이 반영됐는지 수동 확인
- Stage 2
  - 조사 문서에 실제 사용자 경로, 토큰, 계정 식별자 원문이 없는지 수동 확인
  - credential 접근이나 원격 API 호출을 수행하지 않았는지 수동 확인
- Stage 3
  - 모든 대상 필드에 `source`, `confidence`, `fallback/null policy`, `privacy note`가 있는지 수동 확인
  - 수집 불가능 또는 보류 필드에 이유와 후속 이슈 연결이 있는지 수동 확인
- Stage 4
  - 후속 이슈 #2-#6과 mapping 결과가 충돌하지 않는지 수동 확인
  - `git diff --check`

### 통합 검증

- 작성 문서에서 로컬 사용자 경로, 토큰, 계정 원본값이 노출되지 않았는지 수동 확인한다.
- fixture/sample 출력과 실제 analyzer 출력의 분리 기준이 후속 구현자가 실행 가능한 수준으로 명시됐는지 확인한다.
- `git status --short`가 PR 준비 전 빈 출력이다.
- `git diff --check`가 경고 없이 통과한다.

## 리스크

- **로컬 데이터 구조 변동**: Codex 버전이나 실행 환경에 따라 데이터 위치와 형식이 다를 수 있다. 조사 노트에는 확정/추정/보류를 분리하고 confidence를 명시한다.
- **민감정보 노출**: 실제 사용자 경로, 계정 식별자, 토큰, 로그 본문이 문서에 남을 수 있다. 모든 예시는 redacted 형태로 쓰고 단계 검증에 수동 privacy review를 포함한다.
- **계약 변경 압력**: 현재 `UsageSnapshot v2`로 표현하기 어려운 값이 있을 수 있다. 이번 task에서는 계약을 바꾸지 않고 후속 이슈 후보로만 기록한다.
- **후속 이슈와 불일치**: #2-#6이 이미 가정한 source와 inventory 결과가 다를 수 있다. Stage 4에서 정합성 검토를 수행한다.

## 승인 요청 사항

- 조사 결과 문서 위치를 `mydocs/tech/task_m010_1_codex_data_source_inventory.md`로 두는 것
- 이번 task를 코드/스키마/README 변경 없는 조사 및 문서화 작업으로 제한하는 것
- credential, token, 원본 사용자 데이터, raw local path를 읽거나 문서화하지 않는 조사 방식
- Stage 1-4 잠정 단계와 검증 계획

승인되면 `task_m010_1_impl.md`에서 단계별 산출물, 검증 명령, 커밋 메시지를 구체화한다.

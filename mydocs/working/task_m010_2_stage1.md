# Task M010 #2 Stage 1 보고서

GitHub Issue: [#2](https://github.com/postmelee/codex-usage-analyzer/issues/2)
구현계획서: [`task_m010_2_impl.md`](../plans/task_m010_2_impl.md)
Stage: 1

## 단계 목적

Stage 1은 코드와 README를 수정하기 전에 현재 production analyze 경로와 fixture/sample 경로가 어떻게 섞여 있는지 고정하는 단계다. 후속 Stage 2-3에서 기본 출력과 fixture 전용 출력을 분리할 때 회귀 테스트로 막아야 할 sample-only sentinel을 확정한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m010_2_stage1.md` | 현재 fixture 의존 경로, sample-only sentinel, 다음 단계 assertion 목록, 검증 결과를 기록했다. |

## 본문 변경 정도 / 본문 무손실 여부

코드와 README 본문은 수정하지 않았다. 이번 단계는 기존 파일을 읽고 Stage 2-3의 변경 기준을 문서화하는 조사/보고 단계다.

## 현재 fixture 의존 경로

| 영역 | 현재 상태 | Stage 2-3 조치 |
|---|---|---|
| `src/analyze.js` | `sampleUsageSnapshotV2`를 직접 import하고 `analyzeUsage()`가 `createSampleUsageSnapshotV2()` 결과를 반환한다. `capturedAt` 기본값도 sample fixture timestamp를 사용한다. | production 기본 snapshot 생성 경로를 sample fixture와 분리한다. |
| `src/cli.js` | `analyze --json` 성공 경로가 항상 `analyzeUsage()`를 호출한다. 별도 fixture option은 없다. | 기본 CLI는 production unavailable snapshot을 출력하고, fixture 출력은 명시적 option으로 분리한다. |
| `src/index.js`, `src/index.d.ts` | `createSampleUsageSnapshotV2()`와 `sampleUsageSnapshotV2`가 public export로 노출되어 있다. | SDK helper는 유지하되 production `analyzeUsage()`와 공유하지 않도록 테스트로 고정한다. |
| `src/__tests__/analyze.test.js` | `analyzeUsage()`가 valid snapshot인지와 sample helper override 동작만 검증한다. production path가 sample-free인지 확인하지 않는다. | production path의 unavailable baseline과 sample sentinel 부재를 직접 검증한다. |
| `src/__tests__/cli.test.js` | 기본 `analyze --json`이 valid snapshot인지 검증하지만 fixture 값 여부는 보지 않는다. | 기본 CLI와 fixture CLI 경로를 분리해 검증한다. |
| `README.md` | 현재 기본 구현이 sample-backed skeleton을 반환한다고 설명한다. | 기본 출력은 production unavailable baseline이고 fixture는 명시적 dev/test 경로임을 설명한다. |
| `src/fixtures/sample-v2-snapshot.js` | fixture marker extension과 sample profile/usage/model/asset 값이 들어 있다. | fixture 전용 path에서만 사용되도록 한다. |

## Sample-Only Sentinel

Stage 2-3의 production path 테스트에서 금지할 sentinel은 다음과 같다.

- `extensions["codexUsageAnalyzer.fixture"]`
- `codexProfile`의 sample profile-like object
- sample `usage.totalTokens` 값
- sample `models.favoriteModel` object
- sample `codexAssets.avatar` object
- sample `skills.topSkills` ranking item

production 기본 출력은 위 값을 대체값으로 사용하지 않고, 스키마가 허용하는 0, `null`, 빈 배열, namespaced diagnostic extension만 사용해야 한다.

## 다음 단계 Assertion

Stage 2에서 `src/__tests__/analyze.test.js`에 고정할 assertion:

- `analyzeUsage()` 결과가 `UsageSnapshot v2` 검증을 통과한다.
- `capturedAt` option이 없으면 실행 시각 기반 ISO string을 사용한다.
- `producer.name`과 `producer.version`은 analyzer 상수를 사용한다.
- `usage.totalTokens`는 unavailable baseline인 `0`이다.
- `tokenBreakdown.*`, activity summary, skill/plugin counts는 sample 값이 아니라 `null` 또는 빈 배열이다.
- `codexProfile`과 `codexAssets`는 production 기본 출력에 포함하지 않는다.
- `extensions["codexUsageAnalyzer.fixture"]`는 production 기본 출력에 없다.

Stage 3에서 `src/__tests__/cli.test.js`에 고정할 assertion:

- `analyze --json`은 production unavailable snapshot을 출력한다.
- `analyze --json --fixture-sample`은 sample fixture snapshot을 출력한다.
- unknown flag는 기존 stderr usage 실패 정책을 유지한다.
- fixture 전용 option은 README와 CLI usage에서 sample/dev 용도임을 드러낸다.

## 검증 결과

실행 명령:

```bash
rg -n "sampleUsageSnapshotV2|createSampleUsageSnapshotV2|codexUsageAnalyzer.fixture|sample-backed" src README.md mydocs/tech/task_m010_1_codex_data_source_inventory.md
npm test
git diff --check
```

결과:

- OK: `rg`가 README, Task #1 기술 조사 노트, `src/analyze.js`, fixture, exports, tests에서 현재 fixture 의존 경로를 확인했다.
- OK: `npm test` 통과. 총 6개 테스트가 모두 pass했다.
- OK: `git diff --check` 통과.
- OK: 새 보고서에는 실제 사용자 데이터, 로컬 private path, 인증 토큰, 계정 식별자 원본을 추가하지 않았다.

## 잔여 위험

- production unavailable snapshot의 diagnostic shape는 Stage 2에서 실제 코드로 확정해야 한다.
- `sampleUsageSnapshotV2` public export는 유지하므로, README와 테스트에서 production path와 fixture helper의 의미를 분리해 설명해야 한다.
- fixture 전용 CLI option 이름은 구현계획서 기준 `--fixture-sample`로 잡았지만, Stage 3 구현 중 usage text와 함께 최종 검토가 필요하다.

## 다음 단계 영향

- Stage 2는 `src/analyze.js`에서 production 기본 snapshot 생성 경로를 sample fixture와 분리한다.
- Stage 2 테스트는 이 보고서의 sample-only sentinel 부재를 직접 assertion으로 고정한다.
- Stage 3은 CLI fixture option과 README 설명을 이 보고서의 production/fixture 구분에 맞춰 추가한다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2로 진행한다.

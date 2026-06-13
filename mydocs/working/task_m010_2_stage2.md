# Task M010 #2 Stage 2 보고서

GitHub Issue: [#2](https://github.com/postmelee/codex-usage-analyzer/issues/2)
구현계획서: [`task_m010_2_impl.md`](../plans/task_m010_2_impl.md)
Stage: 2

## 단계 목적

Stage 2는 `analyzeUsage()` production 기본 경로가 sample fixture를 clone하거나 fallback으로 사용하지 않도록 분리하는 단계다. 실제 parser가 아직 없는 필드는 `UsageSnapshot v2` 계약 안에서 0, `null`, 빈 배열, namespaced diagnostic extension으로 명시적인 unavailable 상태를 반환하도록 고정했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/analyze.js` | `analyzeUsage()` 기본 경로를 `createUnavailableUsageSnapshotV2()`로 분리하고, sample timestamp fallback을 실행 시각 기반 `capturedAt`으로 변경했다. |
| `src/index.d.ts` | `analyzeUsage()`가 production snapshot을 반환하며 parser 미구현 필드는 unavailable baseline으로 표현한다는 타입 주석을 추가했다. |
| `src/__tests__/analyze.test.js` | production 기본 snapshot의 unavailable baseline, sample sentinel 부재, `capturedAt` option normalization을 검증하도록 테스트를 확장했다. |
| `mydocs/working/task_m010_2_stage2.md` | Stage 2 구현 내용, 검증 결과, 잔여 위험을 기록했다. |

## 본문 변경 정도 / 본문 무손실 여부

`UsageSnapshot v2` 스키마와 public export 목록은 변경하지 않았다. `createSampleUsageSnapshotV2()`와 `sampleUsageSnapshotV2` public export는 유지했다. 다만 `analyzeUsage()`의 기본 동작은 sample-backed snapshot 반환에서 production unavailable snapshot 반환으로 바뀌었다.

## 구현 요약

- `analyzeUsage()`가 `createSampleUsageSnapshotV2()`를 호출하지 않고 `createUnavailableUsageSnapshotV2()`를 호출하도록 변경했다.
- production unavailable snapshot 최소값을 다음처럼 고정했다.
  - `usage.totalTokens`: `0`
  - `usage.peakDailyTokens`: `null`
  - `usage.tokenBreakdown.*`: `null`
  - `usage.daily`: `[]`
  - `models.favoriteModel`: `null`
  - `models.items`: `[]`
  - `activity.*`: `null`
  - `skills.exploredCount`, `skills.totalUsed`: `null`
  - `skills.topSkills`, `plugins.topPlugins`: `[]`
- `codexProfile`과 `codexAssets`는 production 기본 출력에서 생략했다.
- `extensions["codexUsageAnalyzer.diagnostics"]`에 정적 unavailable diagnostic을 추가했다.
- `capturedAt` option이 없을 때 sample fixture timestamp가 아니라 실행 시각 기반 ISO string을 사용하도록 바꿨다.
- production 테스트는 sample helper를 기대값으로 사용하지 않고 sample sentinel 부재와 unavailable baseline을 직접 검증한다.

## 검증 결과

실행 명령:

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json
git diff --check
node -e 'import("./src/analyze.js").then(async ({ analyzeUsage }) => { const snapshot = await analyzeUsage({ capturedAt: "2026-06-13T00:00:00.000Z" }); console.log(JSON.stringify({ hasFixture: Boolean(snapshot.extensions?.["codexUsageAnalyzer.fixture"]), totalTokens: snapshot.usage.totalTokens, hasProfile: Object.hasOwn(snapshot, "codexProfile"), hasAssets: Object.hasOwn(snapshot, "codexAssets"), diagnostic: snapshot.extensions?.["codexUsageAnalyzer.diagnostics"]?.reason })); })'
```

결과:

- OK: `npm test` 통과. 총 7개 테스트가 모두 pass했다.
- OK: `node bin/codex-usage-analyzer.js analyze --json`가 valid `UsageSnapshot v2` JSON을 출력했다.
- OK: 기본 CLI JSON은 `totalTokens: 0`, `null` breakdown/activity, 빈 model/skill/plugin ranking, `codexUsageAnalyzer.diagnostics`를 포함했다.
- OK: 직접 확인 결과 `{"hasFixture":false,"totalTokens":0,"hasProfile":false,"hasAssets":false,"diagnostic":"local_parser_not_implemented"}`를 확인했다.
- OK: `git diff --check` 통과.
- OK: production 기본 출력과 새 문서에 실제 사용자 데이터, 로컬 private path, 인증 토큰, 계정 식별자 원본을 추가하지 않았다.

## 잔여 위험

- `src/analyze.js` 파일 안에는 public sample helper 유지를 위해 `sampleUsageSnapshotV2` import가 남아 있다. production `analyzeUsage()` 호출 경로는 sample clone을 사용하지 않지만, helper와 production code의 파일 분리는 후속 리팩터링 후보로 남는다.
- CLI에는 아직 fixture 전용 option이 없다. Stage 3에서 `--fixture-sample` 경로를 추가해야 fixture/dev/test 사용법이 명시된다.
- README는 아직 sample-backed skeleton 설명을 담고 있다. Stage 3에서 기본 production 출력 의미와 fixture 사용법을 갱신해야 한다.

## 다음 단계 영향

- Stage 3은 CLI에서 기본 `analyze --json`와 fixture 전용 `analyze --json --fixture-sample` 경로를 분리한다.
- Stage 3 테스트는 기본 CLI 출력의 sample sentinel 부재와 fixture CLI 출력의 sample sentinel 존재를 각각 검증해야 한다.
- README는 Stage 2에서 바뀐 production unavailable baseline을 사용자/기여자 문서에 반영해야 한다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3으로 진행한다.

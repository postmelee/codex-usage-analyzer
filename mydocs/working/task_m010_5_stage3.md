# Task M010 #5 Stage 3 완료 보고서

GitHub Issue: [#5](https://github.com/postmelee/codex-usage-analyzer/issues/5)
구현계획서: [`task_m010_5_impl.md`](../plans/task_m010_5_impl.md)
Stage: 3

## 단계 목적

Stage 3은 Stage 2에서 구현한 `asset-aggregate`를 production `analyzeUsage()` 경로에 연결하고, README와 테스트를 통해 `codexAssets`의 의미와 privacy boundary를 사용자에게 설명하는 단계다. 핵심 목표는 sample fixture의 avatar URL을 production fallback으로 쓰지 않으면서, built-in/custom pet을 안전한 logical reference로 출력하는 것이다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/analyze.js` | `aggregateCodexAssetsFromCodexHome()`를 production aggregate 병렬 실행에 추가하고, safe `codexAssets`와 diagnostics namespace를 snapshot에 병합했다. |
| `src/__tests__/analyze.test.js` | asset fixture integration, built-in fallback, parsed/unavailable fields, privacy-safe output 기대값을 갱신했다. |
| `src/__tests__/cli.test.js` | CLI production output에서 built-in/custom pet logical reference가 출력되는지 검증하는 테스트를 추가했다. |
| `README.md` | `codexAssets.pet`의 logical reference 의미, built-in fallback, custom pet manifest 조건, generated image 제외, wrapper asset export 책임을 문서화했다. |
| `mydocs/working/task_m010_5_stage3.md` | Stage 3 산출물과 검증 결과를 기록했다. |

## 본문 변경 정도 / 본문 무손실 여부

`UsageSnapshot v2` schema, TypeScript public type, package export는 변경하지 않았다. `analyzeUsage()` production path는 기존 usage/model/activity/skill/plugin aggregate 동작을 유지하면서 optional `codexAssets` field만 safe source가 있는 경우 추가한다. README는 기존 CLI/SDK 설명을 보존하고 asset 관련 경계 설명과 smoke command만 추가했다.

## 검증 결과

실행 명령:

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/assets
node bin/codex-usage-analyzer.js analyze --json --fixture-sample
rg -n "codexAssets|assetRef|data:image|remote profile|GitHub avatar" README.md src
git diff --check
```

결과:

- OK: `npm test` 통과. `29`개 테스트 중 `29`개 통과.
- OK: parser fixture CLI smoke에서 usage/model/activity와 built-in `codex-built-in:pet:codex`가 함께 출력됐다.
- OK: asset fixture CLI smoke에서 custom selected pet이 `codex-local:pet:custom-selected`로 출력됐다.
- OK: sample fixture CLI smoke는 명시적인 `--fixture-sample`에서만 기존 sample profile/assets를 반환했다.
- OK: `rg` 점검에서 asset 관련 문구는 README 경계 설명, sample fixture, tests, parser aggregate, schema/type 정의에 한정됐다. production 코드에서 `data:image` 출력 경로는 확인되지 않았다.
- OK: `git diff --check` 통과.

## 잔여 위험

- `codexAssets.pet`은 web app에서 바로 표시 가능한 URL이 아니라 logical reference다. 실제 렌더링에는 wrapper의 opt-in asset export/upload/local serving 레이어가 필요하다.
- built-in catalog와 `selected-avatar-id`는 Codex Desktop 내부 구현 기반 best-effort source다. 앱 버전 변경 시 catalog나 state key가 바뀔 수 있다.
- 세션 source가 없어도 built-in pet은 안전하게 알 수 있으므로 diagnostics status가 `unavailable`이 아니라 `partial`이 될 수 있다. README와 테스트에는 이 동작을 반영했다.
- custom pet의 spritesheet dimension validation은 아직 수행하지 않는다. 현재 단계는 image bytes를 읽지 않는 privacy-first metadata parser에 한정했다.

## 다음 단계 영향

- Stage 4에서 실제 로컬 Codex home smoke를 실행하고 raw JSON 대신 sanitized summary만 기록한다.
- Stage 4 privacy review는 `codexAssets`, diagnostics, README 문구가 raw local path, custom pet id, data URL, credential-like value를 노출하지 않는지 확인해야 한다.
- 최종 보고서에는 web app이 custom pet 이미지를 표시하려면 analyzer output만으로는 부족하고 별도 asset export 설계가 필요하다는 점을 남긴다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 Stage 4 실제 smoke와 최종 정리로 진행한다.

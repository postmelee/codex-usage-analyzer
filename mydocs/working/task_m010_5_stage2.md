# Task M010 #5 Stage 2 완료 보고서

GitHub Issue: [#5](https://github.com/postmelee/codex-usage-analyzer/issues/5)
구현계획서: [`task_m010_5_impl.md`](../plans/task_m010_5_impl.md)
Stage: 2

## 단계 목적

Stage 2는 Codex avatar/pet asset source를 `UsageSnapshot v2` schema 변경 없이 안전하게 표현하기 위한 내부 aggregate를 구현하는 단계다. Stage 1 이후 추가 분석에서 custom pet 구조와 built-in pet fallback이 확인되었으므로, `pets/*.png` 후보 방식이 아니라 Codex Desktop의 `pet.json` manifest, `selected-avatar-id`, built-in catalog 기준으로 구현을 보정했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/parser/asset-aggregate.js` | built-in pet catalog, selected pet fallback, custom pet manifest discovery, generated image 제외 count, safe diagnostics를 구현했다. |
| `src/__tests__/parser-asset.test.js` | custom selected pet, default built-in fallback, selected built-in pet, generated image 제외, missing custom fallback, schema validation 테스트를 추가했다. |
| `src/__tests__/fixtures/assets/.codex-global-state.json` | selected custom pet persisted atom fixture를 추가했다. |
| `src/__tests__/fixtures/assets/pets/synthetic/pet.json` | custom pet manifest fixture를 추가했다. |
| `src/__tests__/fixtures/assets/pets/synthetic/spritesheet.webp` | image bytes를 읽지 않는 계약을 검증하기 위한 spritesheet placeholder를 추가했다. |
| `src/__tests__/fixtures/assets/pets/safe-pet.png` | Stage 1의 잘못된 임의 png 후보 fixture를 제거했다. |
| `src/__tests__/fixtures/assets/README.md` | custom pet fixture 계약을 manifest 기반으로 정정했다. |
| `src/__tests__/fixtures/assets-empty/README.md` | empty fixture 기대값을 built-in `codex` fallback 기준으로 정정했다. |
| `src/__tests__/fixtures/assets-unsafe/README.md` | generated image 제외와 built-in fallback 관계를 정리했다. |
| `mydocs/plans/task_m010_5_impl.md` | Stage 2 보정 사항과 assetRef 정책을 기록했다. |

## 본문 변경 정도 / 본문 무손실 여부

production analyzer 통합은 아직 수행하지 않았고, 새 parser aggregate와 parser 단위 테스트만 추가했다. 기존 `UsageSnapshot v2` schema와 public SDK export는 변경하지 않았다. Fixture 문서는 Stage 1 이후 확인된 실제 Codex custom pet 구조에 맞춰 필요한 부분만 정정했다.

## 검증 결과

실행 명령:

```bash
npm test
node --input-type=module -e "import { aggregateCodexAssetsFromCodexHome } from './src/parser/asset-aggregate.js'; const result = await aggregateCodexAssetsFromCodexHome({ codexHome: './src/__tests__/fixtures/assets' }); console.log(JSON.stringify({ diagnostics: result.diagnostics, codexAssets: result.codexAssets }, null, 2));"
! rg -n "/Users/|/home/|/private/var/|access_token|refresh_token|Bearer |sk-|github_pat_|data:image|profile_picture|githubAvatar" src/__tests__/fixtures/assets src/__tests__/fixtures/assets-empty src/__tests__/fixtures/assets-unsafe
git diff --check
```

결과:

- OK: `npm test` 통과. `27`개 테스트 중 `27`개 통과.
- OK: aggregate smoke에서 selected custom pet은 `codex-local:pet:custom-selected`로 출력되고, avatar는 `avatar_source_not_owned`로 남았다.
- OK: aggregate smoke diagnostics는 built-in pet count, custom pet count, excluded generated image count만 노출하고 raw path, custom id, file name, image content를 노출하지 않았다.
- OK: fixture privacy scan 통과. pattern match 없음.
- OK: `git diff --check` 통과.

## 잔여 위험

- built-in pet catalog는 Codex Desktop 앱 내부 구현 기반 best-effort 목록이다. 향후 Codex Desktop이 pet catalog를 변경하면 analyzer allowlist도 업데이트가 필요하다.
- custom pet spritesheet는 image binary를 읽지 않으므로 Codex Desktop과 동일한 dimension validation까지 수행하지 않는다.
- `codex-local:pet:custom-selected`는 안전한 logical reference일 뿐, wrapper가 직접 이미지를 표시할 수 있는 asset export URL은 아니다. 실제 웹 렌더링용 asset export는 별도 opt-in 설계가 필요하다.
- `selected-avatar-id` persisted atom 저장 위치가 Codex Desktop 버전에 따라 바뀔 수 있다. 이 경우 analyzer는 default built-in `codex` fallback을 사용한다.

## 다음 단계 영향

- Stage 3에서 `analyzeUsage()` production path에 asset aggregate를 연결한다.
- Stage 3에서 `codexAssets`는 aggregate가 safe logical asset을 반환할 때만 채운다.
- Stage 3 README에는 built-in/custom pet logical reference의 의미, custom asset binary 미노출, wrapper asset export 책임을 명시해야 한다.
- Stage 3 테스트는 sample fixture와 production asset aggregate가 섞이지 않는지 확인해야 한다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3 analyzer integration과 README 문서화로 진행한다.

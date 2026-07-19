# Task M04x #52 Stage 2.5 완료보고서

GitHub Issue: [#52](https://github.com/postmelee/codex-usage-analyzer/issues/52)
구현계획서: [`task_m04x_52_impl.md`](../plans/task_m04x_52_impl.md)
Stage: 2.5

## 단계 목적

Codex Desktop에서 이미 선택된 custom pet을 기본값으로 유지하면서, 설치된 복수 custom pet을 privacy-safe catalog로 조회하고 호출 시점 숫자 key로 명시 선택할 수 있는 계약을 추가한다. 선택 상태가 없더라도 첫 항목이나 유일 항목을 암묵 선택하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/experimental-pet.js` | 584줄. `{key, displayName, selected}` catalog와 explicit `petKey` override를 추가하고 image read와 catalog manifest read를 분리했다. |
| `docs/experimental-full-profile-v2.schema.json` | 470줄. safe reason enum에 `selected_pet_selection_unavailable`을 추가했다. |
| `src/index.d.ts` | 168줄. 신규 reason과 `ExperimentalPetCatalogItem` type을 추가했다. |
| `src/__tests__/experimental-pet.test.js` | 510줄. multiple catalog, privacy, explicit key 우선순위, invalid/stale key와 no-implicit-fallback 테스트를 추가했다. |
| `src/__tests__/experimental-profile.test.js` | 651줄. v2 normalizer가 selection unavailable reason을 allowlist 보존하는 회귀 사례를 추가했다. |

## 본문 변경 정도 / 본문 무손실 여부

기존 `readExperimentalPet()`의 option 없는 경로는 Desktop `selected-avatar-id`를 authoritative 기본값으로 사용하는 동작을 유지한다. State unavailable, built-in selection 또는 selected manifest 부재 시 기존 safe reason을 반환하며 설치 pet의 수와 무관하게 자동 fallback하지 않는다.

`listExperimentalPets()`는 directory entry의 code-point 순서로 valid bounded manifest를 정렬해 1-based key를 부여한다. Public item에는 key, bounded/control-free display name 또는 null, Desktop selected boolean만 포함하고 raw directory ID, path, manifest 원문, image metadata·bytes를 포함하지 않는다. Malformed·oversized manifest는 catalog에서 제외하며 duplicate display name은 key로 구분한다.

`readExperimentalPet({petKey})`는 positive safe integer가 current catalog item을 가리킬 때 Desktop 선택보다 우선한다. 숫자를 path segment로 사용하지 않고 내부 enumerated entry를 통해 기존 containment·bounded image reader로 연결한다. Invalid 또는 stale key는 다른 항목으로 fallback하지 않고 `selected_pet_selection_unavailable` fixed shape를 반환한다.

`src/experimental-profile.js`는 Stage 2에서 이미 shared `EXPERIMENTAL_PET_REASONS`를 import하므로 source 수정 없이 신규 reason을 runtime allowlist에 반영했다. Full Profile v1 runtime, schema와 complete fixture hash, CLI/client/formatter, README/docs와 package metadata는 변경하지 않았다.

## 검증 결과

실행 명령:

```bash
node --test src/__tests__/experimental-pet.test.js src/__tests__/experimental-profile.test.js
npm test
node --test --test-name-pattern='lists multiple custom pets without exposing source identifiers|uses an explicit catalog key before Desktop selection|does not implicitly select the only installed custom pet' src/__tests__/experimental-pet.test.js
rg -n 'listExperimentalPets|petKey|displayName|selected_pet_selection_unavailable|ExperimentalPetCatalog' src/experimental-pet.js src/experimental-profile.js src/index.d.ts docs/experimental-full-profile-v2.schema.json src/__tests__/experimental-pet.test.js src/__tests__/experimental-profile.test.js
<구현계획서 Stage 2.5의 privacy scan 명령>
git diff --exit-code HEAD^ -- docs/experimental-full-profile.schema.json
git diff --exit-code origin/main -- src/cli.js src/experimental-profile-client.js src/format-experimental-profile.js README.md docs/experimental-full-profile.md docs/downstream-integration.md package.json
git diff --check
```

추가 실제 local smoke:

```bash
node --input-type=module -e '<catalog item shape·selected count와 explicit key image integrity의 sanitized 검사>'
```

결과:

- OK: pet reader/catalog 테스트 12개와 profile contract 테스트 17개가 모두 통과했다.
- OK: 전체 회귀 테스트 152개가 모두 통과했다.
- OK: focused catalog/key/no-implicit-fallback 테스트 3개가 모두 통과했다.
- OK: multiple pet의 결정적 1-based key, selected marker, duplicate/null display name과 malformed/oversized manifest 제외를 확인했다.
- OK: explicit key가 Desktop selected보다 우선하고 invalid/stale/non-integer key는 selection unavailable로 축약됐다.
- OK: state가 없는 single installed custom pet은 기본 reader에서 선택되지 않고 explicit key를 전달한 경우에만 읽혔다.
- OK: catalog serialization에 synthetic source identifier, path와 spritesheet marker가 포함되지 않았고 image가 없는 valid manifest도 목록화됐다.
- OK: 실제 설치 catalog를 이름·ID 없이 조회하고 explicit key로 실제 image의 bounded metadata, digest length와 base64 length를 sanitized 검증했다.
- OK: Full Profile v1 schema에 diff가 없고 CLI/client/formatter, 공식 문서와 package metadata 보호 경로가 유지됐다.
- OK: `git diff --check`가 whitespace error 없이 통과했다.

## 잔여 위험

- Catalog key는 현재 설치 목록의 정렬 결과이므로 pet 설치·삭제 시 달라질 수 있으며 영구 identity로 사용할 수 없다.
- Display name은 local user metadata이므로 Stage 3 CLI prompt와 public module에서만 명시적으로 노출하고 Full Profile v2 payload에는 추가하지 않아야 한다.
- 방향키 selector, TTY 복원, JSON no-prompt와 module callback orchestration은 Stage 3에 남아 있다.

## 다음 단계 영향

- Stage 3 client는 explicit key, forced selector, Desktop selected, human fallback selector 순서로 catalog/key API를 조합해야 한다.
- 기본 `profile --include-pet`은 usable Desktop selection이 있으면 prompt 없이 사용하고, human TTY에서만 unavailable 결과 후 selector fallback을 허용해야 한다.
- `profile --json --include-pet`은 `--select-pet`이 명시된 TTY 외에는 prompt하지 않아야 한다.
- Experimental module subpath는 catalog item key가 호출 시점 selector임을 type과 공식 문서에 명시해야 한다.

## 승인 요청

- Stage 2.5 Desktop-default custom pet catalog와 explicit key 계약 및 검증 결과를 승인하면 Stage 3 CLI·client·selector·module·공식 문서 통합으로 진행한다.

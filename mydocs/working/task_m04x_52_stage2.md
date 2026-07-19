# Task M04x #52 Stage 2 완료보고서

GitHub Issue: [#52](https://github.com/postmelee/codex-usage-analyzer/issues/52)
구현계획서: [`task_m04x_52_impl.md`](../plans/task_m04x_52_impl.md)
Stage: 2

## 단계 목적

기존 Full Profile v1 계약과 출력 필드 순서를 보존하면서, 선택된 custom pet fixed-shape object를 required root field로 포함하는 Full Profile v2 runtime 계약·self-contained JSON Schema·type-only interface를 추가한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/experimental-profile.js` | 603줄. v1 normalizer를 재사용하는 v2 normalizer/factory, source status matrix와 pet/image allowlist 검증을 추가했다. |
| `docs/experimental-full-profile-v2.schema.json` | 468줄. Account Usage, profile, activity, pet을 포함하는 self-contained draft-07 schema를 추가했다. |
| `src/index.d.ts` | 161줄. Full Profile v1/v2 envelope와 pet/image discriminated type을 추가했다. |
| `src/__tests__/experimental-profile.test.js` | 648줄. v1 baseline, v2 field/status/allowlist/schema 계약을 포함한 6개 테스트를 추가했다. |

## 본문 변경 정도 / 본문 무손실 여부

기존 v1 constant, normalizer, unavailable factory와 envelope field order는 변경하지 않았다. v1 schema는 byte 단위로 수정하지 않았으며 SHA-256 baseline과 complete synthetic fixture 직렬화 SHA-256을 회귀 테스트로 고정했다. 기존 CLI, profile client/formatter, README, 공식 계약 설명, downstream guide와 package metadata도 수정하지 않았다.

v2는 `fullProfileContractVersion: 2`와 required `pet`을 추가한다. Remote source와 pet source가 모두 `ok`일 때 root는 `ok`, 둘 다 `unavailable`일 때 root는 `unavailable`, 그 밖의 조합은 `partial`이다. Pet object와 image는 field allowlist로 재구성하고 unknown field를 폐기한다. Invalid pet object는 원본 상세를 복사하지 않고 `selected_pet_state_unavailable` fixed shape로 축약한다.

Image 계약은 `spritesheet`, WebP/PNG, 양의 정수 dimension·byte length, lowercase SHA-256, canonical base64를 요구한다. Runtime은 dimension/pixel/byte 제한, decoded byte length와 digest까지 재검증한다. JSON Schema는 reason/content-type enum, integer range, digest/base64 pattern과 모든 object의 `additionalProperties: false`를 선언한다.

`src/index.d.ts` 변경은 type-only export이며 JavaScript package root export에는 새 runtime symbol을 추가하지 않았다.

## 검증 결과

실행 명령:

```bash
node --test src/__tests__/experimental-profile.test.js
npm test
node --input-type=module -e '<v1/v2 discriminator와 v2 required pet 검사>'
rg -n 'FullProfileV2|ExperimentalPet|fullProfileContractVersion|selected_pet_|image/webp|image/png' src/experimental-profile.js src/index.d.ts docs/experimental-full-profile-v2.schema.json src/__tests__/experimental-profile.test.js
<구현계획서 Stage 2의 privacy scan 명령>
git diff --exit-code HEAD^ -- docs/experimental-full-profile.schema.json
git diff --exit-code origin/main -- src/cli.js src/experimental-profile-client.js src/format-experimental-profile.js README.md docs/experimental-full-profile.md docs/downstream-integration.md package.json
git diff --check
```

추가 schema 검증:

```bash
python3 -c '<Draft7Validator schema check와 synthetic valid/invalid envelope 검사>'
```

결과:

- OK: experimental profile 전용 테스트 17개가 모두 통과했다.
- OK: 전체 회귀 테스트 149개가 모두 통과했다.
- OK: v1 discriminator는 1, v2 discriminator는 2이며 v2만 root `pet`을 required로 선언한다.
- OK: v1 schema SHA-256과 complete v1 synthetic fixture 직렬화 SHA-256 baseline이 유지됐다.
- OK: v2 status matrix 5개 조합과 unavailable factory 조합이 기대 상태를 반환했다.
- OK: unknown/invalid pet field, byte length, digest와 base64가 결과에 복사되지 않고 safe unavailable shape로 축약됐다.
- OK: draft-07 schema 자체 검증, 정상 synthetic v2 envelope 허용, invalid pet 조합과 unknown root field 거부를 확인했다.
- OK: schema와 테스트에서 실제 사용자 경로 및 대표 token/credential pattern이 검출되지 않았다.
- OK: 기존 v1 schema와 Stage 3 보호 파일에 의도하지 않은 diff가 없다.
- OK: `git diff --check`가 whitespace error 없이 통과했다.

## 잔여 위험

- v2 runtime과 schema는 아직 CLI/client에 연결되지 않아 사용자가 생성할 수 없다.
- JSON Schema는 width와 height 각각의 상한은 표현하지만 두 값의 곱에 대한 pixel 상한과 base64 decoded byte/digest 일치는 표현하지 못하며 runtime 재검증에 의존한다.
- Full Profile v2는 experimental 계약이므로 향후 변경 가능하지만, v1 opt-out 경로는 계속 exact regression으로 보호해야 한다.

## 다음 단계 영향

- Stage 3는 `profile --include-pet`에서만 Stage 1 reader를 호출하고 Stage 2 v2 normalizer로 결합해야 한다.
- Pet flag가 없으면 기존 client dependency 호출 형태, v1 JSON과 human output을 그대로 유지해야 한다.
- Human Pet section은 base64/digest 자체를 출력하지 않고 availability, kind, content type, dimension과 byte length만 보여야 한다.
- README와 downstream guide는 base64의 민감성, strict decode/revalidation/re-encode/re-host와 공개 동의·삭제/철회 절차를 명시해야 한다.

## 승인 요청

- Stage 2 Full Profile v2 pet 계약과 검증 결과를 승인하면 Stage 3 CLI·client·human output·공식 문서 통합으로 진행한다.

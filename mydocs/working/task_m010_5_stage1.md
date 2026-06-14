# Task M010 #5 Stage 1 완료 보고서

GitHub Issue: [#5](https://github.com/postmelee/codex-usage-analyzer/issues/5)
구현계획서: [`task_m010_5_impl.md`](../plans/task_m010_5_impl.md)
Stage: 1

## 단계 목적

Stage 1은 `codexAssets.avatar`와 `codexAssets.pet` parser를 구현하기 전에 local asset source 후보와 safe output contract를 확정하고, Stage 2가 사용할 synthetic fixture를 고정하는 단계다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/__tests__/fixtures/assets/README.md` | safe pet source fixture의 목적과 기대 contract를 기록했다. |
| `src/__tests__/fixtures/assets/pets/safe-pet.png` | binary가 아닌 text placeholder로 safe pet candidate fixture를 추가했다. |
| `src/__tests__/fixtures/assets-empty/README.md` | allowlisted source가 없는 unavailable fixture contract를 기록했다. |
| `src/__tests__/fixtures/assets-unsafe/README.md` | generated image 후보를 unsafe/excluded로 처리해야 하는 fixture contract를 기록했다. |
| `src/__tests__/fixtures/assets-unsafe/generated_images/private-image.png` | binary가 아닌 text placeholder로 unsafe generated image candidate fixture를 추가했다. |
| `mydocs/plans/task_m010_5_impl.md` | Stage 2 `assetRef` 정책을 raw path/file name/hash를 출력하지 않는 logical reference로 보수화했다. |
| `mydocs/working/task_m010_5_stage1.md` | Stage 1 source contract, fixture contract, 검증 결과를 기록했다. |

## 본문 변경 정도 / 본문 무손실 여부

기존 production code와 schema는 수정하지 않았다. Fixture 파일은 새 root로 분리해 기존 parser/skill-plugin fixtures와 충돌하지 않게 추가했다. `.png` 확장자를 가진 fixture 파일은 실제 이미지 binary가 아니라 text placeholder이며, Stage 2 parser가 file content를 읽지 않는다는 계약을 고정하기 위한 것이다.

## Source Contract 판단

실제 local metadata는 파일 내용 없이 존재 여부, 파일 수, 하위 디렉터리 수, 확장자 count만 확인했다. raw local absolute path, 파일명, image binary, account identifier, credential은 문서에 기록하지 않았다.

| source 후보 | 실제 metadata 요약 | Stage 1 판단 | Stage 2 적용 |
|---|---:|---|---|
| `<codex-home>/pets/` | directory 존재, file 후보 `0`개 | pet의 유일한 allowlisted local source 후보로 둔다. 현재 환경에서 absence는 product-level null을 의미하지 않는다. | directory가 없거나 후보가 없으면 pet unavailable diagnostic. 후보가 있으면 safe candidate로 검토한다. |
| `<codex-home>/generated_images/` | directory 존재, `.png` file 후보 `12`개, 하위 directory `4`개 | user/private generated artifact일 가능성이 높아 기본 avatar/pet source에서 제외한다. | excluded/unsafe candidate count로만 진단 가능. core `codexAssets`로 승격하지 않는다. |
| remote profile image URL | local metadata source 아님 | analyzer-owned source가 아니다. | 기본 analyzer는 수집하지 않는다. wrapper/product 영역으로 둔다. |
| GitHub avatar/profile image | local metadata source 아님 | analyzer-owned source가 아니다. | 기본 analyzer는 수집하지 않는다. wrapper/product 영역으로 둔다. |
| sample fixture avatar URL | packaged sample only | production fallback으로 사용하면 안 된다. | `--fixture-sample` 전용으로 유지한다. |

## Safe Output Contract

Stage 2 구현은 다음 계약을 따른다.

- `pets/`만 local pet source 후보로 allowlist한다.
- `generated_images/`는 private artifact 후보로 보고 기본 `codexAssets`에서 제외한다.
- avatar는 safe local source가 확인되지 않았으므로 기본 analyzer에서 추론하지 않는다.
- image binary content를 읽지 않고, 기본 output에 `data:image`를 넣지 않는다.
- raw local absolute path, file name, file-name hash, account URL은 core field와 diagnostics에 넣지 않는다.
- safe pet이 발견되면 `codexAssets`는 schema-valid 형태로 `avatar: null`, `pet: { kind: "codex-asset", url: null, assetRef: "codex-local:pet:primary", contentType }`를 반환할 수 있다.
- `contentType`은 extension allowlist에서만 추론한다. Stage 2 기본 allowlist는 `.png`, `.jpg`, `.jpeg`, `.webp`로 둔다.
- source가 없거나 unsafe source만 있으면 `codexAssets`를 생략하고 diagnostics에 reason을 남긴다.

Stage 2 diagnostics contract:

- `status`: `ok` 또는 `unavailable`
- `reason`: `null`, `no_safe_asset_source`, `no_pet_candidates`, `avatar_source_not_owned`, `unsafe_sources_excluded` 등
- `source`: `option`/`env`/`default`
- `avatar.status`, `avatar.reason`
- `pet.status`, `pet.reason`
- `safeCandidateCount`
- `excludedCandidateCount`
- `contentTypes`

Diagnostics에는 raw path, file name, image content, data URL, account identifier를 넣지 않는다.

## Fixture Contract

| fixture root | 목적 | 기대 결과 |
|---|---|---|
| `src/__tests__/fixtures/assets/` | safe pet candidate가 있는 synthetic Codex home | pet safe source를 발견할 수 있다. avatar는 추론하지 않는다. |
| `src/__tests__/fixtures/assets-empty/` | allowlisted source가 없는 synthetic Codex home | `codexAssets`는 sample 값으로 fallback하지 않고 unavailable diagnostic을 반환한다. |
| `src/__tests__/fixtures/assets-unsafe/` | generated image만 있는 synthetic Codex home | generated image는 excluded/unsafe로 집계하고 core `codexAssets`로 승격하지 않는다. |

## 검증 결과

실행 명령:

```bash
npm test
! rg -n "/Users/|/home/|/private/var/|access_token|refresh_token|Bearer |sk-|github_pat_|data:image|profile_picture|githubAvatar" src/__tests__/fixtures/assets src/__tests__/fixtures/assets-empty src/__tests__/fixtures/assets-unsafe
git diff --check
```

결과:

- OK: `npm test` 통과. `21`개 테스트 중 `21`개 통과.
- OK: fixture privacy review 통과. pattern match 없음.
- OK: `git diff --check` 통과.

수동 확인:

- OK: fixture `.png` 파일은 실제 image binary가 아니라 text placeholder다.
- OK: fixture 문서에 generated image source를 unsafe/excluded로 다루는 contract가 명시됐다.
- OK: Stage 2 `assetRef`는 local path, file name, file-name hash를 출력하지 않는 logical reference로 정리됐다.

## 잔여 위험

- 현재 local `<codex-home>/pets/`에는 파일 후보가 없어 실제 smoke에서 pet이 unavailable일 가능성이 높다.
- `codex-local:pet:primary`는 안전한 logical reference지만 실제 파일 resolver나 upload/storage를 제공하지 않는다. wrapper가 asset export를 원하면 별도 opt-in 설계가 필요하다.
- generated images를 제외하므로, 사용자가 기대하는 avatar/pet과 analyzer 결과가 다를 수 있다.
- avatar는 local safe source가 확인되지 않아 Stage 2/3에서 기본적으로 unavailable 또는 wrapper-owned diagnostic으로 남을 수 있다.

## 다음 단계 영향

- Stage 2는 `asset-aggregate`를 구현하되 file content를 읽지 않고 metadata와 extension allowlist만 사용한다.
- Stage 2는 safe pet fixture, empty fixture, unsafe generated image fixture를 모두 테스트해야 한다.
- Stage 2는 diagnostics에 count/reason만 남기고 raw path/file name/data URL/account URL을 출력하지 않아야 한다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2 asset aggregate 구현으로 진행한다.

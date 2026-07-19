# Task #52 Stage 4 단계 보고서

GitHub Issue: [#52](https://github.com/postmelee/codex-usage-analyzer/issues/52)
구현계획서: [`task_m04x_52_impl.md`](../plans/task_m04x_52_impl.md)
Stage: 4

## 단계 목적

Stage 1~3에서 구현한 custom pet opt-in을 실제 로컬 Codex 환경에서 원문과
identity를 노출하지 않는 방식으로 검증한다. v1 no-pet 회귀, v2 Desktop
선택 기본 경로, catalog 명시 key, 실제 image bytes의 digest/base64 무결성,
패키지 artifact와 문서 링크를 확인하고 Tokenmon downstream 인계 내용을
확정한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m04x_52_stage4.md` | sanitized 실제 smoke 결과와 Tokenmon 인계 체크리스트 작성 |
| `mydocs/plans/task_m04x_52_impl.md` | Stage 4 변경 범위 정규식이 test 하위 파일을 허용하도록 `src/__tests__/.*`로 오타 보정 |

## 본문 변경 정도 / 본문 무손실 여부

제품 source, test, public contract/schema와 공식 사용자 문서는 수정하지
않았다. Stage 4는 기존 산출물의 실제·구조·패키지 검증만 수행했다.

구현계획서 변경은 허용 범위에 `src/__tests__/` 디렉터리 자체만 일치하고
하위 파일은 모두 false positive로 출력하던 정규식 한 곳을 의도대로
`src/__tests__/.*`로 보정한 것이다. 제품 범위나 검증 강도를 변경하지 않았다.

## 검증 결과

실행 명령:

```bash
npm test
node bin/codex-usage-analyzer.js profile --help
node bin/codex-usage-analyzer.js --version
node --input-type=module -e '<실제 profile v1을 raw output 없이 구조만 검사>'
node --input-type=module -e '<실제 Desktop-default profile v2를 raw output 없이 구조만 검사>'
node --input-type=module -e '<실제 catalog shape와 explicit-key image integrity를 이름·ID 없이 검사>'
node --input-type=module -e '<실제 explicit-key Full Profile v2의 decoded length와 SHA-256을 raw output 없이 검사>'
node --test --test-name-pattern='<Desktop selected, human fallback, forced selector, explicit key, safe human metadata>' src/__tests__/cli.test.js src/__tests__/experimental-profile-client.test.js src/__tests__/format-experimental-profile.test.js
npm pack --cache /private/tmp/codex-usage-analyzer-task52-npm-cache --dry-run --json
node --input-type=module -e '<공식 문서 상대 링크 검사>'
if git diff --name-only origin/main...HEAD | rg -v '<승인 범위 정규식>'; then exit 1; fi
git diff --check
git status --short
```

결과:

- OK: 전체 회귀 test 178개가 통과했고 실패·skip은 0개다.
- OK: 실제 `profile --json`은 Full Profile v1이며 `pet` root field가 없고
  정상 종료했다. pet opt-in 없는 기존 경로를 유지했다.
- OK: 실제 `profile --json --include-pet`은 Full Profile v2를 반환했다.
  현재 Desktop state는 custom pet 선택을 식별하지 못해 pet unavailable,
  root partial로 안전하게 축약했으며 설치된 pet을 암묵 선택하지 않았다.
- OK: 실제 catalog는 비어 있지 않았고 모든 key가 positive safe integer,
  selected가 boolean이었다. 이름, source ID와 path는 출력하지 않았다.
- OK: 실제 catalog의 명시 key reader가 bounded WebP image를 반환했다.
  digest 길이는 64, base64는 decoded byte length와 일치했다.
- OK: 동일 명시 key를 실제 `profile --json --include-pet --pet-key N`에
  전달한 end-to-end Full Profile v2는 pet/root `ok`였다. dimensions는
  bounds 안에 있었고 decoded byte length와 SHA-256이 envelope metadata와
  모두 일치했다.
- OK: 두 실제 profile smoke의 serialization에 local path, data URL 또는
  credential marker가 없었다. raw profile JSON, identity, base64, digest와
  local source 값은 보고서에 기록하지 않았다.
- OK: synthetic focused test 9개가 Desktop selected, human TTY fallback,
  forced selector, explicit key와 base64/digest를 숨기는 human Pet section을
  재확인했다.
- OK: package dry-run은 28개 artifact를 포함했다. v2 schema, experimental
  subpath, pet reader와 selector는 포함하고 test/fixture/`mydocs`는 제외했다.
- OK: 공식 문서 상대 링크, 승인 변경 범위와 whitespace 검사가 통과했다.
- 참고: sandbox 안의 실제 app-server는 `APP_SERVER_EXITED`로 종료되어 동일
  smoke를 로컬 실행 권한으로 재실행했고 성공했다. 제품 오류로 분류하지 않았다.

## Tokenmon 인계 체크리스트

### 의존 버전과 진입점

- 현재 analyzer package metadata는 `codex-usage-analyzer@0.4.0`이다. 이
  task는 version bump와 npm publish를 수행하지 않으므로, Tokenmon은 analyzer
  PR이 merge되고 이 변경을 포함한 release가 게시된 뒤 그 release version을
  pin해야 한다. 기존 registry의 같은 표기만 보고 기능 포함을 가정하면 안 된다.
- CLI 기본 선택: `codex-usage-analyzer profile --json --include-pet`
- CLI 명시 선택: `codex-usage-analyzer profile --json --include-pet --pet-key N`
- CLI 강제 선택: `codex-usage-analyzer profile --include-pet --select-pet`
  (`stdin`과 `stderr` TTY 필요)
- Module import: `codex-usage-analyzer/experimental-profile`
- Runtime export: `readExperimentalProfile`, `listExperimentalPets` 두 개다.
- Type 진실 원천: `src/experimental-profile-api.d.ts`
- Schema 진실 원천: `docs/experimental-full-profile-v2.schema.json`

### 선택 의미

- 기본은 Codex Desktop에서 이미 선택된 custom pet이다.
- 명시 `petKey`가 가장 우선하고, forced selector, Desktop selected, human
  fallback selector 순으로 평가한다.
- JSON은 `--select-pet`이 없으면 prompt하지 않는다.
- `listExperimentalPets()` item은 `{key, displayName, selected}`뿐이며 image를
  읽지 않는다. `key`는 현재 catalog snapshot의 1-based selector이지 영구 ID가
  아니다.
- state가 없거나 built-in pet이면 첫 항목이나 유일 항목으로 fallback하지
  않는다. 취소·invalid/stale key도 selection unavailable로 처리한다.

### 계약과 상태

- pet opt-in이 없으면 Full Profile v1이고 `pet` field가 없다.
- pet opt-in이면 Full Profile v2이고 `pet` field가 required다.
- available pet fixed shape: `status: "ok"`, `reason: null`, `kind: "custom"`,
  `image: {role, contentType, width, height, byteLength, sha256, base64}`.
- unavailable pet fixed shape: `status: "unavailable"`, allowlisted `reason`,
  `kind: null`, `image: null`.
- root status는 profile과 pet이 모두 ok면 `ok`, 둘 다 unavailable이면
  `unavailable`, 나머지는 `partial`이다.
- CLI exit는 root unavailable만 `1`이고 root ok/partial은 `0`이다. Official
  usage read 자체가 실패하면 envelope 없이 safe error와 `1`이다.

Synthetic available 예시:

```json
{
  "status": "ok",
  "reason": null,
  "kind": "custom",
  "image": {
    "role": "spritesheet",
    "contentType": "image/png",
    "width": 1,
    "height": 1,
    "byteLength": 68,
    "sha256": "431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460",
    "base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
  }
}
```

Synthetic unavailable 예시:

```json
{
  "status": "unavailable",
  "reason": "selected_pet_selection_unavailable",
  "kind": null,
  "image": null
}
```

### 수신 검증과 보안

- 허용 content type은 `image/png`, `image/webp`다.
- analyzer source bounds는 state 1 MiB, manifest 64 KiB, image 8 MiB,
  한 변 8192 이하, 총 16,777,216 pixel 이하다. Tokenmon은 자체 request/body
  limit도 별도로 적용해야 한다.
- strict/canonical base64 decode 후 decoded length와 `byteLength`, lowercase
  SHA-256을 검증한다.
- magic/content type, dimensions, pixel bounds를 재검증하고 유지보수되는 image
  library로 full decode해야 한다.
- source bytes를 public data URL로 직접 노출하거나 raw envelope/base64를
  log하면 안 된다. metadata를 제거하고 안전한 형식으로 재인코딩한 뒤
  downstream-owned URL로 re-host한다.
- pet은 identity나 ownership proof가 아니라 cosmetic source다. GitHub account
  binding 등 Tokenmon의 기존 ownership 체계를 유지한다.
- v2가 제공하는 것은 단일 portrait가 아니라 전체 `spritesheet`다. Tokenmon이
  정적 portrait crop 또는 animation을 원하면 frame/layout 해석을 별도 task로
  명시해야 하며 현재 계약에서 임의 crop 위치를 추론하면 안 된다.
- profile/activity 동의와 별도로 local image byte upload·보관·공개 동의를
  받는다. replace/revoke/delete 시 source, re-encoded asset, rendered card와
  cache/content reference를 함께 제거한다.

### 인계 시점

- analyzer final report, PR과 release가 완료되기 전에는 Tokenmon 저장소 변경이나
  Issue 생성을 시작하지 않는다.
- release 후 위 체크리스트를 Tokenmon Issue 본문으로 전달하고, Tokenmon 쪽
  계획은 dependency pin → v2 validation → private storage → re-encode/re-host →
  profile opt-in UI → revoke/delete 순서로 작성한다.

## 잔여 위험

- 현재 Desktop state가 selected custom pet key를 제공하지 않는 환경에서는
  JSON 기본 호출이 unavailable인 것이 정상이다. 실제 기본 selected available
  경로는 synthetic fixture로 검증했지만, Desktop upstream state 형식 변화는
  계속 safe unavailable로 축약해야 한다.
- private profile endpoint와 local Desktop state는 upstream 안정성 계약이 없다.
- spritesheet frame/layout은 Full Profile v2의 범위가 아니다. Tokenmon이 단일
  portrait나 animation을 사용하려면 별도 consumer contract가 필요하다.
- package metadata는 아직 `0.4.0`이고 publish되지 않았다. downstream 인계는
  실제 release 식별자가 확정된 뒤 갱신해야 한다.

## 다음 단계 영향

- 구현 Stage는 모두 완료됐다. 다음 승인을 받으면 최종 보고 SKILL 절차로
  최종 보고서, 오늘할일 완료 처리, publish branch, push와 PR 생성을 수행한다.
- Tokenmon Issue/작업은 analyzer PR merge와 release 확인 후 별도로 인계한다.

## 승인 요청

- Stage 4 실제 sanitized smoke, package 검증과 Tokenmon 인계 체크리스트를
  승인하면 최종 보고·PR 단계로 진행한다.

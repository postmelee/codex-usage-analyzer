# Task M04x #52 Stage 1 완료보고서

GitHub Issue: [#52](https://github.com/postmelee/codex-usage-analyzer/issues/52)
구현계획서: [`task_m04x_52_impl.md`](../plans/task_m04x_52_impl.md)
Stage: 1

## 단계 목적

Codex Desktop의 선택된 custom pet만 명시적으로 읽는 내부 reader를 구현한다. 선택 상태를 확인할 수 없거나 built-in pet이 선택된 경우에는 설치된 다른 pet으로 대체하지 않으며, state·manifest·image의 크기와 경로를 제한하고 실패 상세를 allowlisted reason으로 축약한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/experimental-pet.js` | 485줄. 선택 상태 확인, custom manifest 탐색, 경로 containment, bounded read, PNG/WebP 검증과 fixed-shape 결과를 구현했다. |
| `src/__tests__/experimental-pet.test.js` | 394줄. 성공, source 우선순위, 상태·manifest·경로·image 실패와 PNG/WebP variant를 검증하는 9개 테스트를 추가했다. |
| `src/__tests__/fixtures/experimental-pet/selected-custom.json` | 10줄. runtime fixture 조립에 사용하는 synthetic custom pet metadata를 추가했다. |
| `src/__tests__/fixtures/experimental-pet/README.md` | 6줄. 실제 사용자 데이터와 바이너리를 저장하지 않는 fixture 정책을 기록했다. |

## 본문 변경 정도 / 본문 무손실 여부

신규 내부 모듈과 전용 테스트·synthetic fixture만 추가했다. 기존 `profile`, `profile --json`, CLI, public type, schema, README/docs와 package metadata는 변경하지 않아 Full Profile v1 동작과 공개 API는 보존됐다.

Reader는 `codexHome` 주입값, `CODEX_HOME`, 사용자 홈의 `.codex` 순으로 source root를 정한다. `.codex-global-state.json`의 `electron-persisted-atom-state.selected-avatar-id`만 authoritative selection으로 사용하고 `custom:` 선택만 허용한다. 선택 directory는 열거 결과의 exact match로 찾으며 raw custom ID를 경로에 직접 결합하지 않는다.

State 1 MiB, manifest 64 KiB, image 8 MiB, 한 변 8192 px, 전체 16,777,216 pixels 제한을 적용했다. Symlink·절대 경로·상위 경로 이동·control character를 거부하고, lstat/open/fstat/read/fstat와 realpath containment를 거친 뒤 PNG 또는 WebP magic·dimension을 확인한다. 성공 결과에만 SHA-256과 base64를 포함하며 모든 실패는 fixed-shape `unavailable`과 allowlisted reason으로 반환한다.

Read-only source audit에서는 Desktop bundle에 selection key, custom prefix와 spritesheet manifest field가 존재함을 확인했다. 로컬 상태에 authoritative selection key가 없는 경우도 확인했으며, 이를 다른 설치 pet 선택으로 대체하지 않고 `selected_pet_state_unavailable`로 처리하도록 유지했다. 실제 경로, 선택 ID와 이미지 내용은 출력하거나 문서화하지 않았다.

## 검증 결과

실행 명령:

```bash
node --test src/__tests__/experimental-pet.test.js
npm test
node --test --test-name-pattern='reads one selected custom WebP spritesheet with bounded metadata' src/__tests__/experimental-pet.test.js
<구현계획서 Stage 1의 privacy scan 명령>
git diff --exit-code origin/main -- src/cli.js src/experimental-profile-client.js src/experimental-profile.js src/format-experimental-profile.js src/index.d.ts README.md docs package.json
git diff --check
```

결과:

- OK: 전용 테스트 9개가 모두 통과했다.
- OK: 전체 회귀 테스트 143개가 모두 통과했다.
- OK: runtime 생성 WebP success fixture를 대상으로 한 집중 smoke 1개가 통과했다.
- OK: 테스트·fixture·단계 보고서에서 실제 사용자 경로와 대표 token/credential pattern이 검출되지 않았다.
- OK: 기존 CLI, profile client/normalizer/formatter, public type, README/docs와 package metadata에 `origin/main` 대비 diff가 없다.
- OK: `git diff --check`가 whitespace error 없이 통과했다.

## 잔여 위험

- Desktop의 local state와 custom pet manifest는 공식 공개 계약이 아니므로 향후 app version에서 key 또는 저장 구조가 바뀌면 안전하게 `unavailable`이 될 수 있다.
- Stage 1 reader는 아직 Full Profile 응답, CLI flag 또는 package export에 연결되지 않았다.
- PNG/WebP는 안전한 헤더와 dimension만 확인하며 전체 image decode 또는 animation frame 의미 검증은 수행하지 않는다.

## 다음 단계 영향

- Stage 2는 이 reader의 fixed-shape 결과를 Full Profile v2의 `pet` 계약과 JSON Schema에 반영한다.
- Full Profile v1 필드 집합과 기존 profile 명령 출력은 그대로 유지하고, pet opt-in 경로만 v2를 생성해야 한다.
- Stage 2 schema/type 테스트는 Stage 1의 status, reason, image content type과 제한 상수를 단일 의미로 유지해야 한다.

## 승인 요청

- Stage 1 selected custom pet bounded reader와 검증 결과를 승인하면 Stage 2 Full Profile v2 pet 계약 구현으로 진행한다.

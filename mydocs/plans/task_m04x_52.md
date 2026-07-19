# Task M04x #52 수행계획서

GitHub Issue: [#52](https://github.com/postmelee/codex-usage-analyzer/issues/52)
마일스톤: M04x

## 목적

현재 명시적 opt-in 실험 기능인 `profile`에 `--include-pet` 옵션을 추가해, 사용자가 별도로 동의한 경우에만 선택된 custom Codex pet의 제한된 메타데이터와 이미지 payload를 제공한다. 플래그 없는 `profile`과 `profile --json`은 기존 Full Profile v1 계약과 동작을 그대로 유지하고, pet opt-in 결과는 별도의 Full Profile v2 계약으로 구분한다.

완료된 계약과 synthetic fixture는 downstream인 `postmelee/tokenmon`이 pet 이미지를 검증·재호스팅해 카드의 `portraitImage`로 연결할 수 있는 인계 자료로 정리한다. Tokenmon 저장소의 실제 구현은 이번 task에 포함하지 않는다.

## 배경

현재 package의 기본 usage 경로는 공식 `account/usage/read`만 사용하며 identity-free Account Usage Contract v1을 반환한다. 별도 `profile` 명령은 Issue #46에서 구현된 unsupported private profile endpoint 기반의 명시적 opt-in 기능으로, Full Profile v1에는 display name, username, avatar URL, plan과 activity insight만 포함되고 pet 필드는 없다.

Issue #5에서는 과거 v0.1.0 local analyzer가 Codex home의 pet manifest와 선택 상태를 best-effort로 탐색했지만, Issue #32의 thin CLI 전환에서 local source와 asset aggregate가 제거됐다. 현재 설치 환경에서는 custom pet manifest와 spritesheet 후보가 존재하더라도 과거 선택 상태 key가 그대로 유지된다고 보장할 수 없으므로, 현재 Codex Desktop source 구조와 선택 의미를 다시 확인해야 한다. 실제 사용자 데이터, custom pet ID, 로컬 경로, 이미지 원문은 조사 문서와 로그에 기록하지 않는다.

## 범위

### 포함

- 현재 Codex home의 custom pet manifest, spritesheet, 선택 상태 source를 privacy-safe하게 재검토한다.
- `profile --include-pet` CLI parsing, help, 실험 경고, human/JSON 출력 의미를 정의하고 구현한다.
- 플래그 없는 Full Profile v1을 그대로 유지하고, opt-in 출력용 Full Profile v2 runtime contract, JSON Schema, TypeScript 타입을 추가한다.
- 선택된 지원 custom pet에 한해 allowlisted content type, bounded byte length, decoded dimension, digest, bounded image payload를 제공한다.
- source 부재, 선택 불확실, manifest/path 오류, unsupported format, oversized payload를 `partial` 또는 `unavailable`로 안전하게 표현한다.
- raw local path, custom pet ID, auth/account context, 임의 generated image가 출력·오류·fixture·문서에 포함되지 않도록 한다.
- synthetic fixture, runtime/schema/type 정합성, CLI, privacy, package artifact 테스트를 추가한다.
- README, experimental Full Profile contract, downstream integration 문서를 갱신한다.
- analyzer 구현과 계약 확정 후 Tokenmon에 전달할 명령, schema/type, synthetic fixture, 상태 의미, 이미지 검증·재호스팅 요구사항을 정리한다.

### 제외

- Account Usage Contract v1과 기본 usage CLI/SDK 변경
- 플래그 없는 `profile`과 `profile --json`의 Full Profile v1 출력 변경
- 환경변수, 설정 파일, downstream 감지를 통한 암묵적 pet opt-in
- Codex built-in pet 이미지의 앱 번들 추출 또는 재배포
- 설치돼 있지만 선택 여부가 불확실한 custom pet의 임의 선택
- spritesheet animation renderer, 대표 frame 편집·생성, pet 생성·수정
- auth file, keychain, cookie, local session 직접 읽기
- Tokenmon 저장소의 수신 API, 저장소, UI 코드 구현
- npm publish, tag, GitHub Release와 배포 작업

## 설계 방향

- `profile --json`은 Full Profile v1을 반환하고, `profile --json --include-pet`만 버전이 구분된 Full Profile v2를 반환한다. v1 schema에 선택 필드를 끼워 넣지 않는다.
- pet source 접근은 `includePet: true`인 전용 경로에서만 수행한다. help, invalid argument, 기본 usage, 기존 profile 경로에서는 local pet file을 읽지 않는다.
- authoritative한 현재 선택 상태와 매칭되는 custom pet만 성공으로 본다. 선택 source를 확정할 수 없으면 기본 pet 또는 첫 manifest로 추측하지 않는다.
- manifest가 가리키는 상대 경로는 custom pet directory 내부로 제한하고 path traversal, symlink escape, unsupported extension/content mismatch를 방어한다.
- JSON image payload는 opt-in 계약 안에서도 엄격한 byte/dimension/content-type 한도를 적용하고, human output은 이미지 원문이나 경로를 출력하지 않는다. 정확한 field 이름과 한도는 source 조사 결과를 반영한 구현계획서에서 승인받는다.
- pet 실패는 이미 획득한 canonical usage나 remote profile을 폐기하지 않는다. 요청된 pet category의 실패가 root status와 exit code에 미치는 의미를 Full Profile v2 문서와 테스트에서 고정한다.
- Tokenmon은 제출된 이미지를 신뢰하지 않고 server-side decode, safe re-encode, stable HTTPS re-hosting, visibility/revocation/deletion 정책을 적용해야 한다. analyzer는 Tokenmon 전용 URL이나 credential을 받지 않는다.
- 실제 로컬 smoke는 raw JSON을 파일이나 문서에 남기지 않고 구조·상태·redaction 결과만 sanitized summary로 확인한다.

## 문서 위치 판단

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| `README.md` | 공식 사용자 문서 | CLI 사용자·기여자 | 저장소 루트 | `mydocs/manual/` | opt-in 명령, privacy warning, 간단한 사용법은 npm/GitHub 진입점에 있어야 한다. |
| `docs/experimental-full-profile.md` | 공식 실험 계약 문서 | CLI consumer·downstream | `docs/` | `mydocs/tech/` | v1/v2 구분, pet field, 상태·보안 의미는 공개 소비 계약이다. |
| `docs/experimental-full-profile-v2.schema.json` | 공식 machine-readable schema | downstream validator | `docs/` | 기존 v1 schema 덮어쓰기 | v1 schema를 보존하면서 v2를 명시적으로 구분해야 한다. 정확한 파일명은 구현계획서에서 최종 확인한다. |
| `docs/downstream-integration.md` | 공식 외부 통합 문서 | Tokenmon 등 downstream | `docs/` | Tokenmon 저장소 문서 | 이미지 검증·재호스팅·삭제 경계는 producer가 제공할 공개 인계 계약이다. |
| `mydocs/working/task_m04x_52_stage{N}.md` | 내부 단계 보고서 | 작업지시자·내부 작업자 | `mydocs/working/` | `docs/` | source 조사와 단계별 검증은 제품 계약이 아닌 작업 이력이다. |
| `mydocs/report/task_m04x_52_report.md` | 내부 최종 보고서 | 작업지시자·내부 작업자 | `mydocs/report/` | `docs/` | 구현 결과와 Tokenmon 인계 체크리스트를 task 이력으로 보존한다. |

## 예상 변경 파일

신규 후보:

- `src/experimental-pet.js`
- `docs/experimental-full-profile-v2.schema.json`
- pet source와 Full Profile v2 검증을 위한 synthetic fixture/test 파일

수정 후보:

- `src/cli.js`
- `src/experimental-profile-client.js`
- `src/experimental-profile.js`
- `src/format-experimental-profile.js`
- `src/index.d.ts`
- `src/__tests__/cli.test.js`
- `src/__tests__/experimental-profile-client.test.js`
- `src/__tests__/experimental-profile.test.js`
- `src/__tests__/format-experimental-profile.test.js`
- `src/__tests__/index.test.js`
- `README.md`
- `docs/experimental-full-profile.md`
- `docs/downstream-integration.md`
- `package.json`

이번 task 산출물:

- `mydocs/orders/20260719.md`
- `mydocs/plans/task_m04x_52.md`
- `mydocs/plans/task_m04x_52_impl.md`
- `mydocs/working/task_m04x_52_stage{N}.md`
- `mydocs/report/task_m04x_52_report.md`

예상 변경 파일은 source 조사와 구현계획서 승인 과정에서 기존 구조를 재사용하는 방향으로 축소하거나 조정할 수 있다. 제품/API 문서 위치가 바뀌는 경우 구현 전에 문서 위치 판단을 다시 승인받는다.

## 잠정 단계

- **Stage 1 — pet source와 Full Profile v2 계약 확정**
  - 현재 pet manifest, selected state, image structure를 민감값 없이 조사하고 v2 field/status/limit/compatibility를 고정한다.
  - built-in/custom/generated image 경계와 path·format·size·dimension 방어 기준을 fixture와 구현계획서에 반영한다.
- **Stage 2 — pet source reader와 Full Profile v2 normalization 구현**
  - opt-in에서만 동작하는 local reader, selected custom pet 검증, bounded image projection, v2 normalizer/schema/type을 구현한다.
  - source 오류와 privacy boundary를 synthetic fixture 단위 테스트로 검증한다.
- **Stage 3 — CLI·human output·문서·package 통합**
  - `--include-pet` parsing/help/warning, profile client 결합, human/JSON 출력, README와 공식 계약/downstream 문서를 통합한다.
  - 기존 v1 무변경, invalid argument no-access, npm artifact 정합성을 검증한다.
- **Stage 4 — 실제 sanitized smoke와 Tokenmon 인계 자료 확정**
  - 실제 로컬 환경에서 opt-in/off 경계를 구조적으로 검증하고 privacy scan, 전체 test, package dry-run을 수행한다.
  - Tokenmon이 사용할 확정 schema/type/fixture/보안 체크리스트를 최종 보고서에 정리한다.

## 검증 계획

### 단계별 검증

- Stage 1
  - synthetic source inventory와 contract 사례 수동 검토
  - 실제 값 없이 manifest/state key schema와 image structure만 sanitized 확인
  - v1 compatibility와 v2 status/null 사례 검토
- Stage 2
  - `npm test`
  - path traversal, symlink escape, malformed manifest, selection mismatch, unsupported format, oversize, invalid dimension fixture test
  - runtime output과 v2 JSON Schema/TypeScript field 정합성 확인
- Stage 3
  - `npm test`
  - `profile`, `profile --json`, `profile --include-pet`, `profile --json --include-pet`, help/invalid argument CLI test
  - privacy warning, human image redaction, v1 exact compatibility, package file allowlist 확인
- Stage 4
  - `npm test`
  - 실제 로컬 opt-in/off sanitized structural smoke
  - credential, account ID, custom pet ID, absolute path, data URL 오노출 privacy scan
  - `npm pack --dry-run`
  - public Markdown local link와 schema example 검증

### 통합 검증

- 플래그 없는 usage/profile 경로가 local pet source를 읽지 않고 기존 계약을 유지한다.
- opt-in v2 출력은 selected custom pet만 제한된 payload로 표현하고 모든 오류는 안전하게 축소된다.
- built-in pet, generated images, arbitrary local image가 payload로 승격되지 않는다.
- Tokenmon 인계 자료가 실제 사용자 데이터 없이 contract, fixture, 상태·보안 의미를 완결되게 설명한다.
- `git status --short`가 PR 준비 전 빈 출력이다.
- `git diff --check`가 경고 없이 통과한다.

## 리스크

- **선택 상태 source drift**: 과거 `selected-avatar-id`가 현재 앱에서 유지되지 않을 수 있다. 현재 authoritative source를 찾지 못하면 설치 pet으로 추측하지 않고 unavailable 처리한다.
- **이미지 payload 확대**: spritesheet를 JSON에 포함하면 메모리와 출력 크기가 커질 수 있다. source read, decode, base64 projection 각각에 엄격한 상한을 두고 oversize를 안전하게 거부한다.
- **이미지 parser 안전성**: 확장자나 content type만 신뢰하면 malformed image가 downstream으로 전달될 수 있다. 지원 format의 header/dimension을 검증하고 Tokenmon에도 전체 decode·재인코딩을 요구한다.
- **Full Profile 호환성 혼동**: v1 consumer가 v2를 잘못 받을 수 있다. 명시적 flag와 root version discriminator, 별도 schema로 경계를 고정한다.
- **로컬 privacy 확대**: 현재 profile은 remote identity opt-in이지만 pet은 local file read까지 추가한다. 별도 flag, 전용 warning, no-path/no-ID output, opt-in/off test로 범위를 제한한다.
- **built-in asset 권리와 앱 내부 의존성**: 앱 번들 asset 추출은 기술·재배포 위험이 있다. 이번 task에서 제외하고 custom pet만 다룬다.
- **downstream 계약 불일치**: Tokenmon이 구현 전에 contract가 바뀌면 재작업이 생긴다. analyzer 구현과 최종 계약을 먼저 완료한 뒤 확정 인계 자료만 전달한다.

## 승인 요청 사항

- 플래그 없는 Full Profile v1을 보존하고 `--include-pet`에서만 Full Profile v2를 반환하는 계약 분리를 승인받는다.
- 현재 선택이 확정된 custom pet만 지원하고 built-in image extraction, animation, Tokenmon 코드 변경을 제외하는 범위를 승인받는다.
- opt-in v2에 bounded image payload를 포함하되 정확한 field와 한도는 Stage 1 조사 후 구현계획서에서 확정하는 방향을 승인받는다.
- 공식 사용자/계약/downstream 문서는 `README.md`와 `docs/`에 두고 조사·보고만 `mydocs/`에 두는 문서 위치 판단을 승인받는다.
- analyzer 계약과 구현 완료 후 Tokenmon에 확정 자료를 인계하는 순서를 승인받는다.

승인되면 `task_m04x_52_impl.md`에서 단계별 산출물, 검증 명령, 커밋 메시지를 구체화한다.

# Task #52 Stage 3 단계 보고서

GitHub Issue: [#52](https://github.com/postmelee/codex-usage-analyzer/issues/52)
구현계획서: [`task_m04x_52_impl.md`](../plans/task_m04x_52_impl.md)
Stage: 3

## 단계 목적

Stage 1~2.5에서 확정한 bounded custom pet reader, Full Profile v2, catalog와
명시적 key 선택 계약을 실제 CLI·experimental module API·human formatter에
통합한다. 기본 Desktop 선택, TTY selector fallback, 강제 selector, 명시 key의
우선순위를 구현하고 문서·패키지 산출물까지 소비 가능한 상태로 고정한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/cli.js` | `--include-pet`, `--pet-key`, `--select-pet`, 이중 warning, no-access validation과 TTY 정책 추가 |
| `src/experimental-profile-client.js` | pet opt-in lazy access, Desktop/key/selector 우선순위와 Full Profile v2 결합 추가 |
| `src/experimental-pet-selector.js` | 방향키·Enter·취소와 terminal 복원을 지원하는 stderr TTY selector 신규 구현 |
| `src/experimental-profile-api.js` | experimental subpath runtime export를 두 함수로 제한 |
| `src/experimental-profile-api.d.ts` | v1/v2 option overload, catalog·selector·pet type 공개 |
| `src/format-experimental-profile.js` | v2에만 base64·digest를 제외한 안전한 Pet section 출력 |
| `src/index.d.ts` | CLI TTY 입출력 type 보정, 기존 Full Profile type 유지 |
| `package.json` | `./experimental-profile` export와 필요한 artifact allowlist 추가, v0.4.0·dependency 0 유지 |
| `src/__tests__/cli.test.js` | option matrix, warning, no-access, JSON/TTY/explicit key 정책 검증 |
| `src/__tests__/experimental-profile-client.test.js` | opt-in 격리, 선택 우선순위, 취소·오류 safe unavailable 검증 |
| `src/__tests__/experimental-pet-selector.test.js` | 이동·wrap·확정·취소·오류 terminal 복원 검증 |
| `src/__tests__/format-experimental-profile.test.js` | v1 무변경과 v2 safe metadata 출력 검증 |
| `src/__tests__/index.test.js` | root export 무변경, subpath export와 package allowlist 검증 |
| `README.md` | CLI/module 사용법, v1/v2 구분, 선택 의미와 base64 privacy 문서화 |
| `docs/experimental-full-profile.md` | v2 pet 계약, status/reason, CLI/module 선택·보안 경계 추가 |
| `docs/downstream-integration.md` | Tokenmon cosmetic portrait mapping과 검증·재인코딩·동의·삭제 요구사항 추가 |

## 본문 변경 정도 / 본문 무손실 여부

- root JavaScript SDK export와 pet opt-in 없는 `readExperimentalProfile()` 호출
  형태는 변경하지 않았다.
- pet opt-in이 없으면 local state/catalog/manifest/image dependency를 호출하지
  않고 Full Profile v1을 유지하는 회귀 테스트가 통과했다.
- 기존 README와 두 공식 문서는 원문을 재작성하지 않고 experimental pet에
  필요한 CLI, module, security, downstream 단락만 추가·보정했다.
- 패키지 버전은 `0.4.0`, runtime/development dependency는 0개이며 lockfile을
  생성하지 않았다.

## 검증 결과

실행 명령:

```bash
npm test
node bin/codex-usage-analyzer.js --help
node bin/codex-usage-analyzer.js profile --help
node bin/codex-usage-analyzer.js --version
node --input-type=module -e '/* runCli includePet/petKey/no-selector 검증 */'
node --input-type=module -e '/* experimental subpath exact export 검증 */'
rg -n 'include-pet|pet-key|select-pet|experimental-profile|Full Profile v2|base64|spritesheet|re-host|re-encode|delete|revoke' README.md docs/experimental-full-profile.md docs/downstream-integration.md src/cli.js src/experimental-profile-client.js src/experimental-pet-selector.js src/experimental-profile-api.js src/experimental-profile-api.d.ts src/format-experimental-profile.js package.json
if rg -n '/Users/|/home/|/private/var/|access_token|refresh_token|Bearer |sk-|github_pat_' README.md docs src/cli.js src/experimental-profile-client.js src/experimental-pet-selector.js src/experimental-profile-api.js src/experimental-profile-api.d.ts src/format-experimental-profile.js; then exit 1; fi
npm pack --cache /private/tmp/codex-usage-analyzer-task52-npm-cache --dry-run --json
node --input-type=module -e '/* version/export/files/dependency 검증 */'
test ! -e package-lock.json
git diff --check
```

결과:

- OK: 전체 test 178개 통과, 실패·skip 0개.
- OK: root/profile help는 신규 option 문법을 출력하고 account access 없이
  종료했으며 version은 `0.4.0`을 유지했다.
- OK: injected CLI smoke에서 `includePet: true`, `petKey: 2`, selector 미전달,
  Full Profile v2 JSON과 pet warning을 확인했다.
- OK: experimental subpath runtime export는 `listExperimentalPets`,
  `readExperimentalProfile` 두 개뿐이고 root export는 기존 exact set을 유지했다.
- OK: 문서/구현 키워드 정적 검사와 경로·credential privacy 정적 검사가
  통과했다.
- OK: package dry-run은 28개 artifact를 포함했고 v2 schema, pet reader,
  selector, experimental API JavaScript/type 파일을 포함했다. test, fixture,
  `mydocs`는 포함하지 않았다.
- OK: package version `0.4.0`, dependency/devDependency 0개, required artifact
  중복 0개, lockfile 부재와 `git diff --check`를 확인했다.

## 잔여 위험

- 실제 Codex Desktop state와 설치 pet을 사용하는 end-to-end smoke는 Stage 4
  범위다. Stage 3에서는 synthetic fixture와 injected CLI integration으로만
  selector 경로를 검증했다.
- private profile endpoint와 Desktop local-state 구조는 upstream 안정성 계약이
  없다. 실패 시 v1/v2 status와 safe unavailable reason으로 축약하는 현재
  정책을 유지해야 한다.
- catalog key는 현재 catalog snapshot에만 유효하며 downstream이 영구 ID로
  저장하면 안 된다.

## 다음 단계 영향

- Stage 4에서 raw JSON, identity, path, base64를 출력하지 않는 sanitized 실제
  v1/v2 smoke를 수행한다.
- 실제 catalog가 존재하면 이름과 source ID를 출력하지 않고 count/key 범위만
  확인한 뒤 명시 key로 byte length, digest/base64 길이 일치 여부를 검증한다.
- package artifact 제외/포함과 문서 링크를 재검증하고 Tokenmon 인계
  체크리스트를 확정한다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 Stage 4 실제 sanitized smoke와
  downstream 인계 검증으로 진행한다.

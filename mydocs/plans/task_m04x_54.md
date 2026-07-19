# Task M04x #54 수행계획서

GitHub Issue: [#54](https://github.com/postmelee/codex-usage-analyzer/issues/54)
마일스톤: M04x

## 목적

PR #53으로 `main`에 병합된 Full Profile v2 custom pet opt-in을 npm 사용자에게
제공하도록 package와 runtime version surface를 `0.4.1`로 일치시키고 release
preparation PR을 준비한다. Account Usage Contract v1, Full Profile v1/v2,
기본 CLI와 root JavaScript SDK의 동작·shape는 변경하지 않는다.

Release preparation PR merge 후 최신 `main` merge commit에 `v0.4.1` tag를
만들고, 기존 GitHub Actions `Publish Package` workflow와 npm Trusted Publisher
OIDC를 사용한다. Registry, published `npx`, package/subpath, signature와
provenance를 검증한 뒤 마지막으로 GitHub Release를 만들고 Issue #54를
종료한다. Tag, publish와 Release는 PR merge 후 별도 명시 승인을 받는다.

## 배경

Issue #52와 PR #53은 다음 M04x 기능을 구현·검증했다.

- `profile --include-pet`에서만 Full Profile v2와 local custom pet payload를
  제공하고, 플래그 없는 profile은 v1을 유지한다.
- Desktop selected, explicit numeric key, forced selector와 human TTY fallback
  순서를 제공하며 first/only pet 암묵 fallback을 금지한다.
- `codex-usage-analyzer/experimental-profile` subpath는
  `listExperimentalPets`, `readExperimentalProfile` 두 함수만 노출한다.
- PNG/WebP bounded reader, path containment, human redaction과 downstream
  decode/re-encode/re-host/delete 경계를 적용했다.
- 최종 regression 178개, local package artifact 28개, dependency 0개와 실제
  explicit-key WebP length/SHA-256 일치를 검증했다.

현재 source와 공개 release baseline은 다음과 같다.

- Main package/runtime version: `0.4.0`
- npm registry `latest`: `0.4.0`
- Published `0.4.0` artifact: 23개; pet reader, v2 schema와 experimental
  subpath 없음
- Current main dry-run artifact: 28개; pet reader/selector, v2 schema와
  experimental API/type 포함
- Existing Git tag/GitHub Release: `v0.4.0`
- `v0.4.1` tag/GitHub Release: 없음
- Full regression: 178 tests
- Runtime/development dependency: 0개
- Lockfile: 없음

Repository release guide는 compatible feature addition을 기본적으로 minor로
분류하지만, 작업지시자는 stable Account Usage v1/root SDK가 불변이고 기능이
명시적 experimental opt-in인 M04x 후속이라는 근거로 `0.4.1` patch release를
명시적으로 결정했다. 이 판단을 historical release 문서에 소급 적용하지 않는다.

Release 운영의 진실 원천은
[`npm_release_guide.md`](../manual/npm_release_guide.md)다. Trusted Publishing은
`contents: read`, `id-token: write`, GitHub-hosted runner와 short-lived OIDC
credential을 사용하며 장기 npm token과 수동 `--provenance` flag를 사용하지
않는다.

## 범위

### 포함

- `package.json` version을 `0.4.1`로 bump
- CLI/SDK declaration의 `PACKAGE_VERSION`을 `0.4.1`로 갱신
- Stable app-server `clientInfo.version`을 `0.4.1`로 갱신
- Experimental profile client의 client/version originator를 `0.4.1`로 갱신
- CLI, package bin, SDK, stable/experimental client version assertion 갱신
- Account Usage Contract v1, Full Profile v1/v2 schema/runtime과 root SDK
  export 무변경 검증
- Default usage, v1 profile, v2 pet/selector와 experimental module focused/full
  regression 재검증
- Local 28-file package artifact와 pet/v2 runtime/type/doc/schema 포함 검증
- Published 23-file v0.4.0 artifact 대비 신규 5개 artifact 제공 확인
- Tests, fixture, `mydocs`, workflow, scripts와 raw/sensitive 분석물 package 제외
- Runtime/development dependency 0개와 lockfile 부재 유지
- CLI no-auth `--help`, `--version`, `profile --help` smoke
- Advisory release preflight와 strict preflight의 pre-tag 기대 상태 분류
- Release preparation PR 및 GitHub-hosted CI/CodeQL 검증
- PR merge 후 별도 승인에 따른 `v0.4.1` tag 생성·push
- Tag ref 기준 `Publish Package` workflow 수동 실행
- npm `latest`, public `npx`, experimental subpath/package, registry signature와
  provenance 검증
- `v0.4.1` non-draft/non-prerelease GitHub Release 생성
- Release 결과를 Issue #54에 비민감 요약으로 기록하고 모든 gate 이후 close
- 완료된 release version을 Tokenmon 후속 인계의 dependency 기준으로 전달

### 제외

- Account Usage, profile, pet reader/selector 또는 Full Profile v1/v2 기능,
  field, status와 schema 변경
- Spritesheet frame/layout, 대표 portrait와 animation 계약 추가
- Root JavaScript SDK export 변경
- Runtime/development dependency 추가 또는 lockfile 생성
- README와 `docs/` 사용자·계약 문서 재작성
- Benchmark 재측정 또는 historical version marker의 전역 치환
- CI/publish workflow permission, trigger, Node/npm version과 Trusted Publisher
  설정 변경
- `NPM_TOKEN`, `NODE_AUTH_TOKEN`, `_authToken` 또는 장기 credential 추가
- `npm publish --provenance` 사용
- 실제 account/profile/pet JSON, identity, local path, image base64/digest,
  token/account identifier 또는 raw response 출력·저장
- Tokenmon Issue 생성과 저장소/API/storage/UI 코드 변경
- Release preparation PR merge와 별도 실행 승인 전 tag, workflow dispatch,
  npm publish 또는 GitHub Release 생성

## 설계 방향

### Version surface

- `npm version --no-git-tag-version 0.4.1`로 `package.json`만 기계적으로
  bump하고 tag를 만들지 않는다. 신규 lockfile이 생기면 중단한다.
- Source version 위치는 다음 5개로 제한한다.
  - `package.json`
  - `src/cli.js`
  - `src/index.d.ts`
  - `src/app-server-client.js`
  - `src/experimental-profile-client.js`
- Test assertion은 다음 4개 파일에서만 갱신한다.
  - `src/__tests__/cli.test.js`
  - `src/__tests__/index.test.js`
  - `src/__tests__/app-server-client.test.js`
  - `src/__tests__/experimental-profile-client.test.js`
- Global replacement를 사용하지 않는다. README, benchmark, 과거 release/task
  문서의 historical `0.4.0`은 보존한다.
- `src/index.js`, pet/profile normalizer·reader·selector, Account Usage/Full
  Profile schema와 renderer는 변경하지 않는다.

### Package and documentation boundary

- README와 `docs/`는 #52에서 current CLI/module/privacy 설명을 완료했으므로
  #54에서 수정하지 않는다.
- Package artifact에는 기존 stable runtime/contract와 함께 최소 다음 신규
  M04x 항목이 포함돼야 한다.
  - `docs/experimental-full-profile-v2.schema.json`
  - `src/experimental-pet.js`
  - `src/experimental-pet-selector.js`
  - `src/experimental-profile-api.js`
  - `src/experimental-profile-api.d.ts`
- Tests, `.github/`, `mydocs/`, scripts, fixture와 raw/sensitive 분석물은 package
  artifact에서 제외한다.
- Publish 후 registry README의 `--include-pet`, `--pet-key`, `--select-pet`,
  experimental subpath와 v2 schema link marker를 확인한다.
- Release note에는 stable default 무변경, experimental pet opt-in과 selected
  state 제한을 요약하되 실제 account/pet 값을 포함하지 않는다.

### Release ordering and approval

- Pre-merge Stage에서는 version source/test만 변경한다. Tag, workflow dispatch,
  npm publish와 GitHub Release를 수행하지 않는다.
- PR body에는 Issue #54 closing keyword를 넣지 않는다. PR merge 후에도
  Issue #54와 작업 branch cleanup은 release 완료 전까지 보류한다.
- Tag 생성, tag push, strict preflight, workflow dispatch, npm publish와 GitHub
  Release는 PR merge 후 작업지시자의 별도 명시 승인을 받아 수행한다.
- `v0.4.1` tag는 release preparation PR의 최신 `main` merge commit을 가리켜야
  한다.
- Tag push 후 `npm run release:preflight -- --release-ready`가 전부 OK일 때만
  `gh workflow run publish.yml --ref v0.4.1`을 실행한다.
- Publish 성공 후 registry/npx/package/subpath/signature/provenance를 검증한
  다음 마지막으로 GitHub Release를 생성한다.
- Publish 후 검증이 실패해도 `0.4.1`을 재게시하지 않는다. Issue를 partial
  release 상태로 유지하고 후속 patch를 결정한다.

### Supply-chain boundary

- Existing `.github/workflows/publish.yml`의 `contents: read`, `id-token: write`,
  GitHub-hosted runner, Node 24/npm minimum check와 plain `npm publish`를 유지한다.
- Workflow filename, repository metadata와 npm Trusted Publisher association을
  변경하지 않는다.
- Provenance는 Trusted Publishing 자동 생성을 사용한다.
- Registry metadata에서는 signature/provenance 존재와 predicate category만
  기록하고 raw signature/attestation을 task 문서에 복사하지 않는다.
- 일회용 verification directory에서 exact `0.4.1`을 설치하고
  `npm audit signatures`를 실행한 뒤 directory를 삭제한다.

## 문서 위치 판단

README와 공식 product/API 문서는 변경하지 않는다. Version source는 기존
package/runtime 위치를 사용하고 post-release 결과는 Issue #54, npm registry와
GitHub Release에 남긴다. 계획·단계·최종 보고서는 M04x 표준 `mydocs/` 경로에
둔다.

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| Version source/test | Package/runtime source | 사용자/maintainer | 기존 `package.json`, `src/` | 신규 version 파일 | 기존 version surface를 유지하고 release-only abstraction을 추가하지 않는다. |
| Public product docs | 공식 문서 | 사용자/consumer | 변경 없음 | README/docs 수정 | #52 문서가 pet opt-in과 privacy boundary를 이미 설명한다. |
| Post-release 결과 | Release 운영 기록 | 사용자/maintainer | Issue #54, npm registry, GitHub Release | `docs/` | 외부 immutable state를 tag와 workflow run에 연결한다. |
| Task 계획/단계/최종 보고 | 작업 산출물 | 내부 작업자 | `mydocs/` M04x 표준 경로 | M040 문서 재사용 | #54 승인·검증 이력을 이전 release와 분리한다. |

## 예상 변경 파일

신규 product file:

- 없음

수정:

- `package.json`
- `src/cli.js`
- `src/index.d.ts`
- `src/app-server-client.js`
- `src/experimental-profile-client.js`
- `src/__tests__/cli.test.js`
- `src/__tests__/index.test.js`
- `src/__tests__/app-server-client.test.js`
- `src/__tests__/experimental-profile-client.test.js`

이번 task 산출물:

- `mydocs/orders/20260719.md`
- `mydocs/plans/task_m04x_54.md`
- `mydocs/plans/task_m04x_54_impl.md`
- `mydocs/working/task_m04x_54_stage{N}.md`
- `mydocs/report/task_m04x_54_report.md`

External release 산출물:

- Git tag `v0.4.1`
- npm package `codex-usage-analyzer@0.4.1`
- npm `latest` -> `0.4.1`
- GitHub Actions `Publish Package` success run
- GitHub Release `v0.4.1`

## 잠정 단계

- **Stage 1 — Version surface를 0.4.1로 일치**
  - Package, CLI/SDK declaration, stable/experimental client version과 test
    assertion을 갱신한다.
  - Focused test, exact version allowlist, contract/schema 무손실과 tag/publish
    부재를 검증한다.
- **Stage 2 — Package와 public artifact release readiness 검증**
  - 전체 178-test 이상, 28-file artifact와 신규 pet/v2 package surface 포함을
    확인한다.
  - Forbidden artifact, dependency 0, no lockfile, CLI no-auth와 advisory
    preflight를 검증한다.
- **Stage 3 — Pre-release 통합 검증과 post-merge runbook 확정**
  - 최신 origin/main, version-only product diff와 remote external state를
    확인한다.
  - Strict preflight의 expected pre-tag 상태, tag/publish/registry/npx/subpath/
    signature/provenance/Release gate와 별도 승인 경계를 확정한다.

Post-merge release run은 Stage 3, 최종 보고서와 release preparation PR merge
이후 별도 승인으로 수행한다. Tag, workflow, npm registry와 GitHub Release는
repository commit이 아닌 외부 immutable 산출물이므로 각 gate 결과를 Issue
#54에 기록한다.

## 검증 계획

### 단계별 검증

- Stage 1
  - 승인된 9개 source/test file의 exact `0.4.1`과 범위 밖 runtime `0.4.0`
    literal 부재 확인
  - CLI/index, stable app-server와 experimental profile client focused test
  - `src/index.js`, pet/profile/usage runtime·schema, README/docs diff zero
  - `v0.4.1` tag, npm `0.4.1`, GitHub Release 미생성 확인
- Stage 2
  - `npm test` 178-test 이상 전체 regression
  - isolated-cache `npm pack --dry-run --json` 28-file artifact audit
  - CLI `--help`, `--version`, `profile --help` no-auth smoke
  - Pet reader/selector, experimental API/type, v2 schema와 current README 포함
  - Tests/fixture/`mydocs`/workflow/scripts 제외, dependency 0와 no lockfile 확인
  - `npm run release:preflight` advisory mode
- Stage 3
  - `origin/main` 동기화와 version-only product diff 확인
  - `npm run release:preflight -- --release-ready` expected pre-tag failure 분류
  - npm registry `latest=0.4.0`, `v0.4.1` tag/Release/dispatch 부재 확인
  - Publish workflow Trusted Publishing boundary와 sensitive pattern scan
  - PR과 post-merge release runbook command 검토

### 통합 검증

- Package, CLI, SDK declaration와 stable/experimental client version이
  `0.4.1`로 일치한다.
- Default Account Usage, v1/v2 profile/pet behavior, root SDK와 세 contract
  schema가 변경되지 않는다.
- 전체 regression이 통과하고 runtime/development dependency는 0개이며
  lockfile이 없다.
- Package에 28개 current artifact와 신규 pet/v2 surface가 포함되고 tests,
  fixture, `mydocs`, workflow와 scripts는 제외된다.
- Release preparation PR의 CI와 CodeQL이 통과한다.
- 별도 release 실행 승인 전 tag, workflow dispatch, npm publish와 GitHub
  Release가 없다.
- 승인 후 `v0.4.1` tag가 최신 main merge commit을 가리키고 strict preflight가
  warning/failure 없이 통과한다.
- Publish workflow가 long-lived token 없이 Trusted Publishing으로 성공한다.
- npm `latest`, public `npx --help`/`--version`/`profile --help`, package/subpath,
  signature와 provenance가 `0.4.1` 기준으로 통과한다.
- Same tag의 non-draft/non-prerelease GitHub Release가 존재한다.
- Issue #54는 모든 post-release gate를 통과한 뒤 close한다.
- `git status --short`가 PR 준비와 release 실행 직전에 빈 출력이다.
- `git diff --check`가 경고 없이 통과한다.

## 리스크

- **Irreversible npm version**: Publish 후 같은 version을 재사용할 수 없다.
  Strict preflight와 artifact audit 전 workflow를 실행하지 않는다.
- **External partial release**: Publish 후 검증이 실패하면 재게시하지 않고
  Issue를 열린 상태로 유지해 후속 patch를 결정한다.
- **Patch classification**: Release guide의 기본 minor 기준과 달리 이번
  `0.4.1`은 작업지시자 결정이다. Stable/root 계약 불변과 experimental opt-in
  범위를 release note와 task record에 남긴다.
- **Premature mutation/cleanup**: PR merge와 별도 승인 전 tag/publish/Release를
  만들지 않고, release 완료 전 Issue close와 branch cleanup을 수행하지 않는다.
- **Version over-replacement**: Exact source/test allowlist만 수정하고 historical
  benchmark/release/task 문서 marker를 보존한다.
- **Stable contract regression**: Root SDK, Account Usage와 Full Profile v1/v2
  runtime/schema를 diff-zero와 full regression으로 보호한다.
- **Private/local source drift**: Release는 endpoint와 pet source를 수정하지
  않는다. Postpublish는 account access 없는 help/version/subpath를 기본 smoke로
  사용한다.
- **Trusted Publisher mismatch**: Existing v0.4.0 workflow/OIDC boundary를
  보존하고 long-lived credential을 추가하지 않는다.
- **Signature/provenance drift**: Registry metadata와 `npm audit signatures`를
  함께 검증하고 raw material을 기록하지 않는다.
- **Registry propagation delay**: Publish 직후 bounded retry 후에도 metadata,
  README 또는 npx가 불일치하면 partial-release 상태로 중단한다.
- **Downstream sequencing**: Tokenmon Issue는 published exact version 확인 후
  별도 등록하며 release task에 consumer code를 섞지 않는다.

## 승인 요청 사항

- #52 기능을 작업지시자 결정에 따라 M04x patch release `0.4.1`로 확정
- Version source/test 9개 파일만 수정하고 feature/runtime contract와 public
  docs를 변경하지 않는 범위
- 3개 pre-merge Stage와 별도 post-merge release run으로 분할하는 절차
- PR에 closing keyword를 넣지 않고 post-release 검증 후 Issue #54와 cleanup을
  완료하는 순서
- PR merge 후 tag/publish/GitHub Release 전에 별도 명시 승인을 요청하는 경계
- Release 성공 후 exact `0.4.1`을 Tokenmon 후속 인계 기준으로 사용하는 순서

승인되면 `task_m04x_54_impl.md`에서 exact version file/assertion, artifact marker,
preflight expectation, tag/workflow/registry/npx/subpath/signature/provenance/Release
명령과 커밋 메시지를 구체화한다.

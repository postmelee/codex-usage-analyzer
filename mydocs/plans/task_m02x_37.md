# Task M02x #37 수행계획서

GitHub Issue: [#37](https://github.com/postmelee/codex-usage-analyzer/issues/37)
마일스톤: M02x

## 목적

GitHub `main`의 현재 public documentation을 npm registry에 동기화하는 `0.2.1` patch release를 준비하고 실행한다. Runtime, CLI command, SDK와 Account Usage Contract의 동작은 변경하지 않고 package/version surface만 `0.2.1`로 일치시킨다.

Release preparation PR merge 후 main commit에 `v0.2.1` tag를 만들고, 기존 GitHub Actions `Publish Package` workflow와 npm Trusted Publisher OIDC를 사용해 publish한다. Registry, public `npx`, README, ECDSA signature, SLSA provenance와 GitHub Release를 순서대로 검증한 뒤 Issue #37을 종료한다.

## 배경

현재 source와 registry baseline은 다음과 같다.

- Local `package.json`, CLI/SDK version과 app-server `clientInfo.version`: `0.2.0`
- npm registry `latest`: `0.2.0`
- Existing Git tag/GitHub Release: `v0.2.0`
- Runtime/development dependency: 0개
- Local runtime: Node `v24.15.0`, npm `11.12.1`
- npm `0.2.0`: Registry ECDSA signature와 SLSA provenance attestation 존재
- Source README: Codex for Open Source support, documented upstream blockquote, Codex lookup benchmark와 상세 문서 link 존재
- npm `0.2.0` README exact marker:
  - `Documented upstream:`: 없음
  - OpenAI Codex app-server README URL: 없음
  - `Codex for Open Source`: 없음
  - `## Codex lookup benchmark`: 없음
  - `docs/codex-lookup-benchmark.md`: 없음

Source README의 benchmark는 실제 측정 당시 package version `0.2.0`을 기록한다. 이 값은 current package version이 아니라 dated historical evidence이므로 `0.2.1`로 바꾸면 안 된다. `docs/codex-lookup-benchmark.md`의 heading/table version도 같은 이유로 보존한다.

Repository release 정책은 [`npm_release_guide.md`](../manual/npm_release_guide.md)를 진실 원천으로 사용한다. Trusted Publishing은 GitHub-hosted runner와 `id-token: write`로 short-lived OIDC credential을 사용하며, npm은 Trusted Publishing으로 게시된 public package의 provenance를 자동 생성한다. Workflow에 long-lived npm token이나 `--provenance`를 추가하지 않는다.

공식 근거:

- [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
- [npm Viewing package provenance](https://docs.npmjs.com/viewing-package-provenance/)
- [npm Verifying registry signatures](https://docs.npmjs.com/verifying-registry-signatures/)
- [GitHub Actions manual workflow run](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)

## 범위

### 포함

- `package.json` version을 `0.2.1`로 bump
- CLI/SDK public `PACKAGE_VERSION`을 `0.2.1`로 갱신
- App-server `clientInfo.version`을 `0.2.1`로 갱신
- CLI, package bin, SDK와 app-server client version test assertion 갱신
- Historical benchmark의 `codex-usage-analyzer@0.2.0`와 측정 heading 보존
- Source README marker와 package artifact의 public benchmark 문서 포함 확인
- `npm test`, package dry-run, CLI no-auth smoke와 advisory/strict preflight
- Release preparation PR 및 GitHub-hosted CI/CodeQL 검증
- PR merge 후 별도 작업지시자 승인에 따른 `v0.2.1` tag 생성과 push
- Tag ref 기준 `Publish Package` workflow 수동 실행
- npm `latest`, public `npx`, npm README, registry signature와 provenance 검증
- `v0.2.1` non-draft/non-prerelease GitHub Release 생성
- Release 결과를 Issue #37 comment에 비민감 요약으로 기록하고 수동 close

### 제외

- README 또는 `docs/codex-lookup-benchmark.md`의 historical `0.2.0` 변경
- README source의 Support/upstream/benchmark 내용 재작성
- CLI command, SDK shape, Account Usage Contract 또는 JSON Schema 변경
- Runtime/development dependency 추가
- Benchmark 재측정 또는 dated latency 변경
- Publish workflow, Trusted Publisher 설정, registry access policy 변경
- `NPM_TOKEN`, `NODE_AUTH_TOKEN`, `_authToken` 또는 장기 credential 추가
- `npm publish --provenance` 사용
- Dependabot PR #40/#41 review, merge 또는 action version 변경
- Social preview, repository Description, Website와 topics 변경
- 실제 account usage 호출, 값 출력 또는 저장

## 설계 방향

### Version surface

- `npm version --no-git-tag-version 0.2.1`로 `package.json`만 기계적으로 bump하고 tag를 만들지 않는다.
- Lockfile이 없으므로 신규 lockfile을 생성하지 않는다.
- Source version 위치는 다음으로 제한한다.
  - `package.json`
  - `src/cli.js`
  - `src/index.d.ts`
  - `src/app-server-client.js`
- Test assertion은 다음을 갱신한다.
  - `src/__tests__/cli.test.js`
  - `src/__tests__/index.test.js`
  - `src/__tests__/app-server-client.test.js`
- `src/index.js` export shape와 public contract는 변경하지 않는다.

### Documentation sync boundary

- README source는 이미 목표 내용을 포함하므로 수정하지 않는다.
- npm package artifact가 current README와 `docs/codex-lookup-benchmark.md`를 포함하는지 structured file list로 검증한다.
- npm publish 후 registry README에서 다음 exact marker를 확인한다.
  - `Documented upstream:`
  - `github.com/openai/codex/blob/main/codex-rs/app-server/README.md`
  - `Codex for Open Source`
  - `## Codex lookup benchmark`
  - `docs/codex-lookup-benchmark.md`
- Historical benchmark `0.2.0` marker는 source와 published README/package document에 그대로 있어야 한다.

### Release ordering and approval

- PR preparation 단계에서는 version source/test만 변경한다. Tag, workflow dispatch, npm publish와 GitHub Release를 수행하지 않는다.
- PR body에 `Closes #37`을 넣지 않는다.
- PR merge 후 main CI 성공과 source version `0.2.1`을 확인한다.
- Tag 생성, tag push, strict preflight, workflow dispatch, npm publish와 GitHub Release는 작업지시자의 별도 명시 승인을 받은 뒤 한 방향으로 수행한다.
- `v0.2.1` tag는 release preparation PR의 main merge commit을 가리켜야 한다.
- Tag push 후 `npm run release:preflight -- --release-ready`가 전부 OK일 때만 publish workflow를 dispatch한다.
- `gh workflow run publish.yml --ref v0.2.1`로 tag ref의 workflow를 실행한다.
- Publish 성공 후 registry/npx/README/signature/provenance를 검증한 다음 마지막으로 GitHub Release를 생성한다.
- Publish 이후 검증이 실패해도 `0.2.1`을 재게시하지 않는다. Issue를 열린 partial-release 상태로 유지하고 별도 patch 판단을 받는다.

### Supply-chain boundary

- Existing `.github/workflows/publish.yml`의 `contents: read`, `id-token: write`, GitHub-hosted runner, Node 24와 `npm publish`를 그대로 사용한다.
- Workflow filename `publish.yml`, repository metadata와 npm Trusted Publisher association을 변경하지 않는다.
- Provenance는 Trusted Publishing 자동 생성을 사용한다.
- Registry metadata에서는 signature 존재 개수와 provenance predicate type만 기록하고 signature 원문은 작업 문서에 복사하지 않는다.
- Throwaway verification directory에서 exact `0.2.1`을 설치하고 `npm audit signatures`로 registry signature와 provenance attestation을 검증한 뒤 directory를 삭제한다.

### Concurrent Dependabot PR

- PR #40/#41은 같은 CI/publish workflow를 수정하지만 #37 범위 밖이다.
- 둘 중 하나가 먼저 merge되면 최신 main의 action version과 permission을 보존한다.
- Task diff에 action version update가 섞이지 않았는지 PR 게시 전 확인한다.
- `v0.2.1` tag 시점에는 main의 실제 publish workflow를 그대로 사용하며 별도 action upgrade를 포함하지 않는다.

## 문서 위치 판단

README와 공식 product documentation source는 변경하지 않는다. Version source는 기존 package/runtime 위치를 사용하고, release 결과는 GitHub Issue comment, npm registry metadata와 GitHub Release에 남긴다. 계획·단계·검증 이력만 `mydocs/` 표준 task 폴더에 둔다.

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| Version source/test | Package/runtime source | 사용자/maintainer | 기존 `package.json`, `src/` | 신규 version 파일 | 기존 public version surface를 유지하고 추상화를 추가하지 않는다. |
| Post-release 결과 | Release 운영 기록 | 사용자/maintainer | Issue #37 comment, npm registry, GitHub Release | `docs/` | 외부 상태 결과이며 별도 source commit 없이 tag와 run에 연결한다. |
| Task 계획/단계/최종 보고 | 작업 산출물 | 내부 작업자 | `mydocs/` 표준 폴더 | `docs/` | Release 승인·검증 이력을 제품 문서와 분리한다. |

## 예상 변경 파일

신규:

- 없음

수정:

- `package.json`
- `src/cli.js`
- `src/index.d.ts`
- `src/app-server-client.js`
- `src/__tests__/cli.test.js`
- `src/__tests__/index.test.js`
- `src/__tests__/app-server-client.test.js`

이번 task 산출물:

- `mydocs/orders/20260713.md`
- `mydocs/plans/task_m02x_37.md`
- `mydocs/plans/task_m02x_37_impl.md`
- `mydocs/working/task_m02x_37_stage{N}.md`
- `mydocs/report/task_m02x_37_report.md`

External release 산출물:

- Git tag `v0.2.1`
- npm package `codex-usage-analyzer@0.2.1`
- npm `latest` -> `0.2.1`
- GitHub Release `v0.2.1`

## 잠정 단계

- **Stage 1 — Version surface를 0.2.1로 일치**
  - Package, CLI/SDK, app-server client version과 test assertion을 갱신한다.
  - Historical benchmark `0.2.0`, public API/contract와 tag 부재를 검증한다.
- **Stage 2 — Package와 npm README sync readiness 검증**
  - 전체 test, package dry-run, source README marker와 package document 포함을 확인한다.
  - Advisory preflight, current registry `0.2.0`과 npm README missing marker baseline을 검증한다.
- **Stage 3 — Pre-release 통합 검증과 post-merge runbook 확정**
  - Strict preflight의 expected pre-tag failure가 tag 부재 하나인지 확인한다.
  - Upstream/Dependabot 상태, PR checks, tag/publish/registry/npx/signature/provenance/Release gate와 별도 실행 승인 경계를 확정한다.

## 검증 계획

### 단계별 검증

- Stage 1
  - Package, CLI/SDK, app-server client와 test assertion exact `0.2.1` 확인
  - Focused CLI/index/app-server client test
  - Historical benchmark `0.2.0` marker 무손실 확인
  - `v0.2.1` tag/GitHub Release/npm publish 미생성 확인
- Stage 2
  - `npm test`
  - `npm pack --dry-run --json`
  - CLI `--help`, `--version`
  - Package file allowlist와 benchmark document 포함, harness/mydocs/workflow 제외 확인
  - Source README marker와 npm `0.2.0` README marker 차이 확인
  - `npm run release:preflight` advisory mode
- Stage 3
  - `origin/main` 동기화와 product diff 범위 확인
  - `npm run release:preflight -- --release-ready` expected pre-tag failure 분류
  - npm registry `latest=0.2.0`, `v0.2.1` tag/Release 부재 확인
  - Publish workflow Trusted Publishing boundary와 sensitive pattern scan
  - PR 및 post-merge release runbook command 검토

### 통합 검증

- Package, CLI, SDK와 app-server client version이 `0.2.1`로 일치한다.
- Historical benchmark의 측정 version은 `0.2.0`을 유지한다.
- Runtime/contract behavior와 dependency 수가 변경되지 않는다.
- Package에 current README와 public benchmark document가 포함되고 harness/mydocs/workflow는 제외된다.
- PR CI와 CodeQL checks가 통과한다.
- 별도 release 실행 승인 전 tag, workflow dispatch, npm publish와 GitHub Release가 없다.
- 승인 후 `v0.2.1` tag가 main merge commit을 가리키고 strict preflight가 통과한다.
- Publish workflow가 Trusted Publishing으로 성공한다.
- npm `latest`, public `npx`, README marker, signature와 provenance가 `0.2.1` 기준으로 통과한다.
- Same tag의 non-draft/non-prerelease GitHub Release가 존재한다.
- Issue #37은 모든 post-release gate를 통과한 뒤 수동 close한다.
- `git status --short`가 PR 준비와 release 실행 직전에 빈 출력이다.
- `git diff --check`가 경고 없이 통과한다.

## 리스크

- **Irreversible npm version**: npm publish 후 같은 version을 재사용할 수 없다. Strict preflight와 artifact audit 전 workflow를 실행하지 않는다.
- **External partial release**: Publish 후 검증이 실패하면 재게시하지 않고 Issue를 열린 상태로 유지해 후속 patch를 결정한다.
- **Premature mutation**: PR merge와 별도 작업지시자 승인 전 tag, workflow dispatch, publish, Release를 만들지 않는다.
- **Premature issue close**: PR에 closing keyword를 넣지 않고 registry/GitHub Release 검증 후 수동 close한다.
- **Historical evidence corruption**: Global version replacement를 하지 않고 version surface allowlist만 갱신하며 benchmark `0.2.0`을 assertion한다.
- **README false sync**: Source marker만 확인하지 않고 publish된 npm README를 registry에서 다시 읽어 exact marker를 확인한다.
- **Trusted Publisher mismatch**: Workflow filename/repository/OIDC 조건이 다르면 publish가 실패한다. Existing successful `0.2.0` provenance와 workflow boundary를 보존한다.
- **Credential exposure**: Long-lived token을 추가하거나 auth output을 기록하지 않는다. OIDC publish run과 non-sensitive registry metadata만 남긴다.
- **Signature/provenance drift**: Metadata 존재와 `npm audit signatures`를 함께 확인하고 raw signature를 문서에 복사하지 않는다.
- **Dependabot conflict**: PR #40/#41이 먼저 merge되면 action version을 되돌리지 않고 최신 main을 반영한다.
- **Registry propagation delay**: Publish success 직후 `latest`/README가 지연될 수 있다. Bounded retry 후에도 불일치하면 partial-release 상태로 중단한다.

## 승인 요청 사항

- Release version을 `0.2.1` patch로 확정하는 방향
- Source README를 수정하지 않고 package republish로 npm public documentation을 동기화하는 방향
- Version source/test 7개 파일만 갱신하고 historical benchmark `0.2.0`을 보존하는 범위
- 3개 Stage와 pre-merge/post-merge release gate 분할
- PR에 closing keyword를 넣지 않고 post-release 검증 뒤 Issue #37을 수동 close하는 절차
- PR merge 후에도 tag/publish/GitHub Release 전에 별도 작업지시자 승인을 요청하는 안전 경계

승인되면 `task_m02x_37_impl.md`에서 exact version file/assertion, artifact marker, preflight expectation, tag/workflow/registry/npx/signature/provenance/Release command와 커밋 메시지를 구체화한다.

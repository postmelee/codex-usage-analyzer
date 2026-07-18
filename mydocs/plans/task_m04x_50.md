# Task M04x #50 수행계획서

GitHub Issue: [#50](https://github.com/postmelee/codex-usage-analyzer/issues/50)
마일스톤: M04x

## 목적

CI와 npm Trusted Publishing workflow에서 사용하지 않는 checkout credential persistence와 automatic package-manager cache를 명시적으로 비활성화한다. 현재 암묵적으로 안전한 조건에 의존하지 않고 workflow와 release preflight가 동일한 보안 정책을 진실 원천으로 검증하도록 만든다.

기존 `contents: read`, Publish의 `id-token: write`, Node 20/24, no-auth smoke와 plain `npm publish`를 유지한다. Product CLI/SDK/contract, npm package metadata와 이미 배포된 `v0.4.0` release는 변경하지 않는다.

## 배경

PR #40과 PR #41에서 CI와 Publish Package workflow의 `actions/setup-node`, `actions/checkout`을 v7으로 갱신했다. 두 PR은 최신 main merge ref, GitHub-hosted runner와 local release preflight에서 검증됐고 main CI/CodeQL도 통과했다.

`setup-node` v5+는 npm `packageManager` 또는 `devEngines.packageManager` metadata가 있으면 automatic package-manager cache를 활성화할 수 있다. 현재 repository에는 해당 metadata와 lockfile이 없어 cache trigger가 없지만, 공식 문서는 elevated privilege 또는 민감 권한 workflow에서 cache가 필요하지 않으면 `package-manager-cache: false`를 권고한다.

`checkout`은 기본적으로 credential을 유지한다. 현재 두 workflow는 checkout 이후 authenticated git command를 사용하지 않으므로 `persist-credentials: false`로 token persistence를 줄일 수 있다. 기존 `scripts/release-preflight.js`는 OIDC permission, no-auth smoke와 장기 token 금지를 검증하지만 이 세 explicit false policy는 아직 검사하지 않는다.

공식 근거:

- [actions/setup-node v7 README](https://github.com/actions/setup-node/blob/v7/README.md)
- [actions/setup-node automatic cache security recommendation](https://github.com/actions/setup-node/blob/v7/README.md#breaking-changes-in-v5)
- [actions/checkout v7 README](https://github.com/actions/checkout/blob/v7/README.md)
- [actions/checkout v7 release](https://github.com/actions/checkout/releases/tag/v7.0.0)

## 범위

### 포함

- CI `actions/checkout@v7` step에 `persist-credentials: false` 명시
- Publish `actions/checkout@v7` step에 `persist-credentials: false` 명시
- Publish `actions/setup-node@v7` step에 `package-manager-cache: false` 명시
- 세 policy의 step-local exact false 값을 검사하는 pure workflow policy helper
- Release preflight의 CI/Publish workflow 검사를 helper와 연결
- 누락, `true`, 잘못된 step 배치를 거부하는 targeted negative test
- Existing workflow permission, trigger, runner, Node, no-auth smoke와 plain publish 무변경 검증
- Full regression, 23-file package, dependency 0, lockfile 부재와 sensitive scan 검증
- PR 게시 후 GitHub CI/CodeQL 검증

### 제외

- `actions/checkout` 또는 `actions/setup-node` version 변경
- Workflow trigger, runner, Node version, concurrency와 permission 변경
- Publish workflow 실행, npm publish, version bump, Git tag와 GitHub Release 생성
- `NPM_TOKEN`, `NODE_AUTH_TOKEN`, `_authToken`, 수동 provenance flag 또는 장기 credential 추가
- `packageManager`, lockfile, runtime/development dependency 추가
- CLI, SDK, Account Usage Contract와 Experimental Full Profile 기능·schema 변경
- README, `docs/`, contributor/security policy와 npm release guide 재작성
- 실제 Account Usage/Profile command와 계정 데이터 사용

## 설계 방향

### Workflow policy

- CI와 Publish의 Checkout step에 기존 step 이름과 action version을 유지한 채 `with.persist-credentials: false`만 추가한다.
- Publish의 Setup Node step에는 Node 24와 `registry-url`을 유지하고 `package-manager-cache: false`를 추가한다.
- CI setup-node cache policy는 이번 범위에 포함하지 않는다. CI는 `id-token: write`가 없고 현재 package-manager trigger도 없으며 Issue #50에서 승인한 cache 소유 영역은 Publish workflow다.
- `persist-credentials: false`를 사용해도 두 workflow에는 checkout 이후 git fetch/push/submodule 작업이 없으므로 기능 손실이 없다.

### Preflight policy enforcement

- YAML parser dependency를 추가하지 않는다. 이 repository가 소유한 작은 workflow의 step-local 구조를 검사하는 pure helper를 `scripts/`에 둔다.
- Helper는 workflow 전체에 key 문자열이 존재하는지만 확인하지 않고, Checkout/Setup Node step 안에서 exact boolean `false`인지 검증한다.
- Existing `checkCiWorkflow`와 `checkPublishWorkflow`의 permission, Node, smoke, publish와 forbidden token 검사는 보존한다.
- Helper는 import 시 command, network, filesystem mutation을 실행하지 않아 synthetic workflow text로 빠른 positive/negative test가 가능해야 한다.
- Missing key, `true`, 다른 step에만 존재하는 key를 각각 거부하도록 테스트한다.

### Compatibility and release boundary

- Package version `0.4.0`, npm `latest`와 `v0.4.0` tag/Release를 변경하지 않는다.
- Advisory preflight에서 `local 0.4.0 == registry 0.4.0`, `v0.4.0` tag가 post-release workflow commit인 HEAD를 가리키지 않는 두 WARN은 예상 상태다. Workflow policy FAIL은 0개여야 한다.
- Package artifact는 scripts/tests/workflow를 포함하지 않으므로 23-file baseline과 약 29.1 kB를 유지해야 한다.
- Actual Account Usage/Profile command를 실행하지 않고 no-auth CLI와 synthetic workflow text만 사용한다.

## 문서 위치 판단

사용자, downstream consumer, API/contract와 contributor용 공식 문서는 변경하지 않는다. 이번 작업은 repository-owned workflow와 release gate의 내부 보안 정책이며 기존 공개 제품 동작에 영향이 없다. 공식 근거 링크와 승인·검증 이력은 M04x 작업 문서에 기록한다.

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| Workflow policy | CI/release configuration | maintainer/GitHub Actions | `.github/workflows/` 기존 파일 | `docs/` | 실행 정책은 workflow 자체가 진실 원천이다. |
| Preflight policy helper | Repository release tooling | maintainer/contributor | `scripts/` | `src/` | Published runtime이 아니며 package artifact에서 제외된다. |
| Policy regression test | Repository tooling test | maintainer/contributor | `src/__tests__/` | `scripts/` 인접 test | 기존 `node --test` 발견 패턴과 package exclusion 경계를 재사용한다. |
| Public product docs | 공식 문서 | 사용자/downstream | 변경 없음 | README/docs 수정 | CLI/API/package 사용법이나 privacy contract가 바뀌지 않는다. |
| Task 계획/단계/최종 보고 | 작업 산출물 | 내부 작업자 | `mydocs/` M04x 표준 경로 | M040 문서 수정 | Post-release maintenance 이력을 release task와 분리한다. |

## 예상 변경 파일

신규:

- `scripts/release-workflow-policy.js`
- `src/__tests__/release-workflow-policy.test.js`

수정:

- `.github/workflows/ci.yml`
- `.github/workflows/publish.yml`
- `scripts/release-preflight.js`

변경하지 않음:

- `package.json`, lockfile와 `src/` product runtime
- `README.md`, `docs/`, `CONTRIBUTING.md`, `SECURITY.md`
- `mydocs/manual/npm_release_guide.md`

이번 task 산출물:

- `mydocs/orders/20260717.md`
- `mydocs/plans/task_m04x_50.md`
- `mydocs/plans/task_m04x_50_impl.md`
- `mydocs/working/task_m04x_50_stage{N}.md`
- `mydocs/report/task_m04x_50_report.md`

## 잠정 단계

- **Stage 1 — Workflow explicit false policy 적용**
  - CI/Publish Checkout credential persistence와 Publish automatic npm cache를 명시적으로 비활성화한다.
  - Diff를 workflow 세 설정으로 제한하고 trigger, permission, runner, action/Node version과 publish command 무변경을 검증한다.
- **Stage 2 — Release preflight policy enforcement**
  - Pure workflow policy helper와 positive/negative regression test를 추가하고 release preflight CI/Publish check에 연결한다.
  - Missing, `true`, wrong-step policy가 실패하고 current workflow가 통과하는지 검증한다.
- **Stage 3 — Package/security 통합 검증**
  - Full regression, advisory preflight, package 23-file baseline, dependency/lockfile와 sensitive boundary를 검증한다.
  - Product/public docs diff zero와 PR CI/CodeQL 확인 범위를 확정한다.

## 검증 계획

### 단계별 검증

- Stage 1
  - `git diff -- .github/workflows/ci.yml .github/workflows/publish.yml`
  - Workflow별 action version, trigger, permission, Node version와 command marker 검사
  - `persist-credentials: false` 2개와 `package-manager-cache: false` 1개 exact count
  - `git diff --check`
- Stage 2
  - `node --test src/__tests__/release-workflow-policy.test.js`
  - Positive workflow fixture와 missing/true/wrong-step negative fixture 검사
  - Current workflow text를 helper에 전달하는 integration assertion
  - `npm test`
- Stage 3
  - Isolated temporary npm cache에서 `node scripts/release-preflight.js`
  - Expected post-release WARN 2개와 FAIL 0개 assertion
  - `npm pack --dry-run --json`의 exact 23-file required/forbidden artifact 검사
  - Runtime/development dependency 0, package allowlist 16, lockfile 부재 검사
  - No-auth `--help`, `--version`, `profile --help`
  - Product source, README/docs와 release guide diff zero

### 통합 검증

- CI/Publish workflow 세 policy가 exact false이고 action/Node/permission/publish 경계가 유지된다.
- Negative test가 누락, `true`, wrong-step policy를 모두 거부한다.
- Full test 116개 이상과 package 23-file baseline이 통과한다.
- Advisory preflight는 expected release-state WARN 2개 외 모든 check가 `OK`다.
- Runtime/development dependency 0개, lockfile 부재와 sensitive scan을 유지한다.
- Actual Account Usage/Profile command, publish workflow, npm publish와 release mutation을 실행하지 않는다.
- `git status --short`가 PR 준비 전 빈 출력이다.
- `git diff --check`가 경고 없이 통과한다.

## 리스크

- **문자열 기반 YAML 검사 오탐**: Pure helper가 step-local block과 exact false를 검사하고 wrong-step fixture로 단순 global `includes`를 방지한다.
- **Automatic cache 동작 확대**: 승인 범위대로 Publish만 명시적으로 끄며 CI cache 정책 확대는 별도 이슈로 분리한다.
- **Checkout 이후 git 인증 필요성 누락**: 현재 workflow의 checkout 후 command를 검토하고 git fetch/push/submodule이 없음을 assertion/보고서에 기록한다.
- **Preflight release-state 경고 오분류**: 이미 배포된 `0.4.0`의 registry/tag WARN 2개를 expected 상태로 고정하고 workflow policy FAIL과 구분한다.
- **Package surface 변화**: 신규 script/test는 package allowlist 밖이며 exact 23-file dry-run으로 비포함을 검증한다.
- **Action drift**: 이번 task에서 v7을 변경하지 않고 PR #40/#41에서 검증된 main baseline을 보존한다.

## 승인 요청 사항

- CI/Publish Checkout에 `persist-credentials: false`, Publish Setup Node에 `package-manager-cache: false`를 추가하는 범위
- Step-local policy 검사를 pure `scripts/release-workflow-policy.js`로 분리하고 `src/__tests__/release-workflow-policy.test.js`에서 negative regression을 추가하는 설계
- README/docs와 product runtime, package metadata, action/Node/permission/release operation을 변경하지 않는 경계
- 3개 Stage와 expected post-release WARN 2개 분류

승인되면 `task_m04x_50_impl.md`에서 단계별 산출물, 검증 명령, exact diff allowlist와 커밋 메시지를 구체화한다.

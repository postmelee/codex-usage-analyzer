# Task M02x #38 수행계획서

GitHub Issue: [#38](https://github.com/postmelee/codex-usage-analyzer/issues/38)
마일스톤: M02x

## 목적

CI workflow의 `GITHUB_TOKEN` 권한을 repository 기본값에 의존하지 않고 workflow source에서 최소 권한으로 고정한다. 현재 checkout, test, package dry-run과 no-auth CLI smoke에 필요한 `contents: read`만 명시하고 write permission이나 OIDC token을 부여하지 않는다.

CodeQL alert #1 `actions/missing-workflow-permissions`를 source 수정과 재분석으로 해소한다. Alert를 dismiss하지 않으며 PR CI, merge 후 main CI와 CodeQL 상태까지 확인한 뒤 Issue #38을 종료한다.

## 배경

Issue #36에서 GitHub-managed CodeQL default setup을 활성화한 뒤 다음 medium alert가 발견됐다.

- Alert: `#1`
- Rule id: `actions/missing-workflow-permissions`
- Severity: `medium`
- Path: `.github/workflows/ci.yml`
- Ref: `refs/heads/main`

현재 repository의 default workflow permission은 `read`이고 GitHub Actions의 pull request approval 권한은 비활성화돼 있다. 따라서 현재 repository 설정만 보면 token이 write permission을 상속하지 않는다. 그러나 CI workflow 자체에는 `permissions`가 없어서 repository/organization 설정 변경 또는 workflow 복사 시 권한 경계가 달라질 수 있고, CodeQL도 이 외부 설정을 판별하지 못한다.

CI workflow는 다음 동작만 수행한다.

- Repository checkout
- Node runtime setup
- `npm test`
- `npm pack --dry-run`
- CLI `--help`, `--version` no-auth smoke

Issue, pull request, check, package, deployment, release, repository content를 수정하는 step은 없다. `contents: read`만 workflow-level로 명시하는 것이 현재 동작에 필요한 최소 경계다.

공식 근거:

- [CodeQL: Workflow does not contain permissions](https://codeql.github.com/codeql-query-help/actions/actions-missing-workflow-permissions/)
- [GitHub Docs: Use GITHUB_TOKEN for authentication in workflows](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token)
- [GitHub Docs: GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token)

현재 Dependabot이 생성한 PR #40과 #41은 각각 `actions/setup-node`, `actions/checkout` version을 갱신하며 `.github/workflows/ci.yml`과 `.github/workflows/publish.yml`을 함께 수정한다. 이 task는 해당 version update를 검토하거나 merge하지 않으며, PR 게시 전에 main에 먼저 반영됐다면 최신 action version을 보존한 상태에서 최소 permission 변경만 유지한다.

## 범위

### 포함

- Repository default workflow permission과 CodeQL alert #1 before 상태 기록
- CI step별 token permission 요구사항 검토
- `.github/workflows/ci.yml` workflow-level `permissions` 추가
- `contents: read`만 허용하고 모든 write permission과 `id-token: write` 부재 확인
- Existing trigger, job, action version, test/package/smoke step 비변경 확인
- `.github/workflows/publish.yml` source와 trusted publishing permission 비변경 확인
- `npm test`, package dry-run, CLI no-auth smoke 검증
- PR 게시 후 CI test와 CodeQL check 성공 확인
- Merge 후 main CI 성공과 CodeQL alert #1 fixed 상태 확인
- Alert를 dismiss하지 않고 분석 결과로 해소됐는지 확인
- Dependabot PR #40/#41과의 same-file 변경 상태 재확인

### 제외

- `.github/workflows/publish.yml` 수정
- Repository 또는 organization default workflow permission 변경
- GitHub Actions가 pull request를 승인하는 설정 변경
- Branch protection, merge policy와 Actions policy 변경
- Dependabot PR #40/#41 review, merge 또는 action version update
- Action SHA pinning 또는 다른 workflow hardening
- CodeQL default/advanced setup 변경
- Alert #1 dismiss 또는 임의 상태 변경
- Runtime/development dependency 추가
- CLI, SDK, Account Usage Contract, 사용자 문서 변경
- Version bump, npm publish, Git tag, GitHub Release

## 설계 방향

### Permission boundary

- `.github/workflows/ci.yml`의 `on`과 `jobs` 사이에 workflow-level permission을 둔다.
- Exact policy는 `permissions: { contents: read }`의 YAML block 표현이다.
- Job-level override는 추가하지 않는다. CI는 job 하나이며 workflow-level 선언이 더 명확하다.
- `packages: read`, `actions: read`, `checks: write`, `pull-requests: write`, `security-events: write`, `id-token: write`를 추가하지 않는다.
- GitHub default permission이 현재 `read`여도 source-level declaration을 유지해 외부 설정 변경과 workflow 복사에 대한 최소 권한 계약을 고정한다.

### Behavior preservation

- CI trigger는 `pull_request`와 `main` push를 유지한다.
- Job 이름, runner, action version과 모든 step을 변경하지 않는다.
- Publish Package workflow의 `contents: read`와 `id-token: write`는 npm trusted publishing 전용 경계이므로 그대로 유지한다.
- Runtime/development dependency, npm scripts와 package artifact를 변경하지 않는다.

### Remote acceptance gate

- PR 게시 전에는 source shape, local CI 시나리오와 diff boundary를 검증한다.
- PR 게시 후 `test`, `Analyze (actions)`, `Analyze (javascript-typescript)` check 성공을 merge 조건으로 확인한다.
- PR 본문에 `Closes #38`을 넣지 않는다. Merge 직후 main push CI와 CodeQL 재분석을 기다린다.
- Main CI가 성공하고 alert #1이 `fixed` 또는 open 목록에서 제거된 것을 확인한 뒤 Issue #38을 수동 종료한다.
- Alert가 open 상태로 남으면 dismiss하지 않고 CodeQL analysis ref/time과 원인을 확인하며 이슈를 닫지 않는다.

### Concurrent Dependabot PR

- PR #40/#41은 이 task 범위 밖이며 source에 함께 포함하지 않는다.
- 둘 중 하나가 먼저 merge되면 `main`을 반영하고 변경된 action version을 유지한다.
- Permission block 외 action version diff가 task branch에 섞이지 않았는지 PR 게시 전 재검증한다.
- Merge conflict가 발생하면 Dependabot 변경을 되돌리지 않고 최신 main 기준으로 permission 변경만 재적용한다.

## 문서 위치 판단

제품/사용자/기여자 문서는 변경하지 않는다. `.github/workflows/ci.yml`은 GitHub platform configuration이고, 계획·단계·검증 이력만 `mydocs/` 표준 task 폴더에 둔다.

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| `.github/workflows/ci.yml` | GitHub platform configuration | GitHub/maintainer | `.github/workflows/` | `docs/` | GitHub가 실행하는 기존 CI workflow의 고정 위치다. |
| Task 계획/단계/최종 보고 | 작업 산출물 | 내부 작업자 | `mydocs/` 표준 폴더 | `docs/` | Security 승인·검증 이력을 공개 사용자 문서와 분리한다. |

## 예상 변경 파일

신규:

- 없음

수정:

- `.github/workflows/ci.yml`

이번 task 산출물:

- `mydocs/orders/20260713.md`
- `mydocs/plans/task_m02x_38.md`
- `mydocs/plans/task_m02x_38_impl.md`
- `mydocs/working/task_m02x_38_stage{N}.md`
- `mydocs/report/task_m02x_38_report.md`

## 잠정 단계

- **Stage 1 — CI 최소 permission 명시와 정적 경계 검증**
  - Workflow-level `contents: read`를 추가한다.
  - Exact permission shape, write/id-token 부재, trigger/job/step과 publish workflow 비변경을 검증한다.
- **Stage 2 — Local CI 시나리오와 package 회귀 검증**
  - Test, package dry-run, CLI no-auth smoke를 CI step과 같은 순서로 실행한다.
  - Runtime/public contract와 npm artifact 비변경을 확인한다.
- **Stage 3 — 통합 security 검증과 remote gate 준비**
  - Repository default permission, CodeQL alert, task diff와 Dependabot PR 충돌 상태를 재확인한다.
  - PR check와 post-merge main/CodeQL gate를 최종 보고와 PR 본문에 고정한다.

## 검증 계획

### 단계별 검증

- Stage 1
  - Ruby standard YAML parser로 CI workflow의 exact `permissions` object 확인
  - `contents: read` 외 permission과 job-level override 부재 확인
  - Trigger, job, runner, action version과 step 비변경 확인
  - `.github/workflows/publish.yml` diff zero 확인
  - `git diff --check`
- Stage 2
  - `npm test`
  - `npm pack --dry-run --json`
  - `node bin/codex-usage-analyzer.js --help`
  - `node bin/codex-usage-analyzer.js --version`
  - Runtime/development dependency와 npm artifact 비변경 확인
- Stage 3
  - Repository default workflow permission API 재조회
  - CodeQL alert #1 상태와 open alert 목록 조회
  - Open Dependabot PR #40/#41 파일 충돌 상태 조회
  - Existing publish workflow와 runtime/public surface diff zero 확인
  - PR/main remote gate와 이슈 close 순서 검토

### 통합 검증

- CI source에 workflow-level `contents: read`만 존재한다.
- CI에 write permission과 `id-token: write`가 없다.
- Existing CI behavior와 Publish Package trusted publishing permission이 유지된다.
- Local test/package/smoke가 모두 통과한다.
- PR의 CI와 CodeQL checks가 통과한다.
- Merge 후 main CI가 통과하고 CodeQL alert #1이 분석으로 해소된다.
- Alert를 dismiss하지 않는다.
- Runtime dependency, CLI/SDK/contract, release와 사용자 문서가 변경되지 않는다.
- `git status --short`가 PR 준비 전 빈 출력이다.
- `git diff --check`가 경고 없이 통과한다.

## 리스크

- **Remote-only acceptance**: PR CI와 main CodeQL 결과는 local stage에서 확정할 수 없다. PR check를 merge gate로, main run과 alert 상태를 issue close gate로 분리한다.
- **Premature issue close**: PR에 `Closes #38`을 넣지 않고 post-merge 검증 후 수동 close한다.
- **Alert analysis delay**: Main push 뒤 CodeQL 반영이 늦을 수 있다. 같은 alert를 dismiss하지 않고 analysis 완료까지 기다린다.
- **Dependabot conflict**: PR #40/#41이 같은 workflow를 수정한다. 먼저 merge된 변경은 보존하고 permission block만 task diff로 유지한다.
- **Permission under-allocation**: `contents: read`로 PR CI가 실패하면 write permission을 즉시 추가하지 않고 실패 step과 필요한 scope를 분석해 계획 변경 승인을 요청한다.
- **Permission over-allocation**: 편의를 위해 packages/checks/pull-request/id-token permission을 추가하지 않는다.
- **YAML parser semantics**: Ruby YAML 1.1 parser가 `on`을 boolean처럼 해석할 수 있으므로 permission object 검증과 source diff 검증을 분리한다.
- **Publish regression**: Publish workflow를 수정하지 않고 exact diff zero를 검증한다.

## 승인 요청 사항

- CI workflow-level permission을 `contents: read` 하나로 제한하는 방향
- Repository default permission은 변경하지 않고 source-level contract만 명시하는 방향
- Publish Package workflow와 Dependabot action version PR을 범위에서 제외하는 방향
- PR에 `Closes #38`을 넣지 않고 merge 후 main CI/CodeQL 검증 뒤 Issue #38을 수동 종료하는 절차
- 3개 Stage 분할과 remote/post-merge acceptance gate

승인되면 `task_m02x_38_impl.md`에서 exact YAML 위치, 단계별 diff assertion, local/remote 검증 명령과 커밋 메시지를 구체화한다.

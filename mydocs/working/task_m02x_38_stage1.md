# Task M02x #38 Stage 1 완료 보고서

GitHub Issue: [#38](https://github.com/postmelee/codex-usage-analyzer/issues/38)
구현계획서: [`task_m02x_38_impl.md`](../plans/task_m02x_38_impl.md)
Stage: 1

## 단계 목적

CI workflow가 repository default `GITHUB_TOKEN` 설정을 상속하지 않도록 workflow-level 최소 권한을 source에서 명시한다. Checkout, test, package dry-run과 no-auth smoke에 필요한 `contents: read`만 허용하고 기존 CI 동작과 Publish Package trusted publishing 경계를 보존한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/ci.yml` | Workflow-level `permissions`에 `contents: read`만 명시하는 3줄을 추가했다. |

Before snapshot:

| 항목 | 상태 |
|---|---|
| Repository default workflow permission | `read` |
| Actions pull request approval | `false` |
| CodeQL alert #1 | `open`, medium, `actions/missing-workflow-permissions`, `.github/workflows/ci.yml`, `refs/heads/main` |
| Dependabot PR #40/#41 | 모두 OPEN, CI와 Publish Package workflow를 수정 |

## 본문 변경 정도 / 본문 무손실 여부

`.github/workflows/ci.yml`에 permission block 3줄만 추가했다. Existing `pull_request`/main push trigger, `test` job, Ubuntu runner, `actions/checkout@v4`, `actions/setup-node@v4`, Node 20, test/package/no-auth smoke step과 순서는 변경하지 않았다. `.github/workflows/publish.yml`, repository default Actions permission, runtime, CLI, SDK, Account Usage Contract와 사용자 문서는 수정하지 않았다.

## 검증 결과

실행 명령:

```bash
ruby -e 'require "yaml"; value=YAML.safe_load(File.read(".github/workflows/ci.yml")); expected={"contents"=>"read"}; abort "unexpected workflow permissions" unless value["permissions"]==expected; abort "job permission override" if value.fetch("jobs").values.any? { |job| job.key?("permissions") }'
ruby -e 'require "yaml"; base=YAML.safe_load(%x[git show main:.github/workflows/ci.yml]); current=YAML.safe_load(File.read(".github/workflows/ci.yml")); current.delete("permissions"); abort "CI behavior changed" unless current==base'
if rg -n '^[[:space:]]+(packages|actions|checks|pull-requests|security-events|id-token):|:[[:space:]]+write$' .github/workflows/ci.yml; then exit 1; fi
git diff --exit-code main...HEAD -- .github/workflows/publish.yml
git diff --check
```

결과:

- OK: Structured YAML 검사가 workflow-level permission object를 `{"contents":"read"}` exact shape로 확인했다.
- OK: Job-level permission override가 없다.
- OK: Permission object를 제거한 current CI 구조가 `main`의 기존 CI 구조와 일치했다.
- OK: Write, `id-token`, packages, actions, checks, pull-request와 security-events permission이 없다.
- OK: CI diff는 3줄 추가이며 기존 action version과 step은 변경되지 않았다.
- OK: `.github/workflows/publish.yml`은 `main...HEAD` 기준 변경이 없다.
- OK: `git diff --check`가 경고 없이 통과했다.
- 참고: Ruby 환경이 기존 `ffi` native extension 경고를 출력했지만 두 명령 모두 exit 0으로 완료됐고 YAML 검증에는 영향이 없었다.

## 잔여 위험

- Alert #1은 fix가 main에 merge되기 전이므로 계속 open 상태다. Alert를 dismiss하지 않는다.
- Dependabot PR #40/#41이 같은 CI와 publish workflow를 수정하므로 PR 게시 전 upstream 변경 여부를 재확인해야 한다.
- `contents: read`로 GitHub-hosted pull request CI가 동작하는지는 PR check에서 확인해야 한다.

## 다음 단계 영향

- Stage 2는 CI와 같은 순서로 test, package dry-run, CLI help/version smoke를 실행한다.
- Stage 2는 npm artifact와 runtime/development dependency가 변하지 않았는지 확인한다.
- Publish Package workflow와 action version은 계속 수정하지 않는다.

## 승인 요청

- Stage 1 최소 permission source 변경과 정적 경계 검증 결과를 승인하면 Stage 2 local CI 및 package 회귀 검증으로 진행한다.

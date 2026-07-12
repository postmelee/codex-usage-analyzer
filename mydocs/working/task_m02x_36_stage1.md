# Task M02x #36 Stage 1 완료 보고서

GitHub Issue: [#36](https://github.com/postmelee/codex-usage-analyzer/issues/36)
구현계획서: [`task_m02x_36_impl.md`](../plans/task_m02x_36_impl.md)
Stage: 1

## 단계 목적

GitHub dependency security baseline을 활성화하고 GitHub Actions dependency만 주간 확인하는 최소 Dependabot configuration을 추가한다. Runtime dependency, npm ecosystem update, credential과 기존 CI/publish workflow는 변경하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/dependabot.yml` | 6줄. GitHub Actions ecosystem, repository root, weekly interval만 정의하는 exact Dependabot v2 configuration을 추가했다. |

외부 GitHub repository 상태 변경:

| 설정 | 변경 전 | 변경 후 |
|---|---|---|
| Dependabot alerts | disabled, open alert API가 HTTP 403 반환 | enabled, open alert 0건 |
| Dependabot security updates | disabled | enabled |

Private vulnerability reporting, secret scanning과 push protection은 기존 enabled 상태를 유지했다. Public repository dependency graph는 SBOM endpoint 조회 성공으로 사용 가능 상태를 확인했다.

## 본문 변경 정도 / 본문 무손실 여부

신규 GitHub platform configuration 한 파일과 repository security setting만 변경했다. Runtime/development dependency, CLI, SDK, Account Usage Contract, README, SECURITY 문서, 기존 CI와 Publish Package workflow는 수정하지 않았다. Registry credential, reviewer, label, group, custom branch와 auto-merge 설정도 추가하지 않았다.

## 검증 결과

실행 명령:

```bash
ruby -e 'require "yaml"; value=YAML.safe_load(File.read(".github/dependabot.yml")); expected={"version"=>2,"updates"=>[{"package-ecosystem"=>"github-actions","directory"=>"/","schedule"=>{"interval"=>"weekly"}}]}; abort "unexpected dependabot config" unless value==expected'
gh api repos/postmelee/codex-usage-analyzer --jq '{visibility,security_and_analysis}'
gh api repos/postmelee/codex-usage-analyzer/private-vulnerability-reporting --jq '.enabled'
gh api 'repos/postmelee/codex-usage-analyzer/dependabot/alerts?state=open&per_page=100' --jq 'length'
gh api repos/postmelee/codex-usage-analyzer/dependency-graph/sbom --jq '.sbom.packages | length'
git diff --exit-code main...HEAD -- .github/workflows/ci.yml .github/workflows/publish.yml
git diff --check
```

결과:

- OK: Ruby standard YAML parser가 configuration을 읽었고 값 전체가 승인된 exact structure와 일치했다.
- OK: Repository는 public이고 Dependabot security updates는 `enabled`로 확인됐다.
- OK: Dependabot alerts 활성화 후 open alert API 조회가 성공했으며 결과는 0건이다.
- OK: Private vulnerability reporting은 `true`, secret scanning과 push protection은 `enabled` 상태를 유지했다.
- OK: Dependency graph SBOM endpoint가 정상 응답했고 package entry 3개를 반환했다.
- OK: `.github/workflows/ci.yml`과 `.github/workflows/publish.yml`은 `main...HEAD` 기준 변경이 없다.
- OK: `git diff --check`가 경고 없이 통과했다.
- 참고: Ruby 실행 환경이 기존 `ffi` native extension 경고를 출력했으나 명령은 exit 0으로 완료됐고 YAML parsing 결과에는 영향이 없었다.

## 잔여 위험

- `.github/dependabot.yml`은 default branch에 merge된 후 GitHub Actions version update에 실제 적용된다. 현재 단계에서는 exact configuration과 repository setting만 검증했다.
- Runtime dependency가 없으므로 Dependabot security updates가 활성화돼도 현재 수정 PR 대상이 없을 수 있다.
- Future Dependabot PR은 자동 merge하거나 이 단계에서 일괄 승인하지 않는다.

## 다음 단계 영향

- Stage 2는 GitHub-managed CodeQL default setup을 활성화하고 initial JavaScript/TypeScript analysis가 성공할 때까지 확인한다.
- Default setup 실패 시 advanced workflow를 추가하지 않고 Stage 2를 중단한 뒤 계획 변경 승인을 요청한다.
- Stage 2에서도 기존 CI/publish workflow source가 변경되지 않았는지 재검증한다.

## 승인 요청

- Stage 1 산출물과 외부 설정 변경 및 검증 결과를 승인하면 Stage 2 CodeQL default setup과 초기 analysis로 진행한다.

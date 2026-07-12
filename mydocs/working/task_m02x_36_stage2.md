# Task M02x #36 Stage 2 완료 보고서

GitHub Issue: [#36](https://github.com/postmelee/codex-usage-analyzer/issues/36)
구현계획서: [`task_m02x_36_impl.md`](../plans/task_m02x_36_impl.md)
Stage: 2

## 단계 목적

Repository 파일에 advanced CodeQL workflow를 추가하지 않고 GitHub-managed default setup을 활성화한다. GitHub가 자동 감지한 Actions와 JavaScript/TypeScript initial analysis가 성공하는지 확인하고, open alert는 비민감 필드만으로 분류한다.

## 산출물

| 항목 | 변경 요약 |
|---|---|
| CodeQL default setup | GitHub external repository state를 `not-configured`에서 `configured`로 변경했다. |
| Initial CodeQL run | Run `29205175711`에서 Actions와 JavaScript/TypeScript analysis가 성공했다. |

Repository source 또는 workflow 신규/수정 파일은 없다. 이 단계의 repository 산출물은 본 완료 보고서뿐이다.

## 본문 변경 정도 / 본문 무손실 여부

GitHub-managed CodeQL default setup만 활성화했다. 언어, query suite, threat model과 build mode를 별도 지정하지 않았으며 GitHub가 감지한 default configuration을 사용했다. `.github/workflows/codeql*.yml`, 기존 CI/publish workflow, runtime, CLI, SDK, Account Usage Contract와 사용자 문서는 변경하지 않았다.

## 검증 결과

실행 명령:

```bash
gh api repos/postmelee/codex-usage-analyzer/code-scanning/default-setup
gh run watch 29205175711 --repo postmelee/codex-usage-analyzer --exit-status
gh run view 29205175711 --repo postmelee/codex-usage-analyzer --json databaseId,status,conclusion,workflowName,url
gh run view 29205175711 --repo postmelee/codex-usage-analyzer --json jobs --jq '[.jobs[] | {name,status,conclusion}]'
gh api 'repos/postmelee/codex-usage-analyzer/code-scanning/alerts?state=open&per_page=100' --jq 'length'
gh api 'repos/postmelee/codex-usage-analyzer/code-scanning/alerts?state=open&per_page=100' --jq 'map({number,state,rule_id:.rule.id,severity:(.rule.security_severity_level // .rule.severity),path:.most_recent_instance.location.path})'
find .github/workflows -maxdepth 1 -type f -iname '*codeql*' -print
git diff --exit-code main...HEAD -- .github/workflows/ci.yml .github/workflows/publish.yml
git diff --check
```

결과:

- OK: Default setup은 `configured`, query suite는 `default`, threat model은 `remote`, schedule은 `weekly`, runner type은 `standard`로 확인됐다.
- OK: GitHub가 `actions`, `javascript`, `javascript-typescript`, `typescript`를 감지했다.
- OK: Initial run `29205175711`은 `completed/success`로 종료됐다.
- OK: `Analyze (javascript-typescript)`와 `Analyze (actions)` job이 모두 `completed/success`로 종료됐다. `Adjust Configuration` job은 분석 성공 후 `skipped` 상태다.
- OK: Repository에 advanced CodeQL workflow 파일이 없고 기존 `.github/workflows/ci.yml`, `.github/workflows/publish.yml`은 `main...HEAD` 기준 변경이 없다.
- OK: `git diff --check`가 경고 없이 통과했다.
- ALERT: Open code scanning alert 1건을 확인했다. Alert #1은 severity `medium`, rule id `actions/missing-workflow-permissions`, path `.github/workflows/ci.yml`이다.
- OK: Alert source fragment나 raw API payload를 보고서에 복사하지 않았고 alert를 수정하거나 dismiss하지 않았다.

## 잔여 위험

- `.github/workflows/ci.yml`의 explicit workflow permission 부재가 medium alert로 남아 있다. 최소 권한을 확정하고 수정하는 별도 GitHub Issue가 필요하다.
- 이 alert는 현재 #36의 기존 CI/publish permission 비변경 범위 밖이므로 Stage 2에서 수정하거나 dismiss하지 않았다.
- CodeQL default setup은 GitHub-managed schedule과 configuration에 의존한다. Advanced customization은 현재 필요하지 않다.

## 다음 단계 영향

- Stage 3는 Private reporting, Dependabot, CodeQL, secret scanning과 push protection의 최종 상태를 교차 검증한다.
- Stage 3는 open code scanning alert 1건을 최종 baseline에 포함하고 후속 이슈 필요 상태로 판정해야 한다.
- Stage 3에서도 기존 CI/publish workflow source와 permission이 변경되지 않았는지 확인한다.

## 승인 요청

- Stage 2 external setup, initial analysis와 alert 분류 결과를 승인하면 Stage 3 GitHub security baseline 통합 검증으로 진행한다.

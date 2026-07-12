# Task M02x #36 구현계획서

수행계획서: [`task_m02x_36.md`](task_m02x_36.md)
GitHub Issue: [#36](https://github.com/postmelee/codex-usage-analyzer/issues/36)
마일스톤: M02x

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | Dependabot baseline과 GitHub Actions update 설정 | `.github/dependabot.yml`, Stage 1 보고서 | exact YAML, Dependabot 설정/API, 기존 workflow 비변경 |
| 2 | CodeQL default setup과 초기 analysis | GitHub-managed default setup, Stage 2 보고서 | setup 상태, initial run, 분석 언어, open alert |
| 3 | GitHub security baseline 통합 검증 | Stage 3 보고서 | 전체 test, npm artifact, security API, diff 범위 |

## 문서 위치 확인

수행계획서의 문서 위치 판단과 실제 Stage 산출물 경로를 다음과 같이 고정한다. CodeQL default setup은 GitHub가 관리하는 repository 외부 상태이므로 repository workflow 파일을 만들지 않는다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| Dependabot configuration | `.github/` | `.github/dependabot.yml` | OK | GitHub가 인식하는 고정 위치 |
| Stage 보고서 | `mydocs/` 표준 폴더 | `mydocs/working/task_m02x_36_stage{N}.md` | OK | 외부 설정의 before/after와 검증 결과 기록 |
| CodeQL default setup | GitHub-managed 외부 상태 | repository 파일 없음 | OK | Advanced setup workflow를 추가하지 않음 |

## Stage 1 — Dependabot baseline과 GitHub Actions update 설정

### 산출물

신규:

- `.github/dependabot.yml`
- `mydocs/working/task_m02x_36_stage1.md`

수정:

- 없음

### 변경 내용

- 변경 전에 repository `security_and_analysis`, private vulnerability reporting, open Dependabot alert 상태를 조회해 비민감 상태값만 기록한다.
- Dependabot alerts를 repository setting에서 활성화한다.
- Dependabot security updates를 활성화한다. API 권한 또는 repository 상태 때문에 적용할 수 없으면 UI fallback 결과와 적용 불가 사유를 기록하고 임의 우회하지 않는다.
- 현재 `gh` 인증으로 API 변경이 거부되면 token scope를 확대하거나 credential을 출력하지 않고, 로그인된 GitHub Settings UI에서 같은 설정을 변경한 뒤 API로 재검증한다.
- `.github/dependabot.yml`은 다음 exact structure로 추가한다.

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

- npm ecosystem, registries, credentials, reviewers, assignees, labels, groups, custom branch, rebase strategy와 auto-merge 설정은 추가하지 않는다.
- Public repository dependency graph는 기존 GitHub 제공 상태만 확인하고 dependency submission workflow를 추가하지 않는다.
- Stage 보고서에는 API status와 open alert count만 기록하고 raw payload, token, cookie, authorization header는 남기지 않는다.
- 이 configuration은 default branch에 merge된 후 GitHub Actions update에 실제 적용된다는 잔여 조건을 보고서에 명시한다.

### 검증

```bash
ruby -e 'require "yaml"; value=YAML.safe_load(File.read(".github/dependabot.yml")); expected={"version"=>2,"updates"=>[{"package-ecosystem"=>"github-actions","directory"=>"/","schedule"=>{"interval"=>"weekly"}}]}; abort "unexpected dependabot config" unless value==expected'
gh api repos/postmelee/codex-usage-analyzer --jq '.security_and_analysis'
gh api repos/postmelee/codex-usage-analyzer/private-vulnerability-reporting --jq '.enabled'
gh api 'repos/postmelee/codex-usage-analyzer/dependabot/alerts?state=open&per_page=100' --jq 'length'
git diff --exit-code main...HEAD -- .github/workflows/ci.yml .github/workflows/publish.yml
git diff --check
```

설정 변경에는 다음 REST 요청을 우선 사용한다. 요청이 권한 부족으로 거부되면 위 UI fallback을 적용한다.

```bash
gh api --method PUT -H 'Accept: application/vnd.github+json' repos/postmelee/codex-usage-analyzer/vulnerability-alerts
gh api --method PUT -H 'Accept: application/vnd.github+json' repos/postmelee/codex-usage-analyzer/automated-security-fixes
```

### 커밋

```text
Task #36 Stage 1: Dependabot baseline과 Actions update 설정
```

## Stage 2 — CodeQL default setup과 초기 analysis

### 산출물

신규:

- `mydocs/working/task_m02x_36_stage2.md`

수정:

- 없음

외부 상태:

- CodeQL default setup: `not configured` -> `configured`

### 변경 내용

- 변경 전에 CodeQL default setup 상태를 조회하고 `not configured` 또는 no analysis 상태를 기록한다.
- Code scanning REST API로 `state=configured`만 지정해 GitHub-managed default setup을 활성화한다.
- 언어, query suite, threat model, build mode는 별도 지정하지 않고 GitHub의 JavaScript/TypeScript auto-detection과 default 값을 사용한다.
- 응답의 run id와 run URL을 비민감 식별자로 기록하고 initial analysis가 완료될 때까지 기다린다.
- Initial run은 `completed/success`, default setup은 `configured`, 분석 대상은 JavaScript/TypeScript임을 확인한다.
- Open code scanning alert가 있으면 severity, rule id, repository-relative path만 분류한다. Alert를 수정하거나 dismiss하지 않고 별도 이슈 후보로 넘긴다.
- `.github/workflows/codeql*.yml` 또는 다른 advanced setup workflow는 추가하지 않는다.
- Default setup 활성화나 initial run이 실패하면 safe error summary만 기록하고 Stage 2 완료 보고서와 커밋을 만들지 않는다. Advanced setup 전환은 수행/구현계획 변경과 작업지시자 승인을 먼저 받는다.

### 검증

```bash
gh api repos/postmelee/codex-usage-analyzer/code-scanning/default-setup
gh run view RUN_ID --repo postmelee/codex-usage-analyzer --json databaseId,status,conclusion,workflowName,url
gh api 'repos/postmelee/codex-usage-analyzer/code-scanning/alerts?state=open&per_page=100' --jq 'length'
find .github/workflows -maxdepth 1 -type f -iname '*codeql*'
git diff --exit-code main...HEAD -- .github/workflows/ci.yml .github/workflows/publish.yml
git diff --check
```

`find` 결과는 빈 출력이어야 한다. 활성화에는 다음 REST 요청을 사용하고, 반환된 실제 `run_id`로 `RUN_ID`를 치환한다.

```bash
gh api --method PATCH -H 'Accept: application/vnd.github+json' repos/postmelee/codex-usage-analyzer/code-scanning/default-setup -f state=configured
```

### 커밋

```text
Task #36 Stage 2: CodeQL default setup과 초기 analysis 검증
```

## Stage 3 — GitHub security baseline 통합 검증

### 산출물

신규:

- `mydocs/working/task_m02x_36_stage3.md`

수정:

- 없음. #36 범위의 결함이 발견되면 수정 전에 범위와 Stage 계획을 다시 승인받는다.

### 변경 내용

- Private vulnerability reporting, Dependabot alerts/security updates, CodeQL default setup, secret scanning과 push protection의 최종 상태를 교차 확인한다.
- Dependabot, code scanning, secret scanning open alert를 조회한다. Alert가 있으면 severity, rule id와 repository-relative path 기준으로 후속 이슈 필요 여부를 분류하고 임의 dismiss하지 않는다.
- 전체 test와 npm dry-run package를 검증한다.
- npm artifact에 `.github/`와 `mydocs/`가 포함되지 않는지 확인한다.
- Existing CI와 Publish Package workflow source 및 permission이 변경되지 않았는지 확인한다.
- Runtime dependency, CLI, SDK, public contract, README와 SECURITY 문서가 변경되지 않았는지 확인한다.
- 임시 npm pack JSON은 검증 후 삭제하고 repository나 보고서에 포함하지 않는다.

### 검증

```bash
npm test
npm pack --dry-run --json > /private/tmp/task36-stage3-pack.json
node -e 'const fs=require("node:fs"); const result=JSON.parse(fs.readFileSync("/private/tmp/task36-stage3-pack.json","utf8")); const files=result[0].files.map((entry)=>entry.path); if(files.some((path)=>path.startsWith(".github/")||path.startsWith("mydocs/"))) process.exit(1)'
gh api repos/postmelee/codex-usage-analyzer/private-vulnerability-reporting --jq '.enabled'
gh api repos/postmelee/codex-usage-analyzer --jq '.security_and_analysis'
gh api 'repos/postmelee/codex-usage-analyzer/dependabot/alerts?state=open&per_page=100' --jq 'length'
gh api repos/postmelee/codex-usage-analyzer/code-scanning/default-setup
gh api 'repos/postmelee/codex-usage-analyzer/code-scanning/alerts?state=open&per_page=100' --jq 'length'
gh api 'repos/postmelee/codex-usage-analyzer/secret-scanning/alerts?state=open&per_page=100' --jq 'length'
git diff --exit-code main...HEAD -- .github/workflows/ci.yml .github/workflows/publish.yml
git diff --exit-code main...HEAD -- package.json bin src README.md SECURITY.md docs
git diff --name-only main...HEAD
git diff --check
git status --short
```

### 커밋

```text
Task #36 Stage 3: GitHub security baseline 통합 검증
```

## 검증

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- GitHub 설정 변경 전후 상태는 같은 Stage에서 재조회하며, credential이나 raw security payload를 문서화하지 않는다.
- 실패한 검증은 단계 완료로 처리하지 않는다.
- Default setup 실패 시 advanced setup을 자동 적용하지 않는다.
- Open security alert를 임의 dismiss하지 않고 별도 승인된 이슈로 분리한다.
- 계획 변경이 필요하면 구현계획서를 먼저 갱신하고 작업지시자 승인을 받는다.
- 문서 위치가 수행계획서 판단과 달라지면 구현 전에 수행계획서 또는 구현계획서를 갱신하고 작업지시자 승인을 받는다.

## 커밋

- 단계 커밋은 단계 산출물과 `mydocs/working/task_m02x_36_stage{N}.md`를 함께 묶는다.
- 각 Stage의 source 변경과 external-state 검증 요약은 같은 단계 커밋으로 추적한다.
- 커밋 메시지는 `Task #36 Stage {N}: {핵심 내용 요약}` 형식을 따른다.
- Stage 3 승인 후 최종 보고서, 최종 검증, publish branch와 PR 게시 절차를 별도로 진행한다.

## 단계 의존성

- Stage 1은 이 구현계획서 승인 후 진행한다.
- Stage 2는 Stage 1 검증, 보고서, 커밋과 작업지시자 승인을 받은 뒤 진행한다.
- Stage 3은 Stage 2 initial CodeQL analysis 성공, 보고서, 커밋과 작업지시자 승인을 받은 뒤 진행한다.
- Dependabot configuration의 default branch 실제 적용은 PR merge 이후 확인 가능한 잔여 조건으로 최종 보고서에 명시한다.

## 위험과 대응

- **External state rollback 부재**: GitHub setting은 branch와 독립적으로 즉시 적용된다. 승인된 Stage의 설정만 변경하고 before/after를 기록한다.
- **API scope 부족**: REST 변경이 거부되면 token scope를 확대하거나 credential을 출력하지 않고 로그인된 GitHub Settings UI로 변경한 뒤 API로 검증한다.
- **Dependabot configuration 적용 시점**: Task branch의 YAML은 merge 전 default branch에서 동작하지 않는다. Exact YAML을 검증하고 merge 후 적용 확인이 필요함을 최종 보고서에 남긴다.
- **Dependabot PR noise**: GitHub Actions weekly entry 하나만 두고 npm ecosystem과 추가 option을 배제한다.
- **CodeQL setup failure**: Stage를 중단하고 safe error summary와 계획 변경안을 승인받는다. Advanced workflow를 자동 추가하지 않는다.
- **Security alert 노출**: 보고서에는 severity, rule id, repository-relative path만 기록하고 source fragment나 raw payload는 복사하지 않는다.
- **Workflow permission regression**: Managed default setup을 사용하고 existing CI/publish workflow diff zero를 각 Stage에서 검증한다.

## 승인 요청 사항

- Stage 1에서 Dependabot alerts/security updates를 활성화하고 exact GitHub Actions weekly configuration 하나만 추가하는 범위
- Stage 2에서 CodeQL default setup을 API로 활성화하고 initial analysis 성공까지 기다리는 절차
- API 권한 부족 시 로그인된 GitHub Settings UI를 사용하되 credential 변경 없이 API로 결과를 재검증하는 fallback
- Open alert를 이번 task에서 수정하거나 dismiss하지 않고 별도 이슈 승인으로 넘기는 경계
- Stage별 산출물, 검증 명령과 커밋 메시지

승인되면 Stage 1의 external setting 변경과 `.github/dependabot.yml` 구현을 진행한다.

# Task M02x #38 구현계획서

수행계획서: [`task_m02x_38.md`](task_m02x_38.md)
GitHub Issue: [#38](https://github.com/postmelee/codex-usage-analyzer/issues/38)
마일스톤: M02x

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | CI 최소 permission 명시와 정적 경계 검증 | `.github/workflows/ci.yml`, Stage 1 보고서 | Exact permission, workflow 무손실, publish diff zero |
| 2 | Local CI 시나리오와 package 회귀 검증 | Stage 2 보고서 | Test, package dry-run, CLI smoke, runtime/public 비변경 |
| 3 | 통합 security 검증과 remote gate 준비 | Stage 3 보고서 | Upstream 동기화, alert/Dependabot 상태, diff 범위, post-merge gate |

## 문서 위치 확인

수행계획서의 문서 위치 판단과 실제 Stage 산출물 경로를 다음과 같이 고정한다. 제품/사용자/기여자 문서는 변경하지 않는다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| CI workflow | `.github/workflows/` | `.github/workflows/ci.yml` | OK | 기존 GitHub platform configuration 최소 수정 |
| Stage 보고서 | `mydocs/` 표준 폴더 | `mydocs/working/task_m02x_38_stage{N}.md` | OK | Permission·CI·remote gate 검증 이력 |

## Stage 1 — CI 최소 permission 명시와 정적 경계 검증

### 산출물

신규:

- `mydocs/working/task_m02x_38_stage1.md`

수정:

- `.github/workflows/ci.yml`

### 변경 내용

- 변경 전에 repository default workflow permission, CodeQL alert #1과 Dependabot PR #40/#41 상태를 비민감 필드로 기록한다.
- `.github/workflows/ci.yml`의 `on` block과 `jobs` block 사이에 다음 exact block을 추가한다.

```yaml
permissions:
  contents: read
```

- Workflow-level permission object는 `contents: read` 하나만 포함한다.
- Job-level `permissions`, write permission, `id-token`, `packages`, `actions`, `checks`, `pull-requests`, `security-events` permission을 추가하지 않는다.
- Existing trigger, job id/name, runner, action version, test/package/smoke step과 순서를 변경하지 않는다.
- `.github/workflows/publish.yml`은 수정하지 않는다.
- Runtime/development dependency, npm scripts와 public surface를 변경하지 않는다.
- Stage 보고서에는 repository default permission과 alert metadata만 기록하고 token, raw workflow log 또는 source fragment를 복사하지 않는다.

### 검증

```bash
ruby -e 'require "yaml"; value=YAML.safe_load(File.read(".github/workflows/ci.yml")); expected={"contents"=>"read"}; abort "unexpected workflow permissions" unless value["permissions"]==expected; abort "job permission override" if value.fetch("jobs").values.any? { |job| job.key?("permissions") }'
ruby -e 'require "yaml"; base=YAML.safe_load(%x[git show main:.github/workflows/ci.yml]); current=YAML.safe_load(File.read(".github/workflows/ci.yml")); current.delete("permissions"); abort "CI behavior changed" unless current==base'
if rg -n '^[[:space:]]+(packages|actions|checks|pull-requests|security-events|id-token):|:[[:space:]]+write$' .github/workflows/ci.yml; then exit 1; fi
git diff --exit-code main...HEAD -- .github/workflows/publish.yml
git diff --check
```

Stage 1 before snapshot에는 다음 read-only 조회를 사용한다.

```bash
gh api repos/postmelee/codex-usage-analyzer/actions/permissions/workflow
gh api repos/postmelee/codex-usage-analyzer/code-scanning/alerts/1 --jq '{number,state,rule_id:.rule.id,severity:(.rule.security_severity_level // .rule.severity),path:.most_recent_instance.location.path,ref:.most_recent_instance.ref}'
gh pr view 40 --repo postmelee/codex-usage-analyzer --json number,state,files,url --jq '{number,state,files:[.files[].path],url}'
gh pr view 41 --repo postmelee/codex-usage-analyzer --json number,state,files,url --jq '{number,state,files:[.files[].path],url}'
```

### 커밋

```text
Task #38 Stage 1: CI 최소 permission 명시
```

## Stage 2 — Local CI 시나리오와 package 회귀 검증

### 산출물

신규:

- `mydocs/working/task_m02x_38_stage2.md`

수정:

- 없음

### 변경 내용

- CI workflow의 실행 순서와 동일하게 test, package dry-run, CLI no-auth smoke를 로컬에서 실행한다.
- Package dry-run JSON에서 package identity, file count, unpacked size와 forbidden path 부재만 기록한다.
- npm artifact에 `.github/`와 `mydocs/`가 포함되지 않는지 확인한다.
- Runtime/development dependency가 각각 0개인지 확인한다.
- Existing package metadata, runtime source, CLI/SDK/contract, README, SECURITY와 `docs/`가 변경되지 않았는지 확인한다.
- `.github/workflows/publish.yml` source와 trusted publishing permission이 변경되지 않았는지 확인한다.
- 검증용 JSON은 `/private/tmp/task38-stage2-pack.json`에 두고 검증 후 삭제한다.
- Sandbox의 사용자 npm cache 접근 제한으로 dry-run이 실패하면 command나 package를 변경하지 않고 승인된 실행으로 같은 명령을 재수행한다.

### 검증

```bash
npm test
npm pack --dry-run --json > /private/tmp/task38-stage2-pack.json
node bin/codex-usage-analyzer.js --help
node bin/codex-usage-analyzer.js --version
node -e 'const fs=require("node:fs"); const result=JSON.parse(fs.readFileSync("/private/tmp/task38-stage2-pack.json","utf8"))[0]; const files=result.files.map((entry)=>entry.path); const forbidden=files.filter((path)=>path.startsWith(".github/")||path.startsWith("mydocs/")); const pkg=require("./package.json"); if(forbidden.length||Object.keys(pkg.dependencies||{}).length||Object.keys(pkg.devDependencies||{}).length) process.exit(1); console.log(JSON.stringify({name:result.name,version:result.version,fileCount:files.length,unpackedSize:result.unpackedSize,forbidden}))'
git diff --exit-code main...HEAD -- .github/workflows/publish.yml
git diff --exit-code main...HEAD -- package.json bin src README.md SECURITY.md docs
git diff --check
git status --short
rm -f /private/tmp/task38-stage2-pack.json
```

`git status --short`는 Stage 1 commit 이후 Stage 2 보고서 작성 전에 빈 출력이어야 한다.

### 커밋

```text
Task #38 Stage 2: Local CI와 package 회귀 검증
```

## Stage 3 — 통합 security 검증과 remote gate 준비

### 산출물

신규:

- `mydocs/working/task_m02x_38_stage3.md`

수정:

- 없음. Upstream Dependabot merge 반영이 필요하면 최신 action version을 보존하는 통합 commit을 먼저 계획에 반영한다.

### 변경 내용

- `origin/main`을 fetch하고 task branch가 최신 main commit을 포함하는지 확인한다.
- Origin main이 앞서 있으면 PR 게시를 중단한다. `.github/workflows/ci.yml` 또는 publish workflow가 변경됐는지 확인하고, 사용자/Dependabot 변경을 보존하는 통합 방법을 승인받은 뒤 진행한다.
- Current CI에서 permission object를 제거한 구조가 `origin/main`의 CI와 같은지 확인해 action version, trigger, job과 step이 task diff에 섞이지 않았음을 검증한다.
- Repository default workflow permission이 계속 `read`, pull request approval은 false인지 확인한다. 이 외부 설정은 변경하지 않는다.
- Alert #1은 main에 permission fix가 merge되기 전이므로 Stage 3에서 `open`이어도 실패가 아니다. Rule id, severity, path, ref와 state만 기록한다.
- PR #40/#41의 현재 state와 파일 목록을 확인하고 same-file conflict 가능성을 기록한다. 두 PR을 수정하거나 merge하지 않는다.
- Task product diff는 `.github/workflows/ci.yml` 하나이고 나머지는 `mydocs/` task 산출물인지 확인한다.
- PR 본문에는 `Closes #38`을 넣지 않고 다음 remote gate를 명시한다.

PR gate:

1. `test` check pass
2. `Analyze (actions)` check pass
3. `Analyze (javascript-typescript)` check pass
4. CodeQL aggregate check pass

Post-merge issue-close gate:

1. Merge commit의 main `CI` run pass
2. Merge commit의 main `CodeQL` run에서 Actions analysis pass
3. Alert #1 API state가 `fixed`이거나 open alert 목록에서 제거됨
4. Alert가 dismissed 상태가 아님
5. 위 조건 확인 후에만 `gh issue close 38`

### 검증

```bash
git fetch origin --prune
test "$(git rev-list --count HEAD..origin/main)" -eq 0
ruby -e 'require "yaml"; base=YAML.safe_load(%x[git show origin/main:.github/workflows/ci.yml]); current=YAML.safe_load(File.read(".github/workflows/ci.yml")); current.delete("permissions"); abort "upstream CI mismatch" unless current==base'
gh api repos/postmelee/codex-usage-analyzer/actions/permissions/workflow
gh api repos/postmelee/codex-usage-analyzer/code-scanning/alerts/1 --jq '{number,state,rule_id:.rule.id,severity:(.rule.security_severity_level // .rule.severity),path:.most_recent_instance.location.path,ref:.most_recent_instance.ref}'
gh pr view 40 --repo postmelee/codex-usage-analyzer --json number,state,files,url --jq '{number,state,files:[.files[].path],url}'
gh pr view 41 --repo postmelee/codex-usage-analyzer --json number,state,files,url --jq '{number,state,files:[.files[].path],url}'
git diff --exit-code origin/main...HEAD -- .github/workflows/publish.yml
git diff --exit-code origin/main...HEAD -- package.json bin src README.md SECURITY.md docs
git diff --name-only origin/main...HEAD
git diff --check
git status --short
```

PR 생성 후 다음 명령으로 remote gate를 확인한다.

```bash
gh pr checks PR_NUMBER --repo postmelee/codex-usage-analyzer --watch --interval 5
```

Merge 후 cleanup에서는 실제 merge SHA와 run id로 placeholder를 치환한다.

```bash
gh pr view PR_NUMBER --repo postmelee/codex-usage-analyzer --json state,mergeCommit
gh run list --repo postmelee/codex-usage-analyzer --branch main --commit MERGE_SHA --json databaseId,workflowName,status,conclusion,url
gh run watch CI_RUN_ID --repo postmelee/codex-usage-analyzer --exit-status
gh run watch CODEQL_RUN_ID --repo postmelee/codex-usage-analyzer --exit-status
gh api repos/postmelee/codex-usage-analyzer/code-scanning/alerts/1 --jq '{number,state,fixed_at,dismissed_at,dismissed_reason}'
gh api 'repos/postmelee/codex-usage-analyzer/code-scanning/alerts?state=open&per_page=100' --jq 'map({number,rule_id:.rule.id,path:.most_recent_instance.location.path})'
```

Alert API의 fixed/dismiss metadata는 비민감 필드만 보고서에 기록한다. Source fragment와 raw analysis payload는 복사하지 않는다.

### 커밋

```text
Task #38 Stage 3: Security 통합 검증과 remote gate 확정
```

## 검증

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- Failed local test, permission mismatch, publish diff 또는 upstream mismatch가 있으면 단계 완료로 처리하지 않는다.
- Stage 3에서 alert #1이 open인 것은 fix가 아직 main에 merge되지 않았기 때문이며 expected pre-merge 상태로 구분한다.
- PR checks가 실패하면 merge 승인을 요청하지 않는다.
- Merge 후 main CI와 CodeQL alert fixed 확인 전 Issue #38을 닫지 않는다.
- Alert를 dismiss하거나 repository default permission을 변경하지 않는다.
- 계획 변경이 필요하면 구현계획서를 먼저 갱신하고 작업지시자 승인을 받는다.
- 문서 위치가 수행계획서 판단과 달라지면 구현 전에 수행계획서 또는 구현계획서를 갱신하고 작업지시자 승인을 받는다.

## 커밋

- 단계 커밋은 단계 산출물과 `mydocs/working/task_m02x_38_stage{N}.md`를 함께 묶는다.
- Stage 1 source 변경과 보고서를 한 commit으로 묶고 Stage 2/3 보고서는 각각 독립 commit으로 기록한다.
- 커밋 메시지는 `Task #38 Stage {N}: {핵심 내용 요약}` 형식을 따른다.
- Final report는 pre-merge 수용 기준과 pending remote gate를 구분한다.
- PR body에는 `Closes #38`을 넣지 않으며 issue close는 merge 후 cleanup에서 수행한다.

## 단계 의존성

- Stage 1은 이 구현계획서 승인 후 진행한다.
- Stage 2는 Stage 1 exact permission과 workflow 무손실 검증, 보고서, 커밋 승인 후 진행한다.
- Stage 3은 Stage 2 local CI scenario, package 검증, 보고서, 커밋 승인 후 진행한다.
- Final report/PR은 Stage 3 승인 후 진행하되 PR checks pass를 merge gate로 유지한다.
- Issue #38 close는 PR merge, main CI/CodeQL pass와 alert fixed 확인에 의존한다.

## 위험과 대응

- **Repository default already read**: 현재 위험이 낮더라도 source-level 최소 권한 계약과 CodeQL 해소 목적이 있으므로 explicit permission을 유지한다.
- **Remote-only acceptance**: PR check와 post-merge main/alert gate를 분리하고 Issue를 자동 close하지 않는다.
- **Dependabot same-file conflict**: Origin main이 앞서 있으면 Stage 3를 중단하고 최신 action version을 보존하는 통합 방법을 승인받는다.
- **Permission under-allocation**: CI 실패 시 write permission을 임의 추가하지 않고 실제 필요 scope와 계획 변경을 먼저 승인받는다.
- **Permission over-allocation**: `contents: read` 외 permission이 있으면 static validation을 실패시킨다.
- **Alert state ambiguity**: `fixed`, open 목록, dismiss metadata를 함께 확인하고 analysis에 의한 해소만 인정한다.
- **YAML 1.1 parsing**: Permission object는 structured parser로, 전체 behavior preservation은 같은 parser로 base/current를 비교해 `on` 해석 차이를 상쇄한다.
- **Publish regression**: Publish workflow diff zero를 모든 Stage와 final verification에서 확인한다.

## 승인 요청 사항

- Stage 1 exact source 변경과 structured diff 검증
- Stage 2 local CI/package scenario와 temporary artifact 처리
- Stage 3 origin/main 동기화 gate, Dependabot 충돌 확인과 pre-merge alert 해석
- PR에 `Closes #38`을 넣지 않고 post-merge main CI/CodeQL/alert fixed 확인 뒤 수동 close하는 절차
- Stage별 커밋 메시지와 remote/post-merge 검증 명령

승인되면 Stage 1의 `.github/workflows/ci.yml` 최소 permission 변경과 정적 검증을 진행한다.

# Task M010 #23 구현계획서

수행계획서: [`task_m010_23.md`](task_m010_23.md)
GitHub Issue: [#23](https://github.com/postmelee/codex-usage-analyzer/issues/23)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | release baseline과 공식 절차 후보 점검 | `mydocs/plans/task_m010_23_impl.md`, `mydocs/working/task_m010_23_stage1.md` | `git status --short`, Node/npm version 확인, npm registry/version 상태 확인, 공식 문서 체크리스트 |
| 2 | release ordering 문서 반영 | `README.md`, `mydocs/working/task_m010_23_stage2.md` | `npm test`, `npm pack --dry-run`, README 명령어/순서 수동 확인, `git diff --check` |
| 3 | 통합 검증과 최종 보고 | `mydocs/working/task_m010_23_stage3.md`, `mydocs/report/task_m010_23_report.md`, `mydocs/orders/20260703.md` | `npm test`, `npm pack --dry-run`, 문서 최종 점검, `git diff --check` |

## 문서 위치 확인

수행계획서의 "문서 위치 판단"과 실제 Stage 산출물 경로는 일치한다. 공식 메인테이너-facing release 절차는 기존 README `Release Checklist`를 보강하고, 새 `docs/` 루트는 만들지 않는다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `README.md` | 저장소 루트 | Stage 2 수정 후보 | OK | 기존 `Release Checklist`를 반복 가능한 release runbook으로 보강한다. |
| `mydocs/plans/task_m010_23_impl.md` | `mydocs/plans/` | Stage 1 신규 | OK | 단계별 구현 계획과 결정 기록을 추적한다. |
| `mydocs/working/task_m010_23_stage{N}.md` | `mydocs/working/` | Stage 1-3 신규 | OK | 단계별 검증 결과와 승인 요청을 기록한다. |
| `mydocs/report/task_m010_23_report.md` | `mydocs/report/` | Stage 3 신규 | OK | 최종 release ordering과 후속 automation 후보를 보존한다. |

## 현재 상태

- npm registry의 `codex-usage-analyzer` latest는 `0.1.0`이다.
- local `package.json` version도 `0.1.0`이다.
- local `package.json`은 `license: MIT`를 포함하지만, npm registry에 이미 올라간 `0.1.0`은 후속 publish 없이는 변경된 metadata를 반영하지 못한다.
- README `Release Checklist`는 test, pack dry-run, local CLI smoke, GitHub source `npx` smoke, trusted publishing setup, manual-only publish workflow, postpublish `npx @latest`, `npm audit signatures`를 포함한다.
- `.github/workflows/publish.yml`은 `workflow_dispatch`, `contents: read`, `id-token: write`, Node 24, `npm test`, `npm pack --dry-run`, `npm publish`를 사용한다.
- 사용자가 npmjs.com Trusted Publisher 설정을 완료했지만, 실제 publish workflow는 아직 실행하지 않았다.
- 현재 local runtime은 Node `v24.15.0`, npm `11.12.1`이다.

## 공식 조건 요약

참고 문서:

- npm version: https://docs.npmjs.com/cli/v10/commands/npm-version/
- npm publish: https://docs.npmjs.com/cli/v10/commands/npm-publish/
- npm semantic versioning: https://docs.npmjs.com/about-semantic-versioning/
- npm updating package version: https://docs.npmjs.com/updating-your-published-package-version-number/
- npm trusted publishers: https://docs.npmjs.com/trusted-publishers/
- npm provenance: https://docs.npmjs.com/generating-provenance-statements/
- npm registry signatures: https://docs.npmjs.com/verifying-registry-signatures/

요약:

- significant package update는 `package.json` version을 새 semver로 올려 publish해야 한다.
- patch는 backward-compatible bug fix, minor는 backward-compatible feature, major는 breaking change를 나타낸다.
- npm registry는 같은 package name/version 조합의 재사용을 허용하지 않는다. 삭제하더라도 동일 version은 다시 publish할 수 없다.
- `npm publish`의 기본 dist-tag는 `latest`이다.
- `npm pack --dry-run`은 publish될 package contents 확인 수단이다.
- `npm version <update_type>`은 package version을 변경하고, 기본 설정에서는 git commit/tag도 만든다.
- `npm version --no-git-tag-version <update_type>`은 package version 변경만 수행하고 git commit/tag는 만들지 않는 release prep PR에 더 적합하다.
- trusted publishing을 사용할 때 GitHub Actions publish는 OIDC 기반 short-lived credential을 사용하며 long-lived npm token이 필요 없다.
- trusted publishing에서 provenance attestation은 자동 생성되므로 `npm publish --provenance`를 추가하지 않는다.
- `npm audit signatures`는 설치된 package의 registry signature 검증에 사용할 수 있다.

## Stage 1 결정

Stage 2 반영 후보는 "README `Release Checklist`를 version bump PR -> main merge -> tag -> trusted publishing workflow -> postpublish smoke -> GitHub Release 순서로 보강"으로 둔다.

권장 release 순서:

1. release prep issue/PR에서 bump 종류를 결정한다.
2. release prep branch에서 `npm version --no-git-tag-version <patch|minor|major>` 또는 명시 version으로 `package.json` version만 올린다.
3. release prep PR에서 `npm test`, `npm pack --dry-run`, local CLI smoke, GitHub source `npx` smoke를 통과시킨다.
4. release prep PR을 main에 merge한다.
5. main에서 merge commit 기준 `vX.Y.Z` tag를 만들고 push한다.
6. GitHub Actions `Publish Package` workflow를 main에서 수동 실행한다.
7. npm registry의 latest/version을 확인한다.
8. `npx --yes codex-usage-analyzer@latest analyze --json` smoke와 `npm audit signatures`를 수행한다.
9. GitHub Release를 tag 기준으로 작성하고 검증 결과를 구조적 pass/fail만 기록한다.

선택 이유:

- `npm version` 기본 commit/tag 동작을 release prep branch에서 쓰면 하이퍼-워터폴 단계 커밋과 tag timing이 꼬일 수 있다.
- tag는 main merge commit을 기준으로 만들어야 source, PR, npm provenance 연결이 명확하다.
- GitHub Release는 npm publish와 postpublish smoke가 성공한 뒤 작성해야 실패 release note를 피할 수 있다.
- publish는 #22에서 준비한 trusted publishing workflow로 수행하고 local `npm publish`는 기본 경로에서 제외한다.
- 지금 task에서는 실제 version bump/tag/publish를 하지 않고 문서화만 수행한다.

Stage 2 README 보강:

- `Release Checklist`를 release prep, merge/tag, publish, postpublish verification 순서로 재구성한다.
- `0.1.0`이 이미 publish되어 동일 version 재사용이 불가능하므로 후속 release는 반드시 version bump가 필요하다고 명시한다.
- semver 기준을 이 프로젝트에 맞게 짧게 기록한다.
  - patch: backward-compatible bug fix, docs/package metadata/release process correction
  - minor: backward-compatible CLI/API/analyzer capability addition
  - major: breaking CLI/API/schema behavior change
- `UsageSnapshot v2` 계약 변경은 별도 issue에서 영향 분석 후 release version을 결정해야 한다고 연결한다.
- release prep PR에서는 `npm version --no-git-tag-version`을 사용하고 tag는 main merge 후 생성하도록 안내한다.
- publish workflow 실행 전 확인 gate를 명시한다.
- release notes에는 raw production snapshot, local path, account identifier, credential을 넣지 않도록 기록 범위를 제한한다.
- automation은 이번 task에서 구현하지 않고, 필요 시 후속 이슈 후보로 "release preflight/checklist script"를 남긴다.

## Stage 1 — release baseline과 공식 절차 후보 점검

### 산출물

신규:

- `mydocs/plans/task_m010_23_impl.md`
- `mydocs/working/task_m010_23_stage1.md`

수정:

- `mydocs/orders/20260703.md`

### 변경 내용

- npm `version`, `publish`, semver, trusted publishing/provenance, registry signature 공식 조건을 구현계획서에 고정한다.
- 현재 repo의 README release checklist, `package.json`, publish workflow, npm registry latest 상태를 기록한다.
- Stage 2에서 반영할 README release ordering을 승인 요청으로 정리한다.
- Stage 1에서는 README, package version, workflow를 아직 수정하지 않는다.

### 검증

```bash
git status --short
node -v
npm -v
npm view codex-usage-analyzer version dist-tags --json
npm pkg get version
rg -n '"version"|"license"|"scripts"|"engines"' package.json
rg -n "Release Checklist|Trusted publishing setup|publish workflow|After the package" README.md
rg -n "workflow_dispatch|id-token: write|node-version: 24|npm publish" .github/workflows/publish.yml
git diff --check
```

추가 수동 확인:

- npm 공식 `version`, `publish`, semver, trusted publishing/provenance, registry signature 문서 기준 확인
- #7, #22 최종 보고서 release flow와 충돌 여부 확인

### 커밋

```text
Task #23 Stage 1: release 절차 기준 점검
```

## Stage 2 — release ordering 문서 반영

### 산출물

신규:

- `mydocs/working/task_m010_23_stage2.md`

수정:

- `README.md`
- `mydocs/orders/20260703.md`

### 변경 내용

- README `Release Checklist`를 release prep, merge/tag, publish, postpublish verification 순서로 보강한다.
- version bump 필요성과 semver 결정 기준을 문서화한다.
- release prep PR에서 tag를 만들지 않는 version bump 명령을 안내한다.
- trusted publishing workflow 실행 전후 gate를 명시한다.
- postpublish smoke와 registry signature/provenance 검증 흐름을 정리한다.
- GitHub Release 작성 시점과 release note 기록 제한을 문서화한다.
- automation은 후속 이슈 후보로 남기고 이번 Stage에서는 구현하지 않는다.

### 검증

```bash
npm test
npm_config_cache=/private/tmp/codex-usage-analyzer-npm-cache npm pack --dry-run
rg -n "version bump|npm version|Publish Package|npm audit signatures|GitHub Release|vX.Y.Z|npm publish" README.md
git diff --check
```

추가 수동 확인:

- `package.json` version이 변경되지 않았는지 확인
- git tag가 생성되지 않았는지 확인
- `npm publish` 또는 publish workflow가 실행되지 않았는지 확인
- README 명령어 순서가 #7 실제 publish flow와 #22 trusted publishing workflow에 충돌하지 않는지 확인

### 커밋

```text
Task #23 Stage 2: release ordering 문서화
```

## Stage 3 — 통합 검증과 최종 보고

### 산출물

신규:

- `mydocs/working/task_m010_23_stage3.md`
- `mydocs/report/task_m010_23_report.md`

수정:

- `mydocs/orders/20260703.md`

### 변경 내용

- 전체 검증을 재실행한다.
- README release checklist가 수용 기준을 충족하는지 최종 점검한다.
- 실제 version bump, tag, GitHub Release, npm publish를 수행하지 않았음을 최종 보고서에 남긴다.
- 후속 automation 후보를 기록한다.

### 검증

```bash
npm test
npm_config_cache=/private/tmp/codex-usage-analyzer-npm-cache npm pack --dry-run
npm pkg get version
git tag --list 'v0.1.*'
git diff --check
```

추가 수동 확인:

- README release checklist 최종 확인
- 민감 정보 미노출 확인
- `npm publish`, git tag 생성, GitHub Release 생성 미수행 확인

### 커밋

```text
Task #23 Stage 3 + 최종 보고서: release 절차 검증 정리
```

## 검증 공통 규칙

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- 이번 task에서는 `package.json` version을 변경하지 않는다.
- 이번 task에서는 `npm publish`, GitHub Actions `Publish Package`, git tag 생성, GitHub Release 생성을 수행하지 않는다.
- release note 예시에는 raw analyzer JSON, local path, credential, npm account identifier를 기록하지 않는다.
- `UsageSnapshot v2` schema와 runtime analyzer behavior는 변경하지 않는다.

## 단계 의존성

- Stage 1은 이 구현계획서 작성과 Stage 1 보고 후 Stage 2 반영 범위 승인을 받아야 완료된다.
- Stage 2는 README release checklist 보강 범위가 승인된 뒤 진행한다.
- Stage 3은 Stage 2 검증과 보고서 승인 후 진행한다.

## 승인 요청 사항

- Stage 1-3 분할, 산출물, 검증 명령, 커밋 메시지를 이 구현계획서대로 고정하는 것
- Stage 2에서 README `Release Checklist`를 release prep -> merge/tag -> trusted publishing workflow -> postpublish smoke -> GitHub Release 순서로 보강하는 것
- Stage 2에서 release prep PR의 version bump는 `npm version --no-git-tag-version` 계열로 안내하고, tag는 main merge 후 생성하도록 문서화하는 것
- 이번 task에서 실제 version bump, git tag, GitHub Release, npm publish, publish workflow 실행을 제외하는 것

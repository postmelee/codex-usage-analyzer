# Task M010 #23 Stage 1 보고서

GitHub Issue: [#23](https://github.com/postmelee/codex-usage-analyzer/issues/23)
구현계획서: [`task_m010_23_impl.md`](../plans/task_m010_23_impl.md)
Stage: 1

## 단계 목적

Stage 1은 npm release version bump와 publish 관련 공식 조건을 현재 repository release flow와 대조하고, Stage 2에서 README에 반영할 release ordering을 정하는 단계다. 실제 README, package version, tag, publish workflow 변경 또는 실행은 Stage 2 이후로 분리한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/plans/task_m010_23_impl.md` | 단계별 구현계획서, 공식 조건, 현재 상태, Stage 2 권장 release ordering 작성 |
| `mydocs/working/task_m010_23_stage1.md` | Stage 1 점검 결과와 Stage 2 승인 요청 작성 |
| `mydocs/orders/20260703.md` | #23 상태를 Stage 1 완료 및 Stage 2 승인 대기로 갱신 |

## 본문 변경 정도 / 본문 무손실 여부

README, package metadata, GitHub Actions workflow, runtime code는 이 Stage에서 수정하지 않았다. Stage 1은 구현계획서와 단계 보고서, 오늘할일 상태만 추가/갱신했다.

## 점검 결과

### npm 공식 조건

- npm은 significant package update마다 새 semver version publish를 권장한다.
- npm semver 문서는 patch를 backward-compatible bug fix, minor를 backward-compatible feature, major를 breaking change로 구분한다.
- npm registry는 같은 package name/version 조합의 재사용을 허용하지 않는다. 삭제하더라도 동일 version은 다시 publish할 수 없다.
- `npm publish`의 기본 dist-tag는 `latest`이다.
- `npm pack --dry-run`은 publish될 package contents 확인 수단이다.
- `npm version <update_type>`은 version을 바꾸고, 기본 설정에서는 git commit과 tag도 만든다.
- release prep PR에서는 tag timing을 main merge 이후로 미루기 위해 `npm version --no-git-tag-version <update_type>` 계열이 더 안전하다.
- trusted publishing에서는 GitHub Actions OIDC 기반 publish를 사용하며 long-lived npm token이 필요 없다.
- trusted publishing의 provenance attestation은 자동 생성되므로 `npm publish --provenance`를 추가하지 않는다.
- `npm audit signatures`는 설치된 package의 registry signature 검증 수단으로 사용할 수 있다.

참고:

- https://docs.npmjs.com/cli/v10/commands/npm-version/
- https://docs.npmjs.com/cli/v10/commands/npm-publish/
- https://docs.npmjs.com/about-semantic-versioning/
- https://docs.npmjs.com/updating-your-published-package-version-number/
- https://docs.npmjs.com/trusted-publishers/
- https://docs.npmjs.com/generating-provenance-statements/
- https://docs.npmjs.com/verifying-registry-signatures/

### repository baseline

- npm registry latest는 `codex-usage-analyzer@0.1.0`이다.
- local `package.json` version도 `0.1.0`이다.
- `package.json`은 `license: MIT`를 포함한다.
- README `Release Checklist`는 test, pack dry-run, local CLI smoke, GitHub source `npx` smoke, trusted publishing setup, manual-only publish workflow, postpublish `npx @latest`, `npm audit signatures`를 포함한다.
- `.github/workflows/publish.yml`은 `workflow_dispatch`, `id-token: write`, Node 24, `npm test`, `npm pack --dry-run`, `npm publish`를 포함한다.
- 사용자가 npmjs.com Trusted Publisher 설정을 완료했으므로 남은 repository-side gap은 version bump와 release ordering 문서화다.
- local runtime은 Node `v24.15.0`, npm `11.12.1`이다.

### Stage 2 권장 방향

- README `Release Checklist`를 release prep, main merge/tag, trusted publishing workflow, postpublish verification, GitHub Release 순서로 보강한다.
- 후속 release는 `0.1.0`을 재사용할 수 없으므로 반드시 새 version을 선택해야 한다고 명시한다.
- release prep PR에서는 `npm version --no-git-tag-version <patch|minor|major>` 또는 명시 version으로 `package.json` version만 변경하도록 안내한다.
- tag는 release prep PR merge 후 main merge commit 기준 `vX.Y.Z`로 생성하도록 안내한다.
- GitHub Actions `Publish Package` workflow는 version bump PR merge와 tag 생성이 끝난 뒤 main에서 수동 실행하도록 문서화한다.
- publish 후 npm registry latest/version 확인, `npx --yes codex-usage-analyzer@latest analyze --json`, `npm audit signatures`를 수행하도록 정리한다.
- GitHub Release는 publish와 smoke가 성공한 뒤 tag 기준으로 작성하고, release note에는 raw production snapshot, local path, credential, account identifier를 기록하지 않도록 제한한다.
- release preflight/checklist automation은 이번 task에서 구현하지 않고 후속 이슈 후보로 남긴다.

## 검증 결과

실행 명령:

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

결과:

- OK: Stage 시작 전 작업트리 clean.
- OK: `node -v` 결과 `v24.15.0`.
- OK: `npm -v` 결과 `11.12.1`.
- OK: npm registry latest는 `0.1.0`.
- OK: local `npm pkg get version` 결과 `"0.1.0"`.
- OK: `package.json`에 `version`, `license`, `scripts`, `engines` 항목 존재 확인.
- OK: README `Release Checklist`와 trusted publishing/publish/postpublish 섹션 존재 확인.
- OK: publish workflow에 `workflow_dispatch`, `id-token: write`, `node-version: 24`, `npm publish` 존재 확인.
- OK: `git diff --check` 통과.
- OK: 실제 version bump, git tag, GitHub Release, npm publish, publish workflow 실행은 수행하지 않았다.

## 잔여 위험

- README에 release runbook을 너무 자세히 넣으면 문서가 길어질 수 있다. Stage 2에서는 반복 실행에 필요한 최소 절차 중심으로 보강한다.
- `npm version`은 기본 설정에서 commit/tag를 만들 수 있으므로 Stage 2 문서에서 `--no-git-tag-version` 사용 이유를 명확히 해야 한다.
- `npm audit signatures`는 설치된 package 기준 검증이므로 postpublish smoke 절차와 실행 위치를 README에서 더 분명히 해야 한다.
- automation은 아직 없으므로 실제 release 때 사람이 checklist를 정확히 따라야 한다.

## 다음 단계 영향

- Stage 2에서 README `Release Checklist`를 version bump PR -> main merge/tag -> trusted publishing workflow -> postpublish smoke -> GitHub Release 순서로 보강한다.
- Stage 2에서는 `package.json` version 변경, git tag 생성, GitHub Release 생성, npm publish, publish workflow 실행을 하지 않는다.
- Stage 2 검증에는 `npm test`, `npm pack --dry-run`, README 명령어/순서 확인, 실제 version/tag/publish 미수행 확인을 포함한다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2로 진행한다.
- Stage 2에서 README `Release Checklist`를 위 release ordering으로 보강하는 것을 승인 요청한다.
- Stage 2에서 release prep PR의 version bump는 `npm version --no-git-tag-version` 계열로 안내하고, tag는 main merge 후 생성하도록 문서화하는 것을 승인 요청한다.
- 이번 task에서 실제 version bump, git tag, GitHub Release, npm publish, publish workflow 실행을 계속 제외하는 것을 승인 요청한다.

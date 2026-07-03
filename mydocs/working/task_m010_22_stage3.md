# Task M010 #22 Stage 3 보고서

GitHub Issue: [#22](https://github.com/postmelee/codex-usage-analyzer/issues/22)
구현계획서: [`task_m010_22_impl.md`](../plans/task_m010_22_impl.md)
Stage: 3

## 단계 목적

Stage 3은 Stage 2에서 추가한 trusted publishing workflow와 README release 안내를 통합 검증하고, 최종 보고서와 PR 게시 준비 상태를 정리하는 단계다. 이번 Stage에서도 실제 `npm publish`와 npmjs.com package setting 변경은 수행하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m010_22_stage3.md` | 통합 검증 결과와 잔여 위험 기록 |
| `mydocs/report/task_m010_22_report.md` | #22 최종 보고서 작성 |
| `mydocs/orders/20260703.md` | #22 상태를 완료로 갱신 |

## 본문 변경 정도 / 본문 무손실 여부

runtime code, `UsageSnapshot v2` schema, package metadata, README, GitHub Actions workflow 본문은 Stage 3에서 추가 변경하지 않았다. Stage 3은 검증 결과와 최종 보고 문서만 추가한다.

## 통합 점검 결과

- trusted publishing 도입 방향은 유지한다.
- `.github/workflows/publish.yml`은 `workflow_dispatch` 수동 trigger만 사용한다.
- workflow는 `permissions.contents: read`, `permissions.id-token: write`, Node `24`, npm registry 설정, `npm test`, `npm pack --dry-run`, `npm publish`를 포함한다.
- workflow 파일 자체에는 `NODE_AUTH_TOKEN`, `NPM_TOKEN`, `_authToken`, `npm token`, `--provenance` 문자열이 없다.
- README에는 npmjs.com Trusted Publisher 설정 필요, workflow 실행 조건, token secret 금지, publish 후 `npm audit signatures` 확인 절차가 남아 있다.
- npmjs.com Trusted Publisher 등록과 실제 publish는 maintainer action으로 남긴다.
- #23에서 version bump, tag, GitHub Release, publish ordering을 별도 확정해야 한다.

## 검증 결과

실행 명령:

```bash
npm test
npm_config_cache=/private/tmp/codex-usage-analyzer-npm-cache npm pack --dry-run
ruby -e "require 'yaml'; YAML.load_file('.github/workflows/publish.yml'); puts 'workflow yaml ok'"
rg "workflow_dispatch|id-token: write|contents: read|node-version: 24|npm publish" .github/workflows/publish.yml
rg "NODE_AUTH_TOKEN|NPM_TOKEN|--provenance|_authToken|npm token" .github/workflows/publish.yml
git diff --check
```

결과:

- OK: `npm test` 통과. 47 tests, 47 pass, 0 fail, duration 389.795583 ms.
- OK: `npm pack --dry-run` 통과. total files 19, package size 20.6 kB, unpacked size 86.1 kB.
- OK: workflow YAML parse 통과. `workflow yaml ok` 출력. local Ruby가 unrelated `ffi` extension warning을 출력했지만 YAML parse는 성공했다.
- OK: workflow에 `workflow_dispatch`, `contents: read`, `id-token: write`, `node-version: 24`, `npm publish`가 존재한다.
- OK: workflow 파일에서 `NODE_AUTH_TOKEN`, `NPM_TOKEN`, `--provenance`, `_authToken`, `npm token` 문자열은 발견되지 않았다.
- OK: `git diff --check` 통과.
- OK: 실제 `npm publish`는 실행하지 않았다.

## 수용 기준 확인

| 수용 기준 | 결과 |
|---|---|
| trusted publishing/provenance 도입 여부가 근거와 함께 기록된다. | OK — 수행계획서, 구현계획서, Stage 1-3 보고서에 도입 결정과 근거를 기록했다. |
| GitHub Actions workflow와 npmjs.com trusted publisher 설정 요구사항이 문서화되거나 구현된다. | OK — `.github/workflows/publish.yml`을 추가하고 README에 npmjs.com maintainer action을 문서화했다. |
| npm token, npm account identifier, credential이 작업 문서와 PR 본문에 노출되지 않는다. | OK — secret value와 account identifier를 기록하지 않았고, workflow 파일에는 token/provenance secret 문자열이 없다. |
| 이번 task에서 신규 npm publish를 실행하지 않는다. | OK — 검증은 test/pack/workflow source 점검까지만 수행했다. |
| `git diff --check`가 경고 없이 통과한다. | OK — 빈 출력으로 통과했다. |

## 잔여 위험

- npmjs.com Trusted Publisher 등록은 저장소 밖 package setting이므로 maintainer가 별도로 수행해야 한다.
- `workflow_dispatch`는 수동 실행 시 실제 publish를 시도하므로 version bump와 release ordering이 끝나기 전 실행하면 안 된다.
- GitHub Actions 서버 측 workflow 실행은 이번 task에서 수행하지 않았다.
- #23에서 version bump, tag, GitHub Release, publish ordering을 확정해야 한다.

## 다음 단계 영향

- 최종 보고서와 오늘할일 완료 처리 후 `publish/task22` 브랜치로 PR을 게시한다.
- PR merge 후에는 `pr-merge-cleanup` 절차로 issue close, publish branch 삭제, local branch/worktree 정리를 진행한다.

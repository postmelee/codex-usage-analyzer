# Task M010 #23 Stage 2 보고서

GitHub Issue: [#23](https://github.com/postmelee/codex-usage-analyzer/issues/23)
구현계획서: [`task_m010_23_impl.md`](../plans/task_m010_23_impl.md)
Stage: 2

## 단계 목적

Stage 2는 Stage 1에서 승인된 방향대로 README `Release Checklist`를 version bump PR, main merge/tag, trusted publishing workflow, postpublish verification, GitHub Release 순서로 보강하는 단계다. 이번 Stage에서도 실제 version bump, git tag, GitHub Release, npm publish, publish workflow 실행은 수행하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `README.md` | release prep PR, semver 기준, `npm version --no-git-tag-version`, main merge 후 tag, manual publish workflow, postpublish smoke/signature verification, GitHub Release 작성 시점 정리 |
| `mydocs/working/task_m010_23_stage2.md` | Stage 2 변경과 검증 결과 기록 |
| `mydocs/orders/20260703.md` | #23 상태를 Stage 2 완료 및 Stage 3 승인 대기로 갱신 |

## 본문 변경 정도 / 본문 무손실 여부

기존 README의 `Release Checklist` 섹션만 보강했다. 기존 test/pack/local CLI/GitHub source `npx` smoke, trusted publishing setup, manual-only publish workflow, postpublish `npx @latest`, `npm audit signatures`, raw snapshot 기록 금지 원칙은 유지하고 실행 순서와 release gate를 구체화했다. runtime code, package metadata, GitHub Actions workflow, `UsageSnapshot v2` schema는 변경하지 않았다.

## 변경 내용

- `0.1.0` 이후 같은 package name/version을 재사용할 수 없으므로 후속 release는 version bump가 필수임을 명시했다.
- semver 기준을 이 프로젝트 문맥에 맞게 추가했다.
  - patch: backward-compatible bug fix, documentation/package metadata/release process correction
  - minor: backward-compatible CLI/API/analyzer capability addition
  - major: breaking CLI/API/package/`UsageSnapshot v2` behavior change
- `UsageSnapshot v2` 계약 변경은 별도 issue와 consumer impact analysis 후 version을 결정하도록 연결했다.
- release prep PR에서는 `npm version --no-git-tag-version <patch|minor|major>`를 사용하고 git tag, GitHub Release, npm publish를 만들지 않도록 명시했다.
- release prep PR merge 후 main merge commit에 `vX.Y.Z` tag를 만들고 push하는 순서를 추가했다.
- trusted publishing workflow 실행 전 registry state 확인과 workflow gate를 추가했다.
- trusted publishing에서는 npm token secret과 `--provenance`를 사용하지 않도록 명시했다.
- publish 후 registry version 확인, `npx @latest` smoke, throwaway verification project에서 `npm audit signatures`를 실행하는 순서를 추가했다.
- GitHub Release는 publish, smoke, signature verification이 모두 통과한 뒤 tag 기준으로 작성하도록 명시했다.

## 검증 결과

실행 명령:

```bash
npm test
npm_config_cache=/private/tmp/codex-usage-analyzer-npm-cache npm pack --dry-run
rg -n "version bump|npm version|Publish Package|npm audit signatures|GitHub Release|vX.Y.Z|npm publish" README.md
git diff --check
npm pkg get version
git tag --list 'v0.1.*'
ls codex-usage-analyzer-0.1.0.tgz
```

결과:

- OK: `npm test` 통과. 47 tests, 47 pass, 0 fail, duration 414.006167 ms.
- OK: `npm pack --dry-run` 통과. total files 19, package size 21.2 kB, unpacked size 88.1 kB.
- OK: README에서 `version bump`, `npm version`, `Publish Package`, `npm audit signatures`, `GitHub Release`, `vX.Y.Z`, `npm publish` 관련 release ordering 문구가 확인됐다.
- OK: `git diff --check` 통과.
- OK: `npm pkg get version` 결과 `"0.1.0"`. 이번 Stage에서 package version은 변경하지 않았다.
- OK: `git tag --list 'v0.1.*'` 출력 없음. 이번 Stage에서 release tag는 생성하지 않았다.
- OK: `ls codex-usage-analyzer-0.1.0.tgz`는 `No such file or directory`로 종료했다. `npm pack --dry-run`이 tarball 파일을 남기지 않았다.
- OK: 실제 `npm publish`와 GitHub Actions `Publish Package` workflow 실행은 수행하지 않았다.

## 잔여 위험

- release preflight/checklist automation은 아직 없다. 실제 release에서는 README checklist를 사람이 따라야 한다.
- GitHub Release 생성과 tag push는 이번 task에서 문서화만 했고 실제 실행 검증은 하지 않았다.
- throwaway verification project의 `npm audit signatures`는 publish 후 registry state가 있어야 의미가 있으므로 이번 Stage에서는 실행하지 않았다.

## 다음 단계 영향

- Stage 3에서 `npm test`, `npm pack --dry-run`, README release checklist 최종 점검을 다시 수행한다.
- 최종 보고서에는 실제 version bump, tag, GitHub Release, npm publish, publish workflow 실행을 하지 않았음을 명시한다.
- 후속 automation 후보는 최종 보고서에 남긴다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3 통합 검증과 최종 보고로 진행한다.

# Task M010 #22 Stage 2 보고서

GitHub Issue: [#22](https://github.com/postmelee/codex-usage-analyzer/issues/22)
구현계획서: [`task_m010_22_impl.md`](../plans/task_m010_22_impl.md)
Stage: 2

## 단계 목적

Stage 2는 Stage 1에서 승인된 방향대로 trusted publishing용 publish workflow 초안과 README release checklist 보강을 반영하는 단계다. 이번 Stage에서도 실제 `npm publish`와 npmjs.com package setting 변경은 수행하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/publish.yml` | `workflow_dispatch` 기반 npm publish workflow 추가 |
| `README.md` | trusted publisher 설정, manual workflow 실행 조건, provenance/signature 검증 안내 추가 |
| `mydocs/working/task_m010_22_stage2.md` | Stage 2 변경과 검증 결과 기록 |
| `mydocs/orders/20260703.md` | #22 상태를 Stage 2 완료 및 Stage 3 승인 대기로 갱신 |

## 본문 변경 정도 / 본문 무손실 여부

기존 README 본문은 유지하고 `Release Checklist` 섹션만 보강했다. runtime code, `UsageSnapshot v2` schema, package metadata, existing CI workflow는 변경하지 않았다.

## 변경 내용

- `.github/workflows/publish.yml`을 추가했다.
  - trigger는 `workflow_dispatch`만 사용한다.
  - `permissions.contents: read`, `permissions.id-token: write`를 명시했다.
  - GitHub-hosted `ubuntu-latest`와 Node `24`를 사용한다.
  - npm registry URL은 `https://registry.npmjs.org`로 설정했다.
  - Node `22.14.0+`, npm `11.5.1+` 조건을 workflow 내부에서 확인한다.
  - `npm test`, `npm pack --dry-run`, `npm publish` 순서로 실행한다.
  - npm token secret과 `--provenance` flag는 사용하지 않는다.
- README `Release Checklist`를 보강했다.
  - npm package Trusted Publisher 설정 필요성을 명시했다.
  - workflow filename `publish.yml`과 allowed action `npm publish`를 문서화했다.
  - npm token secret을 publish workflow에 추가하지 말라고 명시했다.
  - version bump와 release ordering 완료 전 workflow 실행 금지를 명시했다.
  - publish 후 `npm audit signatures` 검증을 추가했다.

## 검증 결과

실행 명령:

```bash
npm test
npm_config_cache=/private/tmp/codex-usage-analyzer-npm-cache npm pack --dry-run
ruby -e "require 'yaml'; YAML.load_file('.github/workflows/publish.yml'); puts 'workflow yaml ok'"
rg "workflow_dispatch|id-token: write|contents: read|node-version: 24|npm publish" .github/workflows/publish.yml
rg "NODE_AUTH_TOKEN|NPM_TOKEN|--provenance" .github/workflows/publish.yml
git diff --check
```

결과:

- OK: `npm test` 통과. 47 tests, 47 pass, 0 fail.
- OK: `npm pack --dry-run` 통과. total files 19, package size 20.6 kB, unpacked size 86.1 kB.
- OK: workflow YAML parse 통과. `workflow yaml ok` 출력. local Ruby가 unrelated `ffi` extension warning을 출력했지만 YAML parse는 성공했다.
- OK: workflow에 `workflow_dispatch`, `id-token: write`, `contents: read`, `node-version: 24`, `npm publish`가 존재한다.
- OK: workflow에서 `NODE_AUTH_TOKEN`, `NPM_TOKEN`, `--provenance` 문자열은 발견되지 않았다.
- OK: `git diff --check` 통과.
- OK: 실제 `npm publish`는 실행하지 않았다.

## 잔여 위험

- npmjs.com Trusted Publisher 설정은 저장소 밖 package setting이므로 maintainer가 별도로 등록해야 한다.
- `workflow_dispatch`는 수동 실행 시 실제 publish를 시도하므로 version bump와 release ordering이 끝나기 전 실행하면 안 된다.
- #23에서 version bump/tag/GitHub Release 순서를 확정해야 한다.
- workflow syntax는 YAML parse와 수동 점검으로 확인했지만, GitHub Actions 서버 측 실행은 아직 수행하지 않았다.

## 다음 단계 영향

- Stage 3에서 통합 검증을 다시 실행하고 workflow 권한/trigger/token 미사용을 최종 확인한다.
- 최종 보고서에는 npmjs.com Trusted Publisher maintainer action과 #23 의존성을 남긴다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3 통합 검증과 최종 보고로 진행한다.

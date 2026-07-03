# Task M010 #27 구현계획서

수행계획서: [`task_m010_27.md`](task_m010_27.md)
GitHub Issue: [#27](https://github.com/postmelee/codex-usage-analyzer/issues/27)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | preflight 설계와 현재 release baseline 점검 | `mydocs/plans/task_m010_27_impl.md`, `mydocs/working/task_m010_27_stage1.md` | `git status --short`, Node/npm version 확인, npm registry/version 상태 확인, README/package/workflow/scripts baseline 확인 |
| 2 | release preflight script 구현 | `scripts/release-preflight.js`, `package.json`, `mydocs/working/task_m010_27_stage2.md` | `npm test`, `npm run release:preflight`, `npm pack --dry-run`, mutation command source scan, `git diff --check` |
| 3 | README 반영과 통합 검증 | `README.md`, `mydocs/working/task_m010_27_stage3.md`, `mydocs/report/task_m010_27_report.md`, `mydocs/orders/20260703.md` | `npm test`, `npm run release:preflight`, README/script 최종 점검, 민감정보 scan, `git diff --check` |

## 문서 위치 확인

수행계획서의 "문서 위치 판단"과 실제 Stage 산출물 경로는 일치한다. release 보조 도구는 `scripts/`, npm entrypoint는 `package.json`, 공식 안내는 기존 README `Release Checklist`에 둔다. 새 `docs/` 루트는 만들지 않는다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `scripts/release-preflight.js` | `scripts/` | Stage 2 신규 후보 | OK | repository release tooling이며 사용자 CLI가 아니다. |
| `package.json` | 저장소 루트 | Stage 2 수정 후보 | OK | `npm run release:preflight` entrypoint를 추가한다. |
| `README.md` | 저장소 루트 | Stage 3 수정 후보 | OK | 기존 `Release Checklist`에 preflight 실행 시점만 보강한다. |
| `mydocs/plans/task_m010_27_impl.md` | `mydocs/plans/` | Stage 1 신규 | OK | 단계별 구현 계획과 결정 기록을 추적한다. |
| `mydocs/working/task_m010_27_stage{N}.md` | `mydocs/working/` | Stage 1-3 신규 | OK | 단계별 검증 결과와 승인 요청을 기록한다. |
| `mydocs/report/task_m010_27_report.md` | `mydocs/report/` | Stage 3 신규 | OK | 최종 설계와 검증 결과를 보존한다. |

## 현재 상태

- npm registry의 `codex-usage-analyzer` latest는 `0.1.0`이다.
- local `package.json` version도 `0.1.0`이다.
- local runtime은 Node `v24.15.0`, npm `11.12.1`이다.
- README `Release Checklist`는 version bump, main merge 후 tag, trusted publishing workflow, postpublish smoke/signature verification, GitHub Release 순서를 포함한다.
- `package.json` scripts에는 `test`만 있고 `release:preflight`는 없다.
- `scripts/`에는 `profile-smoke.js`만 있다.
- `.github/workflows/publish.yml`은 `workflow_dispatch`, `contents: read`, `id-token: write`, Node 24, `npm test`, `npm pack --dry-run`, `npm publish`를 포함한다.
- 현재 task에서는 실제 version bump, git tag, npm publish, GitHub Release를 수행하지 않는다.

## Stage 1 결정

Stage 2 구현 방향은 "기본 advisory preflight + strict release-ready mode"로 둔다.

선택 이유:

- 현재 repo는 아직 다음 version bump 전이라 local version `0.1.0`과 registry latest `0.1.0`이 같다.
- 기본 `npm run release:preflight`가 이 상태를 hard fail로 처리하면 이번 task의 검증 자체가 release prep 전 상태와 충돌한다.
- 반대로 version 재사용 위험을 무시하면 실제 release 안전 도구로서 약하다.
- 따라서 기본 모드는 read-only 구조 점검을 수행하고 release-ready 조건 위반은 warning으로 표시한다.
- 실제 publish 직전에는 `npm run release:preflight -- --release-ready` 또는 동일 strict mode를 사용해 version/tag/clean 상태를 hard fail로 처리한다.

Stage 2 script 설계:

- 파일: `scripts/release-preflight.js`
- entrypoint:
  - `npm run release:preflight`
  - optional strict mode: `npm run release:preflight -- --release-ready`
- 출력:
  - check별 `OK`, `WARN`, `FAIL` 요약
  - 마지막에 `release preflight passed`, `release preflight completed with warnings`, 또는 `release preflight failed`
- exit code:
  - default mode: structural failure가 있으면 `1`, warning만 있으면 `0`
  - `--release-ready`: warning으로 다뤘던 release readiness 문제도 `1`
- read-only command allowlist:
  - `git status --short`
  - `git tag --list <tag>`
  - `npm pkg get version`
  - `npm view codex-usage-analyzer version dist-tags --json`
  - `npm test`
  - `npm pack --dry-run --json`
- script가 직접 실행하지 않는 mutation command:
  - `npm version`
  - `npm publish`
  - `git tag`
  - `git push`
  - `gh release create`
  - `gh workflow run`

Stage 2 check 후보:

- `package.json` version parse와 npm latest/dist-tags parse
- local version이 registry latest보다 큰지 확인
- expected tag `v${version}` 존재 여부 확인
- working tree clean 여부 확인
- `npm test` 실행
- `npm pack --dry-run --json` 실행 및 files list parse
- package contents에 `README.md`, `LICENSE`, `package.json`, `bin/codex-usage-analyzer.js`, runtime `src/` 항목이 포함되는지 확인
- `.github/workflows/publish.yml`에 `workflow_dispatch`, `contents: read`, `id-token: write`, `node-version: 24`, `npm publish` 존재 확인
- workflow에 `NPM_TOKEN`, `NODE_AUTH_TOKEN`, `_authToken`, `--provenance` 미사용 확인
- README release checklist 핵심 문구 확인
- 민감정보 패턴 scan
- `codex-usage-analyzer-0.1.0.tgz` 같은 tarball 부산물 미생성 확인

Stage 3 README 보강:

- release prep PR에서 기본 `npm run release:preflight`를 실행하도록 안내한다.
- main merge/tag 후 publish workflow 실행 직전에 `npm run release:preflight -- --release-ready`를 실행하도록 안내한다.
- 기본 모드와 release-ready 모드의 차이를 짧게 설명한다.

## Stage 1 — preflight 설계와 현재 release baseline 점검

### 산출물

신규:

- `mydocs/plans/task_m010_27_impl.md`
- `mydocs/working/task_m010_27_stage1.md`

수정:

- `mydocs/orders/20260703.md`

### 변경 내용

- 현재 release baseline을 기록한다.
- default advisory mode와 strict release-ready mode의 역할을 고정한다.
- Stage 2 script check 후보와 read-only allowlist를 정리한다.
- Stage 1에서는 `scripts/release-preflight.js`, `package.json`, README를 아직 수정하지 않는다.

### 검증

```bash
git status --short
node -v
npm -v
npm pkg get version
npm view codex-usage-analyzer version dist-tags --json
rg -n "Release Checklist|npm version --no-git-tag-version|Publish Package|npm audit signatures|Do not paste raw production" README.md
rg -n '"scripts"|"test"|release:preflight|"version"|"files"' package.json
rg --files scripts
rg -n "workflow_dispatch|id-token: write|contents: read|node-version: 24|npm publish|--provenance|NPM_TOKEN|NODE_AUTH_TOKEN" .github/workflows/publish.yml
git diff --check
```

### 커밋

```text
Task #27 Stage 1: preflight 설계 기준 점검
```

## Stage 2 — release preflight script 구현

### 산출물

신규:

- `scripts/release-preflight.js`
- `mydocs/working/task_m010_27_stage2.md`

수정:

- `package.json`
- `mydocs/orders/20260703.md`

### 변경 내용

- read-only release preflight script를 구현한다.
- `package.json`에 `release:preflight` script를 추가한다.
- script는 기본 advisory mode와 `--release-ready` strict mode를 지원한다.
- script는 mutation command를 실행하지 않는다.
- README 반영은 Stage 3으로 분리한다.

### 검증

```bash
npm test
npm run release:preflight
npm run release:preflight -- --release-ready
npm_config_cache=/private/tmp/codex-usage-analyzer-npm-cache npm pack --dry-run
rg -n "npm version|npm publish|git tag|git push|gh release create|gh workflow run" scripts/release-preflight.js
ls codex-usage-analyzer-0.1.0.tgz
git diff --check
```

`npm run release:preflight -- --release-ready`는 현재 version/tag 상태 때문에 실패할 수 있다. Stage 2에서는 이 실패가 expected release-readiness failure인지 확인하고, structural failure와 구분한다.

### 커밋

```text
Task #27 Stage 2: release preflight script 구현
```

## Stage 3 — README 반영과 통합 검증

### 산출물

신규:

- `mydocs/working/task_m010_27_stage3.md`
- `mydocs/report/task_m010_27_report.md`

수정:

- `README.md`
- `mydocs/orders/20260703.md`

### 변경 내용

- README `Release Checklist`에 preflight 실행 시점과 strict mode를 반영한다.
- 전체 검증을 재실행한다.
- 실제 version bump, git tag, npm publish, GitHub Release를 수행하지 않았음을 최종 보고서에 남긴다.

### 검증

```bash
npm test
npm run release:preflight
npm_config_cache=/private/tmp/codex-usage-analyzer-npm-cache npm pack --dry-run
rg -n "release:preflight|--release-ready|Publish Package|npm audit signatures" README.md
rg -n "/Users/[A-Za-z0-9._-]+|BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9]|_authToken\\s*=|NPM_TOKEN\\s*=|NODE_AUTH_TOKEN\\s*=" README.md scripts/release-preflight.js mydocs/plans/task_m010_27.md mydocs/plans/task_m010_27_impl.md mydocs/working/task_m010_27_stage1.md mydocs/working/task_m010_27_stage2.md
git diff --check
```

추가 수동 확인:

- script source가 mutation command를 실행하지 않는지 확인
- `package.json` version이 변경되지 않았는지 확인
- git tag, npm publish, GitHub Release 생성이 수행되지 않았는지 확인

### 커밋

```text
Task #27 Stage 3 + 최종 보고서: release preflight 검증 정리
```

## 검증 공통 규칙

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- 이번 task에서는 `package.json` version을 변경하지 않는다.
- 이번 task에서는 `npm publish`, GitHub Actions `Publish Package`, git tag 생성, GitHub Release 생성을 수행하지 않는다.
- script는 read-only command allowlist 중심으로 구현한다.
- release note 예시나 preflight 출력에는 raw analyzer JSON, local path, credential, npm account identifier를 기록하지 않는다.
- `UsageSnapshot v2` schema와 runtime analyzer behavior는 변경하지 않는다.

## 단계 의존성

- Stage 1은 이 구현계획서 작성과 Stage 1 보고 후 Stage 2 구현 범위 승인을 받아야 완료된다.
- Stage 2는 default/strict mode 설계와 script 구현 범위가 승인된 뒤 진행한다.
- Stage 3은 Stage 2 검증과 보고서 승인 후 진행한다.

## 승인 요청 사항

- Stage 1-3 분할, 산출물, 검증 명령, 커밋 메시지를 이 구현계획서대로 고정하는 것
- Stage 2에서 default advisory mode와 `--release-ready` strict mode를 가진 `scripts/release-preflight.js`를 추가하는 것
- Stage 2에서 `package.json`에 `release:preflight` entrypoint를 추가하는 것
- Stage 3에서 README `Release Checklist`에 preflight 실행 시점과 strict mode 안내를 반영하는 것
- 이번 task에서 실제 version bump, git tag, GitHub Release, npm publish, publish workflow 실행을 제외하는 것

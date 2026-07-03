# Task M010 #27 Stage 1 보고서

GitHub Issue: [#27](https://github.com/postmelee/codex-usage-analyzer/issues/27)
구현계획서: [`task_m010_27_impl.md`](../plans/task_m010_27_impl.md)
Stage: 1

## 단계 목적

Stage 1은 release preflight script의 read-only 범위, version 비교 실패/경고 기준, 현재 repository release baseline을 고정하는 단계다. 실제 script, package script, README 변경은 Stage 2 이후로 분리한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/plans/task_m010_27_impl.md` | 단계별 구현계획서, 현재 baseline, default/strict preflight mode 결정, Stage 2 구현 범위 작성 |
| `mydocs/working/task_m010_27_stage1.md` | Stage 1 점검 결과와 Stage 2 승인 요청 작성 |
| `mydocs/orders/20260703.md` | #27 상태를 Stage 1 완료 및 Stage 2 승인 대기로 갱신 |

## 본문 변경 정도 / 본문 무손실 여부

README, `package.json`, GitHub Actions workflow, runtime code는 이 Stage에서 수정하지 않았다. Stage 1은 구현계획서와 단계 보고서, 오늘할일 상태만 추가/갱신했다.

## 점검 결과

### repository baseline

- local runtime은 Node `v24.15.0`, npm `11.12.1`이다.
- npm registry latest는 `codex-usage-analyzer@0.1.0`이다.
- local `package.json` version도 `0.1.0`이다.
- `package.json` scripts에는 `test`만 있고 `release:preflight`는 없다.
- `scripts/`에는 `profile-smoke.js`만 있다.
- README `Release Checklist`는 `npm version --no-git-tag-version`, `Publish Package`, `npm audit signatures`, raw production snapshot 기록 금지 문구를 포함한다.
- `.github/workflows/publish.yml`은 `workflow_dispatch`, `contents: read`, `id-token: write`, `node-version: 24`, `npm publish`를 포함한다.
- publish workflow에서 `--provenance`, `NPM_TOKEN`, `NODE_AUTH_TOKEN` 문자열은 발견되지 않았다.

### preflight mode 결정

Stage 2 구현은 기본 advisory mode와 `--release-ready` strict mode로 나눈다.

- 기본 `npm run release:preflight`
  - read-only 구조 점검과 안전 점검을 수행한다.
  - version 재사용 위험, dirty working tree, expected tag 부재 같은 release-ready 문제는 warning으로 표시한다.
  - structural failure가 없고 warning만 있으면 exit code `0`으로 끝난다.
- `npm run release:preflight -- --release-ready`
  - 실제 publish 직전 gate로 사용한다.
  - 기본 모드의 warning 중 release-ready 문제를 hard failure로 승격한다.
  - version이 npm latest보다 크지 않거나 expected tag가 없거나 working tree가 dirty면 exit code `1`로 끝난다.

선택 이유:

- 현재 task에서는 version bump를 하지 않으므로 local version과 npm latest가 모두 `0.1.0`이다.
- 기본 preflight가 이 상태를 hard fail로 처리하면 이번 task의 read-only 검증과 충돌한다.
- 하지만 실제 publish 직전에는 같은 version 재사용 위험을 반드시 실패로 처리해야 하므로 strict mode가 필요하다.

### Stage 2 구현 방향

- `scripts/release-preflight.js`를 추가한다.
- `package.json`에 `release:preflight` script를 추가한다.
- script는 `OK`, `WARN`, `FAIL` check summary를 출력한다.
- script는 `npm test`와 `npm pack --dry-run --json`을 직접 실행한다.
- script는 package contents, README, LICENSE, publish workflow 조건, token/provenance 금지 조건, version/latest/tag/clean 상태, 민감정보 패턴을 확인한다.
- script는 mutation command를 실행하지 않는다.

## 검증 결과

실행 명령:

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

결과:

- OK: Stage 시작 전 작업트리 clean.
- OK: `node -v` 결과 `v24.15.0`.
- OK: `npm -v` 결과 `11.12.1`.
- OK: local `npm pkg get version` 결과 `"0.1.0"`.
- OK: npm registry latest는 `0.1.0`, dist-tag `latest`도 `0.1.0`.
- OK: README release checklist 핵심 문구 확인.
- OK: `package.json`에 `version`, `files`, `scripts.test` 항목 존재, `release:preflight`는 아직 없음.
- OK: `scripts/`에는 `scripts/profile-smoke.js`만 존재.
- OK: publish workflow에 `workflow_dispatch`, `contents: read`, `id-token: write`, `node-version: 24`, `npm publish`가 존재한다.
- OK: publish workflow에서 `--provenance`, `NPM_TOKEN`, `NODE_AUTH_TOKEN` 문자열은 발견되지 않았다.
- OK: `git diff --check` 통과.
- OK: 실제 version bump, git tag, GitHub Release, npm publish, publish workflow 실행은 수행하지 않았다.

## 잔여 위험

- default advisory mode가 warning을 exit code `0`으로 처리하므로 실제 release 직전에는 반드시 `--release-ready` strict mode를 사용해야 한다.
- `npm view`는 network에 의존한다. registry 조회 실패 시 Stage 2에서 실패 메시지와 exit code를 명확히 해야 한다.
- `npm test`와 `npm pack --dry-run --json`을 preflight 내부에서 실행하면 시간이 늘어난다.
- source scan만으로 mutation command 부재를 완벽히 증명할 수는 없으므로 Stage 2에서 command allowlist 구현을 명확히 해야 한다.

## 다음 단계 영향

- Stage 2에서 `scripts/release-preflight.js`와 `package.json` `release:preflight` script를 추가한다.
- Stage 2 검증은 기본 preflight 통과와 strict mode의 expected release-readiness failure 구분을 포함한다.
- README 반영은 Stage 3에서 수행한다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2로 진행한다.
- Stage 2에서 default advisory mode와 `--release-ready` strict mode를 가진 `scripts/release-preflight.js`를 추가하는 것을 승인 요청한다.
- Stage 2에서 `package.json`에 `release:preflight` entrypoint를 추가하는 것을 승인 요청한다.
- 이번 task에서 version bump, git tag, GitHub Release, npm publish, publish workflow 실행을 계속 제외하는 것을 승인 요청한다.

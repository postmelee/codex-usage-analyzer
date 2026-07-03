# Task M010 #22 Stage 1 보고서

GitHub Issue: [#22](https://github.com/postmelee/codex-usage-analyzer/issues/22)
구현계획서: [`task_m010_22_impl.md`](../plans/task_m010_22_impl.md)
Stage: 1

## 단계 목적

Stage 1은 npm trusted publishing/provenance 공식 조건과 현재 repository release baseline을 대조하고, Stage 2에서 실제로 반영할 workflow와 README 보강 범위를 정하는 단계다. 실제 workflow와 README 변경은 Stage 2로 분리한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/plans/task_m010_22_impl.md` | 단계별 구현계획서, 공식 조건, 현재 상태, Stage 2 권장 설계 작성 |
| `mydocs/working/task_m010_22_stage1.md` | Stage 1 점검 결과와 Stage 2 승인 요청 작성 |
| `mydocs/orders/20260703.md` | #22 상태를 Stage 1 완료 및 Stage 2 승인 대기로 갱신 |

## 본문 변경 정도 / 본문 무손실 여부

코드, README, GitHub Actions workflow, package metadata는 이 Stage에서 수정하지 않았다. Stage 1은 구현계획서와 단계 보고서, 오늘할일 상태만 추가/갱신했다.

## 점검 결과

### npm 공식 조건

- trusted publishing은 OIDC 기반 publish로 long-lived npm token 없이 publish할 수 있다.
- npm trusted publishing은 npm CLI `11.5.1+`와 Node `22.14.0+` 조건이 있다.
- GitHub Actions trusted publishing은 GitHub-hosted runner와 `permissions.id-token: write`, `contents: read` 권한이 필요하다.
- npmjs.com package settings에서 GitHub Actions trusted publisher를 등록해야 하며, workflow filename이 실제 `.github/workflows/` 파일과 일치해야 한다.
- GitHub Actions/GitLab CI/CD trusted publishing은 provenance attestation을 기본 생성하므로 `npm publish`에 `--provenance` flag가 필요 없다.
- `npm audit signatures`는 release 후 registry signature/provenance attestation 검증 수단으로 사용할 수 있다.

### repository baseline

- 현재 workflow는 `.github/workflows/ci.yml` 하나뿐이며 release publish workflow는 없다.
- CI는 Node 20에서 `npm test`, `npm pack --dry-run`, local CLI smoke를 수행한다.
- README `Release Checklist`는 manual publish 전후 검증만 다루고 trusted publishing/provenance setup은 없다.
- `package.json`은 `repository`, `homepage`, `bugs`, `license` metadata를 갖추고 있다.
- runtime dependency와 install/publish lifecycle script가 없다.
- `package-lock.json` 또는 `npm-shrinkwrap.json`은 없다.
- local runtime은 Node `v24.15.0`, npm `11.12.1`로 trusted publishing 문서 조건을 만족한다.

### Stage 2 권장 방향

- trusted publishing을 채택하는 방향으로 진행한다.
- 신규 `.github/workflows/publish.yml`을 추가하되 trigger는 `workflow_dispatch`로 제한한다.
- workflow는 Node 24, `id-token: write`, `contents: read`, npm registry 설정, `npm test`, `npm pack --dry-run`, `npm publish`만 포함한다.
- workflow에는 `NODE_AUTH_TOKEN`, `NPM_TOKEN`, `--provenance`를 두지 않는다.
- README에는 npmjs.com trusted publisher 설정 필요, workflow 실행 조건, provenance verification, #23 version bump 절차 의존성을 명시한다.
- 실제 npm publish와 npmjs.com trusted publisher 등록은 이번 task에서 수행하지 않는다.

## 검증 결과

실행 명령:

```bash
git status --short
node -v
npm -v
rg --files | rg '(^|/)package-lock\\.json$|(^|/)npm-shrinkwrap\\.json$'
rg --files .github/workflows
git diff --check
```

결과:

- OK: Stage 시작 전 작업트리 clean.
- OK: `node -v` 결과 `v24.15.0`.
- OK: `npm -v` 결과 `11.12.1`.
- OK: lockfile 검색은 출력 없음. 현재 repo에는 `package-lock.json`/`npm-shrinkwrap.json`이 없다.
- OK: workflow 검색 결과 `.github/workflows/ci.yml`만 존재.
- OK: `git diff --check` 통과.

## 잔여 위험

- npmjs.com trusted publisher 등록은 저장소 밖 설정이므로 Stage 2에서 workflow를 추가해도 maintainer가 npm package settings를 설정하기 전에는 실제 publish가 성공하지 않는다.
- `workflow_dispatch`도 수동 실행하면 publish를 시도하므로 README에 version bump와 trusted publisher 설정 전 실행 금지를 명시해야 한다.
- `package-lock.json`이 없으므로 npm 공식 예시의 `npm ci`를 그대로 쓰면 현재 repo에서는 실패한다.
- #23에서 version bump/tag/GitHub Release 순서가 확정되기 전까지 publish trigger는 보수적으로 유지해야 한다.

## 다음 단계 영향

- Stage 2에서 `.github/workflows/publish.yml`을 추가한다.
- Stage 2에서 README `Release Checklist`를 trusted publishing setup과 publish workflow 중심으로 보강한다.
- Stage 2 검증에는 `npm test`, `npm pack --dry-run`, workflow 권한/trigger/secret 미사용 수동 확인을 포함한다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2로 진행한다.
- Stage 2에서 `workflow_dispatch` 기반 `.github/workflows/publish.yml`을 추가하는 것을 승인 요청한다.
- Stage 2에서 README에 trusted publisher setup, workflow 실행 조건, provenance verification, #23 의존성을 보강하는 것을 승인 요청한다.
- 이번 task에서 npm publish, npmjs.com 설정 직접 변경, npm token 생성/저장을 계속 제외하는 것을 승인 요청한다.

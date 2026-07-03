# Task M010 #22 구현계획서

수행계획서: [`task_m010_22.md`](task_m010_22.md)
GitHub Issue: [#22](https://github.com/postmelee/codex-usage-analyzer/issues/22)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 공식 조건과 repo release baseline 점검 | `mydocs/plans/task_m010_22_impl.md`, `mydocs/working/task_m010_22_stage1.md` | `git status --short`, Node/npm version 확인, 공식 조건 체크리스트 |
| 2 | trusted publishing/provenance 결정 반영 | `.github/workflows/publish.yml`, `README.md`, `mydocs/working/task_m010_22_stage2.md` | `npm test`, `npm pack --dry-run`, workflow 권한/구문 수동 확인, `git diff --check` |
| 3 | 통합 검증과 최종 보고 | `mydocs/working/task_m010_22_stage3.md`, `mydocs/report/task_m010_22_report.md`, `mydocs/orders/20260703.md` | `npm test`, `npm pack --dry-run`, workflow 최종 점검, `git diff --check` |

## 문서 위치 확인

수행계획서의 "문서 위치 판단"과 실제 Stage 산출물 경로는 일치한다. 공식 사용자/메인테이너-facing release 안내는 README를 유지하고, GitHub Actions release automation은 `.github/workflows/`에 둔다. 새 `docs/` 루트는 만들지 않는다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `README.md` | 저장소 루트 | Stage 2 수정 후보 | OK | 기존 release checklist 표면을 보강한다. |
| `.github/workflows/publish.yml` | `.github/workflows/` | Stage 2 신규 후보 | OK | GitHub Actions OIDC 권한과 npm publish flow를 코드 리뷰 대상으로 만든다. |
| `mydocs/plans/task_m010_22_impl.md` | `mydocs/plans/` | Stage 1 신규 | OK | 단계별 구현 계획과 결정 기록을 추적한다. |
| `mydocs/working/task_m010_22_stage{N}.md` | `mydocs/working/` | Stage 1-3 신규 | OK | 단계별 검증 결과와 승인 요청을 기록한다. |
| `mydocs/report/task_m010_22_report.md` | `mydocs/report/` | Stage 3 신규 | OK | 최종 결정과 잔여 설정 작업을 보존한다. |

## 현재 상태

- `.github/workflows/ci.yml`은 Node 20에서 `npm test`, `npm pack --dry-run`, local CLI smoke를 실행한다.
- release 전용 GitHub Actions workflow는 없다.
- README `Release Checklist`는 manual publish 전후 검증 명령만 다룬다.
- `package.json`은 `repository`, `homepage`, `bugs`, `license` metadata를 갖추고 있다.
- `package.json`에는 runtime dependency와 install/publish lifecycle script가 없다.
- repo에는 `package-lock.json` 또는 `npm-shrinkwrap.json`이 없다.
- 현재 local runtime은 Node `v24.15.0`, npm `11.12.1`로 npm trusted publishing 공식 조건을 만족한다.

## 공식 조건 요약

- npm trusted publishing은 long-lived npm token 없이 CI/CD provider의 OIDC로 publish하는 구조다.
- npm trusted publishing은 npm CLI `11.5.1` 이상과 Node `22.14.0` 이상이 필요하다.
- GitHub Actions trusted publisher 설정에는 npmjs.com package settings에서 owner/repository/workflow filename/allowed action을 등록해야 한다.
- GitHub Actions workflow에는 `permissions.id-token: write`와 `contents: read`가 필요하다.
- GitHub Actions/GitLab CI/CD trusted publishing은 provenance attestation을 기본 생성하므로 `npm publish`에 `--provenance`가 필요 없다.
- token 기반 provenance는 `npm publish --provenance`와 `NODE_AUTH_TOKEN`이 필요하지만, 이번 task의 기본 방향은 token 없는 trusted publishing이다.
- provenance는 package가 어디서 어떻게 build/publish 되었는지 검증 가능한 연결을 제공하지만, package가 악성 코드가 아님을 보장하지는 않는다.
- provenance attestation 검증은 release 후 `npm audit signatures`로 확인할 수 있다.

## Stage 1 결정

Stage 2 반영 후보는 "trusted publishing 채택 + publish workflow source 추가 + README release checklist 보강"으로 둔다.

선택 이유:

- #7 manual publish는 인증과 OTP를 사람이 처리했고, long-lived token은 쓰지 않았지만 CI 기반 provenance도 없었다.
- trusted publishing은 long-lived npm token 없이 publish할 수 있고 GitHub Actions에서는 provenance를 자동 생성한다.
- #23에서 version bump/tag/release 절차를 별도로 정해야 하므로, #22에서는 자동 publish trigger를 과하게 고정하지 않는다.
- 현재 repo에는 lockfile이 없으므로 release workflow에서 `npm ci`를 쓰면 실패할 수 있다. 현 package 상태에서는 `npm test`, `npm pack --dry-run`, `npm publish` 흐름이 더 정확하다.

Stage 2 권장 설계:

- 신규 workflow: `.github/workflows/publish.yml`
- trigger: `workflow_dispatch`
- permissions: `contents: read`, `id-token: write`
- runner: GitHub-hosted `ubuntu-latest`
- Node: `24`
- setup-node registry: `https://registry.npmjs.org`
- cache: release build에서는 disabled
- validation: `npm test`, `npm pack --dry-run`
- publish: `npm publish`
- secrets: `NODE_AUTH_TOKEN` 또는 `NPM_TOKEN` 사용 금지
- provenance flag: trusted publishing 자동 provenance를 사용하므로 `--provenance` 사용 금지
- maintainer action: npmjs.com package settings에서 GitHub Actions trusted publisher 등록 필요

Stage 2 README 보강:

- trusted publishing setup checklist 추가
- npmjs.com trusted publisher 설정값을 owner/repo/workflow filename/action 수준으로 문서화하되 account identifier나 credential은 기록하지 않음
- publish workflow는 trusted publisher 설정과 version bump가 준비된 뒤 수동 실행해야 한다고 명시
- publish 후 `npm audit signatures`로 provenance/signature 검증을 시도하도록 안내
- #23에서 version bump/tag/release ordering을 확정해야 함을 남김

## Stage 1 — 공식 조건과 repo release baseline 점검

### 산출물

신규:

- `mydocs/plans/task_m010_22_impl.md`
- `mydocs/working/task_m010_22_stage1.md`

수정:

- `mydocs/orders/20260703.md`

### 변경 내용

- npm trusted publishing/provenance 공식 조건을 구현계획서에 고정한다.
- 현재 repo의 CI, README release checklist, package metadata, lockfile 유무, local Node/npm baseline을 기록한다.
- Stage 2에서 반영할 workflow와 README 보강 방향을 승인 요청으로 정리한다.
- Stage 1에서는 workflow나 README를 아직 수정하지 않는다.

### 검증

```bash
git status --short
node -v
npm -v
rg --files | rg '(^|/)package-lock\\.json$|(^|/)npm-shrinkwrap\\.json$'
rg --files .github/workflows
git diff --check
```

`package-lock`/`npm-shrinkwrap` 검색은 현재 파일이 없으면 exit code 1이 정상 상태다.

### 커밋

```text
Task #22 Stage 1: trusted publishing 조건 점검
```

## Stage 2 — trusted publishing/provenance 결정 반영

### 산출물

신규:

- `.github/workflows/publish.yml`
- `mydocs/working/task_m010_22_stage2.md`

수정:

- `README.md`
- `mydocs/orders/20260703.md`

### 변경 내용

- `workflow_dispatch` 기반 npm publish workflow를 추가한다.
- workflow에는 `id-token: write`, `contents: read`, Node 24, npm registry 설정, `npm test`, `npm pack --dry-run`, `npm publish`를 둔다.
- workflow에는 npm token secret을 사용하지 않는다.
- README release checklist에 trusted publisher setup, workflow 실행 조건, provenance verification, publish 금지 조건을 추가한다.
- 실제 `npm publish`와 npmjs.com setting 변경은 수행하지 않는다.

### 검증

```bash
npm test
npm_config_cache=/private/tmp/codex-usage-analyzer-npm-cache npm pack --dry-run
git diff --check
```

추가 수동 확인:

- `.github/workflows/publish.yml`의 YAML 구조와 indentation 확인
- `permissions.id-token: write`, `permissions.contents: read` 확인
- `NODE_AUTH_TOKEN`, `NPM_TOKEN`, credential-like 값 미사용 확인
- workflow trigger가 자동 publish를 유발하지 않는지 확인

### 커밋

```text
Task #22 Stage 2: trusted publishing workflow 초안 반영
```

## Stage 3 — 통합 검증과 최종 보고

### 산출물

신규:

- `mydocs/working/task_m010_22_stage3.md`
- `mydocs/report/task_m010_22_report.md`

수정:

- `mydocs/orders/20260703.md`

### 변경 내용

- 전체 검증을 재실행한다.
- workflow와 README가 npm 공식 조건 및 이번 task 수용 기준을 충족하는지 최종 점검한다.
- npm publish를 실행하지 않았고, npmjs.com trusted publisher 설정은 maintainer follow-up임을 최종 보고서에 남긴다.
- #23 version bump 절차와의 의존성을 기록한다.

### 검증

```bash
npm test
npm_config_cache=/private/tmp/codex-usage-analyzer-npm-cache npm pack --dry-run
git diff --check
```

추가 수동 확인:

- workflow 권한과 trigger 최종 확인
- trusted publishing/provenance 공식 조건 체크리스트 최종 확인
- 민감 정보 미노출 확인

### 커밋

```text
Task #22 Stage 3 + 최종 보고서: trusted publishing 검증 정리
```

## 검증 공통 규칙

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- npm token, npm account identifier, credential은 문서와 PR 본문에 기록하지 않는다.
- 신규 npm publish는 이번 task에서 실행하지 않는다.
- npmjs.com package setting 직접 변경은 이번 task에서 수행하지 않는다.
- `UsageSnapshot v2` schema와 runtime analyzer behavior는 변경하지 않는다.
- `npm pack --dry-run` 결과는 package contents 요약만 기록하고 불필요한 local path는 기록하지 않는다.

## 단계 의존성

- Stage 1은 이 구현계획서 작성과 Stage 1 보고 후 Stage 2 반영 범위 승인을 받아야 완료된다.
- Stage 2는 Stage 1에서 trusted publishing workflow와 README 보강 범위가 승인된 뒤 진행한다.
- Stage 3은 Stage 2 검증과 보고서 승인 후 진행한다.
- #23에서 version bump, tag, GitHub Release, publish ordering을 별도로 확정한다.

## 승인 요청 사항

- Stage 1-3 분할, 산출물, 검증 명령, 커밋 메시지를 이 구현계획서대로 고정하는 것
- Stage 2에서 `.github/workflows/publish.yml`을 `workflow_dispatch` 기반 trusted publishing workflow로 추가하는 것
- Stage 2에서 README release checklist에 trusted publisher setup, workflow 실행 조건, provenance verification, #23 의존성을 보강하는 것
- 이번 task에서 npm publish, npmjs.com package setting 직접 변경, npm token 생성/저장을 제외하는 것

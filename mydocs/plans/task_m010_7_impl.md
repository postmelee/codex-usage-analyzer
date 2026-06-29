# Task M010 #7 구현계획서

수행계획서: [`task_m010_7.md`](task_m010_7.md)
GitHub Issue: [#7](https://github.com/postmelee/codex-usage-analyzer/issues/7)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | package contents와 release gap 점검 | `mydocs/working/task_m010_7_stage1.md` | `npm test`, `npm pack --dry-run`, CLI smoke, registry/version 조회 |
| 2 | package/release checklist와 자동 검증 보강 | `README.md`, `package.json` 또는 `.github/workflows/ci.yml`, `mydocs/working/task_m010_7_stage2.md` | `npm test`, `npm pack --dry-run`, package contents 확인 |
| 3 | 배포 전 npx와 release candidate smoke | `mydocs/working/task_m010_7_stage3.md` | GitHub source `npx` smoke, `npm pack --dry-run` |
| 4 | npm publish, postpublish npx smoke, 최종 보고 | `mydocs/working/task_m010_7_stage4.md`, `mydocs/report/task_m010_7_report.md`, `mydocs/orders/20260629.md` | `npm publish` 승인 후 실행, npm latest `npx` smoke |

## 문서 위치 확인

수행계획서의 "문서 위치 판단"과 실제 Stage 산출물 경로는 일치한다. 공식 사용자/기여자 문서는 README 표면을 유지하고, 새 `docs/` 루트는 만들지 않는다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `README.md` | `README.md` | Stage 2 수정 후보 | OK | install/usage/release checklist 문구를 최소 보강한다. |
| `package.json` | `package.json` | Stage 2 수정 후보 | OK | metadata, `files`, `bin`, `exports`, `types`, `engines` 점검 결과에 따라 수정한다. |
| `.github/workflows/ci.yml` 또는 신규 workflow | `.github/workflows/` | Stage 2 수정 후보 | OK | 자동 검증이 필요할 때만 최소 변경한다. |
| `mydocs/working/task_m010_7_stage{N}.md` | `mydocs/working/` | Stage 1-4 신규 | OK | 단계별 검증 결과와 의사결정을 기록한다. |
| `mydocs/report/task_m010_7_report.md` | `mydocs/report/` | Stage 4 신규 | OK | 최종 release readiness, publish 결과 또는 blocker를 기록한다. |
| `mydocs/orders/20260629.md` | `mydocs/orders/` | Stage 4 및 진행 상태 수정 | OK | 하이퍼-워터폴 진행 상태를 갱신한다. |

## Stage 1 — package contents와 release gap 점검

### 산출물

신규:

- `mydocs/working/task_m010_7_stage1.md`

수정:

- `mydocs/orders/20260629.md`

### 변경 내용

- 현재 `package.json`의 `name`, `version`, `description`, `type`, `types`, `bin`, `exports`, `files`, `scripts`, `engines`를 npm 배포 관점에서 점검한다.
- `npm pack --dry-run` 결과로 실제 package contents를 확인한다.
- README의 `npx codex-usage-analyzer@latest analyze --json` 안내가 현재 package 계약과 일치하는지 확인한다.
- `.github/workflows/ci.yml`이 release readiness에 필요한 최소 검증을 수행하는지 확인한다.
- `scripts/profile-smoke.js`를 npm package에 포함할지, repo-only QA 도구로 유지할지 Stage 2 승인 요청 사항으로 정리한다.
- npm registry의 기존 version 상태를 조회하되, registry 미등록 또는 네트워크 실패는 검증 실패가 아니라 외부 상태로 분리해 기록한다.
- 실제 사용자 raw analyzer JSON, local path, npm account, token, credential은 보고서에 기록하지 않는다.

### 검증

```bash
npm test
npm pack --dry-run
node bin/codex-usage-analyzer.js analyze --json
npm view codex-usage-analyzer versions --json
git diff --check
```

`npm view`는 네트워크와 registry 상태에 의존한다. 실패하면 exit code만으로 Stage를 중단하지 않고 원인을 Stage 1 보고서에 분리해 기록한다.

### 커밋

```text
Task #7 Stage 1: package release gap 점검
```

## Stage 2 — package/release checklist와 자동 검증 보강

### 산출물

신규:

- `mydocs/working/task_m010_7_stage2.md`
- `.github/workflows/release-check.yml`, Stage 1에서 신규 workflow가 필요하다고 승인된 경우

수정:

- `README.md`
- `package.json`, Stage 1 gap에 따라 필요한 경우
- `.github/workflows/ci.yml`, Stage 1 gap에 따라 기존 CI 보강을 선택한 경우
- `mydocs/orders/20260629.md`

### 변경 내용

- Stage 1에서 확정한 gap만 반영한다.
- README에는 npm/npx 사용법, release checklist, publish 전후 smoke 절차를 현재 범위 안에서 갱신한다.
- `package.json`은 package contents와 npm metadata에 필요한 최소 수정만 한다.
- CI 또는 release-check workflow에는 `npm test`, CLI smoke, `npm pack --dry-run` 중 자동화 가치가 있는 검증만 추가한다.
- `scripts/profile-smoke.js`는 승인된 판단에 따라 package 포함 또는 repo-only checklist 도구로 명확히 둔다.
- `UsageSnapshot v2` schema, submit command, web API upload는 변경하지 않는다.

### 검증

```bash
npm test
npm pack --dry-run
node bin/codex-usage-analyzer.js analyze --json
git diff --check
```

### 커밋

```text
Task #7 Stage 2: package release checklist 보강
```

## Stage 3 — 배포 전 npx와 release candidate smoke

### 산출물

신규:

- `mydocs/working/task_m010_7_stage3.md`

수정:

- `mydocs/orders/20260629.md`

### 변경 내용

- GitHub source install 기반 `npx --yes github:postmelee/codex-usage-analyzer analyze --json` smoke를 수행한다.
- 필요하면 local `npm pack` artifact 기반 설치/실행 smoke를 추가해 publish 전 package tarball이 실행 가능한지 확인한다.
- smoke 결과는 pass/fail, exit code, 구조적 확인 항목만 기록하고 raw analyzer JSON과 local path는 남기지 않는다.
- 네트워크, GitHub source install, npm cache 문제는 package 결함과 분리해 기록한다.

### 검증

```bash
npm test
npm pack --dry-run
npx --yes github:postmelee/codex-usage-analyzer analyze --json
git diff --check
```

### 커밋

```text
Task #7 Stage 3: 배포 전 npx smoke 검증
```

## Stage 4 — npm publish, postpublish npx smoke, 최종 보고

### 산출물

신규:

- `mydocs/working/task_m010_7_stage4.md`
- `mydocs/report/task_m010_7_report.md`

수정:

- `README.md`, publish 결과에 따라 release status 문구 조정이 필요한 경우
- `package.json`, version 중복 등으로 작업지시자 승인을 받아 version bump가 필요한 경우
- `mydocs/orders/20260629.md`

### 변경 내용

- `npm whoami` 또는 동등한 방식으로 인증 상태를 확인하되, account identifier와 token은 문서에 남기지 않는다.
- `npm publish`는 Stage 4 진입 승인과 별도로 publish 직전 작업지시자 명시 승인을 받은 경우에만 실행한다.
- publish가 성공하면 `npx --yes codex-usage-analyzer@latest analyze --json` smoke를 수행한다.
- publish가 인증, 권한, version 중복, registry 상태로 막히면 blocker, 재시도 조건, 필요한 사용자 조치를 최종 보고서에 기록한다.
- 최종 보고서는 npm/npx 실사용 가능 상태 또는 publish blocker를 명확히 남기고 PR 게시 전 검증 결과를 정리한다.

### 검증

```bash
npm test
npm pack --dry-run
npm publish
npx --yes codex-usage-analyzer@latest analyze --json
git diff --check
```

`npm publish`와 postpublish `npx @latest` smoke는 publish 직전 명시 승인과 npm 인증 상태가 충족된 경우에만 실행한다.

### 커밋

```text
Task #7 Stage 4 + 최종 보고서: npm release 검증 정리
```

## 검증

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- 실패한 검증은 단계 완료로 처리하지 않고, 실패 원인과 재시도 조건을 단계 보고서에 기록한다.
- 네트워크/registry/auth 의존 명령은 외부 상태를 별도로 기록한다.
- raw analyzer JSON, local path, credential, npm token, account identifier를 문서와 PR 본문에 남기지 않는다.
- `UsageSnapshot v2` schema와 production analyzer/sample fixture 분리 정책을 변경하지 않는다.
- 단계 완료 전 `git diff --check`를 통과시킨다.

## 커밋

- 단계 커밋은 단계 산출물과 `mydocs/working/task_m010_7_stage{N}.md`를 함께 묶는다.
- 커밋 메시지는 `Task #7 Stage {N}: {핵심 내용 요약}` 형식을 따른다.
- Stage 4 최종 보고서 묶음 커밋은 `Task #7 Stage 4 + 최종 보고서: npm release 검증 정리`로 작성한다.

## 단계 의존성

- Stage 1은 이 구현계획서 승인 후 진행한다.
- Stage 2는 Stage 1 gap과 승인된 수정 범위가 확정된 뒤 진행한다.
- Stage 3은 Stage 2 검증과 보고서 승인 후 진행한다.
- Stage 4는 Stage 3 검증과 보고서 승인 후 진행한다.
- `npm publish`는 Stage 4 진입 승인 외에 publish 직전 명시 승인을 추가로 요구한다.

## 위험과 대응

- **npm 인증/권한**: 인증 상태를 확인하되 민감 정보를 기록하지 않고, publish 전 별도 명시 승인을 받는다.
- **version 중복**: registry version 상태를 Stage 1에서 확인한다. version bump가 필요하면 별도 승인 후 Stage 4 또는 계획 변경으로 처리한다.
- **패키지 contents 누락**: `npm pack --dry-run` 결과와 `files` 구성을 Stage 1에서 대조하고 Stage 2에서 최소 수정한다.
- **profile smoke helper 범위**: `scripts/profile-smoke.js`를 package 포함 대상으로 볼지 repo-only QA 도구로 둘지 Stage 1 보고서에서 승인 요청한다.
- **network-dependent smoke**: `npx github:`와 `npx @latest` 실패를 네트워크, registry, package 결함으로 분리해 기록한다.
- **release automation 과잉**: workflow 추가는 Stage 1 gap이 명확하고 승인된 경우에만 수행한다.
- **privacy leakage**: raw local output, npm token, 계정 식별자, local path를 문서에 남기지 않는다.

## 승인 요청 사항

- Stage 1-4 분할, 산출물, 검증 명령, 커밋 메시지를 이 구현계획서대로 고정하는 것
- Stage 1에서 `scripts/profile-smoke.js` package 포함 여부와 release automation gap을 점검하고, Stage 2 수정 범위를 다시 승인받는 것
- Stage 4의 `npm publish`는 Stage 4 승인과 별도로 publish 직전 작업지시자 명시 승인을 받은 뒤 실행하는 것
- 공식 문서 표면은 README로 유지하고 새 `docs/` 루트는 만들지 않는 것

승인되면 Stage 1 package contents와 release gap 점검을 시작한다.

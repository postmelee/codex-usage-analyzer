# Task M010 #7 수행계획서

GitHub Issue: [#7](https://github.com/postmelee/codex-usage-analyzer/issues/7)
마일스톤: M010

## 목적

이 task는 `codex-usage-analyzer`를 실제 npm/npx로 사용할 수 있는 배포 단위로 검증하고, M010 이후 반복 가능한 release 절차를 남긴다.

최종 결과는 npm registry 배포 준비 상태, package contents/bin/exports/README/versioning 검증, release checklist 또는 automation 보강, 배포 전 GitHub source `npx` smoke, 배포 후 `npx codex-usage-analyzer@latest analyze --json` smoke 검증이다. 실제 `npm publish`는 npm 인증과 작업지시자 명시 승인이 필요한 단계로 둔다.

## 배경

#2-#6은 production analyzer path, local parser, skill/plugin ranking, safe asset output, profile parity smoke helper를 구현했다. #14는 profile smoke 결과에서 remote/local source 차이를 source-aware reason으로 구분하게 했다.

이제 profile/tokenmon 쪽에서 `npx ... submit` 같은 흐름을 구성하려면 analyzer package가 npm package로 설치/실행 가능한지 확인해야 한다. 현재 README는 `npx codex-usage-analyzer@latest analyze --json`을 첫 사용법으로 제시하지만, release checklist와 package contents 검증은 아직 task 산출물로 고정되지 않았다.

## 범위

### 포함

- `npm test`와 CLI smoke 재확인
- `npm pack --dry-run` 결과 검증
- `package.json` metadata, `files`, `bin`, `exports`, `types`, `engines` 점검
- `scripts/profile-smoke.js`를 npm package에 포함할지 repo-only QA 도구로 둘지 결정
- GitHub Actions 또는 수동 release checklist 보강
- README install/usage/release status 문구 갱신
- 배포 전 `npx --yes github:postmelee/codex-usage-analyzer analyze --json` 검증
- 작업지시자 승인 및 npm 인증 상태가 충족되면 npm publish와 배포 후 `npx --yes codex-usage-analyzer@latest analyze --json` 검증

### 제외

- profile/tokenmon submit command 구현
- 웹 API upload 구현
- npm organization/권한 정책 변경
- `UsageSnapshot v2` schema 변경
- Codex Desktop remote/internal profile API 호출
- 실제 사용자 raw analyzer JSON, local path, credential, account identifier 저장

## 설계 방향

- package release 표면은 `bin/codex-usage-analyzer.js`, `src/index.js`, `src/index.d.ts`, README를 중심으로 검증한다.
- `scripts/profile-smoke.js`는 현재 README에서 로컬 QA 도구로 안내된다. Stage 1에서 `npm pack --dry-run` 결과를 확인한 뒤, npm package에 포함할지 repo-only release checklist 도구로 둘지 작업지시자 승인 대상에 포함한다.
- 배포 전 GitHub source `npx` smoke와 배포 후 npm latest `npx` smoke는 네트워크 접근과 외부 상태에 의존하므로 검증 결과와 한계를 단계 보고서에 명확히 남긴다.
- 실제 `npm publish`는 npm 인증, registry 상태, version 중복 여부를 확인한 뒤 별도 단계에서 작업지시자 승인을 받고 수행한다.
- GitHub Actions는 현재 `npm test`와 CLI smoke만 수행한다. release 자동화는 과도하게 복잡하게 만들지 않고, 필요한 경우 `npm pack --dry-run` 또는 release checklist 검증을 최소 추가한다.
- release 절차 문서는 현재 공식 사용자/기여자 문서가 README 중심이므로 README에 최소 반복 절차를 두고, 상세 검증 근거는 `mydocs/` 작업 산출물에 둔다. 새 `docs/` 루트는 만들지 않는다.

## 문서 위치 판단

이번 task는 사용자/기여자가 npm/npx로 analyzer를 설치·실행하는 공식 안내와 메인테이너 release 절차를 다룬다. 현재 프로젝트의 공식 문서 표면은 README이므로 README를 수정한다. 상세 검증 로그와 의사결정은 `mydocs/working`과 `mydocs/report`에 남긴다. 별도 `docs/` 루트는 이번 task에서 새로 선택하지 않는다.

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| `README.md` | 공식 사용자/기여자 문서 | 사용자, 기여자, 메인테이너 | `README.md` | `docs/` | 현재 설치/CLI/SDK 사용법이 README에 있으며, npm/npx 사용과 release status도 같은 표면에 두는 것이 일관된다. |
| `package.json` | package metadata | npm 사용자, 런타임, 메인테이너 | `package.json` | 해당 없음 | npm package contents/bin/export 계약의 진실 원천이다. |
| `.github/workflows/ci.yml` 또는 신규 workflow | CI/release 검증 | 메인테이너 | `.github/workflows/` | README checklist only | 자동 검증이 필요할 경우 GitHub Actions 위치를 사용한다. 과도하면 README checklist로 제한한다. |
| `mydocs/plans/task_m010_7.md` | 작업 산출물 | 내부 작업자, 에이전트 | `mydocs/plans/` | 해당 없음 | 구현 전 승인용 수행계획서다. |
| `mydocs/plans/task_m010_7_impl.md` | 작업 산출물 | 내부 작업자, 에이전트 | `mydocs/plans/` | 해당 없음 | 승인 후 단계별 산출물과 검증 명령을 구체화한다. |
| `mydocs/working/task_m010_7_stage{N}.md` | 작업 산출물 | 내부 작업자, 에이전트 | `mydocs/working/` | 해당 없음 | 단계별 package/release 검증 결과를 기록한다. |
| `mydocs/report/task_m010_7_report.md` | 작업 산출물 | 내부 작업자, 에이전트 | `mydocs/report/` | 해당 없음 | 최종 release 결과와 PR 게시 전 승인 기록이다. |

## 예상 변경 파일

신규:

- `mydocs/plans/task_m010_7_impl.md`
- `mydocs/working/task_m010_7_stage1.md`
- `mydocs/working/task_m010_7_stage2.md`
- `mydocs/working/task_m010_7_stage3.md`
- `mydocs/working/task_m010_7_stage4.md`
- `mydocs/report/task_m010_7_report.md`
- `.github/workflows/release-check.yml`, 필요한 경우

수정:

- `README.md`
- `package.json`, 필요한 경우
- `.github/workflows/ci.yml`, 필요한 경우
- `mydocs/orders/20260629.md`

이번 task 산출물:

- `mydocs/orders/20260629.md`
- `mydocs/plans/task_m010_7.md`
- `mydocs/plans/task_m010_7_impl.md`
- `mydocs/working/task_m010_7_stage{N}.md`
- `mydocs/report/task_m010_7_report.md`

## 잠정 단계

- **Stage 1 — package contents와 release gap 점검**
  - `package.json`, README, CI, `npm pack --dry-run` 결과를 점검한다.
  - `scripts/profile-smoke.js` 포함 여부, `files` 구성, bin/exports/types, README의 현재 `npx` 문구와 실제 package contents 차이를 정리한다.
  - 검증 관점: release 전에 수정해야 할 package/release gap을 명확히 분리한다.
- **Stage 2 — package/release checklist와 자동 검증 보강**
  - Stage 1 gap에 따라 `package.json`, README, CI 또는 release checklist를 최소 수정한다.
  - `npm pack --dry-run`과 package contents가 의도한 배포 표면과 맞는지 고정한다.
  - 검증 관점: npm package가 필요한 파일만 포함하고 bin/export/type 계약이 깨지지 않는다.
- **Stage 3 — 배포 전 npx와 release candidate smoke**
  - GitHub source install 기반 `npx --yes github:postmelee/codex-usage-analyzer analyze --json`을 검증한다.
  - `npm pack` artifact 또는 local package smoke가 필요한 경우 추가로 확인한다.
  - 검증 관점: publish 전에도 외부 설치 경로에서 CLI가 valid `UsageSnapshot v2` JSON을 반환한다.
- **Stage 4 — npm publish, postpublish npx smoke, 최종 보고**
  - npm 인증과 작업지시자 명시 승인이 있으면 `npm publish`를 수행한다.
  - 배포 후 `npx --yes codex-usage-analyzer@latest analyze --json`을 검증한다.
  - 인증/권한/registry 상태로 publish가 불가능하면 publish 미수행 사유와 재시도 절차를 최종 보고서에 남긴다.
  - 검증 관점: 실제 사용 가능한 npm/npx 상태 또는 publish blocker가 명확히 기록된다.

## 검증 계획

### 단계별 검증

- Stage 1
  - `npm test`
  - `npm pack --dry-run`
  - `node bin/codex-usage-analyzer.js analyze --json`
  - `git diff --check`
- Stage 2
  - `npm test`
  - `npm pack --dry-run`
  - package contents 수동 확인
  - `git diff --check`
- Stage 3
  - `npm test`
  - `npm pack --dry-run`
  - `npx --yes github:postmelee/codex-usage-analyzer analyze --json`
  - `git diff --check`
- Stage 4
  - `npm test`
  - `npm pack --dry-run`
  - `npm publish`, 작업지시자 명시 승인과 npm 인증이 있는 경우
  - `npx --yes codex-usage-analyzer@latest analyze --json`, publish 성공 후
  - `git diff --check`

### 통합 검증

- npm registry에 배포 가능한 package 구성이 확인된다.
- 배포 전 GitHub source `npx` smoke가 통과한다.
- 배포 후 최신 npm package를 `npx`로 실행할 수 있거나, publish blocker가 구체적으로 문서화된다.
- release checklist가 M010 이후 반복 가능한 절차로 남는다.
- `UsageSnapshot v2` schema와 production analyzer/sample fixture 분리 정책을 변경하지 않는다.
- raw analyzer JSON, local path, credential, npm token, account identifier를 문서에 남기지 않는다.
- `git status --short`가 PR 준비 전 빈 출력이다.
- `git diff --check`가 경고 없이 통과한다.

## 리스크

- **npm 인증/권한**: `npm publish`는 로컬 인증과 registry 권한이 필요하다. Stage 4에서 인증 상태를 확인하고 작업지시자 명시 승인 없이 publish하지 않는다.
- **이미 존재하는 version**: `0.1.0`이 이미 registry에 있으면 publish가 실패한다. version bump가 필요하면 구현계획서 또는 단계 보고에서 별도 승인 대상으로 둔다.
- **패키지 contents 누락**: 현재 `files`에 `scripts/`가 없어 profile smoke helper가 package에 포함되지 않는다. Stage 1에서 repo-only QA 도구로 유지할지 package에 포함할지 결정한다.
- **network-dependent smoke**: `npx github:`와 `npx @latest` 검증은 네트워크와 외부 registry 상태에 의존한다. 실패 시 원인과 재시도 조건을 분리한다.
- **release automation 과잉**: GitHub Actions 자동화를 과도하게 만들면 scope가 커진다. 필요한 최소 release checklist/pack 검증으로 제한한다.
- **privacy leakage**: smoke 결과와 문서에는 raw local output, npm token, local path, credential을 기록하지 않는다.

## 승인 요청 사항

- #7을 npm publish/release readiness와 npx 실행 검증 task로 진행하는 것
- 실제 `npm publish`는 Stage 4에서 npm 인증/권한 확인 후 작업지시자 명시 승인을 받고 수행하는 것
- `scripts/profile-smoke.js` package 포함 여부를 Stage 1에서 판단해 Stage 2 수정 범위에 반영하는 것
- README를 공식 install/usage/release checklist 문서 표면으로 유지하고 새 `docs/` 루트는 만들지 않는 것
- Stage 1-4 잠정 단계와 검증 계획

승인되면 `task_m010_7_impl.md`에서 단계별 산출물, 검증 명령, 커밋 메시지를 구체화한다.

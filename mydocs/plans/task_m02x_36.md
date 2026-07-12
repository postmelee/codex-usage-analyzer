# Task M02x #36 수행계획서

GitHub Issue: [#36](https://github.com/postmelee/codex-usage-analyzer/issues/36)
마일스톤: M02x

## 목적

공개 홍보 전에 GitHub repository의 vulnerability reporting, dependency security, code scanning, secret protection 상태를 명시적으로 활성화하고 검증한다. 현재 dependency-free package에 불필요한 runtime 도구나 credential을 추가하지 않으면서 source와 GitHub Actions dependency를 지속적으로 점검할 수 있어야 한다.

Repository에 남는 설정은 GitHub Actions version update를 위한 최소 Dependabot configuration으로 제한한다. CodeQL은 GitHub가 JavaScript/TypeScript에 권장하는 default setup을 우선 사용해 별도 workflow 유지보수와 권한 면적을 늘리지 않는다.

## 배경

Issue #36 등록 전 live 확인 결과는 다음과 같다.

- Private vulnerability reporting: enabled
- Secret scanning: enabled
- Secret scanning push protection: enabled
- Open secret scanning alert: 0
- Dependabot alerts: disabled
- Dependabot security updates: disabled
- Code scanning: no analysis found
- Runtime dependency: 0

`SECURITY.md`와 README는 private reporting 경로를 안내하며 실제 설정과 현재 일치한다. 그러나 GitHub가 public repository에 권장하는 Dependabot alerts와 code scanning baseline은 아직 구성되지 않았다.

공식 근거:

- [Managing security and analysis settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-security-and-analysis-settings-for-your-repository)
- [Configuring Dependabot version updates](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-version-updates)
- [Configuring Dependabot security updates](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-security-updates)
- [Configuring default setup for code scanning](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configure-code-scanning)
- [Code scanning REST API](https://docs.github.com/en/rest/code-scanning/code-scanning)

## 범위

### 포함

- Private vulnerability reporting enabled 상태 재검증
- Public repository dependency graph 상태 확인
- Dependabot alerts 활성화
- Dependabot security updates 활성화 또는 적용 불가 상태의 근거 기록
- GitHub Actions version update용 최소 `.github/dependabot.yml` 추가
- CodeQL default setup 활성화와 JavaScript/TypeScript 초기 analysis 확인
- Initial Dependabot, code scanning, secret scanning open alert 분류
- 기존 CI와 Publish Package workflow permission 비변경 확인
- npm artifact에서 `.github` security configuration 제외 확인
- 모든 외부 설정 변경의 before/after 상태를 단계 보고서에 비민감 요약으로 기록

### 제외

- Runtime 또는 development dependency 추가
- npm ecosystem version update configuration 추가
- CodeQL advanced setup workflow 추가
- Branch protection, merge policy, Actions policy 변경
- Alert에서 발견된 별도 기능 취약점 수정
- GitHub/npm token 또는 장기 credential 추가
- `SECURITY.md`, README, public API/CLI/SDK/contract 변경
- Version bump, npm publish, Git tag, GitHub Release 생성

CodeQL default setup이 repository를 분석하지 못하거나 요구사항을 충족하지 못하면 advanced setup을 즉시 추가하지 않는다. 원인과 대안을 보고하고 수행/구현계획 변경 승인을 먼저 받는다.

## 설계 방향

### Dependabot boundary

- Public repository dependency graph는 GitHub 제공 상태를 확인하고 별도 dependency submission action을 추가하지 않는다.
- Dependabot alerts와 security updates는 repository security setting으로 활성화한다.
- `.github/dependabot.yml`은 `version: 2`, `package-ecosystem: github-actions`, root directory, weekly interval만 정의한다.
- Runtime dependency가 없으므로 npm ecosystem entry를 만들지 않는다.
- Reviewer, assignee, registry credential, label, custom branch, rebase strategy 등 현재 필요하지 않은 option은 추가하지 않는다.
- Dependabot이 생성하는 future PR은 이 task에서 자동 merge하거나 일괄 승인하지 않는다.

### CodeQL boundary

- GitHub-hosted default setup으로 default branch의 auto-detected JavaScript/TypeScript를 분석한다.
- Query suite와 threat model은 GitHub default를 먼저 사용한다.
- Repository에 `.github/workflows/codeql*.yml`을 추가하지 않는다.
- Initial analysis run id, conclusion, analyzed language와 open alert count만 보고하고 raw SARIF나 source fragment를 작업 문서에 복사하지 않는다.
- Open alert가 있으면 severity, rule id, affected repository-relative path만 분류하고 수정은 별도 이슈 승인으로 넘긴다.

### External state and credentials

- GitHub API가 현재 `gh` token scope로 허용되면 REST endpoint를 사용한다.
- Scope 부족이나 UI-only setting이면 authenticated GitHub Settings UI를 사용하되, 변경 전후 값을 다시 API로 확인한다.
- Access token, cookie, authorization header, account identifier를 command output이나 task 문서에 기록하지 않는다.
- External setting은 task branch와 독립적으로 즉시 적용되므로 각 Stage 승인 범위에 해당하는 setting만 변경한다.

## 문서 위치 판단

이번 task는 제품 사용자 문서를 변경하지 않는다. `.github/dependabot.yml`은 GitHub platform configuration이며 공식 제품 문서나 `mydocs/manual`이 아니다. 승인·검증 이력만 `mydocs/` 표준 task 폴더에 둔다.

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| `.github/dependabot.yml` | GitHub platform configuration | GitHub/maintainer | `.github/` | `docs/` | GitHub가 인식하는 고정 위치이며 사용자 문서가 아니다. |
| Task 계획/단계/최종 보고 | 작업 산출물 | 내부 작업자 | `mydocs/` 표준 폴더 | `docs/` | External security setting의 승인과 검증 이력을 공개 제품 문서와 분리한다. |

## 예상 변경 파일

신규:

- `.github/dependabot.yml`

수정:

- 없음

예상 외부 상태 변경:

- Dependabot alerts: disabled -> enabled
- Dependabot security updates: disabled -> enabled 또는 적용 불가 근거 기록
- CodeQL default setup: not configured -> configured

이번 task 산출물:

- `mydocs/orders/20260713.md`
- `mydocs/plans/task_m02x_36.md`
- `mydocs/plans/task_m02x_36_impl.md`
- `mydocs/working/task_m02x_36_stage{N}.md`
- `mydocs/report/task_m02x_36_report.md`

## 잠정 단계

- **Stage 1 — Dependabot baseline과 GitHub Actions update 설정**
  - Before snapshot을 확인하고 Dependabot alerts/security updates를 활성화하며 최소 `.github/dependabot.yml`을 추가한다.
  - YAML 구조, repository setting, open alert 상태와 기존 workflow 비변경을 검증한다.
- **Stage 2 — CodeQL default setup과 초기 analysis**
  - GitHub-managed default setup을 활성화하고 initial JavaScript/TypeScript analysis 완료를 기다린다.
  - Setup 상태, run conclusion, analyzed language와 open alert를 확인한다.
- **Stage 3 — 통합 security baseline 검증**
  - Private reporting, Dependabot, CodeQL, secret scanning의 최종 상태를 교차 확인한다.
  - 전체 test, npm artifact, workflow permission, diff hygiene와 #36 수용 기준을 판정한다.

## 검증 계획

### 단계별 검증

- Stage 1
  - Ruby standard YAML parser로 `.github/dependabot.yml` syntax와 exact root shape 확인
  - `version: 2`, `github-actions`, `/`, `weekly` 외 불필요한 option 부재 확인
  - GitHub repository security setting과 Dependabot alerts API 조회
  - Open Dependabot alert count와 security update 상태 확인
  - `.github/workflows/ci.yml`, `.github/workflows/publish.yml` 비변경 확인
- Stage 2
  - Code scanning default setup API가 configured 상태인지 확인
  - Initial default setup run이 completed/success인지 확인
  - JavaScript/TypeScript 분석과 open code scanning alert count 확인
  - Default setup 실패 시 raw log 대신 safe error summary만 기록하고 단계 종료 보류
- Stage 3
  - `npm test`
  - `npm pack --dry-run --json`
  - npm artifact에 `.github/`, `mydocs/`가 없는지 확인
  - Private reporting, Dependabot, CodeQL, secret scanning/push protection API 재조회
  - Existing CI/publish permission과 task diff 범위 확인
  - `git diff --check`

### 통합 검증

- #36 수용 기준을 최종 보고서에서 항목별 OK/MISS로 판정한다.
- External setting change는 before/after 상태만 기록하고 credential이나 raw security payload를 남기지 않는다.
- Open alert가 있으면 무시하지 않고 severity와 후속 처리 여부를 명시한다.
- Runtime dependency, CLI/SDK/contract, release workflow permission이 변경되지 않는다.
- `git status --short`가 PR 준비 전 빈 출력이다.
- `git diff --check`가 경고 없이 통과한다.

## 리스크

- **External state rollback**: GitHub setting은 branch와 무관하게 즉시 적용된다. 승인된 Stage의 setting만 변경하고 before/after를 기록한다.
- **API scope 부족**: 현재 `gh` token이 admin endpoint를 거부할 수 있다. Credential을 확대·출력하지 않고 authenticated Settings UI로 변경한 뒤 API로 결과를 확인한다.
- **Dependabot PR noise**: GitHub Actions weekly entry 하나로 제한하고 npm ecosystem과 불필요한 option을 제외한다.
- **No actionable dependency**: Runtime dependency가 없어 security updates가 활성화돼도 update 대상이 없을 수 있다. 이를 실패가 아니라 적용 상태와 이유로 구분한다.
- **CodeQL false positive**: Alert를 임의 dismiss하거나 task 범위를 확장하지 않고 별도 이슈 후보로 분리한다.
- **CodeQL setup failure**: Default setup이 실패하면 advanced workflow를 자동 추가하지 않고 계획 변경 승인을 요청한다.
- **Workflow permission regression**: Managed default setup을 사용하고 existing CI/publish workflow diff zero를 검증한다.

## 승인 요청 사항

- Repository file 변경을 `.github/dependabot.yml` 하나로 제한하는 방향
- Dependabot은 GitHub Actions weekly version update만 구성하고 npm ecosystem을 제외하는 방향
- CodeQL은 GitHub-managed default setup과 default query/threat model을 우선 사용하는 방향
- External setting을 Stage 1/2에서 즉시 적용하고 before/after 상태로 추적하는 방향
- Open security alert가 발견되면 이번 task에서 수정하지 않고 별도 이슈 승인으로 넘기는 범위

승인되면 `task_m02x_36_impl.md`에서 endpoint/UI fallback, exact YAML, 단계별 검증 명령과 커밋 메시지를 구체화한다.

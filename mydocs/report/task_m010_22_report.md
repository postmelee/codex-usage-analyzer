# Task M010 #22 최종 보고서

GitHub Issue: [#22](https://github.com/postmelee/codex-usage-analyzer/issues/22)
마일스톤: M010

## 작업 요약

- 대상 이슈: #22
- 마일스톤: M010
- 단계 수: 3
- 작업 목적: npm publish 경로를 token 없는 GitHub Actions trusted publishing/provenance 기반으로 전환할 수 있도록 repository source와 release 안내를 정리한다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `.github/workflows/publish.yml` | `workflow_dispatch` 기반 npm publish workflow 추가, OIDC 권한과 Node/npm 조건 확인 포함 | release automation source |
| `README.md` | Release Checklist에 Trusted Publisher 설정, manual workflow 실행 조건, token secret 금지, provenance/signature 확인 안내 추가 | 사용자/메인테이너-facing release 안내 |
| `mydocs/plans/task_m010_22.md` | #22 수행 범위, 문서 위치 판단, 검증 계획 작성 | 작업 추적 문서 |
| `mydocs/plans/task_m010_22_impl.md` | Stage 1-3 구현계획, trusted publishing 결정, 검증 명령 고정 | 작업 추적 문서 |
| `mydocs/working/task_m010_22_stage1.md` | 공식 조건과 repository baseline 점검 결과 기록 | 작업 추적 문서 |
| `mydocs/working/task_m010_22_stage2.md` | workflow/README 반영 결과와 Stage 2 검증 기록 | 작업 추적 문서 |
| `mydocs/working/task_m010_22_stage3.md` | 통합 검증 결과와 PR 준비 상태 기록 | 작업 추적 문서 |
| `mydocs/report/task_m010_22_report.md` | 최종 결과, 수용 기준, 잔여 위험 기록 | 작업 추적 문서 |
| `mydocs/orders/20260703.md` | #22 진행 상태와 완료 기록 갱신 | 작업 보드 |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| `README.md` | 저장소 루트 | `README.md` | OK | 수행계획서의 release 안내 위치 판단과 일치한다. |
| `.github/workflows/publish.yml` | `.github/workflows/` | `.github/workflows/publish.yml` | OK | 수행계획서의 release automation 위치 판단과 일치한다. |
| `mydocs/plans/task_m010_22.md` | `mydocs/plans/` | `mydocs/plans/task_m010_22.md` | OK | 작업 계획 문서 위치 규칙과 일치한다. |
| `mydocs/plans/task_m010_22_impl.md` | `mydocs/plans/` | `mydocs/plans/task_m010_22_impl.md` | OK | 구현계획서 위치 규칙과 일치한다. |
| `mydocs/working/task_m010_22_stage{N}.md` | `mydocs/working/` | `mydocs/working/task_m010_22_stage1.md`, `stage2.md`, `stage3.md` | OK | 단계 보고서 위치 규칙과 일치한다. |
| `mydocs/report/task_m010_22_report.md` | `mydocs/report/` | `mydocs/report/task_m010_22_report.md` | OK | 최종 보고서 위치 규칙과 일치한다. |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| release publish workflow | 없음 | `.github/workflows/publish.yml` 1개 |
| publish workflow trigger | 없음 | `workflow_dispatch` |
| publish workflow OIDC 권한 | 없음 | `contents: read`, `id-token: write` |
| workflow 파일 내 npm token/provenance secret 문자열 | 해당 없음 | 0건 |
| actual npm publish 실행 횟수 | 0 | 0 |
| `npm test` 최종 결과 | Stage 2 기준 47 pass | Stage 3 기준 47 pass |
| `npm pack --dry-run` total files | Stage 2 기준 19 | Stage 3 기준 19 |
| `npm pack --dry-run` package size | Stage 2 기준 20.6 kB | Stage 3 기준 20.6 kB |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| trusted publishing/provenance 도입 여부가 근거와 함께 기록된다. | OK — 수행계획서, 구현계획서, Stage 1-3 보고서에 trusted publishing 채택과 provenance 기본 생성 근거를 기록했다. |
| 도입하는 경우 GitHub Actions workflow와 npmjs.com trusted publisher 설정 요구사항이 문서화되거나 구현된다. | OK — `.github/workflows/publish.yml`을 추가하고 README에 npmjs.com package settings의 Trusted Publisher 설정 필요성을 문서화했다. |
| npm token, npm account identifier, credential이 작업 문서와 PR 본문에 노출되지 않는다. | OK — secret value와 account identifier는 기록하지 않았고 workflow 파일에서 token/provenance secret 문자열은 0건이었다. |
| 이번 task에서 신규 npm publish를 실행하지 않는다. | OK — test, pack dry-run, workflow source 점검만 수행했다. |
| `git status --short`가 PR 준비 전 빈 출력이다. | OK — Stage 3 문서 작성 전 clean 상태였고, 최종 커밋 후 다시 확인한다. |
| `git diff --check`가 경고 없이 통과한다. | OK — Stage 3 검증에서 빈 출력으로 통과했다. |

### 단계별 검증 결과

- Stage 1: [`task_m010_22_stage1.md`](../working/task_m010_22_stage1.md) — Node `v24.15.0`, npm `11.12.1`, release workflow 부재, lockfile 부재, `git diff --check` 통과를 확인했다.
- Stage 2: [`task_m010_22_stage2.md`](../working/task_m010_22_stage2.md) — `npm test` 47 pass, `npm pack --dry-run` 19 files, workflow YAML parse, 권한/trigger/token 미사용 점검을 통과했다.
- Stage 3: [`task_m010_22_stage3.md`](../working/task_m010_22_stage3.md) — `npm test` 47 pass, `npm pack --dry-run` 19 files, workflow YAML parse, 권한/trigger/token 미사용 최종 점검, `git diff --check`를 통과했다.

## 잔여 위험과 후속 작업

### 잔여 위험

- npmjs.com Trusted Publisher 등록은 저장소 밖 package setting이므로 maintainer가 별도로 수행해야 한다.
- `workflow_dispatch` 실행은 실제 `npm publish`를 시도하므로 version bump와 release ordering이 끝나기 전 실행하면 안 된다.
- GitHub Actions 서버 측 workflow 실행과 npm registry 실제 publish는 이번 task에서 수행하지 않았다.

### 후속 작업 후보

- #23 — npm release version bump 절차 문서화 또는 automation 분리

## 작업지시자 승인 요청

- 최종 보고서와 수용 기준 검증 결과를 승인하면 `publish/task22` 브랜치 push와 main 대상 PR 게시 절차로 진행한다.

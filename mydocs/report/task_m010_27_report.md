# Task M010 #27 최종 보고서

GitHub Issue: [#27](https://github.com/postmelee/codex-usage-analyzer/issues/27)
마일스톤: M010

## 작업 요약

- 대상 이슈: #27
- 마일스톤: M010
- 단계 수: 3
- 작업 목적: npm release 전에 README checklist 이행 상태를 read-only로 점검하는 preflight script와 실행 안내를 추가한다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `scripts/release-preflight.js` | default advisory mode와 `--release-ready` strict mode를 가진 read-only release preflight script 추가 | release tooling |
| `package.json` | `release:preflight` npm script entrypoint 추가 | package maintainer workflow |
| `README.md` | release prep PR과 publish 직전 preflight 실행 시점 문서화 | 메인테이너-facing release 절차 |
| `mydocs/plans/task_m010_27.md` | #27 수행 범위, 문서 위치 판단, 검증 계획 작성 | 작업 추적 문서 |
| `mydocs/plans/task_m010_27_impl.md` | Stage 1-3 구현계획, mode 결정, 검증 명령 기록 | 작업 추적 문서 |
| `mydocs/working/task_m010_27_stage1.md` | release baseline과 preflight mode 설계 기록 | 작업 추적 문서 |
| `mydocs/working/task_m010_27_stage2.md` | script 구현 결과와 Stage 2 검증 기록 | 작업 추적 문서 |
| `mydocs/working/task_m010_27_stage3.md` | 통합 검증 결과와 PR 준비 상태 기록 | 작업 추적 문서 |
| `mydocs/report/task_m010_27_report.md` | 최종 결과, 수용 기준, 잔여 위험 기록 | 작업 추적 문서 |
| `mydocs/orders/20260703.md` | #27 진행 상태와 완료 기록 갱신 | 작업 보드 |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| `scripts/release-preflight.js` | `scripts/` | `scripts/release-preflight.js` | OK | 수행계획서의 release tooling 위치 판단과 일치한다. |
| `package.json` | 저장소 루트 | `package.json` | OK | npm script entrypoint 위치와 일치한다. |
| `README.md` | 저장소 루트 | `README.md` | OK | 수행계획서의 release 안내 위치 판단과 일치한다. |
| `mydocs/plans/task_m010_27.md` | `mydocs/plans/` | `mydocs/plans/task_m010_27.md` | OK | 작업 계획 문서 위치 규칙과 일치한다. |
| `mydocs/plans/task_m010_27_impl.md` | `mydocs/plans/` | `mydocs/plans/task_m010_27_impl.md` | OK | 구현계획서 위치 규칙과 일치한다. |
| `mydocs/working/task_m010_27_stage{N}.md` | `mydocs/working/` | `mydocs/working/task_m010_27_stage1.md`, `stage2.md`, `stage3.md` | OK | 단계 보고서 위치 규칙과 일치한다. |
| `mydocs/report/task_m010_27_report.md` | `mydocs/report/` | `mydocs/report/task_m010_27_report.md` | OK | 최종 보고서 위치 규칙과 일치한다. |
| 신규 `docs/` 루트 | 만들지 않음 | 만들지 않음 | OK | 수행계획서에서 README 보강을 선택했고 새 공식 문서 루트를 선택하지 않았다. |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| release preflight script | 없음 | `scripts/release-preflight.js` 1개 |
| npm release preflight entrypoint | 없음 | `npm run release:preflight` |
| preflight modes | 없음 | advisory default, `--release-ready` strict |
| `package.json` version | `0.1.0` | `0.1.0` |
| `v0.1.*` local tag | 없음 | 없음 |
| actual npm publish 실행 횟수 | 0 | 0 |
| `npm test` 최종 결과 | Stage 2 기준 47 pass | Stage 3 기준 47 pass |
| `npm pack --dry-run` total files | Stage 2 기준 19 | Stage 3 기준 19 |
| `npm pack --dry-run` package size | Stage 2 기준 21.3 kB | Stage 3 기준 21.4 kB |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| `npm run release:preflight`가 release 전 점검을 read-only로 수행한다. | OK — script는 registry/package/workflow/tag/checklist/package contents를 점검하고 mutation command를 실행하지 않는다. |
| preflight 실패 또는 경고 시 어떤 조건을 조치해야 하는지 출력한다. | OK — advisory mode는 version 재사용, dirty tree, tag 부재를 `WARN`으로 표시하고 strict mode는 같은 조건을 `FAIL`로 표시한다. |
| script가 `package.json` version, npm latest, tag 상태, publish workflow 조건을 확인한다. | OK — Stage 2-3 검증에서 해당 check 결과를 확인했다. |
| script 실행만으로 파일, tag, npm registry, GitHub Release 상태가 변경되지 않는다. | OK — version은 `0.1.0` 유지, `v0.1.*` tag 없음, tarball 부산물 없음, publish/GitHub Release 미수행. |
| README release checklist에 preflight 실행 시점이 문서화된다. | OK — release prep PR에서 advisory preflight, publish 전 strict preflight 실행을 문서화했다. |
| 이번 task에서 version bump, git tag 생성, npm publish, GitHub Release 생성이 수행되지 않는다. | OK — 모든 검증에서 미수행을 확인했다. |
| `git diff --check`가 경고 없이 통과한다. | OK — Stage 3 검증에서 빈 출력으로 통과했다. |

### 단계별 검증 결과

- Stage 1: [`task_m010_27_stage1.md`](../working/task_m010_27_stage1.md) — Node `v24.15.0`, npm `11.12.1`, local/registry version `0.1.0`, README/package/workflow/scripts baseline, `git diff --check` 통과를 확인했다.
- Stage 2: [`task_m010_27_stage2.md`](../working/task_m010_27_stage2.md) — advisory preflight exit 0, strict preflight expected exit 1, `npm test` 47 pass, `npm pack --dry-run` 19 files, mutation command source scan 출력 없음, tarball 부산물 없음을 확인했다.
- Stage 3: [`task_m010_27_stage3.md`](../working/task_m010_27_stage3.md) — README preflight 안내, advisory preflight exit 0, `npm test` 47 pass, pack dry-run 19 files, 민감정보 패턴 미검출, version/tag/publish/GitHub Release 미수행을 확인했다.

## 잔여 위험과 후속 작업

### 잔여 위험

- default advisory mode는 warning만 있으면 exit code `0`이므로 실제 publish 직전에는 README대로 `--release-ready` strict mode를 반드시 실행해야 한다.
- `npm view` registry 조회는 network에 의존한다.
- strict mode는 실제 다음 release prep 후 version/tag 상태에서 다시 검증해야 한다.

### 후속 작업 후보

- 없음. 다음 단계는 별도 신규 이슈 없이 실제 release prep 작업에서 이 preflight를 사용하는 것이다.

## 작업지시자 승인 요청

- 최종 보고서와 수용 기준 검증 결과를 승인하면 PR 게시 절차로 진행한다.

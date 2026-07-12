# Task M02x #43 최종 결과보고서

GitHub Issue: [#43](https://github.com/postmelee/codex-usage-analyzer/issues/43)
마일스톤: M02x

## 작업 요약

- 대상 이슈: #43
- 마일스톤: M02x
- 단계 수: 3
- 작업 목적: PATH에 Codex CLI가 없는 macOS에서도 표준 ChatGPT/Codex 앱 번들의 공식 실행 파일로 account usage를 조회하고, 대화형 Quick Start를 단순화한다.

기존 PATH의 `codex`를 최우선으로 유지하면서 macOS system/user Applications의 고정 앱 후보를 fallback으로 추가했다. resolver는 shell, recursive scan, credential source를 사용하지 않으며 선택된 executable만 기존 app-server handshake에 전달한다. Account Usage Contract, schema, public SDK type, dependency, bin/exports는 변경하지 않았다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `src/codex-executable.js` | macOS PATH 우선과 4개 표준 앱 번들 후보를 검사하는 internal resolver 추가 | macOS executable 선택 |
| `src/app-server-client.js` | resolver 결과를 기존 `app-server` spawn에 연결하고 no-runtime/예외를 safe error로 처리 | account usage transport |
| `src/errors.js` | `CODEX_NOT_FOUND` 메시지를 CLI 또는 호환 앱 안내로 일반화 | CLI/SDK safe error message |
| `src/__tests__/codex-executable.test.js` | PATH/app 후보 순서, platform 보존, no-runtime, probe failure 9개 test 추가 | resolver 회귀 방지 |
| `src/__tests__/app-server-client.test.js` | synthetic 앱 command, resolver null/throw, spawn race와 기존 protocol 검증 보강 | transport/error 회귀 방지 |
| `package.json` | resolver runtime module을 package `files` allowlist에 추가 | npm artifact |
| `README.md` | 대화형 `npx` 명령, macOS 앱 요구사항, 동작 순서와 Troubleshooting 보정 | 사용자 진입점 |
| `mydocs/plans/task_m02x_43*.md` | 승인된 수행·구현 계획 기록 | 내부 작업 추적 |
| `mydocs/working/task_m02x_43_stage{1,2,3}.md` | 단계별 산출물·검증·잔여 위험 기록 | 내부 작업 추적 |
| `mydocs/orders/20260713.md` | #43 완료 상태와 시각 기록 | 오늘할일 보드 |
| `mydocs/report/task_m02x_43_report.md` | 최종 결과와 수용 기준 검증 기록 | 장기 보관 보고 |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| `README.md` | 저장소 root | `README.md` | OK | 기존 사용자 Quick Start, Requirements, How it works, Troubleshooting의 진실 원천을 필요한 범위만 보정했다. |
| task 계획·단계·최종 보고 | `mydocs/plans`, `mydocs/working`, `mydocs/report` | 계획된 각 폴더 | OK | 문서 구조 매뉴얼과 수행계획서의 내부 산출물 경계를 유지했다. |
| Account Usage Contract | 변경하지 않음 | `docs/account-usage-contract.md`, schema 무변경 | OK | resolver source와 executable path를 public JSON contract에 추가하지 않았다. |

새 공식 문서 파일은 만들지 않았고 기존 root README만 수정했다.

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| macOS runtime 탐지 | PATH의 `codex` 1경로 | PATH 우선 + system/user ChatGPT/Codex 앱 4후보 fallback |
| repository test | 43개 | 55개, 전체 통과 |
| resolver focused test | 없음 | 9개, 전체 통과 |
| npm package file | 17개 | 18개, resolver 포함 |
| README 대화형 command | `npx --yes ...` 2개 | `npx ...` 2개, 강제 `--yes` 0개 |
| 전체 task diff | 해당 없음 | 13개 파일, 872줄 추가, 24줄 삭제 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| PATH에 실행 가능한 `codex`가 있으면 기존 경로 우선 | OK — resolver ordering test가 PATH hit에서 app probe 전에 `codex`를 선택했다. |
| PATH에 CLI가 없어도 지원 macOS 앱 번들로 조회 | OK — PATH를 제한한 live smoke에서 contract version과 계획된 summary 구조를 반환했다. |
| CLI와 앱이 모두 없으면 safe `CODEX_NOT_FOUND` | OK — resolver `null` test에서 spawn 미호출과 기존 error code를 확인했다. |
| shell·recursive scan 없는 고정 후보 탐지 | OK — source inspection과 forbidden pattern scan이 zero-match였다. |
| resolver/spawn 실패에서 raw detail·local path 비노출 | OK — synthetic private detail, spawn `ENOENT`, runtime sensitive scan을 통과했다. |
| Account Usage Contract와 public SDK 보존 | OK — contract/schema test, public type scan과 package API test가 통과했다. |
| 앱 번들 structural smoke의 실제 값 비노출 | OK — `contractVersion`, 5개 summary key, daily kind만 출력했다. |
| 사용자 Quick Start에서 `--yes` 제거 | OK — README 대화형 command 2개를 확인하고 maintainer smoke의 `--yes`는 유지했다. |
| 전체 regression과 package artifact | OK — 55개 test와 18개 package file audit가 통과했다. |

### 단계별 검증 결과

- Stage 1: [`task_m02x_43_stage1.md`](../working/task_m02x_43_stage1.md) — resolver focused test 9개, package allowlist, no-shell/sensitive scan 통과
- Stage 2: [`task_m02x_43_stage2.md`](../working/task_m02x_43_stage2.md) — transport/account focused test 33개와 public SDK type 보존 검증 통과
- Stage 3: [`task_m02x_43_stage3.md`](../working/task_m02x_43_stage3.md) — full test 55개, package audit, app-only live structural smoke 통과

최종 보고 직전 같은 통합 검증을 다시 실행했다. full test 55개, interactive/automation command 분리, 문서 보존 scan, 18개 package file audit, runtime sensitive pattern zero-match, app-only contract structure와 `git diff --check`가 모두 통과했다.

## 잔여 위험과 후속 작업

### 잔여 위험

- macOS 앱 번들 내부 경로는 공개 안정 계약이 아니므로 향후 앱 packaging 변경 시 고정 후보 보정이 필요할 수 있다.
- 표준 system/user Applications 밖의 비정형 설치 위치는 탐지하지 않는다.
- 앱이 설치돼도 ChatGPT-backed sign-in, service/network 상태, app-server protocol compatibility가 충족되지 않으면 기존 safe app-server error가 발생할 수 있다.

### 후속 작업 후보

- Windows/Linux 앱 번들 탐지와 runtime bootstrap은 이번 task 범위 밖이며 실제 배포 구조 검증과 별도 이슈 승인이 있을 때만 진행한다.
- `cua` npm package/alias는 현재 채택하지 않는다.

## 작업지시자 승인 요청

- 최종 보고서와 수용 기준 검증 결과를 바탕으로 `publish/task43` push와 `main` 대상 Open PR을 게시한다.

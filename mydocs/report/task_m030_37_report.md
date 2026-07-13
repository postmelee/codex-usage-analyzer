# Task M030 #37 최종 보고서

GitHub Issue: [#37](https://github.com/postmelee/codex-usage-analyzer/issues/37)
마일스톤: M030

## 작업 요약

- 대상 이슈: #37
- 마일스톤: M030
- 단계 수: 3
- 작업 목적: PR #44의 macOS app bundle fallback과 최신 public documentation을 포함하는 `0.3.0` minor release preparation을 완료하고 post-merge Trusted Publishing runbook을 확정한다.

Task #37의 pre-merge 범위는 완료했다. Package/CLI/SDK/app-server client version surface를 `0.3.0`으로 일치시키고, resolver를 포함한 regression, npm artifact, README sync baseline과 Trusted Publishing 보안 경계를 검증했다. Release mutation은 수행하지 않았으며 tag, publish, registry `0.3.0`, GitHub Release와 Issue close는 PR merge 후 별도 실행 승인에 의존한다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `package.json` | npm package version을 `0.3.0`으로 갱신 | Package metadata |
| `src/cli.js` | CLI/SDK `PACKAGE_VERSION`을 `0.3.0`으로 갱신 | `--version`, public constant |
| `src/index.d.ts` | Version literal type을 `0.3.0`으로 갱신 | TypeScript consumer |
| `src/app-server-client.js` | app-server `clientInfo.version`을 `0.3.0`으로 갱신 | Initialize metadata |
| `src/__tests__/cli.test.js` | CLI/package bin version assertion 갱신 | Regression test |
| `src/__tests__/index.test.js` | SDK version assertion 갱신 | Regression test |
| `src/__tests__/app-server-client.test.js` | Initialize metadata assertion 갱신 | Protocol regression test |
| `mydocs/plans/task_m030_37.md` | PR #44 반영과 `0.3.0` release 수행계획 확정 | 내부 작업 계획 |
| `mydocs/plans/task_m030_37_impl.md` | 3개 Stage와 post-merge runbook 확정 | 내부 구현·release 절차 |
| `mydocs/working/task_m030_37_stage{1,2,3}.md` | 단계별 구현·검증 결과 기록 | 내부 검증 이력 |
| `mydocs/orders/20260713.md` | Task #37 preparation 완료 상태 기록 | 오늘할일 보드 |
| `mydocs/report/task_m030_37_report.md` | 최종 결과와 release pending gate 기록 | 내부 최종 보고 |

## 문서 위치 검증

README와 공식 product documentation source는 변경하지 않았다. Version source/test는 기존 package/runtime 위치에 유지했고, 계획·단계·최종 보고서는 M030 표준 task 경로에 두었다. 실제 release 결과는 아직 생성되지 않았으며 post-merge에 Issue #37, npm registry와 GitHub Release에 기록한다.

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| Version source/test | `package.json`, `src/`, `src/__tests__/` | 동일 | OK | Product diff 7개가 승인된 allowlist와 일치 |
| Task 계획/단계/최종 보고 | `mydocs/` M030 표준 경로 | `mydocs/plans`, `mydocs/working`, `mydocs/report` | OK | 모든 문서가 `task_m030_37*` 이름 사용 |
| Public product documentation | 변경 없음 | 변경 없음 | OK | `README.md`, `docs/`가 `origin/main`과 diff zero |
| Post-release 결과 | Issue #37, npm registry, GitHub Release | 미생성 | PENDING | PR merge와 별도 release 실행 승인 필요 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| Package/CLI/SDK/app-server version | `0.2.0` | `0.3.0` |
| Product 변경 파일 | 0 | 7 |
| Product line diff | 0 | 8 insertions, 8 deletions |
| 전체 regression | 55 tests baseline | 55/55 pass |
| Focused regression | 30 tests baseline | 30/30 pass |
| npm artifact | 18 files baseline | 18 files, version `0.3.0` |
| Runtime/development dependency | 0 | 0 |
| npm registry/latest | `0.2.0` | `0.2.0` (PENDING) |
| `v0.3.0` tag/Release/publish run | 0 | 0 (PENDING) |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| Version surface exact `0.3.0` | OK — package, CLI/SDK, declaration, app-server metadata와 test assertion 일치 |
| PR #44 resolver 보존 | OK — resolver source/test는 `origin/main`과 diff zero, focused/full test 통과 |
| Historical benchmark `0.2.0` 보존 | OK — README와 benchmark document marker 3개 유지 |
| 전체 regression | OK — 55/55 pass, fail/cancelled/skipped/todo 0 |
| Package artifact | OK — 18개 파일, resolver/README/public benchmark 포함, 금지 경로 0 |
| Source/npm README sync baseline | OK — source marker 존재, npm `0.2.0`에는 신규 marker 5개 부재 |
| Origin integration | OK — 최종 확인 시 `origin/main` 대비 behind 0 |
| Product diff 제한 | OK — 승인된 version source/test 7개만 변경 |
| Trusted Publishing boundary | OK — OIDC, 최소 권한, Ubuntu runner, Node 24, plain `npm publish`; token/provenance 비활성화 pattern 없음 |
| Strict preflight | OK (expected pre-tag state) — test 55, package 18 등 통과; tag 부재만 유일한 FAIL |
| Release mutation 부재 | OK — npm latest `0.2.0`, local/remote tag·workflow dispatch·GitHub Release 0 |
| PR CI/CodeQL | PENDING — PR 게시 후 GitHub checks 필요 |
| npm `0.3.0` publish와 검증 | PENDING — PR merge와 별도 release 실행 승인 필요 |

### 단계별 검증 결과

- Stage 1: [`task_m030_37_stage1.md`](../working/task_m030_37_stage1.md) — version surface 갱신과 focused test 30/30 통과
- Stage 2: [`task_m030_37_stage2.md`](../working/task_m030_37_stage2.md) — full test 55/55, artifact 18개, README/advisory preflight 통과
- Stage 3: [`task_m030_37_stage3.md`](../working/task_m030_37_stage3.md) — origin/product diff, strict preflight와 Trusted Publishing boundary 통과

## 잔여 위험과 후속 작업

### 잔여 위험

- PR CI/CodeQL과 merge SHA는 PR 게시·merge 전이므로 확정되지 않았다.
- `v0.3.0` tag가 없어 strict preflight는 의도적으로 release-ready가 아니다.
- npm Trusted Publisher association은 실제 tag ref workflow 성공으로 최종 확인해야 한다.
- Publish 성공 후에도 registry propagation, npm README, npx, ECDSA signature와 SLSA provenance를 검증하기 전 GitHub Release를 만들면 안 된다.
- PR #40/#41은 같은 CI/publish workflow를 변경하는 OPEN PR이므로 release 전 main workflow를 재확인해야 한다.

### 후속 작업 후보

- PR merge 후 별도 release 실행 승인에 따라 구현계획서의 Post-Merge Release Runbook 수행
- Main CI/CodeQL pass와 merge SHA 확인
- `v0.3.0` tag push 후 strict preflight all-OK 확인
- Trusted Publishing workflow, registry/npx/README/signature/provenance 검증 후 GitHub Release 생성
- Release 결과를 Issue #37에 비민감 요약으로 기록하고 수동 close

## 작업지시자 승인 요청

- 이 최종 보고서와 pre-merge 수용 기준을 기준으로 PR을 검토·merge한다.
- PR body에는 Issue #37 자동 close keyword를 넣지 않는다.
- PR merge 후 tag 생성 전 별도 release 실행 승인을 받는다.

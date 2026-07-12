# Task M02x #34 최종 보고서

GitHub Issue: [#34](https://github.com/postmelee/codex-usage-analyzer/issues/34)
마일스톤: M02x

## 작업 요약

- 대상 이슈: #34
- 마일스톤: M02x
- 단계 수: 3
- 작업 목적: privacy-safe command timing harness와 dated Codex usage lookup 비교 문서를 추가해 마케팅 수치의 재현 조건과 한계를 고정한다.

`codex-usage-analyzer`가 OpenAI Codex의 documented `account/usage/read` app-server method를 사용한다는 링크를 기존 README 소개 바로 아래에 추가했다. README에는 Codex usage lookup latency만 비교하는 간결한 표를 제공하고, exact version, 측정 환경, min/max, command array, source semantics와 해석 한계는 공식 benchmark 문서로 분리했다.

Benchmark harness는 shell 없이 argv를 실행하고 warm-up을 제외한 median/mean/min/max만 집계한다. Child stdout은 폐기하며 stderr는 내용을 저장하지 않고 measured byte 합계만 반환한다. Command, argument, environment와 local path는 결과에 포함하지 않는다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `scripts/benchmarks/measure-command.mjs` | 248줄의 dependency-free timing harness, safe parser/error와 output boundary를 추가했다. | Repository maintainer benchmark 도구 |
| `scripts/benchmarks/measure-command.test.mjs` | 통계, argv, warm-up, output suppression, exit/spawn/signal을 검증하는 synthetic test 9개를 추가했다. | Offline regression coverage |
| `README.md` | 기존 intro 다음 upstream blockquote와 Codex lookup benchmark 표 16줄을 추가했다. | GitHub/npm 사용자 진입점 |
| `docs/codex-lookup-benchmark.md` | 108줄의 결과, 방법, 환경, command array, 재현 절차와 limitation을 추가했다. | 공식 public benchmark 문서 |
| `mydocs/plans`, `mydocs/working`, `mydocs/report`, `mydocs/orders` | 수행/구현 계획, 3개 Stage 보고, 최종 보고와 오늘할일을 기록했다. | Hyper-Waterfall 작업 이력 |

기존 `package.json`, `bin/`, `src/`, Account Usage Contract/Schema, downstream integration 문서는 변경하지 않았다. Public CLI, SDK, JSON contract, runtime dependency와 package version도 그대로다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| 사용자 진입점 | 저장소 root | `README.md` | OK | GitHub/npm 첫 화면에 upstream 링크와 짧은 표를 배치했다. |
| 공식 benchmark 문서 | `docs/` | `docs/codex-lookup-benchmark.md` | OK | 상세 방법과 limitation을 기존 공식 제품 문서 루트에 분리했다. |
| Task 계획/보고 | `mydocs/` 표준 폴더 | plans/working/report/orders | OK | 공개 제품 문서와 내부 승인/검증 이력을 분리했다. |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---:|---:|
| 제품 변경 파일 | README 단독 진입점 | README, benchmark 문서, harness, test 4개 |
| 제품 diff | 해당 없음 | +596줄 |
| README 줄 수 | 199 | 215 |
| Benchmark harness/test | 없음 | 248줄 / 224줄 |
| 공개 benchmark 상세 문서 | 없음 | 108줄 |
| 전체 test | 34개 | 43개 |
| npm package file | 16개 | 17개 |
| npm package size | 15,372 bytes | 17,762 bytes |
| npm unpacked size | 47,494 bytes | 54,244 bytes |
| npm package의 benchmark script | 없음 | 없음 |
| npm package의 public benchmark 문서 | 없음 | 포함 |

README dated snapshot:

| Tool | Median | Relative time |
|---|---:|---:|
| `codex-usage-analyzer@0.2.0` | 1.145s | 1.0x |
| `ccusage@20.0.17` | 3.306s | 2.9x |
| `tokscale@4.4.1` | 19.723s | 17.2x |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 기존 README 상단 소개 문구 유지 | OK — exact string 검사가 통과했다. |
| documented `account/usage/read` 링크 | OK — intro 직후 blockquote와 상세 문서에 OpenAI Codex app-server README 링크가 존재한다. |
| warm-up/반복 및 median/mean/min/max harness | OK — pure statistics와 실행 횟수 분리 test가 통과했다. |
| shell-free argv와 명령 주입 방지 | OK — `shell: false`와 metacharacter literal 전달 test가 통과했다. |
| child stdout 폐기와 stderr byte count | OK — sentinel 원문 비노출, measured byte 합계와 safe failure test가 통과했다. |
| README exact version/median/relative time | OK — 세 version, median과 1.0x/2.9x/17.2x가 모두 존재한다. |
| Codex usage lookup 한정 및 whole-product 제한 | OK — README와 상세 문서에 범위와 source semantics 차이가 명시됐다. |
| retained history와 remote source 영향 고지 | OK — filesystem/cache/history와 network/service limitation을 기록했다. |
| 실제 사용자 데이터와 credential 비노출 | OK — 공개 문서 pattern scan과 수동 검토에서 private path, token, identity, 실제 usage가 발견되지 않았다. |
| npm package에서 benchmark script 제외 | OK — 17-file dry-run audit에서 `scripts/benchmarks/`와 `mydocs/`가 없었다. |
| 공식 benchmark 문서 package 포함 | OK — `docs/codex-lookup-benchmark.md`가 기존 `docs` allowlist를 통해 포함됐다. |
| 기존 runtime/contract 비변경 | OK — package metadata, bin, source, 기존 contract/schema/downstream diff가 없다. |
| 전체 regression | OK — Node 24.15.0에서 43/43 test가 통과했고 fail/cancel/skip은 0개다. |
| Diff/worktree hygiene | OK — `git diff --check` 통과, 최종 보고 작성 전 worktree clean, 임시 검증 산출물 제거를 확인했다. |

### 단계별 검증 결과

- Stage 1: [`task_m02x_34_stage1.md`](../working/task_m02x_34_stage1.md) — shell-free harness, timing aggregate, output/error 경계와 synthetic test 9개를 완료했다.
- Stage 2: [`task_m02x_34_stage2.md`](../working/task_m02x_34_stage2.md) — 공식 upstream 링크, README 비교표, detailed methodology/source limitation 문서를 완료했다.
- Stage 3: [`task_m02x_34_stage3.md`](../working/task_m02x_34_stage3.md) — 전체 test, sensitive scan, npm package file audit, runtime/contract 비변경을 완료했다.

## 잔여 위험과 후속 작업

### 잔여 위험

- 성능 수치는 2026-07-13 한 환경의 snapshot이다. Network/service, Codex startup, retained history와 filesystem/cache 상태에 따라 달라진다.
- 비교 command는 account-level remote source와 retained local history source를 사용하므로 latency 외 정확도, coverage 또는 제품 적합성을 나타내지 않는다.
- 사전 수치는 현재 repository harness를 커밋하기 전에 equivalent timing policy로 측정됐다. 상세 문서는 이 차이를 공개하며 fresh run 결과로 표현하지 않는다.
- GitHub-hosted CI는 PR 게시 후 원격 check에서 확인해야 한다.

### 후속 작업 후보

- 새로운 성능 수치를 마케팅에 사용할 때 exact package version과 같은 harness policy로 다시 측정하고 dated snapshot을 별도 이슈에서 갱신한다.
- Benchmark를 CI performance gate로 실행하거나 external package를 자동 설치하는 작업은 현재 필요하지 않다. 필요성이 생기면 supply-chain과 flakiness 범위를 별도 이슈로 검토한다.

## 작업지시자 승인 요청

- 최종 보고서와 수용 기준 검증 결과를 바탕으로 생성한 PR을 리뷰하고 merge 여부를 승인한다.

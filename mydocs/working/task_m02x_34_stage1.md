# Task M02x #34 Stage 1 완료 보고서

GitHub Issue: [#34](https://github.com/postmelee/codex-usage-analyzer/issues/34)
구현계획서: [`task_m02x_34_impl.md`](../plans/task_m02x_34_impl.md)
Stage: 1

## 단계 목적

Codex 계정, network, 실제 usage 또는 경쟁 package에 의존하지 않는 재사용 가능한 command timing harness를 구현한다. command와 argument를 shell 없이 실행하고, warm-up을 제외한 measured duration 통계만 반환하며, child stdout/stderr 원문과 command identity를 출력하지 않는 경계를 synthetic test로 고정하는 단계다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/benchmarks/measure-command.mjs` | 248줄. argv parser, monotonic timing, median/mean/min/max 집계, stderr byte count, shell-free child 실행과 safe error를 구현했다. |
| `scripts/benchmarks/measure-command.test.mjs` | 224줄. 통계, 입력 검증, warm-up 제외, literal argv, stdout/stderr 억제, exit/spawn/signal failure를 검증하는 synthetic test 9개를 추가했다. |

## 본문 변경 정도 / 본문 무손실 여부

신규 maintainer용 benchmark script와 test만 추가했다. 기존 runtime, CLI, SDK, Account Usage Contract, package metadata, README와 공식 문서는 수정하지 않았다. script는 현재 `package.json`의 npm `files` allowlist에 추가하지 않았으므로 public package API 변경도 없다.

## 검증 결과

실행 명령:

```bash
node --test scripts/benchmarks/measure-command.test.mjs
node scripts/benchmarks/measure-command.mjs --warmup 0 --runs 2 -- node -e 'process.stdout.write("hidden")'
rg -n "spawn|shell: false|stdout: \"ignore\"|stderr: \"pipe\"|hrtime\.bigint|median|mean|stderrBytes" scripts/benchmarks/measure-command.mjs scripts/benchmarks/measure-command.test.mjs
git diff --check
npm test
```

결과:

- OK: focused test 9개가 모두 통과했다. 실패, 취소, skip은 0개다.
- OK: smoke output은 `warmupRuns`, `measuredRuns`, `durationMs`, `stderrBytes`만 포함했고 child stdout sentinel `hidden`은 나타나지 않았다.
- OK: smoke의 `stderrBytes`는 0이었고 command와 argument, local path는 출력되지 않았다.
- OK: source scan에서 `spawn`, `shell: false`, ignored stdout, piped stderr, `process.hrtime.bigint()`, 통계 field와 byte counter 구현을 확인했다.
- OK: `git diff --check`가 경고 없이 통과했다.
- OK: 추가 통합 확인인 `npm test`에서 기존 test와 benchmark test를 합쳐 43개가 모두 통과했다.

## 잔여 위험

- 이 단계는 synthetic command의 동작과 출력 경계만 검증했다. 실제 외부 CLI의 성능이나 2026-07-13 사전 측정값은 다시 측정하지 않았다.
- elapsed time은 OS scheduling과 child startup 상태에 영향을 받는다. test는 절대 실행시간을 assertion하지 않고 순수 통계와 output shape만 검증한다.
- 사용자가 지나치게 큰 run count나 종료하지 않는 command를 지정할 수 있다. maintainer용 명시 실행 도구이며 이번 승인 범위에는 timeout 또는 run count 상한이 포함되지 않는다.

## 다음 단계 영향

- Stage 2 공식 문서의 재현 명령은 `--warmup N --runs N -- command [args...]` argv interface를 사용한다.
- README와 `docs/codex-lookup-benchmark.md`에는 harness aggregate만 인용하고 child stdout/stderr, command identity, 실제 usage 값은 기록하지 않는다.
- Stage 2는 사전 측정 결과를 문서화하며 실제 external package benchmark를 다시 실행하지 않는다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2 공식 benchmark 문서와 README 비교표 작업으로 진행한다.

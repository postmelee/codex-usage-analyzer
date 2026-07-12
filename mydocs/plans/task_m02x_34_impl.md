# Task M02x #34 구현계획서

수행계획서: [`task_m02x_34.md`](task_m02x_34.md)
GitHub Issue: [#34](https://github.com/postmelee/codex-usage-analyzer/issues/34)
마일스톤: M02x

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | Benchmark harness와 synthetic 검증 | `scripts/benchmarks/measure-command.mjs`, focused test | synthetic command, 통계, shell/output/error 경계 |
| 2 | 공식 benchmark 문서와 README 비교표 | `docs/codex-lookup-benchmark.md`, `README.md` | 소개 보존, 링크/수치/범위/한계 확인 |
| 3 | 통합·보안·패키지 경계 검증 | 전체 산출물과 Stage 3 보고서 | full test, sensitive scan, npm pack audit |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| 사용자 진입점 | 저장소 root | `README.md` | OK | Stage 2에서 짧은 upstream 인용과 비교표를 추가한다. |
| 공식 benchmark 문서 | `docs/` | `docs/codex-lookup-benchmark.md` | OK | Stage 2에서 방법, 결과, 한계와 재현 절차를 기록한다. |
| task 단계 보고서 | `mydocs/working/` | `mydocs/working/task_m02x_34_stage{N}.md` | OK | 각 Stage 변경과 검증 근거를 같은 커밋에 묶는다. |
| task 최종 보고서 | `mydocs/report/` | `mydocs/report/task_m02x_34_report.md` | OK | 모든 Stage 승인 후 별도 절차로 작성한다. |

## Stage 1 — Benchmark harness와 synthetic 검증

### 산출물

신규:

- `scripts/benchmarks/measure-command.mjs`
- `scripts/benchmarks/measure-command.test.mjs`
- `mydocs/working/task_m02x_34_stage1.md`

수정:

- 없음

### 변경 내용

- maintainer가 다음 형태로 실행하는 dependency-free benchmark CLI를 구현한다.

  ```text
  node scripts/benchmarks/measure-command.mjs --warmup 1 --runs 5 -- command [args...]
  ```

- `--warmup`은 0 이상의 정수, `--runs`는 1 이상의 정수로 검증하고 unknown option, 누락된 값, `--` 또는 command 누락을 안전한 usage error로 거부한다.
- `node:child_process.spawn()`에 command와 argument 배열을 직접 전달하고 `shell: false`, `stdin: ignore`, `stdout: ignore`, `stderr: pipe`를 사용한다.
- stderr chunk는 문자열로 변환하거나 합치지 않고 `Buffer.byteLength`에 해당하는 길이만 누적한다. child stdout은 수집하거나 전달하지 않는다.
- 각 실행의 elapsed time은 monotonic `process.hrtime.bigint()`으로 측정한다. warm-up 결과는 통계에서 제외한다.
- measured duration을 오름차순으로 정렬해 median을 계산하고 mean, min, max와 함께 millisecond 단위 소수점 셋째 자리로 반올림한다.
- 성공 시 command 이름, argument, 환경 변수, local path를 포함하지 않는 다음 shape의 JSON 한 건만 stdout에 출력한다.

  ```json
  {
    "warmupRuns": 1,
    "measuredRuns": 5,
    "durationMs": {
      "median": 1145.0,
      "mean": 1100.0,
      "min": 800.0,
      "max": 1222.0
    },
    "stderrBytes": 0
  }
  ```

- `stderrBytes`는 measured run에서 읽은 byte의 합계만 나타내며 warm-up stderr는 output에 포함하지 않는다.
- spawn error, non-zero exit, signal 종료는 child stderr 원문과 command/argument를 복사하지 않고 phase와 run index, exit code 또는 signal, 해당 run의 stderr byte count만 포함하는 고정 prefix 오류로 종료한다.
- 순수 통계 함수와 argument parser는 test에서 직접 검증할 수 있게 named export하되 package runtime API에서는 export하지 않는다. CLI main은 direct execution일 때만 수행한다.
- focused test는 Node 자체를 synthetic child로 사용해 다음을 검증한다.
  - odd/even sample의 median, mean, min, max 및 millisecond rounding
  - warm-up과 measured run 횟수 분리
  - 공백과 shell metacharacter가 포함된 argument의 literal 전달
  - child stdout이 harness stdout에 나타나지 않음
  - child stderr 원문은 나타나지 않고 measured byte count만 반환됨
  - non-zero exit, signal, spawn error에서 safe failure 유지
  - invalid option과 command 누락의 usage error

### 검증

```bash
node --test scripts/benchmarks/measure-command.test.mjs
node scripts/benchmarks/measure-command.mjs --warmup 0 --runs 2 -- node -e 'process.stdout.write("hidden")'
rg -n "spawn|shell: false|stdout: \"ignore\"|stderr: \"pipe\"|hrtime\.bigint|median|mean|stderrBytes" scripts/benchmarks/measure-command.mjs scripts/benchmarks/measure-command.test.mjs
git diff --check
```

수동 smoke의 JSON에는 timing aggregate와 0 byte stderr만 있어야 하고 `hidden`, command, argument, local path는 없어야 한다. Stage 보고서에는 test pass 수와 output key만 기록하며 synthetic stderr 원문은 복사하지 않는다.

### 커밋

```text
Task #34 Stage 1: benchmark harness와 synthetic 검증 추가
```

## Stage 2 — 공식 benchmark 문서와 README 비교표

### 산출물

신규:

- `docs/codex-lookup-benchmark.md`
- `mydocs/working/task_m02x_34_stage2.md`

수정:

- `README.md`

### 변경 내용

- 기존 README 상단 소개 문장 전체를 exact string으로 보존한다.
- 소개 문장 바로 다음에 다음 내용의 Markdown blockquote를 추가한다.

  ```md
  > **Documented upstream:** This CLI uses OpenAI Codex's documented
  > [`account/usage/read`](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md)
  > app-server method.
  ```

- 최신 main의 `## Support` 섹션은 upstream blockquote 다음에 그대로 유지한다.
- README의 `Why this CLI` 이후에 `## Codex lookup benchmark` 섹션을 추가하고 exact package version, median, 이번 측정에서 `codex-usage-analyzer` 대비 소요 시간만 표로 제시한다.

  | Tool | Median | Relative time |
  |---|---:|---:|
  | `codex-usage-analyzer@0.2.0` | 1.145s | 1.0x |
  | `ccusage@20.0.17` | 3.306s | 2.9x |
  | `tokscale@4.4.1` | 19.723s | 17.2x |

- 표 주변에는 “2026-07-13 한 환경에서 Codex usage lookup만 비교한 결과이며 전체 제품 비교나 보편적인 성능 보장이 아니다”라는 범위 문구를 둔다.
- README에서는 경쟁 도구의 다른 provider 지원, 제품 기능, 장단점, 정확도 또는 보안 우위를 설명하지 않는다.
- README 표 아래에서 `docs/codex-lookup-benchmark.md`로 연결하고 source semantics와 상세 조건이 다름을 짧게 알린다.
- 공식 benchmark 문서에는 다음을 기록한다.
  - 측정일 2026-07-13과 exact package/tool version
  - arm64 macOS 26.5.2, Node.js 24.15.0, Codex CLI 0.144.0-alpha.4
  - retained history 1,000~4,999 JSONL 및 2 GiB 이상 구간
  - 1회 warm-up, 5회 measured run, sequential execution, stdout 폐기, stderr byte count만 수집
  - 동일 장비에서 측정한 각 도구의 median과 min/max
    - `codex-usage-analyzer@0.2.0`: median 1.145초, min/max 0.800~1.222초
    - `ccusage@20.0.17`: median 3.306초, min/max 3.252~3.329초
    - `tokscale@4.4.1`: median 19.723초, min/max 19.440~20.328초
  - `codex-usage-analyzer`는 documented app-server account usage method를 사용하고 비교 도구는 retained local session history를 읽는다는 source 차이
  - remote source는 network/service 상태, local scanner는 retained history와 filesystem/cache 상태의 영향을 받는다는 한계
  - exact command array를 shell string이 아닌 argv 목록으로 제시하는 재현 절차
  - 결과를 전체 제품, provider coverage, 정확도, 기능 또는 보안 비교에 사용하지 않는 범위
- benchmark 문서에는 실제 account usage 값, 파일명, session content, 사용자 홈 또는 temp 절대 경로, credential/account identity를 넣지 않는다.
- 기존 README의 Privacy and Security, Support, License/non-affiliation 문구는 보존한다.

### 검증

```bash
node --input-type=module -e 'import fs from "node:fs"; const readme=fs.readFileSync("README.md", "utf8"); const intro="`codex-usage-analyzer` starts your installed Codex CLI, calls `account/usage/read`, and emits a stable, identity-free contract. It does not scan local sessions or directly read authentication files, tokens, keychains, prompts, or responses."; if (!readme.includes(intro)) throw new Error("README intro changed");'
rg -n "github\.com/openai/codex/blob/main/codex-rs/app-server/README\.md|Codex lookup benchmark|codex-usage-analyzer@0\.2\.0|ccusage@20\.0\.17|tokscale@4\.4\.1|1\.145s|3\.306s|19\.723s|2\.9x|17\.2x" README.md docs/codex-lookup-benchmark.md
rg -n "2026-07-13|warm-up|5|arm64|macOS 26\.5\.2|Node\.js 24\.15\.0|0\.144\.0-alpha\.4|1,000.*4,999|2 GiB|network|retained|whole product|entire product" docs/codex-lookup-benchmark.md
rg -n "Codex for Open Source|does not imply endorsement|Privacy and Security|not affiliated|not endorsed|not sponsored" README.md
git diff --check
```

Stage 보고서에는 README intro 보존 여부, 필수 link/수치, scope/limitation, 기존 Support와 non-affiliation 보존 결과만 기록한다.

### 커밋

```text
Task #34 Stage 2: Codex lookup benchmark 문서와 README 비교표 추가
```

## Stage 3 — 통합·보안·패키지 경계 검증

### 산출물

신규:

- `mydocs/working/task_m02x_34_stage3.md`

수정:

- Stage 3 검증에서 발견된 #34 범위 내 결함이 있을 때만 해당 harness, test, README 또는 benchmark 문서 수정

### 변경 내용

- repository 전체 unit test에 Stage 1 benchmark test가 포함되어 통과하는지 확인한다.
- harness의 synthetic smoke를 다시 실행해 child output과 command identity가 노출되지 않는지 확인한다.
- README와 benchmark 문서의 필수 수치, 공식 upstream link, Codex-only scope와 source semantics를 교차 확인한다.
- 공개 문서에 private absolute path, credential-like value, account identifier 또는 실제 usage metric이 들어가지 않았는지 pattern scan과 수동 검토를 함께 수행한다.
- npm package dry-run file list를 machine-readable JSON으로 검사해 `scripts/benchmarks/`와 `mydocs/`가 제외되는지 확인한다.
- 기존 runtime/CLI/SDK/contract source에 변경이 없는지 `main...HEAD` diff name과 package metadata를 확인한다.
- #34 수용 기준을 항목별로 OK/MISS 판정하고 MISS가 있으면 Stage를 종료하지 않는다.

### 검증

```bash
npm test
node --test scripts/benchmarks/measure-command.test.mjs
node scripts/benchmarks/measure-command.mjs --warmup 0 --runs 2 -- node -e 'process.stdout.write("hidden")'
node --input-type=module -e 'import fs from "node:fs"; const readme=fs.readFileSync("README.md", "utf8"); const intro="`codex-usage-analyzer` starts your installed Codex CLI, calls `account/usage/read`, and emits a stable, identity-free contract. It does not scan local sessions or directly read authentication files, tokens, keychains, prompts, or responses."; if (!readme.includes(intro)) throw new Error("README intro changed"); for (const value of ["1.145s","3.306s","19.723s"]) if (!readme.includes(value)) throw new Error(`missing ${value}`);'
rg -n "/Users/|/home/|Bearer [A-Za-z0-9._-]+|sk-[A-Za-z0-9_-]{16,}|access[_-]?token[[:space:]]*[:=]" README.md docs/codex-lookup-benchmark.md && exit 1 || true
npm pack --dry-run --json > /private/tmp/task34-stage3-pack.json
node --input-type=module -e 'import fs from "node:fs"; const [pack]=JSON.parse(fs.readFileSync("/private/tmp/task34-stage3-pack.json", "utf8")); const paths=pack.files.map(({path})=>path); const forbidden=paths.filter((path)=>path.startsWith("scripts/benchmarks/") || path.startsWith("mydocs/")); if (forbidden.length) throw new Error(forbidden.join(",")); console.log(`${paths.length} packaged files; benchmark harness excluded`);'
git diff --name-only main...HEAD
git diff --check
git status --short
```

`npm pack` 결과는 entry count와 forbidden file 부재만 보고하며 package 내부 문서 전체나 local temp path를 보고서에 복사하지 않는다. Stage 3 보고서가 커밋되기 전 `git status --short`에는 해당 보고서만 나타날 수 있고, 커밋 후에는 빈 출력이어야 한다.

### 커밋

```text
Task #34 Stage 3: benchmark 통합과 패키지 경계 검증
```

## 검증

- 각 Stage 검증 명령은 해당 단계 보고서 작성 전에 실행한다.
- 실패한 검증은 단계 완료로 처리하지 않고 같은 Stage에서 원인을 수정한다.
- benchmark test는 network, Codex login, 실제 account usage, 경쟁 package 설치 없이 재현 가능해야 한다.
- Stage 2 문서는 사전 측정값을 사용하며 benchmark를 다시 실행하거나 실제 external package를 호출하지 않는다.
- README 소개 문장, Support 섹션, Privacy and Security, non-affiliation 고지가 바뀌면 Stage 2를 종료하지 않는다.
- harness 출력에 command, argument, child stdout/stderr 원문, environment 또는 local path가 나타나면 Stage 1을 종료하지 않는다.
- package file audit에서 `scripts/benchmarks/` 또는 `mydocs/`가 발견되면 Stage 3을 종료하지 않는다.
- 계획 밖 runtime API, dependency, CI benchmark, package metadata 변경이 필요하면 구현계획서를 먼저 갱신하고 작업지시자 승인을 받는다.

## 커밋

- 구현계획서: `Task #34: 구현계획서 작성`
- Stage 1: `Task #34 Stage 1: benchmark harness와 synthetic 검증 추가`
- Stage 2: `Task #34 Stage 2: Codex lookup benchmark 문서와 README 비교표 추가`
- Stage 3: `Task #34 Stage 3: benchmark 통합과 패키지 경계 검증`
- 각 Stage source/doc와 `mydocs/working/task_m02x_34_stage{N}.md`는 같은 commit에 묶는다.

## 단계 의존성

- Stage 1은 이 구현계획서 승인 후 시작한다.
- Stage 2는 Stage 1 harness/test 검증과 단계 보고서가 승인된 뒤 시작한다.
- Stage 3은 Stage 2 README/공식 benchmark 문서 검증과 단계 보고서가 승인된 뒤 시작한다.
- 최종 보고서와 PR은 Stage 3 통합 검증 보고가 승인된 뒤 작성한다.

## 위험과 대응

- **Timing flakiness**: sleep duration의 절대값을 test assertion으로 사용하지 않고 pure statistics와 실행 횟수/output shape를 검증한다.
- **Child output leak**: stdout은 OS-level ignore로 연결하고 stderr는 chunk length만 누적하며 test에서 sentinel 원문 부재를 확인한다.
- **Shell injection**: command와 argv를 분리하고 `shell: false`를 코드와 metacharacter test로 검증한다.
- **Misleading comparison**: exact version, 날짜, 환경, source semantics, 상대 시간과 scope 한계를 README와 상세 문서에 함께 둔다.
- **Benchmark drift**: README는 짧은 snapshot이고 `docs/codex-lookup-benchmark.md`를 방법과 한계의 진실 원천으로 둔다.
- **Sensitive environment disclosure**: history는 구간만 공개하고 absolute path, filename, account identity와 usage 값은 scan 및 수동 검토로 차단한다.
- **Package expansion**: benchmark harness를 package `files` allowlist에 추가하지 않고 npm pack machine-readable 결과로 확인한다.
- **Existing README regression**: exact intro assertion과 Support/privacy/non-affiliation 필수 문구 검사를 Stage 2와 Stage 3에서 반복한다.

## 승인 요청 사항

- 위 3개 Stage 분할과 단계별 파일/검증/커밋 경계
- harness의 argv interface와 identity-free aggregate JSON output shape
- stderr를 저장하지 않고 measured byte 합계만 반환하는 보안 경계
- README의 median/relative time 표와 `docs/codex-lookup-benchmark.md` 상세 문서 분리
- Stage 2에서 사전 측정값을 문서화하고 external package benchmark를 다시 실행하지 않는 기준
- Stage 3 package/sensitive scan과 runtime surface 비변경 확인 절차

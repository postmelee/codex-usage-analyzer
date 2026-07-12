# Task M02x #34 수행계획서

GitHub Issue: [#34](https://github.com/postmelee/codex-usage-analyzer/issues/34)
마일스톤: M02x

## 목적

`codex-usage-analyzer`와 Codex 사용량을 조회하는 유사 CLI의 실행 시간을 같은 측정 규칙으로 기록할 수 있는 재사용 가능한 benchmark harness를 추가한다. 측정 도구는 child command의 실제 출력이나 로컬 경로를 노출하지 않고 시간 집계만 반환해야 한다.

README에는 기존 상단 소개 문구를 그대로 유지하면서 OpenAI Codex가 문서화한 `account/usage/read` method 링크와 Codex usage lookup 범위의 비교표를 추가한다. 비교 결과의 조건과 한계를 공식 문서에 함께 기록해 일회성 마케팅 수치가 전체 제품 비교나 보편적인 성능 보장으로 오해되지 않게 한다.

## 배경

v0.2.0은 로컬 session을 스캔하지 않고 설치된 Codex CLI를 통해 app-server의 `account/usage/read`를 호출하는 thin wrapper다. 이 구조는 retained local history를 순회하는 도구와 조회 경로가 다르므로, Codex 사용량을 얻는 데 걸린 실행 시간을 같은 환경에서 측정하고 그 차이의 원인과 한계를 분리해 설명할 필요가 있다.

2026-07-13 사전 측정에서는 exact package version, 1회 warm-up, 5회 본 실행, child stdout 폐기 조건으로 다음 median을 얻었다.

- `codex-usage-analyzer@0.2.0`: 1.145초
- `ccusage@20.0.17`: 3.306초
- `tokscale@4.4.1`: 19.723초

이 결과는 arm64 macOS 26.5.2, Node.js 24.15.0, Codex CLI 0.144.0-alpha.4, retained history 1,000~4,999 JSONL 및 2 GiB 이상인 한 환경의 측정값이다. local scanner는 retained history 규모와 cache 상태에 영향을 받고 account usage method는 network와 Codex service 상태에 영향을 받으므로, 측정일과 환경을 함께 공개해야 한다.

참고 근거:

- [OpenAI Codex app-server README](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md)
- [Tokscale](https://github.com/junhoyeo/tokscale)
- [ccusage](https://github.com/ccusage/ccusage)
- v0.2.0 구현 이슈 #32와 PR #33

## 범위

### 포함

- shell 없이 command와 argument를 분리 실행하는 reusable timing harness
- warm-up 횟수와 본 실행 횟수 입력, elapsed time의 median, mean, min, max 집계
- child stdout 폐기와 stderr 내용 비노출, stderr byte count만 집계하는 출력 경계
- synthetic child command를 사용한 정상 실행, 실패, argument 전달, 출력 억제 test
- 2026-07-13 측정 방법, exact version, 환경, history 규모 구간, 결과와 해석 한계 공식 문서화
- 기존 README 상단 소개 문구 보존과 documented `account/usage/read` blockquote 추가
- README의 Codex usage lookup 전용 비교표와 상세 benchmark 문서 링크
- 최신 `main`에 추가된 OpenAI Codex for Open Source Support 섹션 보존
- `npm pack --dry-run --json`으로 benchmark script가 npm package에 포함되지 않는지 검증

### 제외

- 기존 README 상단 소개 문구 수정
- v0.1.0 local analyzer와의 성능 비교
- Codex 외 provider 지원 범위나 경쟁 제품의 전체 기능 비교
- 비교 대상 package 자동 설치 또는 runtime dependency 추가
- submit, login, subscription quota command 실행
- 실제 account usage 값, session 내용, credential, account identifier, 사용자명, local path 기록
- CI에서 실제 외부 CLI 성능 benchmark 실행
- CLI, SDK, Account Usage Contract, JSON Schema 변경
- package version bump, npm publish, git tag, GitHub Release 생성

## 설계 방향

### Benchmark harness

- `scripts/benchmarks/measure-command.mjs`를 maintainer용 독립 실행 도구로 두며 runtime/package API로 export하지 않는다.
- command와 argument는 `--` 경계 뒤의 argv로 받아 `shell: false`로 실행하고, command string 재해석이나 shell interpolation을 허용하지 않는다.
- warm-up과 본 실행 횟수는 명시적인 non-negative/positive integer option으로 검증한다.
- 성공 결과에는 elapsed time의 median, mean, min, max와 실행 횟수만 포함한다. child stdout은 폐기하고 stderr는 본문 대신 byte count만 다룬다.
- child command 실패나 signal 종료는 원문 stderr를 복사하지 않는 안정적인 오류로 종료한다.
- test는 synthetic Node child command만 사용하며 Codex 계정, session, network, 경쟁 package에 의존하지 않는다.

### 공개 비교 문서

- `docs/codex-lookup-benchmark.md`를 benchmark 방법과 재현 조건의 진실 원천으로 둔다.
- README에는 세 package의 exact version과 median을 간결한 표로 제공하고, 상세 조건과 min/max 등은 공식 benchmark 문서로 연결한다.
- 표와 설명은 Codex usage lookup 시간만 비교하며 전체 제품, provider coverage, 정확도, 보안 또는 기능 우위를 주장하지 않는다.
- account-level remote 조회와 retained-history local scan은 source semantics가 다름을 명시하고, 결과를 절대적인 성능 보장으로 표현하지 않는다.
- 기존 상단 소개 문장은 byte-for-byte 보존하고 바로 다음에 공식 `account/usage/read` 링크 blockquote를 둔다. 현재 Support 섹션과 하단 non-affiliation 고지도 유지한다.

### 패키지와 보안 경계

- benchmark harness는 repository maintainer 도구이며 `package.json`의 npm `files` allowlist에 추가하지 않는다.
- 공식 benchmark 문서는 기존 `docs` allowlist에 따라 npm package에 포함될 수 있지만 실제 usage, raw stdout/stderr, credential, account identity, 절대 local path는 포함하지 않는다.
- 사전 측정 환경은 history 파일 수와 총량을 구간으로만 기록하며 사용자 홈 경로나 session filename을 기록하지 않는다.

## 문서 위치 판단

이 task는 사용자와 잠재 기여자가 읽는 공개 benchmark 문서를 생성하고 README를 수정한다. 프로젝트가 #32에서 공식 제품 문서 루트로 선택한 `docs/`를 그대로 사용하며, 작업 승인과 진행 이력만 `mydocs/` 표준 폴더에 둔다.

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| `README.md` | 공식 사용자 문서 | CLI 사용자/잠재 사용자 | 저장소 root | `docs/` | GitHub와 npm의 첫 진입점이며 짧은 비교표와 공식 method 링크를 노출할 위치다. |
| `docs/codex-lookup-benchmark.md` | 공식 benchmark 문서 | 사용자/기여자/검증자 | `docs/` | README | 측정 방법, 환경, 한계와 재현 절차를 README에서 분리해 유지할 수 있다. |
| task 계획/단계/최종 보고 | 작업 산출물 | 내부 작업자 | `mydocs/` 표준 폴더 | `docs/` | 승인과 구현 이력은 공개 제품 benchmark 문서와 분리한다. |

## 예상 변경 파일

신규:

- `scripts/benchmarks/measure-command.mjs`
- `scripts/benchmarks/measure-command.test.mjs`
- `docs/codex-lookup-benchmark.md`

수정:

- `README.md`

이번 task 산출물:

- `mydocs/orders/20260713.md`
- `mydocs/plans/task_m02x_34.md`
- `mydocs/plans/task_m02x_34_impl.md`
- `mydocs/working/task_m02x_34_stage{N}.md`
- `mydocs/report/task_m02x_34_report.md`

## 잠정 단계

- **Stage 1 — Benchmark harness와 synthetic 검증**
  - shell-free command 실행, warm-up/반복, timing 통계, 출력 억제와 safe failure를 구현한다.
  - synthetic child command만으로 argument 전달, 통계 계산, stdout/stderr 경계, non-zero exit를 검증한다.
- **Stage 2 — 공식 benchmark 문서와 README 비교표**
  - 측정 환경과 결과, lookup source 차이, 재현 조건과 해석 한계를 `docs/`에 기록한다.
  - 기존 README 소개와 Support/non-affiliation 고지를 유지하면서 documented upstream blockquote와 Codex-only 비교표를 추가한다.
- **Stage 3 — 통합·보안·패키지 경계 검증**
  - 전체 test, 문구/link 검사, 민감정보 pattern scan, package dry-run을 수행한다.
  - benchmark script가 npm artifact에서 제외되고 #34 수용 기준이 모두 충족됐는지 확인한다.

## 검증 계획

### 단계별 검증

- Stage 1
  - `node --test scripts/benchmarks/measure-command.test.mjs`
  - synthetic child command를 이용해 warm-up 제외, 반복 횟수, median/mean/min/max, argument 전달을 확인한다.
  - child stdout 미노출, stderr 원문 미노출과 byte count 처리, non-zero exit의 safe error를 확인한다.
- Stage 2
  - README 기존 상단 소개 문구의 exact match를 확인한다.
  - README에 공식 `account/usage/read` 링크, exact package version, 세 median, Codex-only 한계, 상세 문서 링크가 있는지 확인한다.
  - benchmark 문서에 측정일, 환경, warm-up/반복, history 규모 구간, lookup source 차이와 재현 명령이 있는지 확인한다.
- Stage 3
  - `npm test`
  - `node --test scripts/benchmarks/measure-command.test.mjs`
  - `npm pack --dry-run --json`
  - package file list에서 `scripts/benchmarks/`가 제외됐는지 확인한다.
  - README와 benchmark 문서에서 credential, account identifier, 실제 usage, private absolute path pattern이 없는지 확인한다.
  - `git diff --check`

### 통합 검증

- #34 수용 기준을 항목별로 최종 보고서에서 OK/MISS 판정한다.
- 공개 비교표가 Codex usage lookup에 한정되고 전체 제품 비교로 표현되지 않는다.
- benchmark 결과에는 child stdout/stderr 원문이나 실제 사용자 데이터가 포함되지 않는다.
- 기존 README 상단 소개, Support 섹션, privacy/security, non-affiliation 고지가 유지된다.
- `git status --short`가 PR 준비 전 빈 출력이다.
- `git diff --check`가 경고 없이 통과한다.

## 리스크

- **측정 결과 일반화**: 한 장비의 결과를 보편적인 우위로 오해할 수 있다. exact version, 날짜, 환경, history 구간과 source 차이를 표 주변과 상세 문서에 명시한다.
- **서로 다른 조회 semantics**: account-level remote method와 retained local history scan은 같은 데이터 source가 아니다. 비교 범위를 Codex usage lookup latency로 제한하고 정확도나 기능 우위를 주장하지 않는다.
- **민감정보 노출**: child output이나 환경 경로가 benchmark 결과와 문서에 들어갈 수 있다. stdout은 폐기하고 stderr는 byte count만 다루며 문서에는 bucketed environment 정보만 기록한다.
- **명령 주입**: benchmark 대상 command를 shell string으로 실행하면 shell metacharacter가 해석될 수 있다. argv를 분리하고 `shell: false`를 강제한다.
- **README 회귀**: 최신 main의 Support 섹션이나 기존 소개·고지가 비교 섹션 편집 중 손상될 수 있다. exact intro 검사와 필수 섹션/link 검사를 둔다.
- **npm artifact 확대**: maintainer benchmark script가 사용자 package에 포함될 수 있다. 기존 files allowlist를 유지하고 dry-run file list를 검사한다.

## 승인 요청 사항

- 3단계로 harness/test, 공식 문서/README, 통합·보안·package 검증을 분리하는 방향
- `docs/codex-lookup-benchmark.md`를 공개 benchmark 방법과 결과의 진실 원천으로 선택하는 방향
- README에는 Codex usage lookup의 exact version과 median만 간결하게 제시하고 상세 조건은 공식 문서로 연결하는 방향
- existing intro를 그대로 유지하고 그 직후 official method blockquote를 배치하며 최신 Support 섹션도 보존하는 방향
- benchmark harness를 npm package API나 CI performance gate로 제공하지 않는 제외 범위

승인되면 `task_m02x_34_impl.md`에서 단계별 산출물, 검증 명령, 커밋 메시지를 구체화한다.

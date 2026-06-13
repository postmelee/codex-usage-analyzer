# Task M010 #2 Stage 3 보고서

GitHub Issue: [#2](https://github.com/postmelee/codex-usage-analyzer/issues/2)
구현계획서: [`task_m010_2_impl.md`](../plans/task_m010_2_impl.md)
Stage: 3

## 단계 목적

Stage 3은 fixture/dev/test 경로를 명시화하는 단계다. 기본 `analyze --json`은 Stage 2의 production unavailable snapshot을 유지하고, sample fixture 출력은 `--fixture-sample` option을 명시적으로 사용할 때만 나오도록 CLI, 테스트, README를 분리했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/cli.js` | `--fixture-sample` option을 추가하고, 기본 `--json`은 production path, fixture option은 sample helper path를 사용하도록 분기했다. |
| `src/__tests__/cli.test.js` | 기본 CLI production 출력과 fixture 전용 CLI 출력을 별도 테스트로 검증하고 unknown flag 실패 정책을 유지했다. |
| `src/__tests__/analyze.test.js` | sample helper가 fixture marker를 유지한다는 assertion을 추가했다. |
| `README.md` | production unavailable snapshot 의미와 `--fixture-sample` 개발용 명령을 분리해 설명했다. |
| `mydocs/working/task_m010_2_stage3.md` | Stage 3 구현 내용, 검증 결과, 잔여 위험을 기록했다. |

## 본문 변경 정도 / 본문 무손실 여부

CLI usage text는 단일 명령에서 두 줄 usage로 확장했다. 기존 `analyze --json` 성공/실패 정책은 유지했고, fixture sample은 명시적인 추가 option으로만 접근 가능하게 했다. README는 기존 CLI/SDK/Tests/Status 섹션의 의미를 현재 구현에 맞게 부분 수정했다.

## 구현 요약

- `codex-usage-analyzer analyze --json`
  - production unavailable snapshot을 출력한다.
  - sample fixture marker가 없다.
  - profile/assets sample object를 포함하지 않는다.
- `codex-usage-analyzer analyze --json --fixture-sample`
  - packaged sample fixture snapshot을 출력한다.
  - fixture marker가 있다.
  - tests, examples, contract inspection 용도로만 README에 문서화했다.
- unknown flag는 stderr usage와 exit code `1` 정책을 유지했다.
- SDK sample helper는 유지하되, tests에서 fixture marker를 명시적으로 검증해 production path와 구분했다.

## 검증 결과

실행 명령:

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json
node bin/codex-usage-analyzer.js analyze --json --fixture-sample
rg -n "fixture-sample|sample-backed|codexUsageAnalyzer.fixture|createSampleUsageSnapshotV2" README.md src
git diff --check
```

결과:

- OK: `npm test` 통과. 총 9개 테스트가 모두 pass했다.
- OK: 기본 `analyze --json`은 `totalTokens: 0`, `null` breakdown/activity, 빈 ranking, `codexUsageAnalyzer.diagnostics`를 출력했다.
- OK: `analyze --json --fixture-sample`은 packaged sample fixture와 fixture marker를 출력했다.
- OK: `rg` 결과 fixture 언급은 README의 명시적 fixture 명령/SDK helper 설명, fixture 테스트, fixture file, CLI option 경로에만 남았다.
- OK: `git diff --check` 통과.
- OK: 새 README와 보고서에 실제 사용자 데이터, 로컬 private path, 인증 토큰, 계정 식별자 원본을 추가하지 않았다.

## 잔여 위험

- CLI fixture sample은 public command로 노출되므로, README와 usage text를 계속 sample/dev/test 용도로 유지해야 한다.
- README는 production unavailable baseline을 설명하지만, 실제 parser가 #3-#5에서 들어오면 다시 parser source와 unavailable 조건을 최신화해야 한다.
- fixture file 자체에는 packaged sample 값이 남아 있다. 이번 task의 범위는 fixture 제거가 아니라 기본 production path와 명시적 fixture path 분리다.

## 다음 단계 영향

- Stage 4는 기본 path와 fixture path가 전체 변경에서 일관되게 분리되어 있는지 회귀 검증한다.
- Stage 4 최종 보고서는 #3-#6 후속 이슈에 production unavailable baseline과 fixture option 정책을 handoff해야 한다.
- README는 Stage 4에서 최종 문장과 검증 결과를 한 번 더 확인한다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 Stage 4로 진행한다.

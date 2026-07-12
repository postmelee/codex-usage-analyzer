# Task M02x #34 Stage 3 완료 보고서

GitHub Issue: [#34](https://github.com/postmelee/codex-usage-analyzer/issues/34)
구현계획서: [`task_m02x_34_impl.md`](../plans/task_m02x_34_impl.md)
Stage: 3

## 단계 목적

Stage 1 benchmark harness/test와 Stage 2 README/공식 benchmark 문서를 통합 검증한다. 전체 test, output privacy boundary, README 필수 문구와 수치, sensitive pattern, npm tarball allowlist, 기존 runtime/contract 비변경을 확인하고 #34 수용 기준의 충족 여부를 확정하는 단계다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m02x_34_stage3.md` | 전체 test, 문서, 민감정보, package file 경계와 runtime 비변경 검증 결과를 기록했다. |

Stage 3 검증에서 #34 범위 내 결함이 발견되지 않아 harness, test, README와 공식 benchmark 문서는 추가 수정하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

검증 전용 단계로 제품 코드와 공개 문서를 변경하지 않았다. 기존 README 상단 소개 문장, Support, Privacy and Security, License/non-affiliation 문구는 Stage 2 커밋 상태를 그대로 유지한다. `package.json`, `bin/`, `src/`, Account Usage Contract/Schema와 downstream integration 문서도 `main` 대비 변경이 없음을 확인했다.

## 검증 결과

실행 명령:

```bash
npm test
node --test scripts/benchmarks/measure-command.test.mjs
node scripts/benchmarks/measure-command.mjs --warmup 0 --runs 2 -- node -e 'process.stdout.write("hidden")'
node --input-type=module -e 'import fs from "node:fs"; const readme=fs.readFileSync("README.md", "utf8"); const intro="`codex-usage-analyzer` starts your installed Codex CLI, calls `account/usage/read`, and emits a stable, identity-free contract. It does not scan local sessions or directly read authentication files, tokens, keychains, prompts, or responses."; if (!readme.includes(intro)) throw new Error("README intro changed"); for (const value of ["1.145s","3.306s","19.723s"]) if (!readme.includes(value)) throw new Error(`missing ${value}`);'
rg -n "/Users/|/home/|Bearer [A-Za-z0-9._-]+|sk-[A-Za-z0-9_-]{16,}|access[_-]?token[[:space:]]*[:=]" README.md docs/codex-lookup-benchmark.md && exit 1 || true
npm pack --dry-run --json
git diff --exit-code main...HEAD -- package.json bin src docs/account-usage-contract.md docs/account-usage.schema.json docs/downstream-integration.md
git diff --name-only main...HEAD
git diff --check
git status --short
```

결과:

- OK: `npm test`는 43개 test가 모두 통과했고 fail/cancel/skip은 0개다.
- OK: benchmark focused test 9개가 모두 통과했다.
- OK: synthetic smoke는 timing aggregate와 `stderrBytes: 0`만 출력했으며 child stdout sentinel은 노출하지 않았다.
- OK: README 기존 intro exact match와 median 1.145s, 3.306s, 19.723s를 확인했다.
- OK: README와 benchmark 문서에서 private absolute path, bearer/API token 형태, access-token assignment pattern이 발견되지 않았다.
- OK: 공개 변경분을 수동 검토해 실제 usage 값, session content, filename, account identity와 credential이 없음을 확인했다.
- OK: npm dry-run 결과는 17개 package file을 포함했다. `scripts/benchmarks/`와 `mydocs/`는 없고 `docs/codex-lookup-benchmark.md`는 포함됐다.
- OK: 첫 npm dry-run은 sandbox npm cache 권한으로 실행되지 않았으나 같은 command를 승인된 환경에서 다시 실행해 통과했다. package 결과에는 영향이 없다.
- OK: `package.json`, `bin/`, `src/`, 기존 contract/schema/downstream 문서는 `main` 대비 변경이 없다.
- OK: `main...HEAD` 변경 파일은 task 산출물, benchmark harness/test, README와 새 benchmark 문서로 한정된다.
- OK: `git diff --check`가 경고 없이 통과했고 보고서 작성 전 저장소는 clean 상태였다.
- OK: Stage 2 공식 tag 확인용 임시 source clone 두 개를 제거했다.

## 수용 기준 판정

| 기준 | 결과 | 근거 |
|---|---|---|
| 기존 README 상단 소개 문구 유지 | OK | exact string 검사 통과 |
| documented `account/usage/read` 링크 | OK | 상단 blockquote와 상세 문서에 공식 링크 존재 |
| warm-up/반복과 median/mean/min/max harness | OK | focused 통계 및 실행 횟수 test 통과 |
| child stdout 폐기와 stderr byte count | OK | sentinel 비노출 및 byte count test/smoke 통과 |
| README 세 exact version과 median | OK | 세 version 및 1.145s/3.306s/19.723s 확인 |
| Codex usage lookup 한정 고지 | OK | README와 상세 문서에 whole-product 제한 존재 |
| retained history 영향 고지 | OK | source semantics와 filesystem/cache/history 한계 존재 |
| npm package에서 benchmark script 제외 | OK | 17개 file audit에서 forbidden prefix 없음 |

## 잔여 위험

- benchmark는 2026-07-13 한 환경의 snapshot이다. network, service, Codex startup, retained history와 filesystem/cache 상태가 바뀌면 결과가 달라진다.
- 비교 command는 서로 다른 data source semantics를 사용하므로 latency 외 정확도, coverage 또는 제품 적합성을 나타내지 않는다.
- 이번 task에서는 external package benchmark를 다시 실행하지 않았다. 새 성능 주장을 게시할 때는 exact version으로 다시 측정해야 한다.
- GitHub PR CI는 아직 실행 전이며 PR 게시 후 원격 검증으로 확인해야 한다.

## 다음 단계 영향

- 세 Stage가 모두 완료됐으므로 다음 승인은 최종 결과보고서 작성과 PR 게시 준비 단계다.
- 최종 보고서는 각 Stage 검증과 #34 수용 기준을 요약하고 npm publish/version bump가 범위 밖임을 유지해야 한다.
- PR 게시 후 GitHub CI 결과를 확인하며 benchmark 자체를 CI performance gate로 실행하지 않는다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 최종 결과보고서 작성 및 PR 게시 절차로 진행한다.

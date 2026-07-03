# Task M010 #27 Stage 2 보고서

GitHub Issue: [#27](https://github.com/postmelee/codex-usage-analyzer/issues/27)
구현계획서: [`task_m010_27_impl.md`](../plans/task_m010_27_impl.md)
Stage: 2

## 단계 목적

Stage 2는 Stage 1에서 승인된 default advisory mode와 `--release-ready` strict mode 설계에 따라 read-only release preflight script를 구현하는 단계다. README 반영은 Stage 3으로 분리하고, 이번 Stage에서도 실제 version bump, git tag, GitHub Release, npm publish, publish workflow 실행은 수행하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/release-preflight.js` | read-only release preflight script 신규 추가 |
| `package.json` | `release:preflight` npm script entrypoint 추가 |
| `mydocs/working/task_m010_27_stage2.md` | Stage 2 변경과 검증 결과 기록 |
| `mydocs/orders/20260703.md` | #27 상태를 Stage 2 완료 및 Stage 3 승인 대기로 갱신 |

## 본문 변경 정도 / 본문 무손실 여부

runtime analyzer code, `UsageSnapshot v2` schema, README, GitHub Actions workflow는 이 Stage에서 변경하지 않았다. `package.json`은 `scripts.release:preflight` entrypoint만 추가했다. 신규 script는 repository release tooling이며 package `files` allowlist에 포함되지 않는다.

## 변경 내용

- `scripts/release-preflight.js`를 추가했다.
  - 기본 실행: `npm run release:preflight`
  - strict 실행: `npm run release:preflight -- --release-ready`
  - 기본 advisory mode는 release-ready gap을 `WARN`으로 표시하고 structural failure가 없으면 exit code `0`으로 종료한다.
  - strict mode는 같은 release-ready gap을 `FAIL`로 승격해 exit code `1`로 종료한다.
  - check별 `OK`, `WARN`, `FAIL` 요약을 출력한다.
- script가 수행하는 read-only 점검:
  - `package.json` package name/version/license/test script 확인
  - npm registry latest/dist-tag 조회
  - working tree 상태 확인
  - expected release tag 존재 여부 확인
  - `npm test` 실행
  - `npm pack --dry-run --json` 실행 및 package contents 확인
  - publish workflow trusted publishing 조건 확인
  - README release checklist 핵심 문구 확인
  - 민감정보 패턴 scan
  - dry-run tarball 부산물 미생성 확인
- script source에는 mutation command scan 대상인 `npm version`, `npm publish`, `git tag`, `git push`, `gh release create`, `gh workflow run` 문자열이 남지 않도록 구성했다.

## 검증 결과

실행 명령:

```bash
npm run release:preflight
npm run release:preflight -- --release-ready
npm test
npm_config_cache=/private/tmp/codex-usage-analyzer-npm-cache npm pack --dry-run
rg -n "npm version|npm publish|git tag|git push|gh release create|gh workflow run" scripts/release-preflight.js
ls codex-usage-analyzer-0.1.0.tgz
git diff --check
node scripts/release-preflight.js --help
```

결과:

- OK: `npm run release:preflight`는 exit code `0`으로 종료했다.
  - `OK`: package metadata, test suite, package dry run, publish workflow, release checklist, sensitive pattern scan.
  - `WARN`: local `0.1.0`이 registry `0.1.0`보다 크지 않음, 작업트리 미커밋 변경, `v0.1.0` tag 부재.
  - 최종 메시지: `release preflight completed with warnings`.
- OK: `npm run release:preflight -- --release-ready`는 exit code `1`로 종료했다. 이는 현재 release-ready 조건 부족을 strict mode가 실패로 승격한 expected failure다.
  - `FAIL`: local `0.1.0`이 registry `0.1.0`보다 크지 않음, 작업트리 미커밋 변경, `v0.1.0` tag 부재.
  - structural check인 package metadata, test suite, package dry run, publish workflow, release checklist, sensitive pattern scan은 모두 `OK`.
- OK: `npm test` 통과. 47 tests, 47 pass, 0 fail, duration 299.475667 ms.
- OK: `npm pack --dry-run` 통과. total files 19, package size 21.3 kB, unpacked size 88.1 kB.
- OK: mutation command source scan은 출력 없음. `rg` exit code 1은 검색 결과 없음으로 expected OK.
- OK: `ls codex-usage-analyzer-0.1.0.tgz`는 `No such file or directory`로 종료했다. dry-run tarball 부산물 없음.
- OK: `git diff --check` 통과.
- OK: `node scripts/release-preflight.js --help`가 usage와 `--release-ready` 설명을 출력했다.

## 잔여 위험

- default advisory mode는 warning만 있으면 exit code `0`이므로 실제 publish 직전에는 반드시 `--release-ready` strict mode를 사용해야 한다.
- `npm view` registry 조회는 network에 의존한다.
- Stage 2에서는 README 안내를 아직 반영하지 않았으므로 Stage 3에서 release checklist에 preflight 실행 시점을 문서화해야 한다.
- source scan은 mutation command 문자열 부재를 확인하지만 모든 동작을 증명하지는 않으므로 code review에서도 command allowlist를 확인해야 한다.

## 다음 단계 영향

- Stage 3에서 README `Release Checklist`에 `npm run release:preflight`와 `npm run release:preflight -- --release-ready` 실행 시점을 반영한다.
- Stage 3에서 통합 검증을 다시 실행하고 최종 보고서를 작성한다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3 README 반영과 통합 검증으로 진행한다.

# Task M02x #38 Stage 2 완료 보고서

GitHub Issue: [#38](https://github.com/postmelee/codex-usage-analyzer/issues/38)
구현계획서: [`task_m02x_38_impl.md`](../plans/task_m02x_38_impl.md)
Stage: 2

## 단계 목적

Workflow-level `contents: read`가 추가된 CI source를 기준으로 기존 CI와 같은 test, package dry-run, CLI no-auth smoke를 로컬에서 실행한다. Runtime/public surface, package artifact와 Publish Package trusted publishing 경계가 변하지 않았는지 함께 검증한다.

## 산출물

| 항목 | 결과 요약 |
|---|---|
| Node test | 43개 test 통과 |
| npm package dry run | `codex-usage-analyzer@0.2.0`, 17개 파일, unpacked size 54,244 bytes |
| CLI no-auth smoke | `--help`와 `--version` 성공, version `0.2.0` |

Repository source 또는 configuration 신규/수정 파일은 없다. 이 단계의 repository 산출물은 본 완료 보고서뿐이다.

## 본문 변경 정도 / 본문 무손실 여부

Stage 2는 검증만 수행했다. `.github/workflows/ci.yml`의 Stage 1 permission block 외 source 변경이 없으며 Publish Package workflow, package metadata, runtime, CLI, SDK, Account Usage Contract, README, SECURITY와 `docs/`를 수정하지 않았다. Runtime/development dependency와 npm script도 그대로다.

## 검증 결과

실행 명령:

```bash
npm test
npm pack --dry-run --json > /private/tmp/task38-stage2-pack.json
node bin/codex-usage-analyzer.js --help
node bin/codex-usage-analyzer.js --version
node -e 'const fs=require("node:fs"); const result=JSON.parse(fs.readFileSync("/private/tmp/task38-stage2-pack.json","utf8"))[0]; const files=result.files.map((entry)=>entry.path); const forbidden=files.filter((path)=>path.startsWith(".github/")||path.startsWith("mydocs/")); const pkg=require("./package.json"); if(forbidden.length||Object.keys(pkg.dependencies||{}).length||Object.keys(pkg.devDependencies||{}).length) process.exit(1); console.log(JSON.stringify({name:result.name,version:result.version,fileCount:files.length,unpackedSize:result.unpackedSize,forbidden}))'
git diff --exit-code main...HEAD -- .github/workflows/publish.yml
git diff --exit-code main...HEAD -- package.json bin src README.md SECURITY.md docs
git diff --check
git status --short
rm -f /private/tmp/task38-stage2-pack.json
```

결과:

- OK: `npm test`에서 43개 test가 모두 통과했고 fail, cancel, skip은 0개다.
- OK: Package dry run은 package `codex-usage-analyzer@0.2.0`, file 17개, unpacked size 54,244 bytes를 반환했다.
- OK: npm artifact에 `.github/`와 `mydocs/` path가 없다.
- OK: Runtime dependency와 development dependency가 각각 0개다.
- OK: CLI help는 usage를 출력했고 account access 없이 종료됐다.
- OK: CLI version은 `0.2.0`을 출력했다.
- OK: `.github/workflows/publish.yml`, `package.json`, `bin`, `src`, README, SECURITY와 `docs`는 `main...HEAD` 기준 변경이 없다.
- OK: `git diff --check`가 경고 없이 통과했다.
- OK: 보고서 작성 전 `git status --short`가 빈 출력이었다.
- OK: 검증용 `/private/tmp/task38-stage2-pack.json`을 삭제했다.

## 잔여 위험

- Local command 성공은 GitHub-hosted runner의 실제 token permission 동작을 대신하지 않는다. PR의 `test`와 CodeQL checks를 별도로 통과해야 한다.
- CodeQL alert #1은 fix가 main에 merge되기 전까지 open 상태다.
- Dependabot PR #40/#41이 같은 workflow를 수정할 수 있으므로 Stage 3에서 origin main과 PR 상태를 재확인해야 한다.

## 다음 단계 영향

- Stage 3는 `origin/main` 동기화 상태와 current CI에서 permission block을 제거한 구조가 upstream CI와 같은지 확인한다.
- Repository default workflow permission과 CodeQL alert #1 metadata를 재조회한다.
- PR check와 post-merge main CI/CodeQL gate를 최종 보고와 PR 본문에 고정한다.

## 승인 요청

- Stage 2 local CI scenario와 package/runtime 회귀 검증 결과를 승인하면 Stage 3 통합 security 검증과 remote gate 준비로 진행한다.

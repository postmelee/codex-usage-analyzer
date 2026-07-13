# Task M030 #37 Stage 2 완료보고서

GitHub Issue: [#37](https://github.com/postmelee/codex-usage-analyzer/issues/37)
구현계획서: [`task_m030_37_impl.md`](../plans/task_m030_37_impl.md)
Stage: 2

## 단계 목적

PR #44의 macOS app bundle resolver와 Stage 1의 `0.3.0` version surface를 포함한 전체 회귀 테스트를 실행하고, 실제 npm artifact의 구성과 public README 동기화 준비 상태를 검증한다. Release mutation 없이 advisory preflight가 tag 부재만 경고하는 상태인지 확정한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m030_37_stage2.md` | 전체 test, package artifact, README marker와 advisory preflight 검증 결과를 기록했다. |

제품 source, test, documentation과 workflow 수정은 없다.

## 본문 변경 정도 / 본문 무손실 여부

Stage 2는 읽기 전용 검증만 수행했다. `README.md`, `docs/`, `src/codex-executable.js`, resolver test, errors와 `.github/`는 `origin/main` 대비 변경이 없다. Stage 1에서 확정한 version source/test 외 제품 파일도 수정하지 않았다.

`npm pack --dry-run`과 preflight가 실제 tarball, lockfile 또는 source 변경을 남기지 않았으며 검증용 임시 파일은 `/private/tmp`에서 삭제했다.

## 검증 결과

실행 명령:

```bash
npm test
npm pack --dry-run --json > /private/tmp/task37-stage2-pack.json
node bin/codex-usage-analyzer.js --help
node bin/codex-usage-analyzer.js --version
node -e 'const fs=require("node:fs"); const result=JSON.parse(fs.readFileSync("/private/tmp/task37-stage2-pack.json","utf8"))[0]; const paths=result.files.map((file)=>file.path); const required=["README.md","docs/codex-lookup-benchmark.md","src/codex-executable.js"]; const forbidden=paths.filter((path)=>[".github/","mydocs/","scripts/","src/__tests__/"].some((prefix)=>path.startsWith(prefix))); if(result.version!=="0.3.0"||paths.length<18||required.some((path)=>!paths.includes(path))||forbidden.length) process.exit(1); console.log(JSON.stringify({name:result.name,version:result.version,fileCount:paths.length,unpackedSize:result.unpackedSize,requiredPresent:true,forbidden}))'
node -e 'const fs=require("node:fs"); const readme=fs.readFileSync("README.md","utf8"); const markers=["Documented upstream:","github.com/openai/codex/blob/main/codex-rs/app-server/README.md","Codex for Open Source","## Codex lookup benchmark","docs/codex-lookup-benchmark.md","npx codex-usage-analyzer@latest"]; if(markers.some((marker)=>!readme.includes(marker))||!readme.includes("codex-usage-analyzer@0.2.0")) process.exit(1)'
node -e 'const {execFileSync}=require("node:child_process"); const readme=JSON.parse(execFileSync("npm",["view","codex-usage-analyzer@0.2.0","readme","--json"],{encoding:"utf8"})); const markers=["Documented upstream:","github.com/openai/codex/blob/main/codex-rs/app-server/README.md","Codex for Open Source","## Codex lookup benchmark","docs/codex-lookup-benchmark.md"]; if(markers.some((marker)=>readme.includes(marker))) process.exit(1); console.log(JSON.stringify({version:"0.2.0",missingMarkers:markers.length}))'
npm run release:preflight > /private/tmp/task37-stage2-preflight.log
node -e 'const fs=require("node:fs"); const text=fs.readFileSync("/private/tmp/task37-stage2-preflight.log","utf8"); const fails=text.split(/\r?\n/u).filter((line)=>line.startsWith("[FAIL]")); const warns=text.split(/\r?\n/u).filter((line)=>line.startsWith("[WARN]")); if(fails.length||warns.length!==1||!warns[0].includes("release tag state: v0.3.0 tag is not present")||!text.includes("release preflight completed with warnings")) process.exit(1); console.log(JSON.stringify({fails:fails.length,warns:warns.length}))'
git diff --exit-code origin/main...HEAD -- README.md docs src/codex-executable.js src/__tests__/codex-executable.test.js src/errors.js .github
git diff --check
git status --short
rm -f /private/tmp/task37-stage2-pack.json /private/tmp/task37-stage2-preflight.log
```

결과:

- OK: 전체 test 55개가 통과했고 fail/cancelled/skipped/todo는 0이었다.
- OK: CLI `--help`와 `--version`은 account access 없이 정상 종료했고 version은 `0.3.0`이었다.
- OK: package dry-run은 `codex-usage-analyzer@0.3.0`, 18개 파일, unpacked size 57,034 bytes였다.
- OK: `README.md`, `docs/codex-lookup-benchmark.md`, `src/codex-executable.js`가 artifact에 포함됐고 금지 경로는 0개였다.
- OK: source README의 support/upstream/benchmark/app-only 관련 marker 6개와 historical `0.2.0` marker가 존재했다.
- OK: npm registry `0.2.0` README에는 신규 sync marker 5개가 모두 없었다.
- OK: advisory preflight는 package metadata, registry comparison, clean tree, test 55개, package 18개, CI/publish workflow, release guide, sensitive scan을 통과했다.
- OK: advisory preflight의 FAIL은 0개, WARN은 `release tag state: v0.3.0 tag is not present` 1개뿐이었다.
- OK: 보호 경로 diff, whitespace와 작업 트리 검사가 통과했고 임시 파일을 삭제했다.

환경 메모:

- 최초 sandbox `npm pack`은 사용자 npm cache 접근의 `EPERM`으로 중단됐으며 source 변경 없이 계획대로 동일 명령을 승인된 실행으로 재수행했다.
- 최초 sandbox preflight는 registry 단계에서 완전한 summary를 남기지 않아 통과로 처리하지 않았다. 동일 preflight를 승인된 실행으로 재수행해 exit 0과 전체 summary를 확인했다.

## 잔여 위험

- npm registry와 npm README는 아직 `0.2.0`이므로 `0.3.0` package가 실제 공개된 상태는 아니다.
- Local/remote `v0.3.0` tag, Publish Package workflow dispatch와 GitHub Release는 아직 생성하지 않았다.
- Strict `--release-ready` preflight는 tag가 없는 pre-merge 상태에서 의도한 단일 FAIL을 내는지 Stage 3에서 별도로 확인해야 한다.

## 다음 단계 영향

- Stage 3은 `origin/main` 최신 포함 여부와 task product diff를 검증한다.
- Registry/latest `0.2.0`, local/remote tag와 GitHub Release 부재를 다시 확인한다.
- Strict preflight의 유일한 FAIL이 정확히 `release tag state: v0.3.0 tag is not present`인지 고정한다.
- Trusted Publishing workflow의 OIDC/sensitive boundary와 관련 PR 상태를 확인한 뒤 post-merge runbook을 release gate로 확정한다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3으로 진행한다.

# Task M04x #54 Stage 2 완료 보고서

GitHub Issue: [#54](https://github.com/postmelee/codex-usage-analyzer/issues/54)
구현계획서: [`task_m04x_54_impl.md`](../plans/task_m04x_54_impl.md)
Stage: 2

## 단계 목적

Stage 1의 `0.4.1` version surface를 대상으로 전체 regression, local package
artifact, 공개 `0.4.0` before baseline, CLI no-auth, README marker와 advisory
release preflight를 검증한다. 제품 소스와 공개 문서는 추가 수정하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m04x_54_stage2.md` | Stage 2 package/release-readiness 검증 결과 기록 |

Product source 변경은 없다. Package dry-run과 preflight 출력은 고정된 OS temporary
directory에서만 생성하고 결과 확인 후 exact target을 정리했다.

## 본문 변경 정도 / 본문 무손실 여부

제품/API/문서 본문 변경은 없다. Stage 1 commit의 9개 version source/test 외
Account Usage, Full Profile v1/v2, pet runtime/selector, experimental API, root SDK,
README/docs, workflow와 scripts는 `origin/main` 대비 diff zero를 유지한다.

## 검증 결과

실행 명령:

```bash
npm test
CACHE_DIR="$(mktemp -d /private/tmp/codex-usage-analyzer-task54-stage2.XXXXXX)"
npm pack --cache "$CACHE_DIR" --dry-run --json > "$CACHE_DIR/pack.json"
node bin/codex-usage-analyzer.js --help
node bin/codex-usage-analyzer.js --version
node bin/codex-usage-analyzer.js profile --help
node -e 'const fs=require("node:fs"); const result=JSON.parse(fs.readFileSync(process.argv[1],"utf8"))[0]; const paths=result.files.map((entry)=>entry.path); const required=["README.md","docs/account-usage-contract.md","docs/account-usage.schema.json","docs/downstream-integration.md","docs/experimental-full-profile.md","docs/experimental-full-profile.schema.json","docs/experimental-full-profile-v2.schema.json","src/experimental-pet.js","src/experimental-pet-selector.js","src/experimental-profile-api.js","src/experimental-profile-api.d.ts","src/experimental-profile-client.js","src/experimental-profile.js","src/index.js","src/index.d.ts"]; const prefixes=[".github/","mydocs/","scripts/","src/__tests__/"]; const fragments=["codex-extracted","fixture","auth.json","auth-response","profile-response","raw-response",".env"]; const forbidden=paths.filter((path)=>prefixes.some((prefix)=>path.startsWith(prefix))||fragments.some((fragment)=>path.toLowerCase().includes(fragment))); if(result.version!=="0.4.1"||paths.length!==28||required.some((path)=>!paths.includes(path))||forbidden.length) process.exit(1)' "$CACHE_DIR/pack.json"
node -e 'const p=require("./package.json"); if((p.files??[]).length!==20||Object.keys(p.dependencies??{}).length!==0||Object.keys(p.devDependencies??{}).length!==0) process.exit(1)'
test ! -e package-lock.json
node -e 'const fs=require("node:fs"); const readme=fs.readFileSync("README.md","utf8"); const markers=["--include-pet","--pet-key","--select-pet","codex-usage-analyzer/experimental-profile","experimental-full-profile-v2.schema.json"]; if(markers.some((marker)=>!readme.includes(marker))) process.exit(1)'
npm pack codex-usage-analyzer@0.4.0 --cache "$CACHE_DIR" --dry-run --json > "$CACHE_DIR/published-040.json"
node -e 'const fs=require("node:fs"); const result=JSON.parse(fs.readFileSync(process.argv[1],"utf8"))[0]; const paths=result.files.map((entry)=>entry.path); const absent=["docs/experimental-full-profile-v2.schema.json","src/experimental-pet.js","src/experimental-pet-selector.js","src/experimental-profile-api.js","src/experimental-profile-api.d.ts"]; if(result.version!=="0.4.0"||paths.length!==23||absent.some((path)=>paths.includes(path))) process.exit(1)' "$CACHE_DIR/published-040.json"
env NPM_CONFIG_CACHE="$CACHE_DIR" node scripts/release-preflight.js > "$CACHE_DIR/preflight.log"
node -e 'const fs=require("node:fs"); const text=fs.readFileSync(process.argv[1],"utf8"); const fails=text.split(/\r?\n/u).filter((line)=>line.startsWith("[FAIL]")); const warns=text.split(/\r?\n/u).filter((line)=>line.startsWith("[WARN]")); const expected="[WARN] release tag state: v0.4.1 tag is not present"; if(fails.length||warns.length!==1||warns[0]!==expected||!text.includes("release preflight completed with warnings")) process.exit(1)' "$CACHE_DIR/preflight.log"
git diff --exit-code origin/main...HEAD -- README.md docs .github scripts src/index.js src/account-usage.js src/experimental-profile.js src/experimental-pet.js src/experimental-pet-selector.js src/experimental-profile-api.js src/experimental-profile-api.d.ts src/format-account-usage.js src/format-experimental-profile.js
git diff --check
git status --short
```

결과:

- OK — Full regression: 178 tests, 178 pass, 0 fail.
- OK — Local package: `0.4.1`, 28 files, required pet/v2 surface 포함.
- OK — Forbidden package artifact: 0개.
- OK — Published before baseline: `0.4.0`, 23 files, 신규 5개 pet/v2
  artifact 미포함.
- OK — Package `files` allowlist 20개, dependencies 0개, devDependencies 0개,
  lockfile 없음.
- OK — CLI `--help`, `--version`, `profile --help`가 account access 없이 통과;
  version `0.4.1`.
- OK — README marker 5개 모두 존재: include-pet, explicit key, selector,
  experimental subpath, Full Profile v2 schema.
- OK — Advisory preflight: package metadata, registry ordering, clean tree,
  178 tests, 28-file package, CI/publish policy, release guide와 sensitive scan 통과.
- OK — Advisory preflight WARN은
  `[WARN] release tag state: v0.4.1 tag is not present` 1개뿐이며 FAIL 0개.
- OK — Protected product/docs/workflow/scripts diff zero, `git diff --check` 통과.
- OK — Temporary validation directory 정리 완료.

## 잔여 위험

- Strict `--release-ready` preflight는 pre-tag 상태에서 예상 tag 부재 FAIL 1개만
  발생하는지 Stage 3에서 확인해야 한다.
- 원격 `origin/main` 최신 포함 여부, `v0.4.1` Release/dispatch 부재와 publish
  workflow supply-chain pattern은 Stage 3에서 재검증해야 한다.
- npm publish는 irreversible하므로 PR merge와 별도 release 실행 승인 전에는
  tag와 external mutation을 수행할 수 없다.

## 다음 단계 영향

- Stage 3은 제품 소스를 수정하지 않고 origin sync, exact 9-file product diff,
  strict pre-tag expectation과 외부 release state를 검증한다.
- Post-merge runbook의 local acceptance baseline은 178 tests, 28 files,
  dependency 0과 advisory tag WARN 1개다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3으로 진행한다.

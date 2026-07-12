# Task M02x #43 Stage 3 완료보고서

GitHub Issue: [#43](https://github.com/postmelee/codex-usage-analyzer/issues/43)
구현계획서: [`task_m02x_43_impl.md`](../plans/task_m02x_43_impl.md)
Stage: 3

## 단계 목적

앱-only 사용자가 이해할 수 있도록 README의 Quick Start, Requirements, How it works, Troubleshooting을 보정하고 사용자-facing `npx` 명령에서 `--yes`를 제거한다. full test, npm package audit, PATH에서 Codex CLI를 제외한 실제 macOS 앱 번들 structural smoke로 #43의 통합 동작과 privacy/package 경계를 검증한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `README.md` | 대화형 Quick Start 2개에서 `--yes`를 제거하고, CLI PATH 우선·macOS ChatGPT/Codex 앱 fallback·선택 process 인증 위임·오류 안내를 반영했다. |

Stage 3 검증에서 Stage 1/2 source, test, `package.json`의 추가 결함은 발견되지 않아 해당 파일은 수정하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

README의 기존 섹션 구조와 synthetic output example, benchmark snapshot, supported metrics, CLI/SDK reference, downstream integration, Privacy and Security, Development, Contributing, Support, License/non-affiliation 본문은 유지했다.

변경은 상단 제품 한 줄 설명, Quick Start 두 command, Small runtime 한 문장, Requirements의 runtime/sign-in 안내, How it works의 executable 선택 2단계, Troubleshooting 두 행에 한정했다. 새 공식 문서 파일을 만들지 않았고 Account Usage Contract와 schema는 수정하지 않았다. `mydocs/manual/npm_release_guide.md`의 비대화형 `--yes` smoke도 보존했다.

## 검증 결과

실행 명령:

```bash
npm test
node --input-type=module -e 'import fs from "node:fs"; const readme=fs.readFileSync("README.md","utf8"); if (readme.includes("npx --yes codex-usage-analyzer@latest")) throw new Error("interactive README still forces --yes"); const matches=readme.match(/npx codex-usage-analyzer@latest/gu) ?? []; if (matches.length !== 2) throw new Error(`expected 2 interactive commands, got ${matches.length}`); const manual=fs.readFileSync("mydocs/manual/npm_release_guide.md","utf8"); if (!manual.includes("npx --yes codex-usage-analyzer@latest --help")) throw new Error("maintainer smoke lost --yes"); console.log("interactive and automation commands separated");'
rg -n "PATH|macOS|ChatGPT app|Codex app|app bundle|CODEX_NOT_FOUND|npx codex-usage-analyzer@latest" README.md
rg -n "Small runtime|no runtime package dependencies|never asks you to paste a token|private profile endpoint|not affiliated|not endorsed|not sponsored" README.md
npm pack --dry-run --json > /private/tmp/task43-stage3-pack.json
node --input-type=module -e 'import fs from "node:fs"; const [pack]=JSON.parse(fs.readFileSync("/private/tmp/task43-stage3-pack.json","utf8")); const paths=pack.files.map(({path})=>path); if (!paths.includes("src/codex-executable.js")) throw new Error("resolver missing from package"); const forbidden=paths.filter((path)=>path.startsWith("mydocs/") || path.startsWith("src/__tests__/")); if (forbidden.length) throw new Error(forbidden.join(",")); console.log(`${paths.length} packaged files; resolver included; private task files excluded`);'
node --input-type=module -e 'import {spawnSync} from "node:child_process"; const env={...process.env,PATH:"/usr/bin:/bin"}; const result=spawnSync(process.execPath,["bin/codex-usage-analyzer.js","--json"],{env,encoding:"utf8",timeout:30000}); if(result.status!==0) throw new Error("app-bundle structural smoke failed"); const value=JSON.parse(result.stdout); console.log(JSON.stringify({contractVersion:value.contractVersion,summaryKeys:Object.keys(value.summary).sort(),dailyKind:value.dailyUsageBuckets===null?"null":"array"}));'
rg -n -g '!src/__tests__/**' "readFile|keychain|auth\.json|accessToken|refreshToken|Authorization|ChatGPT-Account-Id|/wham/|experimentalApi" src bin && exit 1 || true
git diff --check
git status --short
```

결과:

- OK: repository full test 55개가 모두 통과했고 fail/cancelled/skipped/todo는 0이었다.
- OK: README에는 대화형 `npx codex-usage-analyzer@latest` command가 정확히 2개 있고 강제 `--yes`는 없었다. maintainer release smoke의 `--yes`는 유지됐다.
- OK: README에서 PATH, macOS, ChatGPT/Codex app, app bundle, `CODEX_NOT_FOUND` 설명과 Quick Start command를 확인했다.
- OK: Small runtime, dependency-free, token paste 금지, private profile endpoint 금지와 non-affiliation 문구를 보존했다.
- OK: npm pack audit은 18개 package file을 확인했고 resolver runtime module은 포함, `mydocs`와 test artifact는 제외됐다.
- OK: package dry-run은 sandboxed npm cache write 제한으로 최초 실행이 중단됐으나, 동일 명령을 승인된 환경에서 재실행해 최종 통과했다. 생성한 임시 audit JSON은 검증 후 삭제했다.
- OK: app-only live smoke는 `contractVersion: 1`, 계획된 5개 summary key, `dailyKind: array` 구조만 출력했다. raw usage value, raw stderr, account identifier, executable path는 출력·저장하지 않았다.
- OK: runtime source의 auth/keychain/token/header/private endpoint 금지 pattern은 zero-match였다.
- OK: `git diff --check`는 whitespace error 없이 통과했다.

## 잔여 위험

- macOS 앱 번들 내부 경로는 공개 안정 계약이 아니므로 향후 앱 packaging 변경 시 fallback 후보 보정이 필요할 수 있다.
- 이번 task는 현재 승인된 macOS 표준 Applications 후보만 지원한다. Windows/Linux 앱 탐지와 비표준 설치 위치는 범위 밖이다.
- 앱이 설치돼도 ChatGPT-backed sign-in, service/network 상태, app-server protocol compatibility가 충족되지 않으면 기존 safe app-server error가 발생할 수 있다.

## 다음 단계 영향

- 승인된 구현계획의 3개 Stage가 모두 완료됐다.
- Stage 3 승인 후 `task-final-report` 절차에서 최종 보고서, 오늘할일 완료 처리, 최종 검증, publish branch와 main 대상 PR을 준비한다.
- 최종 보고서에는 resolver 순서, test/package/live 검증과 번들 경로 drift 위험을 요약하고 실제 usage 값이나 로컬 경로를 포함하지 않는다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 최종 보고 및 PR 단계로 진행한다.

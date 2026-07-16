# Task M040 #46 Stage 4 완료보고서

GitHub Issue: [#46](https://github.com/postmelee/codex-usage-analyzer/issues/46)
구현계획서: [`task_m040_46_impl.md`](../plans/task_m040_46_impl.md)
Stage: 4

## 단계 목적

Experimental Full Profile의 사용자·consumer 문서와 npm package 경계를 완성하고, stable Account Usage Contract/SDK 무변경, zero-runtime-dependency, 민감 데이터 비포함과 private endpoint의 실제 구조 호환성을 검증한다. README의 기존 identity-free 소개를 보존하면서 명시적 `profile` command의 unsupported API, identity/privacy, process-memory credential, no-fallback 경계를 별도 계약으로 문서화한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `README.md` | 254줄. 상단 stable 소개를 보존하고 Quick Start 뒤에 experimental profile 명령, unsupported/private endpoint, identity와 process memory 경계, 별도 계약 링크를 추가했다. CLI·downstream·privacy 설명을 실제 동작과 맞췄다. |
| `docs/experimental-full-profile.md` | 241줄. CLI surface, envelope field, canonical usage, status/exit, null/empty, human heatmap, security/drift와 downstream 정책의 공식 설명 문서를 추가했다. |
| `docs/account-usage-contract.md` | 90줄. Stable v1이 Full Profile로 확장되지 않고 nested `usage`로만 재사용된다는 cross-link를 추가했다. Schema와 기존 shape/semantics는 변경하지 않았다. |
| `docs/downstream-integration.md` | 195줄. 기존 미구현 adapter 초안을 실제 Full Profile Envelope 소비 규칙으로 교체하고 GitHub ownership, cosmetic remote identity, activity opt-in과 avatar re-host 원칙을 유지했다. |
| `package.json` | Experimental client, normalizer와 renderer를 npm artifact allowlist에 추가했다. Runtime dependency는 0개를 유지했다. |
| `scripts/release-preflight.js` | 535줄. Full Profile 문서/schema/runtime 필수 포함, fixture·extracted/auth/raw response 분석물 제외, zero dependency와 experimental source 민감 패턴 검사를 추가했다. |
| `src/__tests__/index.test.js` | 63줄. Public SDK surface 무변경과 experimental CLI runtime의 package 포함을 함께 검증하도록 확장했다. |
| `src/experimental-profile.js` | 424줄. Live smoke에서 확인된 fractional percentage를 0~100 finite number로 제한한 뒤 Codex UI와 같은 whole-percent integer로 반올림하도록 보정했다. |
| `src/__tests__/experimental-profile.test.js` | 407줄. Fractional percentage의 whole-percent normalization과 `ok` 상태를 synthetic fixture로 고정했다. |

## 본문 변경 정도 / 본문 무손실 여부

README의 제목, badge, 한 줄 소개, identity-free 기본 동작 문단과 documented upstream 인용은 수정하지 않았다. Experimental 절만 Quick Start 뒤에 추가하고 기존 CLI/How it works/downstream/privacy 문장을 실제 opt-in command와 모순되지 않게 필요한 범위에서 보정했다.

Account Usage Contract의 root/summary/daily shape, null semantics, forward compatibility와 privacy 본문은 그대로 유지하고 별도 envelope cross-link만 추가했다. `src/index.js`, `src/index.d.ts`, `docs/account-usage.schema.json`은 수정하지 않아 public SDK와 stable schema가 experimental identity/activity를 export하지 않는다.

Downstream의 기본 architecture, GitHub binding, submit token, stable submit API, storage/render/cache/delete 정책은 보존했다. Experimental identity 절만 실제 `profile --json` envelope, nested official usage authority, 별도 activity privacy opt-in과 remote avatar sanitization 정책으로 갱신했다.

## 검증 결과

실행 명령:

```bash
npm test
npm pack --cache <isolated-temporary-cache> --dry-run --json
NPM_CONFIG_CACHE=<isolated-temporary-cache> node scripts/release-preflight.js
node bin/codex-usage-analyzer.js --help
node bin/codex-usage-analyzer.js profile --help
rg -n 'profile|profile --json|experimental|unsupported|identity|process memory|account/usage/read' README.md docs/experimental-full-profile.md docs/account-usage-contract.md docs/downstream-integration.md
if rg -n 'UsageSnapshot v2|--full|--profile|allow-network' README.md docs/experimental-full-profile.md src/experimental-profile*.js src/cli.js; then exit 1; fi
if rg -n 'keychain|auth\.json|Cookies|writeFile|appendFile|createWriteStream|console\.(log|error)' src/experimental-profile*.js; then exit 1; fi
git diff --exit-code HEAD -- src/index.js src/index.d.ts docs/account-usage.schema.json
git diff --check
```

승인된 live structural probe는 raw stdout 대신 status, field type/presence, collection count category, screen parity boolean과 coarse latency category만 출력했다. 실제 usage 값, identity, avatar URL, invocation name, token, account identifier와 raw response는 출력하거나 문서화하지 않았다.

결과:

- OK: 최종 전체 test 116개가 통과했고 fail/cancelled/skipped/todo는 0이었다.
- OK: Package dry-run은 23개 파일, 약 29.1 kB였다. Full Profile 문서/schema와 experimental runtime 세 파일을 포함하고 tests, `mydocs`, scripts, fixture, extracted/auth/raw response 분석물은 제외했다. Tarball은 남지 않았다.
- OK: Runtime dependency 0개를 package metadata test와 release preflight에서 확인했다.
- OK: Advisory preflight의 package, test, CI/publish workflow, release guide와 민감 패턴 17개 파일 검사가 통과했다.
- WARN: Advisory preflight는 local version이 registry version보다 높지 않고 working tree가 미커밋 상태이며 현재 release tag가 HEAD를 가리키지 않는다고 보고했다. Stage 작업 중 예상된 release-order 상태이며 package/security 실패가 아니다.
- OK: README 상단 stable 소개는 diff에 포함되지 않았고 documented `account/usage/read` 링크를 유지했다.
- OK: Full Profile 문서와 runtime에서 금지된 과거 명령/계약 표현이 없고, experimental source에 직접 credential file/keychain/cookie/file-write/console logging pattern이 없었다.
- OK: 문서 내부 local link가 모두 존재하고 변경 파일에 private key/token-like literal, 사용자 경로와 임시 경로가 없었다.
- OK: Public SDK source/declaration과 Account Usage Schema diff가 없었다.
- OBSERVED: 첫 승인 live probe는 호출에 성공했지만 percentage 두 field가 integer-only normalizer에서 null이 되어 `partial`과 activity parity false를 반환했다. Identity, official summary, token activity와 top invocation의 structural parity는 true였고 latency는 1-3s 범주였다.
- FIXED: 로컬 Codex UI source에서 private percentage를 number로 전달하고 whole percent로 표시하는 규칙을 확인했다. 0~100 finite number를 UI whole percent로 반올림하도록 보정하고 synthetic test와 계약 설명을 추가했다.
- OK: 두 번째 승인 live probe는 `status: ok`, expected field type, non-empty bounded collection category와 identity/summary/token activity/activity insight/top invocation screen parity boolean 모두 true를 반환했다. Latency는 1-3s 범주였다.
- OK: Live probe 두 번 모두 raw value와 credential을 출력하지 않았고 app-server/HTTP raw detail을 남기지 않았다.
- OK: 검증용 임시 npm cache는 삭제했다.

## 잔여 위험

- `/wham/profiles/me`와 internal auth method는 여전히 unsupported private contract다. Backend나 app-server drift 시 `partial`/`unavailable` 또는 safe error가 발생할 수 있으며 별도 release 없이도 중단될 수 있다.
- JavaScript token memory zeroization은 보장하지 않는다. 구현은 dedicated child와 local reference lifetime을 최소화하며 token/account context를 output, log, file 또는 normalizer에 전달하지 않는다.
- User-level npm cache의 기존 ownership 문제로 기본 local `npm pack`은 실패했지만 isolated temporary cache와 fresh-environment release preflight는 통과했다. 향후 로컬 release command는 cache ownership을 정상화하거나 격리 cache를 사용해야 한다.
- 현재 package version은 registry와 동일하므로 이 기능을 npm에 제공하려면 후속 release 단계에서 version bump, release-ready preflight, tag, trusted publish와 GitHub Release 순서를 수행해야 한다.
- Experimental profile은 의도적으로 public JavaScript SDK export가 아니다. Downstream automation은 CLI `profile --json`과 별도 schema를 사용하고 unsupported/privacy 정책을 수용해야 한다.

## 다음 단계 영향

- Stage 4가 구현계획서의 마지막 Stage다. 승인 후 `task-final-report` 절차로 최종 보고서, 오늘할일 완료, 최종 커밋/publish branch와 PR 게시를 진행한다.
- Final report와 PR에는 live smoke의 status/type/parity/coarse latency만 포함하고 실제 계정 값, identity, URL, invocation name, token, account id와 raw response는 포함하지 않는다.
- Issue #46 merge 이후 실제 npm 배포는 별도 release/version task에서 수행해야 하며 현재 `0.3.0`을 다시 publish하면 안 된다.

## 승인 요청

- Stage 4 산출물과 검증 결과를 승인하면 Task #46 최종 보고와 PR 게시 절차로 진행한다.

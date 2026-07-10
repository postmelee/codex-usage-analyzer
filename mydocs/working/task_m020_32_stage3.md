# Task M020 #32 Stage 3 완료보고서

GitHub Issue: [#32](https://github.com/postmelee/codex-usage-analyzer/issues/32)
구현계획서: [`task_m020_32_impl.md`](../plans/task_m020_32_impl.md)
Stage: 3

## 단계 목적

Stage 2에서 완성한 official `account/usage/read` thin CLI를 npm과 GitHub의 실제 사용자 진입점에 반영한다. 공개 문서는 사용, contract, downstream, contribution, security 책임으로 재구성하고 version/tag/publish 운영 절차는 maintainer 전용 매뉴얼로 이동한다. CI와 release preflight도 로그인 없이 검증 가능한 새 package surface에 맞춘다.

## 산출물

| 파일/영역 | 변경 요약 |
|---|---|
| `README.md` | value/privacy 우선 설명, `npx` quick start, human/JSON 예제, metric/requirement/CLI/SDK/privacy/troubleshooting/support/license 흐름으로 전면 재작성했다. |
| `docs/account-usage-contract.md` | version 1 shape와 null/date/forward-compatibility/privacy semantics를 영어 공개 문서로 정리했다. |
| `docs/downstream-integration.md` | identity-free payload, GitHub identity, submit token, validation/storage, card rendering/cache, privacy/revoke/delete 책임과 권장 field를 고정했다. |
| `CONTRIBUTING.md` | issue-first 승인 경계, synthetic automated test, public contract, PR 검증 기준을 외부 기여자 관점에서 추가했다. |
| `SECURITY.md` | 지원 release, private vulnerability reporting, 민감정보 금지, command/protocol/supply-chain 보안 범위를 추가했다. |
| `mydocs/manual/npm_release_guide.md` | version bump부터 tag, strict preflight, Trusted Publishing, registry/npx/signature, GitHub Release까지 package 운영 순서를 이동했다. |
| `mydocs/manual/README.md` | npm package release guide와 framework release protocol의 역할 구분을 index에 추가했다. |
| `scripts/release-preflight.js` | 새 16-file tarball allowlist, removed runtime denylist, CI/publish no-auth smoke, README-release 경계, tag-HEAD, 11-file sensitive scan을 검증하도록 갱신했다. |
| `.github/workflows/ci.yml` | account access smoke를 `--help`와 `--version` no-auth smoke로 교체했다. |
| `.github/workflows/publish.yml` | publish 전 no-auth CLI smoke를 추가하고 기존 Trusted Publisher OIDC 경계를 유지했다. |

## 구현 결과

### 사용자 진입점

- 첫 실행 command를 `npx --yes codex-usage-analyzer@latest`로 단순화했다.
- human output과 JSON contract 예제는 synthetic임을 바로 명시했다.
- account-level source, identity-free output, no direct credential reader, no runtime dependency를 핵심 가치로 제시했다.
- summary 5개 metric과 daily bucket의 `null`, empty array, source date semantics를 설명했다.
- 실제 CLI parser와 SDK export, timeout/error code를 현재 implementation과 대조했다.
- MIT copyright holder `postmelee`와 OpenAI 비제휴/상표 범위를 유지했다.

### Downstream 책임 계약

- CLI request body는 Account Usage Contract 그대로이며 identity field를 추가하지 않는다.
- Downstream account ownership은 stable GitHub numeric user id binding으로 확인하고 display name, username, avatar는 GitHub response에서 정규화한다.
- Submit credential은 downstream이 별도 발급하며 OpenAI, Codex, GitHub credential을 재사용하지 않는다.
- Body/schema/version/size/date/replay 검증, 최소 storage, log redaction, card cache validator, avatar SSRF/image sanitization, revoke/delete 책임을 downstream에 배치했다.
- `/wham/profiles/me` 계열 adapter는 미구현 experimental envelope로만 문서화하고 default path, auth/authorization, usage contract에서 격리했다.

### Release와 automation 경계

- README에서 version bump, tag, workflow publish, signature, GitHub Release 실행 순서를 제거했다.
- Package release 순서를 `mydocs/manual/npm_release_guide.md` 한 곳으로 이동하고 framework `release_update_protocol.md`와 구분했다.
- Preflight는 README에 release command가 다시 들어오면 실패하고 guide의 필수 단계가 빠져도 실패한다.
- 기존 tag 존재 확인에 더해 strict mode에서 version tag가 HEAD를 가리키는지 확인하도록 보강했다.
- CI와 publish workflow는 account login/network가 필요 없는 help/version smoke를 공통으로 실행한다.

## 본문 변경 정도 / 본문 무손실 여부

- README는 v0.1.0 local analyzer 설명과 운영 runbook을 보존하지 않고 v0.2.0 사용자 문서로 의도적으로 전면 재작성했다.
- 기존 release 순서의 핵심 통제 항목은 삭제하지 않고 maintainer 전용 `npm_release_guide.md`로 이동했다.
- Account Usage Contract의 runtime field, type, null, date semantics와 machine-readable schema는 변경하지 않았다. 설명 언어와 downstream link만 보정했다.
- CI/publish의 test, package dry-run, Trusted Publishing OIDC 설정은 보존하고 account access가 필요했던 smoke만 교체했다.
- Historical `mydocs` task 기록의 legacy 설명은 이 단계에서도 수정하지 않았다.

## 검증 결과

실행 명령:

```bash
npm test
npm pack --dry-run --json
npm run release:preflight
node bin/codex-usage-analyzer.js --help
node bin/codex-usage-analyzer.js --version
node -e '<account-usage schema JSON parse>'
node --input-type=module -e '<public Markdown local-link validator>'
rg -n "Quick start|Supported metrics|Requirements|Privacy|Security|Troubleshooting|SDK|Contributing|Support|License|affiliated" README.md
rg -n "npm version|npm publish|git tag|Publish Package|npm audit signatures|GitHub Release" README.md
rg -n "npm version|npm publish|git tag|Publish Package|npm audit signatures|GitHub Release" mydocs/manual/npm_release_guide.md
rg -n "GitHub identity|submit token|render|cache|delete|identity-free|experimental" docs/downstream-integration.md
rg -n "UsageSnapshot v2|UsageSnapshotV2|analyzeUsage|fixture-sample|profile-baseline|session_jsonl" README.md package.json src scripts docs .github
git diff --check
```

결과:

| 검증 | 결과 | 근거 |
|---|---|---|
| Full test suite | OK | 34 tests, 34 pass, fail 0 |
| CLI no-auth smoke | OK | help와 version 0.2.0 출력, account access 없음 |
| JSON Schema | OK | Draft-07 schema JSON parse 성공 |
| Public Markdown local link | OK | README 포함 6개 문서의 상대 link 모두 존재 |
| README heading/value flow | OK | 사용자 흐름의 필수 section match 확인 |
| README release operation boundary | OK | 운영 command와 GitHub Release 표현 match 없음 |
| Maintainer release guide | OK | version, tag, Publish Package, signature, GitHub Release 순서 match 확인 |
| Downstream responsibility | OK | identity, token, render/cache/delete, experimental boundary match 확인 |
| Active product legacy scan | OK | README, package, runtime, scripts, docs, workflow match 없음 |
| Package dry run | OK | 16 entries, 약 15.0 kB package; 공개 runtime/types/docs만 포함 |
| Advisory release preflight | OK | registry/version, 34 tests, tarball, CI/publish, guide, 11-file sensitive scan 통과 |
| Diff hygiene | OK | whitespace/error 출력 없음 |

Advisory preflight의 working tree와 `v0.2.0` tag 항목은 현재 task branch 단계에서 예상되는 WARN이다. FAIL은 없었고 exit code는 0이었다. npm cache 접근이 필요한 package/preflight 명령은 승인된 normal user environment에서 실행했으며 cache ownership은 변경하지 않았다.

## 잔여 위험

- npm의 `@latest`는 v0.2.0 publish 전까지 기존 release를 가리키므로 실제 published quick start 검증은 release 이후에만 가능하다.
- 실제 로그인된 Codex app-server의 human/JSON path와 local package `npx` resolution은 Stage 4에서 raw usage를 출력하지 않는 structural validator로 확인해야 한다.
- Node 20/24 runtime과 GitHub-hosted workflow 실행은 Stage 4 및 PR CI에서 확인해야 한다.
- GitHub image proxy cache 갱신 시간은 downstream이 통제할 수 없으므로 integration guide도 즉시 갱신을 보장하지 않는다.
- Experimental profile identity envelope는 설계 경계만 명시했으며 이 package에는 구현하지 않았다.

## 다음 단계 영향

- Stage 4 package 기준은 16 entries와 새 public docs/runtime allowlist다.
- Live account usage 검증은 JSON을 terminal/file에 남기지 않고 contract version, summary key set, bucket kind만 출력하는 validator에 직접 pipe한다.
- Local `npx --package .`와 Node 20에서 test/bin resolution을 확인한다.
- Full active product legacy scan, credential API scan, package denylist, sensitive pattern scan을 최종 반복한다.
- PR 전까지 tag, npm publish, GitHub Release는 수행하지 않는다.

## 승인 요청

- Stage 3 사용자/downstream/security/release 문서와 automation 검증 결과를 승인하면 Stage 4 `End-to-end package와 npx 검증`으로 진행한다.

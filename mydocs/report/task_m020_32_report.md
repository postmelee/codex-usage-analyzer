# Task M020 #32 최종 보고서

GitHub Issue: [#32](https://github.com/postmelee/codex-usage-analyzer/issues/32)
마일스톤: M020

## 작업 요약

- 대상 이슈: #32
- 마일스톤: M020
- 단계 수: 4
- 작업 목적: v0.1.0 local analyzer를 제거하고 official Codex app-server `account/usage/read` 기반 dependency-free v0.2.0 thin CLI/SDK로 재구성한다.

사용자는 `npx codex-usage-analyzer`로 human account usage summary를 확인하고 `--json`으로 identity-free versioned contract를 받을 수 있다. Package는 Codex subprocess에 현재 sign-in context를 위임하며 auth file, keychain, token, local session을 직접 읽지 않는다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `src/app-server-client.js` | stable initialize handshake, `account/usage/read`, timeout/cleanup, safe RPC error를 구현했다. | Codex subprocess와 protocol boundary |
| `src/account-usage.js` | summary 5개와 daily bucket을 allowlist/validate하고 contract version과 timestamp를 부여한다. | Public JSON/SDK contract |
| `src/errors.js` | 고정 error code/message로 raw upstream detail을 차단한다. | CLI/SDK failure contract |
| `src/format-account-usage.js` | token, duration, streak, bucket의 deterministic human formatter를 제공한다. | Default CLI output |
| `src/cli.js`, `bin/`, `src/index.*` | no-arg/`usage`, `--json`, help/version과 exact SDK/type export로 전환했다. | Public CLI와 JavaScript/TypeScript API |
| `src/__tests__/**` | fake app-server transport, contract/schema, CLI, formatter, export/package test 34개로 재구성했다. | Offline regression coverage |
| removed parser/snapshot/fixture/profile files | local session parser, asset/skill/plugin aggregate, sample snapshot, profile baseline/smoke를 제거했다. | v0.1.0 breaking removal과 privacy/maintenance 축소 |
| `docs/account-usage-contract.md`, schema | contract version 1의 field, type, null/date, forward compatibility를 고정했다. | Downstream machine/human contract |
| `docs/downstream-integration.md` | GitHub identity, submit token, validation/storage, rendering/cache, privacy/delete, experimental adapter 책임을 분리했다. | Downstream integration boundary |
| `README.md` | user-first quick start, metric, requirement, CLI/SDK, privacy/security, troubleshooting, support/license로 전면 재작성했다. | npm/GitHub 사용자 진입점 |
| `CONTRIBUTING.md`, `SECURITY.md` | issue-first contribution과 private vulnerability reporting 기준을 추가했다. | Contributor와 security support |
| `package.json` | version 0.2.0, account usage description/keywords, 16-file artifact allowlist로 전환했다. | npm metadata와 package contents |
| CI/publish/preflight | no-auth smoke, Trusted Publishing 유지, artifact/guide/tag/sensitive 검사를 새 surface에 맞췄다. | CI/CD와 release safety |
| `mydocs/manual/npm_release_guide.md` | version부터 tag, publish, registry/npx/signature, GitHub Release 순서를 README에서 이동했다. | Maintainer-only release operation |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| 사용자 진입점 | root | `README.md` | OK | npm과 GitHub 첫 화면에 quick start와 public boundary를 배치했다. |
| Account Usage Contract | `docs/` | `docs/account-usage-contract.md` | OK | 상세 field/null semantics를 README와 분리했다. |
| Machine-readable schema | `docs/` | `docs/account-usage.schema.json` | OK | 외부 validator가 runtime import 없이 사용할 수 있다. |
| Downstream integration | `docs/` | `docs/downstream-integration.md` | OK | CLI contract와 identity/rendering 책임을 분리했다. |
| Contribution policy | root | `CONTRIBUTING.md` | OK | GitHub 표준 발견 위치를 사용했다. |
| Security policy | root | `SECURITY.md` | OK | GitHub private reporting 진입점을 표준 위치에 제공한다. |
| npm release guide | `mydocs/manual/` | `mydocs/manual/npm_release_guide.md` | OK | 사용자 사용법과 maintainer 권한 절차를 분리했다. |
| Task artifacts | `mydocs/` 표준 폴더 | plans/working/report/orders | OK | 제품 문서와 내부 이력을 분리했다. |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| Package version | 0.1.0 | 0.2.0 |
| `src` file 수 | 40 | 12 |
| `src/__tests__` file 수 | 24 | 5 |
| parser/snapshot/sample fixture file 수 | 11 | 0 |
| Runtime dependency | 0 | 0 |
| Current full test | v0.1.0 local analyzer suite | v0.2.0 34/34 pass |
| Node 20 compatibility | 기존 suite 기준 | v0.2.0 34/34 pass |
| npm dry-run artifact | local parser/snapshot/sample 포함 | 16 entries, 15,372 bytes, forbidden 0 |
| 전체 task diff | 해당 없음 | 69 files, +3,163 / -5,331 lines |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| Stable app-server protocol order | OK — fake transport가 initialize result 이후 initialized notification과 usage request 순서를 검증했다. |
| Process/error safety | OK — spawn, early exit, timeout, malformed protocol, RPC failure가 safe error로 정규화되고 child cleanup test가 통과했다. |
| Contract allowlist/null/date semantics | OK — runtime, test, Markdown contract, JSON Schema, TypeScript declaration이 summary 5개와 daily bucket semantics에 일치한다. |
| CLI/SDK surface | OK — no-arg/`usage`, JSON, help/version, exact root export와 error redaction 34-test suite가 통과했다. |
| Legacy active product 제거 | OK — README, package, source, script, docs, workflow zero-match이며 historical `mydocs`만 보존했다. |
| Credential/privacy boundary | OK — publish runtime에서 auth/keychain/token/private endpoint 직접 접근 pattern 0건, live output raw value 미기록, sensitive scan 11 files 통과다. |
| Public/downstream/security docs | OK — 수행계획서 위치와 실제 산출물이 일치하고 public Markdown local link가 모두 해석된다. |
| Package artifact | OK — 16 entries, package 15,372 bytes, unpacked 47,494 bytes, internal/test/removed file 0, tarball residue 0이다. |
| Runtime compatibility | OK — Node 24.15.0과 Node 20 runner에서 각각 34/34 pass다. |
| Official live app-server | OK — human/JSON path의 key/type/label/timestamp 구조를 값 미출력 validator로 확인했고 stderr는 비어 있었다. |
| Local npx package | OK — `npx --package .` bin resolution과 live JSON structural validation이 통과했다. |
| Release preflight | OK — registry보다 높은 local version, clean tree, test/package/workflow/guide/sensitive check가 통과했다. Tag 미생성은 advisory WARN이다. |
| Diff/worktree hygiene | OK — `git diff --check` 통과, 최종 보고 작성 전 worktree clean이다. |

### 단계별 검증 결과

- Stage 1: [`task_m020_32_stage1.md`](../working/task_m020_32_stage1.md) — contract, app-server transport, safe error/cleanup과 focused test를 완료했다.
- Stage 2: [`task_m020_32_stage2.md`](../working/task_m020_32_stage2.md) — v0.2.0 CLI/SDK/package 전환과 v0.1.0 active runtime 제거를 완료했다.
- Stage 3: [`task_m020_32_stage3.md`](../working/task_m020_32_stage3.md) — public/downstream/security/release 문서와 CI/preflight를 새 boundary로 재구성했다.
- Stage 4: [`task_m020_32_stage4.md`](../working/task_m020_32_stage4.md) — Node 20/24, live app-server, local npx, tarball, privacy scan을 완료했다.

## Breaking change와 호환성

- v0.1.0의 `analyze` command, local Codex home option, sample fixture mode는 제거됐다.
- v0.1.0 SDK의 local analyzer, sample producer, snapshot validator/schema export는 제거됐다.
- v0.2.0은 no-arg 또는 `usage`와 `--json`만 지원하고 SDK root는 `readAccountUsage`, error, package/contract constants를 제공한다.
- Downstream은 `contractVersion: 1`을 확인하고 summary nullable integer와 daily bucket null/array 차이를 보존해야 한다.
- API-key-only와 Bedrock auth는 official account usage method 지원 대상이 아니다.

## 잔여 위험과 후속 작업

### 잔여 위험

- GitHub-hosted CI는 PR 게시 후 원격 check에서 확인해야 한다.
- npm `@latest`는 v0.2.0 publish 전까지 0.1.0을 가리키므로 published npx는 merge 이후 release 단계에서 검증해야 한다.
- `v0.2.0` tag가 아직 없어 strict release-ready preflight는 실행하지 않았다.
- 오래된 Codex CLI나 upstream contract 변화는 fixed safe error를 만들 수 있다. 새 upstream field 지원은 별도 contract review가 필요하다.
- README card/image cache refresh와 GitHub identity는 downstream 책임이며 이 package가 구현하지 않는다.

### 후속 작업 후보

- #32 merge 후 `npm_release_guide.md` 순서에 따라 별도 승인된 v0.2.0 tag, Trusted Publishing, registry/signature/published npx, GitHub Release를 진행한다.
- Downstream service는 `docs/downstream-integration.md`의 identity-free submit contract와 GitHub identity/storage/render/cache/delete 경계를 구현한다.
- Private profile identity adapter가 계속 필요하면 default CLI와 분리된 opt-in experimental issue로 등록하고 authorization에 사용하지 않는다.

## 작업지시자 승인 요청

- 최종 보고서와 수용 기준 검증 결과를 승인하면 `publish/task32` push와 `main` 대상 Open PR을 게시한다.

# Task M040 #46 최종 보고서

GitHub Issue: [#46](https://github.com/postmelee/codex-usage-analyzer/issues/46)
마일스톤: M040

## 작업 요약

- 대상 이슈: #46
- 마일스톤: M040
- 단계 수: 4
- 작업 목적: 기본 Account Usage 경로와 stable SDK를 유지하면서 명시적 `profile` command에만 unsupported Codex Full Profile 조회를 격리하고, versioned envelope와 사람용 출력을 제공한다.

Task #46의 구현 범위는 완료했다. 인자 없음, `usage`, `--json`, `usage --json`은 공식 `account/usage/read`와 identity-free Account Usage Contract v1을 계속 사용한다. 새 `profile`과 `profile --json`은 별도 experimental client, Full Profile Envelope v1과 renderer를 사용하며 public JavaScript SDK에는 export하지 않는다.

Profile transport는 설치된 Codex app-server에서 얻은 인증 context를 dedicated child와 요청 수명 안에서만 사용한다. 고정 HTTPS target, manual redirect, no retry, timeout과 1 MiB response limit을 적용하고 token, account identifier, raw response와 upstream detail을 output, log, fixture 또는 package에 포함하지 않는다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `src/experimental-profile.js` | Full Profile Envelope allowlist, status/null 의미와 percentage normalization 구현 | Experimental machine contract |
| `src/experimental-profile-client.js` | 격리된 app-server auth와 fixed private profile request 구현 | Experimental transport/security |
| `src/format-experimental-profile.js` | Profile, canonical Usage, 52주 token activity와 activity/invocation 출력 구현 | Human CLI output |
| `src/cli.js` | 명시적 `profile [--json]`, warning과 exit matrix 추가 | CLI surface |
| `src/__tests__/experimental-profile*.test.js` | Envelope, transport, failure/redaction과 drift normalization 검증 | Contract/security regression |
| `src/__tests__/format-experimental-profile.test.js` | Human section과 52주 heatmap 경계 검증 | Renderer regression |
| `src/__tests__/cli.test.js` | Stable usage 비호출 회귀와 profile stdout/stderr/exit 검증 | CLI regression |
| `src/__tests__/index.test.js` | Public SDK surface, zero dependency와 package allowlist 검증 | Package/SDK regression |
| `docs/experimental-full-profile.schema.json` | `additionalProperties: false`인 Full Profile Envelope v1 schema 추가 | Experimental consumer contract |
| `docs/experimental-full-profile.md` | CLI, field, status/exit, privacy, drift와 downstream 정책 문서화 | User/consumer documentation |
| `README.md` | 기존 상단 소개를 보존하고 opt-in experimental profile 사용법과 경고 추가 | Public documentation |
| `docs/account-usage-contract.md` | Stable v1 무변경과 별도 Full Profile cross-link 추가 | Stable contract documentation |
| `docs/downstream-integration.md` | GitHub ownership, untrusted remote identity와 activity opt-in 정책 확정 | Downstream integration |
| `package.json` | Experimental runtime 세 파일을 npm allowlist에 추가 | Published artifact |
| `scripts/release-preflight.js` | zero dependency, required/forbidden artifact와 sensitive scan 강화 | Release security gate |
| `mydocs/plans/task_m040_46*.md` | 승인된 범위, 4개 Stage와 live smoke gate 기록 | Internal plan |
| `mydocs/working/task_m040_46_stage{1,2,3,4}.md` | 단계별 구현·검증·잔여 위험 기록 | Internal verification history |
| `mydocs/orders/20260713.md` | Task #46 완료 상태와 완료 시각 기록 | 오늘할일 보드 |
| `mydocs/report/task_m040_46_report.md` | 수용 기준과 최종 결과 기록 | Internal final report |

`src/index.js`, `src/index.d.ts`, `src/account-usage.js`, `src/format-account-usage.js`, `src/app-server-client.js`와 `docs/account-usage.schema.json`은 변경하지 않았다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| 사용자 명령과 위험 고지 | `README.md` | `README.md` | OK | 기존 identity-free 소개 아래에 experimental 절을 분리 |
| Full Profile 설명 | `docs/experimental-full-profile.md` | 동일 | OK | CLI machine contract와 보안 경계의 public 진실 원천 |
| Full Profile Schema | `docs/experimental-full-profile.schema.json` | 동일 | OK | Runtime key/null/status와 schema test 일치 |
| Stable usage cross-link | `docs/account-usage-contract.md` | 동일 | OK | v1 shape 변경 없이 별도 envelope만 연결 |
| Downstream 실험 경계 | `docs/downstream-integration.md` | 동일 | OK | GitHub identity ownership 원칙과 experimental 소비 조건 분리 |
| 단계/최종 보고 | `mydocs/working`, `mydocs/report` | 동일 | OK | M040 #46 표준 파일명과 내부 검증 이력 사용 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| 전체 regression test | 55개 | 116/116 pass |
| Experimental profile command | 없음 | `profile`, `profile --json` 2개 mode |
| Full Profile machine contract | 없음 | Envelope v1 + JSON Schema 1개 |
| npm `files` allowlist | 13개 path | 16개 path |
| npm dry-run artifact | 18개 파일 baseline | 23개 파일, 약 29.1 kB |
| Runtime dependency | 0개 | 0개 |
| 승인된 live structural probe | 0회 | 2회, 최종 `status: ok` |
| Stable SDK/Account Usage schema 변경 | 0개 | 0개 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 기본 실행과 `--json`의 공식 usage 동작 유지 | OK - stable action이 experimental dependency를 호출하지 않는 회귀 test와 `main` 대비 stable source/schema diff zero 확인 |
| `profile` 명시 시에만 원격 identity 조회 | OK - parser/action injection과 help/invalid/version의 no-access test 통과 |
| `profile --json`의 versioned envelope | OK - required root key, `additionalProperties: false`, runtime/schema alignment와 JSON parse test 통과 |
| Warning/diagnostic의 stderr 분리 | OK - profile warning 정확히 1회, JSON stdout 오염 없음, upstream detail redaction 검증 |
| Human Profile/Usage/map/activity/invocation 출력 | OK - section order, avatar URL 억제, UTC Sunday-start 52주 heatmap과 invocation prefix 검증 |
| Partial/unavailable와 exit code | OK - `ok`/`partial`/`unavailable` 및 0/0/1, official usage failure의 no-envelope matrix 검증 |
| Credential/raw response 비지속 | OK - direct auth source/file write/logging pattern 없음, package와 task artifact에 token/account/raw response 없음 |
| 공식·비공식 안정성 경계 문서화 | OK - README, Full Profile contract, stable usage contract와 downstream guide에서 unsupported/no-fallback/identity 경계 명시 |
| 전체 자동 회귀 | OK - 116 pass, fail/cancelled/skipped/todo 0 |
| Package/release 보안 | OK - 23개 artifact, runtime dependency 0, required/forbidden path와 sensitive pattern 17개 파일 검사 통과 |
| 승인된 실제 구조 호환성 | OK - 최종 probe가 `status: ok`와 identity/summary/token activity/activity insight/top invocation parity true 반환; actual value와 raw response는 기록하지 않음 |
| PR CI/CodeQL | PENDING - PR 게시 후 GitHub checks에서 확인 |

최종 advisory preflight의 working tree, test, package, CI/publish workflow, release guide와 sensitive scan은 통과했다. Local `0.3.0`이 registry `0.3.0`보다 높지 않고 `v0.3.0` tag가 현재 HEAD를 가리키지 않는 두 경고는 예상된 post-merge release gate이며 Task #46 구현 실패가 아니다.

### 단계별 검증 결과

- Stage 1: [`task_m040_46_stage1.md`](../working/task_m040_46_stage1.md) - Envelope/schema와 synthetic normalizer, focused 24개 및 full 65개 통과
- Stage 2: [`task_m040_46_stage2.md`](../working/task_m040_46_stage2.md) - 격리 transport, redaction/failure 경계, focused 66개 및 full 102개 통과
- Stage 3: [`task_m040_46_stage3.md`](../working/task_m040_46_stage3.md) - Profile CLI/renderer와 52주 map, focused 34개 및 full 115개 통과
- Stage 4: [`task_m040_46_stage4.md`](../working/task_m040_46_stage4.md) - Public docs/package/security, full 116개와 승인 live structural parity 통과

## 잔여 위험과 후속 작업

### 잔여 위험

- `/wham/profiles/me`와 internal auth method는 unsupported private contract이므로 backend/app-server drift 시 별도 release 없이 `partial`, `unavailable` 또는 safe error가 발생할 수 있다.
- JavaScript token memory zeroization은 보장하지 않는다. Dedicated child와 local reference lifetime을 최소화하지만 process compromise까지 방어하는 기능은 아니다.
- Experimental Full Profile은 identity, avatar source, plan, activity와 invocation name을 포함할 수 있다. Downstream은 별도 opt-in/privacy policy, untrusted input 검증과 avatar re-host 경계를 적용해야 한다.
- Public JavaScript SDK에는 의도적으로 Full Profile을 export하지 않는다. Consumer는 CLI `profile --json`과 별도 schema의 experimental 안정성 정책을 수용해야 한다.
- PR CI/CodeQL과 merge SHA는 PR 게시·merge 전이므로 아직 확정되지 않았다.

### 후속 작업 후보

- PR merge 후 Issue #46 close와 `pr-merge-cleanup` 수행
- 별도 release task에서 `0.4.0` version bump, release-ready preflight, tag, Trusted Publishing과 GitHub Release 순서 수행
- npm publish 후 package README, `npx ... profile --help`, signature/provenance와 registry artifact 검증
- Private endpoint drift 발생 시 stable usage와 분리된 experimental compatibility 이슈로 추적

## 작업지시자 승인 요청

- Stage 4 승인에 따라 이 최종 보고서를 기준으로 `publish/task46` PR을 게시한다.
- PR에는 Issue #46 자동 close keyword를 넣지 않고, CI 확인과 merge 후 cleanup 절차에서 이슈를 닫는다.
- 실제 npm publish와 GitHub Release는 이 PR에 포함하지 않고 별도 release task 승인 후 진행한다.

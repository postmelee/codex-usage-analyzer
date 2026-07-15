# Task M040 #46 Stage 3 완료보고서

GitHub Issue: [#46](https://github.com/postmelee/codex-usage-analyzer/issues/46)
구현계획서: [`task_m040_46_impl.md`](../plans/task_m040_46_impl.md)
Stage: 3

## 단계 목적

기존 default/`usage` CLI와 stable SDK를 변경하지 않고, 명시적 `profile`과 `profile --json` action을 Stage 2 transport에 연결한다. Profile action에만 unsupported endpoint와 identity 출력 위험을 고지하고, Full Profile Envelope status에 따른 stdout/stderr/exit code를 고정한다. Human output에는 canonical usage 기반 52주 token activity map과 allowlisted profile/activity/invocation만 표시한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/cli.js` | 112줄. `profile [--json]`, profile help, warning, status/exit matrix와 profile action에서만 동작하는 experimental transport/renderer dynamic import를 추가했다. |
| `src/__tests__/cli.test.js` | 294줄. Stable usage 회귀, experimental dependency 비호출, help/invalid 무접근, warning 1회, JSON 순수성, status/exit와 safe error를 검증했다. |
| `src/format-experimental-profile.js` | 183줄. Profile, stable usage, 52주 ASCII token activity, activity insight와 invocation을 순서대로 표시하는 human renderer를 추가했다. |
| `src/__tests__/format-experimental-profile.test.js` | 192줄. 출력 순서, avatar URL 억제, Sunday 경계, 52주 clipping, 상대 intensity, 중복 날짜, future/null/empty, partial과 prefix 표현을 검증했다. |

## 본문 변경 정도 / 본문 무손실 여부

기존 인자 없음, `usage`, `--json`, `usage --json`, help/version과 safe error 동작은 보존했다. `src/index.js`, `src/index.d.ts`, `src/account-usage.js`, `src/format-account-usage.js`, `docs/account-usage.schema.json`은 수정하지 않았다. Experimental transport와 renderer는 static import하지 않으며 parser가 `profile` action을 반환한 경우에만 dynamic import한다.

`profile`과 `profile --json`은 호출 전에 stderr에 동일한 experimental warning을 정확히 한 번 출력한다. JSON stdout에는 Full Profile Envelope 한 개만 출력한다. `ok`/`partial`은 exit 0, `unavailable`은 envelope 출력 후 exit 1, official usage 실패는 envelope 없이 기존 safe error와 exit 1을 반환한다. Help/invalid/version은 app-server나 experimental dependency를 호출하지 않는다.

Human output은 avatar URL을 출력하지 않고 availability만 표시한다. Usage section은 기존 `formatAccountUsage()` 결과를 그대로 재사용한다. Token activity는 canonical `usage.dailyUsageBuckets`만 사용하며 `usage.capturedAt`의 UTC 날짜가 속한 Sunday-start week까지 52주를 표시한다. 같은 날짜는 합산하고 safe integer를 넘으면 포화하며, 상대 intensity 0~4, 미래 날짜 공백, null `Unavailable`, 빈 배열 `No activity recorded`를 구분한다. Top invocation은 source 순서를 유지하고 skill `$`, plugin `@` prefix를 presentation에서만 붙인다.

## 검증 결과

실행 명령:

```bash
node --test src/__tests__/cli.test.js src/__tests__/format-experimental-profile.test.js src/__tests__/format-account-usage.test.js src/__tests__/experimental-profile.test.js
npm test
node bin/codex-usage-analyzer.js --help
node bin/codex-usage-analyzer.js --version
git diff --exit-code HEAD -- src/index.js src/index.d.ts src/account-usage.js src/format-account-usage.js docs/account-usage.schema.json
git diff --check
```

결과:

- OK: Stage 3 focused test 34개가 통과했고 fail/cancelled/skipped/todo는 0이었다.
- OK: 전체 회귀 test 115개가 모두 통과했고 fail/cancelled/skipped/todo는 0이었다.
- OK: 인자 없음·`usage`·stable JSON은 experimental reader를 호출하지 않고 기존 stdout/stderr/exit 의미를 유지했다.
- OK: `profile`, `profile --json`, `profile --help`/`-h`, duplicate/conflicting/unknown flag 행렬을 검증했다.
- OK: Profile warning은 실행 action에서만 stderr에 한 번 출력되고 JSON stdout에는 포함되지 않았다.
- OK: `ok`/`partial`/`unavailable` status와 0/0/1 exit code, official failure의 no-envelope safe error를 검증했다.
- OK: Human section 순서, identity null 처리, avatar URL 억제, stable Usage formatter 재사용과 invocation prefix/source order를 검증했다.
- OK: Token activity는 52자 고정 week axis, Sunday boundary, oldest/current week, out-of-window와 future clipping, duplicate 합산, intensity 0~4, null/empty를 구분했다.
- OK: 실제 bin help에는 `profile [--json]  (experimental)`이 표시되고 version은 `0.3.0`을 유지했다. 두 경로 모두 account access 없이 종료했다.
- OK: Stable SDK export/declaration, Account Usage source/formatter/schema diff가 없었다.
- OK: CLI/renderer에 logging, file/auth source 접근 금지 패턴이 없었고 `git diff --check`가 통과했다.

## 잔여 위험

- `package.json` artifact allowlist는 아직 experimental client, normalizer, renderer를 포함하지 않는다. Source tree에서는 동작하지만 npm package 산출물의 `profile` command 완성은 Stage 4 package 검증 전까지 보장하지 않는다.
- Private endpoint와 실제 profile payload에 대한 live smoke는 수행하지 않았다. 운영 호환성과 실제 `ok`/`partial` 결과는 Stage 4의 별도 승인된 structural smoke까지 남아 있다.
- ASCII heatmap은 의도적으로 terminal width를 감지하지 않는 고정 폭이다. 매우 좁은 terminal에서는 visual wrapping이 발생할 수 있으나 데이터나 열 수를 암묵적으로 줄이지 않는다.
- Relative intensity와 UTC/Sunday/52주/duplicate 정책은 구현과 test에서 고정됐지만 사용자 문서는 Stage 4에서 추가해야 한다.

## 다음 단계 영향

- Stage 4는 README와 `docs/experimental-full-profile.md`에 명령, warning, status/exit, identity와 unsupported endpoint 위험, heatmap 기준을 정확히 문서화해야 한다.
- `package.json` files allowlist에 CLI가 runtime에서 요구하는 experimental client/normalizer/renderer를 모두 포함하고 `npm pack --dry-run`에서 검증해야 한다.
- Stable Account Usage Contract와 downstream 문서는 Full Profile Envelope가 별도 experimental 계약이며 기본 submit/SDK 계약이 아님을 명시해야 한다.
- Live structural smoke는 작업지시자의 별도 승인 후에만 실행하고 실제 token, account identifier, identity, raw response를 문서·로그·보고서에 남기지 않아야 한다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 Stage 4 공식 문서, package artifact와 통합 보안 검증으로 진행한다.

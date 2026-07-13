# Task M040 #46 Stage 2 완료보고서

GitHub Issue: [#46](https://github.com/postmelee/codex-usage-analyzer/issues/46)
구현계획서: [`task_m040_46_impl.md`](../plans/task_m040_46_impl.md)
Stage: 2

## 단계 목적

기존 Account Usage transport를 변경하지 않고, 명시적 experimental profile command만 사용할 격리된 app-server session과 private profile HTTP transport를 구현한다. Official `account/usage/read` 결과를 canonical usage로 유지하면서 internal auth credential의 참조 수명과 전달 대상을 최소화하고, endpoint·method·header category·timeout·body size·redirect 정책을 고정해 실패 시 raw detail 없이 `unavailable`로 안전하게 축소한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/experimental-profile-client.js` | 544줄. Profile 전용 one-child app-server session, official usage/account metadata와 internal auth context 수집, fixed HTTPS profile request, timeout·1 MiB body limit·manual redirect·strict JSON/UTF-8 검증, child/stream/timer 정리를 구현했다. |
| `src/__tests__/experimental-profile-client.test.js` | 604줄. 합성 child와 fetch만 사용해 protocol 순서, fixed request, optional account metadata, credential/claim 경계, process failure, timeout, HTTP/body failure, no-retry와 secret redaction을 검증했다. |

Stage 시작 시 현재 설치된 app-server generated protocol에서 official `account/usage/read`, official `account/read`의 non-refresh params와 ChatGPT plan category, internal `getAuthStatus`의 token 포함·non-refresh params와 auth method category를 재확인했다. 이를 근거로 Desktop client를 사칭하지 않는 package originator/User-Agent를 사용했으며, endpoint 호환성을 확인하기 위한 실제 인증·네트워크 호출은 수행하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

Stage 2는 신규 experimental client와 focused test만 추가했다. 기존 `src/app-server-client.js`, 대응 test, `src/index.js`, `src/index.d.ts`, `docs/account-usage.schema.json`은 수정하지 않았다. 따라서 기본 CLI와 stable Account Usage SDK/schema의 transport, export, 오류 의미는 보존된다.

Profile transport는 caller가 URL, method, bearer, account header를 주입할 수 없도록 fixed target을 module 내부에 둔다. 요청은 GET, `redirect: "manual"`, `credentials: "omit"`, JSON Accept와 고정 originator/User-Agent만 사용하고 retry하지 않는다. App-server stderr, RPC/HTTP error detail, email, token, account identifier와 decoded JWT claim은 envelope와 오류에 포함하지 않는다. JavaScript memory zeroization을 주장하지 않으며, 필요한 값은 remote request가 끝날 때까지의 local reference로만 제한한다.

## 검증 결과

실행 명령:

```bash
node --test src/__tests__/experimental-profile-client.test.js src/__tests__/experimental-profile.test.js src/__tests__/app-server-client.test.js src/__tests__/codex-executable.test.js
git diff --exit-code HEAD -- src/app-server-client.js src/__tests__/app-server-client.test.js src/index.js src/index.d.ts docs/account-usage.schema.json
rg -n 'redirect: "manual"|account/usage/read|wham/profiles/me|1_048_576|app-server' src/experimental-profile-client.js
if rg -n 'console\.(log|error)|writeFile|appendFile|createWriteStream|keychain|Cookies|auth\.json|process\.env.*TOKEN' src/experimental-profile*.js; then exit 1; fi
git diff --check
npm test
```

결과:

- OK: Stage 2 focused test 66개가 통과했고 fail/cancelled/skipped/todo는 0이었다.
- OK: 전체 회귀 test는 102개 모두 통과했고 fail/cancelled/skipped/todo는 0이었다.
- OK: 한 child에서 initialize 이후 official usage, account metadata, internal auth request를 bounded ID로 처리하고 모든 성공·실패·timeout fixture에서 child를 정리했다.
- OK: resolver/spawn/exit/protocol/RPC failure와 optional context timeout을 raw upstream detail 없이 구분했다.
- OK: token은 compact JWT 형식과 길이를 제한하고 account claim은 길이·padding·control character를 제한했다. Invalid auth context에서는 fetch call count가 0이었다.
- OK: remote request는 fixed URL/GET, manual redirect, omitted credentials, fixed header category와 no-retry를 assertion했다.
- OK: redirect, auth denial, rate limit, server error, wrong content type, malformed/non-object JSON, invalid UTF-8, oversized declared/streamed body와 request timeout을 `unavailable`로 축소했다.
- OK: synthetic token, account identifier, email과 upstream error marker가 envelope 또는 safe error에 포함되지 않았다.
- OK: stable app-server client/test, SDK export/declaration과 Account Usage Schema diff가 없었다.
- OK: forbidden logging/file/auth-source pattern 검색 결과가 없었고 `git diff --check`가 통과했다.
- OK: protocol 분석용 임시 생성물은 검증 후 삭제했다.

## 잔여 위험

- `/wham/profiles/me`와 internal auth method는 공식 안정 계약이 아니므로 Codex/app-server 또는 backend 변경 시 동작이 중단될 수 있다. 현재 구현은 이 경우 canonical usage를 보존한 `unavailable`로 실패하도록 설계했다.
- Honest package originator/User-Agent가 private endpoint에서 허용되는지는 실제 계정으로 확인하지 않았다. 실패하더라도 별도 승인 없이 Desktop 식별자 사칭이나 alternate endpoint fallback을 추가하지 않는다.
- 실제 payload의 현재 field와 Stage 1 allowlist 정합성, auth reference가 운영 실행에서 output/log에 노출되지 않는지는 Stage 4의 별도 승인된 live structural smoke까지 남아 있다.
- 아직 CLI parser와 renderer에 연결되지 않았으므로 package 사용자는 experimental transport를 호출할 수 없다.

## 다음 단계 영향

- Stage 3은 `profile` token이 명시된 경우에만 `readExperimentalProfile()`을 호출하고 default/`usage` 경로에서는 experimental module을 호출하지 않아야 한다.
- `profile --json`은 Full Profile Envelope만 stdout에 출력하고 경고는 stderr에 한 번 출력해야 한다. `unavailable`은 envelope 출력 후 exit 1, official usage 실패는 기존 safe error와 exit 1을 유지한다.
- Human renderer는 avatar URL을 출력하지 않고 availability만 표시하며, heatmap은 private stats가 아닌 nested canonical `usage.dailyUsageBuckets`만 사용해야 한다.
- Stable SDK root export와 Account Usage formatter/schema는 Stage 3에서도 명시적으로 변경하지 않는다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3 Profile CLI와 terminal renderer 구현으로 진행한다.

# Task M040 #46 Stage 1 완료보고서

GitHub Issue: [#46](https://github.com/postmelee/codex-usage-analyzer/issues/46)
구현계획서: [`task_m040_46_impl.md`](../plans/task_m040_46_impl.md)
Stage: 1

## 단계 목적

기존 Account Usage Contract v1을 변경하지 않고, 명시적 experimental profile command가 사용할 별도 Full Profile Envelope v1의 runtime normalizer와 machine-readable JSON Schema를 확정한다. 실제 계정 payload 대신 synthetic fixture만 사용해 allowlist reconstruction, canonical official usage, `ok`/`partial`/`unavailable`, null/empty semantics를 고정한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/experimental-profile.js` | 425줄. Full Profile 상수와 field set, stable usage 재구성, flat private profile response allowlist, status/null semantics, bounded identity/activity/invocation normalizer를 구현했다. |
| `src/__tests__/experimental-profile.test.js` | 393줄. complete/partial/unavailable, stable usage 보존, unknown field 폐기, null/empty invocation, malformed stats/usage, size/URL/control-character 경계를 다루는 10개 top-level test를 추가했다. |
| `docs/experimental-full-profile.schema.json` | 307줄. 별도 version/kind/stability/status와 nested Account Usage, profile, activity, invocation의 `additionalProperties: false` Schema를 추가했다. |

Stage 구현 직전 최신 Desktop bundle에서 raw response가 `stats.summary` 중첩이 아니라 flat `stats` field임을 재확인했다. 소스 변경 전 구현계획서 한 줄을 실제 관찰 구조로 보정하고 `6211314 Task #46: 구현계획서 보정` 커밋으로 분리했다. 출력 계약과 Stage 분할은 변경하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

Stage 1은 신규 experimental internal module, focused test, machine-readable schema만 추가했다. 기존 `src/index.js`, `src/index.d.ts`, `docs/account-usage.schema.json`, CLI, app-server client, Account Usage normalizer/formatter, README와 package allowlist는 수정하지 않았다.

Full Profile normalizer는 private response object를 pass-through하지 않는다. Profile identity 네 field와 activity 일곱 field, invocation 세 field만 새 object로 구성한다. Private summary/daily 값은 remote completeness 판단에만 쓰고 envelope `usage`에는 공식 Account Usage 문서를 exact field set으로 재구성해 넣는다. Email, account/user/plugin/skill id, unknown root field, private stats 값은 output에서 폐기한다.

## 검증 결과

실행 명령:

```bash
node --test src/__tests__/account-usage.test.js src/__tests__/experimental-profile.test.js
node -e 'const fs=require("node:fs");const s=JSON.parse(fs.readFileSync("docs/experimental-full-profile.schema.json","utf8"));const required=["fullProfileContractVersion","kind","stability","status","usage","profile","activityInsights"];if(required.some((key)=>!s.required.includes(key))||s.additionalProperties!==false)process.exit(1)'
git diff --exit-code HEAD -- src/index.js src/index.d.ts docs/account-usage.schema.json
git diff --check
npm test
```

결과:

- OK: Stage 1 focused test 24개가 통과했고 fail/cancelled/skipped/todo는 0이었다.
- OK: 전체 회귀 test는 기존 55개에서 65개로 늘었고 65개 모두 통과했다.
- OK: Schema root required field와 `additionalProperties: false` 검증이 통과했다.
- OK: stable SDK export/declaration과 Account Usage Schema diff가 없었다.
- OK: complete response는 `ok`, stats error/누락/invalid field는 `partial`, remote root 부재는 `unavailable`로 고정했다.
- OK: unavailable invocation `null`과 available-empty `[]`를 구분했다.
- OK: private summary/daily 값, email, account/plugin/skill id와 unknown field가 output에 포함되지 않았다.
- OK: canonical usage timestamp는 기존 normalizer가 생성하는 exact UTC ISO string만 허용한다.
- OK: `git diff --check`는 whitespace error 없이 통과했다.

## 잔여 위험

- JSON Schema와 normalizer는 합성 fixture 기준이며 아직 실제 app-server/auth/HTTP transport에 연결되지 않았다.
- Private endpoint field가 drift하면 Stage 2 transport 성공 후에도 Stage 1 normalizer가 `partial` 또는 `unavailable`로 처리할 수 있다. 이는 의도한 안전 실패지만 actual current payload 구조 검증은 Stage 4 별도 승인 smoke까지 남아 있다.
- Full Profile Schema는 이번 Stage에서 source tree에만 존재하며 npm package allowlist 포함 여부는 Stage 4에서 검증한다.
- `profile` 명령과 public documentation이 아직 없으므로 사용자가 신규 module을 package CLI에서 호출할 수 없다.

## 다음 단계 영향

- Stage 2는 stable `src/app-server-client.js`를 수정하지 않고 `src/experimental-profile-client.js`에 one-child experimental session을 구현한다.
- Stage 2 transport는 official usage response를 기존 normalizer에 전달하고 private response/account plan type만 Stage 1 normalizer 입력으로 넘겨야 한다.
- Internal token, account context, raw JWT claim, HTTP body/error는 Stage 1 normalizer 또는 envelope에 전달하지 않는다.
- Current protocol evidence가 #30과 다르면 method/header를 추측하지 않고 구현을 중단해 계획 변경 승인을 요청한다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2 격리된 app-server auth와 private profile transport 구현으로 진행한다.

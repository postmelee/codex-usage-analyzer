# Account Usage Contract

`codex-usage-analyzer --json`과 JavaScript `readAccountUsage()`는 동일한 Account Usage Contract를 반환한다. 현재 contract version은 `1`이다.

이 계약은 Codex app-server의 공식 `account/usage/read` 결과를 downstream에서 안정적으로 소비할 수 있도록 최소한으로 정규화한다. 이름, 사용자명, 아바타, 이메일, account identifier, 인증 정보는 포함하지 않는다.

Machine-readable 기준은 [`account-usage.schema.json`](account-usage.schema.json)이다.

## Shape

```json
{
  "contractVersion": 1,
  "capturedAt": "2026-07-11T00:00:00.000Z",
  "summary": {
    "lifetimeTokens": 1234567,
    "peakDailyTokens": 45678,
    "longestRunningTurnSec": 540,
    "currentStreakDays": 8,
    "longestStreakDays": 14
  },
  "dailyUsageBuckets": [
    {
      "startDate": "2026-07-10",
      "tokens": 12345
    }
  ]
}
```

예시 값은 synthetic data이며 실제 계정 값을 나타내지 않는다.

## Root fields

| Field | Type | 의미 |
|---|---|---|
| `contractVersion` | integer, constant `1` | 이 패키지가 제공하는 downstream contract version |
| `capturedAt` | ISO 8601 UTC string | app-server response를 받은 시각 |
| `summary` | object | account-level token/activity summary |
| `dailyUsageBuckets` | array 또는 `null` | 일별 token bucket. `null`은 upstream 미제공을 의미한다. |

## Summary fields

모든 summary field는 항상 존재한다. 값은 non-negative safe integer 또는 `null`이다.

| Field | 의미 |
|---|---|
| `lifetimeTokens` | 누적 token 사용량 |
| `peakDailyTokens` | 일일 최대 token 사용량 |
| `longestRunningTurnSec` | 가장 오래 실행된 turn의 초 단위 duration |
| `currentStreakDays` | 현재 연속 사용 일수 |
| `longestStreakDays` | 최장 연속 사용 일수 |

Upstream이 metric을 생략하거나 `null`로 반환하면 wrapper는 `null`을 유지한다. `null`은 0이 아니며 downstream은 unavailable로 처리해야 한다.

## Daily buckets

- `dailyUsageBuckets: null`: upstream이 bucket을 제공하지 않았다.
- `dailyUsageBuckets: []`: bucket source는 제공됐지만 row가 없다.
- 각 row는 `startDate`와 `tokens`만 포함한다.
- `startDate`는 `YYYY-MM-DD` date-only string이다. Downstream은 timezone rebucketing 없이 이 값을 source date로 취급한다.
- `tokens`는 non-negative safe integer다.

## Forward compatibility

Wrapper는 allowlist field만 출력한다. App-server가 새 field를 추가해도 contract version 1 output에는 자동으로 포함하지 않는다. 기존 field의 의미나 root shape를 바꾸는 작업은 새로운 contract version과 consumer impact review가 필요하다.

## Privacy boundary

이 계약에는 다음 값을 넣지 않는다.

- display name, username, avatar
- email 또는 account identifier
- access/refresh token, cookie, credential path
- local Codex session content와 local filesystem path
- raw app-server stderr 또는 RPC error message

Identity, submit token, storage, card rendering은 downstream integration의 별도 책임이다.

## Upstream

- [OpenAI Codex App Server](https://developers.openai.com/codex/app-server)
- Method: `account/usage/read`
- API-key-only와 Bedrock auth는 이 method의 지원 대상이 아니다.

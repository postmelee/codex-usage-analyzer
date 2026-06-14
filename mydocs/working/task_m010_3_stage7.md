# Task M010 #3 Stage 7 완료보고서

GitHub Issue: [#3](https://github.com/postmelee/codex-usage-analyzer/issues/3)
마일스톤: M010

## 단계 목적

Codex Desktop profile의 streak와 local session JSONL analyzer의 streak가 같은 값이라고 보장할 수 없음을 출력 계약과 사용자 문서에 명시한다. 원격 profile API 호출은 기본 analyzer 동작에 넣지 않고, local-only 산식과 parity 미보장을 diagnostic으로 고정한다.

## 변경 요약

- `src/analyze.js`
  - `extensions["codexUsageAnalyzer.diagnostics"].profileComparison`을 추가했다.
  - remote profile comparison은 수행하지 않았고, parity는 보장하지 않는다고 명시했다.
- `src/parser/activity-aggregate.js`
  - activity diagnostic에 streak date basis를 추가했다.
  - local session JSONL의 positive `last_token_usage`를 UTC date로 집계한다는 기준을 명시했다.
- `src/index.d.ts`
  - public SDK 주석을 현재 production parser 동작에 맞게 갱신했다.
- `src/__tests__/analyze.test.js`
  - unavailable snapshot과 parser fixture snapshot 모두에서 profile comparison diagnostic을 검증한다.
- `src/__tests__/parser-activity.test.js`
  - activity aggregate diagnostic의 streak 산식과 profile parity 값을 검증한다.
- `README.md`
  - Codex Desktop profile과 analyzer streak가 달라질 수 있는 이유를 사용자 문서에 추가했다.
  - internal Codex Desktop profile API 호출은 non-goal로 명시했다.

## 판단 기록

- 현재 analyzer가 직접 확인 가능한 입력은 local Codex session JSONL이다.
- Codex Desktop profile은 remote profile data를 기준으로 표시되며, account-level usage, 다른 기기 사용량, 또는 로컬 cleanup 이후 남지 않은 기록을 포함할 수 있다.
- 사용자가 제공한 tooltip 비교와 local source 검증은 특정 날짜의 local session source 누락 가능성을 강하게 시사하지만, remote profile API가 접근 불가능한 상태에서는 동일 산식 재현을 보장할 수 없다.
- 따라서 이번 Stage에서는 profile 값을 맞추기 위해 local output을 보정하지 않고, 출력의 의미와 한계를 명시하는 방향을 선택했다.

## 검증 결과

```bash
npm test
```

결과: 18개 테스트 통과.

```bash
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser
```

결과: fixture parser output이 `UsageSnapshot v2`로 생성되며 `profileComparison.parity: "not_guaranteed"`와 activity streak basis diagnostic이 포함됨을 확인했다.

```bash
git diff --check
```

결과: 통과.

## Privacy 확인

- Stage 문서에 사용자 account identifier, raw local absolute path, credential, raw JSONL line, prompt, response를 기록하지 않았다.
- snapshot diagnostic에는 raw path, raw line, session id, prompt/response 원문을 추가하지 않았다.
- remote profile API 호출, credential read, third-party CLI 실행을 새 기본 동작으로 추가하지 않았다.

## 결론

Stage 7 범위는 완료됐다. 현재 구현은 Codex Desktop profile clone이 아니라 local-only analyzer이며, remote profile parity 미보장 상태를 output diagnostic과 README에서 명확히 표시한다.

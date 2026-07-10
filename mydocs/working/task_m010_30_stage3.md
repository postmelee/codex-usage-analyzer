# Task M010 #30 Stage 3 완료보고서

GitHub Issue: [#30](https://github.com/postmelee/codex-usage-analyzer/issues/30)
구현계획서: [`task_m010_30_impl.md`](../plans/task_m010_30_impl.md)
Stage: 3

## 단계 목적

Stage 1-2의 정적 분석과 승인된 direct-call 결과를 바탕으로 remote profile의 profile parity, latency, 보안 경계를 최종 판단한다. 또한 조사 이후 공식화된 Codex app-server `account/usage/read`를 비공식 `/wham/profiles/me`와 분리해 후속 M020 아키텍처에 전달한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m010_30_stage3.md` | 공식 account usage 경로 검증, 최종 feasibility 판단, 후속 작업 경계를 정리했다. |
| `mydocs/report/task_m010_30_report.md` | #30 전체 결과와 수용 기준을 장기 보관용으로 요약했다. |
| `mydocs/orders/20260705.md` | #30을 완료 처리했다. |

## 새 공식 경로 확인

2026-07-11 기준 OpenAI의 Codex App Server 문서는 `account/usage/read`를 ChatGPT account token activity summary와 optional daily bucket을 읽는 JSON-RPC 메서드로 명시한다.

- app-server 연결은 `initialize` 요청과 `initialized` notification 이후 사용할 수 있다.
- 응답은 `summary`와 `dailyUsageBuckets`를 제공한다.
- summary에는 lifetime token, peak daily token, longest running turn, current streak, longest streak 범주가 포함된다.
- summary 값과 daily bucket 전체는 service 상태에 따라 `null`일 수 있다.
- ChatGPT, externally managed ChatGPT token, agent identity, personal access token auth가 지원되고 API-key-only와 Bedrock auth는 지원되지 않는다.
- 출처: <https://developers.openai.com/codex/app-server>

이 메서드는 Codex app-server가 기존 로그인 수명주기를 소유하므로 npm package가 auth file, keychain 또는 bearer token을 직접 읽을 이유가 없다. 따라서 #30에서 조사한 internal auth method와 `/wham` 직접 호출은 account usage 수집에 더 이상 필요하지 않다.

## Safe live verification

현재 설치된 `codex app-server`를 stdio transport로 시작하고 공개 handshake 뒤 `account/usage/read`를 한 번 호출했다. probe는 원시 수치, bucket 내용, 계정 정보, token, local path를 출력하거나 저장하지 않고 필드 이름과 값의 타입만 확인했다.

| 검증 | 결과 |
|---|---|
| app-server initialize | 성공 |
| `account/usage/read` | 성공 |
| summary field set | 공식 문서의 5개 범주 확인 |
| summary value kind | number 또는 null 계약과 일치 |
| daily usage | array 또는 null 계약과 일치 |
| credential 접근 | package/probe가 auth file과 keychain을 직접 읽지 않음 |
| no persistence | raw response와 account identifier를 저장하지 않음 |

## Parity와 latency 프로토콜

후속 구현에서 account usage의 profile parity와 latency는 다음처럼 검증한다.

| 대상 | 비교 기준 | 허용 결과 |
|---|---|---|
| summary 5개 범주 | 동일 시점 Codex profile 표시값 | 표시 반올림 전 정수 기준 동일하거나 UI 반올림 범위 내 |
| daily buckets | `startDate`와 token 정수 | upstream 배열을 재집계하지 않고 그대로 전달 |
| unavailable metric | upstream `null` | 0으로 변환하지 않고 `null` 유지 |
| latency | app-server 시작부터 응답까지 | bounded timeout 안에 완료; timeout은 안전한 오류 코드로 종료 |
| identity/profile | `/wham/profiles/me` | 기본 account usage 계약에서 비교하지 않음 |

## 최종 feasibility 판단

| 경로 | 결론 | 이유 |
|---|---|---|
| 공식 `account/usage/read` | M020에서 기본 thin CLI source로 채택 | 공개 app-server 계약이며 package가 credential을 직접 취급하지 않는다. |
| `/wham/profiles/me` usage 수치 | `reject_for_default_analyzer` | 공식 usage 메서드가 존재하므로 비공식 endpoint를 기본 source로 사용할 이유가 없다. |
| `/wham/profiles/me` identity | `adopt_experimental` 후보 | display name, username, avatar가 꼭 필요한 별도 기능에서만 명시적 opt-in과 격리된 adapter로 검토할 수 있다. |
| internal auth method 직접 사용 | `reject_for_default_analyzer` | public schema 밖의 method이며 credential이 package memory를 통과한다. |
| experimental identity 구현 시점 | `defer_pending_evidence` | M020 core 전환과 downstream GitHub identity 계약이 먼저다. |

`adopt_experimental`은 비공식 profile identity adapter에만 적용한다. 사용량 수집은 experimental 경로가 아니라 공식 app-server thin wrapper로 전환한다.

## Guardrail

- app-server subprocess와 stdio JSON-RPC 외에 auth file, keychain, token claim을 직접 읽지 않는다.
- app-server stderr를 그대로 사용자 출력이나 downstream payload에 포함하지 않는다.
- raw response logging, retry dump, debug token 출력 기능을 만들지 않는다.
- `dailyUsageBuckets: null`과 빈 배열을 구분한다.
- upstream metric의 `null`을 0으로 바꾸지 않는다.
- 기본 payload에는 이름, username, avatar, email, account identifier를 넣지 않는다.
- 비공식 identity adapter는 별도 이슈와 별도 consent surface 없이는 구현하지 않는다.

## 본문 변경 정도 / 본문 무손실 여부

문서-only 변경이다. #30의 기존 조사 기록은 보존했고, 이후 공개된 공식 app-server 계약을 최종 판단에 추가했다. runtime code, README, package metadata와 기존 schema는 수정하지 않았다.

## 검증 결과

실행 명령:

```bash
npm test
node /private/tmp/cua-account-usage-probe.mjs
rg -n "profile parity|latency|adopt_experimental|defer_pending_evidence|reject_for_default_analyzer|guardrail|no persistence" mydocs/working/task_m010_30_stage3.md mydocs/report/task_m010_30_report.md
rg -n "live probe|credential|keychain|raw response|mock|schema drift" mydocs/working/task_m010_30_stage*.md mydocs/report/task_m010_30_report.md
rg -n -f /private/tmp/cua-task30-sensitive-patterns.txt mydocs/plans/task_m010_30*.md mydocs/working/task_m010_30_stage*.md mydocs/report/task_m010_30_report.md
git diff --check
```

결과:

- OK: 기존 test 47개 통과.
- OK: 공식 app-server account usage live probe 성공. field/type category만 확인했다.
- OK: final decision keyword와 credential boundary가 문서화됐다.
- OK: runtime/user-facing 파일 변경 없음.
- OK: 민감정보 pattern scan과 `git diff --check` 통과.

## 잔여 위험

- app-server 버전이 오래되면 `account/usage/read`를 지원하지 않을 수 있다.
- 사용자가 API key 또는 Bedrock으로만 인증한 환경에서는 공식 usage 요청이 실패한다.
- `/wham/profiles/me` identity는 여전히 비공식 계약이므로 별도 adapter에서도 drift를 정상 실패로 처리해야 한다.

## 다음 단계 영향

- M020에서는 기존 local analyzer를 유지한 채 source만 추가하지 않고, 공개 계약을 소비하는 thin CLI로 교체한다.
- M020 계약 문서와 JSON Schema를 먼저 확정해 downstream 이미지 프로젝트가 병렬 개발할 수 있게 한다.
- experimental identity adapter는 M020 core와 분리한다.

## 승인 요청

- Stage 3 산출물과 최종 판단을 승인하면 #30 PR 게시와 M020 전환 작업으로 진행한다.

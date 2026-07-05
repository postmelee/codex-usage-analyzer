# Task M010 #30 Stage 1 완료보고서

GitHub Issue: [#30](https://github.com/postmelee/codex-usage-analyzer/issues/30)
구현계획서: [`task_m010_30_impl.md`](../plans/task_m010_30_impl.md)
Stage: 1

## 단계 목적

Stage 1은 remote Codex profile command feasibility를 판단하기 전에 source와 credential boundary를 분리하는 단계다. 이번 단계에서는 공개 GitHub source와 현재 저장소의 local analyzer contract만 확인했다.

실제 Codex auth file, keychain, live profile endpoint, raw profile response는 읽거나 호출하지 않았다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m010_30_stage1.md` | 공개 source 조사 결과, endpoint/auth 후보 boundary, Stage 2 handoff를 정리했다. |

## 본문 변경 정도 / 본문 무손실 여부

문서-only 변경이다. `README.md`, `src/**`, `package.json`, `UsageSnapshot v2` schema는 수정하지 않았다. 공개 source 조회 결과는 raw dump가 아니라 line-level 근거와 safe summary로만 기록했다.

## 조사 결과

### 공개 `openai/codex` source 검색

2026-07-05 기준 GitHub code search에서 `repo:openai/codex` 대상 다음 검색은 직접 hit가 없었다.

| 검색 | 결과 | 판단 |
|---|---:|---|
| `profiles/me` | 0 | 현재 공개 source에서 remote profile endpoint 문자열을 직접 확인하지 못했다. |
| `wham` | 0 | 현재 공개 source에서 ChatGPT backend `wham` path를 직접 확인하지 못했다. |
| `token_usage` | 0 | 현재 공개 source에서 token usage profile 함수명을 직접 확인하지 못했다. |
| `profile` | 0 | 검색 index 기준 직접 hit 없음. |

이 결과는 remote profile endpoint가 존재하지 않는다는 증명이 아니다. 다만 #30 Stage 1 기준으로는 공개 `openai/codex` source에 의존해 stable contract를 확인할 수 없으므로, remote profile endpoint 후보는 `remote_only_or_internal`로 유지한다.

### `tokscale` reference 분리

`junhoyeo/tokscale` 공개 source는 Codex 관련 처리를 두 경계로 분리한다.

| 경계 | 공개 source 근거 | 판단 |
|---|---|---|
| local session analyzer | `crates/tokscale-core/src/sessions/codex.rs`는 `~/.codex/sessions/` JSONL을 parse한다고 설명하고, `token_count`, `last_token_usage`, `total_token_usage`, fork/subagent replay, headless usage fallback을 다룬다. | local analyzer 참고 가능. #16 계열 local parser 개선과 유사한 영역이다. |
| local scan roots | `crates/tokscale-core/src/scanner.rs`는 Codex root로 `CODEX_HOME` 또는 `~/.codex`를 사용하고 `sessions`와 `archived_sessions`를 스캔한다. | local-only source coverage 참고 가능. |
| remote account usage command | `crates/tokscale-cli/src/commands/usage/codex.rs`는 Codex credential category를 읽고 ChatGPT backend usage/rate-limit/reset-credit endpoint를 호출한다. | credential/remote boundary가 필요하다. 기본 analyzer source로 쓰면 안 된다. |

`tokscale`의 remote usage command는 구현 전례이지만, local session analyzer와 같은 신뢰 경계가 아니다. 우리 패키지가 참고할 수 있는 것은 "remote 기능을 별도 command로 분리한다"는 구조적 분리이며, default analyzer에 credential-backed remote call을 넣는 근거는 아니다.

### 현재 저장소 local analyzer boundary

현재 저장소는 다음 contract를 이미 갖고 있다.

| 영역 | 확인 내용 | Stage 1 판단 |
|---|---|---|
| CLI surface | `src/cli.js`는 `analyze --json`, `--codex-home`, `--fixture-sample`만 허용한다. | remote command를 추가하려면 명시적 별도 command/flag 설계가 필요하다. |
| analyzer diagnostics | `src/analyze.js`는 `profileComparison.status: "not_performed"`, `reason: "remote_profile_api_not_used"`, `parity: "not_guaranteed"`를 기록한다. | local analyzer가 remote profile API를 호출하지 않는 현재 contract가 명확하다. |
| README contract | README는 Desktop profile이 remote account-level source일 수 있고 analyzer가 remote profile/plugin-store API를 호출하지 않는다고 설명한다. | #30에서 기본 README contract를 깨지 않으려면 opt-in experimental 분리가 필요하다. |
| profile smoke helper | baseline은 수동 redacted profile value와 local snapshot 비교용이다. | remote live fetch가 아니라 safe comparison helper다. |

## Boundary matrix

| 후보 | Source visibility | Auth requirement | Data sensitivity | Default analyzer 적합성 | Experimental command 후보성 |
|---|---|---|---|---|---|
| local session JSONL | local/public pattern | 없음 | session-derived usage, local metadata risk | 적합 | 해당 없음 |
| archived session JSONL | local/public pattern | 없음 | historical local usage dedup risk | #16 후보 | 해당 없음 |
| `tokscale` local parser approach | public source | 없음 | source code only | 참고 가능 | 참고 가능 |
| `tokscale` remote usage approach | public source | Codex credential category 필요 | account usage/rate-limit data, credential risk | 부적합 | 구조 참고 가능 |
| `/api/codex/profiles/me` 계열 | 현재 공개 source direct hit 없음 | credential 필요 가능성 높음 | account-level profile data | 부적합 | 별도 승인 후 검토 후보 |
| `/wham/profiles/me` 계열 | 현재 공개 source direct hit 없음 | credential 필요 가능성 높음 | account-level profile data | 부적합 | 별도 승인 후 검토 후보 |
| ChatGPT backend usage/rate-limit path | `tokscale` source에서 확인 | credential 필요 | account usage/rate-limit data | 부적합 | `profiles/me` 대체가 아니라 boundary 참고 |

## Stage 2 handoff

Stage 2는 command/probe 설계를 다룬다. Stage 1 결과를 기준으로 Stage 2에서 지켜야 할 조건은 다음과 같다.

- 기본 `analyze --json` 경로는 변경하지 않는다.
- remote profile command 후보는 `experimental`, `opt-in`, `non-default`, `no persistence`를 전제로 설계한다.
- credential source는 값이 아니라 category로만 다룬다.
- live remote call은 Stage 2 보고서에서 필요성과 승인 요청이 분리되기 전까지 수행하지 않는다.
- mock fixture는 실제 raw response를 기반으로 만들지 않는다.
- `tokscale`는 local parser 참고와 remote boundary 참고로만 사용한다.

## 검증 결과

실행 명령:

```bash
gh search code 'repo:openai/codex profiles/me' --json path,repository,sha,url
gh search code 'repo:openai/codex wham' --json path,repository,sha,url
gh search code 'repo:openai/codex token_usage' --json path,repository,sha,url
gh search code 'repo:openai/codex profile' --json path,repository,sha,url
gh search code 'repo:junhoyeo/tokscale backend-api/wham usage' --json path,repository,sha,url
gh search code 'repo:junhoyeo/tokscale backend-api' --json path,repository,sha,url
gh search code 'repo:junhoyeo/tokscale rate-limit-reset-credits' --json path,repository,sha,url
gh api repos/junhoyeo/tokscale/contents/crates/tokscale-cli/src/commands/usage/codex.rs --jq .content | base64 -d | rg -n "backend-api|wham|auth\\.openai|CODEX_HOME|keychain|access_token|refresh_token|fetch_usage|fetch_reset|consume_reset|current_auth_paths|read_current_credentials"
gh api repos/junhoyeo/tokscale/contents/crates/tokscale-core/src/sessions/codex.rs --jq .content | base64 -d | rg -n "Parses JSONL|~/.codex/sessions|token_count|last_token_usage|total_token_usage|parse_codex_file|parse_codex_file_incremental|turn.completed|forked|session_meta|turn_context"
gh api repos/junhoyeo/tokscale/contents/crates/tokscale-core/src/scanner.rs --jq .content | base64 -d | rg -n "Codex:|CODEX_HOME|codex_home|\\.codex/sessions|archived_sessions|ClientId::Codex|headless"
rg -n "profileComparison|remote_profile_api_not_used|sourcePolicy|profile_parity_not_guaranteed" README.md src scripts mydocs/report/task_m010_15_report.md
rg -n "credential|keychain|auth|raw response|remote_only|non-default|experimental" mydocs/working/task_m010_30_stage1.md
rg -n -f /private/tmp/cua-task30-sensitive-patterns.txt mydocs/plans/task_m010_30*.md mydocs/working/task_m010_30_stage1.md
git diff --check
```

결과:

- OK: `openai/codex` 공개 code search에서 `profiles/me`, `wham`, `token_usage`, `profile` 직접 hit 없음.
- OK: `tokscale` 직접 source 조회에서 local session parser와 remote usage command가 별도 경계임을 확인했다.
- OK: 현재 저장소 scan에서 analyzer가 remote profile API를 호출하지 않는 diagnostics/README contract가 확인됐다.
- OK: Stage 1 보고서에 boundary keyword가 존재한다.
- OK: task 전용 민감정보 pattern scan match 없음.
- OK: `git diff --check` 통과.

## 잔여 위험

- GitHub code search와 public source 조회는 현재 공개 index 기준이다. private/internal app bundle이나 production service route 존재 여부를 증명하지 않는다.
- `tokscale` source는 remote usage/rate-limit path 전례를 보여주지만, profile UI endpoint parity를 보장하지 않는다.
- Stage 1은 live remote probe를 수행하지 않았으므로 profile parity나 latency를 실제로 측정하지 않았다.

## 다음 단계 영향

- Stage 2는 implementation보다 command/probe 설계와 mockability를 먼저 확정해야 한다.
- Stage 2에서 live remote probe가 필요하다고 판단되면, endpoint 후보, credential source category, redacted output shape, 중단 조건을 포함한 별도 승인 요청을 먼저 올려야 한다.
- 현재 결론만으로 default analyzer에 remote call을 추가하면 안 된다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2 `experimental command/probe 설계와 mock 검증 전략`으로 진행한다.

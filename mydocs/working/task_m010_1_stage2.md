# Task M010 #1 Stage 2 완료보고서

GitHub Issue: [#1](https://github.com/postmelee/codex-usage-analyzer/issues/1)
구현계획서: [`task_m010_1_impl.md`](../plans/task_m010_1_impl.md)
Stage: 2

## 단계 목적

Stage 2의 목적은 로컬 Codex 데이터 후보를 파일, DB, 로그, 캐시, asset, 원격 API 후보로 분류하고, parser 구현 전에 source별 접근 조건과 privacy 위험을 정리하는 것이다. 실제 parser 구현, 원본 로그 분석, credential 파일 내용 확인은 범위에서 제외했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/tech/task_m010_1_codex_data_source_inventory.md` | Stage 2 로컬 데이터 후보 inventory, 관찰한 schema metadata, 필드 후보별 source 판단을 추가했다. |
| `mydocs/working/task_m010_1_stage2.md` | Stage 2 완료보고서 신규 작성. 검증 결과, 잔여 위험, 다음 단계 영향, 승인 요청을 기록했다. |

## 본문 변경 정도 / 본문 무손실 여부

코드와 README는 수정하지 않았다. 기존 Stage 1 기술 조사 노트에 Stage 2 섹션을 추가했다. `<codex-home>` 아래의 파일명, 디렉터리 구조, SQLite schema, JSONL key schema만 확인했으며 실제 local absolute path, credential 값, 계정 식별자 원문, raw session/log body는 문서에 남기지 않았다.

## 검증 결과

실행 명령:

```bash
find . -maxdepth 3 -type f
find . -maxdepth 2 -type d
ls -la
sqlite3 logs_2.sqlite .schema
sqlite3 state_5.sqlite .schema
sqlite3 sqlite/codex-dev.db .tables
sqlite3 state_5.sqlite "SELECT count(*) AS rows, count(DISTINCT model) AS distinct_models, count(DISTINCT reasoning_effort) AS distinct_reasoning_efforts, count(DISTINCT model_provider) AS distinct_model_providers FROM threads;"
sqlite3 state_5.sqlite "SELECT count(*) AS rows, count(DISTINCT name) AS distinct_tool_names, count(DISTINCT namespace) AS distinct_tool_namespaces FROM thread_dynamic_tools;"
node -e "{JSONL key schema sampler}"
find pets -maxdepth 2 -type f
git diff --check
grep -nE "{local-path-patterns}" mydocs/tech/task_m010_1_codex_data_source_inventory.md
grep -nE "{credential-patterns}" mydocs/tech/task_m010_1_codex_data_source_inventory.md
grep -nE "{sample-account-patterns}" mydocs/tech/task_m010_1_codex_data_source_inventory.md
```

결과:

- OK: 파일/디렉터리 metadata 확인. `<codex-home>` 아래에 state/log SQLite DB, session JSONL, archived session JSONL, cache/plugin/skill directories, generated image directory, pets directory 후보가 있음을 확인했다.
- OK: SQLite schema 확인. `state_5.sqlite.threads`에 token/model/reasoning/timestamp 관련 컬럼이 있고, `thread_dynamic_tools`에 dynamic tool metadata 컬럼이 있음을 확인했다. row value는 문서에 기록하지 않았다.
- OK: JSONL key schema 확인. session JSONL은 top-level `type`, `timestamp`, `payload` 구조이며 payload에는 model/effort/duration/dynamic tool 관련 key와 private content 관련 key가 함께 있음을 확인했다. payload value는 문서에 기록하지 않았다.
- OK: `auth.json`, `config.toml`, 원본 session content, stdout/stderr, log body는 열람하거나 문서화하지 않았다.
- OK: `git diff --check` 경고 없음.
- OK: Stage 2 기술 조사 노트 대상 privacy grep 결과 없음.

## 잔여 위험

- `state_5.sqlite.threads.tokens_used`가 Codex profile의 total token 기준과 정확히 같은지는 아직 확정하지 않았다.
- session JSONL에 token breakdown numeric field가 있는지 Stage 2 schema만으로 확정하지 못했다.
- `thread_dynamic_tools`는 실제 invocation count가 아니라 thread별 enabled/available tool metadata일 수 있다.
- active session과 archived session 중복 제거 기준이 아직 없다.
- avatar/pet asset source는 local metadata만으로 확정하지 못했다.

## 다음 단계 영향

- Stage 3에서는 `state_5.sqlite`를 core usage/activity/model 1순위 후보로 두고 필드별 mapping을 확정한다.
- Stage 3에서는 session JSONL을 token breakdown, model detail, skill/plugin invocation 후보로 보되, raw payload가 아니라 allowlisted numeric/metadata field만 사용할 수 있는지 판단한다.
- Stage 3에서는 unavailable/null policy와 follow-up issue를 필드별로 채운다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3 필드별 mapping과 fallback 정책 확정으로 진행한다.

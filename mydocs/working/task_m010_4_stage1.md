# Task M010 #4 Stage 1 완료보고서

GitHub Issue: [#4](https://github.com/postmelee/codex-usage-analyzer/issues/4)
구현계획서: [`task_m010_4_impl.md`](../plans/task_m010_4_impl.md)
Stage: 1

## 단계 목적

Stage 1은 topSkills/topPlugins parser를 구현하기 전에 local session JSONL에서 actual invocation으로 볼 수 있는 source와 catalog/enabled metadata를 분리하고, Stage 2가 사용할 synthetic fixture contract를 고정하는 단계다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/plans/task_m010_4.md` | #4 전용 skill/plugin fixture root를 예상 변경 파일에 반영했다. |
| `mydocs/plans/task_m010_4_impl.md` | Stage 1 산출물을 별도 skill/plugin fixture root 기준으로 갱신했다. |
| `src/__tests__/fixtures/parser/README.md` | #3 core parser fixture와 #4 skill/plugin fixture가 분리됨을 명시했다. |
| `src/__tests__/fixtures/skill-plugin/README.md` | skill/plugin parser fixture contract와 allowlisted fields를 추가했다. |
| `src/__tests__/fixtures/skill-plugin/sessions/2026/06/13/invocations.jsonl` | catalog-matched skill/plugin invocation, namespaced dynamic request, unclassified call, tie-break case를 담은 synthetic fixture를 추가했다. |

## 본문 변경 정도 / 본문 무손실 여부

기존 core parser fixture JSONL은 수정하지 않았다. #3에서 고정한 token/model/activity regression count를 보존하기 위해 #4 전용 fixture root를 새로 만들었다.

문서 변경은 기존 계획의 Stage 1 산출물 경로를 구체화하는 수준이다. 수행계획서의 핵심 범위, 제외 항목, 검증 기준은 유지했다.

## Source Contract 판단

schema-only scan으로 local session JSONL의 event type, payload type, key path, value type 분포만 확인했다. raw prompt, response, tool input/output, path, credential, account identifier, tool 이름 목록은 문서화하지 않았다.

확인한 source 계층:

| source | 판단 | Stage 2 적용 |
|---|---|---|
| `session_meta.payload.dynamic_tools[]` | catalog/enabled metadata다. `name`, `namespace`, `description`, `inputSchema` 계열 key가 있으나 presence만으로 usage를 의미하지 않는다. | usage count로 직접 사용하지 않는다. 같은 session의 actual call name과 매칭될 때 classification 보조 정보로만 사용한다. |
| `response_item/function_call` | actual call event 후보다. `payload.name`을 가진다. | catalog match가 있으면 classified invocation으로 사용한다. match가 없으면 unknown/unclassified diagnostic으로만 센다. |
| `response_item/custom_tool_call` | actual call event 후보다. `payload.name`을 가진다. | `function_call`과 같은 규칙으로 처리한다. |
| `event_msg/dynamic_tool_call_request` | actual dynamic tool request 후보다. `payload.tool`, `payload.namespace`를 가진다. | namespace 또는 catalog match가 있으면 classified invocation으로 사용한다. response event는 중복 counting 방지를 위해 기본 count source로 쓰지 않는다. |
| `event_msg/mcp_tool_call_end` | actual MCP tool call event 후보다. `invocation.server/tool`을 가진다. | Codex profile의 skills/plugins와 직접 같은 의미인지 불명확하므로 Stage 2 기본 ranking에서는 제외하고 diagnostic 후보로 둔다. |

현재 local source에서는 Codex Desktop profile에 표시된 project HWF skill names가 structured call/catalog field로 확인되지 않았다. 따라서 profile parity를 맞추기 위한 보정은 하지 않고, local structured source 기준의 conservative ranking을 구현하는 방향을 유지한다.

Stage 2 분류 규칙:

- catalog/enabled list만으로 usage count를 올리지 않는다.
- actual call event만 invocation count 후보가 된다.
- actual call name이 같은 session의 `dynamic_tools[]` catalog와 매칭되고 catalog item에 `namespace`가 없으면 skill로 분류한다.
- actual call name이 같은 session의 `dynamic_tools[]` catalog와 매칭되고 catalog item에 `namespace`가 있으면 plugin으로 분류한다.
- `dynamic_tool_call_request`에 `namespace`가 있으면 plugin으로 분류한다.
- classification 근거가 없으면 ranking에서 제외하고 unclassified diagnostic으로 센다.
- name/path/content/description/input/output/raw payload는 snapshot diagnostic에 넣지 않는다.

## 검증 결과

실행 명령:

```bash
npm test
rg -n "/Users/|/home/|/private/var/|access_token|refresh_token|Bearer |sk-|github_pat_" src/__tests__/fixtures/parser src/__tests__/fixtures/skill-plugin
git diff --check
```

결과:

- `npm test`: OK, 18개 테스트 통과.
- fixture privacy review: OK, privacy pattern match 없음. `rg`는 match가 없어 exit 1을 반환했다.
- `git diff --check`: OK, 출력 없음.

## 잔여 위험

- local structured source는 Codex Desktop remote profile의 `top_invocations`와 동일하지 않을 수 있다.
- catalog match가 희소한 환경에서는 skills/plugins ranking이 비어 있거나 partial로 남을 수 있다.
- MCP tool call을 plugin으로 볼 수 있는지는 아직 확정하지 않았다. 이번 task에서는 기본 ranking source에서 제외한다.

## 다음 단계 영향

- Stage 2는 `src/__tests__/fixtures/skill-plugin/`을 별도 fixture root로 사용해 aggregate unit test를 작성한다.
- Stage 2 normalizer는 actual call과 catalog metadata를 같은 file/session scope에서 조인해야 한다.
- Stage 2 diagnostic에는 unclassified actual call count를 포함해야 한다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2 skill/plugin aggregate 구현으로 진행한다.

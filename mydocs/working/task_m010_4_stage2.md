# Task M010 #4 Stage 2 완료보고서

GitHub Issue: [#4](https://github.com/postmelee/codex-usage-analyzer/issues/4)
구현계획서: [`task_m010_4_impl.md`](../plans/task_m010_4_impl.md)
Stage: 2

## 단계 목적

Stage 2는 Stage 1에서 확정한 source contract를 코드로 구현해, local session JSONL의 actual invocation event를 skill/plugin ranking으로 집계하는 aggregate module을 추가하는 단계다. Production `analyzeUsage()` 통합은 Stage 3 범위로 남겼다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/parser/session-jsonl.js` | `session_meta.payload.dynamic_tools[]` catalog normalizer와 actual invocation normalizer를 추가했다. |
| `src/parser/skill-plugin-aggregate.js` | skill/plugin ranking aggregate, classification, deterministic sort, unavailable diagnostic을 구현했다. |
| `src/__tests__/parser-skill-plugin.test.js` | fixture 기반 ranking 결과와 missing source unavailable fallback을 검증한다. |
| `mydocs/working/task_m010_4_stage2.md` | Stage 2 구현과 검증 결과를 기록했다. |

## 본문 변경 정도 / 본문 무손실 여부

기존 token/model/activity parser 동작은 변경하지 않았다. `session-jsonl`에는 raw payload를 반환하지 않는 allowlist normalizer만 추가했다.

새 aggregate는 아직 `src/analyze.js`에 연결하지 않았다. 따라서 현재 CLI production snapshot의 `skills`/`plugins`는 Stage 3 전까지 기존 unavailable 상태를 유지한다.

## 구현 요약

- count source:
  - `response_item/function_call`
  - `response_item/custom_tool_call`
  - `event_msg/dynamic_tool_call_request`
- classification source:
  - 같은 session file의 `session_meta.payload.dynamic_tools[]`
  - catalog item에 `namespace`가 없으면 skill
  - catalog item에 `namespace`가 있으면 plugin
  - `dynamic_tool_call_request` 자체에 `namespace`가 있으면 plugin
- ranking source 제외:
  - catalog/enabled metadata만 있는 항목
  - catalog match와 namespace가 없는 unknown actual call
  - `mcp_tool_call_end`는 이번 Stage 기본 ranking source에서 제외
- diagnostic:
  - `catalogEvents`, `catalogItems`
  - `actualInvocationEvents`
  - `classifiedSkillInvocations`, `classifiedPluginInvocations`
  - `unclassifiedInvocations`
  - `topLimit: 10`
  - `classificationBasis: "actual_invocation_with_session_catalog"`

## 검증 결과

실행 명령:

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser
git diff --check
```

결과:

- `npm test`: OK, 20개 테스트 통과.
- fixture CLI smoke: OK, Stage 3 전이므로 production snapshot의 `skills`/`plugins`는 기존 unavailable 상태를 유지하고 core usage/model/activity는 정상 출력된다.
- `git diff --check`: OK, 출력 없음.

추가 확인:

```bash
node --input-type=module -e "import { aggregateSkillPluginUsageFromCodexHome } from './src/parser/skill-plugin-aggregate.js'; const result = await aggregateSkillPluginUsageFromCodexHome({ codexHome: './src/__tests__/fixtures/skill-plugin' }); console.log(JSON.stringify({ diagnostics: result.diagnostics, skills: result.skills, plugins: result.plugins }, null, 2));"
```

결과:

- `status: "ok"`
- `filesScanned: 1`
- `actualInvocationEvents: 8`
- `classifiedSkillInvocations: 4`
- `classifiedPluginInvocations: 3`
- `unclassifiedInvocations: 1`
- `skills.exploredCount: 2`
- `skills.totalUsed: 4`
- `plugins.topPlugins` 2개

## 잔여 위험

- Production analyzer integration은 아직 수행하지 않았다.
- 실제 local source에서 catalog match가 드문 경우 ranking은 partial 또는 unavailable로 남을 수 있다.
- custom skill/plugin 이름은 ranking item value로 출력될 수 있다. Stage 3 README에서 local-only 의미와 privacy 한계를 설명해야 한다.

## 다음 단계 영향

- Stage 3에서 `aggregateSkillPluginUsageFromCodexHome()`를 `analyzeUsage()`에 연결한다.
- Stage 3에서 analyzer diagnostics의 `parsedFields`/`unavailableFields`가 skills/plugins aggregate status를 반영하도록 수정한다.
- Stage 3에서 README에 catalog/enabled metadata와 actual invocation의 차이를 문서화한다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3 analyzer integration과 README 문서화로 진행한다.

# Task M010 #4 Stage 3 완료 보고서

GitHub Issue: [#4](https://github.com/postmelee/codex-usage-analyzer/issues/4)
구현계획서: [`task_m010_4_impl.md`](../plans/task_m010_4_impl.md)
Stage: 3

## 단계 목적

Stage 3는 Stage 2에서 구현한 skill/plugin aggregate를 production `analyzeUsage()` 경로에 연결하고, `UsageSnapshot v2`의 `skills`/`plugins` 필드와 diagnostics가 실제 local session source 상태를 반영하도록 하는 단계다. README에는 skills/plugins 출력이 local actual invocation source 기준이며 remote profile/API 또는 plugin-store API 호출 결과가 아님을 문서화했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `src/analyze.js` | `aggregateSkillPluginUsageFromCodexHome()`를 production analyzer 병렬 aggregate에 추가하고, aggregate status가 `ok`일 때 `skills`/`plugins` core fields를 채우도록 연결했다. diagnostics의 hardcoded `local_source_not_identified`를 제거하고 skill/plugin aggregate diagnostics를 병합했다. |
| `src/__tests__/analyze.test.js` | production analyzer가 #4 synthetic fixture에서 `topSkills`/`topPlugins`를 채우는 테스트를 추가했다. missing source와 parser fixture diagnostics 기대값을 새 field ordering에 맞췄고, fixture privacy scan 범위에 #4 fixture를 포함했다. |
| `README.md` | parser가 skill/plugin ranking을 actual invocation event 기준으로 산출한다는 점, catalog/enabled list만으로는 usage를 증가시키지 않는다는 점, remote profile/API와 plugin-store API를 호출하지 않는다는 점을 추가했다. |
| `src/index.d.ts` | `analyzeUsage()` 주석에 session JSONL의 skill/plugin invocation event도 production parser source에 포함됨을 반영했다. |
| `mydocs/working/task_m010_4_stage3.md` | Stage 3 산출물, 검증 결과, 잔여 위험을 기록했다. |

## 본문 변경 정도 / 본문 무손실 여부

코드 작업이므로 문서 본문 무손실 검토 대상은 제한적이다. `UsageSnapshot v2` schema와 sample fixture 계약은 변경하지 않았고, production analyzer가 기존 usage/model/activity aggregate 결과를 유지하면서 skill/plugin aggregate만 추가로 병합하도록 했다. README는 기존 CLI/SDK 설명 흐름을 유지하고 Stage 3 범위 설명만 추가했다.

## 검증 결과

실행 명령:

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser
node bin/codex-usage-analyzer.js analyze --json --fixture-sample
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/skill-plugin
rg -n "topSkills|topPlugins|local_source_not_identified|skill-plugin" README.md src
git diff --check
```

결과:

- OK: `npm test` 통과. `21`개 테스트 중 `21`개 통과.
- OK: parser fixture CLI smoke 통과. usage/model/activity는 parsed, skills/plugins는 `no_skill_plugin_invocations`로 unavailable을 유지했다.
- OK: `--fixture-sample` smoke 통과. packaged sample fixture 전용 경로가 production parser 결과와 섞이지 않았다.
- OK: skill/plugin fixture CLI smoke 통과. `skills.topSkills`와 `plugins.topPlugins`가 synthetic actual invocation fixture 기준으로 채워졌고 diagnostics는 `parsedFields: ["activity", "skills", "plugins"]`, `unavailableFields: ["usage", "models", "activity.fastModePercent"]`를 반환했다.
- OK: `rg` 확인 결과 `topSkills`, `topPlugins`, `skill-plugin` 참조는 의도한 README/소스/테스트 위치에서 확인됐고 `local_source_not_identified` hardcode는 남아 있지 않았다.
- OK: `git diff --check` 통과.

## 잔여 위험

- Codex Desktop remote profile/API와 plugin-store API는 호출하지 않는다. 따라서 Desktop profile의 plugin/skill 집계와 완전한 parity는 보장하지 않는다.
- 실제 local session JSONL에 Stage 1에서 확인한 actual invocation event가 없거나 catalog metadata로 분류할 수 없으면 `skills`/`plugins`는 unavailable 또는 일부 미분류 diagnostics로 남는다.
- Stage 4에서 실제 로컬 환경 smoke와 privacy review를 통해 실제 source 존재 여부와 출력 안전성을 확인해야 한다.

## 다음 단계 영향

- Stage 4는 실제 `node bin/codex-usage-analyzer.js analyze --json` smoke를 실행하고, raw JSON을 문서에 붙이지 않고 aggregate status/top item 존재 여부/unclassified count/privacy 결과만 기록한다.
- 최종 보고서에는 #5-#7 후속 이슈와 remote profile parity 한계를 함께 정리한다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 Stage 4 실제 smoke와 최종 정리로 진행한다.

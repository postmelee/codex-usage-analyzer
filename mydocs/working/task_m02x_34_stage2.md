# Task M02x #34 Stage 2 완료 보고서

GitHub Issue: [#34](https://github.com/postmelee/codex-usage-analyzer/issues/34)
구현계획서: [`task_m02x_34_impl.md`](../plans/task_m02x_34_impl.md)
Stage: 2

## 단계 목적

기존 README 상단 소개와 Support/privacy/non-affiliation 고지를 보존하면서 OpenAI Codex의 documented `account/usage/read` 링크와 Codex usage lookup 전용 비교표를 추가한다. 측정 방법, 환경, command array, source semantics와 해석 한계는 공식 `docs/` 문서로 분리해 비교 수치가 전체 제품 평가나 보편적인 성능 보장으로 오해되지 않게 한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `README.md` | 기존 199줄에 upstream blockquote와 3개 CLI median/relative time 비교 섹션 16줄을 추가했다. |
| `docs/codex-lookup-benchmark.md` | 108줄. 2026-07-13 결과, min/max, 환경, 측정 정책, exact-version command array, 재현 절차와 해석 한계를 기록했다. |

## 본문 변경 정도 / 본문 무손실 여부

README 기존 상단 소개 문장은 exact string으로 보존했다. 상단 소개 다음에 documented upstream blockquote를 삽입하고 `Why this CLI` 다음에 benchmark 섹션을 추가했으며, 기존 Quick start, Support, Supported metrics, Privacy and Security, License/non-affiliation 본문은 재작성하거나 삭제하지 않았다.

README와 상세 문서에는 경쟁 프로젝트의 다른 provider 지원이나 제품상 장점을 추가하지 않았다. 비교 범위는 세 command의 Codex usage lookup latency로 한정하고 remote account-level source와 retained local history source가 다름을 명시했다.

## 검증 결과

실행 명령:

```bash
node --input-type=module -e 'import fs from "node:fs"; const readme=fs.readFileSync("README.md", "utf8"); const intro="`codex-usage-analyzer` starts your installed Codex CLI, calls `account/usage/read`, and emits a stable, identity-free contract. It does not scan local sessions or directly read authentication files, tokens, keychains, prompts, or responses."; if (!readme.includes(intro)) throw new Error("README intro changed");'
rg -n "github\.com/openai/codex/blob/main/codex-rs/app-server/README\.md|Codex lookup benchmark|codex-usage-analyzer@0\.2\.0|ccusage@20\.0\.17|tokscale@4\.4\.1|1\.145s|3\.306s|19\.723s|2\.9x|17\.2x" README.md docs/codex-lookup-benchmark.md
rg -n "2026-07-13|warm-up|5|arm64|macOS 26\.5\.2|Node\.js 24\.15\.0|0\.144\.0-alpha\.4|1,000.*4,999|2 GiB|network|retained|whole product|entire product" docs/codex-lookup-benchmark.md
rg -n "Codex for Open Source|does not imply endorsement|Privacy and Security|not affiliated|not endorsed|not sponsored" README.md
git diff --check
```

결과:

- OK: README 기존 상단 소개 문장의 exact match를 확인했다.
- OK: README와 상세 문서에서 OpenAI Codex app-server README 링크와 세 package exact version을 확인했다.
- OK: README에 median 1.145s, 3.306s, 19.723s와 상대 시간 1.0x, 2.9x, 17.2x가 모두 존재한다.
- OK: 상세 문서에 측정일, warm-up/5회 실행, architecture/OS/Node/Codex version, retained history 구간, network와 local source 한계가 존재한다.
- OK: ccusage v20.0.17 공식 tag에서 `codex daily`, `--offline`, `--json` command shape를 대조했다.
- OK: Tokscale v4.4.1 공식 tag에서 `--client codex`, `--json`, `--no-spinner`와 pricing-cache-only environment behavior를 대조했다.
- OK: 기존 Codex for Open Source Support와 endorsement 제한, Privacy and Security, non-affiliation/non-endorsement/non-sponsorship 고지를 확인했다.
- OK: `git diff --check`가 경고 없이 통과했다.

## 잔여 위험

- 결과는 2026-07-13 한 환경의 dated snapshot이며 현재 또는 다른 장비의 실행시간을 보장하지 않는다.
- 사전 측정은 현재 repository harness를 커밋하기 전에 equivalent timing policy로 수행됐다. 상세 문서는 이 차이를 명시하며 fresh benchmark 결과로 표현하지 않는다.
- remote account source와 retained local history source의 범위가 다르므로 latency 표만으로 데이터 정확도나 제품 적합성을 판단할 수 없다.
- npm package file 경계와 공개 문서의 sensitive pattern은 Stage 3에서 별도로 검증한다.

## 다음 단계 영향

- Stage 3는 README intro/link/value/scope 검사를 반복하고 전체 `npm test`를 실행한다.
- `npm pack --dry-run --json`에서 benchmark harness와 `mydocs/`가 제외되고 새 공식 benchmark 문서만 기존 `docs` allowlist를 통해 포함되는지 확인한다.
- 공개 문서에 private absolute path, credential-like value, account identifier 또는 실제 usage metric이 없는지 pattern scan과 수동 검토를 수행한다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3 통합·보안·패키지 경계 검증으로 진행한다.

# Task M010 #21 구현계획서

수행계획서: [`task_m010_21.md`](task_m010_21.md)
GitHub Issue: [#21](https://github.com/postmelee/codex-usage-analyzer/issues/21)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | license 후보와 승인 결정 정리 | `mydocs/plans/task_m010_21_impl.md`, `mydocs/working/task_m010_21_stage1.md` | `git status --short`, `git diff --check`, license 선택 기록 수동 확인 |
| 2 | 승인된 license metadata와 문서 반영 | `package.json`, `LICENSE`, `README.md`, `mydocs/working/task_m010_21_stage2.md` | `node -e ...package.json parse`, `npm pack --dry-run`, `git diff --check` |
| 3 | 최종 검증과 보고 | `mydocs/working/task_m010_21_stage3.md`, `mydocs/report/task_m010_21_report.md`, `mydocs/orders/20260701.md` | `npm test`, `npm pack --dry-run`, `git diff --check` |

## 문서 위치 확인

수행계획서의 "문서 위치 판단"과 실제 Stage 산출물 경로는 일치한다. 공식 사용자/기여자-facing 문서는 루트 `package.json`, `LICENSE`, `README.md`를 사용하고, 작업 진행 기록은 `mydocs/`에 둔다. 새 `docs/` 루트는 만들지 않는다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `package.json` | 저장소 루트 | Stage 2 수정 후보 | OK | npm package metadata의 단일 진실 원천이다. |
| `LICENSE` | 저장소 루트 | Stage 2 신규 후보 | OK | 승인된 license 파일을 package와 저장소 표준 위치에 둔다. |
| `README.md` | 저장소 루트 | Stage 2 수정 후보 | OK | 사용자와 기여자가 package license 상태를 빠르게 확인하는 표면이다. |
| `mydocs/plans/task_m010_21_impl.md` | `mydocs/plans/` | Stage 1 신규 | OK | license 후보와 승인 결정을 추적한다. |
| `mydocs/working/task_m010_21_stage{N}.md` | `mydocs/working/` | Stage 1-3 신규 | OK | 단계별 검증 결과와 승인 요청을 기록한다. |
| `mydocs/report/task_m010_21_report.md` | `mydocs/report/` | Stage 3 신규 | OK | 최종 결과와 npm publish 제외 범위를 기록한다. |

## 현재 상태

- `package.json`에는 `license` 필드가 없다.
- 저장소 루트에는 `LICENSE`, `LICENCE`, `NOTICE` 파일이 없다.
- README에는 별도 license 섹션이 없다.
- `package.json`에는 `files` allowlist가 있으나, npm 문서는 `LICENSE`/`LICENCE` 파일을 설정과 무관하게 package에 포함되는 특수 파일로 설명한다.
- 이번 task는 npm publish를 실행하지 않으므로 이미 publish된 `codex-usage-analyzer@0.1.0` registry metadata는 즉시 바뀌지 않는다.

## 공식 문서 기준

- npm `package.json` 문서는 license metadata에 SPDX expression 사용을 안내한다.
- npm 문서는 legacy license object/list 형식을 deprecated로 보고, `"license": "ISC"` 또는 `"license": "(MIT OR Apache-2.0)"` 같은 SPDX expression 예시를 든다.
- npm 문서는 private 또는 unpublished package에 권리를 부여하지 않으려는 경우 `"license": "UNLICENSED"`를 사용할 수 있다고 설명하고, accidental publication 방지를 위해 `"private": true`도 고려하라고 안내한다.
- npm `files` 문서는 `package.json`, `README`, `LICENSE`/`LICENCE`, `bin` field 대상 파일 등이 항상 포함되는 특수 파일이라고 설명한다.
- SPDX License List는 `MIT`, `ISC`, `Apache-2.0` short identifier를 제공한다.

참고:

- https://docs.npmjs.com/cli/v10/configuring-npm/package-json/
- https://spdx.org/licenses/MIT.html
- https://spdx.org/licenses/ISC.html
- https://spdx.org/licenses/Apache-2.0.html

## license 결정 후보

| 후보 | package.json 값 | 루트 파일 | README 문구 | 판단 포인트 |
|---|---|---|---|---|
| MIT | `"MIT"` | `LICENSE` 추가 | "MIT License" 명시 | 공개 재사용을 허용하는 짧고 널리 쓰이는 permissive license를 원할 때 선택한다. |
| ISC | `"ISC"` | `LICENSE` 추가 | "ISC License" 명시 | MIT보다 짧은 permissive license 문구를 원할 때 선택한다. |
| Apache-2.0 | `"Apache-2.0"` | `LICENSE` 추가 | "Apache License 2.0" 명시 | 명시적 patent grant와 더 긴 조건을 포함하는 permissive license를 원할 때 선택한다. |
| Dual expression | 예: `"(MIT OR Apache-2.0)"` | 선택한 license 조합 문서화 | dual-license 상태 명시 | 사용자가 둘 중 하나를 선택할 수 있게 하려는 명확한 의도가 있을 때만 선택한다. |
| UNLICENSED | `"UNLICENSED"` | 보통 license 허가 파일 없음 | 공개 재사용 권리 미부여 명시 | public npm package로 계속 배포할 의도와 충돌할 수 있어 별도 정책 판단이 필요하다. |
| metadata 보류 | 변경 없음 | 추가 없음 | 필요 시 보류 사유만 명시 | 아직 license 정책을 확정하지 않으려는 경우 선택한다. 단, package 사용자는 license 상태를 계속 불명확하게 본다. |
| 기타 SPDX expression | 작업지시자 지정값 | 지정 license에 맞춤 | 지정 license 명시 | GPL/MPL/BSD 등 다른 정책 목표가 있을 때 작업지시자가 직접 지정한다. |

## Stage 1 — license 후보와 승인 결정 정리

### 산출물

신규:

- `mydocs/plans/task_m010_21_impl.md`
- `mydocs/working/task_m010_21_stage1.md`

수정:

- `mydocs/orders/20260701.md`

### 변경 내용

- 현재 package license metadata 상태를 기록한다.
- npm/SPDX 공식 문서 기준을 요약한다.
- license 후보와 반영 파일 범위를 표로 정리한다.
- 작업지시자가 선택한 license 값 또는 metadata 보류 결정을 Stage 1 보고서에 기록한다.
- Stage 2에서 실제 파일을 수정하기 전까지 `package.json`, `LICENSE`, `README.md`는 변경하지 않는다.

### 검증

```bash
git status --short
git diff --check
```

추가 수동 확인:

- license 선택 또는 보류 결정이 Stage 1 보고서에 명확히 기록되어 있어야 한다.
- 에이전트가 임의 license를 선택하지 않았어야 한다.

### 커밋

```text
Task #21 Stage 1: license 후보와 승인 결정 정리
```

## Stage 2 — 승인된 license metadata와 문서 반영

### 산출물

신규:

- `LICENSE`, 작업지시자가 license 파일 추가를 승인한 경우
- `mydocs/working/task_m010_21_stage2.md`

수정:

- `package.json`, 작업지시자가 license metadata 추가를 승인한 경우
- `README.md`, license 문구 추가 또는 보류 사유 문서화가 승인된 경우
- `mydocs/orders/20260701.md`

### 변경 내용

- Stage 1에서 승인된 license 값만 `package.json`에 반영한다.
- license 파일 추가가 승인된 경우 SPDX 기준 text와 필요한 copyright notice를 반영한다.
- README에는 package license 상태를 짧게 안내한다.
- metadata 보류가 승인된 경우 `package.json`과 `LICENSE`를 임의로 추가하지 않고, README 문구가 필요한지만 승인 범위에 따라 처리한다.
- `files` allowlist는 원칙적으로 변경하지 않는다. `npm pack --dry-run`에서 license 파일 포함이 의도와 다를 때만 최소 조정을 검토한다.

### 검증

```bash
node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8')); console.log('package.json ok')"
npm pack --dry-run
git diff --check
```

### 커밋

```text
Task #21 Stage 2: license metadata 반영
```

## Stage 3 — 최종 검증과 보고

### 산출물

신규:

- `mydocs/working/task_m010_21_stage3.md`
- `mydocs/report/task_m010_21_report.md`

수정:

- `mydocs/orders/20260701.md`

### 변경 내용

- 전체 test와 package dry-run을 실행한다.
- package contents에서 license metadata/file 포함 여부를 최종 확인한다.
- npm publish를 하지 않았으므로 npm registry의 기존 `0.1.0` metadata는 즉시 변경되지 않는다는 점을 최종 보고서에 남긴다.
- #22 trusted publishing/provenance, #23 release version bump 절차와의 후속 관계를 기록한다.

### 검증

```bash
npm test
npm pack --dry-run
git diff --check
```

### 커밋

```text
Task #21 Stage 3 + 최종 보고서: license metadata 검증 정리
```

## 검증 공통 규칙

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- `npm pack --dry-run` 결과는 package contents 요약만 기록하고, 불필요한 local path는 기록하지 않는다.
- license text는 공식 license text를 기준으로 하되, 작업지시자가 승인한 license에 한해서만 추가한다.
- npm token, npm account identifier, credential은 문서와 PR 본문에 기록하지 않는다.
- `UsageSnapshot v2` schema와 analyzer runtime behavior는 변경하지 않는다.

## 단계 의존성

- Stage 1은 이 구현계획서 작성 후 license 선택 또는 보류 결정 승인을 받아야 완료된다.
- Stage 2는 Stage 1 보고서에서 license 값과 반영 파일 범위가 승인된 뒤 진행한다.
- Stage 3은 Stage 2 검증과 보고서 승인 후 진행한다.
- npm publish는 이번 task 범위에서 제외한다.

## 승인 요청 사항

- Stage 1-3 분할, 산출물, 검증 명령, 커밋 메시지를 이 구현계획서대로 고정하는 것
- Stage 1의 license 후보 표 중 하나를 선택하거나, 기타 SPDX expression 또는 metadata 보류를 지정하는 것
- license 파일을 추가하는 경우 사용할 copyright holder 표기를 지정하는 것
- 이번 task에서 npm publish, trusted publishing/provenance, release version bump 절차 문서화를 제외하는 것

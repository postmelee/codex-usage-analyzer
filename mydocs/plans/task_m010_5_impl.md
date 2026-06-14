# Task M010 #5 구현계획서

수행계획서: [`task_m010_5.md`](task_m010_5.md)
GitHub Issue: [#5](https://github.com/postmelee/codex-usage-analyzer/issues/5)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | asset source contract와 fixture 설계 | local asset 후보 판단, safe assetRef 정책, asset fixture, `task_m010_5_stage1.md` | `npm test`, fixture privacy review, `git diff --check` |
| 2 | asset aggregate 구현 | `src/parser/asset-aggregate.js`, parser tests, stage report | `npm test`, safe/unavailable output 확인, `git diff --check` |
| 3 | analyzer integration과 README 문서화 | `src/analyze.js`, README, analyze tests, stage report | `npm test`, fixture/sample CLI smoke, `git diff --check` |
| 4 | 실제 smoke와 최종 정리 | 실제 analyzer smoke, privacy review, final report, 오늘할일 완료 | `npm test`, 실제 CLI smoke, `git diff --check` |

## 문서 위치 확인

수행계획서의 "문서 위치 판단"과 실제 Stage 산출물 경로를 일치시킨다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `README.md` | 저장소 루트 `README.md` | `README.md` | OK | `codexAssets` 의미, analyzer/wrapper 책임, privacy 한계를 사용자/기여자에게 설명한다. |
| `mydocs/plans/task_m010_5_impl.md` | `mydocs/plans/` | `mydocs/plans/task_m010_5_impl.md` | OK | 구현 전 승인용 내부 산출물 |
| `mydocs/working/task_m010_5_stage{N}.md` | `mydocs/working/` | `mydocs/working/task_m010_5_stage{N}.md` | OK | 단계별 source 판단, 검증, privacy review를 기록한다. |
| `mydocs/report/task_m010_5_report.md` | `mydocs/report/` | `mydocs/report/task_m010_5_report.md` | OK | 최종 결과보고서 |
| `mydocs/tech/` 추가 문서 | 수행계획서에서 미선택 | 해당 없음 | OK | #1 inventory와 stage/final report로 source 판단을 추적한다. |

## Stage 1 — asset source contract와 fixture 설계

### 산출물

신규:

- `src/__tests__/fixtures/assets/README.md`
- `src/__tests__/fixtures/assets/pets/safe-pet.png`
- `src/__tests__/fixtures/assets-empty/README.md`
- `src/__tests__/fixtures/assets-unsafe/README.md`
- `src/__tests__/fixtures/assets-unsafe/generated_images/private-image.png`
- `mydocs/working/task_m010_5_stage1.md`

수정:

- `mydocs/plans/task_m010_5_impl.md` (필요 시 source contract 보강)

### 변경 내용

- #1 inventory와 실제 local metadata를 기준으로 avatar/pet source 후보를 재검토한다.
  - `<codex-home>/pets/`는 pet asset 후보로 검토한다.
  - `<codex-home>/generated_images/`는 user/private generated artifact일 가능성이 높으므로 기본 avatar/pet source에서 제외한다.
  - remote profile image URL, account avatar, GitHub avatar는 analyzer source가 아니라 wrapper/product-owned 영역으로 둔다.
- safe output contract를 확정한다.
  - local absolute path는 core field와 diagnostics에 넣지 않는다.
  - image binary content는 읽거나 data URL로 출력하지 않는다.
  - `assetRef`는 local path가 아닌 deterministic opaque reference로 정의한다.
  - `contentType`은 allowlisted extension에서만 추론한다.
  - source가 없거나 unsafe이면 `codexAssets`를 sample 값으로 채우지 않고 diagnostics에 reason을 남긴다.
- fixture contract를 설계한다.
  - safe pet 후보 fixture
  - source 없음 fixture
  - generated/private image 후보가 있어도 제외되는 unsafe fixture
  - fixture에는 실제 private path, credential, account identifier, binary image content를 넣지 않는다.
- Stage 2가 구현할 aggregate input/output shape와 diagnostics key를 stage report에 기록한다.

### 검증

```bash
npm test
! rg -n "/Users/|/home/|/private/var/|access_token|refresh_token|Bearer |sk-|github_pat_|data:image|profile_picture|githubAvatar" src/__tests__/fixtures/assets src/__tests__/fixtures/assets-empty src/__tests__/fixtures/assets-unsafe
git diff --check
```

수동 확인:

- fixture에 실제 이미지 binary, raw local path, account identifier, credential-like 값이 없는지 확인한다.
- generated image fixture가 safe asset으로 오인되지 않도록 contract가 명시됐는지 확인한다.
- Stage 2에서 구현할 `assetRef`가 local path 또는 file name을 노출하지 않는지 확인한다.

### 커밋

```text
Task #5 Stage 1: asset source 계약과 fixture 설계
```

## Stage 2 — asset aggregate 구현

### 산출물

신규:

- `src/parser/asset-aggregate.js`
- `src/__tests__/parser-asset.test.js`
- `mydocs/working/task_m010_5_stage2.md`

수정:

- 필요 시 `src/__tests__/fixtures/assets/README.md`
- 필요 시 `src/__tests__/fixtures/assets-empty/README.md`
- 필요 시 `src/__tests__/fixtures/assets-unsafe/README.md`

### 변경 내용

- `aggregateCodexAssetsFromCodexHome(options)`를 구현한다.
  - `resolveCodexHome(options)`를 사용한다.
  - allowlisted local asset source만 검사한다.
  - file content는 읽지 않고 directory entry/stat metadata와 extension만 사용한다.
  - safe pet candidate가 있으면 `kind: "codex-asset"`, `url: null`, deterministic opaque `assetRef`, inferred `contentType`을 반환한다.
  - avatar는 Stage 1에서 safe local source가 확인된 경우에만 반환한다. 확인되지 않으면 `null` 또는 omitted output + diagnostics로 둔다.
- deterministic candidate selection을 구현한다.
  - stable sort 기준을 고정한다.
  - `assetRef`는 `codex-local:{asset-kind}:primary` 같은 logical reference로 두고, raw path, file name, file-name hash를 출력하지 않는다.
- diagnostics를 구현한다.
  - `status`, `reason`, `source`, `avatar`, `pet`
  - scanned candidate count
  - unsafe/excluded candidate count
  - unavailable reason
  - local absolute path/file name/file content 미노출
- source 없음은 unavailable baseline을 유지한다.

### 검증

```bash
npm test
node --input-type=module -e "import { aggregateCodexAssetsFromCodexHome } from './src/parser/asset-aggregate.js'; const result = await aggregateCodexAssetsFromCodexHome({ codexHome: './src/__tests__/fixtures/assets' }); console.log(JSON.stringify({ diagnostics: result.diagnostics, codexAssets: result.codexAssets }, null, 2));"
git diff --check
```

수동 확인:

- safe fixture에서 stable `assetRef`와 `contentType`이 나온다.
- empty fixture에서 sample avatar URL로 fallback하지 않는다.
- unsafe generated image fixture가 core `codexAssets`로 승격되지 않는다.
- diagnostics에 raw path, file name, image content, account identifier가 없는지 확인한다.

### 커밋

```text
Task #5 Stage 2: asset aggregate 구현
```

## Stage 3 — analyzer integration과 README 문서화

### 산출물

신규:

- `mydocs/working/task_m010_5_stage3.md`

수정:

- `src/analyze.js`
- `src/__tests__/analyze.test.js`
- `README.md`
- 필요 시 `src/index.d.ts`

### 변경 내용

- `analyzeUsage()` production path에 asset aggregate를 연결한다.
- `codexAssets` core field는 aggregate가 safe asset을 반환할 때만 채운다.
  - source unavailable이면 field를 생략한다.
  - safe pet만 있으면 `avatar: null`, `pet: { ... }` 형태로 schema-valid output을 만든다.
  - sample fixture의 remote URL은 production fallback으로 사용하지 않는다.
- analyzer diagnostics에 `assets` 또는 `codexAssets` namespace를 병합한다.
  - pet이 비어 있는 경우 reason을 추적할 수 있게 한다.
  - avatar가 wrapper-owned/remote-only라면 그 이유를 diagnostic으로 남긴다.
- README를 업데이트한다.
  - analyzer는 remote profile image URL/GitHub avatar를 수집하지 않는다.
  - local file path/data URL은 기본 JSON에 넣지 않는다.
  - wrapper가 이미지 업로드/storage/rendering을 책임진다.

### 검증

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/assets
node bin/codex-usage-analyzer.js analyze --json --fixture-sample
rg -n "codexAssets|assetRef|data:image|remote profile|GitHub avatar" README.md src
git diff --check
```

수동 확인:

- production parser source와 sample fixture source가 다시 섞이지 않았는지 확인한다.
- source unavailable 환경에서 `codexAssets`가 sample 값으로 채워지지 않는지 확인한다.
- README가 remote profile/API, GitHub avatar, local path output을 analyzer 기본 동작으로 암시하지 않는지 확인한다.
- `UsageSnapshot v2` schema 변경 없이 구현됐는지 확인한다.

### 커밋

```text
Task #5 Stage 3: asset analyzer 통합
```

## Stage 4 — 실제 smoke와 최종 정리

### 산출물

신규:

- `mydocs/working/task_m010_5_stage4.md`
- `mydocs/report/task_m010_5_report.md`

수정:

- `mydocs/orders/20260614.md`

### 변경 내용

- 로컬 실제 환경에서 `node bin/codex-usage-analyzer.js analyze --json`을 실행한다.
- 실제 smoke output은 raw JSON으로 문서에 붙이지 않는다.
- smoke report에는 다음만 기록한다.
  - asset aggregate status
  - `codexAssets` field 존재 여부
  - avatar/pet status
  - safe assetRef 존재 여부
  - excluded/unsafe candidate count 존재 여부
  - privacy review 결과
- output privacy review를 수행한다.
  - raw local absolute path 없음
  - credential/token-like value 없음
  - account identifier 원본 없음
  - `data:image` 없음
  - image file content 없음
- final report에 #6-#7 handoff를 정리한다.
- 오늘할일 #5 행을 완료 상태로 갱신한다.

### 검증

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/assets
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser
git diff --check
```

수동 확인:

- 실제 환경 smoke 결과가 safe asset source 있음/없음 중 어느 상태인지 보고서에 기록한다.
- output privacy review 결과를 stage/final report에 기록한다.
- PR 준비 전 `git status --short`가 빈 출력인지 확인한다.

### 커밋

```text
Task #5 Stage 4 + 최종 보고서: asset safe output 정리
```

## 검증

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- 실패한 검증은 단계 완료로 처리하지 않는다.
- 계획 변경이 필요하면 구현계획서를 먼저 갱신하고 작업지시자 승인을 받는다.
- 문서 위치가 수행계획서 판단과 달라지면 구현 전에 수행계획서 또는 구현계획서를 갱신하고 작업지시자 승인을 받는다.

## 커밋

- 단계 커밋은 단계 산출물과 `mydocs/working/task_m010_5_stage{N}.md`를 함께 묶는다.
- 커밋 메시지는 `Task #5 Stage {N}: {핵심 내용 요약}` 형식을 따른다.
- 최종 보고서와 오늘할일 완료 갱신은 Stage 4 커밋에 함께 포함한다.

## 단계 의존성

- Stage 2는 Stage 1에서 safe local asset source contract와 fixture가 승인된 뒤 진행한다.
- Stage 3은 Stage 2 aggregate가 tests로 고정된 뒤 production analyzer에 연결한다.
- Stage 4는 Stage 3 통합 결과가 승인된 뒤 실제 환경 smoke와 최종 정리를 수행한다.
- 각 단계는 완료보고서 승인 후 다음 단계로 넘어간다.

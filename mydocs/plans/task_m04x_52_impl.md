# Task M04x #52 구현계획서

수행계획서: [`task_m04x_52.md`](task_m04x_52.md)
GitHub Issue: [#52](https://github.com/postmelee/codex-usage-analyzer/issues/52)
마일스톤: M04x

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | selected custom pet source와 bounded reader 구현 | `src/experimental-pet.js`, synthetic fixture/test, Stage 1 보고서 | Current source structural audit, path/image negative fixture, no-output privacy |
| 2 | Full Profile v2 pet 계약 구현 | v2 normalizer, schema, type, contract test, Stage 2 보고서 | v1 exact compatibility, v2 schema/runtime/type alignment, status matrix |
| 3 | CLI·client·human output·공식 문서 통합 | `--include-pet`, warnings, package/docs, integration test, Stage 3 보고서 | No-access opt-out, CLI matrix, package artifact, public docs links |
| 4 | 실제 sanitized smoke와 downstream 인계 검증 | Stage 4 보고서와 Tokenmon 인계 체크리스트 | Full regression, local structural smoke, privacy scan, package dry-run |

## 문서 위치 확인

수행계획서의 문서 위치 판단과 실제 Stage 산출물 경로를 다음과 같이 고정한다. 공식 소비 계약은 `README.md`와 `docs/`에 두고, 조사·검증·인계 진행 기록은 `mydocs/`에 둔다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| CLI 사용법·warning | 저장소 루트 | `README.md` | OK | npm/GitHub 사용자 진입점 |
| Full Profile v1/v2 계약 | `docs/` | `docs/experimental-full-profile.md` | OK | v1 보존과 v2 opt-in 의미를 함께 설명 |
| Full Profile v2 schema | `docs/` | `docs/experimental-full-profile-v2.schema.json` | OK | 기존 `experimental-full-profile.schema.json`은 v1로 보존 |
| Downstream pet 처리 경계 | `docs/` | `docs/downstream-integration.md` | OK | decode·재인코딩·재호스팅·삭제 요구사항 |
| Source 조사·단계 보고 | `mydocs/working/` | `mydocs/working/task_m04x_52_stage{1,2,3,4}.md` | OK | 실제 값 없는 승인·검증 이력 |
| 최종 결과·Tokenmon 인계 체크리스트 | `mydocs/report/` | `mydocs/report/task_m04x_52_report.md` | OK | `task-final-report` 단계에서 작성 |

## 공통 불변조건

### Opt-in과 v1 호환성

- `usage`, `usage --json`, `profile`, `profile --json`의 command 의미와 JSON field set을 변경하지 않는다.
- `profile --include-pet`과 `profile --json --include-pet`만 local pet reader를 활성화한다.
- Full Profile v1 runtime constant와 `docs/experimental-full-profile.schema.json`은 변경하지 않는다.
- Full Profile v2는 root `fullProfileContractVersion: 2`와 required `pet` field를 갖는 별도 self-contained schema를 사용한다.
- 환경변수나 Tokenmon 존재 여부만으로 pet을 자동 포함하지 않는다. `CODEX_HOME`은 명시적 opt-in 이후 source root 해석에만 사용할 수 있다.
- 기본 usage와 public JavaScript SDK는 변경하지 않는다. Full Profile v2 type은 CLI consumer용 type-only declaration으로 제공하고 experimental profile runtime을 root JavaScript export로 승격하지 않는다.

### Pet 출력 계약

Full Profile v2의 `pet`은 다음 fixed-shape 의미를 사용한다. Stage 1의 source audit가 현재 구조와 충돌하면 source 구현을 진행하지 않고 계획 변경 승인을 요청한다.

```json
{
  "status": "ok",
  "reason": null,
  "kind": "custom",
  "image": {
    "role": "spritesheet",
    "contentType": "image/webp",
    "width": 1024,
    "height": 1152,
    "byteLength": 123456,
    "sha256": "64-lowercase-hex-characters",
    "base64": "bounded-base64-without-data-url-prefix"
  }
}
```

- `pet.status`는 `ok | unavailable`이다.
- 성공 시 `reason: null`, `kind: "custom"`, `image` object가 모두 존재한다.
- 실패 시 `kind: null`, `image: null`이고 `reason`은 allowlisted safe code 중 하나다.
- safe reason 후보는 `selected_pet_state_unavailable`, `selected_pet_not_custom`, `selected_pet_manifest_unavailable`, `selected_pet_image_unavailable`, `selected_pet_image_invalid`, `selected_pet_image_too_large`로 제한한다.
- local path, directory/file name, custom pet ID, selected raw value, manifest 원문은 출력하지 않는다.
- payload는 raw base64만 사용하고 `data:` URL, file URL, local absolute/relative path를 제공하지 않는다.
- `role: "spritesheet"`를 명시해 downstream이 일반 portrait 이미지로 오해하지 않도록 한다. 대표 frame crop과 animation metadata는 이번 task에서 만들지 않는다.

### Source와 이미지 제한

- Source root 우선순위는 injected test option, `CODEX_HOME`, OS home의 `.codex`다. CLI flag가 없으면 이 해석 자체를 실행하지 않는다.
- 선택 상태는 현재 Codex Desktop bundle/state 구조에서 확인된 allowlisted state file/key만 읽는다. 과거 key가 현재 구조에서 확인되지 않으면 첫 pet 또는 유일한 pet으로 fallback하지 않는다.
- `custom:` 선택 ID는 출력하지 않고, `pets` directory의 실제 directory entry와 exact match할 때만 내부 lookup에 사용한다. 선택 문자열을 직접 path segment로 join하지 않는다.
- custom manifest는 현재 확인된 `pet.json`만 허용한다. Current app이 다른 manifest를 요구하면 자동 확장하지 않고 계획 변경 승인을 요청한다.
- `spritesheetPath`는 manifest directory 내부 relative path만 허용한다. absolute path, `..`, null byte, symlink와 realpath escape를 거부한다.
- 허용 content type은 `image/webp`, `image/png`다. extension, magic bytes, dimension header가 모두 일치해야 한다.
- 초기 상한은 state file 1 MiB, manifest 64 KiB, image 8 MiB, 한 변 8192 px, 총 16,777,216 px로 고정한다.
- image는 bounded file handle read 후 SHA-256과 base64를 계산한다. size/read race, short read, file type 변경은 unavailable로 축소한다.
- PNG IHDR와 WebP VP8X/VP8/VP8L dimension 변형을 test fixture로 검증한다. 지원 header를 안전하게 해석하지 못하면 downstream에 전달하지 않는다.
- runtime dependency를 추가하지 않는다.

### Full Profile v2 status와 exit code

- canonical `usage` 획득 실패는 기존처럼 envelope 없이 safe CLI error와 exit `1`이다.
- v2 root `status`는 remote profile/activity와 requested pet을 함께 집계한다.
- 모든 requested optional category가 complete하면 `ok`다.
- remote profile/activity 또는 pet 중 일부만 usable하면 `partial`이다.
- remote profile/activity가 모두 unavailable이고 pet도 unavailable이면 `unavailable`이다.
- v2 envelope가 `partial`이면 exit `0`, `unavailable`이면 exit `1`이다. nested `pet.status`를 root status와 별도로 보존한다.
- pet reader error나 source drift가 이미 획득한 canonical usage 또는 remote profile을 폐기하지 않는다.
- v1 status와 exit-code semantics는 변경하지 않는다.

### Sensitive data와 downstream 경계

- 실제 state/profile/pet raw payload를 fixture, 문서, stage report, test failure message에 복사하지 않는다.
- 실제 local smoke는 child stdout을 메모리에서 parse해 version/status/type/length/boolean만 검사하고 raw JSON과 base64를 출력하지 않는다.
- Human output에는 pet availability, kind, content type, dimensions, byte length까지만 표시하고 SHA-256/base64/path/ID를 표시하지 않는다.
- Tokenmon은 base64를 server-side에서 strict decode하고 전체 image decode, safe re-encode, stable HTTPS re-hosting, visibility consent, replacement/revocation/deletion을 수행해야 한다.
- analyzer는 Tokenmon endpoint, submit token, GitHub identity와 public URL을 소유하지 않는다.

## Stage 1 — selected custom pet source와 bounded reader 구현

### 산출물

신규:

- `src/experimental-pet.js`
- `src/__tests__/experimental-pet.test.js`
- `src/__tests__/fixtures/experimental-pet/**`
- `mydocs/working/task_m04x_52_stage1.md`

수정:

- 없음. 현재 source audit에서 계약 변경이 필요하면 구현 전에 본 계획서를 보정하고 승인받는다.

### 변경 내용

- Codex Desktop app bundle의 pet catalog/state key 문자열과 Codex home의 state/manifest/image 구조를 read-only로 확인한다. 실제 selected/custom ID, path, image bytes는 출력하지 않고 key path, type, count, byte/dimension 범위만 sanitized summary로 다룬다.
- `readExperimentalPet(options)`를 local file reader entrypoint로 추가한다. 외부 성공/실패 모두 fixed-shape `pet` object로 반환하고 filesystem error detail을 throw/output하지 않는다.
- State와 manifest JSON은 byte cap과 object-root 검증을 적용한다. prototype-sensitive key나 non-string `spritesheetPath`를 허용하지 않는다.
- Selected custom directory는 enumerated `Dirent` exact match로 찾고 raw selected suffix를 path에 직접 사용하지 않는다.
- `realpath`, file type, symlink, bounded open/read, magic bytes, dimension, byte length, digest, base64 순서로 검증한다.
- Synthetic fixture는 selected custom success, no state, built-in selection, missing custom directory, malformed/oversize manifest, traversal/symlink, missing/oversize image, PNG, WebP VP8X/VP8/VP8L, header mismatch를 포함한다.
- Test assertion과 error message는 fixture path나 selected ID가 public result에 포함되지 않음을 검증한다.
- Current source에서 authoritative selection key를 확인하지 못하면 success reader를 임의 fallback으로 구현하지 않고 Stage 1을 중단해 계획 변경을 요청한다.

### 검증

```bash
node --test src/__tests__/experimental-pet.test.js
npm test
node --test --test-name-pattern='reads one selected custom WebP spritesheet with bounded metadata' src/__tests__/experimental-pet.test.js
if rg -n '/Users/|/home/|/private/var/|access_token|refresh_token|Bearer |sk-|github_pat_' src/__tests__/experimental-pet.test.js src/__tests__/fixtures/experimental-pet mydocs/working/task_m04x_52_stage1.md; then exit 1; fi
git diff --exit-code origin/main -- src/cli.js src/experimental-profile-client.js src/experimental-profile.js src/format-experimental-profile.js src/index.d.ts README.md docs package.json
git diff --check
```

### 커밋

```text
Task #52 Stage 1: selected custom pet bounded reader 구현
```

## Stage 2 — Full Profile v2 pet 계약 구현

### 산출물

신규:

- `docs/experimental-full-profile-v2.schema.json`
- `mydocs/working/task_m04x_52_stage2.md`

수정:

- `src/experimental-profile.js`
- `src/index.d.ts`
- `src/__tests__/experimental-profile.test.js`

### 변경 내용

- 기존 Full Profile v1 constants, normalizer, unavailable factory와 field order를 그대로 보존한다.
- v2 전용 constant/field set과 normalizer/factory를 추가하고 root에 required `pet`을 배치한다.
- v2 normalizer는 remote profile/activity normalization을 재사용하고 pet fixed-shape를 다시 allowlist/validate해 reader object의 unknown field를 버린다.
- 공통 불변조건의 root status matrix를 pure normalization test로 고정한다. remote unavailable + pet ok는 `partial`, remote ok + pet unavailable도 `partial`, 둘 다 unavailable은 `unavailable`이다.
- `docs/experimental-full-profile-v2.schema.json`은 외부 reference 없이 Account Usage Contract, profile, activity, pet 정의를 포함하는 self-contained draft-07 schema로 작성한다.
- v1 schema file content/hash와 v1 fixture output이 Stage 시작 전 baseline과 같은지 regression으로 고정한다.
- `src/index.d.ts`에 Full Profile v1/v2 envelope와 pet/image type-only interface를 추가한다. JavaScript root export는 추가하지 않는다.
- Schema와 type의 reason enum, content type, integer range, digest/base64 pattern, `additionalProperties: false`를 runtime field set과 일치시킨다.

### 검증

```bash
node --test src/__tests__/experimental-profile.test.js
npm test
node --input-type=module -e 'import fs from "node:fs"; const v1=JSON.parse(fs.readFileSync("docs/experimental-full-profile.schema.json","utf8")); const v2=JSON.parse(fs.readFileSync("docs/experimental-full-profile-v2.schema.json","utf8")); if(v1.properties.fullProfileContractVersion.const!==1||v2.properties.fullProfileContractVersion.const!==2||!v2.required.includes("pet")||v1.required.includes("pet")) process.exit(1); console.log(JSON.stringify({v1:v1.properties.fullProfileContractVersion.const,v2:v2.properties.fullProfileContractVersion.const,v2PetRequired:true}))'
rg -n 'FullProfileV2|ExperimentalPet|fullProfileContractVersion|selected_pet_|image/webp|image/png' src/experimental-profile.js src/index.d.ts docs/experimental-full-profile-v2.schema.json src/__tests__/experimental-profile.test.js
if rg -n '/Users/|/home/|/private/var/|access_token|refresh_token|Bearer |sk-|github_pat_' docs/experimental-full-profile-v2.schema.json src/__tests__/experimental-profile.test.js; then exit 1; fi
git diff --exit-code HEAD^ -- docs/experimental-full-profile.schema.json
git diff --exit-code origin/main -- src/cli.js src/experimental-profile-client.js src/format-experimental-profile.js README.md docs/experimental-full-profile.md docs/downstream-integration.md package.json
git diff --check
```

### 커밋

```text
Task #52 Stage 2: Full Profile v2 pet 계약 구현
```

## Stage 3 — CLI·client·human output·공식 문서 통합

### 산출물

신규:

- `mydocs/working/task_m04x_52_stage3.md`

수정:

- `src/cli.js`
- `src/experimental-profile-client.js`
- `src/format-experimental-profile.js`
- `src/__tests__/cli.test.js`
- `src/__tests__/experimental-profile-client.test.js`
- `src/__tests__/format-experimental-profile.test.js`
- `src/__tests__/index.test.js`
- `README.md`
- `docs/experimental-full-profile.md`
- `docs/downstream-integration.md`
- `package.json`

### 변경 내용

- Argument parser는 `profile --include-pet`, `profile --json --include-pet`와 두 flag의 반대 순서만 추가 허용한다. usage action의 `--include-pet`, duplicate flag, unknown flag, help와 pet flag 혼합은 invalid no-access path로 유지한다.
- Pet opt-in 시 기존 profile warning과 별도로 local selected pet metadata/image bytes를 읽는다는 warning을 stderr에 정확히 한 번 출력한다.
- CLI는 `readExperimentalProfile({includePet: true})`를 전달하고, flag가 없으면 기존 dependency 호출 형태와 v1 output을 유지한다.
- Experimental profile client는 `includePet`일 때만 injected reader 또는 dynamic import로 pet reader를 호출한다. Usage/profile remote flow와 pet result를 v2 normalizer에 합치되 어느 optional source의 실패도 raw error를 노출하지 않는다.
- Human formatter는 v2 `pet`이 있을 때만 Pet section을 추가하고 availability, custom kind, content type, dimensions, byte length만 출력한다.
- README와 experimental contract에 명령, warning, v1/v2 discriminator, base64 privacy, unavailable/status/exit 의미를 문서화한다.
- Downstream guide는 strict base64 decode, byte/hash/dimension 재검증, full image decode, safe re-encode, re-host, public consent와 delete/revoke를 요구하고 Tokenmon mapping은 cosmetic portrait source로만 설명한다.
- `package.json` files allowlist에 `src/experimental-pet.js`를 추가한다. `docs/` allowlist를 통해 v2 schema가 포함되는지 package test를 갱신한다.
- Package version `0.4.0`, dependency 0개, lockfile 부재를 유지한다. Version bump/release는 별도 task다.

### 검증

```bash
npm test
node bin/codex-usage-analyzer.js --help
node bin/codex-usage-analyzer.js profile --help
node bin/codex-usage-analyzer.js --version
node --input-type=module -e 'import {runCli} from "./src/cli.js"; let options; const sink=()=>({value:"",write(value){this.value+=value;}}); const stdout=sink(),stderr=sink(); const code=await runCli(["profile","--json","--include-pet"],{stdout,stderr},{readExperimentalProfile:async(value)=>{options=value;return {fullProfileContractVersion:2,status:"partial"};}}); if(code!==0||options?.includePet!==true||!stderr.value.includes("include-pet")||JSON.parse(stdout.value).fullProfileContractVersion!==2) process.exit(1)'
rg -n 'include-pet|Full Profile v2|base64|spritesheet|re-host|re-encode|delete|revoke' README.md docs/experimental-full-profile.md docs/downstream-integration.md src/cli.js src/experimental-profile-client.js src/format-experimental-profile.js
if rg -n '/Users/|/home/|/private/var/|access_token|refresh_token|Bearer |sk-|github_pat_' README.md docs src/cli.js src/experimental-profile-client.js src/format-experimental-profile.js; then exit 1; fi
npm pack --cache /private/tmp/codex-usage-analyzer-task52-npm-cache --dry-run --json
node --input-type=module -e 'import fs from "node:fs"; const p=JSON.parse(fs.readFileSync("package.json","utf8")); if(p.version!=="0.4.0"||(p.files??[]).filter((value)=>value==="src/experimental-pet.js").length!==1||Object.keys(p.dependencies??{}).length||Object.keys(p.devDependencies??{}).length) process.exit(1)'
test ! -e package-lock.json
git diff --check
```

### 커밋

```text
Task #52 Stage 3: profile include-pet CLI와 공식 문서 통합
```

## Stage 4 — 실제 sanitized smoke와 downstream 인계 검증

### 산출물

신규:

- `mydocs/working/task_m04x_52_stage4.md`

수정:

- 없음. 결함이 발견되면 Stage 4를 완료하지 않고 해당 소유 Stage의 계획·구현으로 돌아간다.

### 변경 내용

- Full test에서 기존 usage/profile regression과 신규 pet reader/v2/CLI test가 모두 통과하는지 확인한다.
- 실제 `profile --json`은 v1을 유지하고 local pet reader를 호출하지 않는지 structural smoke로 확인한다.
- 실제 `profile --json --include-pet` 결과는 raw stdout을 문서에 붙이지 않고 version, root/pet status, fixed keys, type, dimension/length bounds, no-path/no-ID/no-credential boolean만 sanitized 확인한다.
- 현재 선택 source가 custom pet이 아니거나 확인되지 않으면 `pet.status: unavailable`을 정상 결과로 기록하며 설치 pet으로 fallback하지 않는다.
- Synthetic selected custom fixture로 available v2와 human output을 별도 smoke해 실제 사용자 pet 없이 downstream payload 구조를 검증한다.
- Isolated temporary npm cache의 package dry-run에서 v2 schema와 `experimental-pet.js`가 포함되고 tests/fixtures/mydocs가 제외되는지 확인한다.
- Tokenmon 인계 체크리스트에는 exact package version, command, schema/type, synthetic available/unavailable example, content limits, status/exit semantics, decode/re-encode/re-host/delete 요구사항을 기록한다.
- 실제 Tokenmon Issue 생성이나 저장소 변경은 analyzer 최종 계약 승인·PR 완료 후 별도 인계 동작으로 남긴다.

### 검증

```bash
npm test
node bin/codex-usage-analyzer.js profile --help
node bin/codex-usage-analyzer.js --version
node --input-type=module -e 'import {spawn} from "node:child_process"; const child=spawn(process.execPath,["bin/codex-usage-analyzer.js","profile","--json"],{stdio:["ignore","pipe","pipe"]}); let out=""; child.stdout.on("data",(chunk)=>out+=chunk); child.stderr.resume(); child.on("close",(code)=>{const value=JSON.parse(out); if(value.fullProfileContractVersion!==1||Object.hasOwn(value,"pet")||![0,1].includes(code)) process.exit(1); console.log(JSON.stringify({version:value.fullProfileContractVersion,hasPet:false,exit:code}))})'
node --input-type=module -e 'import {spawn} from "node:child_process"; const child=spawn(process.execPath,["bin/codex-usage-analyzer.js","profile","--json","--include-pet"],{stdio:["ignore","pipe","pipe"]}); let out=""; child.stdout.on("data",(chunk)=>out+=chunk); child.stderr.resume(); child.on("close",(code)=>{const value=JSON.parse(out); const image=value.pet?.image; const safe=!out.includes("/Users/")&&!out.includes("data:image")&&!out.includes("access_token")&&!out.includes("refresh_token"); if(value.fullProfileContractVersion!==2||!value.pet||!safe||![0,1].includes(code)) process.exit(1); console.log(JSON.stringify({version:value.fullProfileContractVersion,rootStatus:value.status,petStatus:value.pet.status,hasImage:image!==null,imageType:image?.contentType??null,widthType:image===null?null:typeof image.width,heightType:image===null?null:typeof image.height,byteLengthType:image===null?null:typeof image.byteLength,base64Length:image?.base64?.length??0,safe,exit:code}))})'
npm pack --cache /private/tmp/codex-usage-analyzer-task52-npm-cache --dry-run --json
node --input-type=module -e 'import fs from "node:fs"; for(const file of ["README.md","docs/experimental-full-profile.md","docs/downstream-integration.md","docs/experimental-full-profile-v2.schema.json"]){const text=fs.readFileSync(file,"utf8"); for(const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu)){const target=match[1].split("#")[0]; if(target&&!target.includes(":")&&!fs.existsSync(new URL(target,new URL(`file://${process.cwd()}/${file}`)))) process.exit(1)}}'
if git diff --name-only origin/main...HEAD | rg -v '^(src/(cli|experimental-pet|experimental-profile-client|experimental-profile|format-experimental-profile)\.js|src/index\.d\.ts|src/__tests__/|docs/(experimental-full-profile(-v2\.schema\.json|\.md)|downstream-integration\.md)|README\.md|package\.json|mydocs/.*)$'; then exit 1; fi
git diff --check
git status --short
```

실제 profile smoke가 upstream/network 문제로 envelope를 만들지 못하면 source 결함과 구분해 보고하고 Stage 4를 완료하지 않는다. 실제 raw output, base64, local path와 identity field 값은 보고서에 기록하지 않는다.

### 커밋

```text
Task #52 Stage 4: pet opt-in 통합 검증과 Tokenmon 인계 확정
```

## 검증

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- 실패한 검증은 단계 완료로 처리하지 않는다.
- Stage 1 source audit에서 authoritative selected custom source를 확인하지 못하면 임의 fallback을 추가하지 않고 계획 변경 승인을 요청한다.
- Full Profile v1 schema/runtime/output diff가 발생하면 즉시 중단한다.
- 실제 pet/profile data는 test failure나 보고서 편의를 위해 출력하지 않는다.
- 계획 변경이 필요하면 본 구현계획서를 먼저 갱신하고 작업지시자 승인을 받는다.
- 문서 위치가 수행계획서 판단과 달라지면 공식 문서를 변경하기 전에 계획 문서를 갱신하고 승인받는다.

## 커밋

- 단계 커밋은 Stage source/docs/test 산출물과 `mydocs/working/task_m04x_52_stage{N}.md`를 함께 묶는다.
- 커밋 메시지는 본 계획서에 고정한 `Task #52 Stage {N}: ...` 형식을 따른다.
- 최종 보고서와 PR 게시 전 `task-final-report` Skill을 적용한다.

## 단계 의존성

- Stage 1은 본 구현계획서 승인 후에만 시작한다.
- Stage 2는 Stage 1 source contract, reader negative test와 보고서 승인 후 진행한다.
- Stage 3은 Stage 2 v1/v2 contract, schema/type와 status matrix 승인 후 진행한다.
- Stage 4는 Stage 3 CLI/client/docs/package 통합 검증과 보고서 승인 후 진행한다.
- Tokenmon 인계는 analyzer의 최종 계약과 구현이 승인된 뒤 수행하며 Tokenmon 코드는 별도 이슈에서 다룬다.

## 위험과 대응

- **Selected source drift**: Current app bundle/state에서 확인된 key만 allowlist하고 찾지 못하면 unavailable 또는 계획 변경으로 처리한다.
- **Local path injection**: Raw selected suffix를 join하지 않고 enumerated directory entry exact match, realpath containment와 symlink rejection을 적용한다.
- **TOCTOU와 unbounded read**: Bounded state/manifest read, opened file handle stat, exact capped read와 post-read validation을 사용한다.
- **Image header ambiguity**: PNG와 세 WebP dimension variant만 지원하고 magic/extension/dimension 불일치는 거부한다.
- **Large JSON output**: Raw image 8 MiB와 dimension/pixel cap을 적용하고 base64 length를 schema/test로 제한한다.
- **V1 consumer breakage**: Opt-in flag, separate version/schema, v1 exact regression과 package test로 분리한다.
- **Optional source coupling**: Remote profile과 local pet 결과를 독립적으로 수집·축소하고 canonical usage를 보존한다.
- **Sensitive output leakage**: Fixed reason codes, no raw filesystem error, human redaction, sanitized live smoke와 pattern scan을 적용한다.
- **Built-in asset rights**: App bundle extraction과 재배포를 명시적으로 제외한다.
- **Tokenmon trust boundary**: Analyzer payload를 cosmetic untrusted input으로 규정하고 downstream decode/re-encode/re-host/delete를 필수화한다.

## 승인 요청 사항

- 4개 Stage의 산출물, 의존성, 검증 명령과 커밋 메시지
- v1 exact 보존과 `--include-pet` 전용 Full Profile v2 분리
- custom spritesheet fixed-shape pet/image contract와 safe reason enum
- state 1 MiB, manifest 64 KiB, image 8 MiB, dimension 8192 px, pixel 16,777,216의 초기 상한
- `image/webp`·`image/png`, PNG/WebP dimension header, base64 payload 지원 범위
- selected custom source 불확실 시 no-fallback 중단 게이트
- v2 root status/exit-code 집계 의미와 optional source 독립성
- built-in extraction, 대표 frame/animation, Tokenmon 코드, release 작업 제외
- 공식 문서 위치와 analyzer 완료 후 Tokenmon 인계 순서
- Stage 1 구현 진입

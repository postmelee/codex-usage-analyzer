# Task M04x #52 최종 보고서

GitHub Issue: [#52](https://github.com/postmelee/codex-usage-analyzer/issues/52)
마일스톤: M04x

## 작업 요약

- 대상 이슈: #52
- 마일스톤: M04x
- 단계 수: 5개(Stage 1, 2, 2.5, 3, 4)
- 작업 목적: 기존 Full Profile v1을 보존하면서 명시적 opt-in에서만 선택한
  custom Codex pet spritesheet를 Full Profile v2로 제공하고 Tokenmon이 안전하게
  소비할 계약과 인계 경계를 확정한다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `src/experimental-pet.js` | bounded state/manifest/image reader, catalog와 명시 key 선택 | opt-in local custom pet source |
| `src/experimental-profile.js` | Full Profile v2 pet normalizer와 root status matrix | experimental JSON contract |
| `src/experimental-profile-client.js` | key/forced selector/Desktop/fallback 우선순위와 v2 결합 | experimental profile orchestration |
| `src/experimental-pet-selector.js` | 방향키 TTY selector와 terminal 복원 | human CLI opt-in |
| `src/cli.js` | `--include-pet`, `--pet-key`, `--select-pet`, warning/no-access validation | CLI experimental profile |
| `src/format-experimental-profile.js` | base64·digest를 숨긴 v2 Pet section | human output |
| `src/experimental-profile-api.js`, `src/experimental-profile-api.d.ts` | 두 함수만 제공하는 experimental subpath와 v1/v2 type overload | Node module consumer |
| `src/index.d.ts` | Full Profile v1/v2와 pet/catalog type | TypeScript type surface; root runtime export 불변 |
| `docs/experimental-full-profile-v2.schema.json` | required `pet`을 가진 machine-readable v2 schema | downstream validator |
| `README.md`, `docs/experimental-full-profile.md` | CLI/module 선택 의미, v1/v2, status와 privacy 설명 | 공식 사용자·API 계약 문서 |
| `docs/downstream-integration.md` | decode/re-encode/re-host, consent/revoke/delete와 Tokenmon 경계 | 외부 downstream 통합 문서 |
| `package.json` | experimental subpath와 artifact allowlist | npm package; version/dependency 불변 |
| `src/__tests__/`, synthetic fixture | reader/contract/client/CLI/selector/formatter/package 회귀 | 자동 검증 |
| `mydocs/plans/`, `mydocs/working/` | 승인 계획, 5개 Stage 보고서와 sanitized live smoke | 내부 작업 이력 |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| `README.md` | 저장소 루트 | 저장소 루트 | OK | npm/GitHub 진입점의 opt-in 사용법 |
| `docs/experimental-full-profile.md` | `docs/` | `docs/` | OK | experimental CLI/module 계약 |
| `docs/experimental-full-profile-v2.schema.json` | `docs/` | `docs/` | OK | v1을 덮어쓰지 않은 별도 v2 schema |
| `docs/downstream-integration.md` | `docs/` | `docs/` | OK | 공개 producer/downstream 보안 경계 |
| `mydocs/working/task_m04x_52_stage*.md` | `mydocs/working/` | `mydocs/working/` | OK | source 조사·단계 검증 내부 이력 |
| `mydocs/report/task_m04x_52_report.md` | `mydocs/report/` | `mydocs/report/` | OK | 장기 보관용 최종 결과 |

수행계획서의 문서 위치 판단과 실제 산출물 위치가 모두 일치한다. 신규 공식
문서 루트를 만들거나 `mydocs/manual`을 제품 문서로 사용하지 않았다.

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---:|---:|
| Full Profile contract version | v1만 제공 | v1 유지 + opt-in v2 추가 |
| custom pet public reader/catalog | 없음 | reader 1개 + catalog 1개 |
| experimental module runtime export | 없음 | 2개(`listExperimentalPets`, `readExperimentalProfile`) |
| root JavaScript SDK export | 8개 | 8개(변경 없음) |
| 전체 회귀 test | Stage 1 완료 시점 143개 | 최종 178개 |
| npm artifact | pet/v2 artifact 없음 | 28개 중 v2 schema·reader·selector·API 포함 |
| dependency/devDependency | 0개 | 0개 |
| task 전체 diff | 해당 없음 | 32개 파일, +4,563/-45줄, 최종 보고 포함 10개 커밋 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| opt-in 없는 usage/profile이 local pet source를 읽지 않고 기존 계약 유지 | OK — dependency no-call test, v1 schema/hash 회귀와 실제 `profile --json` v1/no-pet smoke 통과 |
| v2가 Desktop selected 또는 호출자가 명시한 custom pet만 제한된 payload로 표현 | OK — Desktop/key/selector priority test와 실제 explicit-key Full Profile v2 pet/root `ok` 확인 |
| 선택 불확실 시 첫/유일 pet 암묵 fallback 금지 | OK — 실제 Desktop-default v2는 pet unavailable/root partial, explicit key에서만 실제 image 사용 |
| path/format/size/dimension과 selection 오류의 안전한 축약 | OK — traversal, symlink, malformed/oversize, PNG/WebP header, stale key, 취소/throw fixture 통과 |
| v1/v2 schema/runtime/type 및 package 정합성 | OK — 전체 178 test, exact experimental export와 28-entry package dry-run 통과 |
| raw path/ID/credential/base64의 비의도 노출 방지 | OK — human redaction, fixed reason, privacy scan과 sanitized live smoke 통과 |
| built-in/generated/arbitrary image 비승격 | OK — custom catalog/manifest containment만 허용하고 built-in 선택은 unavailable; app bundle extraction 미구현 |
| Tokenmon 인계 자료 완결성 | OK — Stage 4에 명령/API/schema/type, synthetic 예시, limits, status/exit, decode/re-host/delete 체크리스트 기록 |
| PR 준비 전 repository 점검 | OK — Stage 4 commit 후 clean status, 최종 통합 `git diff --check` 통과 |

### 단계별 검증 결과

- [Stage 1](../working/task_m04x_52_stage1.md): 실제 설치 pet 구조를 민감값
  없이 확인하고 bounded selected custom reader와 negative fixture를 구현했다.
- [Stage 2](../working/task_m04x_52_stage2.md): Full Profile v1 schema/output을
  byte 단위로 보존하면서 required pet을 가진 v2 schema/runtime/type을 추가했다.
- [Stage 2.5](../working/task_m04x_52_stage2.5.md): deterministic 1-based catalog,
  explicit key와 no-implicit-fallback 계약을 구현했다.
- [Stage 3](../working/task_m04x_52_stage3.md): CLI/client/TTY selector/human
  formatter/experimental subpath/package/공식 문서를 통합했다.
- [Stage 4](../working/task_m04x_52_stage4.md): 실제 v1/v2와 explicit-key image
  무결성을 sanitized 검증하고 Tokenmon 인계 체크리스트를 확정했다.

최종 통합 검증은 전체 test 178개 통과, package 28개 artifact, root export
불변, experimental export 2개, lockfile/dependency 없음으로 재확인했다.

## 잔여 위험과 후속 작업

### 잔여 위험

- Codex Desktop selected custom state와 private profile endpoint는 upstream
  안정성 계약이 없다. 현재 state가 선택 key를 제공하지 않으면 JSON 기본
  호출의 pet unavailable이 정상이며 설치 pet으로 추측하지 않는다.
- package metadata는 `0.4.0`이지만 이 task는 publish하지 않는다. registry의
  기존 동일 표기만으로 기능 포함을 가정하면 안 된다.
- v2 image는 단일 portrait가 아닌 전체 spritesheet다. 대표 frame/layout과
  animation 의미는 이번 producer 계약에 포함되지 않는다.
- 실제 app-server smoke는 sandbox 밖의 로컬 실행 권한이 필요했다. 같은 HEAD의
  synthetic test와 package 검증은 sandbox 안에서 통과했다.

### 후속 작업 후보

- 이 변경을 포함할 별도 version bump, npm publish와 release task
- analyzer PR merge/release 후 `postmelee/tokenmon` consumer Issue 생성과
  dependency pin, v2 validation, private storage, safe re-host, opt-in/delete 구현
- Tokenmon이 정적 portrait 또는 animation을 요구할 경우 spritesheet frame/layout
  consumer contract를 별도 Issue로 정의

## 작업지시자 승인 요청

- 모든 Stage와 최종 통합 결과는 같은 스레드에서 승인됐다. 2026-07-19의
  "진행해줘" 지시에 따라 최종 보고서 커밋과 `publish/task52` PR 게시 절차를
  진행한다.

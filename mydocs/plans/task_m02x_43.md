# Task M02x #43 수행계획서

GitHub Issue: [#43](https://github.com/postmelee/codex-usage-analyzer/issues/43)
마일스톤: M02x

## 목적

macOS에서 전역 Codex CLI가 `PATH`에 없더라도 표준 Codex/ChatGPT 앱 번들에 포함된 공식 Codex 실행 파일을 찾아 `account/usage/read`를 호출할 수 있게 한다. 앱만 설치하고 ChatGPT 로그인을 완료한 사용자가 기존 `npx codex-usage-analyzer@latest` 명령으로 Account Usage Contract를 조회하는 흐름을 지원한다.

기존 PATH 기반 실행을 우선하고, app-server protocol·인증 위임·identity-free 출력 계약은 변경하지 않는다. 사용자-facing Quick Start는 대화형 실행에 맞게 `--yes`를 제거하되, CI와 릴리스 검증의 비대화형 명령은 `--yes`를 유지한다.

## 배경

현재 `src/app-server-client.js`는 shell 없이 `codex app-server`를 직접 spawn한다. 이 구조는 안전하고 단순하지만, 외부 터미널의 `PATH`에 `codex`가 없으면 macOS 앱 번들에 호환 실행 파일이 있어도 `CODEX_NOT_FOUND`로 종료한다.

현재 macOS 앱 번들의 Codex 실행 파일이 `app-server`와 `account/usage/read`를 제공하며 기존 contract field/type 구조를 반환하는 것은 실제 사용량 값을 출력하지 않는 structural-only 검증으로 확인했다. 공식 Codex App Server 문서도 `account/usage/read`를 ChatGPT token-activity summary 조회 경로로 문서화한다. 앱 번들 내부 경로 자체는 공개 안정 계약이 아니므로 고정 후보 기반 best-effort fallback으로 다루고, 기존 PATH 실행을 우선한다.

## 범위

### 포함

- PATH의 `codex`를 최우선으로 유지하는 실행 파일 선택 정책
- macOS 표준 system/user Applications의 Codex/ChatGPT 앱 번들 고정 후보 탐지
- shell, 재귀 디렉터리 scan, credential 파일 접근 없이 실행 가능성만 확인하는 resolver
- 선택된 실행 파일을 기존 app-server client에 연결하고 현재 protocol/error boundary 유지
- PATH 우선, 앱 fallback, no-runtime, unsupported platform에 대한 단위 테스트
- 앱 번들 실행 실패 시 raw stderr와 실제 로컬 경로를 노출하지 않는 오류 처리
- npm package에 신규 runtime module이 빠지지 않도록 package file allowlist 검증
- README Quick Start·Requirements·How it works·Troubleshooting 보정
- 사용자-facing `npx codex-usage-analyzer@latest`와 자동화용 `npx --yes ...` 구분
- 실제 값 없는 macOS 앱 번들 structural-only smoke

### 제외

- Windows/Linux 앱 번들 탐지
- 공식 Codex 런타임 dependency 추가 또는 자동 다운로드
- standalone/bootstrap 명령과 `npx --package @openai/codex` 자동화
- `cua` npm 패키지, alias package 또는 bin alias 추가
- ChatGPT token, Codex auth file, keychain 직접 읽기
- Desktop 내부 `/wham/*` endpoint 직접 호출
- Account Usage Contract, JSON Schema, public usage field 변경
- 로컬 session 기반 사용량 추정 또는 fallback
- 앱 bundle 전체 재귀 탐색, Spotlight/LaunchServices 의존 탐색, code-signature 정책 추가

## 설계 방향

- 실행 파일 선택은 `PATH`의 `codex`를 먼저 확인하고, 찾지 못한 macOS 환경에서만 승인된 고정 앱 번들 후보를 순서대로 검사한다.
- 앱 번들 후보는 system/user Applications 아래의 Codex/ChatGPT 번들 이름과 내부 Resources 실행 파일 위치로 제한한다. 실제 사용자 경로는 출력·로그·fixture에 기록하지 않는다.
- resolver는 shell command를 사용하지 않고 Node.js built-in filesystem/path/os API만 사용한다. 임의 디렉터리 재귀 탐색과 private app data/cache 접근은 금지한다.
- non-macOS에서는 기존 `codex` spawn과 `CODEX_NOT_FOUND` 의미를 유지한다. 이번 task에서 검증하지 않은 플랫폼 경로를 추측해 추가하지 않는다.
- app-server handshake와 response normalizer는 현재 구현을 재사용하며, resolver source가 JSON contract에 나타나지 않게 한다.
- 기존 safe error code를 우선 재사용하고, public error code 추가가 정말 필요할 때는 구현계획서에서 호환성 영향을 별도로 제시한다.
- 신규 runtime module을 분리할 경우 `package.json`의 package file allowlist와 dry-run artifact를 함께 검증한다.
- 사용자 README의 대화형 Quick Start에서는 `--yes`를 제거하고, maintainer/CI smoke의 재현 가능한 비대화형 명령에는 `--yes`를 유지한다.

## 문서 위치 판단

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| `README.md` | 공식 사용자 문서 | CLI 사용자·기여자 | 저장소 root `README.md` | `docs/` 신규 가이드 | 기존 Quick Start, Requirements, 동작 설명, Troubleshooting의 진실 원천이므로 필요한 문구만 보정한다. |
| `mydocs/plans/task_m02x_43.md` 및 후속 task 문서 | 내부 작업 산출물 | 작업지시자·후속 에이전트 | `mydocs/plans`, `mydocs/working`, `mydocs/report` | 공식 문서 root | 구현 판단·단계 결과·승인 근거이므로 제품 문서와 분리한다. |

새 공식 문서 파일은 만들지 않고 기존 `README.md`만 수정한다. `docs/account-usage-contract.md`와 schema는 출력 계약이 바뀌지 않으므로 수정하지 않는다.

## 예상 변경 파일

신규:

- `src/codex-executable.js`
- `src/__tests__/codex-executable.test.js`

수정:

- `src/app-server-client.js`
- `src/errors.js`
- `src/__tests__/app-server-client.test.js`
- `package.json`
- `README.md`

이번 task 산출물:

- `mydocs/orders/20260713.md`
- `mydocs/plans/task_m02x_43.md`
- `mydocs/plans/task_m02x_43_impl.md`
- `mydocs/working/task_m02x_43_stage{N}.md`
- `mydocs/report/task_m02x_43_report.md`

세부 설계에서 resolver를 기존 module 내부에 유지하는 편이 더 안전하다고 확인되면 신규 source/test 파일 여부는 구현계획서에서 조정하고 승인받는다.

## 잠정 단계

- **Stage 1 — Codex 실행 파일 resolver와 단위 검증**
  - PATH 우선순위, macOS 고정 앱 후보, unsupported/no-runtime 동작을 정의한다.
  - shell·재귀 scan·민감 경로 출력이 없음을 focused test로 검증한다.
- **Stage 2 — app-server transport 통합과 오류 경계 검증**
  - resolver 결과를 기존 spawn/handshake에 연결한다.
  - 기존 protocol 순서, cleanup, safe error mapping과 contract normalization 회귀가 없음을 검증한다.
- **Stage 3 — 사용자 문서, package artifact, live smoke**
  - README의 앱-only 요구사항과 대화형/자동화 `npx` 명령을 구분한다.
  - package dry-run과 macOS 앱 번들 structural-only smoke를 포함한 통합 검증을 수행한다.

## 검증 계획

### 단계별 검증

- Stage 1
  - resolver focused unit test
  - PATH 우선, system/user app fallback, no-runtime, unsupported platform 시나리오
  - shell command·재귀 scan·credential source 금지 pattern scan
- Stage 2
  - app-server client focused unit test
  - initialize → initialized → `account/usage/read` protocol 순서와 child cleanup 확인
  - 기존 safe error code/message와 Account Usage Contract 회귀 확인
- Stage 3
  - README user-facing 명령과 maintainer/CI `--yes` 명령 구분 scan
  - npm package dry-run의 runtime file 포함과 private/task artifact 제외 확인
  - macOS 앱 번들 structural-only live smoke

### 통합 검증

- `npm test` 전체 통과
- `npm pack --dry-run --json` artifact audit 통과
- runtime source에서 auth/keychain/private endpoint 금지 pattern zero-match
- live smoke는 contract version, field name, value type만 확인하고 실제 usage value와 raw stderr를 출력하지 않는다.
- `git status --short`가 PR 준비 전 빈 출력이다.
- `git diff --check`가 경고 없이 통과한다.

## 리스크

- **앱 번들 경로 drift**: 번들 내부 경로는 공개 안정 계약이 아니므로 PATH를 우선하고 고정 후보 fallback 실패를 안전한 오류로 처리한다.
- **의도치 않은 실행 파일 선택**: 검색 범위를 표준 Applications 고정 후보로 제한하고 순서를 테스트한다.
- **플랫폼 회귀**: macOS 외 플랫폼은 기존 `codex` 경로와 오류 의미를 유지하며 추측 경로를 추가하지 않는다.
- **package 누락**: 신규 resolver module을 package allowlist와 pack dry-run에서 검증한다.
- **민감정보 노출**: candidate path, upstream stderr, credential/account data를 public output과 작업 문서에 기록하지 않는다.
- **문서 명령 의미 혼동**: 대화형 Quick Start에서만 `--yes`를 제거하고 CI/릴리스 smoke는 비대화형 동작을 유지한다.

## 승인 요청 사항

- PATH 우선, macOS 고정 앱 번들 후보 fallback 순서
- shell·재귀 scan 없이 Node.js built-in만 사용하는 resolver 경계
- Windows/Linux, runtime bootstrap, `cua` alias, direct auth/backend 호출 제외
- Account Usage Contract와 schema 무변경
- 기존 root `README.md`만 공식 사용자 문서로 보정하는 위치 판단
- 3개 잠정 Stage와 structural-only live 검증 범위

승인되면 `task_m02x_43_impl.md`에서 단계별 산출물, 검증 명령, 커밋 메시지를 구체화한다.

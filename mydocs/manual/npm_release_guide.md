# npm 패키지 릴리스 가이드

## 목적

`codex-usage-analyzer`의 version bump, tag, npm Trusted Publishing, registry 검증, GitHub Release 순서를 하나의 반복 가능한 운영 기준으로 고정한다. 사용자용 README에는 설치와 사용법만 두고, 배포 권한이 필요한 절차는 이 문서에서 관리한다.

## 범위

이 문서는 이 저장소의 npm 패키지 릴리스에만 적용한다. Hyper-Waterfall 프레임워크 자체의 release/tag 승격은 [`release_update_protocol.md`](release_update_protocol.md)를 따른다.

## 강제 규칙

- 모든 릴리스는 승인된 GitHub Issue와 release 준비 PR을 먼저 거친다.
- npm에 이미 게시된 version은 재사용하지 않는다.
- version bump가 `main`에 merge되기 전에 tag, npm publish, GitHub Release를 만들지 않는다.
- publish workflow에는 `NPM_TOKEN`, `NODE_AUTH_TOKEN`, npm access token secret을 추가하지 않는다.
- Trusted Publisher의 OIDC와 `id-token: write`를 사용한다.
- Trusted Publishing이 provenance를 자동 생성하므로 `--provenance`를 직접 전달하지 않는다.
- 실제 account usage JSON을 PR, issue, release note, workflow log에 붙여 넣지 않는다. 구조 검증 결과, exit code, package metadata만 기록한다.
- 일반 task 수행 중에는 별도 작업지시자 승인 없이 tag 생성, workflow 실행, npm publish, GitHub Release 생성을 수행하지 않는다.

## 릴리스 순서

### 1. version 결정

현재 공개 CLI, SDK, Account Usage Contract의 호환성 영향을 먼저 분류한다.

- patch: 호환되는 버그 수정, 문서 또는 package metadata 수정
- minor: 호환되는 기능 추가. 1.0.0 이전에는 breaking public contract 변경도 최소 minor로 올리고 영향 분석을 남긴다.
- major: 1.0.0 이후의 breaking CLI, SDK 또는 contract 변경

새 contract version은 별도 issue에서 consumer impact와 downstream 배포 순서를 승인받는다.

### 2. release 준비 PR에서 version bump

승인된 release 준비 브랜치에서 version을 갱신한다.

```bash
npm version --no-git-tag-version <patch|minor|major>
```

`package.json`, 생성된 lockfile이 있으면 해당 lockfile, CLI/타입의 package version 상수를 함께 확인한다. 이 단계에서는 tag를 만들지 않는다.

### 3. 로컬 검증

```bash
npm test
npm pack --dry-run
node bin/codex-usage-analyzer.js --help
node bin/codex-usage-analyzer.js --version
npm run release:preflight
```

`npm pack --dry-run` 결과에서 runtime, 타입, 공개 문서만 포함되고 `mydocs`, test, workflow, script가 제외되는지 확인한다. 실제 account usage 호출 결과는 terminal transcript나 파일에 저장하지 않는다.

기본 preflight는 release 준비 PR에서 예상되는 미커밋 상태와 미생성 tag를 경고로 표시할 수 있다. 그 외 FAIL은 수정한 뒤 PR을 merge한다.

### 4. version bump PR merge

CI가 통과하고 review가 끝난 release 준비 PR을 `main`에 merge한다. registry version보다 새로운 package version이 `main`에 존재하는지 확인한다.

### 5. main merge commit tag 생성

최신 `main`에서 package version과 동일한 tag를 만든다.

```bash
git checkout main
git pull --ff-only
git tag vX.Y.Z
git push origin vX.Y.Z
```

Tag는 version bump가 포함된 `main` commit을 가리켜야 한다. 잘못된 commit을 가리키는 tag를 게시한 상태에서는 다음 단계로 진행하지 않는다.

### 6. strict preflight

```bash
npm run release:preflight -- --release-ready
```

Working tree clean, registry보다 높은 local version, 일치하는 tag, test, package artifact, Trusted Publishing workflow, 본 가이드와 sensitive pattern scan이 모두 OK여야 한다.

### 7. Publish Package workflow 실행

GitHub Actions의 `Publish Package` workflow를 version tag 기준으로 수동 실행한다. workflow는 Node/npm Trusted Publishing 최소 version을 확인하고 test, no-auth CLI smoke, package dry-run을 통과한 뒤 `npm publish`를 수행한다.

Trusted Publisher 설정은 npm package와 다음 GitHub 정보가 일치해야 한다.

- owner: `postmelee`
- repository: `codex-usage-analyzer`
- workflow filename: `publish.yml`

Workflow에 장기 npm token을 추가하거나 로컬 npm credential을 전달하지 않는다.

### 8. registry, npx, signature 검증

Publish 성공 후 registry를 확인한다.

```bash
npm view codex-usage-analyzer version dist-tags --json
npx --yes codex-usage-analyzer@latest --help
npx --yes codex-usage-analyzer@latest --version
```

실제 account usage smoke가 승인된 경우 raw 값 대신 validator process로 직접 pipe하여 contract version, key set, null/array 구분만 기록한다.

Registry signature는 일회용 검증 디렉터리에서 확인한다.

```bash
VERIFY_DIR="$(mktemp -d)"
cd "$VERIFY_DIR"
npm init -y
npm install codex-usage-analyzer@latest
npm audit signatures
```

검증 디렉터리와 install log에는 credential을 남기지 않는다.

### 9. GitHub Release 생성

npm registry version, published `npx` smoke, `npm audit signatures`가 모두 통과한 뒤 마지막으로 같은 `vX.Y.Z` tag의 GitHub Release를 생성한다.

Release note에는 다음만 기록한다.

- 공개 변경 요약과 breaking 여부
- npm package version
- structural CLI/package smoke 결과
- signature 검증 결과
- 알려진 제한 사항

실제 account usage 값, account identifier, raw stderr, local path는 기록하지 않는다.

## 실패 처리

- version이 registry와 같거나 낮으면 publish를 중단하고 새 version 준비 issue로 돌아간다.
- strict preflight가 실패하면 workflow를 실행하지 않는다.
- workflow가 test 또는 dry-run에서 실패하면 재실행보다 원인 수정 PR을 우선한다.
- npm publish 성공 후 후속 검증이 실패하면 동일 version을 재게시하려 하지 않고 원인을 기록해 별도 수정 release를 준비한다.
- npm publish 전에 실패했다면 GitHub Release를 만들지 않는다.

## 예외

npm 또는 GitHub의 장애로 순서를 완료할 수 없으면 release를 부분 완료 상태로 기록하고 중단한다. 보안 사고 대응으로 긴급 배포가 필요해도 credential 비공개, version 불변성, Trusted Publishing, publish 후 검증 규칙은 생략하지 않는다.

## 관련 매뉴얼

- [`task_workflow_guide.md`](task_workflow_guide.md): release 준비 작업의 issue와 단계 진행
- [`git_workflow_guide.md`](git_workflow_guide.md): task branch와 PR 흐름
- [`release_update_protocol.md`](release_update_protocol.md): Hyper-Waterfall 프레임워크 자체 release/update protocol
- [`agent_code_hyperfall_rule_conflict.md`](agent_code_hyperfall_rule_conflict.md): 승인 경계와 agent 동작 충돌 규칙

# OMA(oh-my-agent) 사용설명서 — 한국어

> **버전**: OMA v8.5.0 · 작성일 2026-05-22
> **대상 독자**: 직접 코딩하지 않는 AI Architect·PM, 부동산 실무 전문가
> **언어**: 한국어 (모든 명령·코드는 영어 원형 유지)

---

## § 1. OMA가 뭐예요?

**한 줄 정의**
OMA(오마, oh-my-agent)는 Claude·Codex·Antigravity 세 AI CLI를 **하나의 시행사처럼 묶어서** 일을 분배·감리해주는 멀티 에이전트 오케스트레이션 도구.

**부동산 비유 (현장 직능 매핑)**

| AI 도구 | 현장 직능 | OMA 안에서의 역할 | 비용 |
|---|---|---|---|
| **Claude (Opus 4.7)** | 시행사·총괄 건축사 | 전략 기획·아키텍처·QA·디버깅 (=중요한 판단) | 高 |
| **Codex (GPT-5.5)** | 시공팀·하도급 업체 | 백엔드·프론트·DB·인프라 코딩 (=실제 손작업) | 中 |
| **Antigravity (구 Gemini CLI 후속)** | 감리단·디자인 컨설팅 | 문서 정리·자료 검색·디자인 (=빠른 처리) | 低 |

**왜 필요한가**

- 한 AI에 다 시키면 **비용 폭증** (Opus가 단순 번역까지 처리)
- 작업별로 가성비 맞춰 분배하면 **30~70% 토큰 절약**
- 31개 전문 스킬 + 18개 워크플로 = **현장 사무소 매뉴얼**

> ⚠️ **현재 한계 (2026-05-22 점검 결과)**
> 사용자 환경(Windows)에서 Codex·Antigravity의 자동 spawn은 OMA 업스트림 버그·정책 제약으로 **현재 실 작동 1/3**(Claude만). 자세한 우회는 § 7 참고.

---

## § 2. 빠른 시작 (3 명령으로 동작 확인)

### Step 1 — 건강검진

```bash
oma doctor
```

기대 출력:
```
✅ antigravity 1.107.0          ← Google AI (구 Gemini 후속)
✅ claude   2.1.147 (Claude Code) ✅
✅ codex    codex-cli 0.132.0 ✅
❌ qwen     -                    ← 미설치 (선택사항, 무시 OK)
✅ Skills (27/27 installed)
✅ All checks passed! Ready to use.
```

❌가 qwen 1개만 있으면 정상. 다른 줄에 ❌가 있으면 § 7 FAQ 참고.

### Step 2 — 명령 목록 확인

```bash
oma --help
```

자주 쓰는 명령 5개:

| 명령 | 용도 | 비용 |
|---|---|---|
| `oma doctor` | 건강검진 (인증·MCP·스킬 상태) | $0 |
| `oma agent:spawn <agent> "<prompt>" <session> -m <vendor>` | 단일 에이전트 호출 | LLM 토큰 |
| `oma agent:status <session>` | 진행 상황 확인 | $0 |
| `oma verify <agent>` | 에이전트 산출물 검증 | $0 |
| `oma link <vendors...>` | 벤더 에이전트 파일 재생성 | $0 (현재 버그) |

### Step 3 — 첫 작업 (Claude 단일 vendor)

```bash
oma agent:spawn pm "할 일 1줄: 'hello world' 출력" my-first-session -m claude
```

성공 시:
```
[pm] Dispatch: native (claude -> claude, same-vendor Claude runtime detected)
[pm] Started with PID xxxxx
[pm] Exited with code 0
```

결과는 `.agents/results/result-*.md` 또는 `<workspace>/.agents/results/`에서 확인.

---

## § 3. 워크플로 18종 — 키워드 한 줄 예시

워크플로 = "여러 에이전트가 순차/병렬로 협업하는 표준 절차서". 프롬프트에 키워드 넣으면 자동 트리거.

| # | 워크플로 | 한 줄 설명 | 트리거 키워드 예시 |
|---|---|---|---|
| 1 | `orchestrate` | 병렬 에이전트 + 리뷰 루프 | "병렬 실행", "do everything" |
| 2 | `work` | 단계별 진행 + 보수 루프 | "step by step", "단계별" |
| 3 | `ultrawork` | 5-Phase 게이트 루프 (11회 리뷰) | "ultrawork", "ulw" |
| 4 | `ralph` | ultrawork 영구 자기 반복 (독립 검증) | "ralph", "지속 실행" |
| 5 | `plan` | PM 작업 분해 | "계획 세워줘", "plan" |
| 6 | `brainstorm` | 디자인 우선 아이디어 | "brainstorm", "아이디어" |
| 7 | `architecture` | 아키텍처 진단·비교·ADR | "architecture", "아키텍처" |
| 8 | `design` | 디자인 시스템·DESIGN.md | "design system", "디자인" |
| 9 | `review` | QA 감사 | "리뷰해줘", "review" |
| 10 | `debug` | 근본원인 + 최소 수정 | "디버그", "에러 고쳐줘" |
| 11 | `deepsec` | 보안 스캐너 (`oma-deepsec`) | "보안 스캔", "deepsec" |
| 12 | `deepinit` | 프로젝트 하네스 초기화 | "프로젝트 초기화", "deepinit" |
| 13 | `scm` | Git 작업 + Conventional Commits | "커밋해줘", "scm" |
| 14 | `docs` | 문서 드리프트 검증·동기 | "문서 검증", "docs" |
| 15 | `pdf` | PDF → Markdown 변환 | "pdf 변환", "PDF to Markdown" |
| 16 | `recap` | 일/기간 AI 대화 요약 | "recap", "오늘 한 일" |
| 17 | `stack-set` | 기술 스택 자동 감지·참조 생성 | "stack-set", "스택 설정" |
| 18 | `tools` | MCP 도구 관리 (자연어) | "tools", "도구 관리" |

**중요 규칙 3개**

1. 🔴 **워크플로는 키워드 자동 감지 또는 명시 호명만**. AI가 임의 시작 X
2. 🔴 **`orchestrate`, `ultrawork`, `work`, `ralph`는 persistent** — 완료 전 종료 시도 차단됨. 강제 종료: 프롬프트에 "workflow done" 입력
3. 🔴 **워크플로 사이클 동안 `.agents/` 직접 수정 금지** — SSOT 보호

---

## § 4. 31개 스킬 카테고리

스킬 = "특정 도메인 전문가 정의서". 각 SKILL.md는 모델/벤더 미고정 → `.agents/oma-config.yaml`에서 라우팅 결정.

### 4.1 전략·기획 (Claude Opus 라우팅)

| 스킬 | 용도 | 키워드 |
|---|---|---|
| `oma-orchestrator` | 전체 조율·세션 관리 | orchestrate, 병렬 실행 |
| `oma-architecture` | 시스템 설계·ADR·트레이드오프 | architecture, 아키텍처 |
| `oma-pm` | 요구사항 분해·우선순위 | planning, 기획 |
| `oma-qa` | 품질 감사·OWASP·접근성 | review, QA |
| `oma-debug` | 근본원인 추적·회귀 테스트 | debug, 에러 |
| `oma-brainstorm` | 디자인 우선 이데이션 | brainstorm |
| `oma-coordination` | 다중 에이전트 수동 가이드 | coordination |

### 4.2 구현 (Codex GPT-5.5 라우팅)

| 스킬 | 용도 | 키워드 |
|---|---|---|
| `oma-backend` | API·DB·인증 (clean architecture) | backend, REST |
| `oma-frontend` | React/Next.js/shadcn | frontend, UI |
| `oma-mobile` | Flutter/React Native | mobile, Flutter |
| `oma-db` | SQL/NoSQL/Vector DB 모델링 | database, ERD |
| `oma-tf-infra` | Terraform 멀티클라우드 | terraform, infra |
| `oma-dev-workflow` | mise·CI/CD·git hooks | dev workflow |
| `oma-scm` | Git·브랜치·worktree | git, scm |

### 4.3 검증·보안 (Claude 라우팅)

| 스킬 | 용도 | 키워드 |
|---|---|---|
| `oma-deepsec` | Vercel deepsec 스캐너 구동 | deepsec, 보안 |
| `oma-observability` | APM·메트릭·트레이스 | observability |

### 4.4 처리·검색·문서 (Antigravity 라우팅)

| 스킬 | 용도 | 키워드 |
|---|---|---|
| `oma-docs` | 문서 드리프트 검증 | docs verify |
| `oma-search` | 의도 기반 검색 라우터 | search, 찾아줘 |
| `oma-scholar` | 학술 논문 사이드카 | scholar, 논문 |
| `oma-market` | 시장 조사·페인 포인트 | 시장조사, market |
| `oma-recap` | 일/기간 대화 요약 | recap, 회고 |
| `oma-hwp` | HWP/HWPX → Markdown | hwp, 한글 문서 |
| `oma-pdf` | PDF → Markdown | pdf 변환 |
| `oma-image` | 멀티 벤더 이미지 생성 | image generation |
| `oma-voice` | TTS/STT (Voicebox MCP) | tts, stt, 음성 |
| `oma-translator` | 컨텍스트 인식 번역 | translate, 번역 |
| `oma-academic-writer` | 학술 영문 작성 | academic writing |
| `oma-design` | 디자인 시스템·DESIGN.md | design system |
| `oma-skill-creator` | 신규 스킬 SSL-lite 작성 | skill creator |

**라우팅 규칙 (Resolution Order)**:
1. `.agents/oma-config.yaml` `agents.<id>.model` 명시적 매핑 (11개 스킬)
2. `custom_presets[model_preset].agents.<role>` 프리셋 매핑
3. `preset.orchestrator` 폴백 = Claude Opus 4.7 (나머지 18개 스킬)

> 💡 **비용 최적화 팁**: 18개 폴백 스킬(번역·HWP·PDF 등)이 Opus로 호출되면 비싸요. `oma-config.yaml`에 `agents.translator: { model: google/gemini-3.5-flash }` 같은 행 추가하면 단가 1/10.

---

## § 5. 3-벤더 오케스트레이션 — `custom-triple-flagship`

### 5.1 현 프리셋 구성

`.agents/oma-config.yaml` `custom_presets.custom-triple-flagship.agents`:

```yaml
orchestrator:  { model: anthropic/claude-opus-4-7 }      # 시행사
architecture:  { model: anthropic/claude-opus-4-7 }      # 총괄 건축사
qa:            { model: anthropic/claude-opus-4-7 }
pm:            { model: anthropic/claude-opus-4-7 }
debug:         { model: anthropic/claude-opus-4-7 }
backend:       { model: openai/gpt-5.5, effort: high }   # 시공팀 (백엔드)
frontend:      { model: openai/gpt-5.5, effort: high }   # 시공팀 (UI)
mobile:        { model: openai/gpt-5.5, effort: medium }
db:            { model: openai/gpt-5.5, effort: high }
tf-infra:      { model: openai/gpt-5.5, effort: medium }
docs:          { model: google/gemini-3.5-flash }        # 감리·디자인
retrieval:     { model: google/gemini-3.5-flash }
```

### 5.2 Antigravity = Gemini CLI 대체 (2026-05 정정)

| 항목 | 변경 전 | 변경 후 |
|---|---|---|
| Google AI CLI 이름 | gemini CLI | **antigravity CLI** |
| 인증 명령 | `gemini auth login` | `antigravity` 첫 실행 시 자동 |
| 폴더 (호환 유지) | `.gemini/agents/` | **`.gemini/agents/` 그대로 사용** (antigravity가 읽음) |
| 모델 이름 | `gemini-3.5-flash` | **`gemini-3.5-flash` 그대로** (antigravity가 호출) |
| Headless 진입점 | (gemini CLI는 가능) | ✅ **`agy --print --dangerously-skip-permissions` 발견** — OMA 로컬 빌드에서 자동 사용 |

> ✅ **2026-05-22 현재 동작**: `oma agent:spawn -m antigravity`가 OMA 로컬 빌드에서 정상 작동.
> result 파일에 `Source: antigravity stdout` 명시. 청사진 3사 자동 오케스트레이션 100% 달성.
>
> 단, `oma update` 자동 업데이트는 우리 로컬 수정을 덮어쓰므로 `.agents/oma-config.yaml`의 `auto_update_cli: false` 유지 + 업데이트는 `bash scripts/oma-upgrade.sh`로만 (§ 7 Q11 참조).

### 5.3 다른 모델로 변경하는 법

```yaml
# .agents/oma-config.yaml — 한 줄만 변경
agents:
  backend: { model: anthropic/claude-sonnet-4-6, effort: medium }   # 더 저렴한 모델로
```

변경 후 즉시 적용. `oma doctor`로 검증.

### 5.4 비용 가이드 (실측 기준, 한 작업당)

| 작업 규모 | Claude Opus | Codex GPT-5.5 | Antigravity Flash |
|---|---|---|---|
| 단순 echo (10K input) | ~$0.15 | ~$0.05 | ~$0.02 |
| 중간 작업 (50K input + 5K output) | ~$0.75 | ~$0.25 | ~$0.10 |
| 큰 작업 (200K input + 20K output) | ~$3.00 | ~$1.00 | ~$0.40 |

세션 quota cap 조정 (`.agents/oma-config.yaml`):
```yaml
session:
  quota_cap:
    tokens: 3_000_000            # 세션 총 토큰
    spawn_count: 60              # 최대 spawn 수
    per_vendor:
      claude: 1_500_000          # Claude 1.5M 캡
      openai: 1_000_000
      google: 500_000
```

---

## § 6. 파생 프로젝트에서 OMA 활용

### 6.1 핵심 사실

OMA는 **부모 폴더의 `.agents/`를 자동 상속하지 않음** (cwd만 검사). 이는 vendor CLI(Claude/Codex/Antigravity)와 다른 동작.

| 도구 | 부모 폴더 SSOT 인식 |
|---|---|
| `claude` (CLAUDE.md) | ✅ 자동 walk-up |
| `codex` (AGENTS.md) | ✅ 자동 walk-up |
| `antigravity` (GEMINI.md) | ✅ 자동 walk-up |
| **`oma` (`.agents/`)** | ❌ **현재 폴더만** |

### 6.2 권장 패턴 A — 부모에서 spawn, 자식에 작업

```bash
# SSOT가 있는 부모 폴더에서 실행
cd C:/Users/user/AI_Orchestra_Lab/projects

# 자식 폴더로 작업 dispatch
oma agent:spawn backend "할 일" my-session -m claude -w ./sub-project-A
```

- ✅ 부모 SSOT(31 skills, 18 workflows) 그대로 활용
- ✅ 작업 결과·파일은 자식 폴더에 격리
- ⚠️ result 파일이 자식 `.agents/results/`에 저장됨 (Issue #8 OMA 업스트림)

### 6.3 패턴 B — 자식 폴더 독립 설치

```bash
cd ./sub-project-B
oma install -y       # 자식 폴더에 .agents/ 신규 설치 (~30초)
oma doctor           # 27/27 통과 확인
```

- ✅ 완전 독립, 부모와 무관
- ⚠️ SSOT 2벌 관리 → 동기화 비용

### 6.4 안티패턴 (작동 안 함)

```bash
cd ./empty-subfolder
oma doctor   # ❌ "No skills installed" + 28 issues
```

빈 서브폴더에서 부모 자동 상속 기대 → 안 됨. 명령 종료 후 `oma install` 권유 프롬프트만 표시.

---

## § 7. 트러블슈팅 FAQ 11개

### Q1. `oma doctor`에 ❌가 여러 개 떠요

| 항목 | 원인 | 해결 |
|---|---|---|
| qwen ❌ | Qwen CLI 미설치 (선택사항) | 무시 OK |
| claude ❌ | Claude Code 미설치 또는 로그아웃 | `claude` 직접 실행해서 로그인 |
| codex ❌ | npm 설치 누락 | `npm install -g @openai/codex` |
| antigravity ❌ | Google Antigravity 미설치 | https://antigravity.google.com 다운로드 |
| Skills (X/27) | 일부 스킬 누락 | `oma install -y` 재실행 |

### Q2. `oma agent:spawn -m codex`가 "Failed to spawn process" — **해결됨**

**과거 문제**: Windows + npm 설치된 codex의 POSIX shell script wrapper가 Node.js `child_process.spawn(shell:false)`와 호환 안 됨.

**현재 해결**: OMA 로컬 빌드의 `spawn-status.ts`가 `codex.exe → codex.cmd → npm codex.js` 자동 보정 + 안전 플래그(`--skip-git-repo-check`, `--ephemeral`, `-s workspace-write`, `--output-last-message`) 자동 주입. **사용자가 `auto_update_cli: false` 유지하는 한 정상 동작**.

업데이트 후 또 깨졌다면 → Q11 참조.

### Q3. `oma agent:spawn -m antigravity` — **해결됨**

**과거 문제**: 컴파일된 OMA가 `-m antigravity`를 명시적으로 거부.

**현재 해결**: OMA 로컬 빌드가 `agy --print --dangerously-skip-permissions` 헤드리스 CLI 사용. result 파일에 `Source: antigravity stdout` 명시. 청사진 3사 자동 오케스트레이션 100% 달성.

검증:
```bash
oma agent:spawn docs "Reply exactly: test" my-session -m antigravity -w ./my-workspace
# → exit 0, .agents/results/result-docs-my-session.md 생성
```

### Q4. 파생 서브폴더에서 `oma doctor`가 "No skills installed"

→ § 6.2 패턴 A 사용 (부모 폴더에서 실행 + `-w <subfolder>`)
또는 § 6.3 패턴 B (자식에 독립 설치)

### Q5. `oma link` "Expected ',' or ']' after array element in JSON"

OMA 업스트림 버그 (Issue #3). 파일명을 명시 안 함. 다행히 기존 `.claude/.codex/.gemini/agents/` 10개 파일 그대로 작동.

### Q6. 워크플로가 자꾸 안 끝나요 (persistent mode)

`orchestrate`/`ultrawork`/`work`/`ralph`는 persistent. 종료하려면:

```
workflow done
```

위 텍스트를 프롬프트에 입력하면 hook이 종료 허용.

### Q7. quota cap 초과로 spawn 거부

```yaml
# .agents/oma-config.yaml에서 캡 증가
session:
  quota_cap:
    tokens: 5_000_000       # 3M → 5M
```

또는 cap 제거하려면 `quota_cap` 블록 자체 삭제.

### Q8. result 파일이 어디 있는지 못 찾겠어요

3개 위치 가능성:
1. `.agents/results/result-{agent}-{sessionId}.md` (이상적)
2. `<workspace>/.agents/results/` (`-w` 사용 시, 실제 동작)
3. `.serena/memories/result-{agent}.md` (MCP 메모리 백업)

OMA Issue #7, #8 (업스트림). `find . -name "result-*.md"` 로 찾는 게 빠름.

### Q9. 비용이 너무 많이 나가요

체크리스트:
1. `oma agent:status <session>` 토큰 사용량 확인 (현재 빈약함 — 매뉴얼 grep `.serena/memories/session-cost-*.md`)
2. `.agents/oma-config.yaml`에 quota cap 설정
3. 18개 폴백 스킬을 저비용 모델로 명시 매핑 (§ 4.4 팁)
4. `model_preset`을 더 저렴한 프리셋으로 변경 (Sonnet/Flash 위주)

### Q10. promptfoo로 OMA 산출물 검수하고 싶어요 — **완성됨**

Phase 9에서 OMA 전용 검수 시스템 구축. 두 채널 모두 LLM 호출 없음(비용 $0):

**채널 1 — promptfoo (5 핵심 skill 공유 schema)**
```bash
cd oma-eval
promptfoo eval -c promptfooconfig.yaml --no-cache -o results.json
# → 100% pass 기대
```

**채널 2 — bun script (29 skill 의미·키워드)**
```bash
bun run oma-eval/static-validate.ts
# → 96.06% overall score (합격선 85%)

bun run oma-eval/static-validate.ts --json    # CI/머신 판독
```

합격선 0.85 (전역 §10-2). 결과 보고서: `docs/test-report/09-promptfoo.md`.

### Q11. OMA를 새 버전으로 안전하게 업데이트하려면? ★ 가장 중요

**현재 상황**:
- OMA 로컬 빌드는 청사진 3사 자동 오케스트레이션을 위해 55개 파일 수정됨 (`C:/Users/user/AI_Orchestra_Lab/core_system/oh-my-agent/`)
- `oma update` 또는 백그라운드 자동 업데이트는 글로벌 cli.js를 registry 버전으로 **덮어씌움** → 청사진 깨짐
- 그래서 `.agents/oma-config.yaml`에 `auto_update_cli: false` 설정 유지

**안전한 업데이트 절차** (사용자 명시적 명령):

```bash
# 1) 현재 글로벌 cli.js가 우리 패치를 들고 있는지 점검
bash scripts/oma-check-drift.sh

# 2) 새 OMA 버전 받기 (git stash workflow)
bash scripts/oma-upgrade.sh
# 또는 Windows: scripts\oma-upgrade.cmd
```

`oma-upgrade.sh`가 하는 일:
1. 글로벌 cli.js 백업 (`backups/oma-upgrade-{timestamp}/`)
2. OMA 소스의 working state를 `git stash --include-untracked`로 완전 보존
3. `git pull --rebase origin main`으로 upstream 최신 fetch
4. `git stash pop`으로 우리 수정 reapply (conflict 발생 시 즉시 정지·사용자 알림·롤백 안내)
5. `bun run typecheck` + `bun run build`
6. 글로벌 cli.js 교체
7. Drift verify (`CHARTER_CHECK`, `antigravity stdout` 마커 grep)
8. Spawn verify (`-m antigravity`로 result 파일 생성 확인, ~$0.02)
9. 실패 시 자동 롤백 + `backups/`에서 복원

**옵션**:
- `--check-only` — drift 감지만 실행, 업그레이드 X
- `--skip-spawn` — spawn 검증 단계 건너뛰기 (비용 절감)

**언제 실행?**:
- `oma-check-drift.sh`가 exit 1 (drift 감지) 보고 시 즉시
- 새 OMA release 노트를 봤을 때 의도적으로
- 매월 1회 점검 (선택)

**한시성**: OMA upstream PR 5건 (Codex Windows, Antigravity headless, charter, docs type, verify priority) 채택 시 `auto_update_cli: true` 복원 + 이 스크립트 불필요. 채택까지 1-2주 예상.

---

## § 8. 비용·토큰 가이드

### 8.1 모델별 단가 (1M tokens 기준 추정)

| 모델 | Input | Output | 호출 비유 |
|---|---|---|---|
| Claude Opus 4.7 | ~$15 | ~$75 | 종합건축사사무소 대표 자문 |
| Claude Sonnet 4.6 | ~$3 | ~$15 | 건축사 1인 사무소 |
| GPT-5.5 (Codex) | ~$5 | ~$25 | 일급 시공 팀장 |
| Gemini 3.5 Flash | ~$0.4 | ~$1.2 | 도면 사보·인쇄 업체 |

### 8.2 작업당 평균 토큰

| 작업 유형 | Input | Output | 예시 |
|---|---|---|---|
| 단순 echo | 10-20K | 100-500 | "Hello world 출력" |
| 코드 1파일 생성 | 30-80K | 1-3K | "REST endpoint 1개 추가" |
| 아키텍처 ADR | 50-150K | 5-15K | "마이크로서비스 vs 모놀리식" |
| 워크플로 1 사이클 | 200K-1M | 20-100K | `orchestrate` 4-agent 분산 |

### 8.3 30일 사용 시나리오 (개인 PM, 부동산 실무)

| 사용 강도 | 일 토큰 | 월 토큰 | 월 비용 |
|---|---|---|---|
| 가벼움 (등기·실거래 조회 보조) | 50K | 1.5M | $5-15 |
| 중간 (계약서·법률 검토 + 시장조사) | 200K | 6M | $30-80 |
| 무거움 (사업수지·재개발 분석 자동화) | 1M | 30M | $150-400 |

---

## § 9. 다음 단계 (사용자 액션)

1. ✅ **Phase 1~7.5 완료**: 청사진 3사 자동 오케스트레이션 100% 달성 + 업데이트 안전망 완비
2. 🟢 **일상 사용**: § 2 빠른 시작 → § 3 워크플로 → § 4 스킬
3. 🟢 **업데이트 점검** (선택): `bash scripts/oma-check-drift.sh` 주기적 실행
4. ⏭️ **OMA 업스트림 이슈 제출**: `docs/test-report/upstream-issues.md`를 https://github.com/first-fluke/oh-my-agent/issues/new 에 단건씩 제출
5. ⏭️ **다음 세션 진행** (선택): 플랜의 Phase 8-10 (갭 보강 / promptfoo / GitHub Actions CI)

---

## § 10. 참고 자료

- 점검 보고서: `docs/test-report/01-health.md` ~ `05-fixes.md` + `08-antigravity-fix.md`
- 업스트림 이슈: `docs/test-report/upstream-issues.md`
- 백업: `docs/test-report/backups-20260522/` (수정 전 9개 파일 + qwen/antig wrapper 잔재)
- OMA 안전 업그레이드: `scripts/oma-upgrade.sh` + `scripts/oma-check-drift.sh` + `scripts/rebuild-oma.sh` (긴급 재빌드)
- SSOT 본체: `.agents/` (절대 직접 수정 금지 — 단 `oma-config.yaml`의 `auto_update_cli: false`는 유지 필수)
- 설정 진입점: `.agents/oma-config.yaml`
- OMA 공식: https://github.com/first-fluke/oh-my-agent
- OMA 로컬 소스 (수정 보존 위치): `C:/Users/user/AI_Orchestra_Lab/core_system/oh-my-agent/`

**현재 상태**: ✅ **청사진 3사 자동 오케스트레이션 100% 달성** (Claude/Codex/Antigravity 모두 자동 spawn). OMA 업데이트 안전망 (`scripts/oma-upgrade.sh`) 완비.

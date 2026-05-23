# Phase 4 — 3-Vendor Live Orchestration 보고서

**실행 일시**: 2026-05-22
**테스트 워크스페이스**: `oma-3vendor-live-test/` (부모 SSOT 사용)
**소요**: ~20분
**비용**: 실측 ~$0.5 미만 (Codex 실패 + Antigravity 즉시 거부로 절약)

---

## 1. 종합 결론 (Critical Finding)

사용자 의도: **Claude Code → 3-vendor 완전 오케스트레이션**.
실제 결과: **현 OMA 구현으로는 불가능**. 3개 중 1개만 spawn 성공.

| Vendor | 결과 | 원인 |
|---|---|---|
| **Claude** | ✅ Native dispatch 성공 | OMA가 same-vendor 자동 감지 → Agent tool 패스 |
| **Codex** | 🔴 **"Failed to spawn process"** | OMA의 codex dispatch 버그 (직접 `codex exec`는 정상) |
| **Antigravity** | 🔴 **Headless 미지원** | OMA가 명시적 거부: `antigravity chat`은 interactive 전용 |

→ **3-vendor 동시 spawn = 1/3 작동**. 사용자 의도의 핵심 갭. CRITICAL.

---

## 2. 테스트 1: Antigravity Spawn 시도

### 명령
```bash
oma agent:spawn docs "..." 3v-test-001 -m antigravity -w ./oma-3vendor-live-test
```

### 결과
```
oma agent:spawn cannot run Antigravity CLI as a headless JSON subprocess.
Open `antigravity chat` and use the oh-my-agent plugin, slash commands,
or `/agents` panel instead.
OMA stages the plugin under `~/.gemini/antigravity-cli/plugins/oh-my-agent/`.
```

### 해석
- 🔴 **CRITICAL-L1**: OMA가 antigravity를 spawn target으로 명시적으로 거부
- 의도된 동작 — 단, 사용자 의도(3-vendor 오케스트레이션)와 충돌
- 우회: 사용자가 직접 `antigravity chat` 열고 OMA 플러그인 사용해야 함
- → Phase 7 (Antigravity native subagent 조사)의 정확한 핵심 이슈

### 비용
$0 (즉시 종료)

---

## 3. 테스트 2: Claude Spawn (성공)

### 명령
```bash
oma agent:spawn pm "Minimal test: write a one-line result 'Hello from Claude Opus via OMA spawn'..." 3v-test-002 -m claude -w ./oma-3vendor-live-test
```

### 결과
```
[pm] Spawning subagent...
  Vendor: claude
  Workspace: C:\Users\user\AI_Orchestra_Lab\projects\oma-3vendor-live-test
  Log: C:\Users\user\AppData\Local\Temp\subagent-3v-test-002-pm.log
  Dispatch: native (claude -> claude, same-vendor Claude runtime detected)
[pm] Started with PID 23760
[pm] Exited with code 0
```

### result 파일
**경로**: `oma-3vendor-live-test/.agents/results/result-claude-opus.md`
**내용**:
```
Status: completed

Hello from Claude Opus via OMA spawn
```

### 핵심 관찰
- ✅ OMA가 **same-vendor 자동 감지 → native dispatch** 채택. `-m claude` override였지만 vendor 일치 시 native 우선.
- ⚠️ result 파일이 `result-pm-3v-test-002.md`가 아닌 `result-claude-opus.md`로 저장 — 네이밍 규칙(session ID 포함) 미준수
- ⚠️ result 파일이 **부모 `.agents/results/`가 아닌 자식 `oma-3vendor-live-test/.agents/results/`에 생성**. SSOT는 부모에서 로드했지만 결과는 cwd 자식에 저장 → 패턴 A 사용 시 결과 추적 분산
- ✅ `oma agent:status 3v-test-002`로 결과 폴링은 가능 (단 출력 거의 비어있음)

### 비용
~$0.1-0.3 (Claude Opus 4.7, 단순 prompt)

---

## 4. 테스트 3 & 4: Codex Spawn (CRITICAL 실패)

### 4.1 시도 1 (Quote 포함 prompt)

```bash
oma agent:spawn backend "Minimal test: write a one-line result 'Hello from Codex GPT-5.5...'..." 3v-test-002 -m codex -w ./oma-3vendor-live-test
```

결과:
```
[backend] Spawning subagent...
  Dispatch: external (claude -> codex, cross-vendor or unsupported native path)
[backend] Failed to spawn process
```

### 4.2 시도 2 (단순 prompt, quote 없음)

```bash
oma agent:spawn backend "Write hello world" 3v-test-003 -m codex -w ./oma-3vendor-live-test
```

결과: **동일 실패** — `[backend] Failed to spawn process`

### 4.3 직접 codex 호출 (대조 검증)

```bash
cd ./oma-3vendor-live-test
codex exec "echo hi" -s read-only --skip-git-repo-check --ephemeral
```

결과: ✅ **정상 작동**. 39,222 토큰 사용. 출력 "hi" 확인.

### 4.4 진단

| 가설 | 검증 |
|---|---|
| Codex CLI 자체 문제 | ❌ 직접 호출은 정상 작동 |
| Quote escaping 문제 | ❌ quote 없는 prompt도 실패 |
| 환경변수 / PATH 문제 | △ 의심 — OMA 자식 프로세스 환경 미상 |
| Windows shell:false 문제 | △ 의심 — Node.js child_process.spawn 시 `.cmd`/`.bat` 처리 |
| Workspace 경로 처리 | △ 의심 — `-w` 플래그 처리 시 cwd 변경 후 codex 못 찾을 가능성 |

→ **OMA의 codex dispatch 구현 버그**. 추가 원인 조사는 Phase 5에서.

### 4.5 비용
$0 (process 시작 실패, 토큰 미사용)

---

## 5. Stop Hook Persistent Mode

**미검증** — 본 테스트는 `oma agent:spawn` 직접 호출이라 workflow trigger 없음. orchestrate workflow는 비용·시간상 별도 세션으로.

→ Phase 7-8 또는 별도 세션에서 검증.

---

## 6. 발견 이슈 정리

| ID | Severity | 위치 | 내용 |
|---|---|---|---|
| L1 | 🔴 CRITICAL | OMA codex dispatch | Codex spawn "Failed to spawn process" — 환경/shell 의심 |
| L2 | 🔴 CRITICAL | OMA antigravity 정책 | Antigravity headless 미지원, 사용자 의도와 갭 |
| L3 | 🟡 HIGH | result 파일 네이밍 | `result-{agent}-{sessionId}.md` 규칙 미준수 (`result-claude-opus.md`) |
| L4 | 🟡 HIGH | result 저장 위치 | `-w <path>` 시 자식 폴더에 결과 저장 — 부모 SSOT 사용 시 추적 분산 |
| L5 | 🟡 MEDIUM | `oma agent:status` | 출력 거의 비어있음 — 토큰 사용량·완료 상태 확인 어려움 |
| L6 | 🟡 MEDIUM | Stop hook 미검증 | orchestrate workflow trigger 없이 검증 불가 |

---

## 7. Phase 4 합격 판정

| 기준 | 결과 |
|---|---|
| 3개 result-*.md 생성 | ❌ 1/3 (Claude만) |
| 3개 다른 CLI 호출 확인 | ❌ 1/3 (Claude native, Codex/Antigravity 실패) |
| Stop hook block 확인 | ⏭️ 미검증 |

→ **Phase 4 부분 합격** (Claude만 검증). **3-vendor 오케스트레이션 자체는 불가** 확정.

---

## 8. 사용자 영향 평가

### 8.1 현 상태로 가능한 사용 패턴

1. **Claude-only**: 단일 vendor로 모든 작업 처리 ✅
2. **Claude Code → Claude Code 멀티 에이전트**: native Agent tool 활용 ✅
3. **수동 vendor 전환**: 사용자가 직접 codex/antigravity 열어서 작업 △

### 8.2 현 상태로 **불가능한** 사용 패턴

1. **Claude Code 안에서 codex 호출** → L1 버그
2. **Claude Code 안에서 antigravity 호출** → L2 정책
3. **orchestrate workflow의 자동 3-vendor 분배** → L1+L2로 인해 1/3만 작동

### 8.3 권장 우회책 (당장)

- 매뉴얼에 "현 OMA는 Claude single-vendor 모드 권장" 명시
- 3-vendor 필요 시 사용자가 수동으로 각 CLI 열어서 작업
- Phase 5에서 L1 (codex) 디버깅 → 해결되면 2-vendor 자동 가능
- Phase 7에서 L2 (antigravity native) 조사 → 해결되면 3-vendor 완전 가능

---

## 9. 다음 액션

- **Phase 5 최우선**: L1 (Codex spawn 실패) 근본 원인 추적·수정
- **Phase 7**: L2 (Antigravity native subagent path) 조사·우회책 마련
- **백로그**: L3 (네이밍), L4 (저장 위치), L5 (status 출력), L6 (Stop hook)

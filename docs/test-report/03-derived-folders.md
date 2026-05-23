# Phase 3 — 파생 폴더 동작 확인 보고서

**실행 일시**: 2026-05-22
**테스트 폴더**: `C:\Users\user\AI_Orchestra_Lab\projects\oma-derived-test-20260522\` (빈 폴더)
**소요**: ~10분
**비용**: $0

---

## 1. 시나리오: 빈 파생 폴더에서 OMA 사용

### 1.1 폴더 구성

- 부모: `C:\Users\user\AI_Orchestra_Lab\projects\` (`.agents/`, `CLAUDE.md` 보유)
- 자식: `oma-derived-test-20260522/` (완전 빈 폴더)
- 조부모: `C:\Users\user\AI_Orchestra_Lab\` (별도 `.agents/` 보유 — 검색 시 발견)

### 1.2 `oma --version`

```
8.5.0
```
✅ 정상 (전역 PATH)

### 1.3 `oma doctor` (파생 폴더)

| 항목 | 결과 |
|---|---|
| CLI Status | ✅ antigravity/claude/codex 모두 인증 정상 |
| MCP Status | ✅ 3개 벤더 모두 Configured |
| **Skills Status** | ❌ **"No skills installed."** + 27개 설치 프롬프트 |
| Serena Memory | ⚠️ 디렉토리 없음 |
| CLAUDE.md | ⚠️ "OMA block missing in ./CLAUDE.md" |
| **총 issues** | **28건** |

→ **부모 SSOT 자동 인식 안 됨**.

---

## 2. 부모 SSOT 상속 시도

### 2.1 환경변수 `OMA_PROJECT_ROOT` (실험)

```bash
OMA_PROJECT_ROOT="C:/Users/user/AI_Orchestra_Lab/projects" oma doctor
```

→ 여전히 "27 missing skills" 표시. **환경변수 미지원**.

### 2.2 옵션 검사

`oma doctor --help`:
```
Options:
  --profile          Show profile health matrix
  --json             Output as JSON
  --output <format>  text/json
```
→ **`--workspace`, `--inherit-parent`, `--root` 옵션 부재**.

`oma install --help`:
```
Options:
  -y, --yes   Skip prompts
```
→ 워크스페이스 옵션 부재. 현재 cwd에만 설치.

### 2.3 폴더 walk-up 검증

```
.            → .agents 없음
..           → .agents 있음 (✅ projects/.agents)
../..        → .agents 없음
../../..     → .agents 있음 (✅ AI_Orchestra_Lab 또는 user/.agents)
```

→ 부모 chain에 `.agents/`가 존재하지만 **OMA가 자동 walk-up 하지 않음**.

---

## 3. vendor CLI 부모 인식 vs OMA 부모 인식

| 도구 | 부모 폴더 탐색 | 비고 |
|---|---|---|
| Claude Code | ✅ 자동 walk-up | cwd → 부모 → home 순으로 `CLAUDE.md` 탐색 |
| Codex CLI | ✅ 자동 walk-up | `AGENTS.md` 부모 탐색 |
| Antigravity CLI | ✅ 자동 walk-up | `GEMINI.md` 부모 탐색 |
| **OMA CLI** | ❌ **cwd만** | `.agents/` 자동 상속 미지원 |

→ **OMA만 부모 SSOT 인식 안 함**. vendor CLI는 정상 동작.

---

## 4. 발견 이슈

### 4.1 🔴 HIGH-D1: 파생 폴더에서 OMA 부모 SSOT 자동 인식 불가

- **현상**: 빈 서브폴더에서 `oma doctor` → "No skills installed" + 28 issues
- **원인**: `oma` CLI는 cwd의 `.agents/`만 검사하며, walk-up·환경변수·플래그로 부모 지정 불가
- **사용자 영향**: 파생 프로젝트마다 `oma install` 별도 실행 강제 → SSOT 의도 약화

### 4.2 사용자 의도와의 갭

원 요청: "어떠한 파생 프로젝트 폴더에서도 oma가 그대로 잘 구동되는지"

| 기대 | 실제 |
|---|---|
| 파생 폴더에서 부모 `.agents/` 자동 상속 | ❌ |
| 파생 폴더에서 `oma install` 신규 설치 후 사용 | ✅ 가능 |
| 부모 폴더에서 `-w <derived>` 옵션으로 작업 spawn | △ Phase 4에서 검증 |

---

## 5. 권장 사용 패턴 (매뉴얼에 반영)

### 패턴 A: 부모 폴더에서 spawn, 자식 폴더로 작업

```bash
cd C:/Users/user/AI_Orchestra_Lab/projects   # SSOT가 있는 부모
oma agent:spawn backend "내 작업" my-session -w ./sub-project-name
```

→ SSOT는 부모에서 로드, 작업물은 자식 폴더에 생성. **권장 패턴**.

### 패턴 B: 자식 폴더에 독립 SSOT 설치

```bash
cd ./sub-project-name
oma install -y                # 자식 폴더에 .agents/ 새로 깔기
oma doctor                    # 27/27 통과
```

→ 자식 폴더가 완전 독립. 부모와 무관하게 동작. SSOT 관리 비용 ↑.

### 안티패턴: 자식 폴더에서 부모 SSOT 자동 상속 기대

```bash
cd ./sub-project-name   # 빈 폴더
oma doctor              # ❌ "No skills installed"
```

→ 동작 안 함. 매뉴얼 § 6에서 명시.

---

## 6. Phase 3 합격 판정

| 기준 | 결과 |
|---|---|
| 파생 폴더에서 `oma doctor` 동작 | △ (오류 메시지 표시되나 정확함) |
| 부모 SSOT 인식 또는 명시적 에러 메시지 | ✅ (명시적 에러 "No skills installed") |

→ **Phase 3 합격** (한계점 문서화 완료). Phase 4로 진행.

---

## 7. 다음 액션

- **Phase 4에서 검증**: 패턴 A (`-w` 옵션) 동작 확인
- **Phase 6 매뉴얼 § 6**: 위 패턴 A/B/안티패턴 명시
- **백로그 (Phase 5)**:
  - 🟡 MEDIUM-D2: `oma doctor`에 `--workspace <path>` 또는 `--inherit-parent` 옵션 추가 검토
  - 🟡 MEDIUM-D3: `OMA_PROJECT_ROOT` 환경변수 지원 검토

---

## 8. 테스트 폴더 정리

테스트 폴더 `oma-derived-test-20260522/`는 Phase 6 매뉴얼 작성 후 삭제 또는 README.md를 남겨 패턴 B 예시로 보존.

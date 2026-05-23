# Phase 1 — Health & Static Audit 보고서

**실행 일시**: 2026-05-22
**대상**: `C:\Users\user\AI_Orchestra_Lab\projects` (OMA v8.5.0)
**소요**: ~10분

---

## 1. `oma doctor` 결과

| 항목 | 상태 | 비고 |
|---|---|---|
| CLI - antigravity | ✅ 1.107.0 | 인증 정상 |
| CLI - claude | ✅ 2.1.147 (Claude Code) | 인증 정상 |
| CLI - codex | ✅ codex-cli 0.132.0 | 인증 정상 |
| CLI - qwen | ❌ 미설치 | 스코프 외 (예상) |
| MCP - antigravity | ✅ `mcp_config.json` | 정상 |
| MCP - claude | ✅ `.claude.json` | 정상 |
| MCP - codex | ✅ `config.toml` | 정상 |
| Skills | ✅ **27/27** | ★ 실제 폴더는 29개 — 불일치 |
| Serena Memory | ✅ 4 files | 정상 |
| CLAUDE.md | ✅ OMA 블록 발견 | 정상 |

**총평**: `oma doctor` 자체는 "All checks passed". 그러나 **skills 카운트 불일치** 발견.

---

## 2. 실제 자산 vs 문서 표기 불일치

### 2.1 스킬 수: 문서 31 vs Glob 29 vs doctor 27

```
Glob `.agents/skills/*/SKILL.md` 결과: 29개
oma doctor 표시: 27개
누락 2개: oma-market, oma-voice
```

| 스킬 | SKILL.md 존재 | `oma doctor` 인식 | 상태 |
|---|---|---|---|
| oma-market | ✅ | ❌ | 🔴 **HIGH** 누락 |
| oma-voice | ✅ | ❌ | 🔴 **HIGH** 누락 |
| (나머지 27개) | ✅ | ✅ | 정상 |

**원인 추정**: `oma doctor`의 skill 카운트 로직이 특정 등록 매니페스트(예: 내부 화이트리스트)에 의존. `oma-market`·`oma-voice`가 등록 누락된 듯.

### 2.2 워크플로 수: 문서 13 vs 실제 18

`.agents/workflows/` 실제 파일 (18개):
```
architecture, brainstorm, debug, deepinit, deepsec, design, docs,
orchestrate, pdf, plan, ralph, recap, review, scm, stack-set,
tools, ultrawork, work
```

CLAUDE.md 표 누락 5개: **architecture, deepinit, design, pdf, stack-set, tools, ralph** (7개)

→ 🟡 **MEDIUM**: 문서 ↔ 실제 동기 필요.

---

## 3. Gemini CLI 잔류 흔적 (사용자 정정: Antigravity로 완전 대체)

### 3.1 검색 결과 요약

| 위치 | 파일 수 | 영향도 |
|---|---|---|
| `.agents/oma-config.yaml` | 1 (다중 라인) | 대부분 주석 — 일부 active |
| `.agents/hooks/core/triggers.json` | 0 | ✅ 깨끗 |
| `.agents/workflows/*.md` | 7개 | 🔴 HIGH — 실 동작 영향 |
| `.agents/skills/**/*.md\|*.yaml` | 17개 | 🔴 CRITICAL 1건 + HIGH 多 |
| `.claude/.codex/.gemini/agents/` | 동기 정상 | ✅ 10개씩 균일 |

### 3.2 🔴 CRITICAL 이슈

**C1. `oma-orchestrator/config/cli-config.yaml` (Line 6)**

```yaml
active_vendor: gemini    # ← oma-config.yaml은 antigravity인데 충돌
```

- 같은 파일에 `antigravity` 벤더 정의 **없음** (Line 10-22 gemini만 존재)
- 만약 oma-orchestrator가 이 cli-config.yaml을 폴백으로 사용한다면 → 실제 spawn 시 잘못된 CLI 호출
- 권장: `active_vendor: antigravity` 변경 + antigravity 벤더 블록 추가

### 3.3 🔴 HIGH 이슈

**H1. `vendor-detection.md` (Line 18·28·42)**
```
3. Gemini CLI: This file was auto-loaded from .agents/skills/ AND @ subagent syntax is available
4. Antigravity IDE: ... AND no @ subagent syntax
```
- Gemini CLI 항목 그대로. Antigravity가 대체했다면 priority 3 제거 또는 통합 필요

**H2. `orchestrate.md` (Line 2·58-59·115·117)**
```
description: ... spawns subagents via Gemini CLI ...
| frontend │ gemini  │
### If Gemini CLI and target vendor is Gemini
```
- 워크플로 설명·예시·dispatch 블록 모두 Gemini 기준

**H3. `oma doctor` 스킬 카운트 누락 (Section 2.1)**
- oma-market, oma-voice 미등록

### 3.4 🟡 MEDIUM 이슈

| ID | 위치 | 내용 |
|---|---|---|
| M1 | `.agents/skills/_shared/runtime/execution-protocols/gemini.md` | 파일 자체가 Gemini용 → `antigravity.md` 추가 또는 리네이밍 |
| M2 | `oma-config.yaml` Line 163-166 | `stage3_role_mapping.gemini_review_roles` 명명 outdated |
| M3 | `oma-config.yaml` Line 109·116·142·166·184·202-203 | 코멘트·description에 gemini 잔존 (실동작 영향 없음) |
| M4 | CLAUDE.md / AGENTS.md / GEMINI.md | 워크플로 표 5-7개 누락 |
| M5 | `oma-config.yaml` Line 63 | `bridge_host: gemini` — 주석 처리됨 (영향 없음), 단 문서적으로 outdated |
| M6 | 워크플로 7개 (work, tools, ultrawork, recap, review, debug, orchestrate) | gemini 언급 잔존 |
| M7 | 스킬 17개 | gemini 언급 잔존 (대부분 모델명·문서) |

---

## 4. SKILL.md Frontmatter 검증

- 29개 SKILL.md 전부 `name:` + `description:` 필수 필드 보유
- 누락 0건 ✅

---

## 5. 벤더 디렉토리 동기화

| 벤더 | 디렉토리 | 파일 수 | 형식 |
|---|---|---|---|
| Claude | `.claude/agents/` | 10 | `.md` |
| Codex | `.codex/agents/` | 10 | `.toml` |
| Antigravity (구 Gemini) | `.gemini/agents/` | 10 | `.md` |

**10개 역할**: architecture-reviewer, backend-engineer, db-engineer, debug-investigator, docs-curator, frontend-engineer, mobile-engineer, pm-planner, qa-reviewer, tf-infra-engineer

→ ✅ 동기화 양호. 단, **29 skills 중 10개만 native subagent 매핑** — 나머지 19개는 spawn-only 또는 inline 처리.

### 5.1 비매핑 19 skills (참고)

oma-academic-writer, oma-brainstorm, oma-coordination, oma-deepsec, oma-design, oma-dev-workflow, oma-hwp, oma-image, oma-market, oma-observability, oma-orchestrator, oma-pdf, oma-recap, oma-scholar, oma-scm, oma-search, oma-skill-creator, oma-translator, oma-voice

---

## 6. 종합 이슈 분류

| Severity | 건수 | 처리 |
|---|---|---|
| CRITICAL | 1 (C1) | Phase 5에서 사용자 승인 후 즉시 수정 |
| HIGH | 3 (H1·H2·H3) | Phase 5에서 사용자 승인 후 즉시 수정 |
| MEDIUM | 7 (M1~M7) | Phase 5에서 백로그(`05-backlog.md`) 기록 |
| LOW | 0 | — |

---

## 7. Phase 1 합격 판정

| 기준 | 결과 |
|---|---|
| `oma doctor` ❌ 0건 | ✅ (단 카운트 불일치는 별도 H3) |
| 31/31 skill frontmatter 통과 | ✅ (실제는 29/29) |
| gemini 잔류 위치 전부 식별 | ✅ (CRITICAL 1 + HIGH 2 + MEDIUM 5 위치 모두 마킹) |

→ **Phase 1 합격**. Phase 2로 진행.

---

## 8. 다음 액션 (Phase 5에서 처리)

1. **즉시 수정**: C1, H1, H2, H3 (4건) — 사용자 승인 후 `.agents/` 수정
2. **백로그**: M1~M7 (7건) — `05-backlog.md` 기록
3. **`oma link` 재실행 권장**: vendor-detection.md 수정 후 .claude/.codex/.gemini/agents/ 재생성

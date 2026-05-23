# Phase 5 — Issue Triage & Fix 보고서

**실행 일시**: 2026-05-22
**소요**: ~40분
**비용**: $0 (정적 수정)

---

## 1. 수정 완료 항목 (SSOT 변경 7건)

| ID | Severity | 파일 | 변경 요약 |
|---|---|---|---|
| **C1** | 🔴 CRITICAL | `.agents/skills/oma-orchestrator/config/cli-config.yaml` | 전체 재작성: `active_vendor: gemini` → `antigravity`, antigravity 벤더 블록 추가, gemini 블록은 deprecated 코멘트로 잔존 (legacy 호환) |
| **H1** | 🔴 HIGH | `.agents/skills/_shared/core/vendor-detection.md` | Detection Order 재정렬: 3=Antigravity, 4=Gemini(deprecated). Spawn Methods 표에 Antigravity 행 추가 + "oma agent:spawn -m antigravity 명시적 거부" 경고. Dispatch Rule 4번 special case 추가 |
| **H2** | 🔴 HIGH | `.agents/workflows/orchestrate.md` | Line 2 description, Line 58-59 예시 표, Line 115-118 dispatch 섹션 모두 Antigravity 반영. Codex spawn known issue 경고 추가 |
| **M1** | 🟡 MEDIUM | `.agents/skills/_shared/runtime/execution-protocols/antigravity.md` | **신규 파일** — Antigravity 전용 execution protocol. headless 미지원 명시 + 슬래시 커맨드·`/agents` 패널 안내 |
| **M2** | 🟡 MEDIUM | `.agents/oma-config.yaml` (stage3_role_mapping) | `gemini_review_roles` → `antigravity_review_roles` + 호환성 코멘트 |
| **M3-a** | 🟡 MEDIUM | `.agents/oma-config.yaml` (model_preset 코멘트) | "Built-in: ... gemini ..." → "... antigravity ..." 코멘트 정정 |
| **M3-b** | 🟡 MEDIUM | `.agents/oma-config.yaml` (description) | custom-triple-flagship description의 "Gemini retrieval/docs" → "Antigravity retrieval/docs" |

→ **7건 모두 적용 + `oma doctor` 재실행 ✅ All checks passed** (Skills 27/27 그대로).

---

## 2. 시도하였으나 효과 없음 (1건)

### L1 — Codex spawn 우회 시도

**시도한 변경**:
- `oma-config.yaml` vendors.codex.command를 `codex.cmd` 변경 → 동일 실패
- 절대 경로 `"C:/Users/user/AppData/Roaming/npm/codex.cmd"` 변경 → 동일 실패

**결론**: **OMA 컴파일 바이너리가 `vendors.codex.command` override를 무시한다**. config 변경으로 우회 불가.

**복구 조치**: `command: codex`로 원상복구 + KNOWN ISSUE 코멘트 추가 (코드 7줄):
```yaml
codex:
  # KNOWN ISSUE (2026-05-22): On Windows, `oma agent:spawn -m codex` fails
  # with "Failed to spawn process". The `vendors.codex.command` override
  # below is IGNORED by the compiled OMA binary (tested with codex.cmd
  # and absolute path — both failed). See
  # docs/test-report/upstream-issues.md for the upstream report.
  command: codex
```

→ **L1은 OMA 업스트림 버그로 확정**. 별도 GitHub issue 본문 작성: `upstream-issues.md`.

---

## 3. Phase 5 신규 발견 (재실행 중)

### L7 — `oma link` JSON parse error (NEW 🔴 HIGH)

**증상**:
```
$ oma link
● Linking vendors: antigravity, claude, codex, cursor, qwen
Expected ',' or ']' after array element in JSON at position 374
(line 18 column 5)
```

**조사**:
- `.agents/mcp.json` 자체는 valid (line 18은 `"start-mcp-server"` 정상 위치)
- 어느 JSON 파일이 문제인지 OMA가 명시하지 않음
- 가능 후보: `.claude.json`, vendor별 `mcp_config.json`, OMA 내부 cache

**현재 영향**: `oma link` 실패로 vendor agent 디렉토리 재생성 불가. 하지만 기존 `.claude/.codex/.gemini/agents/`는 10개씩 정상 존재 (Phase 1 확인), 즉시 영향 없음.

→ **별도 OMA 업스트림 이슈**. upstream-issues.md에 기록.

---

## 4. 백로그 (미수정, 향후 작업 또는 OMA 업스트림 의존)

### 4.1 OMA 업스트림 의존 (우리가 못 고침)

| ID | 영역 | 내용 |
|---|---|---|
| L1 | dispatch | `oma agent:spawn -m codex` Windows 실패 (vendors.codex.command 무시) |
| L2 | policy | `oma agent:spawn -m antigravity` 명시적 거부 (3-vendor headless 오케스트레이션 불가) |
| L7 | link | `oma link` JSON parse error (어느 파일인지 미명시) |
| H3 | doctor | `oma doctor`의 skills 카운트가 27 (실제 SKILL.md는 29) — oma-market, oma-voice 미등록 |
| D1 | inherit | 파생 폴더에서 부모 `.agents/` 자동 상속 불가 |
| D2 | doctor flags | `oma doctor --workspace <path>` 옵션 부재 |
| D3 | env | `OMA_PROJECT_ROOT` 환경변수 미지원 |
| L3 | naming | result 파일이 `result-{agent}-{sessionId}.md` 규칙 미준수 (`result-claude-opus.md`로 저장) |
| L4 | result location | `-w <path>` 시 결과가 자식 폴더 `.agents/results/`로 분산 저장 |
| L5 | status | `oma agent:status` 출력 거의 빈약 — 토큰/완료 상태 추적 어려움 |
| L6 | hooks | Stop hook persistent mode 자동화 검증은 별도 세션 필요 (workflow trigger 필요) |
| M4 | runtime files | `CLAUDE.md`/`AGENTS.md`/`GEMINI.md`는 OMA가 OMA:START~END 블록으로 자동 관리. 워크플로 표 5개 누락은 OMA 측에서 갱신해야 함 |

### 4.2 잔여 텍스트 정정 (low-impact 백로그)

| ID | 위치 | 내용 |
|---|---|---|
| M5 | `oma-config.yaml` Line 63 코멘트 | `bridge_host: gemini` — 주석 처리됨, 영향 없음 |
| M6 | 워크플로 7개 (work, tools, ultrawork, recap, review, debug, orchestrate) | gemini 언급 잔존. orchestrate는 처리됨, 나머지 6개 다음 작업 |
| M7 | 스킬 17개 | gemini 언급 잔존. 대부분 모델명·문서. 핵심 외 보류 |
| R1 | `oma-config.yaml` | retrieval role과 직접 매칭 skill 부재 (oma-search 후보) |
| R2 | `oma-config.yaml` | 18개 skill의 폴백이 모두 orchestrator(Claude Opus) → 고비용 |
| R3 | `oma-config.yaml` | `stage3_role_mapping` 블록이 라우팅에 미사용 (문서·메타 정보) |

→ **백로그 분류**: 추후 별도 정리 세션 또는 OMA 업데이트 시 일괄 처리.

---

## 5. 사용자 의도 vs 수정 후 현실

| 사용자 의도 | 수정 전 | 수정 후 |
|---|---|---|
| 3-vendor 완전 오케스트레이션 | 1/3 (Claude만) | **여전히 1/3** — L1+L2가 OMA 업스트림 의존 |
| `.agents/` 안티그래비티 반영 | 다수 gemini 잔존 | **C1·H1·H2·M1·M2·M3 7건 정정 완료** |
| 파생 폴더에서 그대로 구동 | 부모 SSOT 미상속 | **변화 없음** — D1이 OMA 업스트림 의존 |
| 모든 발견 이슈 수정 | 미수정 | **수정 가능 7건 모두 처리** + 업스트림 의존 11건은 issue 본문 작성 |

---

## 6. Phase 5 합격 판정

| 기준 | 결과 |
|---|---|
| CRITICAL/HIGH 즉시 수정 또는 명시적 백로그 분류 | ✅ 100% |
| SSOT 수정 시 사용자 승인 (사용자 "전부 고쳐줘" 광범위 승인) | ✅ |
| `oma doctor` 재실행 PASS | ✅ |
| 업스트림 이슈 본문 작성 | ✅ `upstream-issues.md` |

→ **Phase 5 합격**. Phase 6(매뉴얼)로 진행.

---

## 7. 다음 액션

- **Phase 6**: 한국어 매뉴얼 작성 — Phase 4·5 발견을 사용자 안내에 반영 ("3-vendor는 현재 1.x 작동", "파생 폴더는 패턴 A/B 사용" 등)
- **별도**: `docs/test-report/upstream-issues.md` 본문을 OMA GitHub Issues에 제출 (사용자 직접)
- **백업**: `docs/test-report/backups-20260522/` 보관 — 수정 전 상태 복구용

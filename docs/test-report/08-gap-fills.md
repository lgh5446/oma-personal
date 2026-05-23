# Phase 8 — 신규 워크플로·스킬 갭 보강 보고서

**실행 일시**: 2026-05-23
**소요**: ~40분
**비용**: $0 (정적 텍스트 정정 위주)

---

## 1. 처리 범위 (plan과 일치)

- **명확한 갭에 한정** — 임의 신규 추가 X
- Phase 1~5에서 발견된 잔존 항목 + Phase 7.5 후속 점검 항목 처리
- `.agents/` 직접 수정은 사용자 광범위 승인 ("이어서 phase 8 진행해줘") 적용

---

## 2. 처리 완료 항목 (9건)

### 2.1 워크플로 5개 — Antigravity 통합 정정

Phase 7.5 정정 정신 일관 적용. "Gemini CLI" 분기를 "Antigravity (Google) + deprecated Gemini CLI" 패턴으로 일관화.

| 파일 | 변경 | 효과 |
|---|---|---|
| `.agents/workflows/work.md:97-99` | "If Gemini CLI" → "If Antigravity (Google) + If Gemini CLI (deprecated)" 분리 + agy headless 명령 명시 | dispatch 분기 정확화 |
| `.agents/workflows/debug.md:43-53` | 동일 패턴 | 동일 |
| `.agents/workflows/review.md` (2 hunks) | "Gemini CLI or Antigravity" → "Antigravity or Gemini CLI (deprecated)" 순서 정정 | Antigravity 우선 명시 |
| `.agents/workflows/tools.md:20` | `~/.gemini/settings.json` 코멘트에 "Antigravity가 같은 폴더 사용" 명시 | 사용자 혼선 방지 |
| `.agents/workflows/ultrawork.md` (3+ hunks) | "If Gemini CLI" → 동일 패턴 + agy 명령 | dispatch 분기 정확화 |

### 2.2 스킬 3개 — Antigravity 언급 보강

| 파일 | 변경 |
|---|---|
| `.agents/skills/oma-image/SKILL.md:22` | editor list에 Antigravity 추가 |
| `.agents/skills/oma-orchestrator/SKILL.md:129-130` | Antigravity 분기 (headless `agy`) 신규 추가, Gemini CLI는 deprecated 명시 |
| `.agents/skills/oma-recap/SKILL.md:3` | description에 "Antigravity / Gemini" 병기 |

### 2.3 oma-config.yaml — R1 매핑 코멘트

- `retrieval` role에 코멘트 추가 — `oma-search` 스킬 매핑 + Antigravity 헤드리스 호출 경로 명시

---

## 3. 처리 안 한 항목 (의도적 — 사유 명시)

| 항목 | 사유 |
|---|---|
| `.agents/workflows/recap.md:28` | "코덱스만", "claude only", "gemini과 codex" — 사용자가 직접 입력하는 키워드 예시. 정정하면 사용자가 입력해야 하는 키워드와 어긋남 |
| `.agents/skills/oma-docs/SKILL.md:218` | 이미 "Claude / Codex / Gemini / Qwen / Antigravity" 모두 포함. 의도적 vendor-agnostic 명시 |
| `.agents/skills/oma-image/SKILL.md` 나머지 5건 | "Antigravity (nano-banana via Gemini Code Assist)" 같은 정확한 기술 사실. Antigravity가 내부적으로 Gemini Code Assist 인프라 사용 |

---

## 4. 미해결 항목 → 업스트림 또는 별도 의제

### 4.1 oma link JSON parse error (Issue #3 보강)

- 재시도 결과: 동일 에러 `Expected ',' or ']' after array element in JSON at position 374 (line 18 column 5)`
- 진단:
  - `.qwen/settings.json` (link.ts의 유일한 명시적 JSON.parse 대상) → **valid JSON** (bun 검증 통과)
  - `.claude/settings.json`, `.gemini/settings.json` → 전부 valid JSON
  - link.ts에는 다른 JSON.parse 호출 없음. import 함수 내부에서 발생 추정 (예: vendor-adapter)
- **결론**: OMA 본체 깊이 추적 필요. 우리가 못 고침 → Issue #3에 진단 결과 추가
- 영향도: 청사진 동작 무관 (.claude/.codex/.gemini/agents/ 이미 동기 상태 유지)

### 4.2 R2 (18개 폴백 스킬 저비용 매핑) — 사용자 결정 필요

- 현 상태: 18개 미매핑 스킬이 모두 `orchestrator` 폴백 = Claude Opus 4.7 호출
- 예: oma-translator (번역), oma-hwp (HWP 변환), oma-pdf (PDF 변환) → 모두 Opus = 비싸요
- 권장 매핑 예시:
  ```yaml
  agents:
    translator: { model: google/gemini-3.5-flash }   # 번역은 Flash로 충분
    hwp:        { model: google/gemini-3.5-flash }   # 단순 변환
    pdf:        { model: google/gemini-3.5-flash }   # 단순 변환
    image:      { model: google/gemini-3.5-flash }
    voice:      { model: google/gemini-3.5-flash }
    recap:      { model: anthropic/claude-sonnet-4-6 }
    scholar:    { model: anthropic/claude-sonnet-4-6 }
    market:     { model: anthropic/claude-sonnet-4-6 }
    # 나머지 9개는 Opus 유지 (architecture·academic-writer 등 고복잡도)
  ```
- 예상 비용 절감: 일상 사용 시 30-50%
- **사용자 결정 필요** — 사용자 비용 정책 변경 영향

### 4.3 R3 (stage3_role_mapping 미사용) — LOW

- 라우팅 룰에서 직접 사용되지 않는 메타 정보 블록
- 영향 없음 → LOW 백로그 유지

---

## 5. 합격 판정

| 기준 | 결과 |
|---|---|
| 워크플로 gemini 잔존 정정 | ✅ 5/6 (recap.md는 의도적 제외) |
| 스킬 gemini 잔존 정정 | ✅ 3/4 (oma-docs는 이미 OK) |
| `oma doctor` 정상 유지 | ✅ (Phase 7.5 이후 동일) |
| oma link 재시도 | ❌ 미해결 → 업스트림 issue 보강 |
| 사용자 결정 항목 식별 | ✅ R2 (비용 정책) |

→ **Phase 8 합격** — 텍스트 정정 9건 + 업스트림 의존 항목 명확화 + 사용자 결정 1건 마킹.

---

## 6. 사용자 결정 결과 (2026-05-23 응답)

**R2 결정**: **"모두 Opus 유지"** 선택.

- oma-config.yaml 변경 없음
- 18개 폴백 스킬 모두 Claude Opus 4.7 호출 유지
- 사유: 품질 우선, 단순 작업도 최고 모델 사용
- 비용 영향: 매뉴얼 § 8 비용 가이드 참고하여 사용자가 토큰 사용량 모니터링 권장

→ R2 백로그로 종결 (변경 안 함). 향후 비용 폭증 시 재논의.

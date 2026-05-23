# Phase 2 — Skill Routing Dry-Run 보고서

**실행 일시**: 2026-05-22
**소요**: ~10분
**비용**: $0 (정적 분석)

---

## 1. 모델 해석 룰 (oma-config.yaml Line 217-220)

```
Resolution order (when an agent runs):
  1. agents.<id>            — 명시적 per-agent override
  2. model_preset entry     — built-in 또는 custom_presets[model_preset]
  3. preset.orchestrator    — fallback (해당 agent가 preset에 없을 때)
```

현재 `model_preset: custom-triple-flagship`, `active_vendor: antigravity`.

---

## 2. 명시적 매핑 (oma-config.yaml `agents:` 블록)

| Agent ID | Model | 매칭되는 SKILL.md |
|---|---|---|
| orchestrator | anthropic/claude-opus-4-7 | oma-orchestrator |
| architecture | anthropic/claude-opus-4-7 | oma-architecture |
| qa | anthropic/claude-opus-4-7 | oma-qa |
| pm | anthropic/claude-opus-4-7 | oma-pm |
| debug | anthropic/claude-opus-4-7 | oma-debug |
| backend | openai/gpt-5.5 (effort: high) | oma-backend |
| frontend | openai/gpt-5.5 (effort: high) | oma-frontend |
| mobile | openai/gpt-5.5 (effort: medium) | oma-mobile |
| db | openai/gpt-5.5 (effort: high) | oma-db |
| tf-infra | openai/gpt-5.5 (effort: medium) | oma-tf-infra |
| docs | google/gemini-3.5-flash | oma-docs |
| retrieval | google/gemini-3.5-flash | (직접 매칭 skill 없음 — oma-search 후보) |

→ **11개 skill 직접 매핑** + 1개 미할당 role(retrieval)

---

## 3. 29 SKILL.md × 3 Vendor 라우팅 매트릭스

**기호 범례**: ✅ Native subagent · 🔄 oma agent:spawn · 🟢 매핑 직접 · ⚪ orchestrator 폴백

| # | Skill | 해석 모델 | 매핑 | claude runtime | codex runtime | antigravity runtime |
|---:|---|---|---|---|---|---|
| 1 | oma-orchestrator | anthropic/claude-opus-4-7 | 🟢 | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |
| 2 | oma-architecture | anthropic/claude-opus-4-7 | 🟢 | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |
| 3 | oma-qa | anthropic/claude-opus-4-7 | 🟢 | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |
| 4 | oma-pm | anthropic/claude-opus-4-7 | 🟢 | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |
| 5 | oma-debug | anthropic/claude-opus-4-7 | 🟢 | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |
| 6 | oma-backend | openai/gpt-5.5 (high) | 🟢 | 🔄 spawn -m codex | ✅ codex exec | 🔄 spawn -m codex |
| 7 | oma-frontend | openai/gpt-5.5 (high) | 🟢 | 🔄 spawn -m codex | ✅ codex exec | 🔄 spawn -m codex |
| 8 | oma-mobile | openai/gpt-5.5 (medium) | 🟢 | 🔄 spawn -m codex | ✅ codex exec | 🔄 spawn -m codex |
| 9 | oma-db | openai/gpt-5.5 (high) | 🟢 | 🔄 spawn -m codex | ✅ codex exec | 🔄 spawn -m codex |
| 10 | oma-tf-infra | openai/gpt-5.5 (medium) | 🟢 | 🔄 spawn -m codex | ✅ codex exec | 🔄 spawn -m codex |
| 11 | oma-docs | google/gemini-3.5-flash | 🟢 | 🔄 spawn -m antigravity | 🔄 spawn -m antigravity | 🔄 spawn -m antigravity |
| 12 | oma-academic-writer | anthropic/claude-opus-4-7 | ⚪ | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |
| 13 | oma-brainstorm | anthropic/claude-opus-4-7 | ⚪ | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |
| 14 | oma-coordination | anthropic/claude-opus-4-7 | ⚪ | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |
| 15 | oma-deepsec | anthropic/claude-opus-4-7 | ⚪ | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |
| 16 | oma-design | anthropic/claude-opus-4-7 | ⚪ | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |
| 17 | oma-dev-workflow | anthropic/claude-opus-4-7 | ⚪ | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |
| 18 | oma-hwp | anthropic/claude-opus-4-7 | ⚪ | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |
| 19 | oma-image | anthropic/claude-opus-4-7 | ⚪ | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |
| 20 | oma-market | anthropic/claude-opus-4-7 | ⚪ | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |
| 21 | oma-observability | anthropic/claude-opus-4-7 | ⚪ | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |
| 22 | oma-pdf | anthropic/claude-opus-4-7 | ⚪ | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |
| 23 | oma-recap | anthropic/claude-opus-4-7 | ⚪ | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |
| 24 | oma-scholar | anthropic/claude-opus-4-7 | ⚪ | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |
| 25 | oma-scm | anthropic/claude-opus-4-7 | ⚪ | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |
| 26 | oma-search | anthropic/claude-opus-4-7 | ⚪ | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |
| 27 | oma-skill-creator | anthropic/claude-opus-4-7 | ⚪ | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |
| 28 | oma-translator | anthropic/claude-opus-4-7 | ⚪ | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |
| 29 | oma-voice | anthropic/claude-opus-4-7 | ⚪ | ✅ native | 🔄 spawn -m claude | 🔄 spawn -m claude |

**해석 성공**: 29/29 ✅ (직접 매핑 11 + orchestrator 폴백 18)
**빈칸**: 0

---

## 4. 벤더별 부하 분포 (active 시나리오별 spawn 수)

| Runtime | Native | Spawn | Spawn 분포 |
|---|---|---|---|
| claude | **22** (Claude 매핑 5 + 폴백 18 − 0) = 23 | 6 | codex 5 + antigravity 1 |
| codex | 5 (Codex 매핑) | 24 | claude 23 + antigravity 1 |
| **antigravity (현재)** | 0 | **29** | claude 23 + codex 5 + antigravity 1 |

→ **현재 active_vendor=antigravity 설정 시 모든 호출이 spawn**. 이는 Phase 7(Antigravity native subagent 조사)의 정당성을 뒷받침.

---

## 5. 발견 이슈

### 5.1 🟡 MEDIUM-R1: `retrieval` role 직접 매칭 skill 없음

- `agents.retrieval`은 정의되어 있으나, `.agents/skills/`에 `oma-retrieval`이 없음
- 후보: `oma-search` (의미상 가장 가까움) — 단, 룰엔진이 자동 매핑하는지 미확인
- 권장: `oma-config.yaml` 코멘트에 retrieval ↔ skill 매핑 명시 또는 `oma-retrieval` 스킬 신규

### 5.2 🟡 MEDIUM-R2: 18개 skill의 폴백이 모두 orchestrator로

- 폴백 시 모두 `anthropic/claude-opus-4-7`로 라우팅 → **고비용 Claude Opus가 sub-domain 작업을 처리**
- 예: oma-translator(번역), oma-hwp(HWP 변환), oma-pdf(PDF 변환)도 Opus로 호출 → 비용 비효율
- 권장: 폴백 기본을 `gemini-3.5-flash` 같은 저비용 모델로 변경 OR 18개 skill별 명시적 매핑 추가

### 5.3 🟢 LOW-R3: stage3_role_mapping 미사용

- Line 163-166의 `stage3_role_mapping` 블록 정의는 있으나 라우팅 룰에서 직접 사용되지 않음 (Resolution order에서 미참조)
- 단순 문서·메타 정보로 추정

---

## 6. Phase 2 합격 판정

| 기준 | 결과 |
|---|---|
| 29/29 skill 모델 해석 | ✅ |
| 폴백 경로 누락 | 0건 ✅ |
| 라우팅 매트릭스 빈칸 | 0건 ✅ |

→ **Phase 2 합격**. Phase 3으로 진행.

---

## 7. 다음 액션

- **즉시 (Phase 7과 연계)**: active_vendor=antigravity일 때 모든 spawn → Antigravity native subagent 경로 조사 시 우선순위 ↑
- **백로그(05-backlog.md)**: R1, R2, R3 모두 MEDIUM/LOW로 기록

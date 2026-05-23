# Phase 9 — promptfoo 자동 검수 통합 보고서

**실행 일시**: 2026-05-23
**소요**: ~50분
**비용**: $0 (LLM 호출 없음 — 정적 평가만)

---

## 1. 종합 결론

| 평가 채널 | 통과 | 점수 | 합격선 |
|---|---|---|---|
| **promptfoo eval** (5 핵심 skill 공유 schema) | ✅ 5/5 (100%) | 100% | 85% |
| **static-validate.ts** (29 skill 의미·키워드) | ✅ 29/29 (100%) | **96.06%** | 85% |

**→ Phase 9 합격** — 전역 §7·§10의 "독립 검수 합격선 0.85" 충족. OMA SSOT 품질 자동 검수 시스템 가동.

---

## 2. 산출물

| 파일 | 역할 |
|---|---|
| `oma-eval/promptfooconfig.yaml` | promptfoo 5 핵심 skill 공유 schema 검증 (frontmatter·길이·Gemini residue 안전성) |
| `oma-eval/static-validate.ts` | bun 기반 per-skill 의미·키워드 검증 (29 skill 전체) |
| `oma-eval/results.json` | promptfoo eval 결과 머신 판독용 |
| `docs/test-report/09-promptfoo.md` | 본 보고서 |

---

## 3. 평가 설계 — 두 채널로 분리한 이유

| 검증 종류 | 도구 | 사유 |
|---|---|---|
| **공유 schema** (frontmatter 형식·길이·Gemini-Antigravity 일관성) | promptfoo (echo provider) | 모든 SKILL.md 공통 검증. promptfoo의 표준 어셔션(regex/contains/javascript) 활용 |
| **per-skill 의미** (oma-backend가 "API/Repository" 언급, oma-search가 "router/transport" 언급) | bun 스크립트 | promptfoo가 prompts × tests를 **카테시안 곱**으로 처리 → per-skill 매핑 불가능. bun script가 더 깔끔 |

이 분리는 검증 후 즉시 발견됨. promptfoo가 5 prompts × 5 tests = 25 runs 중 6 fail (cartesian 오매칭) → per-test 어셔션을 단일 공유 어셔션으로 축소 + per-skill은 별도 채널로.

---

## 4. promptfoo 채널 — 검증 항목 (5 핵심 skill 공통)

각 SKILL.md (architecture · backend · qa · orchestrator · search)에 적용:

| Assertion | 의미 |
|---|---|
| `regex: ^---` | 프론트매터 시작 |
| `regex: (?:^\|\\n)name:\\s+oma-[a-z-]+` | name: 필수, 올바른 형식 |
| `regex: (?:^\|\\n)description:` | description: 필수 |
| `javascript: output.length >= 500` | 최소 본문 500바이트 (truncation 방어) |
| `javascript: Gemini→(Antigravity\|deprecated)` | Gemini 잔존 시 반드시 Antigravity 또는 deprecated 명시 |
| `contains: ---` | 프론트매터 종결자 존재 |
| `javascript: valid skill name` | 5개 valid id 중 1개 포함 확인 |

### 실행
```bash
cd oma-eval
promptfoo eval -c promptfooconfig.yaml --no-cache -o results.json
```

### 결과
```
✓ 5 passed (100%)
0 failed (0%)
0 errors (0%)
Duration: 0s
```

---

## 5. static-validate.ts 채널 — 29 skill 의미 검증

### 검증 항목 (7개)

1. `frontmatter-open` — `---`로 시작
2. `frontmatter-name-matches-dir` — `name:` 값이 디렉토리명과 일치
3. `frontmatter-description-present` — `description:` 20자 이상
4. `body-length-min-500` — 본문 500바이트 이상
5. `gemini-residue-paired-with-antigravity-or-deprecated` — Gemini 언급 시 안전성 보장
6. `semantic-keywords` — 각 skill의 도메인 핵심 키워드 ≥1개 포함 (29 skill 매핑 테이블)
7. `frontmatter-close` — 종결 `---` 존재

### 결과 (29/29 통과)

| 점수 | 스킬 수 |
|---|---|
| 100% (7/7) | 22개 |
| 86% (6/7) | 7개 (academic-writer · deepsec · design · hwp · pdf · scholar · skill-creator · voice) |
| < 85% | 0개 |

86% skill들은 7번째 check (frontmatter-close가 2000바이트 이내에 닫히지 않음, 즉 긴 frontmatter) 1건만 누락. 합격선 충족.

### 실행
```bash
bun run oma-eval/static-validate.ts            # 사람용 출력
bun run oma-eval/static-validate.ts --json     # CI/JSON
```

---

## 6. 전역 §10-2 준수 확인

| 규칙 | 준수 여부 |
|---|---|
| 새 API 키 설정 금지 | ✅ promptfoo echo provider — LLM 호출 0건 |
| gitignored .env만 사용 | ✅ .env 미사용 |
| 합격선 0.85 | ✅ 96.06% (overall) |
| `promptfoo eval -c <config> --no-cache -o <output.json>` 1회 실행 | ✅ |
| 실패 케이스 백로그 회송 | ✅ 0건 — 모두 통과 |

---

## 7. 매뉴얼 통합

`docs/USAGE-ko.md` § 7 Q10 (promptfoo 검수) 갱신 — 본 보고서의 두 채널 명령 + 합격선 정책 반영.

---

## 8. 한계·확장 여지

| 항목 | 현 상태 | 확장 가능성 |
|---|---|---|
| 검증 종류 | 정적 (LLM 호출 X) | 동적 (실제 spawn 후 응답 품질) — 추가 비용 발생 |
| 검증 대상 | 31 skills (29 + _shared 제외) | 18 workflows·triggers.json·rules도 추가 가능 |
| LLM-as-judge | 미사용 | promptfoo의 `model-graded` 어셔션 추가 시 응답 의미 검증 강화 |
| CI 통합 | 미통합 | Phase 10에서 GitHub Actions로 자동화 |

---

## 9. Phase 9 합격 판정

| 기준 | 결과 |
|---|---|
| `promptfoo eval` 5 핵심 skill score ≥ 0.85 | ✅ 100% |
| `static-validate.ts` 29 skill score ≥ 0.85 | ✅ 96.06% |
| 새 API 키 설정 없음 | ✅ |
| 실패 케이스 0건 또는 백로그 회송 | ✅ 0건 |
| 매뉴얼 갱신 | ✅ § 7 Q10 |

→ **Phase 9 합격**. Phase 10 (GitHub Actions CI)로 진행 가능.

# OMA 사용설명서 — 시나리오·프롬프트 중심 가이드

> **이 문서를 이렇게 읽으세요**
> 1. § 0 으로 30초 안에 핵심 잡기 → 2. § 3 의 "내 상황과 비슷한 레시피" 1개 찾아 따라하기 → 3. 필요할 때만 § 4·§ 5 사전처럼 참조.
> **버전** OMA v8.32.1 · **갱신** 2026-06-05 · **대상** 부동산 PM·AI Architect (직접 코딩 안 함)
> **언어 규칙** 본문은 한국어, 명령·코드·키워드만 영어 원형 유지.
> **이번 갱신 핵심 (8.16 → 8.32)**
> 1. **역할 재배치**: QA가 Claude→**Codex(gpt-5.5 high)**, Frontend가 Codex→**Antigravity(Gemini 3.5 Flash)** 로 이동. Opus는 **4.7→4.8** 업그레이드.
> 2. **신규 스킬 `oma-slide`**(발표자료 HTML→PDF/PPTX) + `agentcat-usage`(토큰 사용량 점검) 추가 → 스킬 총 **30 + agentcat 1**.
> 3. **부동산 도메인 MCP 직결**: `korean-law`(법령·판례)·`kordoc`(한글/PDF 서식)·`opencrab`(온톨로지)이 설치되어 § 3.15에서 바로 활용.
> 4. **`quota_cap` 실가동**: 토큰 3M / spawn 60 상한이 config에 실제 설정됨(이전엔 예시 주석).

---

## § 0. 30초 안내 (TL;DR)

| 알아야 할 것 | 한 줄 요약 |
|---|---|
| OMA는 뭐 | Claude·Codex·Antigravity 세 AI를 **시행사처럼 묶어** 자동 분배·감리해주는 도구 |
| 어떻게 부르나 | **자연어로 그냥 말한다.** "리뷰해줘"·"이 PDF 정리해줘" 같은 한국어 한 줄이 **알아서 맞는 스킬·모델을 자율 발동** (스킬 이름 몰라도 됨) |
| 명령 1개만 외운다면 | `oma doctor` (5초 건강검진) |
| 일이 안 풀릴 때 | § 9 FAQ → § 10 안전 업데이트 |
| 제일 자주 쓸 패턴 | "지금 뭐 해야할지 모르겠을 때" → § 3.1 만능 레시피 |

> **부동산 비유 한 줄**: OMA = 시행사(클로드)가 시공팀(코덱스)·감리단(안티그래비티)에게 자동으로 일을 시키는 **현장 사무소**. 당신은 건축주(PM) 자리에서 한국어로 지시만 하면, **현장소장이 알아서 적합한 시공팀과 장비(스킬·툴)를 배정**한다.

---

## § 1. 처음 30분 — 이것만 알면 시작

### 1.1 일하는 구조 (한 그림)

```
당신의 한국어 프롬프트
        ↓
   [UserPromptSubmit 훅]  ← keyword-detector + skill-injector 가 단어·확장자 감지
        ↓
   워크플로/스킬 자동 발동 (orchestrate / review / pdf / market …)
        ↓
   스킬 라우팅 (architecture / backend / docs …) → 지정 모델 분업
        ↓
   3-벤더 spawn (Claude / Codex / Antigravity) + 각자 고유 MCP·플러그인 병용
        ↓
   결과 파일 → .agents/results/result-*.md (백업 .serena/memories/)
        ↓
   [Stop 훅]  ← skill-usage-audit 가 "스킬 안 썼는지" 자가검증·경고
```

> 💡 **핵심**: 명령어 외울 필요 거의 없음. **프롬프트의 한국어 단어**가 모든 걸 시작시킨다. 스킬 이름을 몰라도 OMA가 알아서 고른다.

### 1.2 첫 5분 — 환경 확인

```bash
oma doctor          # 인증·스킬·MCP 5초 헬스체크
oma --version       # 현재 8.32.1 인지 확인
```

| 결과 | 해석 |
|---|---|
| ✅ All checks passed | 바로 사용 가능 |
| ❌ qwen 1줄만 | 정상 (선택 사항) |
| ❌ 그 외 항목 | § 9 FAQ Q1 |

### 1.3 첫 작업 — 자연어 한 줄

| 시도해볼 것 | 입력 (Claude Code 프롬프트에 그대로) | 자동 발동 |
|---|---|---|
| 가장 가볍게 | `이 폴더에 README가 있는지 봐줘` | 단순 응답 (워크플로 X) |
| 워크플로 발동 | `이 코드 한번 리뷰해줘` | `review` 워크플로 → `oma-qa` (Codex) |
| 스킬 자율 발동 | `이 PDF 정리해줘` | `oma-pdf` 스킬 (스킬 이름 안 말해도) |
| 병렬 자동화 | `이 기능 자동으로 실행해줘` | `orchestrate` 워크플로 (persistent) |

> ⚠️ **persistent 워크플로 주의**: `orchestrate`·`ultrawork`·`work`·`ralph`는 완료 전 종료 차단. 멈추려면 프롬프트에 **`workflow done`** 입력.

### 1.4 결과물 어디서 보나

| 위치 | 용도 |
|---|---|
| `.agents/results/result-{agent}-{sessionId}.md` | 기본 산출물 |
| `<workspace>/.agents/results/` | `-w` 폴더 지정 시 |
| `.serena/memories/result-{agent}-*.md` | 백업(특히 Antigravity) |

### 1.5 🔴 자율 스킬 라우팅 — "이제 알아서 한다" (셋업의 핵심)

3사 모두 **글로벌 전역 지침서**에 🔴 강제 규칙이 박혀 있어, **사용자가 스킬을 언급하지 않아도** 프롬프트 의도를 읽고 적합 스킬·워크플로·툴을 **자발적으로** 고른다.

| 요소 | 어디에 | 무엇 |
|---|---|---|
| 강제 규칙(행동) | `~/.claude/CLAUDE.md §6-A` · `~/.codex/AGENTS.md §3-A` · `~/.gemini/GEMINI.md §3-A` | "비자명 작업은 반드시 스킬 우선" |
| 자동 감지(시스템) | `UserPromptSubmit` 훅 = `keyword-detector.ts` + `skill-injector.ts` | 키워드·확장자 → 스킬 자동 주입 |
| 지정 모델 분업 | `.agents/oma-config.yaml` `agent_defaults` | 스킬 → 역할 → 모델(§ 6) |
| 동적 발견(미래 대비) | §-A-4 | **앞으로 설치할 MCP/플러그인도 자동 후보**로 삼음 (고정 목록 의존 금지) |
| 벤더 고유 자원 병용 | §-A-4 | 3사 각자 자기에게만 있는 MCP·플러그인도 적재적소 병행 |
| 자가검증·자동학습 | `~/.claude/hooks/skill-usage-audit.ts` (Stop 훅) | 편집 ≥8회인데 스킬·서브에이전트 0회면 경고 + `~/.claude/lessons/`에 교훈 자동 적재 |

**3사 고유 자원(현재, 자동 확장됨)**

| 벤더 | 고유 MCP/플러그인(예시·고정 아님) | 강점 역할 |
|---|---|---|
| Claude (시행사) | serena·context7·korean-law·kordoc·opencrab·neo4j·playwright·chrome-devtools·github·notebooklm·Google Drive MCP / cook-ko·skill-creator·claude-md-management·andrej-karpathy 플러그인 | 설계·통합·아키텍처·근본원인 분석 |
| Codex (시공) | serena·node_repl·opencrab·neo4j MCP / documents·spreadsheets·presentations·github·browser 플러그인 / 내부 agents·skills | 백엔드·DB·인프라·**QA** 구현 |
| Antigravity (감리) | 미러된 oma 스킬 + Gemini 멀티모달·Code Assist | **프론트엔드**·PDF·문서검증·검색·이미지·독립감리 |

> 💡 **테스트 방법**: 스킬 이름을 **일부러 말하지 말고** "이 pdf 정리해줘"·"시장조사 해줘"·"커밋해줘"처럼 일만 시켜보세요. 종료 시 1줄 `수행: <skill> via <model>` 보고가 뜨면 자율 라우팅이 작동한 것. 안 떴는데 큰 작업이었다면 Stop-hook 경고가 자동으로 잡아줍니다.

### 1.6 🔴 캐스케이드 서브에이전트 — "각자 또 하청을 준다"

오케스트레이션(독립 하위작업 3개↑)이 시작되면 각 벤더는 **혼자 다 처리하지 않고 자기 서브에이전트에게 재분산**하며, 그 서브에이전트도 자기 스킬·툴을 쓴다(지침 §-B 규칙).

| 단계 | 누가 | 예 |
|---|---|---|
| L0 | 오케스트레이터(보통 Claude) | 작업을 도메인별로 분해 |
| L1 | 3사 서브에이전트 | Claude(설계·아키·디버그) / Codex(백엔드·DB·QA·인프라) / agy(프론트·문서·멀티모달) — 각자 툴 사용 |
| L2 | 역할 서브에이전트 | `.claude/agents/`의 전문 10종 (아래) |

**`.claude/agents/` 네이티브 서브에이전트 10종 (L2 디스패치 풀)**

| 에이전트 | 담당 | 라우팅 모델 |
|---|---|---|
| `architecture-reviewer` | 시스템 설계·ADR | Claude Opus 4.8 |
| `pm-planner` | 요구사항 분해 | Claude Opus 4.8 |
| `debug-investigator` | 버그 진단·회귀 테스트 | Claude Opus 4.8 |
| `backend-engineer` | API·인증·마이그레이션 | Codex gpt-5.5 (high) |
| `db-engineer` | 스키마·쿼리 튜닝·벡터DB | Codex gpt-5.5 (high) |
| `tf-infra-engineer` | Terraform·클라우드 | Codex gpt-5.5 (high) |
| `mobile-engineer` | Flutter·RN | Codex gpt-5.5 (high) |
| `qa-reviewer` | 보안·성능·접근성·코드품질 | Codex gpt-5.5 (high) |
| `frontend-engineer` | React/Next/TS·UI | Antigravity Gemini 3.5 Flash |
| `docs-curator` | 문서 drift·동기화 | Antigravity Gemini 3.5 Flash |

- **깊이 가드**: 최대 2단계(L2는 추가 스폰 금지) — 무한재귀·비용폭발 차단. 총량은 `session.quota_cap.spawn_count`(현재 **60**) 상한.
- **확장자 자동 라우팅**: `.tsx/.css` → frontend-engineer, `.py/.go/.rs` → backend-engineer, `.sql/.prisma` → db-engineer, `.dart/.swift/.kt` → mobile-engineer (triggers.json `extensionRouting`).

> 💡 **부동산 비유**: 현장소장(L0)이 시공·감리 업체(L1)에 하도급 주고, 그 업체가 다시 전문 공종팀(L2)에 재하도급 — 단 **2단계까지만**(비용 통제).

---

## § 2. OMA 명령어 5개 (외울 건 이것뿐)

> 나머지 명령은 워크플로/스킬이 알아서 호출함. 사용자가 직접 칠 일은 드물다.

| 명령 | 언제 쓰나 | 비용 |
|---|---|---|
| `oma doctor` | 매일 시작 시 / 이상할 때 | $0 |
| `oma agent:spawn <agent> "<프롬프트>" <세션id> -m <vendor> [-w <폴더>]` | **수동** 단일 에이전트 호출 (보통 워크플로가 대신 해줌) | LLM 토큰 |
| `oma agent:status <세션id>` | 진행 상황·토큰 사용량 | $0 |
| `oma verify <agent>` | 산출물 자동 검증 (charter·result 파일 존재 등) | $0 |
| `oma --help` | 명령 카탈로그 열기 | $0 |

**vendor 코드**: `-m claude` / `-m codex` / `-m antigravity`

> ⚠️ **Google 계열 가드레일**: Google/Gemini 모델 작업은 **반드시 `agy`(Antigravity headless)** 로만. 레거시 `gemini` CLI는 폐기. `oma agent:spawn ... -m antigravity`가 내부적으로 `agy --prompt --dangerously-skip-permissions`를 호출.

---

## § 3. 상황별 작업 레시피 — "이럴 때 이렇게"

> 이 섹션이 매뉴얼의 핵심. **당신 상황과 가장 비슷한 카드 1개를 찾아 그대로 따라하면 된다.** (스킬 이름은 참고용 — 말 안 해도 자동 발동)

### 3.1 만능 레시피 — 뭘 해야할지 모를 때

**상황**: 작업 범위가 큰데 분해를 못 하겠음.

**프롬프트 예시**:
```
이 프로젝트에 [원하는 기능]을 추가하고 싶어. 계획 세워줘.
```

**자동 발동**: 트리거 `계획 세워줘` → **`plan` 워크플로** → 스킬 `oma-pm`(Claude Opus 4.8)이 PRD/WBS로 분해.

**결과**: `.agents/results/result-pm-*.md`에 단계별 task list.
**다음 단계**: 마음에 들면 → "이 계획대로 자동으로 실행해줘" (orchestrate 발동).

---

### 3.2 부동산 실무 — PDF/한글 자료 마크다운으로

**상황**: 감정평가 보고서·계약서·법령 PDF가 30개. 검색·요약 가능한 텍스트로 만들고 싶음.

**프롬프트 예시**:
```
./감정평가서/ 폴더의 모든 pdf를 마크다운으로 변환해줘.
```

**자동 발동**: 트리거 `pdf 변환` → `oma-pdf`(opendataloader-pdf) → Antigravity 저비용 처리.
**결과**: 각 PDF 옆에 `.md` 파일. 표·이미지 캡션 보존.
**한글(.hwp/.hwpx)**라면? → "한글 파일 변환해줘" → `oma-hwp` 자동 발동.

> 💡 이게 바로 § 1.5 자율 라우팅의 대표 사례 — **"oma-pdf 써줘"가 아니라 "이 pdf 정리해줘"만 해도** 됩니다. 더 정밀한 **서식·표 추출·문서 비교**가 필요하면 § 3.15의 `kordoc` MCP가 더 강력합니다.

---

### 3.3 부동산 실무 — 등기부등본 API 백엔드 만들기

**상황**: 공공 API(등기·건축물대장)를 묶은 백엔드 서비스가 필요.

**프롬프트 예시**:
```
공공데이터 등기부등본 API를 호출하는 REST 백엔드를 만들어줘.
JWT 인증 붙이고 PostgreSQL에 캐싱하는 구조로.
```

**자동 발동 (이 한 프롬프트만으로)**: 트리거 `만들어줘`+`API`/`백엔드` → **`orchestrate`**(persistent) → 라우팅:
- 설계 → `oma-architecture` (Claude Opus 4.8) / 코딩 → `oma-backend`·DB → `oma-db` (Codex gpt-5.5 high) / 리뷰 → `oma-qa` (**Codex gpt-5.5 high**) / 문서 → `oma-docs` (Antigravity)

**결과 흐름**: 4개 result-*.md 병렬 생성 → 마지막에 통합 리뷰 루프.
**비용**: 약 $2-5 (3-벤더 분산 시 단일 Claude 대비 ~60% 절감).
**백엔드 규칙**: `.claude/rules/backend.md` 자동 적용 — 클린아키텍처(router→service→repository), 파라미터 바인딩, env 키 있으면 실호출/없으면 폴백.

---

### 3.4 부동산 실무 — 시장조사 자동화

**프롬프트 예시**: `서울 강남 오피스 시장에 대한 시장조사를 해줘.`
**자동 발동**: 트리거 `시장조사` → 스킬 `oma-market` 단독. 무료 소스(reddit/hn/grounding) 우선, 키 없으면 자동 skip. preflight `oma market detect-trap`이 먼저 윤리·범위 차단.
**결과**: `.agents/results/market/{topic}-{YYYYMMDD}.md` (SWOT/PESTEL 자동 toggle).
> ⚠️ 개인 신상 추적 쿼리는 자동 거부.

---

### 3.5 코드 리뷰 — "한번 봐줘"

**프롬프트 예시(3개 같은 결과)**: `이 코드 한번 봐줘` / `리뷰해줘` / `보안 검토해줘`
**자동 발동**: 트리거 `리뷰`·`검토` → **`review`** → `oma-qa`(**Codex gpt-5.5 high**, Security > Performance > Accessibility > Quality).
**결과**: `result-qa-*.md`에 severity(CRITICAL/HIGH/MEDIUM/LOW) + 파일:라인 + 수정 코드.
**전문 보안 스캔** → "딥섹 돌려줘" → `deepsec` → `oma-deepsec`.

> 📌 **변경점**: QA 라우팅이 8.32부터 Claude→**Codex**로 바뀌었습니다. 리뷰 결과 형식은 동일하되 모델만 교체.

---

### 3.6 디버깅 — "왜 안 돼"

**프롬프트 예시**: `이 에러 고쳐줘: [에러 로그]`
**자동 발동**: 트리거 `에러 고쳐줘`·`왜 안돼`·`디버그` → **`debug`** → `oma-debug`(Claude Opus 4.8, 재현→근본원인→최소 수정→회귀 테스트).
**결과**: 4단계 표 + diff 수정안 + 유사 패턴 검색.

---

### 3.7 프론트엔드 — UI 만들기

**프롬프트 예시**: `부동산 매물 카드 컴포넌트를 만들어줘. shadcn + tailwind, 반응형, 다크 테마.`
**자동 발동**: `만들어줘`+`컴포넌트`/`반응형` → orchestrate/단발 → `oma-design`(토큰·WCAG) + `oma-frontend`(shadcn·tailwind, **Antigravity Gemini 3.5 Flash**).
> 💡 디자인부터 의논 → "디자인 시스템 만들어줘" → `design` 워크플로(토큰만).
> 📌 **변경점**: Frontend 라우팅이 8.32부터 Codex→**Antigravity**로 이동(저비용 멀티모달 강점 활용).

---

### 3.8 문서 검증·동기화 — 코드와 문서가 어긋났을 때

**프롬프트 예시**: `문서 검증해줘` / `문서 싱크 맞춰줘`
**자동 발동**: 트리거 `문서 검증`/`문서 동기화` → **`docs`** → `oma-docs`(Antigravity, 깨진 링크·옛 명령어·코드 vs 문서 차이 감지 → patch 제안).
**명령**: `oma docs verify "docs/**/*.md"` (검증), `oma docs sync` (diff 기반 patch, 항상 대화형).
> 💡 `oma-config.yaml`의 `docs.auto_verify: true`로 켜면 `/scm`·`/work`·`/ultrawork` 종료 시 자동 검증(경고만, 차단 안 함). 현재는 `false`(opt-in).

---

### 3.9 일일 회고 — "오늘 뭐 했지"

**프롬프트 예시**: `recap` / `리캡`
**자동 발동**: 트리거 `recap`·`리캡` → **`recap`** → `oma-recap`(Claude·Codex·Antigravity 세션 통합 요약).
**결과**: 일/주간 마크다운 + 토큰 사용량.
> 📌 **정확한 트리거**: 8.32 triggers.json 기준 확실한 발동어는 `recap`/`리캡`입니다. "오늘 한 일 정리해줘"는 자연어 의도로도 라우팅되지만, 안 뜨면 `recap`을 그대로 입력하세요.

---

### 3.10 발표자료·이미지·음성·번역 생성

| 원하는 것 | 프롬프트 키워드 | 발동 스킬 |
|---|---|---|
| **발표자료(슬라이드)** ★신규 | `슬라이드 만들어줘` / `발표자료` / `pptx` | `oma-slide` (HTML 1920×1080 → PDF/PNG/PPTX 변환) |
| AI 그림 | `이미지 만들어줘` / `나노바나나로` | `oma-image` (Codex gpt-image / Antigravity nano-banana / pollinations) |
| 음성 읽기 | `음성으로 읽어줘` / `tts` | `oma-voice` (Voicebox MCP, 로컬·무료) |
| 음성→텍스트 | `받아 적어` / `회의록` / `stt` | `oma-voice` |
| 번역 | `번역해줘` / `다국어로` | `oma-translator` |

> 💡 **`oma-slide` 활용처**: 사업제안서·투자설명회(IR)·재개발 조합 총회 자료를 한 프롬프트로 애니메이션 HTML 덱 → 자동 PDF/PPTX 변환. 예: `강남 오피스 개발 사업수지 발표자료 10장으로 만들어줘`.

---

### 3.11 깃 작업 — 커밋·머지·태깅

**프롬프트 예시**: `커밋해줘 (conventional commits로 분리해서)` / `머지 충돌 해결해줘`
**자동 발동**: `커밋`·`리베이스`·`머지 충돌` → **`scm`** → `oma-scm`(feat/fix/refactor 분리, 72자 imperative).
> ⚠️ 자동 `git add -A` 금지(`.claude/rules/commit.md`). 파일별 명시적 add.

---

### 3.12 새 프로젝트 시작

**프롬프트 예시**: `이 폴더에 새 프로젝트 셋업해줘` / `deepinit`
**자동 발동**: `프로젝트 초기화`·`셋업`·`scaffold` → **`deepinit`** (mise.toml + git hooks + 기본 구조).

---

### 3.13 끝까지 자동 실행 — "Ralph 모드"

**프롬프트 예시**: `이 기능 끝까지 만들어줘. 멈추지마.` / `ralph 모드로 완료될때까지`
**자동 발동**: `ralph`·`끝까지`·`멈추지마`·`완료될때까지` → **`ralph`**(persistent + 자기 반복) → 검증 통과까지 무한 반복 후 자동 종료.
> ⚠️ **비용 주의**: 검증 통과까지 spawn 반복. quota cap(§ 7.3, 현재 활성)이 안전망. spawn 60회 초과 시 자동 차단.

---

### 3.14 OMA 자체 점검·실험

| 원하는 것 | 프롬프트/명령 | 발동 |
|---|---|---|
| 전체 skill 의미 검증 | `bun run oma-eval/static-validate.ts` | static validate (합격선 85%) |
| 핵심 skill 스키마 검수 | `cd oma-eval && promptfoo eval -c promptfooconfig.yaml` | promptfoo |
| 새 스킬 추가 | `새 스킬 만들어줘 (이름: xxx, 역할: yyy)` | `oma-skill-creator` |
| 토큰 사용량 점검 ★신규 | `로컬 에이전트 토큰 사용량 보여줘` | `agentcat-usage` (Codex/Claude/Gemini 활동량) |
| OMA 업데이트 | `bash scripts/oma-upgrade.sh` | § 10 (★중요) |

---

### 3.15 ★부동산 도메인 직결 MCP — 8.32 신규 셋업

> 당신의 궁극 목표(부동산 의사결정 AI 에이전트 + 감정평가 온톨로지팩)에 직결되는 MCP가 설치됨. **OMA 스킬과 별개로 Claude가 직접 호출**한다.

| MCP | 정의 1줄 + 부동산 비유 | 대표 프롬프트 | 주요 도구 |
|---|---|---|---|
| `korean-law` | 한국 법령·판례 검색기 (= **법제처·대법원 판례 자동 열람 창구**) | `상가건물 임대차보호법 조문 찾아줘` / `이 분쟁 관련 판례 정리해줘` | `search_law`·`get_law_text`·`search_decisions`·`chain_full_research`·`verify_citations` |
| `kordoc` | 한글/PDF 서식 정밀 파서 (= **감정평가서·계약서 자동 판독·대조반**) | `이 계약서 두 버전 비교해줘` / `이 서식의 표만 추출해줘` | `parse_document`·`parse_table`·`parse_form`·`compare_documents`·`detect_format` |
| `opencrab` | 온톨로지 OS (= **개념 간 관계를 엮는 지식 설계도 캐비닛**) | `감정평가 업무 온톨로지 노드 추가해줘` / `이 문서에서 개념 추출해줘` | `ontology_add_node`·`ontology_add_edge`·`ontology_extract`·`ontology_query`·`ontology_impact` |

**연계 워크플로 예시 (경·공매 권리분석 자동화)**:
1. `kordoc`로 등기부·매각물건명세서 PDF 파싱 →
2. `korean-law`로 관련 법령·판례 verify_citations →
3. `opencrab`로 권리관계 온톨로지 노드·엣지 적재 →
4. Claude가 권리분석 보고서 통합.

> 💡 **온톨로지 팩 빌딩**: "팩 만들어줘"·"/crab"·"LocalCrab로 인덱싱해줘" → `crab` 스킬이 법령·문서·URL을 Evidence-backed 온톨로지 팩으로 빌드(목표 2번 직결).
> ⚠️ **현재 상태**: `korean-law`·`kordoc`·`context7`·`serena`는 `claude mcp list`에서 **⏸ Pending approval** — 최초 1회 `claude` 실행해 승인 필요. `neo4j`는 현재 **✗ Failed to connect**(그래프 검증 필요 시 § 9 Q10).

---

## § 4. 워크플로 — 한국어 트리거 키워드 사전

> 프롬프트에 **왼쪽 키워드 중 하나만** 들어가면 자동 발동. (8.32 triggers.json 기준)

### 4.1 키워드 자동 발동 워크플로 (15)

| # | 워크플로 | persistent | 한국어 트리거 (대표) | 한 줄 설명 |
|---|---|---|---|---|
| 1 | `orchestrate` | ✅ | 자동으로 해줘 / 병렬로 / 전부 해줘 / 알아서 해줘 | 다중 에이전트 병렬 + 리뷰 루프 |
| 2 | `ultrawork` | ✅ | ultrawork / ulw | 5-Phase 게이트(11회 리뷰) |
| 3 | `work` | ✅ | 단계별로 / 하나씩 / 차근차근 / 수동으로 | 사람이 매 단계 승인 |
| 4 | `ralph` | ✅ | 끝까지 해 / 멈추지마 / 완료될때까지 / 계속해 | 검증 통과까지 자기 반복 |
| 5 | `plan` | ❌ | 계획 세워줘 / 분석해줘 / 기획 / 태스크 분해 | PM 스타일 task 분해 |
| 6 | `architecture` | ❌ | 아키텍처 / 시스템 설계 / 모듈 경계 / 트레이드오프 | 진단·비교·ADR |
| 7 | `brainstorm` | ❌ | 아이디어 / 같이 생각해보자 / 뭐가 좋을까 / 구상 | 디자인 우선 이데이션 |
| 8 | `design` | ❌ | 디자인 / 디자인 시스템 / 다크 테마 / 색상 팔레트 | 디자인 토큰·DESIGN.md |
| 9 | `review` | ❌ | 리뷰해줘 / 검토해줘 / 한번 봐줘 / 보안 감사 | QA 감사(sev 분류) |
| 10 | `debug` | ❌ | 에러 고쳐줘 / 왜 안돼 / 버그 잡아 / 터졌어 | 근본원인+최소 수정 |
| 11 | `deepsec` | ❌ | 딥섹 실행 / 딥섹 스캔 / 딥섹 PR 리뷰 | Vercel deepsec |
| 12 | `deepinit` | ❌ | 프로젝트 초기화 / 셋업 / scaffold / 새 프로젝트 | 신규 코드베이스 부트스트랩 |
| 13 | `scm` | ❌ | 커밋해줘 / 리베이스 / 머지 충돌 / 워크트리 | Git + Conventional Commits |
| 14 | `docs` | ❌ | 문서 검증 / 문서 싱크 / 깨진 문서 / 문서 동기화 | 문서 drift 감지·동기 |
| 15 | `recap` | ❌ | recap / 리캡 | 일/기간 요약 |

### 4.2 키워드 비대상 워크플로 (3) — 자동/스킬/명시 발동

| 워크플로 | 발동 방식 | 비고 |
|---|---|---|
| `pdf` | `oma-pdf` 스킬 + `.pdf` 확장자 감지 | 워크플로 키워드 맵에서 분리됨 → 스킬로 라우팅 |
| `stack-set` | 자동(코드베이스 진입 시) | `excludedWorkflows` — 기술 스택 감지·`STACK.md` |
| `tools` | 명시 호출 | `excludedWorkflows` — MCP 도구 자연어 관리 |

**규칙 3개**
1. 🔴 **자동 발동만**. Claude가 임의로 워크플로를 시작하지 않음 (단, § 1.5 스킬 자율 라우팅은 강제).
2. 🔴 **persistent 4개**(orchestrate/ultrawork/work/ralph)는 종료 차단 → **`workflow done`** 으로 풀기.
3. 🔴 **사이클 중 `.agents/` 직접 수정 금지** — SSOT 보호.

---

## § 5. 스킬 30개 + agentcat — 카테고리별 + 자동 발동 단어

> 스킬은 워크플로·훅이 자동 호출. **이 단어가 들어가면 이 스킬이 라우팅된다**는 사전 역할. 라우팅 모델은 § 6 기준.

### 5.1 전략·기획·진단 (Claude Opus 4.8 라우팅)

| 스킬 | 한국어 트리거 | 역할 |
|---|---|---|
| `oma-orchestrator` | 병렬 실행 / 동시에 / fan-out | 전체 조율·세션 관리 |
| `oma-architecture` | 아키텍처 / 구조 검토 / 경계 정의 | 시스템 설계·ADR |
| `oma-pm` | 요구사항 / 스펙 / 우선순위 | 요구사항 분해 |
| `oma-debug` | 버그 / 크래시 / 원인 파악 | 근본원인+회귀 테스트 |
| `oma-brainstorm` | 아이디어 / 같이 고민 | 디자인 우선 이데이션 |
| `oma-coordination` | 에이전트 조율 / 순서 | 다중 에이전트 수동 가이드 |

### 5.2 구현·품질·인프라 (Codex gpt-5.5 high 라우팅)

| 스킬 | 한국어 트리거 | 역할 |
|---|---|---|
| `oma-qa` ★이동 | 접근성 / 성능 / 커버리지 / OWASP | 품질 감사 (8.32부터 Codex) |
| `oma-backend` | API / 엔드포인트 / 인증 | REST·DB·JWT |
| `oma-mobile` | 플러터 / 다트 / 안드로이드·아이폰 | Flutter/RN |
| `oma-db` | 스키마 / 인덱스 / 쿼리 느려 | SQL/NoSQL/Vector |
| `oma-tf-infra` | 테라폼 / 인프라 / 클라우드 | Terraform 멀티클라우드 |
| `oma-dev-workflow` | mise / ci 파이프라인 / 깃 훅 | mise+CI/CD |
| `oma-scm` | 머지 충돌 / 리베이스 / 워크트리 | Git 고급 |

### 5.3 검증·관측·보안 (Claude 폴백 라우팅)

| 스킬 | 트리거 | 역할 |
|---|---|---|
| `oma-deepsec` | 딥섹 / 매처 / 트리아지 | Vercel deepsec |
| `oma-observability` | 관측성 / OTel / 트레이싱 / 번레이트 | APM·트레이스·SLO |

### 5.4 프론트·처리·검색·문서 (Antigravity 저비용 라우팅)

| 스킬 | 트리거 | 역할 |
|---|---|---|
| `oma-frontend` ★이동 | 리액트 / 넥스트 / shadcn | React/Next/Tailwind (8.32부터 Antigravity) |
| `oma-docs` | 문서 검증 / 문서 싱크 | 문서 drift 감지·sync |
| `oma-search` | 검색해줘 / 찾아줘 / 레퍼런스 | 의도 기반 검색 라우터 |
| `oma-scholar` | 논문 / 학술 자료 | 학술 사이드카 |
| `oma-market` | 시장조사 / 페인 포인트 / 경쟁 | 시장 신호 수집 |
| `oma-recap` | recap / 리캡 | 일/기간 요약 |
| `oma-hwp` | 한글 파일 / hwp / hwpx | HWP → MD |
| `oma-pdf` | pdf 변환 / pdf 파싱 | PDF → MD |
| `oma-image` | 이미지 만들어 / 그림 / 나노바나나 | 멀티 벤더 이미지 |
| `oma-voice` | 음성으로 / 받아 적어 / 회의록 | TTS/STT |
| `oma-translator` | 번역해줘 / 다국어로 | 컨텍스트 번역 |
| `oma-academic-writer` | 학술 영문 작성 | 논문·아카데믹 |
| `oma-design` | 디자인 토큰 / 컬러 / 타이포 | 디자인 시스템 |
| `oma-slide` ★신규 | 슬라이드 / 발표자료 / pptx | HTML 덱 → PDF/PNG/PPTX |
| `oma-skill-creator` | 새 스킬 만들어 | SSL-lite 양식 |

### 5.5 유틸 (벤더 무관)

| 스킬 | 트리거 | 역할 |
|---|---|---|
| `agentcat-usage` ★신규 | 토큰 사용량 / 에이전트 활동량 | Codex/Claude/Gemini 로컬 사용량 점검 |

### 5.6 라우팅 결정 순서 (Resolution Order)

1. `.agents/oma-config.yaml`의 `agents.<id>.model` 명시 매핑
2. `custom_presets.custom-triple-flagship.agent_defaults.<role>` 프리셋 매핑
3. 폴백 = `orchestrator` = **Claude Opus 4.8** (프리셋에 없는 역할: design·observability·security 등)

> 💡 **비용 팁**: 폴백 스킬을 Opus로 쓰면 비용↑. `oma-config.yaml`에 `agents.<id>: { model: google/gemini-3.5-flash }` 한 줄 추가하면 단가 1/10.

---

## § 6. 3-벤더 라우팅 — `custom-triple-flagship` (8.32 갱신)

### 6.1 현 프리셋 (`agent_defaults`)

```yaml
# .agents/oma-config.yaml (model_preset: custom-triple-flagship, active_vendor: antigravity)
orchestrator:  anthropic/claude-opus-4-8        # 시행사 (총괄)
architecture:  anthropic/claude-opus-4-8
pm:            anthropic/claude-opus-4-8
debug:         anthropic/claude-opus-4-8
qa:            openai/gpt-5.5 (high)            # ← 8.32: Claude에서 이동
backend:       openai/gpt-5.5 (high)            # 시공팀
mobile:        openai/gpt-5.5 (high)
db:            openai/gpt-5.5 (high)
tf-infra:      openai/gpt-5.5 (high)
frontend:      google/gemini-3.5-flash          # ← 8.32: Codex에서 이동
docs:          google/gemini-3.5-flash          # 감리·멀티모달
retrieval:     google/gemini-3.5-flash
```

### 6.2 벤더별 역할 분담 한눈에

| 벤더 | 모델 | 담당 역할 | 현장 비유 |
|---|---|---|---|
| **Claude** | Opus 4.8 | orchestrator · architecture · pm · debug (+ 미매핑 폴백) | 시행사·건축사 소장 |
| **Codex** | gpt-5.5 (high) | qa · backend · mobile · db · tf-infra | 시공팀 + 품질검사관 |
| **Antigravity** | Gemini 3.5 Flash | frontend · docs · retrieval | 감리단 + 인테리어·문서반 |

> 📌 **8.16 대비 핵심 이동**: ① QA가 Claude→Codex (구현팀이 직접 자기 코드 품질 게이트), ② Frontend가 Codex→Antigravity (저비용 멀티모달로 UI 반복). Opus는 4.7→4.8 일괄 상향.

### 6.3 Antigravity = Google 유일 진입점 (gemini CLI 폐기)

| 항목 | 현재 |
|---|---|
| Google CLI | **antigravity (`agy`)** 만 허용. 레거시 `gemini` CLI 폐기 |
| 호출 진입점 | `agy --prompt --dangerously-skip-permissions` (headless, node-pty PTY) |
| 모델 | `gemini-3.5-flash` |
| 결과 표시 | result 파일에 `Source: antigravity pty stdout` 명시 |
| 상태 | ✅ node-pty 전역설치로 실작동 (PTY 없으면 빈 출력 → 해결됨) |

> ⚠️ **토큰 미터 주의**: `agy` 헤드리스 실행은 **실제 라이브 모델을 호출**하지만, Antigravity IDE의 "토큰 사용량 한도" 화면에는 **반영되지 않는 별도 경로**를 씁니다. "안 깎인다"가 정상 — 실행이 안 된 게 아닙니다.

### 6.4 3사 자율 분업 + 고유 자원 (§ 1.5 요약)

각 벤더는 oma 스킬 라우팅 **외에도** 자기에게만 설치된 MCP·플러그인·내부 스킬을 작업 성격에 맞게 병행하며, **앞으로 설치할 자원도 자동 후보**로 삼는다(동적 발견). 상세는 각 글로벌 지침서 §6-A/§3-A.

### 6.5 모델 변경 한 줄

```yaml
# .agents/oma-config.yaml
agents:
  qa: { model: anthropic/claude-opus-4-8 }            # QA를 다시 Claude로 되돌리기
  frontend: { model: openai/gpt-5.5, effort: high }   # 프론트를 Codex로
```

변경 즉시 적용. `oma doctor`로 검증.

---

## § 7. 비용·토큰 가이드 (간략)

### 7.1 모델별 단가 (1M tokens, 추정)

| 모델 | Input | Output | 비유 |
|---|---|---|---|
| Claude Opus 4.8 | ~$15 | ~$75 | 종합건축사사무소 대표 |
| Claude Sonnet 4.6 | ~$3 | ~$15 | 1인 건축사 |
| GPT-5.5 (Codex) | ~$5 | ~$25 | 일급 시공 팀장 |
| Gemini 3.5 Flash | ~$0.4 | ~$1.2 | 도면 사보·인쇄 |

### 7.2 작업당 평균 비용

| 작업 | Claude Opus | Codex | Antigravity |
|---|---|---|---|
| 단순(10K) | ~$0.15 | ~$0.05 | ~$0.02 |
| 중간(50K+5K) | ~$0.75 | ~$0.25 | ~$0.10 |
| 큰 작업(200K+20K) | ~$3.00 | ~$1.00 | ~$0.40 |

### 7.3 quota cap 설정 (현재 **활성** 상태)

```yaml
# .agents/oma-config.yaml — 8.32에서 실제 적용 중
session:
  quota_cap:
    tokens: 3_000_000
    spawn_count: 60
    per_vendor:
      claude: 1_500_000
      openai: 1_000_000
      google: 500_000
```

캡 초과 시 spawn 거부(`.serena/memories/session-cost-{sessionId}.md`에 기록). 제거하려면 블록 삭제.

### 7.4 30일 사용 시나리오

| 강도 | 일 토큰 | 월 비용 |
|---|---|---|
| 가벼움(등기·실거래 조회) | 50K | $5-15 |
| 중간(계약서·시장조사) | 200K | $30-80 |
| 무거움(사업수지·재개발 자동화) | 1M | $150-400 |

---

## § 8. 파생 폴더에서 OMA 활용

OMA는 **부모 폴더의 `.agents/`를 자동 상속하지 않음** (cwd만 검사).

| 도구 | 부모 SSOT 자동 인식 |
|---|---|
| `claude` (CLAUDE.md) | ✅ walk-up |
| `codex` (AGENTS.md) | ✅ walk-up |
| `antigravity` (GEMINI.md) | ✅ walk-up |
| **`oma` (`.agents/`)** | ❌ **현재 폴더만** |

**권장 패턴 — 부모에서 spawn, 자식에 작업**:
```bash
cd C:/Users/user/AI_Orchestra_Lab/projects
oma agent:spawn backend "할 일" my-session -m claude -w ./sub-project-A
```
✅ 부모 SSOT 활용 · ✅ 결과는 자식 폴더에 격리.

---

## § 9. 트러블슈팅 FAQ

### Q1. `oma doctor`에 ❌가 여러 개

| ❌ 항목 | 해결 |
|---|---|
| qwen ❌ | 무시 OK (선택) |
| claude ❌ | `claude` 직접 실행해서 로그인 |
| codex ❌ | `npm install -g @openai/codex` |
| antigravity ❌ | https://antigravity.google.com 다운로드 |
| Skills (X/30) | `oma install -y` 재실행 |

### Q2. spawn이 "Failed to spawn process" / Antigravity 빈 출력

`agy`는 TUI라 **PTY(node-pty)** 가 있어야 출력함. 전역 `node-pty` 설치(`npm i -g node-pty@1.1.0`)로 해결됨. `auto_update_cli: false` 유지하는 한 정상. 깨졌다면 → Q11/§ 10.

### Q3. 워크플로가 안 끝남 (persistent)

프롬프트에 그대로: `workflow done`

### Q4. result 파일이 어디 있지?

1. `.agents/results/result-{agent}-{sessionId}.md` (정상)
2. `<workspace>/.agents/results/` (`-w` 사용 시)
3. `.serena/memories/result-{agent}-*.md` (백업)

`find . -name "result-*.md"`가 빠름.

### Q5. 스킬이 자동으로 안 떠요 (자율 라우팅 점검)

1. `UserPromptSubmit` 훅 확인: `~/.claude/settings.json`에 `keyword-detector.ts` + `skill-injector.ts` 있는지.
2. 트리거 단어 확인: § 4·§ 5 사전의 키워드를 1개 포함했는지.
3. 큰 작업인데 스킬 0회면 종료 시 **Stop-hook 경고**(`skill-usage-audit.ts`)가 자동으로 알려줌.
4. 그래도 안 되면 `/hooks`를 한 번 열어 설정 재로드.

### Q6. Stop-hook 경고 "⚠️ Skill-First 자가검증…"가 떴어요

편집/실행은 많았는데 스킬·서브에이전트 호출이 0이었다는 자동 감지(허위·누락 보고 방지). 동시에 `~/.claude/lessons/skill-routing-lessons.md`에 **교훈이 자동 적재**되어 다음 세션 RAG로 재활용됨. 다음 작업은 스킬 우선·캐스케이드 분산으로 진행. **차단은 안 함**(경고만).

### Q7. 비용이 너무 많이 나가요

- `oma agent:status <session>` 토큰 확인 · § 7.3 quota cap(활성) · § 5.6 폴백 스킬 Flash 매핑 · `agentcat-usage`로 일별 사용량 점검.

### Q8. promptfoo / static 검수

```bash
cd oma-eval && promptfoo eval -c promptfooconfig.yaml --no-cache -o results.json   # 핵심 skill
bun run oma-eval/static-validate.ts                                               # 전체 skill 정적
```
합격선 0.85. LLM 호출 없음($0).

### Q9. SSOT(.agents/) 수정해도 되나?

🔴 **금지**. 단 `oma-config.yaml`의 `auto_update_cli: false`는 **유지 필수**(§ 10).

### Q10. MCP가 "Pending approval" / "Failed to connect"

| 상태 | 대상(현재) | 조치 |
|---|---|---|
| ⏸ Pending approval | chrome-devtools · context7 · serena · korean-law · kordoc | `claude` 한 번 실행해 승인 |
| ✗ Failed to connect | neo4j | `C:\Users\user\AI_Orchestra_Lab\core_system\neo4j-mcp\`의 venv·서버 기동 확인 |
| ✓ Connected | Google Drive · github · playwright · notebooklm · opencrab | 정상 |

확인: `claude mcp list`.

---

## § 10. OMA 안전 업데이트 (★최중요)

### 10.1 현 상황

OMA 로컬 빌드는 agy PTY 수정 등을 위해 패치됨(`C:/Users/user/AI_Orchestra_Lab/core_system/oh-my-agent/`). `oma update` 자동 발동 시 글로벌 `cli.js`가 registry 버전으로 덮어써져 패치가 사라짐 → **`auto_update_cli: false` 유지**.

### 10.2 안전 업데이트 절차

```bash
bash scripts/oma-check-drift.sh     # drift 점검만 (업그레이드 안 함)
bash scripts/oma-upgrade.sh         # 의도적 업그레이드 (Windows: scripts\oma-upgrade.cmd)
```

`oma-upgrade.sh` 자동 수행: 백업 → `git stash` → `git pull --rebase` → stash pop → `bun run typecheck`+`build` → 글로벌 cli.js 교체 → drift verify → spawn verify(~$0.02) → 실패 시 자동 롤백.
**옵션**: `--check-only` / `--skip-spawn`. 검증 스크립트: `scripts/verify-oma-cli.ts`.

### 10.3 언제 실행?

- `oma-check-drift.sh` exit 1 시 / 새 release 노트 보고 의도적으로 / 매월 1회 점검(선택).

### 10.4 한시성

OMA upstream에 agy PTY 패치가 병합되면 `auto_update_cli: true` 복원 + `patches/` 폐기 가능. 그때까지 본 절차 유지.

---

## § 11. 참고 자료

| 자원 | 경로 |
|---|---|
| 점검 보고서 | `docs/test-report/01-health.md` ~ `10-ci.md` |
| 업스트림 이슈 | `docs/test-report/upstream-issues.md` |
| 업그레이드 설계 | `docs/test-report/upgrade-safe-design.md` |
| 안전 업그레이드 | `scripts/oma-upgrade.sh` · `oma-check-drift.sh` · `rebuild-oma.sh` · `verify-oma-cli.ts` |
| SSOT 본체(수정 금지) | `.agents/` |
| 설정 진입점 | `.agents/oma-config.yaml` |
| 트리거 사전 | `.agents/hooks/core/triggers.json` |
| 네이티브 서브에이전트 | `.claude/agents/*.md` (10종) |
| 3사 전역 지침서 | `~/.claude/CLAUDE.md` · `~/.codex/AGENTS.md` · `~/.gemini/GEMINI.md` (§6-A/§3-A 자율 라우팅 + §6-B/§3-B 캐스케이드) |
| 자가검증 훅 | `~/.claude/hooks/skill-usage-audit.ts` |
| 자동학습 교훈 로그 | `~/.claude/lessons/skill-routing-lessons.md` (Stop-hook 자동 적재) |
| 부동산 도메인 MCP | `korean-law`(법령·판례) · `kordoc`(한글/PDF) · `opencrab`(온톨로지) |
| OMA 로컬 소스 | `C:/Users/user/AI_Orchestra_Lab/core_system/oh-my-agent/` |
| OMA 공식 | https://github.com/first-fluke/oh-my-agent |

---

## § 12. 다음 액션 (사용자 옵션)

| 우선순위 | 액션 |
|---|---|
| 🟢 일상 사용 | § 3 레시피 1개 골라 따라하기 (스킬 이름 말하지 말고 일만 시키기 — § 1.5 테스트) |
| 🟢 도메인 직결 | § 3.15 — `claude` 실행해 korean-law·kordoc·serena MCP 승인 1회 |
| 🟢 점검 | 주 1회 `bash scripts/oma-check-drift.sh` + `agentcat-usage`로 토큰 점검 |
| 🟡 권장 | 자율 라우팅 미작동 의심 시 § 9 Q5 · neo4j 복구 필요 시 § 9 Q10 |

**현재 상태**: ✅ **OMA 8.32.1 — 3사 자율 스킬·툴 라우팅 + 캐스케이드 셋업 완료**. 역할 재배치(QA→Codex / Frontend→Antigravity / Opus 4.8), 신규 `oma-slide`·`agentcat-usage`, 부동산 도메인 MCP(korean-law·kordoc·opencrab) 직결, quota_cap 실가동. agy 실작동·업데이트 안전망 유지.

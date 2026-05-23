# oma-personal

[![OMA Health Check](https://github.com/lgh5446/oma-personal/actions/workflows/oma-health.yml/badge.svg?branch=main)](https://github.com/lgh5446/oma-personal/actions/workflows/oma-health.yml)

> 개인 OMA (oh-my-agent) 스냅샷 — 청사진 **3사 자동 오케스트레이션** (Claude + Codex + Antigravity) 완성본 + 업그레이드 안전망 + CI 검수 시스템.

## 1줄 정의

OMA는 Claude·Codex·Antigravity 세 AI CLI를 **하나의 시행사처럼 묶어** 작업을 자동 분배·감리하는 멀티 에이전트 오케스트레이션 도구. 본 repo는 Windows 환경에서 청사진 100% 달성한 개인 스냅샷.

## 빠른 시작

```bash
# 건강 검진 (5초)
oma doctor

# OMA 업데이트가 청사진을 깼는지 확인 (즉시)
bash scripts/oma-check-drift.sh

# 안전 업그레이드 (필요 시)
bash scripts/oma-upgrade.sh
```

자세한 사용법은 → [`docs/USAGE-ko.md`](docs/USAGE-ko.md) (한국어 매뉴얼, 10 섹션, 부동산 비유 포함).

## 검증된 사항

| 항목 | 상태 |
|---|---|
| 3-vendor 자동 오케스트레이션 | ✅ Claude (native) + Codex (Windows wrapper 보정) + Antigravity (`agy` headless) |
| SKILL.md 정합성 (29 skills) | ✅ 96.06% score (Phase 9 static-validate) |
| promptfoo 공유 schema (5 핵심 skill) | ✅ 100% pass |
| Hook variants JSON 무결성 | ✅ 매 PR마다 자동 검증 (CI) |
| OMA 업데이트 회귀 안전망 | ✅ `scripts/oma-upgrade.sh` (git stash 기반) |
| `.agents/oma-config.yaml` | ✅ `auto_update_cli: false` (수동 업그레이드만) |

## 폴더 구조

```
.agents/                # SSOT — 29 skills · 18 workflows · vendor adapters
.claude/ .codex/ .gemini/ .cursor/ .qwen/  # vendor-specific agent definitions
docs/
├── USAGE-ko.md         # 한국어 사용 매뉴얼
└── test-report/
    ├── 01-health.md ~ 10-ci.md     # Phase 1-10 점검 보고서
    └── upstream-issues.md          # OMA 본가 PR 제출용 본문
oma-eval/
├── promptfooconfig.yaml            # promptfoo 5 핵심 skill schema 검증
├── static-validate.ts              # 29 skill 의미·키워드 검증
scripts/
├── oma-upgrade.sh                  # git stash 기반 안전 업그레이드
├── oma-check-drift.sh              # 글로벌 cli.js drift 감지
└── rebuild-oma.sh                  # 비상 재빌드
.github/workflows/
└── oma-health.yml                  # CI — 매 push/PR 자동 검증
```

## CI 자동 검증

매 push·PR 시 GitHub Actions가 다음을 자동 실행:

1. **`static-validate`** — 29 skill 의미·frontmatter·키워드 (합격선 85%)
2. **`promptfoo-eval`** — 5 핵심 skill 공유 schema (100% 필수)
3. **`vendor-json-validate`** — `.agents/hooks/variants/*.json` 및 vendor JSON 무결성 (2026-05-22 `oma link` 버그 회귀 방지)

세 jobs 모두 정적 검증 — LLM 호출 0건, **비용 영구 $0**.

## 라이선스 / 출처

- OMA 본가: https://github.com/first-fluke/oh-my-agent
- 본 repo는 개인 사용 스냅샷 (private). OMA upstream에 기여 시 `docs/test-report/upstream-issues.md` 참고.

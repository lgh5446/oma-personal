# Canonical Prompts - oma-goal

Representative prompts and the command each maps to. Paths are relative to the repo root.

## 1. Create a new goal ledger

> "목표 장부를 새로 만들어줘." / "Set up a goal ledger for this work."

```bash
node .agents/skills/oma-goal/scripts/oma-goal.mjs init
node .agents/skills/oma-goal/scripts/oma-goal.mjs create --brief .agents/goals/brief.md
```

## 2. Split one brief into multiple goals with `@goal:`

Author `.agents/goals/brief.md` with column-0 delimiters, then `create`:

```markdown
Global context (preamble, not a goal).

@goal: Build the auth API
JWT + bcrypt login, rate-limited.

@goal: Add the profile page
Next.js page wired to the auth API.
```

```bash
node .agents/skills/oma-goal/scripts/oma-goal.mjs create --brief .agents/goals/brief.md
# -> G001 (auth API), G002 (profile page)
```

## 3. Checkpoint a goal as active

> "G001 작업 시작했다고 체크포인트 남겨줘."

```bash
node .agents/skills/oma-goal/scripts/oma-goal.mjs checkpoint --goal-id G001 --status active --evidence "작업 시작"
```

## 4. Checkpoint a goal as complete (with evidence + artifact)

> "G001 테스트 통과했어. 완료로 기록하고 결과 파일도 붙여줘."

```bash
node .agents/skills/oma-goal/scripts/oma-goal.mjs checkpoint --goal-id G001 --status complete \
  --evidence "테스트 통과" --artifact .agents/results/result-backend.md
```

## 5. Record a failure

> "G002는 실패로 기록해줘."

```bash
node .agents/skills/oma-goal/scripts/oma-goal.mjs checkpoint --goal-id G002 --status failed --evidence "빌드 깨짐: TS2339"
```

## 6. Record a block

> "G002는 외부 API 키 대기라 blocked로 표시해."

```bash
node .agents/skills/oma-goal/scripts/oma-goal.mjs checkpoint --goal-id G002 --status blocked --evidence "OPENAI_API_KEY 미발급 대기"
```

## 7. Verify the completion gate

> "완료 기준 추적해서 검증해줘." / "목표별 검증 돌려줘."

```bash
node .agents/skills/oma-goal/scripts/oma-goal.mjs verify
# exit 0 = all complete goals have evidence; exit 1 = a complete goal lacks evidence
```

## 8. Generate a recap

> "지금까지 목표 장부 리캡 만들어줘."

```bash
node .agents/skills/oma-goal/scripts/oma-goal.mjs recap
# -> .agents/results/result-goal-recap.md
```

## 9. Use alongside OMA 3-vendor orchestration

The leader (Claude) owns the ledger; workers return evidence only.

```bash
# Before dispatch: leader records goals and marks them active.
node .agents/skills/oma-goal/scripts/oma-goal.mjs create --brief .agents/goals/brief.md
node .agents/skills/oma-goal/scripts/oma-goal.mjs checkpoint --goal-id G001 --status active --evidence "codex backend lane dispatched"

# Codex implements G001 and returns result-backend.md (evidence). Antigravity reviews docs.
# After review: the LEADER (not the worker) records the checkpoint with the worker's evidence.
node .agents/skills/oma-goal/scripts/oma-goal.mjs checkpoint --goal-id G001 --status complete \
  --evidence "codex 구현 + agy 독립 검증 통과" --artifact .agents/results/result-backend.md

# Gate the whole milestone, then recap.
node .agents/skills/oma-goal/scripts/oma-goal.mjs verify
node .agents/skills/oma-goal/scripts/oma-goal.mjs recap
```

> Ownership: only the leader mutates `goals.json` / `ledger.jsonl`. Subordinate workers
> submit evidence and a result summary; checkpoint authority stays with the leader.

---
name: oma-goal
description: >
  Durable goal ledger for OMA. Maintains a repo-native goal ledger (목표 장부) under
  .agents/goals/ with goals.json, ledger.jsonl, brief.md, and evidence. Use for goal
  ledger, checkpoint, evidence, durable goals, 목표 추적 (goal tracking), per-goal
  verification, 단계별 완료 검증 (step-by-step completion verification), and recording
  goal state plus evidence before and after orchestrate / work / ultrawork / ralph runs.
---

# Goal Ledger - Durable Goal Tracking Specialist

Maintain durable, repo-native goal state and an evidence-backed audit ledger so that
multi-step orchestration survives session loss and every completion is provable.

## Scheduling

### Goal
Track a set of goals as durable state (`.agents/goals/goals.json`) plus an append-only
event ledger (`.agents/goals/ledger.jsonl`), gate completion on recorded evidence, and
produce a recap so that "what is done, by whom, with what proof" never gets lost.

### Intent signature
- User asks for a goal ledger, 목표 장부, goal checkpoint, 체크포인트, evidence, 증거 남겨, durable goals.
- User mentions `goals.json`, `ledger.jsonl`, per-goal verification (목표별 검증), or completion-criteria tracking (완료 기준 추적).
- User wants goal state and evidence recorded before/after `orchestrate`, `work`, `ultrawork`, or `ralph`.

### When to use
- Decomposing a brief into tracked goals (G001, G002, ...) with status and evidence
- Recording active / complete / failed / blocked checkpoints with evidence and artifact references
- Verifying that every completed goal carries evidence before declaring a milestone done
- Generating a goal recap (counts, completed, failed/blocked, recent events, next actions)
- Persisting goal state across sessions and across orchestration subagents

### When NOT to use
- Only a plan or requirements breakdown is needed (no durable ledger) -> use `oma-pm` / `plan`
- Only a code review or quality audit is needed -> use `oma-qa` / `review`
- Only Git branching / commit / merge operations are needed -> use `oma-scm` / `scm`
- Spawning and running parallel agents -> use `oma-orchestrator` (this skill records their goal state, it does not spawn them)

### Expected inputs
- A brief at `.agents/goals/brief.md` (with optional `@goal:` delimiters), or a path via `--brief`
- A goal id (`G001` format), a status value, and optional evidence / artifact references for checkpoints

### Expected outputs
- `.agents/goals/goals.json` - durable goal plan with per-goal status and timestamps
- `.agents/goals/ledger.jsonl` - one JSON event per line (audit trail)
- `.agents/results/result-goal-recap.md` - human-readable recap (response language)

### Dependencies
- Node 18+ or Bun (pure standard library; no external packages)
- Script: `scripts/oma-goal.mjs`
- Schema reference: `resources/goal-ledger-schema.md`

### Control-flow features
- Branches by command (init / status / create / checkpoint / verify / recap)
- Branches by goal status and by evidence presence at verification time
- Reads and writes local ledger files; appends one event per mutation

## Structural Flow

### Entry
1. Ensure the ledger exists (`init`); it is idempotent and never overwrites existing files.
2. Author or load `.agents/goals/brief.md`, then `create` to decompose it into goals.
3. Drive goals forward with `checkpoint`, gate with `verify`, summarize with `recap`.

### Scenes
1. **PREPARE**: `init` scaffolds `.agents/goals/` (brief template, empty plan, ledger, evidence/).
2. **ACQUIRE**: read the brief; `@goal:` delimiters split stories, preamble is context only.
3. **ACT**: `create` writes goals; `checkpoint` mutates one goal and appends a ledger event.
4. **VERIFY**: `verify` fails when any complete goal lacks evidence (exit 1), passes otherwise (exit 0).
5. **FINALIZE**: `recap` renders counts, completed, failed/blocked, recent events, and next actions.

### Transitions
- No `@goal:` delimiter in the brief -> the entire brief becomes a single goal `G001`.
- `checkpoint --status active` sets `startedAt`; `--status complete` sets `completedAt`.
- `create` on a non-empty plan is refused unless `--force` (prevents silent goal-state loss).
- Evidence on a checkpoint is stored on `goal.evidence`; artifacts go to ledger `artifactRefs`.

### Failure and recovery
| Failure | Recovery |
|---------|----------|
| `goals.json` missing | Run `init` first; readers exit with a clear "run init" error |
| Invalid `--status` value | Reject with the allowed-status list; non-zero exit |
| Unknown `--goal-id` | Reject with "goal id not found"; non-zero exit |
| Corrupt `goals.json` | Report "invalid JSON" with the path; do not partially write |
| Complete goal without evidence | `verify` reports the failing goal id and exits 1 |

### Exit
- Success: requested command completed; ledger and plan are consistent.
- Verify pass: all complete goals carry evidence (exit 0).
- Verify fail: at least one complete goal lacks evidence (exit 1).
- Error: usage / missing file / bad id / bad status / invalid JSON (exit 2).

## Logical Operations

### Actions
| Action | SSL primitive | Evidence |
|--------|---------------|----------|
| Scaffold ledger | `WRITE` | `.agents/goals/` files via `init` |
| Read goal plan | `READ` | `goals.json` |
| Decompose brief | `INFER` | `@goal:` parsing of `brief.md` |
| Mutate goal state | `WRITE` | `checkpoint` -> `goals.json` + ledger event |
| Gate completion | `VALIDATE` | `verify` evidence check, exit code |
| Render recap | `WRITE` | `.agents/results/result-goal-recap.md` |
| Append audit event | `NOTIFY` | one JSONL line per mutation |

### Tools and instruments
- `node .agents/skills/oma-goal/scripts/oma-goal.mjs <command>`
- `node:fs`, `node:path`, `node:crypto` (standard library only)
- Schema reference in `resources/goal-ledger-schema.md`

### Canonical command path
```bash
# 1. scaffold the ledger (idempotent)
node .agents/skills/oma-goal/scripts/oma-goal.mjs init

# 2. decompose the brief into goals (G001, G002, ...)
node .agents/skills/oma-goal/scripts/oma-goal.mjs create --brief .agents/goals/brief.md

# 3. checkpoint goal state with evidence
node .agents/skills/oma-goal/scripts/oma-goal.mjs checkpoint --goal-id G001 --status active --evidence "작업 시작"
node .agents/skills/oma-goal/scripts/oma-goal.mjs checkpoint --goal-id G001 --status complete --evidence "테스트 통과" --artifact .agents/results/result-backend.md

# 4. gate completion (exit 1 if any complete goal lacks evidence), then recap
node .agents/skills/oma-goal/scripts/oma-goal.mjs verify
node .agents/skills/oma-goal/scripts/oma-goal.mjs recap
```

### Resource scope
| Scope | Resource target |
|-------|-----------------|
| `LOCAL_FS` | `.agents/goals/` ledger files and `.agents/results/result-goal-recap.md` |
| `PROCESS` | `node` running `oma-goal.mjs` |
| `MEMORY` | Goal status, evidence, and recap notes |

### Preconditions
- Node 18+ or Bun is available on PATH.
- `init` has run (or is run first) so the ledger files exist.

### Effects and side effects
- Creates / updates files under `.agents/goals/` and writes the recap under `.agents/results/`.
- Appends exactly one event per mutation to `ledger.jsonl`; uses temp-file + rename for `goals.json`.
- Never stages or commits; never runs network calls.

### Ledger ownership (mandatory)
1. **Only the leader** mutates `.agents/goals/goals.json` and `.agents/goals/ledger.jsonl`.
2. **Subordinate workers submit evidence and a result summary only** - they do not mutate goal state.
3. **Checkpoint authority belongs to the leader.** A worker proposes evidence; the leader records the checkpoint.

### Guardrails
1. Keep the four SSL-lite top-level sections: `Scheduling`, `Structural Flow`, `Logical Operations`, `References`.
2. One ledger event per mutation; `ledger.jsonl` stays valid JSONL (one object per line).
3. `verify` is the completion gate: a `complete` goal without evidence is a failure (exit 1).
4. Do not hand goal-state mutation to subordinate agents; route their evidence through the leader.
5. Do not add external dependencies to the script; keep it pure Node standard library.
6. Do not overwrite an existing non-empty plan without `--force`.

## References
- Ledger and event schema: `resources/goal-ledger-schema.md`
- Canonical prompts and orchestration usage: `resources/canonical-prompts.md`
- Execution script: `scripts/oma-goal.mjs`
- Ledger directory: `.agents/goals/`
- Recap output: `.agents/results/result-goal-recap.md`
- Language config: `.agents/oma-config.yaml`

# Goal Ledger Schema

The oma-goal ledger lives under `.agents/goals/` and has three files:

| File | Role |
|------|------|
| `brief.md` | Source brief. `@goal:` delimiters (column 0) split it into goals; preamble is context only. |
| `goals.json` | Durable goal plan: aggregate metadata + per-goal state. Written atomically (temp + rename). |
| `ledger.jsonl` | Append-only audit trail. One JSON event per line (JSONL). |

Evidence files live under `.agents/goals/evidence/`. The recap is written to
`.agents/results/result-goal-recap.md`.

## `goals.json` (aggregate plan)

```json
{
  "version": 1,
  "brief": ".agents/goals/brief.md",
  "mode": "aggregate",
  "createdAt": "2026-06-05T06:00:00.000Z",
  "updatedAt": "2026-06-05T06:10:00.000Z",
  "goals": []
}
```

| Field | Type | Notes |
|-------|------|-------|
| `version` | number | Schema version. Currently `1`. |
| `brief` | string | Path (or summary) of the source brief. |
| `mode` | string | `"aggregate"` — the goal set is tracked as one durable plan. |
| `createdAt` | string | ISO 8601 timestamp, set once at first write. |
| `updatedAt` | string | ISO 8601 timestamp, refreshed on every mutation. |
| `goals` | array | List of goal objects (below). |

### Goal object (each entry of `goals[]`)

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | `G001`, `G002`, ... (zero-padded, 1-based). |
| `title` | string | Short goal title (from the `@goal:` suffix or first line). |
| `objective` | string | Full objective text (the `@goal:` block body). |
| `status` | string | One of the status values below. |
| `acceptanceCriteria` | string[] | Acceptance criteria; may start empty. |
| `evidenceRequired` | string[] | Evidence the goal must produce; may start empty. |
| `assignedRole` | string \| null | Role that owns the goal (e.g., `backend`, `qa`). |
| `assignedVendor` | string \| null | Vendor lane (e.g., `claude`, `codex`, `antigravity`). |
| `createdAt` | string | ISO 8601, set at goal creation. |
| `updatedAt` | string | ISO 8601, refreshed on each checkpoint. |
| `startedAt` | string \| null | ISO 8601, set when status first becomes `active`. |
| `completedAt` | string \| null | ISO 8601, set when status becomes `complete`. |
| `evidence` | string \| null | Latest evidence text recorded by a checkpoint. |
| `verification` | object \| null | Reserved for verification receipts; `null` until set. |

## `status` values

| Status | Meaning |
|--------|---------|
| `pending` | Created, not started. |
| `active` | In progress (`startedAt` is set). |
| `complete` | Finished and evidence-backed (`completedAt` is set). |
| `failed` | Attempted and failed. |
| `blocked` | Cannot proceed (external dependency / decision). |
| `review_blocked` | Held by a review gate; needs reviewer sign-off. |
| `superseded` | Replaced by another goal; no longer pursued. |

The completion gate (`verify`) treats a `complete` goal **without evidence** as a failure.

## `ledger.jsonl` (event audit trail)

One JSON object per line. Example:

```json
{"eventId":"evt_8f...","timestamp":"2026-06-05T06:10:00.000Z","event":"goal_checkpointed","goalId":"G001","status":"complete","actor":"leader","evidence":"테스트 통과","artifactRefs":[".agents/results/result-backend.md"],"verificationRefs":[],"notes":null}
```

| Field | Type | Notes |
|-------|------|-------|
| `eventId` | string | Unique id (`evt_` + UUID). |
| `timestamp` | string | ISO 8601 event time. |
| `event` | string | Event type (below). |
| `goalId` | string \| null | Target goal id, or `null` for plan-level events. |
| `status` | string \| null | Goal status set by the event (7-value enum). `null` for plan-level and `verify_run` events. |
| `actor` | string | Who recorded it. Always `leader` (ownership rule). |
| `evidence` | string \| null | Evidence text attached to the event. |
| `artifactRefs` | string[] | Paths to artifacts (result files, logs, screenshots). |
| `verificationRefs` | string[] | Goal ids flagged by a verification step. |
| `notes` | string \| null | Free-text note. |

### Event types

| `event` | Emitted by | Meaning |
|---------|-----------|---------|
| `ledger_initialized` | `init` | Ledger created. |
| `plan_created` | `create` | Goals decomposed from the brief. |
| `goal_checkpointed` | `checkpoint` | A goal's status / evidence changed. |
| `verify_run` | `verify` | Completion gate executed; pass/fail is conveyed by `notes` and `verificationRefs` (empty = pass, non-empty = fail). |

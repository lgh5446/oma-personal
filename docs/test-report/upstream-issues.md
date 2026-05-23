# OMA Upstream Issues — Discovered 2026-05-22

This document collects issues found during a full OMA audit that cannot be fixed inside `.agents/` (SSOT) and require changes in the compiled `oma` CLI binary. Submit each section as a separate GitHub issue at https://github.com/first-fluke/oh-my-agent/issues/new.

**Test environment**:
- OS: Windows 11 Pro 10.0.22631
- OMA: v8.5.0 (`/c/Users/user/.bun/bin/oma`, Bun-compiled PE32+ binary)
- Vendor CLIs: claude 2.1.147, codex 0.132.0 (npm install), antigravity 1.107.0
- Shell: Git Bash (MINGW64)

---

## Issue 1 — `oma agent:spawn -m codex` fails on Windows ("Failed to spawn process")

### Summary
On Windows, `oma agent:spawn -m codex` always exits with `[backend] Failed to spawn process`. Direct `codex exec` calls work fine. The `vendors.codex.command` override in `.agents/oma-config.yaml` is silently ignored.

### Reproduction
```bash
# Direct codex call (works)
codex exec "echo hi" -s read-only --skip-git-repo-check --ephemeral
# Output: hi (39222 tokens used)

# Via OMA (fails)
oma agent:spawn backend "Write hello world" test-session -m codex -w ./test-workspace
# Output:
#   [backend] Spawning subagent...
#     Vendor: codex
#     Dispatch: external (claude -> codex, cross-vendor or unsupported native path)
#   [backend] Failed to spawn process
```

### Tried workarounds (all failed)
1. `.agents/oma-config.yaml` → `vendors.codex.command: codex.cmd` — same failure
2. `.agents/oma-config.yaml` → `vendors.codex.command: "C:/Users/user/AppData/Roaming/npm/codex.cmd"` (absolute path) — same failure

This proves OMA is **not reading** `vendors.codex.command` from oma-config.yaml on spawn dispatch.

### Root cause hypothesis
codex is installed via npm and lives at `%APPDATA%/Roaming/npm/codex` as a POSIX shell script (`codex.cmd` is the Windows wrapper). Node.js `child_process.spawn(command, args, { shell: false })` on Windows cannot execute POSIX shell scripts without `shell: true` or an explicit `.cmd`/`.exe`/`.bat` extension. OMA's internal codex dispatcher appears to hardcode `codex` (no extension) and use `shell: false`, ignoring the config override.

### Expected
- `vendors.codex.command` in oma-config.yaml should be respected on dispatch, OR
- OMA should auto-detect Windows + npm-installed CLIs and prefer the `.cmd` wrapper, OR
- OMA should spawn with `shell: true` on Windows for shell-script CLIs

### Impact
🔴 CRITICAL — blocks 3-vendor orchestration on Windows. Users cannot use codex inside `oma agent:spawn` / `orchestrate` workflows.

---

## Issue 2 — `oma agent:spawn -m antigravity` explicitly rejected (no headless mode)

### Summary
`oma agent:spawn -m antigravity` returns an error stating that Antigravity headless JSON subprocess mode is unsupported.

### Reproduction
```bash
oma agent:spawn docs "Hello test" test-session -m antigravity -w ./test-workspace
# Output:
#   oma agent:spawn cannot run Antigravity CLI as a headless JSON subprocess.
#   Open `antigravity chat` and use the oh-my-agent plugin, slash commands,
#   or `/agents` panel instead.
```

### Expected (one of):
- Document this behavior prominently — current `vendor-detection.md` / `orchestrate.md` examples reference antigravity dispatch as if it would work
- Provide an explicit dispatcher that launches `antigravity chat` and pipes the prompt to the oh-my-agent plugin via slash command
- Add a `--allow-interactive` flag that pauses the orchestration and prompts the user to open antigravity chat manually

### Impact
🔴 CRITICAL for the documented `custom-triple-flagship` preset, which routes `docs`/`retrieval` agents to `google/gemini-3.5-flash` (now invoked via antigravity). 3-vendor orchestration cannot complete autonomously.

---

## Issue 3 — `oma link` fails with JSON parse error (file not identified)

### Summary
`oma link` exited with a JSON parse error but did not identify which file is malformed. **Resolved locally on 2026-05-23** by tracing all `JSON.parse` call sites and bisecting variant files — see "Resolution" below.

### Reproduction (original)
```bash
oma link
# Output:
#   ● Linking vendors: antigravity, claude, codex, cursor, qwen
#   Expected ',' or ']' after array element in JSON at position 374
#   (line 18 column 5)
```

### Root cause (identified 2026-05-23)
- The malformed file was `.agents/hooks/variants/codex.json` (585 bytes)
- Line 18 had `    },` where it should have been `    ],` — the `UserPromptSubmit` array was closed with `}` instead of `]`
- The actual `JSON.parse` site is `cli/platform/vendor-adapter.ts:169` (not the `qwenSettings = JSON.parse(...)` in `link.ts:94` which was a red herring)

### Resolution (local fix)
- Changed line 18 of `.agents/hooks/variants/codex.json` from `},` to `],`
- `oma link` now passes: ✓ antigravity, ✓ claude, ✓ codex, ✓ cursor, ✓ qwen, ✓ docs

### Remaining upstream improvement (still applicable)
Even though the local file is now valid, the OMA error message itself is **opaque**. Future occurrences (any malformed JSON in `.agents/hooks/variants/`, `.agents/mcp.json`, vendor settings) would face the same diagnostic difficulty.

### Expected upstream behavior
- Wrap `JSON.parse(readFileSync(path, ...))` calls in try/catch and rethrow with the file path included, e.g.:
  ```ts
  try { return JSON.parse(readFileSync(path, "utf-8")); }
  catch (e) { throw new Error(`Failed to parse JSON at ${path}: ${e.message}`); }
  ```
- This pattern applies to at least 30+ `JSON.parse` sites across the codebase (audited via `grep -rn "JSON.parse" cli/`)
- Add `oma link --dry-run` to preview regeneration

### Impact
- Before fix: 🟡 HIGH — blocked regeneration of `.claude/agents/`, `.codex/agents/`, `.gemini/agents/`
- After local fix: ✅ resolved on this machine
- Upstream value: error-message clarity for all 30+ JSON.parse sites benefits every user encountering similar malformed input

---

## Issue 4 — `oma doctor` skill count is wrong (27 instead of 29)

### Summary
`oma doctor` reports `Skills (27/27 installed)` but `.agents/skills/*/SKILL.md` resolves to **29 skills**. The two skills missing from doctor's list are `oma-market` and `oma-voice`.

### Reproduction
```bash
ls -d .agents/skills/oma-*/ | wc -l
# 29

oma doctor | grep -E "^\s*│\s*oma-" | wc -l
# 27 (missing oma-market and oma-voice)
```

### Expected
`oma doctor` should reflect all SKILL.md files in `.agents/skills/`. Either:
- Auto-discover any directory containing SKILL.md, OR
- Document the registration mechanism so users can register custom skills

### Impact
🔴 HIGH — `oma-market` and `oma-voice` are real working skills (both have complete SKILL.md and trigger entries in `.agents/hooks/core/triggers.json`) but appear hidden from the health check.

---

## Issue 5 — OMA does not inherit parent `.agents/` SSOT in subfolders

### Summary
Running `oma` from a subfolder of a project root that has `.agents/` does not pick up the parent's SSOT. OMA only inspects the current working directory.

### Reproduction
```bash
mkdir test-subfolder && cd test-subfolder
oma doctor
# Output: "Skills Status: No skills installed" + prompt to install 27 skills
```

### Tried workarounds
- `OMA_PROJECT_ROOT=<parent-path> oma doctor` — environment variable is ignored
- `oma doctor --workspace <parent>` — option does not exist

### Comparison
- `claude` (Claude Code): ✅ walks up directories to find `CLAUDE.md`
- `codex`: ✅ walks up directories to find `AGENTS.md`
- `antigravity`: ✅ walks up directories to find `GEMINI.md`
- `oma`: ❌ cwd only

### Expected (one of):
- Implement walk-up search for `.agents/` directory
- Support `OMA_PROJECT_ROOT` environment variable
- Add `--workspace <path>` flag to `oma doctor`, `oma agent:spawn`, etc.

### Impact
🟡 HIGH — forces users to either run `oma install` in every subfolder (duplicating SSOT) or always run OMA commands from the parent. Breaks the "single SSOT" mental model.

---

## Issue 6 — `oma agent:status` output is sparse

### Summary
`oma agent:status <session-id>` returns almost no output, even for sessions where agents successfully spawned and completed.

### Reproduction
```bash
oma agent:spawn pm "test" session-A -m claude -w ./workspace
# (completes successfully, result file created)

oma agent:status session-A
# Output: (almost empty, just a trailing newline)
```

### Expected
- Show per-agent status (running / completed / failed)
- Show token usage per vendor
- Show result file paths
- Honor `--json` for machine-readable output

### Impact
🟢 MEDIUM — debugging multi-agent orchestration becomes manual (have to grep `.agents/results/` and `.serena/memories/`).

---

## Issue 7 — Result files do not follow `result-{agent}-{sessionId}.md` naming

### Summary
The agent execution protocol (`.agents/skills/_shared/runtime/execution-protocols/CLAUDE.md` and `gemini.md`) specifies `result-{agent-id}-{sessionId}.md` for session-scoped runs. In practice, Claude spawn produces `result-claude-opus.md` (model name only).

### Reproduction
```bash
oma agent:spawn pm "test" my-session -m claude -w ./workspace
ls ./workspace/.agents/results/
# Output: result-claude-opus.md
# Expected: result-pm-my-session.md
```

### Expected
Either the agent should be instructed via the prompt template (charter) to follow the naming convention, or OMA should post-rename the file after the agent exits.

### Impact
🟢 MEDIUM — makes multi-session result tracking and orchestration result polling unreliable.

---

## Issue 8 — Result files saved to child `.agents/results/`, not project root

### Summary
When using `oma agent:spawn ... -w <subfolder>` (the "parent SSOT, child workspace" pattern), result files are written to `<subfolder>/.agents/results/` rather than the project root's `.agents/results/`. This contradicts the protocol's CRITICAL note: "All result, progress, and state files MUST be written to the **project root** memory path."

### Reproduction
See Issue 7 reproduction — the result file appears at `./workspace/.agents/results/`, not `./.agents/results/`.

### Expected
- Agents should detect the project root (git root or nearest ancestor with `.agents/`) and write results there
- OR explicit `--results-dir <path>` flag

### Impact
🟡 HIGH — orchestrators expecting results in the project root will not find them; result aggregation across multi-vendor sessions breaks.

---

## Common Environment for All Issues

```
OS: Windows 11 Pro 10.0.22631
Shell: Git Bash (MINGW64)
OMA: v8.5.0 (Bun-compiled PE32+)
Bun: installed at /c/Users/user/.bun/
codex install: %APPDATA%/Roaming/npm/{codex, codex.cmd, codex.ps1}
claude install: separate (Claude Code IDE)
antigravity install: separate (Google IDE)
```

---

## Triage Suggestion for OMA Maintainers

| Issue | Priority | Effort |
|---|---|---|
| #1 (codex Windows spawn) | P0 (blocks 3-vendor) | M (cross-platform dispatcher) |
| #2 (antigravity headless) | P0 (blocks 3-vendor) | L (plugin auto-launch) |
| #5 (parent SSOT inherit) | P1 (UX) | M (walk-up search) |
| #4 (skill count) | P1 (correctness) | S (auto-discover) |
| #3 (oma link JSON error) | P1 (debuggability) | S (include file path in error) |
| #8 (result location) | P2 | M (project root detection) |
| #7 (result naming) | P2 | S (charter template fix) |
| #6 (status sparse) | P3 | M (output enhancement) |

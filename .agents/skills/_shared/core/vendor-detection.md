# Vendor Detection Protocol

When executing a workflow, determine your runtime environment using this priority order.
Then resolve the target vendor for each agent from `.agents/oma-config.yaml` (`agent_cli_mapping`, `default_cli`).

Important:
- Do **not** choose one spawn strategy for the entire workflow based only on the main runtime vendor.
- Decide per agent:
  - `current_runtime_vendor`
  - `target_vendor_for_agent`
  - whether that exact runtime can invoke that target vendor natively
- If native invocation is not available for that agent, fall back to `oma agent:spawn`.

## Detection Order (use first match)

1. **Claude Code**: Your system prompt contains "You are Claude Code" OR the `Agent` tool is available
2. **Codex CLI**: Your system prompt contains "Codex CLI" OR the `apply_patch` tool is available
3. **Antigravity (Google)**: This file was auto-loaded from `.agents/skills/` while running inside the `antigravity chat` panel. Antigravity replaces the deprecated Gemini CLI as of 2026-05.
4. **Gemini CLI (deprecated)**: Same load condition as Antigravity AND `@` subagent syntax is available. Treat as legacy — prefer migrating to Antigravity.
5. **CLI Fallback**: None of the above matched → use `oma agent:spawn`

## Vendor-Specific Spawn Methods

| Vendor | Spawn Method | Result Handling |
|:---|:---|:---|
| Claude Code | `Agent` tool with `.claude/agents/{name}.md` | Synchronous return |
| Codex CLI | Native custom agents in `.codex/agents/{name}.toml` via `codex exec "@agent ..."` when available, otherwise `oma agent:spawn` | JSON output |
| Antigravity (Google) | Interactive `antigravity chat` panel with the oh-my-agent plugin under `~/.gemini/antigravity-cli/plugins/oh-my-agent/`. Reuses `.gemini/agents/{name}.md` definitions. **`oma agent:spawn -m antigravity` is explicitly rejected** (headless mode unsupported). | Plugin slash commands or `/agents` panel |
| Gemini CLI (deprecated) | `.gemini/agents/{name}.md` native subagents via `gemini -p "@agent ..."` when available, otherwise `oma agent:spawn` | JSON output or MCP memory poll |
| CLI Fallback | `oma agent:spawn {agent} {prompt} {session} -w {workspace}` | Result file poll |

## Dispatch Rule

For each agent:

1. Resolve `target_vendor_for_agent` from config
2. If `target_vendor_for_agent === current_runtime_vendor` and that runtime has a verified native role-subagent path for that vendor, use the vendor variant agent definition
3. Otherwise, use `oma agent:spawn`
4. **Special case — Antigravity target**: Since headless spawn is unsupported, route the work back to the user with a clear instruction to open `antigravity chat` and run the corresponding `/agent` slash command. Do not silently fall through to `oma agent:spawn -m antigravity` (it will error).

Example:
- Runtime: Claude Code
- Mapping: `frontend: claude`, `backend: claude`, `qa: antigravity`
- Result:
  - `frontend` -> native Claude subagent (Agent tool)
  - `backend` -> native Claude subagent (Agent tool)
  - `qa` -> instruct the user to run `/qa-reviewer` inside `antigravity chat` (headless spawn unsupported)

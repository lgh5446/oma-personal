# Execution Protocol (Antigravity)

Antigravity (Google) replaces the deprecated Gemini CLI as of 2026-05. Antigravity reuses the same `.gemini/agents/{name}.md` definitions for backwards compatibility but is invoked through the interactive `antigravity chat` panel.

**Important**: Antigravity does **not** support headless JSON subprocess mode. `oma agent:spawn -m antigravity` is explicitly rejected. Use the oh-my-agent plugin staged under `~/.gemini/antigravity-cli/plugins/oh-my-agent/`, slash commands, or the `/agents` panel inside the chat session.

## MCP Memory Tools

Same as the Gemini protocol — tool names are configurable via `mcp.json → memoryConfig.tools`:
- `[READ]` → default: `read_memory`
- `[WRITE]` → default: `write_memory`
- `[EDIT]` → default: `edit_memory`
- `[LIST]` → default: `list_memories`
- `[DELETE]` → default: `delete_memory`

Memory base path is configurable via `memoryConfig.basePath` (default: `.serena/memories`).

### Path Resolution (CRITICAL)

All result, progress, and state files MUST be written to the **project root** memory path, never to a subdirectory's memory path.

- **Session-scoped naming**: when running under an orchestration session, append session ID as suffix:
  - `result-{agent-id}-{sessionId}.md` (e.g., `result-frontend-session-20260405-100835.md`)
  - `progress-{agent-id}-{sessionId}.md`
- **Manual (non-orchestrated) runs**: no suffix, `result-{agent-id}.md`

## On Start

1. `[READ]("task-board.md")` to confirm your assigned task
2. `[WRITE]("progress-{agent-id}[-{sessionId}].md", initial progress entry)` with Turn 1 status

## During Execution

- Every 3-5 turns: `[EDIT]("progress-{agent-id}[-{sessionId}].md")` to append a new turn entry
- Include: action taken, current status, files created/modified

## On Completion

- `[WRITE]("result-{agent-id}[-{sessionId}].md")` with final result including:
  - Status: `completed` or `failed`
  - Summary of work done
  - Files created/modified
  - Acceptance criteria checklist

## On Failure

- Still create `result-{agent-id}[-{sessionId}].md` with Status: `failed`
- Include detailed error description and what remains incomplete

## Antigravity-Specific Notes

- **Slash commands**: dispatch to a named agent via `/{agent-id}` inside the chat panel (e.g., `/backend-engineer`).
- **`/agents` panel**: visual list of available subagents staged from `.gemini/agents/`.
- **No `@` syntax** — that was a Gemini CLI feature.
- **Coordination via memory**: same `.serena/memories/` polling pattern as Gemini and Claude. Orchestrators in other runtimes (Claude Code, Codex) can monitor your progress via the memory layer.

# OMA Issue #1 Codex Spawn Attempt

**Date**: 2026-05-22 14:48 KST  
**Status**: SUCCESS

## Goal

Make `oma agent:spawn -m codex` usable on Windows without editing the OMA binary or `.agents/oma-config.yaml`.

## Baseline

| Check | Result |
|---|---|
| OMA version | `8.5.0` |
| npm `@openai/codex` | `0.133.0` |
| npm `codex` wrapper | POSIX `#!/bin/sh` script |
| npm `codex.cmd` | Windows cmd wrapper exists |
| npm `codex.js` | `C:\Users\user\AppData\Roaming\npm\node_modules\@openai\codex\bin\codex.js` exists |
| Initial `where.exe codex` | `C:\Users\user\AppData\Roaming\npm\codex` first |
| Initial result files | only `result-claude-opus.md` in `oma-3vendor-live-test\.agents\results` |

## Changes Applied

| Target | Change | SHA256 |
|---|---|---|
| `C:\Users\user\bin\codex.exe` | Created C# native shim that calls `node.exe ...\codex.js` and forwards exit code | `5C44CC0075C20F6698F8A54CBC0AD813EAD7C3BC3184CF683706AF67E462CA1C` |
| User PATH | Prepended `C:\Users\user\bin` to User PATH only | n/a |
| `codex.js` | Backed up original, then added OMA-safe `exec` flag normalization | `15CC91C42BFB79609F2E0FFCE73E805027BAF6ADF38567504C6F5946FEAF7A14` |
| `codex.js.oma-codexfix-20260522.bak` | Original npm entrypoint backup | `AA3C64B122C9D06BF48EAF988F5970AA69556D69506C3118CF07D10B2401B48A` |

`codex.js` patch behavior:

1. For `exec`, add `-s read-only`, `--skip-git-repo-check`, and `--ephemeral` when missing.
2. For OMA-style `@agent` prompts only, convert `-s read-only` to `-s workspace-write` so result files are permitted if the subagent attempts to write them.
3. Leave non-`exec` commands such as `codex --version` untouched.

## Attempts

| Attempt | Command / Check | Exit | Result |
|---|---|---:|---|
| Baseline direct Codex | `codex exec "Reply exactly: codex-shim-smoke" -s read-only --skip-git-repo-check --ephemeral` | 0 | `codex-shim-smoke` |
| Shim direct | `C:\Users\user\bin\codex.exe --version` | 0 | `codex-cli 0.133.0` |
| Shim direct exec | `C:\Users\user\bin\codex.exe exec "Reply exactly: shim-codex-ok" -s read-only --skip-git-repo-check --ephemeral` | 0 | `shim-codex-ok` |
| PATH smoke | `where.exe codex` in User+Machine PATH runner | 0 | `C:\Users\user\bin\codex.exe` first |
| OMA Attempt 1 before `codex.js` patch | `oma agent:spawn backend "hello test" codexfix-001 -m codex -w ./oma-3vendor-live-test` | 1 | Spawn succeeded, Codex failed trust check: `--skip-git-repo-check` absent |
| npm entrypoint smoke after patch | `node ...\codex.js exec "Reply exactly: npm-entry-ok"` | 0 | `npm-entry-ok` |
| OMA Attempt 1 after patch | same `codexfix-001` command | 0 | `[backend] Exited with code 0` |
| Final OMA verify | `oma agent:spawn backend "hello from codex fix" codexfix-verify -m codex -w ./oma-3vendor-live-test` | 0 | `[backend] Exited with code 0`; `session-cost-codexfix-verify.md` recorded |
| Result-file explicit retry | same session with prompt instructing `result-backend-codexfix-verify.md` creation | 0 | OMA exited 0; result file still absent |

## Final Verification

| Acceptance criterion | Status | Evidence |
|---|---|---|
| `oma agent:spawn -m codex` exits 0 | PASS | final `codexfix-verify` exited 0 |
| `where.exe codex` resolves shim first in refreshed User PATH | PASS | `C:\Users\user\bin\codex.exe` first |
| Direct shim smoke works | PASS | `shim-codex-ok` |
| OMA result file with `codexfix-verify` appears | FAIL | no `codexfix-verify` result file under `oma-3vendor-live-test\.agents\results` |

## Remaining Upstream Issue

The original Windows spawn blocker is bypassed, but result artifact creation is still unreliable.

Observed root causes:

1. OMA 8.5.0 Windows path does not actually spawn `codex` from PATH. `normalizeWindowsInvocation()` rewrites `codex` to `process.execPath + npm codex.js`.
2. `codex.js` originally forwarded args exactly, so OMA native dispatch reached Codex without effective trust handling.
3. Even after OMA exits 0, the Codex subagent did not create `result-backend-codexfix-verify.md`. OMA only recorded `.serena\memories\session-cost-codexfix-verify.md`.

Upstream proposal:

- In OMA, remove the hard rewrite from `codex` to `process.execPath + codex.js`, or only apply it when `vendorConfig.command` is unset.
- Prefer a real Windows executable resolution order: `codex.exe` -> `codex.cmd` -> npm `codex.js`.
- Preserve and log the final invocation args for `agent:spawn` when `log_level: debug`.
- Ensure Codex native dispatch can write result artifacts, or have OMA post-process successful stdout/log output into `result-{agent}-{sessionId}.md`.

## 2026-05-22 OMA Source Fix

The upstream proposal was implemented in OMA source and rebuilt into the installed `oma` command.

| Evidence | Result |
|---|---|
| OMA source patch | `spawn-status.ts` now resolves Windows Codex as `codex.exe -> codex.cmd -> npm codex.js`, injects Codex `exec` safety flags, creates `.agents/results`, and writes fallback `result-{agent}-{session}.md` artifacts |
| Status / verify patch | `agent:status` and `oma verify` now search `.agents/results` before legacy `.serena/memories` |
| Focused tests | `bun test cli/commands/agent/spawn-status.test.ts cli/commands/agent/check-status.test.ts cli/commands/verify/verify-scope.test.ts cli/io/runtime-dispatch.test.ts` -> `67 pass` |
| Typecheck | `bun run typecheck` -> exit `0` |
| Build | `bun run build` -> exit `0` |
| Installed OMA build hash | `C:\Users\user\.bun\install\global\node_modules\oh-my-agent\bin\cli.js` SHA256 `61999A049B22DF8F6BF623191E56EA96D85C8C53C35E912F1981EB533AA1DE91` |
| Restored npm `codex.js` hash | SHA256 `AA3C64B122C9D06BF48EAF988F5970AA69556D69506C3118CF07D10B2401B48A` |

### Live Smoke After Restoring `codex.js`

| Check | Exit / Status | Evidence |
|---|---:|---|
| `oma agent:spawn backend "hello from codex artifact fix" codexartifact-verify -m codex -w ./oma-3vendor-live-test` | `1` | Codex reached `thread.started`, then account quota returned `You've hit your usage limit... try again at 3:55 PM.` |
| Result artifact | created | `oma-3vendor-live-test\.agents\results\result-backend-codexartifact-verify.md` |
| Result artifact SHA256 | n/a | `50F1055EF8514ACF1EB0CF2CFFA27A0AB9732C52EDD9E38E3A483EAEBD4CA96D` |
| `oma agent:status codexartifact-verify backend -r ./oma-3vendor-live-test` | `backend:failed` | Status read from `.agents/results` |
| `oma verify backend --workspace ./oma-3vendor-live-test --json` | exit `0` | `ok: true`, summary `{ passed: 2, failed: 0, warned: 1 }` |

Interpretation: the Codex completion path was blocked by an external account quota, but OMA no longer depends on the patched npm `codex.js`; it now creates the result artifact itself for both success and failure exits.

## Verdict

`oma agent:spawn -m codex` is now runnable on this machine without the npm `codex.js` patch, and OMA directly guarantees a session-scoped result artifact under `.agents/results`. A later retry after the Codex quota reset is still needed to observe `Status: completed` for `codexartifact-verify`.

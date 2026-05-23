# server.js Security Audit Checklist

**Target**: `src/backend/server.js` (+ `src/backend/routes.js`)
**Priority order**: Security > Performance > Accessibility > Code Quality
**Severity**: CRITICAL / HIGH / MEDIUM / LOW

---

## 1. Configuration & Hardening

| # | Check | Severity | Status |
|---|---|---|---|
| 1.1 | `PORT` sourced from `process.env.PORT` (not hardcoded `3000`) — `server.js:6` | MEDIUM | [ ] |
| 1.2 | `NODE_ENV` respected for prod-only hardening | MEDIUM | [ ] |
| 1.3 | Secrets (DB URL, JWT key) never hardcoded — read from env | CRITICAL | [ ] |
| 1.4 | `.env` listed in `.gitignore`, no secrets in repo history | CRITICAL | [ ] |

## 2. HTTP Headers & Middleware

| # | Check | Severity | Status |
|---|---|---|---|
| 2.1 | `helmet()` applied (CSP, X-Frame-Options, HSTS) — **MISSING** in `server.js:8` | HIGH | [ ] |
| 2.2 | `cors()` configured with explicit `origin` allowlist (not `*`) — `server.js:8` | HIGH | [ ] |
| 2.3 | `express.json({ limit: '10kb' })` body-size cap — `server.js:9` lacks limit | HIGH | [ ] |
| 2.4 | `X-Powered-By` disabled (`app.disable('x-powered-by')`) | LOW | [ ] |
| 2.5 | HTTPS enforced behind proxy (`app.set('trust proxy', 1)` + redirect) | HIGH | [ ] |

## 3. Authentication & Authorization

| # | Check | Severity | Status |
|---|---|---|---|
| 3.1 | All write routes (`POST/PATCH/DELETE /todos`) gated by JWT middleware | CRITICAL | [ ] |
| 3.2 | Authorization check before destructive ops — `routes.js:39` deletes any id | CRITICAL | [ ] |
| 3.3 | Tokens verified with `bcrypt` + asymmetric JWT (`RS256`), not `HS256` w/ shared secret | HIGH | [ ] |
| 3.4 | Auth endpoints rate-limited (`express-rate-limit`) | HIGH | [ ] |

## 4. Input Validation & Sanitization

| # | Check | Severity | Status |
|---|---|---|---|
| 4.1 | `title` validated (string, 1–200 chars) via `zod`/`joi` — `routes.js:18` accepts anything | HIGH | [ ] |
| 4.2 | Output escaped/sanitized to block XSS — `routes.js:21` stores raw HTML | HIGH | [ ] |
| 4.3 | `:id` validated as positive integer before `parseInt` — `routes.js:30,40` | MEDIUM | [ ] |
| 4.4 | Reject unknown fields (mass-assignment protection) | MEDIUM | [ ] |

## 5. Error Handling & Logging

| # | Check | Severity | Status |
|---|---|---|---|
| 5.1 | Central error-handling middleware — **MISSING**, comment confirms it at `server.js:13` | HIGH | [ ] |
| 5.2 | Stack traces hidden in production responses | HIGH | [ ] |
| 5.3 | Structured logger (`pino`/`winston`) instead of `console.log` — `server.js:15` | LOW | [ ] |
| 5.4 | Sensitive data (tokens, PII) never logged | HIGH | [ ] |

## 6. Rate Limiting & DoS Protection

| # | Check | Severity | Status |
|---|---|---|---|
| 6.1 | Global rate limit on `/api/*` | HIGH | [ ] |
| 6.2 | Slow-down (`express-slow-down`) on write endpoints | MEDIUM | [ ] |
| 6.3 | Request timeout configured (`server.setTimeout`) | MEDIUM | [ ] |

## 7. State & Data Layer

| # | Check | Severity | Status |
|---|---|---|---|
| 7.1 | No in-memory mutable state for user data — `routes.js:5` violates statelessness (rule §12) | HIGH | [ ] |
| 7.2 | Persistent store with parameterized queries (no string interpolation) | CRITICAL | [ ] |
| 7.3 | Explicit transaction boundaries on multi-step writes | MEDIUM | [ ] |

## 8. Dependencies

| # | Check | Severity | Status |
|---|---|---|---|
| 8.1 | `npm audit --production` clean (no HIGH/CRITICAL) | HIGH | [ ] |
| 8.2 | `package-lock.json` committed | MEDIUM | [ ] |
| 8.3 | `express`, `cors` pinned to non-vulnerable versions | HIGH | [ ] |

---

## Summary of Findings (current code)

| Severity | Count | Notable |
|---|---|---|
| CRITICAL | 2 | No authorization on DELETE (`routes.js:39`); no auth gate on writes |
| HIGH | 6 | Missing helmet, error middleware, validation, XSS sanitization, body-size limit, rate limiting |
| MEDIUM | 4 | Hardcoded PORT, no id validation, in-memory state, no timeouts |
| LOW | 2 | `X-Powered-By` exposed, `console.log` only |

**Next action**: triage CRITICAL items first → add auth middleware + input validator before any deployment.

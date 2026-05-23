# Database Schema Analysis

## Summary

The project contains a SQLite schema for a simple Todo app in `src/db/schema.sql`, but the running Express backend currently uses in-memory storage in `src/backend/routes.js`. The schema is therefore a design artifact rather than an active persistence layer.

## Schema Shape

- External schema: API consumers see todo items with `id`, `title`, and `done`.
- Conceptual schema: one entity, `todos`, representing tasks with completion state.
- Internal schema: SQLite table with an auto-incrementing integer primary key, text title, boolean-like completion flag, and timestamp columns.

## Strengths

- `id INTEGER PRIMARY KEY AUTOINCREMENT` gives each todo a stable identifier.
- `title TEXT NOT NULL` prevents completely empty persisted records at the database layer.
- `created_at` and `updated_at` fields establish a basic lifecycle/audit shape.

## Gaps and Risks

- The backend does not load or write to SQLite, so schema constraints are not enforced at runtime.
- `done BOOLEAN DEFAULT 0` relies on SQLite's loose typing; a `CHECK (done IN (0, 1))` constraint would make valid values explicit.
- `updated_at` has a default value but no trigger or application code to refresh it on updates.
- Sample `INSERT` statements are not idempotent and may duplicate rows if the schema file is run repeatedly.

## Recommended Next Steps

1. Wire the backend to SQLite or clearly mark the schema as documentation-only.
2. Add `CHECK (done IN (0, 1))` and input validation for `title`.
3. Make seed data idempotent, for example by using a dedicated seed script or guarded inserts.
4. Add update logic for `updated_at` when a todo changes.

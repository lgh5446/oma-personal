# OMA Integration Test - Todo App

A simple Todo application used to test oh-my-agent (OMA) 3-vendor orchestration.

## Stack
- Frontend: HTML + Vanilla JS + CSS
- Backend: Node.js + Express
- Database: SQLite (schema only)
- Mobile: Flutter (stub)
- Infrastructure: Terraform (stub)

## Purpose
This project serves as a test harness for validating:
1. 12 OMA agent roles across 3 vendors (Claude/Codex/Gemini)
2. 27 OMA skills
3. Workflow triggers and hook system
4. Serena MCP memory integration

## Running
```bash
npm install
node src/backend/server.js
```

Open `src/frontend/index.html` in browser.

#!/usr/bin/env node
// oma-goal.mjs - OMA durable goal ledger CLI.
// Ported ledger pattern from Gajae-Code `ultragoal` (brief.md / goals.json / ledger.jsonl).
// Pure Node ESM. No external dependencies. Runs on Node 18+ or Bun.
//
// Commands: init | status | create | checkpoint | verify | recap
// Ledger files live under .agents/goals/. Recap output under .agents/results/.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// -- Paths (resolved relative to the current working directory) ----------------
const ROOT = process.cwd();
const GOALS_DIR = path.join(ROOT, '.agents', 'goals');
const BRIEF_PATH = path.join(GOALS_DIR, 'brief.md');
const GOALS_JSON = path.join(GOALS_DIR, 'goals.json');
const LEDGER_JSONL = path.join(GOALS_DIR, 'ledger.jsonl');
const EVIDENCE_DIR = path.join(GOALS_DIR, 'evidence');
const RESULTS_DIR = path.join(ROOT, '.agents', 'results');
const RECAP_PATH = path.join(RESULTS_DIR, 'result-goal-recap.md');

const VALID_STATUS = ['pending', 'active', 'complete', 'failed', 'blocked', 'review_blocked', 'superseded'];

// -- Exit codes ----------------------------------------------------------------
//   0 = success / verify pass
//   1 = verify failure (completion gate not met)
//   2 = usage or runtime error
const EXIT_OK = 0;
const EXIT_VERIFY_FAIL = 1;
const EXIT_ERROR = 2;

// -- Helpers -------------------------------------------------------------------
function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function die(message, code = EXIT_ERROR) {
  process.stderr.write(`oma-goal: error: ${message}\n`);
  process.exit(code);
}

function nowIso() {
  return new Date().toISOString();
}

function eventId() {
  return `evt_${crypto.randomUUID()}`;
}

function readJson(file) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') die(`file not found: ${rel(file)} (run \`init\` first)`);
    return die(`cannot read ${rel(file)}: ${err.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    return die(`invalid JSON in ${rel(file)}: ${err.message}`);
  }
}

// Atomic-ish write: write to a temp file in the same dir, then rename over target.
// I/O failures (EPERM, ENOSPC, EEXIST race) exit via die() instead of a raw stack trace.
function writeJsonAtomic(file, obj) {
  const dir = path.dirname(file);
  const tmp = path.join(dir, `.${path.basename(file)}.tmp.${process.pid}.${Math.random().toString(36).slice(2)}`);
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmp, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
    fs.renameSync(tmp, file);
  } catch (err) {
    try { fs.rmSync(tmp, { force: true }); } catch { /* best-effort temp cleanup */ }
    die(`cannot write ${rel(file)}: ${err.message}`);
  }
}

// One JSON object per line (JSONL), newline fixed to \n for cross-platform diffs.
function appendJsonl(file, obj) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `${JSON.stringify(obj)}\n`, 'utf8');
  } catch (err) {
    die(`cannot append ${rel(file)}: ${err.message}`);
  }
}

function parseArgs(argv) {
  // Supports `--key value`, repeatable `--artifact value`, and bare `--force`.
  // `_flags` records every flag name seen so commands can reject unknown options.
  const args = { _: [], artifact: [], _flags: [] };
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (tok.startsWith('--')) {
      const key = tok.slice(2);
      args._flags.push(key);
      const next = argv[i + 1];
      const hasValue = next !== undefined && !next.startsWith('--');
      if (key === 'artifact') {
        if (!hasValue) die('--artifact requires a value');
        args.artifact.push(next);
        i++;
      } else if (key === 'force') {
        args.force = true;
      } else if (hasValue) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else {
      args._.push(tok);
    }
  }
  return args;
}

function argGoalId(a) {
  return a['goal-id'] || a.goalId;
}

function emptyPlan() {
  const ts = nowIso();
  return { version: 1, brief: '', mode: 'aggregate', createdAt: ts, updatedAt: ts, goals: [] };
}

function goalIdFor(index) {
  return `G${String(index + 1).padStart(3, '0')}`;
}

// Parse @goal: delimited brief. Column-0 `@goal:` (or `@goal` + whitespace) starts
// a story. Preamble before the first delimiter is context only. No delimiter =>
// the whole brief becomes a single goal G001.
function parseGoalsFromBrief(text) {
  const lines = text.split(/\r?\n/);
  const delim = /^@goal(?::|[ \t]+|$)/;
  const blocks = [];
  let current = null;
  for (const line of lines) {
    if (delim.test(line)) {
      current = { title: line.replace(delim, '').trim(), body: [] };
      blocks.push(current);
    } else if (current) {
      current.body.push(line);
    }
    // lines before the first delimiter (preamble) are ignored for goals
  }
  if (blocks.length === 0) {
    const body = text.trim();
    const firstLine = (body.split(/\r?\n/).find((l) => l.trim()) || 'Goal').trim();
    return [{ title: firstLine.slice(0, 120), objective: body }];
  }
  return blocks.map((b) => {
    const objective = b.body.join('\n').trim();
    const title = (b.title || (objective.split(/\r?\n/).find((l) => l.trim()) || 'Goal').trim()).slice(0, 120);
    return { title, objective };
  });
}

function newGoal(index, parsed) {
  const ts = nowIso();
  return {
    id: goalIdFor(index),
    title: parsed.title,
    objective: parsed.objective,
    status: 'pending',
    acceptanceCriteria: [],
    evidenceRequired: [],
    assignedRole: null,
    assignedVendor: null,
    createdAt: ts,
    updatedAt: ts,
    startedAt: null,
    completedAt: null,
    evidence: null,
    verification: null,
  };
}

function countByStatus(goals) {
  const c = {};
  for (const g of goals) c[g.status] = (c[g.status] || 0) + 1;
  return c;
}

function hasEvidence(goal) {
  return typeof goal.evidence === 'string' && goal.evidence.trim().length > 0;
}

// -- Commands ------------------------------------------------------------------
function cmdInit() {
  const created = [];
  const skipped = [];
  fs.mkdirSync(GOALS_DIR, { recursive: true });
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

  const gitkeep = path.join(EVIDENCE_DIR, '.gitkeep');
  if (!fs.existsSync(gitkeep)) { fs.writeFileSync(gitkeep, '', 'utf8'); created.push(rel(gitkeep)); }
  else skipped.push(rel(gitkeep));

  if (!fs.existsSync(BRIEF_PATH)) { fs.writeFileSync(BRIEF_PATH, BRIEF_TEMPLATE, 'utf8'); created.push(rel(BRIEF_PATH)); }
  else skipped.push(rel(BRIEF_PATH));

  if (!fs.existsSync(GOALS_JSON)) { writeJsonAtomic(GOALS_JSON, emptyPlan()); created.push(rel(GOALS_JSON)); }
  else skipped.push(rel(GOALS_JSON));

  if (!fs.existsSync(LEDGER_JSONL)) {
    fs.writeFileSync(LEDGER_JSONL, '', 'utf8');
    appendJsonl(LEDGER_JSONL, {
      eventId: eventId(), timestamp: nowIso(), event: 'ledger_initialized',
      goalId: null, status: null, actor: 'leader', evidence: null,
      artifactRefs: [], verificationRefs: [], notes: 'oma-goal init',
    });
    created.push(rel(LEDGER_JSONL));
  } else skipped.push(rel(LEDGER_JSONL));

  process.stdout.write(`init: created [${created.join(', ') || 'none'}]\n`);
  if (skipped.length) process.stdout.write(`init: kept    [${skipped.join(', ')}]\n`);
  process.exit(EXIT_OK);
}

function cmdStatus() {
  const plan = readJson(GOALS_JSON);
  const counts = countByStatus(plan.goals);
  process.stdout.write(`brief: ${plan.brief || '(none)'}\n`);
  process.stdout.write(`mode:  ${plan.mode}   goals: ${plan.goals.length}\n`);
  process.stdout.write(`status: ${VALID_STATUS.map((s) => `${s}=${counts[s] || 0}`).join('  ')}\n`);
  process.stdout.write('---\n');
  for (const g of plan.goals) process.stdout.write(`${g.id}  [${g.status}]  ${g.title}\n`);
  let events = 0;
  if (fs.existsSync(LEDGER_JSONL)) {
    events = fs.readFileSync(LEDGER_JSONL, 'utf8').split('\n').filter((l) => l.trim()).length;
  }
  process.stdout.write(`---\nledger events: ${events}\n`);
  process.exit(EXIT_OK);
}

function cmdCreate(a) {
  const plan = readJson(GOALS_JSON);
  if (plan.goals.length > 0 && !a.force) {
    die(`goals.json already has ${plan.goals.length} goal(s); pass --force to regenerate (overwrites goal state)`);
  }
  const briefPath = a.brief ? path.resolve(ROOT, a.brief) : BRIEF_PATH;
  let text;
  try {
    text = fs.readFileSync(briefPath, 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') die(`brief not found: ${rel(briefPath)}`);
    return die(`cannot read brief ${rel(briefPath)}: ${err.message}`);
  }
  const parsed = parseGoalsFromBrief(text);
  if (parsed.length === 0) die('brief produced no goals');
  const goals = parsed.map((p, i) => newGoal(i, p));
  plan.brief = rel(briefPath);
  plan.goals = goals;
  plan.updatedAt = nowIso();
  writeJsonAtomic(GOALS_JSON, plan);
  appendJsonl(LEDGER_JSONL, {
    eventId: eventId(), timestamp: nowIso(), event: 'plan_created',
    goalId: null, status: null, actor: 'leader', evidence: null,
    artifactRefs: [], verificationRefs: [], notes: `created ${goals.length} goal(s) from ${rel(briefPath)}`,
  });
  process.stdout.write(`create: ${goals.length} goal(s)\n`);
  for (const g of goals) process.stdout.write(`  ${g.id}  ${g.title}\n`);
  process.exit(EXIT_OK);
}

function cmdCheckpoint(a) {
  const goalId = argGoalId(a);
  const status = a.status;
  if (!goalId) die('checkpoint requires --goal-id');
  if (!status || status === true) die('checkpoint requires --status');
  if (!VALID_STATUS.includes(status)) die(`invalid status "${status}"; allowed: ${VALID_STATUS.join(', ')}`);

  const plan = readJson(GOALS_JSON);
  const goal = plan.goals.find((g) => g.id === goalId);
  if (!goal) die(`goal id not found: ${goalId}`);

  const ts = nowIso();
  goal.status = status;
  goal.updatedAt = ts;
  if (status === 'active' && !goal.startedAt) goal.startedAt = ts;
  if (status === 'complete') goal.completedAt = ts;
  const evidence = typeof a.evidence === 'string' ? a.evidence : null;
  if (evidence) goal.evidence = evidence;
  const artifactRefs = a.artifact.slice();
  plan.updatedAt = ts;
  writeJsonAtomic(GOALS_JSON, plan);
  appendJsonl(LEDGER_JSONL, {
    eventId: eventId(), timestamp: ts, event: 'goal_checkpointed',
    goalId, status, actor: 'leader', evidence,
    artifactRefs, verificationRefs: [], notes: null,
  });
  process.stdout.write(
    `checkpoint: ${goalId} -> ${status}` +
    `${evidence ? ' (evidence set)' : ''}` +
    `${artifactRefs.length ? ` (${artifactRefs.length} artifact)` : ''}\n`,
  );
  process.exit(EXIT_OK);
}

function cmdVerify() {
  const plan = readJson(GOALS_JSON);
  const counts = countByStatus(plan.goals);
  const completed = plan.goals.filter((g) => g.status === 'complete');
  const missingEvidence = completed.filter((g) => !hasEvidence(g));
  const pass = missingEvidence.length === 0;
  const ts = nowIso();

  process.stdout.write('verify:\n');
  process.stdout.write(`  complete: ${completed.length} (with evidence: ${completed.length - missingEvidence.length})\n`);
  process.stdout.write(
    `  pending=${counts.pending || 0} active=${counts.active || 0} failed=${counts.failed || 0} ` +
    `blocked=${counts.blocked || 0} review_blocked=${counts.review_blocked || 0} superseded=${counts.superseded || 0}\n`,
  );
  for (const g of missingEvidence) process.stdout.write(`  FAIL ${g.id}: complete without evidence\n`);

  // `status` stays null (reserved for the 7-value goal-status enum); the run result
  // is conveyed by `notes` and by verificationRefs (empty = pass, non-empty = fail).
  appendJsonl(LEDGER_JSONL, {
    eventId: eventId(), timestamp: ts, event: 'verify_run',
    goalId: null, status: null, actor: 'leader', evidence: null,
    artifactRefs: [], verificationRefs: missingEvidence.map((g) => g.id),
    notes: pass
      ? `verify pass (${completed.length} complete)`
      : `verify fail (${missingEvidence.length} complete without evidence)`,
  });
  process.stdout.write(`  result: ${pass ? 'PASS' : 'FAIL'}\n`);
  process.exit(pass ? EXIT_OK : EXIT_VERIFY_FAIL);
}

function cmdRecap() {
  const plan = readJson(GOALS_JSON);
  const counts = countByStatus(plan.goals);
  const completed = plan.goals.filter((g) => g.status === 'complete');
  const failedBlocked = plan.goals.filter((g) => ['failed', 'blocked', 'review_blocked'].includes(g.status));
  const next = plan.goals.filter((g) => ['pending', 'active', 'blocked', 'review_blocked'].includes(g.status));
  let lines = [];
  if (fs.existsSync(LEDGER_JSONL)) {
    lines = fs.readFileSync(LEDGER_JSONL, 'utf8').split('\n').filter((l) => l.trim());
  }
  const recent = lines.slice(-10).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

  const md = renderRecap({ plan, counts, completed, failedBlocked, next, recent });
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.writeFileSync(RECAP_PATH, md, 'utf8');
  process.stdout.write(`recap: wrote ${rel(RECAP_PATH)} (${plan.goals.length} goals, ${recent.length} recent events)\n`);
  process.exit(EXIT_OK);
}

// User-facing recap is a result-*.md artifact => Korean body (see i18n-guide).
// status keywords and field names stay English for parse compatibility.
function renderRecap({ plan, counts, completed, failedBlocked, next, recent }) {
  const out = [];
  out.push('# 목표 장부 리캡 (oma-goal recap)');
  out.push('');
  out.push(`- 생성 시각: ${nowIso()}`);
  out.push(`- brief: ${plan.brief || '(none)'}`);
  out.push(`- mode: ${plan.mode}`);
  out.push('');
  out.push('## 전체 요약');
  out.push('');
  out.push(`- 전체 목표 수: ${plan.goals.length}`);
  out.push('');
  out.push('| status | 개수 |');
  out.push('|--------|------|');
  for (const s of VALID_STATUS) out.push(`| ${s} | ${counts[s] || 0} |`);
  out.push('');
  out.push('## 완료된 목표');
  out.push('');
  if (completed.length === 0) out.push('- (없음)');
  else for (const g of completed) out.push(`- ${g.id} ${g.title} — evidence: ${hasEvidence(g) ? g.evidence : '(없음)'}`);
  out.push('');
  out.push('## 실패 / 차단된 목표');
  out.push('');
  if (failedBlocked.length === 0) out.push('- (없음)');
  else for (const g of failedBlocked) out.push(`- ${g.id} [${g.status}] ${g.title}`);
  out.push('');
  out.push('## 최근 ledger 이벤트');
  out.push('');
  if (recent.length === 0) out.push('- (없음)');
  else for (const e of recent) out.push(`- ${e.timestamp || ''} ${e.event || ''} ${e.goalId || ''}${e.status ? ` (${e.status})` : ''}`.trimEnd());
  out.push('');
  out.push('## 다음 액션');
  out.push('');
  if (next.length === 0) out.push('- (없음 — 모든 목표 종료)');
  else for (const g of next) out.push(`- ${g.id} [${g.status}] ${g.title}`);
  out.push('');
  return out.join('\n');
}

// -- Brief template (written by init when brief.md is absent) -------------------
const BRIEF_TEMPLATE = `# Goal Brief

Preamble text here is global context only and is NOT turned into a goal.
Use @goal: delimiters (column 0) to split the brief into goals (G001, G002, ...).
With no @goal: delimiter, the entire brief becomes a single goal G001.

@goal: Sample goal one
Describe the first objective here. One paragraph is enough.

@goal: Sample goal two
Describe the second objective here.
`;

// -- Dispatch ------------------------------------------------------------------
// Allowed flags per command; unknown flags are rejected (no silent exit 0).
const ALLOWED_FLAGS = {
  init: [], status: [], create: ['brief', 'force'],
  checkpoint: ['goal-id', 'status', 'evidence', 'artifact'], verify: [], recap: [],
};

function main() {
  const [, , cmd, ...rest] = process.argv;
  const a = parseArgs(rest);
  if (Object.prototype.hasOwnProperty.call(ALLOWED_FLAGS, cmd)) {
    const allowed = ALLOWED_FLAGS[cmd].concat(['help']);
    const bad = a._flags.filter((f) => !allowed.includes(f));
    if (bad.length) die(`unknown option(s) for ${cmd}: ${bad.map((f) => `--${f}`).join(', ')}`);
  }
  switch (cmd) {
    case 'init': return cmdInit();
    case 'status': return cmdStatus();
    case 'create': return cmdCreate(a);
    case 'checkpoint': return cmdCheckpoint(a);
    case 'verify': return cmdVerify();
    case 'recap': return cmdRecap();
    case '-h':
    case '--help':
      process.stdout.write('usage: oma-goal <init|status|create|checkpoint|verify|recap> [options]\n');
      return process.exit(EXIT_OK);
    case undefined:
      process.stderr.write('usage: oma-goal <init|status|create|checkpoint|verify|recap> [options]\n');
      return process.exit(EXIT_ERROR);
    default:
      return die(`unknown command: ${cmd}`);
  }
}

main();

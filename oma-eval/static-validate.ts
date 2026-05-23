#!/usr/bin/env bun
/**
 * static-validate.ts — Per-skill semantic validation for all 31 OMA skills.
 *
 * Complements oma-eval/promptfooconfig.yaml (which does shared schema checks
 * via promptfoo's cartesian product). This script does the per-skill keyword
 * checks that promptfoo can't express cleanly when prompts × tests are
 * cross-multiplied.
 *
 * Cost: $0 (file-based; no LLM calls).
 * Pass threshold: score ≥ 0.85 (global rules §10-2).
 *
 * Usage:
 *   bun run oma-eval/static-validate.ts
 *   bun run oma-eval/static-validate.ts --json   # machine-readable output
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SKILLS_DIR = "C:/Users/user/AI_Orchestra_Lab/projects/.agents/skills";

type SkillCheck = {
  id: string;
  pass: boolean;
  score: number;
  checks: Array<{ name: string; pass: boolean; note?: string }>;
};

// Per-skill semantic keyword expectations. Skills not listed get only the
// shared schema checks (the most permissive validation).
const SEMANTIC_KEYWORDS: Record<string, string[]> = {
  "oma-architecture":  ["architecture", "design", "ADR", "tradeoff"],
  "oma-backend":       ["API", "Repository", "Service", "Router", "backend"],
  "oma-qa":            ["quality", "test", "security", "QA"],
  "oma-orchestrator":  ["orchestrate", "Antigravity", "spawn", "MCP"],
  "oma-search":        ["search", "router", "transport"],
  "oma-frontend":      ["React", "Next", "frontend", "component"],
  "oma-mobile":        ["Flutter", "mobile", "React Native"],
  "oma-db":            ["database", "schema", "SQL"],
  "oma-debug":         ["debug", "root cause", "regression"],
  "oma-pm":            ["requirement", "task", "decomposition", "priority"],
  "oma-docs":          ["docs", "drift", "verify"],
  "oma-deepsec":       ["security", "scan", "vulnerability", "deepsec"],
  "oma-scm":           ["git", "SCM", "commit", "branch"],
  "oma-tf-infra":      ["Terraform", "infrastructure", "cloud"],
  "oma-image":         ["image", "generation", "Antigravity", "Codex"],
  "oma-hwp":           ["HWP", "Markdown", "kordoc"],
  "oma-pdf":           ["PDF", "Markdown", "opendataloader"],
  "oma-recap":         ["recap", "conversation", "summary"],
  "oma-scholar":       ["scholar", "paper", "research"],
  "oma-translator":    ["translate", "translation", "voice"],
  "oma-academic-writer":["academic", "writing", "essay"],
  "oma-design":        ["design", "DESIGN.md", "WCAG"],
  "oma-brainstorm":    ["brainstorm", "ideation"],
  "oma-coordination":  ["coordination", "agent"],
  "oma-dev-workflow":  ["mise", "workflow", "CI/CD"],
  "oma-observability": ["observability", "tracing", "metrics"],
  "oma-skill-creator": ["skill", "SSL-lite", "frontmatter"],
  "oma-voice":         ["TTS", "STT", "voice", "Voicebox"],
  "oma-market":        ["market", "trend", "pain"],
};

function runChecks(skillId: string, body: string): SkillCheck {
  const checks: SkillCheck["checks"] = [];

  // 1. Frontmatter opening
  checks.push({
    name: "frontmatter-open",
    pass: body.startsWith("---"),
  });

  // 2. name: field present and matches dir
  const nameMatch = body.match(/(?:^|\n)name:\s+(\S+)/);
  checks.push({
    name: "frontmatter-name-matches-dir",
    pass: nameMatch !== null && nameMatch[1] === skillId,
    note: nameMatch ? `found "${nameMatch[1]}"` : "name: field missing",
  });

  // 3. description: present
  const descMatch = body.match(/(?:^|\n)description:\s+(.+)/);
  checks.push({
    name: "frontmatter-description-present",
    pass: descMatch !== null && descMatch[1].length >= 20,
    note: descMatch ? `${descMatch[1].length} chars` : "missing",
  });

  // 4. Minimum body length
  checks.push({
    name: "body-length-min-500",
    pass: body.length >= 500,
    note: `${body.length} bytes`,
  });

  // 5. Gemini residue safety — if "Gemini" mentioned, must also mention
  //    "Antigravity" or "deprecated" (acknowledges 2026-05 migration)
  const hasGemini = body.includes("Gemini");
  const hasAntigravityOrDeprecated =
    body.includes("Antigravity") || body.includes("deprecated");
  checks.push({
    name: "gemini-residue-paired-with-antigravity-or-deprecated",
    pass: !hasGemini || hasAntigravityOrDeprecated,
    note: hasGemini
      ? hasAntigravityOrDeprecated
        ? "Gemini + (Antigravity|deprecated) — OK"
        : "Gemini ONLY — outdated"
      : "no Gemini mentioned — OK",
  });

  // 6. Per-skill semantic keyword check (if defined)
  const keywords = SEMANTIC_KEYWORDS[skillId];
  if (keywords) {
    const matched = keywords.filter((k) => body.includes(k));
    checks.push({
      name: `semantic-keywords (≥1 of ${keywords.length})`,
      pass: matched.length >= 1,
      note: `matched [${matched.join(", ")}] of [${keywords.join(", ")}]`,
    });
  }

  // 7. Frontmatter closing ---
  const frontmatterClose = body.indexOf("---", 3);
  checks.push({
    name: "frontmatter-close",
    pass: frontmatterClose !== -1 && frontmatterClose < 2000,
    note:
      frontmatterClose === -1
        ? "no closing ---"
        : `at byte ${frontmatterClose}`,
  });

  const passed = checks.filter((c) => c.pass).length;
  const score = passed / checks.length;

  return {
    id: skillId,
    pass: score >= 0.85,
    score,
    checks,
  };
}

function main() {
  const jsonMode = process.argv.includes("--json");
  const entries = readdirSync(SKILLS_DIR).filter((e) => {
    if (e.startsWith("_")) return false;
    const p = join(SKILLS_DIR, e);
    if (!statSync(p).isDirectory()) return false;
    try {
      readFileSync(join(p, "SKILL.md"), "utf-8");
      return true;
    } catch {
      return false;
    }
  });

  const results: SkillCheck[] = entries.map((skillId) => {
    const body = readFileSync(join(SKILLS_DIR, skillId, "SKILL.md"), "utf-8");
    return runChecks(skillId, body);
  });

  const totalPass = results.filter((r) => r.pass).length;
  const overallScore = results.reduce((s, r) => s + r.score, 0) / results.length;
  const overallPass = overallScore >= 0.85;

  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          skills_evaluated: results.length,
          skills_passed: totalPass,
          skills_failed: results.length - totalPass,
          overall_score: Number(overallScore.toFixed(4)),
          overall_pass: overallPass,
          threshold: 0.85,
          per_skill: results,
        },
        null,
        2,
      ),
    );
    process.exit(overallPass ? 0 : 1);
  }

  // Human-readable
  console.log(`OMA Static Validation — ${results.length} skills evaluated`);
  console.log("=".repeat(70));
  for (const r of results) {
    const icon = r.pass ? "✓" : "✗";
    const pct = (r.score * 100).toFixed(0);
    console.log(`${icon} ${r.id.padEnd(28)}  ${pct}%  (${r.checks.filter((c) => c.pass).length}/${r.checks.length})`);
    if (!r.pass) {
      for (const c of r.checks.filter((c) => !c.pass)) {
        console.log(`    ✗ ${c.name}: ${c.note ?? ""}`);
      }
    }
  }
  console.log("=".repeat(70));
  console.log(
    `Overall: ${overallPass ? "PASS" : "FAIL"} — ${totalPass}/${results.length} skills, score ${(overallScore * 100).toFixed(2)}% (threshold 85%)`,
  );
  process.exit(overallPass ? 0 : 1);
}

main();

/**
 * Measures question-shape defects before and after the production policy.
 *
 * The input may contain raw Mode A reads (`.md`/`.txt`) or harness JSON files.
 * Directories are walked recursively. No model call is made.
 *
 *   npx tsx scripts/question-shape.ts <saved-read-dir> [more paths...]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { applyQuestionPolicy } from "../src/lib/ai/questionPolicy";
import {
  cleanQuestionWording,
  questionShapeIssues,
} from "../src/lib/ai/questionShape";
import type { EditorialRepair } from "../src/lib/types";

const inputs = process.argv.slice(2);
if (inputs.length === 0) {
  console.error("usage: question-shape.ts <saved-read-dir-or-file> [more paths...]");
  process.exit(1);
}

interface Question {
  file: string;
  pattern: string;
  repair: EditorialRepair | null;
  raw: string;
  policy: string;
}

interface StoredSpot {
  pattern_name?: unknown;
  repair?: unknown;
  question?: unknown;
}

const questions: Question[] = [];

function asRepair(value: unknown): EditorialRepair | null {
  return [
    "cut",
    "select_existing",
    "clarify_existing",
    "connect_existing",
    "ask_missing",
  ].includes(String(value))
    ? (value as EditorialRepair)
    : null;
}

function addQuestion(
  file: string,
  pattern: string,
  raw: string,
  repair: EditorialRepair | null = null,
) {
  const cleaned = cleanQuestionWording(raw);
  // Prompt snapshots contain the output contract itself. It looks like a card
  // to a line parser but is not a model response.
  if (cleaned.length < 10 || cleaned.startsWith("<") || pattern.startsWith("<")) {
    return;
  }
  questions.push({
    file,
    pattern: pattern.trim() || "(missing pattern)",
    repair,
    raw: raw.trim(),
    policy: applyQuestionPolicy(pattern, raw, repair),
  });
}

function readRaw(file: string, raw: string) {
  let pattern = "";
  let repair: EditorialRepair | null = null;
  let insideCard = false;

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "<<<CARD>>>") {
      insideCard = true;
      pattern = "";
      repair = null;
      continue;
    }
    if (trimmed === "<<<ENDCARD>>>") {
      insideCard = false;
      pattern = "";
      repair = null;
      continue;
    }
    if (!insideCard) continue;

    const patternMatch = /^pattern:\s*(.+)$/i.exec(trimmed);
    if (patternMatch) {
      pattern = patternMatch[1];
      continue;
    }

    const repairMatch = /^repair:\s*(.+)$/i.exec(trimmed);
    if (repairMatch) {
      repair = asRepair(repairMatch[1]);
      continue;
    }

    const questionMatch = /^question:\s*(.+)$/i.exec(trimmed);
    if (questionMatch) addQuestion(file, pattern, questionMatch[1], repair);
  }
}

function readJson(file: string, source: string): boolean {
  try {
    const parsed = JSON.parse(source) as {
      raw?: unknown;
      report?: { spots?: unknown };
    };
    const spots = parsed.report?.spots;
    if (Array.isArray(spots)) {
      for (const value of spots as StoredSpot[]) {
        if (
          typeof value.pattern_name === "string" &&
          typeof value.question === "string"
        ) {
          addQuestion(
            file,
            value.pattern_name,
            value.question,
            asRepair(value.repair),
          );
        }
      }
      return true;
    }
    if (typeof parsed.raw === "string") {
      readRaw(file, parsed.raw);
      return true;
    }
  } catch {
    // Some harness outputs use a .json suffix while a run is incomplete.
  }
  return false;
}

function readFile(path: string) {
  const extension = extname(path).toLowerCase();
  if (![".json", ".md", ".txt"].includes(extension)) return;
  const source = readFileSync(path, "utf8");
  if (extension === ".json" && readJson(path, source)) return;
  readRaw(path, source);
}

function walk(path: string) {
  const stat = statSync(path);
  if (stat.isFile()) {
    readFile(path);
    return;
  }
  for (const name of readdirSync(path)) walk(join(path, name));
}

for (const input of inputs) walk(input);

if (questions.length === 0) {
  console.error("no Mode A card questions found");
  process.exit(1);
}

const HEDGE = /\b(specific|concrete)\b/i;
const rate = (n: number) =>
  `${n}/${questions.length} (${Math.round((n / questions.length) * 100)}%)`;

function summary(label: string, select: (question: Question) => string) {
  const issueCount = new Map<string, number>();
  const lengths: number[] = [];
  let hedges = 0;
  let clean = 0;

  for (const question of questions) {
    const value = select(question);
    lengths.push(value.split(/\s+/).length);
    if (HEDGE.test(value)) hedges += 1;
    const issues = questionShapeIssues(value);
    if (issues.length === 0 && !HEDGE.test(value)) clean += 1;
    for (const issue of issues) {
      issueCount.set(issue, (issueCount.get(issue) ?? 0) + 1);
    }
  }

  lengths.sort((a, b) => a - b);
  console.log(`\n${label}`);
  console.log(
    `words: median ${lengths[Math.floor(lengths.length / 2)]}, range ${lengths[0]}-${lengths[lengths.length - 1]}`,
  );
  console.log(`clean shape:          ${rate(clean)}`);
  console.log(`menu of options:      ${rate(issueCount.get("menu") ?? 0)}`);
  console.log(`two prompts in one:   ${rate(issueCount.get("compound") ?? 0)}`);
  console.log(`presupposes the link: ${rate(issueCount.get("presupposedLink") ?? 0)}`);
  console.log(`supplies the answer:  ${rate(issueCount.get("suppliedAnswer") ?? 0)}`);
  console.log(`multiple questions:   ${rate(issueCount.get("multipleQuestions") ?? 0)}`);
  console.log(`specific/concrete:    ${rate(hedges)}`);
}

console.log(`questions: ${questions.length}`);
summary("raw model output", (question) => question.raw);
summary("after production policy", (question) => question.policy);

const changed = questions.filter((question) => question.raw !== question.policy);
console.log(`\nchanged by policy: ${rate(changed.length)}`);
for (const question of changed.slice(0, 12)) {
  console.log(`\n[${question.pattern}] ${question.file}`);
  console.log(`- ${question.raw}`);
  console.log(`+ ${question.policy}`);
}

const unresolved = questions.filter(
  (question) =>
    questionShapeIssues(question.policy).length > 0 || HEDGE.test(question.policy),
);
if (unresolved.length > 0) {
  console.log(`\nunresolved after policy: ${unresolved.length}`);
  const counts = new Map<string, number>();
  for (const question of unresolved) {
    counts.set(question.pattern, (counts.get(question.pattern) ?? 0) + 1);
  }
  for (const [pattern, count] of [...counts.entries()].sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  ${count} ${pattern}`);
  }
  for (const question of unresolved.slice(0, 12)) {
    console.log(`\n[${question.pattern}] ${question.policy}`);
  }
}

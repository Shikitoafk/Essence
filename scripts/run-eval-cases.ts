/**
 * Runs the editorial challenge cases in docs/research/essay-feedback-eval-cases.md
 * against a model and writes each read out for scoring.
 *
 * The cases were written as hypotheses for human review and, until now, had
 * never been put in front of a model — so every prompt revision since has been
 * accepted on the strength of reading it, not on what it changed. This makes
 * them executable. It does not score them: whether a read "identified that
 * activity names do not explain the intellectual attraction" is a judgement,
 * and a model from the same family grading its own output would launder that
 * judgement rather than make it.
 *
 *   npx tsx scripts/run-eval-cases.ts --model gemini-3.6-flash --out ./eval-out
 *   npx tsx scripts/run-eval-cases.ts --cases 1,2,12 --runs 2
 *
 * --system points at a frozen prompt in scripts/prompt-baselines, so an older
 * version can be run against the same cases. Pair it deliberately: the free
 * tier allows twenty requests per day PER MODEL, so a comparison stays honest
 * by running both prompts for a given case on the SAME model, while different
 * cases may sit on different models. Confounding the prompt with the model
 * would make the whole comparison worthless, and it is the easy mistake to
 * make when quota is what is scarce.
 *
 *   npx tsx scripts/run-eval-cases.ts --cases 1,2,3 --model gemini-3.7-flash  *     --system scripts/prompt-baselines/00b7d53-mode-a.txt --out ./eval-old
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GoogleGenAI } from "@google/genai";
import { MODE_A_SYSTEM } from "../src/lib/ai/systemPrompt";
import { buildModeAPrompt, type SeasonContext } from "../src/lib/ai/modeAPrompt";
import { parseModeAReport } from "../src/lib/ai/parseReport";
import type { Essay, EssayKind } from "../src/lib/types";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

interface Case {
  number: number;
  title: string;
  task: string;
  draft: string;
  expected: string;
  kind: EssayKind;
  wordLimit: number | null;
  promptText: string | null;
  complete: boolean;
}

/** The cases are prose with a regular shape; this reads it rather than duplicating it. */
function parseCases(md: string): Case[] {
  const blocks = md.split(/^## /m).slice(1);
  const cases: Case[] = [];
  let lastTask = "";
  let lastLimit: number | null = null;
  let lastPrompt: string | null = null;
  let lastKind: EssayKind = "personal_statement";

  for (const block of blocks) {
    const [heading, ...rest] = block.split(/\r?\n/);
    const headMatch = heading.match(/^(\d+)\.\s*(.+)$/);
    if (!headMatch) continue;
    const body = rest.join("\n");

    const draft = body
      .split(/\r?\n/)
      .filter((l) => l.trimStart().startsWith(">"))
      .map((l) => l.trimStart().replace(/^>\s?/, ""))
      .join("\n")
      .trim();
    if (!draft) continue;

    const task = body.split(/\r?\n/).find((l) => /^(Task:|Personal-statement|Same task|Supplement)/i.test(l.trim())) ?? "";
    const expected = (body.match(/^Expected:\s*([\s\S]*?)(?:\r?\n\r?\n|$)/m)?.[1] ?? "").replace(/\s+/g, " ").trim();

    // "Same task and limit" inherits; anything else restates it.
    if (!/^same task/i.test(task.trim()) && task) {
      lastTask = task;
      const limit = task.match(/(\d+)-word limit/);
      lastLimit = limit ? Number(limit[1]) : null;
      const why = task.match(/Task:\s*([^.]+?)\??\s+\d+-word limit/i);
      lastPrompt = why ? `${why[1].trim()}?` : null;
      lastKind = lastPrompt ? "supplemental" : "personal_statement";
    }

    cases.push({
      number: Number(headMatch[1]),
      title: headMatch[2].trim(),
      task: lastTask,
      draft,
      expected,
      kind: lastKind,
      wordLimit: lastLimit,
      promptText: lastPrompt,
      complete: /complete response/i.test(task),
    });
  }
  return cases;
}

const CONTEXT: SeasonContext = {
  facts: [],
  otherEssays: [],
  previouslyResolved: [],
  setAside: [],
  round: 1,
  previousReadiness: null,
  draftUnchanged: false,
  previousSpotKeys: [],
};

async function main() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("GEMINI_API_KEY is not set (load it from .env.local first)");
    process.exit(1);
  }

  const model = arg("model", "gemini-3.6-flash");
  const runs = Number(arg("runs", "1"));
  const outDir = arg("out", "eval-out");
  const only = arg("cases", "");
  const wanted = only ? new Set(only.split(",").map((n) => Number(n.trim()))) : null;

  const systemPath = arg("system", "");
  const system = systemPath
    ? readFileSync(systemPath, "utf8")
    : MODE_A_SYSTEM;
  if (systemPath) {
    console.log(`system prompt: ${systemPath} (${system.length} chars)`);
  } else {
    console.log(`system prompt: working tree (${system.length} chars)`);
  }

  const md = readFileSync("docs/research/essay-feedback-eval-cases.md", "utf8");
  const cases = parseCases(md).filter((c) => !wanted || wanted.has(c.number));
  mkdirSync(outDir, { recursive: true });

  console.log(`${cases.length} case(s), model ${model}, ${runs} run(s) each\n`);
  const ai = new GoogleGenAI({ apiKey: key });

  for (const c of cases) {
    for (let run = 1; run <= runs; run++) {
      const essay: Essay = {
        id: `case-${c.number}`,
        user_id: "eval",
        title: c.title,
        prompt_text: c.promptText,
        word_limit: c.wordLimit,
        current_draft: c.draft,
        essay_kind: c.kind,
        school: null,
        last_feedback_at: null,
        revision_count: 0,
        archived_at: null,
        archived_reason: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // The cases file is explicit that a passage may be an excerpt, and that a
      // missing opening or ending must not be counted against it.
      const note = c.complete
        ? "This is the student's COMPLETE response to the task above."
        : "This is an EXCERPT from a longer draft. Do not treat an unseen opening or ending as missing, and do not fault the passage for material that would sit outside it.";

      let raw = "";
      let error = "";
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: `${buildModeAPrompt(essay, c.draft, CONTEXT)}\n\n${note}`,
            config: { systemInstruction: system, temperature: 0.6 },
          });
          raw = response.text ?? "";
          error = "";
          break;
        } catch (e) {
          error = (e as Error).message.slice(0, 160);
          await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
        }
      }

      if (error) {
        console.log(`case ${c.number} "${c.title}" run ${run}: FAILED — ${error}`);
        continue;
      }

      const report = parseModeAReport(raw);
      const file = join(outDir, `case-${String(c.number).padStart(2, "0")}-run${run}.md`);
      writeFileSync(
        file,
        [
          `# Case ${c.number}. ${c.title}`,
          `Model: ${model} · run ${run} · ${c.kind}${c.wordLimit ? ` · ${c.wordLimit} words` : ""}`,
          `Prompt: ${systemPath || "working tree"}`,
          ``,
          `## Draft`,
          c.draft,
          ``,
          `## Expected (from the cases file)`,
          c.expected,
          ``,
          `## Raw read`,
          raw,
        ].join("\n"),
        "utf8",
      );

      console.log(
        `case ${String(c.number).padStart(2)} "${c.title}" run ${run}: scan ${report.scan.candidates.length}/-${report.scan.dropped.length}, ${report.spots.length} card(s)`,
      );
      for (const s of report.spots) {
        console.log(`      [${s.impact}] ${s.pattern_name} — "${s.quoted_text.slice(0, 55)}"`);
        console.log(`      Q: ${s.question.slice(0, 100)}`);
      }
    }
  }

  console.log(`\nFull reads written to ${outDir}/ for scoring.`);
}

main();

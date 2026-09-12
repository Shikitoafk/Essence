/**
 * Runs the Mode A diagnostic against a draft, straight at the model.
 *
 * The product's most expensive call was only reachable through a signed-in
 * request, so every attempt to answer "why does this read find three things"
 * cost a login, a new essay row and a wait. This runs the same system prompt
 * and the same user prompt the route builds, and reports what came back:
 * how many candidates the scan saw, how many it dropped by hand, how many
 * cards were emitted, and how many of those anchor to real lines of the draft.
 *
 *   npx tsx scripts/bench-diagnostic.ts --essay path/to/draft.txt \
 *     --models gemini-3.6-flash,gemini-3.1-pro-preview --runs 2
 *
 * Keep the draft outside the repository: it is someone's personal essay.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { GoogleGenAI } from "@google/genai";
import { MODE_A_SYSTEM } from "../src/lib/ai/systemPrompt";
import {
  buildModeAPrompt,
  buildRecoveryPrompt,
  type SeasonContext,
} from "../src/lib/ai/modeAPrompt";
import {
  locateQuote,
  parseModeAReport,
  parseSpotCards,
} from "../src/lib/ai/parseReport";
import { findUncardedCandidates } from "../src/lib/ai/coverageGaps";
import { countWords, type Essay } from "../src/lib/types";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const essayPath = arg("essay", "");
if (!essayPath) {
  console.error("--essay <path> is required");
  process.exit(1);
}

const draft = readFileSync(essayPath, "utf8").trim();
const models = arg("models", "gemini-3.6-flash").split(",").map((m) => m.trim());
const runs = Number(arg("runs", "1"));

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("GEMINI_API_KEY is not set (load it from .env.local first)");
  process.exit(1);
}

/** A first read: no season memory, no prior rounds, nothing suppressed. */
const essay: Essay = {
  id: "bench",
  user_id: "bench",
  title: "Bench draft",
  // A supplemental read as a 650-word personal statement is judged against a
  // question nobody asked and a budget it does not have, and task fit is the
  // finding that outranks every other one on a supplemental. Both were
  // hardcoded here, so every supplemental measured so far was measured wrong.
  prompt_text: arg("prompt", "") || null,
  word_limit: Number(arg("limit", "650")),
  current_draft: draft,
  essay_kind: arg("prompt", "") ? "supplemental" : "personal_statement",
  school: null,
  last_feedback_at: null,
  revision_count: 0,
  archived_at: null,
  archived_reason: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const context: SeasonContext = {
  facts: [],
  otherEssays: [],
  previouslyResolved: [],
  round: 1,
  previousReadiness: null,
  draftUnchanged: false,
  setAside: [],
  previousSpotKeys: [],
};

const ai = new GoogleGenAI({ apiKey: key });

/**
 * A frozen prompt from scripts/prompt-baselines, so both sides of a change can
 * be run against the same draft on the same model in one sitting. The eval
 * cases are short excerpts and do not reproduce everything a full draft does:
 * the strengths section fell into three age-based headings on real essays and
 * never once on the cases, so a change aimed at that cannot be measured there.
 */
const systemPath = arg("system", "");
const system = systemPath ? readFileSync(systemPath, "utf8") : MODE_A_SYSTEM;

console.log(`draft: ${countWords(draft)} words`);
/*
 * Two agents edit this repository, and both of them edit the prompt. A
 * comparison whose two sides ran against different text is worse than no
 * comparison, because it still looks like a result. The digest makes that
 * detectable afterwards: if the side that was meant to be held fixed does not
 * print the same one twice, the numbers go in the bin.
 */
const systemDigest = createHash("sha256").update(system).digest("hex").slice(0, 8);
console.log(
  `system prompt: ${system.length} chars, sha ${systemDigest}${systemPath ? ` (${systemPath})` : ""}\n`,
);

/**
 * Counting cards says whether the engine is stable, never whether it is right,
 * and the card body is where "right" lives: the question the student is asked
 * and the words the finding is put in. A whole day of runs went past with only
 * names and quotes on screen, so every judgement about wording needed a fresh
 * call. `--dump <dir>` keeps the raw reads instead.
 */
const dumpDir = arg("dump", "");
if (dumpDir) mkdirSync(dumpDir, { recursive: true });

async function main() {
  for (const model of models) {
    for (let run = 1; run <= runs; run++) {
      const started = Date.now();
      let raw: string;
      try {
        const response = await ai.models.generateContent({
          model,
          contents: buildModeAPrompt(essay, draft, context),
          config: { systemInstruction: system, temperature: 0.6 },
        });
        raw = response.text ?? "";
      } catch (error) {
        console.log(`${model} run ${run}: FAILED — ${(error as Error).message.slice(0, 200)}\n`);
        continue;
      }

      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      const report = parseModeAReport(raw);

      if (dumpDir) {
        const stem = basename(essayPath).replace(/\.[^.]+$/, "");
        writeFileSync(
          `${dumpDir}/${stem}-${model}-run${run}.md`,
          `<!-- system sha ${systemDigest}, ${system.length} chars -->\n${raw}`,
          "utf8",
        );
      }
      const anchored = report.spots.filter((s) => locateQuote(draft, s.quoted_text));
      const truncated = !raw.includes("<<<END>>>");

      console.log(
        `${model} run ${run} — ${seconds}s, ${raw.length} chars${truncated ? " [TRUNCATED]" : ""}`,
      );
      console.log(
        `  scan: ${report.scan.candidates.length} candidate(s), ${report.scan.dropped.length} dropped by hand`,
      );
      console.log(
        `  cards: ${report.spots.length} emitted, ${anchored.length} anchor to the draft`,
      );
      for (const c of report.scan.candidates) console.log(`    + ${c.slice(0, 110)}`);
      for (const d of report.scan.dropped) console.log(`    - DROPPED ${d.slice(0, 110)}`);
      for (const s of report.spots) {
        console.log(`    [card] ${s.pattern_name} (${s.impact}/${s.confidence}) "${s.quoted_text.slice(0, 60)}"`);
        // The question is the part of a card a student actually acts on, and
        // its defects — a menu of options, two questions joined by "and" —
        // are invisible in a pattern name.
        console.log(`      Q(${s.question.split(/\s+/).length}w): ${s.question}`);
      }

      // The same check the read runs on itself: candidates scanned, never
      // dropped by hand and never carded are findings lost on the way out.
      const uncarded = findUncardedCandidates(
        draft,
        report.scan.candidates,
        report.scan.dropped,
        report.spots.map((s) => s.quoted_text),
      );
      if (uncarded.length > 0) {
        try {
          console.log(`  LOST: ${uncarded.length} candidate(s) neither carded nor dropped`);
          for (const u of uncarded) console.log(`    ? ${u.line.slice(0, 100)}`);
          const rec = await ai.models.generateContent({
            model,
            contents: buildRecoveryPrompt(draft, uncarded),
            config: { systemInstruction: system, temperature: 0.4 },
          });
          const recovered = parseSpotCards(rec.text ?? "").filter((s) =>
            locateQuote(draft, s.quoted_text),
          );
          console.log(`  RECOVERED: ${recovered.length} of ${uncarded.length}`);
          for (const s of recovered) {
            console.log(`    [card] ${s.pattern_name} (${s.impact}) "${s.quoted_text.slice(0, 60)}"`);
          }
        } catch (e) {
          // The route swallows a failed recovery and still shows the read.
          // The harness was not doing the same, so a 503 from Google took
          // the whole measurement run down with it — including the runs
          // that had already succeeded.
          console.log(`  RECOVERY FAILED: ${(e as Error).message.slice(0, 100)}`);
        }
      }
      console.log();
    }
  }
}

main();

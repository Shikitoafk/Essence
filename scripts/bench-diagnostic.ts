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
import { readFileSync } from "node:fs";
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
  prompt_text: null,
  word_limit: 650,
  current_draft: draft,
  essay_kind: "personal_statement",
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

console.log(`draft: ${countWords(draft)} words`);
console.log(`system prompt: ${MODE_A_SYSTEM.length} chars\n`);

async function main() {
  for (const model of models) {
    for (let run = 1; run <= runs; run++) {
      const started = Date.now();
      let raw: string;
      try {
        const response = await ai.models.generateContent({
          model,
          contents: buildModeAPrompt(essay, draft, context),
          config: { systemInstruction: MODE_A_SYSTEM, temperature: 0.6 },
        });
        raw = response.text ?? "";
      } catch (error) {
        console.log(`${model} run ${run}: FAILED — ${(error as Error).message.slice(0, 200)}\n`);
        continue;
      }

      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      const report = parseModeAReport(raw);
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
      }

      // The same check the read runs on itself: candidates scanned, never
      // dropped by hand and never carded are findings lost on the way out.
      const uncarded = findUncardedCandidates(
        draft,
        report.scan.candidates,
        report.spots.map((s) => s.quoted_text),
      );
      if (uncarded.length > 0) {
        console.log(`  LOST: ${uncarded.length} candidate(s) neither carded nor dropped`);
        for (const u of uncarded) console.log(`    ? ${u.line.slice(0, 100)}`);
        const rec = await ai.models.generateContent({
          model,
          contents: buildRecoveryPrompt(draft, uncarded),
          config: { systemInstruction: MODE_A_SYSTEM, temperature: 0.4 },
        });
        const recovered = parseSpotCards(rec.text ?? "").filter((s) =>
          locateQuote(draft, s.quoted_text),
        );
        console.log(`  RECOVERED: ${recovered.length} of ${uncarded.length}`);
        for (const s of recovered) {
          console.log(`    [card] ${s.pattern_name} (${s.impact}) "${s.quoted_text.slice(0, 60)}"`);
        }
      }
      console.log();
    }
  }
}

main();

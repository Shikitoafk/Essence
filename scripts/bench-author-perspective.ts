/** Paired editorial smoke check. No outcomes or expectations enter model input.
 * --freeze saves the exact current prompt, with no model call.
 * --before PATH --out DIR compares that snapshot with the working prompt.
 * --attachment PATH optionally evaluates the user-supplied published essay,
 * stripping committee comments and attribution to avoid outcome anchoring.
 * Raw runs stay in ignored eval-out; no published essay is embedded in code.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GoogleGenAI } from "@google/genai";
import { MODE_A_SYSTEM } from "../src/lib/ai/systemPrompt";
import { buildModeAPrompt, type SeasonContext } from "../src/lib/ai/modeAPrompt";
import { parseModeAReport } from "../src/lib/ai/parseReport";
import type { Essay } from "../src/lib/types";

const arg = (name: string, fallback = "") => {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? fallback : process.argv[index + 1] ?? fallback;
};
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const context: SeasonContext = {
  facts: [], otherEssays: [], previouslyResolved: [], setAside: [], round: 1,
  previousReadiness: null, draftUnchanged: false, previousSpotKeys: [],
};

async function main() {
  const out = arg("out", "eval-out/author-perspective");
  mkdirSync(out, { recursive: true });
  if (process.argv.includes("--freeze")) {
    writeFileSync(join(out, "before.txt"), MODE_A_SYSTEM);
    console.log(`Frozen ${MODE_A_SYSTEM.length} characters; ${hash(MODE_A_SYSTEM)}`);
    return;
  }
  const before = arg("before");
  if (!before) throw new Error("--before must name a frozen prompt");
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  const model = arg("model", "gemini-3.6-flash");
  const fixtures = JSON.parse(readFileSync("scripts/fixtures/author-perspective.json", "utf8")) as Array<{
    id: string; draft: string; expected: string;
  }>;
  const attachment = arg("attachment");
  if (attachment) fixtures.unshift({
    id: "supplied-baking",
    draft: readFileSync(attachment, "utf8").split("Admissions Committee Comments")[0].trim(),
    expected: "Explain cumulative characterization through experimentation, accommodation and mutual exchange. Do not demand unrelated growth, a novel topic or a hidden ending. Admission status does not imply perfection.",
  });
  const systems = { before: readFileSync(before, "utf8"), after: MODE_A_SYSTEM };
  writeFileSync(join(out, "after.txt"), systems.after);
  const manifest: unknown[] = [];
  const ai = new GoogleGenAI({ apiKey: key, httpOptions: { timeout: 90000 } });
  for (const [index, fixture] of fixtures.entries()) {
    const order: Array<keyof typeof systems> = index % 2 ? ["after", "before"] : ["before", "after"];
    const essay: Essay = {
      id: fixture.id, user_id: "eval", title: "Untitled", prompt_text: null,
      word_limit: 650, current_draft: fixture.draft, essay_kind: "personal_statement",
      school: null, last_feedback_at: null, revision_count: 0, archived_at: null,
      archived_reason: null, created_at: "2026-09-12", updated_at: "2026-09-12",
    };
    const prompt = `${buildModeAPrompt(essay, fixture.draft, context)}\nThis is the COMPLETE personal statement. No school-specific prompt is supplied. A response need not fill its word allowance.`;
    for (const version of order) {
      const metadata = { id: fixture.id, version, model, inputHash: hash(prompt), systemHash: hash(systems[version]), order, temperature: 0.6 };
      try {
        const result = await ai.models.generateContent({
          model, contents: prompt,
          config: { systemInstruction: systems[version], temperature: 0.6 },
        });
        const raw = result.text ?? "";
        if (!raw.trim()) throw new Error("Empty response");
        const report = parseModeAReport(raw);
        writeFileSync(join(out, `${fixture.id}-${version}.json`), JSON.stringify({ ...metadata, draft: fixture.draft, expected: fixture.expected, raw, report }, null, 2));
        manifest.push({ ...metadata, status: "complete", cards: report.spots.length });
        console.log(`${fixture.id} ${version}: ${report.spots.length} cards`);
        for (const spot of report.spots) console.log(`  ${spot.impact}: ${spot.question}`);
      } catch (error) {
        // Never write provider messages which may contain request or credential data.
        const status = (error as { status?: number }).status ?? null;
        manifest.push({ ...metadata, status: "failed", httpStatus: status });
        console.log(`${fixture.id} ${version}: failed (status ${status ?? "unavailable"}); stopped without fallback or retry`);
        writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
        process.exitCode = 1;
        return;
      }
      writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
    }
  }
}
main().catch(() => { console.error("Evaluation setup failed; check arguments and local configuration."); process.exitCode = 1; });

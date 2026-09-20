/** Synthetic only. Paired Mode B smoke test; saved replies require editorial review.
 * node --env-file=.env.local --import tsx scripts/bench-question-relevance.ts --before <frozen.ts>
 * No fallback: changing models would confound the pair. Stop on the first failure.
 */
import { GoogleGenAI } from "@google/genai";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { MODE_B_SYSTEM } from "../src/lib/ai/systemPrompt";

function arg(name: string, fallback = "") {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? fallback : process.argv[i + 1] ?? fallback;
}
const cases = [
  {
    id: "cut-unsupported-claim",
    prompt: `You asked about the unsupported sentence "Now I always speak up when something is unfair."
The student replies: "I don't actually always speak up. I added that sentence because I thought I needed a growth ending. I want to delete it and end at the scene that is already there."
Respond in Mode B. You have no other essay context.`,
    expected: "Resolve the decision to cut; no demand for another incident or replacement moral.",
  },
  {
    id: "present-interpretation",
    prompt: `You asked what the student means by wanting both solitude and company in a rehearsal essay.
The student replies: "When I'm alone I don't worry about wasting someone's time while I experiment. With the group I like hearing choices I would never have tried. I understand that now looking back; I didn't think about it that way then. That's what I meant, not that I overcame being shy."
Respond in Mode B. You have no other essay context.`,
    expected: "Accept the distinction as usable reflection; no new scene required, no past transformation invented.",
  },
];
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

async function main() {
  const beforePath = arg("before");
  if (!beforePath) throw new Error("Supply --before with a frozen prompt module.");
  const before = (await import(pathToFileURL(resolve(beforePath)).href)).MODE_B_SYSTEM;
  if (typeof before !== "string") throw new Error("Frozen module has no MODE_B_SYSTEM.");
  const model = arg("model", "gemini-3.5-flash-lite");
  const out = resolve(arg("out", `eval-out/question-relevance/${Date.now()}`));
  await mkdir(out, { recursive: true });
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  let completed = 0;
  for (const [index, fixture] of cases.entries()) {
    const versions = index % 2 ? ["after", "before"] : ["before", "after"];
    for (const version of versions) {
      const system = version === "before" ? before : MODE_B_SYSTEM;
      try {
        const response = await ai.models.generateContent({
          model, contents: fixture.prompt,
          config: { systemInstruction: system, temperature: 0.3, responseMimeType: "application/json", httpOptions: { timeout: 45000 } },
        });
        const result = { case: fixture.id, version, requestedModel: model, servedModel: response.modelVersion,
          systemSha: hash(system), promptSha: hash(fixture.prompt), expected: fixture.expected,
          raw: response.text, timestamp: new Date().toISOString() };
        await writeFile(resolve(out, `${fixture.id}-${version}.json`), JSON.stringify(result, null, 2));
        completed++;
        console.log(`${fixture.id} ${version}: saved (${completed}/4).`);
      } catch (error) {
        // Provider errors can echo request details; retain only the numeric status.
        const status = error && typeof error === "object" && "status" in error ? error.status : "unknown";
        await writeFile(resolve(out, "incomplete.json"), JSON.stringify({ completed, total: 4, failedCase: fixture.id, version, status }));
        console.error(`Incomplete measurement: ${completed}/4; provider status ${status}. No quality conclusion.`);
        process.exitCode = 1;
        return;
      }
    }
  }
  console.log("Four responses saved. This smoke test is not a repeated quality measurement.");
}
main().catch(() => { console.error("Could not initialize measurement."); process.exitCode = 1; });

/**
 * Runs the follow-up conversation against case 11 of the challenge cases.
 *
 * The four answers there are the whole point: a thin one, a full one, a "you
 * misread my draft" one, and a refusal. Each has a different correct response,
 * and three of the four are ways the conversation can do real harm — pressing
 * a student who said no, congratulating a fragment, or defending a diagnosis
 * that was wrong. None of it had ever been run.
 *
 *   npx tsx scripts/bench-conversation.ts --model gemini-3.5-flash-lite --runs 2
 */
import { GoogleGenAI } from "@google/genai";
import { MODE_B_SYSTEM } from "../src/lib/ai/systemPrompt";
import { buildModeBPrompt } from "../src/lib/ai/modeBPrompt";
import type { FlaggedSpot } from "../src/lib/types";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const SPOT: FlaggedSpot = {
  id: "case-11",
  essay_id: "case-11",
  version_id: null,
  pattern_name: "Underdeveloped change",
  confidence: "high",
  impact: "substantive",
  quoted_text: "I handle failure differently now.",
  what_is_clear: "The writer says their response to failure changed.",
  what_is_unexplored: "No instance of the changed response in action.",
  why_it_matters: "The essay's claim about growth rests on a line nothing supports.",
  question: "What did you do differently the next time something failed?",
  queue_position: 0,
  status: "open",
  new_material: [],
  created_at: new Date().toISOString(),
} as FlaggedSpot;

const ANSWERS: { label: string; text: string; expected: string }[] = [
  {
    label: "A · thin answer",
    text: "I used a notebook.",
    expected: "one narrower question about what the notebook let them do differently; NOT resolved",
  },
  {
    label: "B · real material",
    text: "I wrote down each failed attempt before trying again. That let me notice I had changed two variables at once, so I went back and tested them separately.",
    expected: "resolved, no dangling follow-up, and no sentence written for them",
  },
  {
    label: "C · the diagnosis was wrong",
    text: "Actually, the next paragraph already describes that exact retest.",
    expected: "acknowledge the diagnosis may be mistaken; say plainly it cannot recheck the draft rather than pretending to have reread it; do not insist on a new incident",
  },
  {
    label: "D · refusal",
    text: "I don't want to share that.",
    expected: "respect the refusal; no pressure, no second attempt through another door, nothing invented",
  },
];

async function main() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("GEMINI_API_KEY is not set");
    process.exit(1);
  }
  const model = arg("model", "gemini-3.5-flash-lite");
  const runs = Number(arg("runs", "2"));
  const ai = new GoogleGenAI({ apiKey: key });

  for (const answer of ANSWERS) {
    console.log(`\n=== ${answer.label} ===`);
    console.log(`expected: ${answer.expected}`);
    for (let run = 1; run <= runs; run++) {
      const prompt = buildModeBPrompt(
        SPOT,
        [
          { role: "assistant", content: SPOT.question },
          { role: "user", content: answer.text },
        ],
        [],
        650,
        "personal_statement",
        null,
        null,
        "answer",
      );
      try {
        const r = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: MODE_B_SYSTEM,
            temperature: 0.5,
            responseMimeType: "application/json",
          },
        });
        const p = JSON.parse(r.text ?? "{}");
        console.log(`  run ${run}: verdict=${p.verdict}`);
        console.log(`    reply: ${String(p.reply ?? "").replace(/\s+/g, " ").slice(0, 220)}`);
        if (p.next_question) {
          console.log(`    next:  ${String(p.next_question).replace(/\s+/g, " ").slice(0, 160)}`);
        }
        if (Array.isArray(p.new_material) && p.new_material.length) {
          console.log(`    kept:  ${p.new_material.length} item(s)`);
        }
      } catch (e) {
        console.log(`  run ${run}: FAILED — ${(e as Error).message.slice(0, 110)}`);
      }
    }
  }
}

main();

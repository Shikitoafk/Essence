/**
 * Runs the head-to-head comparison on two drafts, in both orders.
 *
 * A user reported that the comparison keeps picking the newer essay. Three
 * things were pushing it there and all three are now fixed blind; this is what
 * checks them. Order is the point: the same pair is compared twice, once with
 * each draft presented first. A verdict that flips when the drafts swap places
 * is a verdict about position, not about writing.
 *
 *   npx tsx scripts/bench-compare.ts --a old.txt --b new.txt --runs 3
 */
import { readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";
import { COMPARE_SYSTEM, buildComparePrompt } from "../src/lib/ai/comparePrompt";
import type { Essay, FlaggedSpot } from "../src/lib/types";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function essayFrom(title: string, draft: string, read: boolean): Essay {
  return {
    id: title,
    user_id: "bench",
    title,
    prompt_text: null,
    word_limit: 650,
    current_draft: draft,
    essay_kind: "personal_statement",
    school: null,
    // The asymmetry that caused the bug: one version read, one never read.
    last_feedback_at: read ? new Date().toISOString() : null,
    revision_count: read ? 3 : 0,
    archived_at: null,
    archived_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function main() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("GEMINI_API_KEY is not set");
    process.exit(1);
  }

  const pathA = arg("a", "");
  const pathB = arg("b", "");
  if (!pathA || !pathB) {
    console.error("--a <file> --b <file> are required");
    process.exit(1);
  }

  const model = arg("model", "gemini-3.5-flash-lite");
  const runs = Number(arg("runs", "3"));
  const draftOld = readFileSync(pathA, "utf8").trim();
  const draftNew = readFileSync(pathB, "utf8").trim();

  // The older draft is the one that has been read and carries findings; the
  // newer one has none. That is the shape the bug appeared in.
  const spotsOld: FlaggedSpot[] = [];
  const ai = new GoogleGenAI({ apiKey: key });

  const tally: Record<string, number> = { OLD: 0, NEW: 0, "?": 0 };
  const bySlot: Record<string, number> = { A: 0, B: 0, "?": 0 };

  for (const [firstName, second] of [
    ["OLD", "NEW"],
    ["NEW", "OLD"],
  ] as [string, string][]) {
    const firstDraft = firstName === "OLD" ? draftOld : draftNew;
    const secondDraft = firstName === "OLD" ? draftNew : draftOld;

    for (let run = 1; run <= runs; run++) {
      const prompt = buildComparePrompt(
        essayFrom(firstName, firstDraft, firstName === "OLD"),
        firstDraft,
        spotsOld,
        essayFrom(second, secondDraft, second === "OLD"),
        secondDraft,
        spotsOld,
      );
      try {
        const r = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: COMPARE_SYSTEM,
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        });
        const parsed = JSON.parse(r.text ?? "{}");
        const side = String(parsed.winner ?? "").trim().toUpperCase();
        const won = side === "A" ? firstName : side === "B" ? second : "?";
        tally[won] = (tally[won] ?? 0) + 1;
        bySlot[side] = (bySlot[side] ?? 0) + 1;
        console.log(
          `${firstName} first, run ${run}: winner ${side} = ${won} — ${String(parsed.verdict_summary ?? "").slice(0, 90)}`,
        );
      } catch (e) {
        console.log(`${firstName} first, run ${run}: FAILED — ${(e as Error).message.slice(0, 110)}`);
      }
    }
  }

  console.log(`\nOLD won ${tally.OLD}, NEW won ${tally.NEW}, unreadable ${tally["?"]}`);
  // The draft tally is the wrong thing to read. Swapping the order and getting
  // a 50/50 split looks like fairness and is the exact signature of a verdict
  // decided by position: each draft wins whenever it sits in the winning slot.
  console.log(`slot A won ${bySlot.A}, slot B won ${bySlot.B}`);
  const decided = Math.max(bySlot.A, bySlot.B);
  const total = bySlot.A + bySlot.B;
  console.log(
    total > 0 && decided === total
      ? `Every verdict went to the same SLOT. The pick is position, not writing.`
      : `Slots split ${bySlot.A}/${bySlot.B} — position is not deciding it on its own.`,
  );
}

main();

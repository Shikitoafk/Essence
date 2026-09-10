/**
 * Counts the shape defects in the questions a read emits.
 *
 * A card's question is the only part of a read a student is asked to do
 * something with, and the defects it acquires are invisible in a card count
 * and in a pattern name. Measured over 33 saved reads: 23 of 38 questions
 * padded themselves with the word "specific", and half offered the student a
 * menu of places to look in — "from those club meetings, competitions, or the
 * online course" — which narrows the answer before the student has given one,
 * and rules out the material whenever it lived somewhere the list left out.
 *
 * None of this needs a model to judge it, so unlike card quality it can be a
 * number. What it cannot see is whether a short question is a good one: a
 * question can score clean here and still be empty. Read a sample.
 *
 *   npx tsx scripts/question-shape.ts <dir-of-saved-reads> [more dirs...]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const dirs = process.argv.slice(2);
if (dirs.length === 0) {
  console.error("usage: question-shape.ts <dir-of-saved-reads> [more dirs...]");
  process.exit(1);
}

/**
 * A menu is a comma-separated list the question offers as candidate answers.
 * Plain "do or say" is one act described two ways and is not a menu, so the
 * comma is required: "rehearsal, the competition, or home" is caught and
 * "what someone did or said" is not.
 */
const MENU = /,[^,?]*\bor\b/;
const HEDGE = /\b(specific|concrete)\b/i;
/** Two questions joined into one; the student answers whichever is easier. */
const COMPOUND = /,\s*and\s+(what|how|why|who|when)\b|\band\s+(what|how)\s+did\b/;

interface Question {
  file: string;
  text: string;
  words: number;
}

const questions: Question[] = [];

for (const dir of dirs) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (!statSync(path).isFile()) continue;

    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = /^question:\s*(.+)$/.exec(line.trim());
      if (!match) continue;
      const text = match[1].trim();
      if (text.length < 10) continue;
      questions.push({ file: name, text, words: text.split(/\s+/).length });
    }
  }
}

if (questions.length === 0) {
  console.error("no `question:` lines found — is this a directory of raw reads?");
  process.exit(1);
}

const lengths = questions.map((q) => q.words).sort((a, b) => a - b);
const median = lengths[Math.floor(lengths.length / 2)];
const rate = (n: number) => `${n}/${questions.length} (${Math.round((n / questions.length) * 100)}%)`;

const menu = questions.filter((q) => MENU.test(q.text));
const hedge = questions.filter((q) => HEDGE.test(q.text));
const compound = questions.filter((q) => COMPOUND.test(q.text));

console.log(`questions: ${questions.length}`);
console.log(`words: median ${median}, range ${lengths[0]}–${lengths[lengths.length - 1]}`);
console.log(`menu of options:  ${rate(menu.length)}`);
console.log(`"specific"/"concrete": ${rate(hedge.length)}`);
console.log(`two questions in one:  ${rate(compound.length)}`);

console.log(`\nlongest, worst first:`);
for (const q of [...questions].sort((a, b) => b.words - a.words).slice(0, 8)) {
  const flags = [
    MENU.test(q.text) ? "menu" : "",
    HEDGE.test(q.text) ? "hedge" : "",
    COMPOUND.test(q.text) ? "compound" : "",
  ].filter(Boolean).join(",");
  console.log(`  ${q.words}w ${flags ? `[${flags}] ` : ""}${q.text}`);
}

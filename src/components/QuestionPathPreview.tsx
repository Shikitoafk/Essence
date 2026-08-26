import { LogoMark } from "@/components/Logo";

/**
 * A product preview that shows the one thing Essence sells: the move from a
 * declared insight to material the writer can actually use. It deliberately
 * is not a marked-up paper or a consultant's report — those visuals imply a
 * finished judgement, while Essence is a live investigation.
 */
export default function QuestionPathPreview() {
  return (
    <div className="question-path overflow-hidden rounded-[2rem] border border-white/10 bg-ink p-4 text-paper shadow-[0_24px_80px_-36px_rgba(20,22,17,0.72)] sm:p-6">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <LogoMark className="h-8 w-8" />
          <div>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-white/50">
              A live Essence session
            </p>
            <p className="mt-0.5 text-sm text-white/80">Personal statement · Draft 01</p>
          </div>
        </div>
        <span className="rounded-full border border-white/15 px-3 py-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-white/55">
          01 / 03
        </span>
      </div>

      <div className="grid gap-3 py-5 lg:grid-cols-[1fr_1.06fr_0.95fr]">
        <section className="question-node question-node-draft rounded-2xl p-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-white/45">
            The draft says
          </p>
          <p className="mt-5 font-serif text-[1.1rem] leading-relaxed text-white/86">
            “The work taught me patience, and I became someone who finishes
            what he starts.”
          </p>
          <div className="mt-6 h-px w-12 bg-white/15" />
          <p className="mt-4 text-sm leading-relaxed text-white/50">
            A real claim. But the reader cannot see it happen yet.
          </p>
        </section>

        <section className="question-node question-node-question rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-mark">
              Essence asks
            </p>
            <span className="h-2 w-2 rounded-full bg-mark shadow-[0_0_0_5px_rgba(200,228,92,0.11)]" />
          </div>
          <p className="mt-5 font-serif text-2xl leading-[1.12] text-paper sm:text-[1.72rem]">
            What was the first thing you nearly quit — and chose to finish?
          </p>
          <p className="mt-5 border-t border-white/10 pt-4 text-sm leading-relaxed text-white/55">
            One question. No replacement sentence. No performance score.
          </p>
        </section>

        <section className="question-node question-node-material rounded-2xl p-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-white/45">
            You remember
          </p>
          <p className="mt-5 font-serif text-[1.08rem] leading-relaxed text-white/86">
            The drawer that kept sticking. The labels I rewrote after everyone
            had left. My grandfather asking why I was still in the garage.
          </p>
          <p className="mt-6 text-sm leading-relaxed text-white/50">
            That&apos;s material. The next sentence stays yours.
          </p>
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-white/50">
        <span>Specificity over polish.</span>
        <span className="font-mono uppercase tracking-[0.14em] text-white/40">
          Your voice stays in control
        </span>
      </div>
    </div>
  );
}

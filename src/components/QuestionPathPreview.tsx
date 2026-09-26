import { LogoMark } from "@/components/Logo";

/** A compact product surface, not a decorative mockup. */
export default function QuestionPathPreview() {
  return (
    <div className="question-path overflow-hidden rounded-[1.25rem] border border-ink/12 text-ink shadow-[0_30px_80px_-55px_rgba(31,40,35,0.55)]">
      <header className="flex items-center justify-between gap-4 border-b border-ink/10 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <LogoMark className="h-8 w-8" />
          <div>
            <p className="text-sm font-medium text-ink">Personal statement</p>
            <p className="mt-0.5 font-mono text-[0.56rem] uppercase tracking-[0.18em] text-muted">Whole-draft read · 612 words</p>
          </div>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-ink/10 px-3 py-1.5 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Reading complete
        </span>
      </header>

      <div className="grid min-h-[32rem] lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative border-b border-ink/10 bg-[#fbfaf6] p-5 sm:p-7 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted">Draft 04</p>
            <span className="text-[0.65rem] text-muted">Page 1 of 1</span>
          </div>
          <div className="mt-8 space-y-5 font-serif text-[1.02rem] leading-[1.8] text-ink/75">
            <p>
              I kept rebuilding the schedule whenever someone arrived late. By the third week, the spreadsheet had become more complicated than the event.
            </p>
            <p>
              <span className="preview-highlight">I thought leadership meant removing every source of friction.</span>
            </p>
            <p className="text-muted">
              Then Maya stopped following the schedule entirely. She had been pairing new members with people they already knew.
            </p>
          </div>
          <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between border-t border-ink/8 pt-4 text-[0.65rem] text-muted sm:left-7 sm:right-7">
            <span>3 passages protected</span><span>1 decision remains</span>
          </div>
        </section>

        <section className="flex flex-col bg-[#f1f2ec] p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-accent">Essence · Start here</p>
            <span className="rounded-full border border-ink/10 bg-white/50 px-2.5 py-1 text-[0.62rem] font-medium text-muted">Substantive</span>
          </div>

          <div className="mt-8">
            <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted">What the draft already reveals</p>
            <p className="mt-3 text-sm leading-6 text-ink/70">You notice small inefficiencies and immediately start building a system around them.</p>
          </div>

          <div className="mt-6 border-t border-ink/10 pt-6">
            <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted">Where the person disappears</p>
            <p className="mt-3 text-sm leading-6 text-ink/70">The reflection turns the conflict into a clean leadership lesson, but Maya&apos;s choice suggests a more interesting tension about control.</p>
          </div>

          <div className="mt-6 rounded-[1rem] border border-accent/20 bg-white/70 p-5">
            <p className="font-mono text-[0.56rem] uppercase tracking-[0.17em] text-accent">One question</p>
            <p className="mt-3 font-serif text-[1.45rem] leading-[1.18] text-ink">
              What did Maya understand about the group that your schedule could not capture?
            </p>
            <button type="button" className="mt-5 inline-flex rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white">Answer in your own words</button>
          </div>

          <p className="mt-auto pt-6 text-xs leading-5 text-muted">No rewrite. No score. The next sentence stays yours.</p>
        </section>
      </div>
    </div>
  );
}

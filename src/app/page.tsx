import Link from "next/link";
import Logo, { LogoMark } from "@/components/Logo";
import QuestionPathPreview from "@/components/QuestionPathPreview";
import Reveal from "@/components/Reveal";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

const FAQ = [
  ["Will Essence write my essay?", "No. It surfaces a specific weak spot and asks a question that helps you find your own material. There are no replacement sentences or insert buttons."],
  ["What does the feedback look at?", "Clarity, concrete detail, reflection, structure, voice, and whether recurring images actually earn their return. Feedback is always tied to a line in your draft."],
  ["Can I use it for supplements too?", "Yes. Create a workspace for every personal statement or supplemental response and keep its draft, questions, and versions together."],
  ["Is my draft private?", "Your essay and session history are stored in your own account. The draft is sent to the feedback model only when you request feedback."],
];

const FEATURES = [
  { eyebrow: "01 · Find the gap", title: "Feedback attached to the exact line.", copy: "See what a reader understands, what is still only claimed, and why that moment matters — without getting a rewritten paragraph back.", tone: "feature-indigo" },
  { eyebrow: "02 · Follow one thread", title: "One precise question at a time.", copy: "Answer in your own words. If there is more to uncover, Essence narrows the question instead of dumping a checklist on you.", tone: "feature-mint" },
  { eyebrow: "03 · Keep ownership", title: "Your draft. Your language. Your decision.", copy: "Save versions, resolve what matters, skip what does not. The tool helps you discover material; it never impersonates you.", tone: "feature-slate" },
];

function Arrow() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M3 10h13M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default async function Home() {
  let signedIn = false;
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  }
  const appHref = signedIn ? "/dashboard" : "/login";

  return (
    <main className="landing-shell min-h-screen overflow-hidden">
      <header className="landing-nav mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-muted md:flex" aria-label="Main navigation">
          <a href="#method" className="transition hover:text-ink">How it works</a><a href="#faq" className="transition hover:text-ink">FAQ</a><Link href="/privacy" className="transition hover:text-ink">Privacy</Link>
        </nav>
        <Link href={appHref} className="landing-nav-cta inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-accent">{signedIn ? "Open workspace" : "Start free"}<Arrow /></Link>
      </header>

      <section className="mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20 lg:px-10 lg:pb-28">
        <div className="hero-grid items-center gap-12 lg:gap-10">
          <Reveal className="max-w-2xl">
            <div className="landing-kicker"><span className="landing-kicker-dot" /> AI feedback that leaves the writing to you</div>
            <h1 className="mt-7 max-w-xl font-display text-[3.15rem] font-medium leading-[0.97] tracking-[-0.06em] text-ink sm:text-7xl lg:text-[5.4rem]">Better essays start with <span className="text-accent">better questions.</span></h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-muted sm:text-xl">Essence finds the places where your draft says something important but has not shown it yet — then helps you uncover the real story behind it.</p>
            <div className="mt-9 flex flex-wrap items-center gap-4"><Link href={appHref} className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-[0_14px_30px_-15px_rgba(91,92,226,0.7)] transition hover:-translate-y-0.5 hover:bg-[#4849c8]">{signedIn ? "Continue writing" : "Try Essence free"}<Arrow /></Link><a href="#method" className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3.5 text-sm font-medium text-ink transition hover:border-ink/30 hover:bg-white">See how it works</a></div>
            <p className="mt-4 text-xs text-muted">No credit card. No generated sentences. Ever.</p>
          </Reveal>
          <Reveal delay={100} className="hero-preview-wrap"><QuestionPathPreview /></Reveal>
        </div>
      </section>

      <section className="border-y border-line bg-white/70"><div className="mx-auto grid max-w-7xl divide-y divide-line px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8 lg:px-10">{[["Not a ghostwriter", "No rewrites, autocomplete, or AI voice."], ["Made for applicants", "Personal statements and supplements in one place."], ["Built for revision", "Keep the history behind your stronger draft."]].map(([title, copy]) => <div key={title} className="py-7 sm:px-7 sm:first:pl-0 sm:last:pr-0"><p className="font-medium text-ink">{title}</p><p className="mt-1.5 text-sm leading-6 text-muted">{copy}</p></div>)}</div></section>

      <section id="method" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
        <Reveal><p className="section-eyebrow">The Essence method</p><div className="mt-5 flex flex-col justify-between gap-6 md:flex-row md:items-end"><h2 className="max-w-2xl font-display text-4xl font-medium leading-[1.02] tracking-[-0.05em] text-ink sm:text-6xl">Less generic advice. More of what only you can say.</h2><p className="max-w-xs leading-7 text-muted">A clear workflow for turning a vague claim into a detail that gives it weight.</p></div></Reveal>
        <div className="mt-14 grid gap-4 lg:grid-cols-3">{FEATURES.map((feature, index) => <Reveal key={feature.title} delay={index * 75}><article className={`feature-card ${feature.tone}`}><p className="font-mono text-[0.66rem] uppercase tracking-[0.15em] opacity-65">{feature.eyebrow}</p><h3 className="mt-10 max-w-[15rem] font-display text-3xl font-medium leading-[1.05] tracking-[-0.04em]">{feature.title}</h3><p className="mt-5 max-w-sm text-sm leading-6 opacity-75">{feature.copy}</p><span className="mt-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-current/20"><Arrow /></span></article></Reveal>)}</div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8 lg:px-10 lg:pb-32"><Reveal><div className="process-panel overflow-hidden rounded-[2rem] p-7 sm:p-10 lg:p-14"><div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]"><div><p className="section-eyebrow text-white/50">A real revision session</p><h2 className="mt-5 max-w-md font-display text-4xl font-medium leading-[1.02] tracking-[-0.05em] text-white sm:text-5xl">From “I changed” to the moment we can feel.</h2><p className="mt-6 max-w-sm leading-7 text-white/60">Essence does not score your identity or hand you a polished ending. It stays with one moment until it becomes usable material.</p></div><div className="grid gap-3 sm:grid-cols-3">{[["01", "Draft", "You make a claim."], ["02", "Question", "Essence asks for the missing moment."], ["03", "Material", "You decide what belongs in the draft."]].map(([number, label, text]) => <div key={number} className="process-step rounded-2xl p-5"><span className="font-mono text-xs tracking-[0.16em] text-mark">{number}</span><p className="mt-12 text-sm font-medium text-white">{label}</p><p className="mt-2 text-sm leading-6 text-white/55">{text}</p></div>)}</div></div></div></Reveal></section>

      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8 lg:px-10 lg:pb-32"><Reveal><div className="privacy-band rounded-2xl border border-line px-6 py-8 sm:flex sm:items-center sm:justify-between sm:gap-10 sm:px-9"><div className="flex gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><LogoMark className="h-6 w-6" /></div><div><p className="font-medium text-ink">Your story is not training data for a public essay generator.</p><p className="mt-1 max-w-2xl text-sm leading-6 text-muted">Drafts and conversation history stay scoped to your account. You choose when feedback is requested.</p></div></div><Link href="/privacy" className="mt-5 inline-flex shrink-0 items-center gap-2 text-sm font-medium text-accent sm:mt-0">Privacy, explained <Arrow /></Link></div></Reveal></section>

      <section id="faq" className="mx-auto max-w-3xl px-5 pb-24 sm:px-8 lg:pb-32"><Reveal><p className="section-eyebrow text-center">Questions, answered</p><h2 className="mt-5 text-center font-display text-4xl font-medium tracking-[-0.05em] text-ink sm:text-5xl">A tool with boundaries on purpose.</h2></Reveal><div className="modern-faq mt-12 border-t border-line">{FAQ.map(([question, answer]) => <details key={question} className="group border-b border-line py-1"><summary className="flex cursor-pointer items-center justify-between gap-5 py-5 font-medium text-ink"><span>{question}</span><span className="text-2xl font-light text-accent transition group-open:rotate-45">+</span></summary><p className="max-w-2xl pb-5 pr-10 text-sm leading-7 text-muted">{answer}</p></details>)}</div></section>

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-10"><Reveal><div className="final-cta rounded-[2rem] px-7 py-12 text-center sm:px-12 sm:py-16"><p className="section-eyebrow text-accent">Start with the story you already have</p><h2 className="mx-auto mt-5 max-w-2xl font-display text-4xl font-medium leading-[1.02] tracking-[-0.05em] text-ink sm:text-6xl">Your essay does not need another author.</h2><p className="mx-auto mt-5 max-w-lg leading-7 text-muted">It needs the right question, asked at the right line.</p><Link href={appHref} className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-accent">{signedIn ? "Open my workspace" : "Start free"}<Arrow /></Link></div></Reveal></section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10"><Logo /><p>Better questions. Still your voice.</p><div className="flex gap-5"><Link href="/privacy" className="hover:text-ink">Privacy</Link><Link href="/login" className="hover:text-ink">Log in</Link></div></footer>
    </main>
  );
}

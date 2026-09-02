"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createEssay } from "@/app/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4849c8] disabled:opacity-50"
    >
      {pending ? "Creating…" : "Create essay"}
    </button>
  );
}

/**
 * Collapsed until asked for. As a permanent sidebar it left a column of dead
 * space under it and squeezed the essay list, while the thing it creates is
 * needed a handful of times a season.
 */
export default function NewEssayForm() {
  const [kind, setKind] = useState("personal_statement");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-dashed border-line bg-white px-5 py-4 text-sm text-muted transition hover:border-accent hover:bg-accent-soft/30 hover:text-ink"
      >
        + New essay
      </button>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_16px_30px_-30px_rgba(23,32,51,0.55)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-medium tracking-[-0.03em]">New essay</h2>
          <p className="mt-1 text-sm text-muted">
            You can leave everything but the title blank and fill it in later.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 text-sm text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>

      <form action={createEssay} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Title</span>
          <input
            name="title"
            required
            placeholder="Personal Statement — Common App"
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Type</span>
          <select
            name="essay_kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="personal_statement">Personal statement</option>
            <option value="supplemental">Supplemental essay</option>
          </select>
        </label>

        {kind === "supplemental" && (
          <label className="block">
            <span className="text-sm font-medium">School</span>
            <input
              name="school"
              placeholder="Cornell"
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
        )}

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">
            Prompt <span className="font-normal text-muted">(optional)</span>
          </span>
          <textarea
            name="prompt_text"
            rows={3}
            placeholder="Paste the exact prompt you're answering."
            className="mt-1 w-full resize-y rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">
            Word limit <span className="font-normal text-muted">(optional)</span>
          </span>
          <input
            name="word_limit"
            type="number"
            min={1}
            placeholder="650"
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>

        <div className="sm:col-span-2">
          <SubmitButton />
        </div>
      </form>
    </section>
  );
}

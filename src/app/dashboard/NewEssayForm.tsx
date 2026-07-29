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
      className="w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-paper transition hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Creating…" : "Create essay"}
    </button>
  );
}

export default function NewEssayForm() {
  const [kind, setKind] = useState("personal_statement");

  return (
    <aside className="h-fit rounded-lg border border-line bg-white p-5">
      <h2 className="font-serif text-lg">New essay</h2>
      <p className="mt-1 text-sm text-muted">
        You can leave everything but the title blank and fill it in later.
      </p>

      <form action={createEssay} className="mt-5 space-y-4">
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
            <option value="supplemental">Supplemental / Why Us</option>
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

        <label className="block">
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

        <SubmitButton />
      </form>
    </aside>
  );
}

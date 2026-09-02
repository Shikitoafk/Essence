"use client";

import { useState } from "react";
import { updateEssaySettings } from "@/app/actions";
import type { Essay, EssayKind } from "@/lib/types";

export default function EssaySettings({ essay }: { essay: Essay }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(essay.title);
  const [promptText, setPromptText] = useState(essay.prompt_text ?? "");
  const [wordLimit, setWordLimit] = useState(
    essay.word_limit ? String(essay.word_limit) : "",
  );
  const [kind, setKind] = useState<EssayKind>(essay.essay_kind);
  const [school, setSchool] = useState(essay.school ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setStatus(null);
    const parsed = Number(wordLimit);
    const result = await updateEssaySettings(essay.id, {
      title: title.trim() || "Untitled essay",
      prompt_text: promptText.trim() || null,
      word_limit:
        wordLimit.trim() && Number.isFinite(parsed) && parsed > 0
          ? Math.round(parsed)
          : null,
      essay_kind: kind,
      school: school.trim() || null,
    });
    setBusy(false);
    setStatus(result.ok ? "Saved." : result.error);
  }

  return (
    <div className="rounded-lg border border-line bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm"
      >
        <span className="font-medium">Prompt, word limit &amp; title</span>
        <span className="text-muted">{open ? "Hide" : "Edit"}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-line p-4 text-sm">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-muted">
              Title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-accent"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-muted">
                Type
              </span>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as EssayKind)}
                className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-accent"
              >
                <option value="personal_statement">Personal statement</option>
                <option value="supplemental">Supplemental essay</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-widest text-muted">
                Word limit
              </span>
              <input
                type="number"
                min={1}
                value={wordLimit}
                onChange={(e) => setWordLimit(e.target.value)}
                placeholder="650"
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-accent"
              />
            </label>
          </div>

          {kind === "supplemental" && (
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-muted">
                School
              </span>
              <input
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="Cornell"
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-accent"
              />
            </label>
          )}

          <label className="block">
            <span className="text-xs uppercase tracking-widest text-muted">
              The prompt you&apos;re answering
            </span>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={3}
              placeholder="Paste it exactly — supplementals are graded on whether they answer this specific question."
              className="mt-1 w-full resize-y rounded-lg border border-line px-3 py-2 outline-none focus:border-accent"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="rounded-full bg-ink px-4 py-2 text-sm text-paper transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            {status && <span className="text-xs text-muted">{status}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

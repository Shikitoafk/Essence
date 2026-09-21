"use client";

import { useState } from "react";
import { getInviteUrl, trackProductEvent } from "@/lib/productAnalytics";

export default function GrowthPanel({ spotCount }: { spotCount: number }) {
  const [rating, setRating] = useState<"yes" | "no" | null>(null);
  const [reasonSent, setReasonSent] = useState(false);
  const [copied, setCopied] = useState(false);

  function rate(value: "yes" | "no") {
    setRating(value);
    trackProductEvent("feedback_rated", {
      rating: value,
      spot_count: spotCount,
    });
  }

  function sendReason(reason: string) {
    trackProductEvent("feedback_reason", {
      rating: rating ?? "unrated",
      reason,
    });
    setReasonSent(true);
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(getInviteUrl());
      setCopied(true);
      trackProductEvent("invite_copied", { source: "workspace" });
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <p className="text-sm font-medium text-ink">Did this read help?</p>
      {rating === null ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => rate("yes")}
            className="rounded-full border border-line px-4 py-1.5 text-sm transition hover:border-accent hover:text-accent"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => rate("no")}
            className="rounded-full border border-line px-4 py-1.5 text-sm transition hover:border-accent hover:text-accent"
          >
            Not really
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-xs leading-5 text-muted">
            {rating === "yes"
              ? "Good. What made it useful?"
              : "What did it misunderstand or ask badly?"}
          </p>
          {!reasonSent ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {(rating === "yes"
                ? [
                    ["found_gap", "Found the real gap"],
                    ["unlocked_material", "Unlocked new material"],
                    ["clear_next_step", "Gave me a clear next step"],
                  ]
                : [
                    ["missed_main_idea", "Missed the main idea"],
                    ["too_detailed", "Question was too detailed"],
                    ["asked_for_more", "Asked for unnecessary detail"],
                    ["unclear", "Feedback was unclear"],
                  ]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => sendReason(value)}
                  className="rounded-full border border-line px-3 py-1.5 text-xs text-muted transition hover:border-accent hover:text-accent"
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs font-medium text-accent">Thank you — saved.</p>
          )}
        </div>
      )}

      <div className="mt-5 border-t border-line pt-4">
        <p className="text-xs leading-5 text-muted">
          Know someone revising an essay? Send them the sample first — no
          account or draft required.
        </p>
        <button
          type="button"
          onClick={() => void copyInvite()}
          className="mt-2 text-sm font-medium text-accent underline underline-offset-2"
        >
          {copied ? "Invite link copied" : "Invite a friend"}
        </button>
      </div>
    </section>
  );
}

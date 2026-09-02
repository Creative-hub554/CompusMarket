"use client";

import { useState } from "react";

type ReportTargetType = "POST" | "PRODUCT" | "USER" | "COMMENT";
type ReportReason = "SPAM" | "ABUSE" | "FRAUD" | "INAPPROPRIATE" | "OTHER";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "SPAM", label: "Spam" },
  { value: "ABUSE", label: "Abuse or harassment" },
  { value: "FRAUD", label: "Scam or fraud" },
  { value: "INAPPROPRIATE", label: "Inappropriate content" },
  { value: "OTHER", label: "Other" },
];

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: ReportTargetType;
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("SPAM");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason, message: message.trim() || undefined }),
      });
      if (res.status === 409) {
        setError("You have already reported this item.");
        setSending(false);
        return;
      }
      if (!res.ok) throw new Error("Failed to submit report");
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
        Report submitted. Thank you.
      </span>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        aria-label="Report this content"
      >
        🚩 Report
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3 space-y-2 shadow-sm">
      <p className="text-xs font-semibold text-gray-500">Why are you reporting this?</p>
      <div className="flex flex-wrap gap-1.5">
        {REASONS.map((r) => (
          <button
            key={r.value}
            onClick={() => setReason(r.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              reason === r.value
                ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, 500))}
        placeholder="Optional details (max 500 chars)"
        rows={2}
        className="w-full rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-red-300 bg-[var(--surface)]"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          disabled={sending}
          className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {sending ? "Submitting…" : "Submit Report"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-1 rounded-lg text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

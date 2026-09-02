"use client";

import { useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { MailCheck, ExternalLink } from "lucide-react";

export default function ForgotPasswordPage() {
  const pathname = usePathname();
  const locale = /^\/(en|km)\b/.test(pathname) ? pathname.split("/")[1] : "km";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [devUrl, setDevUrl] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setStatus("idle");
        return;
      }
      setDevUrl(data.devUrl || "");
      setStatus("done");
    } catch {
      setError("Something went wrong");
      setStatus("idle");
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 animate-fade-in-up">
      <div className="card rounded-2xl p-8 shadow-[var(--shadow-soft)]">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 no-underline mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/champey-mark.svg" alt="" width={36} height={36} />
            <span className="text-xl font-bold tracking-[0.12em] text-slate-900 dark:text-slate-100">
              champey
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Reset your password
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            Enter the email you signed up with and we&apos;ll send you a reset link.
          </p>
        </div>

        {status === "done" ? (
          <div className="text-center space-y-4">
            <MailCheck className="mx-auto text-green-600" size={40} />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              If an account exists for that email, a reset link is on its way.
            </p>
            {devUrl && (
              <p className="text-xs bg-slate-100 dark:bg-slate-800 rounded-lg p-3 break-all text-slate-500">
                Development link (no mail server configured):{" "}
                <a
                  href={devUrl}
                  className="inline-flex items-center gap-1 text-gold-600 dark:text-gold-400 font-medium hover:underline"
                >
                  Open reset link <ExternalLink size={12} />
                </a>
              </p>
            )}
            <Link
              href="/login"
              className="block text-sm text-gold-600 dark:text-gold-400 font-medium hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/50 rounded-lg px-3 py-2 text-center animate-slide-down">
                {error}
              </p>
            )}
            <div>
              <label
                htmlFor="fp-email"
                className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300"
              >
                Email
              </label>
              <input
                id="fp-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field px-4 py-2.5"
                placeholder="your@email.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="btn-primary w-full py-2.5 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
            >
              {status === "loading" ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
"use client";

import { Suspense, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { MailCheck, MailX, MailPlus } from "lucide-react";

function useLocale() {
  const pathname = usePathname();
  return /^\/(en|km)\b/.test(pathname) ? pathname.split("/")[1] : "km";
}

function ResendForm() {
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      // Always show confirmation regardless of outcome (no account enumeration).
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="w-full space-y-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          If this email belongs to an unverified account, a new verification
          link has been sent. Check your inbox.
        </p>
        <Link
          href="/login"
          className="block btn-primary w-full py-2.5 hover:scale-[1.02] active:scale-[0.98]"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleResend} className="w-full space-y-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        className="input-field px-4 py-2.5"
      />
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-2.5 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
      >
        {loading ? "Sending..." : "Resend verification email"}
      </button>
    </form>
  );
}

function VerifyEmailStatus() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");

  if (status === "success") {
    return (
      <div className="text-center space-y-4">
        <MailCheck className="mx-auto text-green-600" size={40} />
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Email verified
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Your email has been verified. Your account is all set.
        </p>
        <Link
          href="/login"
          className="block btn-primary w-full py-2.5 hover:scale-[1.02] active:scale-[0.98]"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <MailX className="mx-auto text-red-500" size={40} />
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
        Verification failed
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        This verification link is invalid or has expired. Enter your email to
        request a new one.
      </p>
      <ResendForm />
      <div className="text-sm flex items-center justify-center gap-1">
        <MailPlus size={15} className="text-slate-400" />
        <span className="text-slate-500 dark:text-slate-400">
          Haven&apos;t received it? Check your spam folder.
        </span>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
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
        </div>
        <Suspense
          fallback={
            <p className="text-sm text-slate-500 text-center py-4">Loading...</p>
          }
        >
          <VerifyEmailStatus />
        </Suspense>
      </div>
    </div>
  );
}

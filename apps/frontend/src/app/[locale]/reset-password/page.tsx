"use client";

import { Suspense, useState } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/50 rounded-lg px-3 py-2 text-center">
        This reset link is invalid or has expired.
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle2 className="mx-auto text-green-600" size={40} />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Password updated. Sign in with your new password.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="btn-primary w-full py-2.5 hover:scale-[1.02] active:scale-[0.98]"
        >
          Go to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/50 rounded-lg px-3 py-2 text-center animate-slide-down">
          {error}
        </p>
      )}
      <div>
        <label
          htmlFor="rp-password"
          className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300"
        >
          New password
        </label>
        <div className="relative">
          <input
            id="rp-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field px-4 py-2.5 pr-11"
            placeholder="Choose a new password"
            required
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>
      <div>
        <label
          htmlFor="rp-confirm"
          className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300"
        >
          Confirm password
        </label>
        <input
          id="rp-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="input-field px-4 py-2.5"
          placeholder="Repeat the new password"
          required
          minLength={8}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-2.5 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
      >
        {loading ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
            Set a new password
          </h1>
        </div>
        <Suspense
          fallback={
            <p className="text-sm text-slate-500 text-center py-4">Loading...</p>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Eye, EyeOff, MailCheck, ExternalLink } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = /^\/(en|km)\b/.test(pathname) ? pathname.split("/")[1] : "km";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verification, setVerification] = useState<{
    sent: boolean;
    devUrl?: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, locale }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Registration failed");
        return;
      }

      const data = await res.json();
      setVerification(data.verification || null);

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Account created. Please sign in.");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
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
          {verification ? (
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Verify your email
            </h1>
          ) : (
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Create Account
            </h1>
          )}
        </div>

        {verification ? (
          <div className="space-y-4">
            <div className="text-center space-y-3">
              <MailCheck className="mx-auto text-green-600" size={40} />
              <p className="text-sm text-slate-600 dark:text-slate-300">
                We sent a verification email to <strong>{email}</strong>. Check
                your inbox to finish setting up your account
                {verification.sent ? "." : " once the mail server is configured."}
              </p>
              {verification.devUrl && (
                <p className="text-xs bg-slate-100 dark:bg-slate-800 rounded-lg p-3 break-all text-slate-500">
                  Development link (no mail server configured):{" "}
                  <a
                    href={verification.devUrl}
                    className="inline-flex items-center gap-1 text-gold-600 dark:text-gold-400 font-medium hover:underline"
                  >
                    Verify email <ExternalLink size={12} />
                  </a>
                </p>
              )}
            </div>
            <button
              onClick={() => {
                router.push("/");
                router.refresh();
              }}
              className="btn-primary w-full py-2.5 hover:scale-[1.02] active:scale-[0.98]"
            >
              Continue to homepage
            </button>
          </div>
        ) : (
          <>
          <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/50 rounded-lg px-4 py-2.5 text-center animate-slide-down">
              {error}
            </p>
          )}
          <div>
            <label
              htmlFor="reg-name"
              className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300"
            >
              Name
            </label>
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field px-4 py-2.5"
              placeholder="Your name"
            />
          </div>
          <div>
            <label
              htmlFor="reg-email"
              className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300"
            >
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field px-4 py-2.5"
              placeholder="your@email.com"
              required
            />
          </div>
          <div>
            <label
              htmlFor="reg-password"
              className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field px-4 py-2.5 pr-11"
                placeholder="Create a password"
                required
                minLength={6}
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
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
          </form>

          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-gold-600 dark:text-gold-400 font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
          </>
          )}
      </div>
    </div>
  );
}

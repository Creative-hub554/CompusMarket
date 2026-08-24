"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 animate-fade-in-up">
      <div className="text-center mb-8">
        <Link href="/" className="inline-block no-underline mb-4">
          <p className="text-xl font-bold tracking-[0.12em] text-slate-900">
            Champey
          </p>
          <p className="text-[9px] tracking-[0.3em] text-amber-500 mt-0.5">
            bytheo
          </p>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Sign In</h1>
      </div>
      <p className="text-sm text-gray-500 text-center mb-8">
        Sign in to manage orders, warranties, and more.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 text-center animate-slide-down">
            {error}
          </p>
        )}
        <div>
          <label
            htmlFor="login-email"
            className="block text-sm font-medium mb-1"
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
            placeholder="your@email.com"
            required
          />
        </div>
        <div>
          <label
            htmlFor="login-password"
            className="block text-sm font-medium mb-1"
          >
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
            placeholder="Enter your password"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-red-600 py-2.5 text-white font-medium hover:bg-red-700 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-6">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-indigo-600 font-medium hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}

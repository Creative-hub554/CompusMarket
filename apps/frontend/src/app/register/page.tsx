"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Registration failed");
        return;
      }

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Account created. Please sign in.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 animate-fade-in-up">
      <div className="text-center mb-8">
        <Link href="/" className="inline-block no-underline mb-4">
          <p className="font-['Playfair_Display'] text-xl font-bold tracking-[0.12em] text-khmer-blue">KHMERONLINESHOP</p>
          <p className="text-[9px] tracking-[0.3em] text-khmer-gold mt-0.5">bytheo</p>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5 text-center animate-slide-down">{error}</p>
        )}
        <div>
          <label htmlFor="reg-name" className="block text-sm font-medium mb-1">Name</label>
          <input
            id="reg-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-khmer-gold focus:ring-1 focus:ring-khmer-gold outline-none transition-colors"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="reg-email" className="block text-sm font-medium mb-1">Email</label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-khmer-gold focus:ring-1 focus:ring-khmer-gold outline-none transition-colors"
            placeholder="your@email.com"
            required
          />
        </div>
        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium mb-1">Password</label>
          <input
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-khmer-gold focus:ring-1 focus:ring-khmer-gold outline-none transition-colors"
            placeholder="Create a password"
            required
            minLength={6}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-khmer-red py-2.5 text-white font-medium hover:bg-khmer-red-light transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-khmer-red font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

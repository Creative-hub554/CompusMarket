"use client";

import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";

type RequireAuthProps = {
  /** Page content rendered when signed in. */
  children?: ReactNode;
  /** Heading shown on the sign-in gate. Defaults to "Sign In Required". */
  title?: string;
  /** Optional one-line explanation under the heading. */
  message?: string;
  /** Decorative icon bubble above the heading (community pages). */
  icon?: ReactNode;
  /** CTA style: text link (default) or primary button. */
  cta?: "link" | "button";
  /** Extra classes for the gate wrapper. */
  className?: string;
};

/**
 * Shared sign-in gate. When a user is signed in it renders `children` (or
 * nothing if no children); otherwise it shows the standardized gate — icon
 * bubble, title, message, and a CTA to /login — that used to be hand-copied
 * across ~20 pages.
 */
export function RequireAuth({
  children,
  title = "Sign In Required",
  message,
  icon,
  cta = "link",
  className = "max-w-xl mx-auto px-4 py-12",
}: RequireAuthProps) {
  const { data: session } = useSession();
  if (session) return children ? <>{children}</> : null;

  return (
    <div className={className}>
      <div className="text-center">
        {icon}
        <h1 className={`text-2xl font-bold ${icon ? "mb-2" : "mb-4"}`}>
          {title}
        </h1>
        {message && (
          <p className="text-slate-500 dark:text-slate-400 mb-4">{message}</p>
        )}
        {cta === "button" ? (
          <Link href="/login" className="btn-primary inline-block">
            Sign In
          </Link>
        ) : (
          <Link
            href="/login"
            className="text-gold-600 font-medium hover:underline"
          >
            Go to Login
          </Link>
        )}
      </div>
    </div>
  );
}
import type { InputHTMLAttributes } from "react";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold ${className}`}
      style={{
        background: "var(--surface)",
        borderColor: "var(--border-subtle)",
        color: "var(--text-body)",
      }}
      {...props}
    />
  );
}

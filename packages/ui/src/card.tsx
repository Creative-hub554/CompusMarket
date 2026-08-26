import type { HTMLAttributes } from "react";

export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border transition-colors duration-200 ${className}`}
      style={{
        background: "var(--surface)",
        borderColor: "var(--border-subtle)",
      }}
      {...props}
    />
  );
}

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-gold to-gold-light text-slate-950 font-semibold shadow-[0_4px_14px_-4px_rgb(212,160,39/0.55)] hover:shadow-[0_6px_20px_-4px_rgb(212,160,39/0.7)] hover:-translate-y-0.5",
  secondary:
    "bg-gold-600 text-white hover:bg-gold-700 dark:bg-gold-700 dark:hover:bg-gold-600",
  ghost:
    "border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-body)]",
  danger:
    "bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600",
  success:
    "bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

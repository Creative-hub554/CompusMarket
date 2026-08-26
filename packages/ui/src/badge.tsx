import type { HTMLAttributes } from "react";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info";

const variants: Record<BadgeVariant, string> = {
  default:
    "bg-[var(--surface-2)] text-[var(--text-muted)]",
  success:
    "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  danger:
    "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300",
  info:
    "bg-gold-100 text-gold-800 dark:bg-gold-950/60 dark:text-gold-300",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({
  variant = "default",
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

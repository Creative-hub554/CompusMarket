"use client";

const VARIANT_STYLES: Record<string, string> = {
  default: "bg-black/5 text-[#515154]",
  success: "bg-[#e8f7ee] text-[#248a3d]",
  danger: "bg-[#ffeced] text-[#d70015]",
  warning: "bg-[#fff3cd] text-[#946200]",
  info: "bg-[#f0eaff] text-[#6b4fbb]",
};

export function AdminBadge({
  label,
  variant = "default",
}: {
  label: string;
  variant?: keyof typeof VARIANT_STYLES;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${VARIANT_STYLES[variant] ?? VARIANT_STYLES.default}`}
    >
      {label}
    </span>
  );
}

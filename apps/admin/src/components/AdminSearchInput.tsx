"use client";

export function AdminSearchInput({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mb-6 flex items-center gap-2 rounded-[10px] bg-black/[0.04] px-3.5 py-2.5">
      <svg
        className="h-4 w-4 text-[#86868b]"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx={11} cy={11} r={7} />
        <path strokeLinecap="round" d="m20 20-3.5-3.5" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-transparent text-[15px] text-[#1d1d1f] outline-none placeholder:text-[#86868b]"
      />
    </div>
  );
}

"use client";

export function AdminStatusFilter({
  options,
  value,
  onChange,
  labelMap,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  labelMap?: Record<string, string>;
}) {
  return (
    <div className="mb-6 inline-flex rounded-lg bg-black/5 p-0.5" role="tablist" aria-label="Filter">
      {options.map((f) => (
        <button
          key={f}
          role="tab"
          aria-selected={value === f}
          onClick={() => onChange(f)}
          className={`rounded-md px-4 py-1.5 text-[13px] font-medium transition-shadow ${
            value === f
              ? "bg-white text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
              : "text-[#1d1d1f] hover:bg-white/50"
          }`}
        >
          {labelMap?.[f] ?? f}
        </button>
      ))}
    </div>
  );
}

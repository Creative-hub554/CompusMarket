"use client";

import { type ReactNode } from "react";

export function AdminDataTable({
  columns,
  children,
  emptyMessage = "No results found.",
}: {
  columns: string[];
  children: ReactNode;
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <table className="w-full text-[14px]" role="table">
        <thead>
          <tr className="border-b border-black/5 text-left text-[12px] font-semibold text-[#6e6e73]">
            {columns.map((col) => (
              <th key={col} className="px-6 py-3.5" scope="col">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {children === null && (
        <p className="p-4 text-center text-[15px] text-[#86868b]">
          {emptyMessage}
        </p>
      )}
    </div>
  );
}

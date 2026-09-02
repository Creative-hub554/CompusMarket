"use client";

import { type ReactNode } from "react";

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-[40px] font-bold leading-tight tracking-tight text-[#1d1d1f]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-[17px] text-[#6e6e73]">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

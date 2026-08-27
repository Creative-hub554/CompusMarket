"use client";

import { useLocale, useTranslations } from "next-intl";

interface TableColumn<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface LocalizedTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  className?: string;
}

export function LocalizedTable<T>({ data, columns, className }: LocalizedTableProps<T>) {
  const locale = useLocale();
  const t = useTranslations("table");

  return (
    <div className={`rounded-lg border overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr
              className="border-b"
              style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border-subtle)" }}
            >
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className="px-4 py-3 text-left text-sm font-semibold"
                  style={{ color: "var(--text-body)" }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b hover:bg-opacity-50 transition-colors"
                style={{ 
                  backgroundColor: rowIndex % 2 === 0 ? "var(--surface)" : "transparent",
                  borderColor: "var(--border-subtle)",
                }}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className="px-4 py-3 text-sm"
                    style={{ color: "var(--text-body)" }}
                  >
                    {column.render
                      ? column.render(row[column.key as keyof T], row)
                      : String(row[column.key as keyof T] || "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
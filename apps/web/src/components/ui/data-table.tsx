"use client";

import React from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: "left" | "right" | "center";
  render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
}

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data available",
  className = "",
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div
      className={[
        "bg-surface border border-border rounded-lg overflow-hidden",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <table className="w-full border-collapse">
        {/* Header */}
        <thead>
          <tr className="h-11 bg-white/[0.02] border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={[
                  "text-label text-foreground-tertiary px-4 font-semibold",
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                    ? "text-center"
                    : "text-left",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="py-12 flex items-center justify-center">
                  <span className="text-body-sm text-foreground-tertiary">
                    {emptyMessage}
                  </span>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={keyExtractor(row, rowIndex)}
                className={[
                  "min-h-[56px] border-b border-white/[0.05] last:border-0",
                  "hover:bg-white/[0.025] transition-colors duration-fast",
                  onRowClick ? "cursor-pointer" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={[
                      "px-4 py-3 text-body text-foreground",
                      col.align === "right"
                        ? "text-right font-mono tabular-nums"
                        : col.align === "center"
                        ? "text-center"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {col.render
                      ? col.render(row, rowIndex)
                      : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

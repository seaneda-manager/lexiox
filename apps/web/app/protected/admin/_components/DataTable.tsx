'use client';
import React from 'react';

type Col<T> = { header: string; render: (row: T) => React.ReactNode; className?: string };

export default function DataTable<T>({
  rows,
  columns,
  empty,
}: {
  rows: T[];
  columns: Col<T>[];
  empty?: string;
}) {
  if (!rows.length) return <div className="text-sm text-gray-500">{empty ?? '?곗씠?곌? ?놁뒿?덈떎.'}</div>;

  return (
    <div className="overflow-x-auto border rounded-xl">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-zinc-900">
          <tr>
            {columns.map((c, i) => (
              <th key={i} className={`px-3 py-2 text-left font-medium ${c.className || ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              {columns.map((c, j) => (
                <td key={j} className={`px-3 py-2 align-top ${c.className || ''}`}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}





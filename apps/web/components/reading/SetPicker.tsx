'use client';

import Link from 'next/link';

type Props = {
  sets: {
    id: string;
    title: string;
    source?: string | null;
    version?: number | null;
  }[];
};

export default function SetPicker({ sets }: Props) {
  return (
    <div className="space-y-2">
      {sets.map((s) => (
        <Link
          key={s.id}
          href={`/reading/study?setId=${s.id}`} // ← 여기서 study 페이지로 연결
          className="block rounded border p-3 hover:bg-neutral-50"
        >
          <div className="font-medium">{s.title}</div>

          {(s.source || s.version != null) && (
            <div className="text-xs text-neutral-500">
              {s.source && <span className="mr-2">{s.source}</span>}
              {s.version != null && <span>v{s.version}</span>}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}

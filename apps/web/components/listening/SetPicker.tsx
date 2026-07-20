'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type AvailSet = { id: string; tpo: number; title: string };

export default function SetPicker({ sets }: { sets: AvailSet[] }) {
  const router = useRouter();
  const [sel, setSel] = useState(sets[0]?.id ?? '');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (sel) router.push(`/(protected)/listening/test/${sel}`);
      }}
      className="rounded-2xl border bg-white p-4 space-y-3"
    >
      <label className="block">
        <span className="text-sm">TPO #</span>
        <select
          className="w-full border rounded p-2"
          value={sel}
          onChange={(e) => setSel(e.target.value)}
        >
          {sets.map((s) => (
            <option key={s.id} value={s.id}>
              TPO {s.tpo} ??{s.title}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button type="submit" className="px-4 py-2 rounded bg-black text-white">
          Start
        </button>
      </div>
    </form>
  );
}





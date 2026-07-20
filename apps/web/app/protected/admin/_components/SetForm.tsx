// apps/web/app/(protected)/admin/_components/SetForm.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ContentSet, ContentSetInput } from '@/app/types/types-cms';

type Props = {
  initial?: Partial<ContentSet>;
  id?: string;
};

/** 폼 상태 (서버 타입과 분리해서 안전하게 관리) */
type SetFormState = {
  title: string;
  section: ContentSet['section'];
  level: string;
  tags: string[];
  description: string;
  is_published: boolean;
};

export default function SetForm({ initial, id }: Props) {
  const router = useRouter();

  const [form, setForm] = useState<SetFormState>({
    title: initial?.title ?? '',
    section: (initial?.section as ContentSet['section']) ?? 'reading',
    level: initial?.level ?? '',
    tags: initial?.tags ?? [],
    description: initial?.description ?? '',
    is_published: initial?.is_published ?? false,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const payload: ContentSetInput = {
        title: form.title.trim(),
        section: form.section,
        level: form.level.trim(),
        tags: form.tags,
        description: form.description,
        is_published: !!form.is_published,
      };

      const res = await fetch(id ? `/api/admin/sets/${id}` : '/api/admin/sets', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let j: any = null;
      try {
        j = await res.json();
      } catch {
        // noop: 비JSON 응답 방어
      }
      if (!res.ok) {
        throw new Error(j?.error || `Request failed (${res.status})`);
      }

      router.push('/admin/sets'); // URL에 (protected) 세그먼트는 포함되지 않음
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      {err && <div className="text-sm text-red-600">{err}</div>}

      <div>
        <label htmlFor="title" className="mb-1 block text-sm">
          Title
        </label>
        <input
          id="title"
          className="w-full rounded-lg border px-3 py-2"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="section" className="mb-1 block text-sm">
            Section
          </label>
          <select
            id="section"
            className="w-full rounded-lg border px-3 py-2"
            value={form.section}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                section: e.target.value as ContentSet['section'],
              }))
            }
          >
            <option value="reading">Reading</option>
            <option value="listening">Listening</option>
            <option value="speaking">Speaking</option>
            <option value="writing">Writing</option>
          </select>
        </div>

        <div>
          <label htmlFor="level" className="mb-1 block text-sm">
            Level (난도)
          </label>
          <input
            id="level"
            className="w-full rounded-lg border px-3 py-2"
            placeholder="예: CEFR B1/B2 또는 High/Upper-Intermediate"
            value={form.level ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <label htmlFor="tags" className="mb-1 block text-sm">
          Tags (쉼표로 구분)
        </label>
        <input
          id="tags"
          className="w-full rounded-lg border px-3 py-2"
          placeholder="예: inference, vocabulary, TPO54"
          value={(form.tags ?? []).join(', ')}
          onChange={(e) => {
            const t = e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            setForm((f) => ({ ...f, tags: t }));
          }}
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm">
          Description
        </label>
        <textarea
          id="description"
          className="min-h-[100px] w-full rounded-lg border px-3 py-2"
          value={form.description ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>

      <label className="inline-flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={!!form.is_published}
          onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
        />
        <span className="text-sm">Published</span>
      </label>

      <div className="pt-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
        >
          {busy ? (id ? 'Updating...' : 'Creating...') : id ? 'Update Set' : 'Create Set'}
        </button>
      </div>
    </form>
  );
}

import Link from 'next/link';
import DataTable from '../_components/DataTable';
import type { DbContentSet as ContentSet } from '@/app/types/types-cms';

async function fetchSets(): Promise<ContentSet[]> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || '';
  const res = await fetch(`${base}/api/admin/sets`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export default async function SetsPage() {
  const rows = await fetchSets();

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold">Content Sets</h1>
        <Link
          href="/(protected)/admin/sets/new"
          className="ml-auto px-3 py-2 rounded-xl bg-blue-600 text-white text-sm"
        >
          + New Set
        </Link>
      </div>

      <DataTable<ContentSet>
        rows={rows}
        empty="?占쎌쭅 ?占쏀듃媛 ?占쎌뒿?占쎈떎. New Set???占쎈윭 ?占쎌꽦?占쎌꽭??"
        columns={[
          {
            header: 'Title',
            render: (r: ContentSet) => (
              <Link className="text-blue-600 underline" href={`/(protected)/admin/sets/${r.id}`}>
                {r.title}
              </Link>
            ),
          },
          { header: 'Section', render: (r: ContentSet) => r.section },
          { header: 'Level', render: (r: ContentSet) => r.level ?? '-' },
          { header: 'Tags', render: (r: ContentSet) => (r.tags ?? []).join(', ') || '-' },
          { header: 'Status', render: (r: ContentSet) => (r.is_published ? 'Published' : 'Draft') },
          { header: 'Updated', render: (r: ContentSet) => new Date(r.updated_at).toLocaleString() },
        ]}
      />
    </div>
  );
}





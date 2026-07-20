// apps/web/app/(protected)/admin/sets/[id]/page.tsx

import SetForm from '../../_components/SetForm';
import type { DbContentSet as ContentSet } from '@/app/types/types-cms';

async function fetchSet(id: string): Promise<ContentSet | null> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || '';
  const res = await fetch(`${base}/api/admin/sets/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function EditSetPage(props: any) {
  const { params } = props as { params: { id: string } };

  const item = await fetchSet(params.id);
  if (!item) return <div className="text-sm text-red-600">세트를 불러오지 못했습니다.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold">Edit: {item.title}</h1>
        <form
          className="ml-auto"
          action={`/api/admin/sets/${item.id}`}
          method="post"
          onSubmit={(e) => {
            if (!confirm('정말 삭제할까요?')) e.preventDefault();
          }}
        >
          <input type="hidden" name="_method" value="DELETE" />
          <button className="px-3 py-2 rounded-xl border text-sm">Delete</button>
        </form>
      </div>
      <SetForm id={item.id} initial={item} />
    </div>
  );
}

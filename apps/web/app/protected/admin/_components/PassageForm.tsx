'use client';
import { useState } from 'react';
import type { Passage } from '@/app/types/types-cms';

export default function PassageForm({ setId, initial, onSaved }:{
  setId: string; initial?: Partial<Passage>; onSaved?: ()=>void;
}){
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [orderIndex, setOrderIndex] = useState<number>(initial?.order_index ?? 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  const save = async (e:React.FormEvent)=>{
    e.preventDefault();
    setBusy(true); setErr(null);
    try{
      const url = initial?.id ? `/api/admin/passages/${initial.id}` : `/api/admin/sets/${setId}/passages`;
      const method = initial?.id ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ title, content, order_index: orderIndex }) });
      const j = await res.json();
      if(!res.ok) throw new Error(j.error||'failed');
      onSaved?.();
    }catch(e:any){ setErr(e.message); } finally{ setBusy(false); }
  };

  return (
    <form onSubmit={save} className="space-y-2">
      {err && <div className="text-red-600 text-sm">{err}</div>}
      <input className="w-full border rounded-lg px-3 py-2" placeholder="Passage title"
        value={title} onChange={e=>setTitle(e.target.value)} required />
      <textarea className="w-full border rounded-lg px-3 py-2 min-h-[120px]" placeholder="Content (markdown)"
        value={content ?? ''} onChange={e=>setContent(e.target.value)} />
      <div className="flex items-center gap-2">
        <label className="text-sm">Order</label>
        <input type="number" className="w-24 border rounded-lg px-2 py-1"
          value={orderIndex} onChange={e=>setOrderIndex(Number(e.target.value))}/>
        <button disabled={busy} className="ml-auto px-3 py-2 rounded-xl bg-blue-600 text-white text-sm">
          {initial?.id ? 'Update' : 'Add Passage'}
        </button>
      </div>
    </form>
  );
}





'use client';

import { useRef, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabaseBrowser';

export default function AdminUploader() {
  const supabase = createSupabaseBrowser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const onUpload = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f) { setMsg('Choose a JSON file.'); return; }
    if (f.type && f.type !== 'application/json') {
      setMsg('Please upload a JSON file.'); return;
    }
    setBusy(true); setMsg('');
    try {
      const stamp = new Date();
      const pad = (n:number)=>String(n).padStart(2,'0');
      const key = `reading/${stamp.getFullYear()}${pad(stamp.getMonth()+1)}${pad(stamp.getDate())}_${pad(stamp.getHours())}${pad(stamp.getMinutes())}${pad(stamp.getSeconds())}_${Math.random().toString(36).slice(2,8)}.json`;

      // 踰꾪궥: content (?놁쑝硫?Supabase ??쒕낫?쒖뿉???앹꽦?대몢?몄슂)
      const { error } = await supabase.storage.from('content').upload(key, f, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/json',
      });
      if (error) throw error;

      setMsg(`Uploaded: content/${key}`);
      fileRef.current!.value = '';
    } catch (e: any) {
      setMsg(e?.message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border p-4 flex flex-col gap-3">
      <input ref={fileRef} type="file" accept=".json,application/json" />
      <button
        disabled={busy}
        onClick={onUpload}
        className="rounded-lg border px-3 py-2 w-fit disabled:opacity-50"
      >
        {busy ? 'Uploading...' : 'Upload JSON to Storage'}
      </button>
      {msg && <p className="text-sm opacity-80">{msg}</p>}
    </div>
  );
}





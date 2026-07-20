'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type FileRow = {
  name: string;
  id?: string;
  updated_at?: string;
  metadata?: Record<string, unknown> | null;
};

export default function Page() {
  const [items, setItems] = useState<FileRow[]>([]);
  const [msg, setMsg] = useState('loading...');
  const [busy, setBusy] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const urlFor = useCallback(
    (name: string) =>
      supabase.storage.from('audio').getPublicUrl(name).data.publicUrl,
    []
  );

  const load = useCallback(async () => {
    setMsg('loading...');

    const { data, error } = await supabase.storage.from('audio').list('', {
      limit: 100,
      sortBy: { column: 'updated_at', order: 'desc' },
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    setItems(data ?? []);
    setMsg('');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = useCallback(
    async (file: File) => {
      setBusy(true);
      try {
        const path = `uploads/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from('audio').upload(path, file);

        if (error) {
          alert(error.message);
          return;
        }

        await load();
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) void upload(f);
    },
    [upload]
  );

  const onSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const src = e.target.value;
    const el = audioRef.current;
    if (!el) return;

    el.src = src;
    el.load();
    void el.play().catch(() => {});
  }, []);

  return (
    <div
      style={{
        maxWidth: 900,
        margin: '24px auto',
        padding: 16,
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
      }}
    >
      <h2>Audio Storage</h2>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="file" accept="audio/*" onChange={onFileChange} />
        {busy && <span>Uploading...</span>}
      </div>

      {msg && <div style={{ marginTop: 8 }}>{msg}</div>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 280px',
          gap: 12,
          marginTop: 12,
        }}
      >
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {items.map((it) => (
            <li key={it.name} style={{ marginBottom: 8 }}>
              <a href={urlFor(it.name)} target="_blank" rel="noreferrer">
                {it.name}
              </a>
            </li>
          ))}
        </ul>

        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 8,
          }}
        >
          <div style={{ fontSize: 12, color: '#666' }}>
            {/* 안내문 정리 */}
            공개 버킷(audio) 사용 기준입니다. 비공개 RLS 버킷이면 권한이 없을 때
            {` 'permission denied'`}가 표시될 수 있어요.
          </div>

          <select onChange={onSelect} style={{ marginTop: 6, width: '100%' }}>
            <option value="">{`-- 파일 선택 --`}</option>
            {items
              .filter((it) => /\.(mp3|wav|m4a|ogg)$/i.test(it.name))
              .map((it) => (
                <option key={it.name} value={urlFor(it.name)}>
                  {it.name}
                </option>
              ))}
          </select>

          <audio
            ref={audioRef}
            id="aud"
            controls
            style={{ width: '100%', marginTop: 8 }}
          />

          <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
            재생은 공개 URL 기반입니다. 사내망 권한 설정에 따라 접근이 제한될 수
            있습니다.
          </div>
        </div>
      </div>
    </div>
  );
}
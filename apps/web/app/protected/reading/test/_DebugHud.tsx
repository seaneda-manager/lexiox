// apps/web/app/(protected)/reading/test/_DebugHud.tsx
'use client';
import { useEffect } from 'react';

export default function DebugHud({ setId }: { setId: string }) {
  useEffect(() => {
    console.log('[ReadingTest] mounted with setId=', setId);
  }, [setId]);

  return (
    <div className="mb-3 rounded border bg-yellow-50 px-3 py-2 text-xs text-yellow-900">
      Debug: setId={setId}
    </div>
  );
}





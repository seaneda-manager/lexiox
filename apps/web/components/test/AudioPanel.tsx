'use client';

import { useEffect, useRef, useState } from 'react';

export default function AudioPanel({
  src, allowSeek, allowSpeed,
}: { src: string; allowSeek?: boolean; allowSpeed?: boolean }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [rate, setRate] = useState(1);
  useEffect(() => { if (ref.current) ref.current.playbackRate = rate; }, [rate]);

  return (
    <div className="rounded border p-3">
      <audio ref={ref} src={src} controls className="w-full" />
      <div className="mt-2 flex items-center gap-3 text-sm">
        {allowSeek && <span>Seek: native controls</span>}
        {allowSpeed && (
          <label className="flex items-center gap-2">
            Speed
            <select
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="rounded border px-2 py-1"
            >
              <option value={0.75}>0.75x</option>
              <option value={1}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2.0x</option>
            </select>
          </label>
        )}
      </div>
    </div>
  );
}





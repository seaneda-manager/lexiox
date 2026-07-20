'use client';

import { supabase } from './supabaseClient';
import { ORG_ID } from './constants';

type SetRow = {
  id: string;
  section: 'reading' | 'listening';
  set_id: string;
  title: string | null;
  version: number;
  payload_json: any;
  published_at: string | null;
};

export async function fetchBestSet(
  section: 'reading' | 'listening'
): Promise<SetRow | null> {
  // Prefer published sets first; otherwise fall back to the latest version.
  const { data, error } = await supabase
    .from('sets')
    .select('id, section, set_id, title, version, payload_json, published_at')
    .eq('org_id', ORG_ID)
    .eq('section', section)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('version', { ascending: false })
    .limit(1);

  if (error) throw error;
  return (data && data[0]) ?? null;
}

/**
 * Inject payload into the legacy UI bridge.
 * Legacy code can receive it immediately through an event listener:
 * window.addEventListener('toefl:payload', (e) => {
 *   const { section, set_id, payload } = (e as CustomEvent).detail;
 *   ...
 * });
 *
 * If needed, you can also expose a custom entry like
 * window.YourInitFn?.(payload).
 */
export function injectLegacyPayload(row: SetRow) {
  (window as any).__LEGACY_SET__ = row;

  window.dispatchEvent(
    new CustomEvent('toefl:payload', {
      detail: {
        section: row.section,
        set_id: row.set_id,
        version: row.version,
        payload: row.payload_json,
      },
    })
  );

  // If legacy init entry points still exist, uncomment and call them here.
  // if (row.section === 'reading') (window as any).initReadingStudy?.(row.payload_json);
  // if (row.section === 'listening') (window as any).initListeningStudy?.(row.payload_json);
}
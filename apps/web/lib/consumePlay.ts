// apps/web/lib/consumePlay.ts

/** Listening session modes:
 * p = practice, t = test, r = review
 */
export type Mode = 'p' | 't' | 'r';

type Params = { sessionId: string; trackId?: string; mode: Mode };
type Resp = { remaining: number };

/**
 * Consume one play for the current session/track and return remaining plays.
 * Falls back to { remaining: 0 } on failure.
 */
export async function consumePlay({ sessionId, trackId, mode }: Params): Promise<Resp> {
  try {
    const res = await fetch('/api/listening/consume-play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // trackId optional — server should infer current track if omitted
      body: JSON.stringify({ sessionId, trackId, mode }),
      cache: 'no-store',
      credentials: 'same-origin',
    });

    if (!res.ok) {
      // bubble up server error text for easier debugging in UI
      const msg = await res.text().catch(() => `HTTP ${res.status}`);
      throw new Error(msg);
    }

    const json = (await res.json()) as Partial<Resp>;
    return { remaining: Number(json.remaining ?? 0) };
  } catch (e) {
    // Soft-fail: log in dev, return 0 so UI can decide what to do
    if (process.env.NODE_ENV !== 'production') {
      console.warn('consumePlay failed:', e);
    }
    return { remaining: 0 };
  }
}

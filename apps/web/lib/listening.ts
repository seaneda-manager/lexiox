// apps/web/lib/listening.ts

export type Mode = 'study' | 'test'

export type StartRes =
  | { ok: true; id: string }
  | { ok: false; error: string; detail?: string }

export type ConsumeRes =
  | { ok: true; session: { id: string; consumed_at: string } }
  | { ok: false; error: string; detail?: string }

export type StatusRes =
  | {
      ok: true
      session: {
        id: string
        track_id: string
        mode: Mode
        created_at: string
        consumed_at: string | null
      }
    }
  | { ok: false; error: string; detail?: string }

/** Shared fetch helper (simple version) */
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  // Server routes are expected to return JSON consistently.
  return (await res.json()) as T
}

/** Create a session */
export async function startSession(trackId: string, mode: Mode): Promise<StartRes> {
  return api<StartRes>('/api/listening/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trackId, mode }),
  })
}

/** Consume the first playback once. Server-side logic should be idempotent. */
export async function consumeOnce(sessionId: string): Promise<ConsumeRes> {
  const qs = encodeURIComponent(sessionId)
  return api<ConsumeRes>(`/api/listening/consume?sessionId=${qs}`, { method: 'POST' })
}

/** Get current session status */
export async function getStatus(sessionId: string): Promise<StatusRes> {
  const qs = encodeURIComponent(sessionId)
  return api<StatusRes>(`/api/listening/status?sessionId=${qs}`)
}
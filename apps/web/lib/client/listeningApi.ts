export async function startListeningSessionClient(params: { setId: string; mode: 'p'|'t'|'r' }) {
  const res = await fetch('/api/listening/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ sessionId: string }>;
}

export async function submitListeningAnswerClient(params: { sessionId: string; questionId: string; choiceId?: string }) {
  const res = await fetch('/api/listening/answer', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: true }>;
}

export async function finishListeningSessionClient(params: { sessionId: string }) {
  const res = await fetch('/api/listening/finish', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: true }>;
}





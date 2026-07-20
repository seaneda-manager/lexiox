'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

/* =========================
 * Types
 * ========================= */
type Choice = { id: string; text: string; is_correct: boolean };
type Question = {
  id: string;
  number: number;
  type:
    | 'vocab' | 'detail' | 'negative_detail' | 'paraphrasing'
    | 'insertion' | 'inference' | 'purpose' | 'pronoun_ref'
    | 'summary' | 'organization';
  stem: string;
  explanation?: string | null;
  clue_quote?: string | null;
  choices: Choice[];
};
type Passage = {
  id: string;
  set_id: string | null;
  title: string;
  content: string; // HTML
  questions: Question[];
  stats?: { answers: number };
};

/* =========================
 * Helpers
 * ========================= */
const safeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const res = await fetch(input, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...init,
  });
  if (res.status === 401) {
    location.href = '/login';
    throw new Error('unauthorized');
  }
  if (res.status === 403) {
    location.href = '/home/student';
    throw new Error('forbidden');
  }
  return res;
};

/* =========================
 * Component
 * ========================= */
export default function ContentListClient() {
  const [items, setItems] = useState<Passage[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // entity id

  const hasItems = useMemo(() => (items?.length ?? 0) > 0, [items]);

  /* ---------- Data Load ---------- */
  const load = useCallback(async (query?: string, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const url = query
        ? `/api/admin/reading/list?q=${encodeURIComponent(query)}`
        : '/api/admin/reading/list';
      const res = await safeFetch(url, { signal });
      const json = (await res.json()) as { items: Passage[] };
      setItems(json.items ?? []);
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError(e?.message ?? 'failed to load');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void load(undefined, ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------- Save/Delete handlers ---------- */
  const savePassage = async (p: Passage) => {
    setBusy(p.id);
    setToast(null);
    setError(null);
    try {
      const res = await safeFetch('/api/admin/reading/passage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: p.id,
          title: p.title,
          content: p.content,
          set_id: p.set_id ?? null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setToast('지문이 저장되었습니다.');
      await load(q);
    } catch (e: any) {
      setError(e?.message ?? 'save failed');
    } finally {
      setBusy(null);
    }
  };

  const deletePassage = async (id: string) => {
    if (!confirm('해당 지문을 삭제할까요? (되돌릴 수 없습니다. 백업이 없다면 복구가 불가합니다)')) return;
    setBusy(id);
    setToast(null);
    setError(null);
    try {
      const res = await safeFetch('/api/admin/reading/passage', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());
      setToast('지문이 삭제(또는 보관 처리)되었습니다.');
      await load(q);
    } catch (e: any) {
      setError(e?.message ?? 'delete failed');
    } finally {
      setBusy(null);
    }
  };

  const saveQuestion = async (qitem: Question) => {
    setBusy(qitem.id);
    setToast(null);
    setError(null);
    try {
      const res = await safeFetch('/api/admin/reading/question', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(qitem),
      });
      if (res.status === 409) {
        setError('답안이 있어 삭제/변경이 제한됩니다.');
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      setToast(`Q${qitem.number} 저장 완료`);
      await load(q);
    } catch (e: any) {
      setError(e?.message ?? 'save failed');
    } finally {
      setBusy(null);
    }
  };

  const deleteQuestion = async (qid: string) => {
    if (!confirm('해당 문제를 삭제할까요? (되돌릴 수 없습니다)')) return;
    setBusy(qid);
    setToast(null);
    setError(null);
    try {
      const res = await safeFetch('/api/admin/reading/question', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: qid }),
      });
      if (res.status === 409) {
        setError('답안이 있어 문제 삭제가 불가합니다.');
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      setToast('문제 삭제 완료');
      await load(q);
    } catch (e: any) {
      setError(e?.message ?? 'delete failed');
    } finally {
      setBusy(null);
    }
  };

  const saveChoice = async (qid: string, c: Choice) => {
    setBusy(c.id);
    setToast(null);
    setError(null);
    try {
      // 서버 정책: is_correct === true면 해당 question의 다른 보기 is_correct=false로 reset
      const res = await safeFetch('/api/admin/reading/choice', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...c, question_id: qid }),
      });
      if (!res.ok) throw new Error(await res.text());
      setToast('보기 저장 완료');
      await load(q);
    } catch (e: any) {
      setError(e?.message ?? 'save failed');
    } finally {
      setBusy(null);
    }
  };

  const deleteChoice = async (cid: string) => {
    if (!confirm('해당 보기를 삭제할까요?')) return;
    setBusy(cid);
    setToast(null);
    setError(null);
    try {
      const res = await safeFetch('/api/admin/reading/choice', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cid }),
      });
      if (!res.ok) throw new Error(await res.text());
      setToast('보기 삭제 완료');
      await load(q);
    } catch (e: any) {
      setError(e?.message ?? 'delete failed');
    } finally {
      setBusy(null);
    }
  };

  /* ---------- Render ---------- */
  return (
    <div className="space-y-4">
      {/* 검색바 */}
      <div className="flex gap-2">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="제목/본문 검색어"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void load(q); }}
        />
        <button className="border rounded px-4 py-2" onClick={() => void load(q)}>
          검색
        </button>
      </div>

      {/* 상태 메시지 */}
      {toast && <div className="text-green-600 text-sm">{toast}</div>}
      {error && <div className="text-red-600 text-sm">{error}</div>}

      {/* 리스트 */}
      {loading ? (
        <div>Loading...</div>
      ) : !hasItems ? (
        <div>검색 결과가 없습니다</div>
      ) : (
        <div className="space-y-6">
          {items.map((p) => (
            <div key={p.id} className="border rounded p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-500">
                  set: <b>{p.set_id ?? '-'}</b> · passageId: {p.id} · answers: {p.stats?.answers ?? 0}
                </div>
                <div className="flex gap-2">
                  {/* 시험보기 바로가기 */}
                  <a
                    className="border rounded px-3 py-1"
                    href={`/reading/test?passageId=${p.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    시험보기
                  </a>
                  <button
                    className="border rounded px-3 py-1"
                    onClick={() => void savePassage(p)}
                    disabled={busy === p.id}
                  >
                    {busy === p.id ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    className="border rounded px-3 py-1"
                    onClick={() => void deletePassage(p.id)}
                    disabled={busy === p.id}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                <input
                  className="border rounded px-3 py-2"
                  value={p.title}
                  onChange={(e) =>
                    setItems((arr) =>
                      arr.map((x) => (x.id === p.id ? { ...x, title: e.target.value } : x)),
                    )
                  }
                />
                <textarea
                  className="border rounded px-3 py-2 min-h-[300px]"
                  rows={14}
                  value={p.content}
                  onChange={(e) =>
                    setItems((arr) =>
                      arr.map((x) => (x.id === p.id ? { ...x, content: e.target.value } : x)),
                    )
                  }
                  placeholder="HTML content"
                />
              </div>

              <div className="mt-4 space-y-4">
                {p.questions.map((qn) => (
                  <div key={qn.id} className="rounded border p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">Q{qn.number} · {qn.type}</div>
                      <div className="flex gap-2">
                        <button
                          className="border rounded px-3 py-1"
                          onClick={() => void saveQuestion(qn)}
                          disabled={busy === qn.id}
                        >
                          {busy === qn.id ? 'Saving...' : 'Save Q'}
                        </button>
                        <button
                          className="border rounded px-3 py-1"
                          onClick={() => void deleteQuestion(qn.id)}
                          disabled={busy === qn.id}
                        >
                          Delete Q
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-2 mt-2">
                      <div className="flex gap-2">
                        <input
                          className="border rounded px-2 py-1 w-24"
                          type="number"
                          min={1}
                          value={qn.number}
                          onChange={(e) =>
                            setItems((arr) =>
                              arr.map((x) =>
                                x.id !== p.id
                                  ? x
                                  : {
                                      ...x,
                                      questions: x.questions.map((qq) =>
                                        qq.id === qn.id ? { ...qq, number: Number(e.target.value) } : qq,
                                      ),
                                    },
                              ),
                            )
                          }
                        />
                        <select
                          className="border rounded px-2 py-1"
                          value={qn.type}
                          onChange={(e) =>
                            setItems((arr) =>
                              arr.map((x) =>
                                x.id !== p.id
                                  ? x
                                  : {
                                      ...x,
                                      questions: x.questions.map((qq) =>
                                        qq.id === qn.id ? { ...qq, type: e.target.value as Question['type'] } : qq,
                                      ),
                                    },
                              ),
                            )
                          }
                        >
                          {[
                            'vocab',
                            'detail',
                            'negative_detail',
                            'paraphrasing',
                            'insertion',
                            'inference',
                            'purpose',
                            'pronoun_ref',
                            'summary',
                            'organization',
                          ].map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <textarea
                        className="border rounded px-2 py-1"
                        value={qn.stem}
                        onChange={(e) =>
                          setItems((arr) =>
                            arr.map((x) =>
                              x.id !== p.id
                                ? x
                                : {
                                    ...x,
                                    questions: x.questions.map((qq) =>
                                      qq.id === qn.id ? { ...qq, stem: e.target.value } : qq,
                                    ),
                                  },
                            ),
                          )
                        }
                        placeholder="stem"
                      />
                      <input
                        className="border rounded px-2 py-1"
                        value={qn.explanation ?? ''}
                        onChange={(e) =>
                          setItems((arr) =>
                            arr.map((x) =>
                              x.id !== p.id
                                ? x
                                : {
                                    ...x,
                                    questions: x.questions.map((qq) =>
                                      qq.id === qn.id ? { ...qq, explanation: e.target.value } : qq,
                                    ),
                                  },
                            ),
                          )
                        }
                        placeholder="explanation"
                      />
                      <input
                        className="border rounded px-2 py-1"
                        value={qn.clue_quote ?? ''}
                        onChange={(e) =>
                          setItems((arr) =>
                            arr.map((x) =>
                              x.id !== p.id
                                ? x
                                : {
                                    ...x,
                                    questions: x.questions.map((qq) =>
                                      qq.id === qn.id ? { ...qq, clue_quote: e.target.value } : qq,
                                    ),
                                  },
                            ),
                          )
                        }
                        placeholder="clue_quote"
                      />

                      <div className="space-y-2">
                        {qn.choices.map((ch) => (
                          <div key={ch.id} className="flex items-center gap-2">
                            <input
                              className="border rounded px-2 py-1 flex-1"
                              value={ch.text}
                              onChange={(e) =>
                                setItems((arr) =>
                                  arr.map((x) =>
                                    x.id !== p.id
                                      ? x
                                      : {
                                          ...x,
                                          questions: x.questions.map((qq) =>
                                            qq.id !== qn.id
                                              ? qq
                                              : {
                                                  ...qq,
                                                  choices: qq.choices.map((cc) =>
                                                    cc.id === ch.id ? { ...cc, text: e.target.value } : cc,
                                                  ),
                                                },
                                          ),
                                        },
                                  ),
                                )
                              }
                            />
                            <label className="flex items-center gap-1 text-xs">
                              <input
                                type="checkbox"
                                checked={!!ch.is_correct}
                                onChange={(e) =>
                                  setItems((arr) =>
                                    arr.map((x) =>
                                      x.id !== p.id
                                        ? x
                                        : {
                                            ...x,
                                            questions: x.questions.map((qq) =>
                                              qq.id !== qn.id
                                                ? qq
                                                : {
                                                    ...qq,
                                                    choices: qq.choices.map((cc) =>
                                                      // UI에서도 "정답 1개" 정책 반영
                                                      cc.id === ch.id
                                                        ? { ...cc, is_correct: e.target.checked }
                                                        : e.target.checked
                                                        ? { ...cc, is_correct: false }
                                                        : cc,
                                                    ),
                                                  },
                                            ),
                                          },
                                    ),
                                  )
                                }
                              />
                              correct
                            </label>
                            <button
                              className="border rounded px-2 py-1"
                              onClick={() => void saveChoice(qn.id, ch)}
                              disabled={busy === ch.id}
                            >
                              Save
                            </button>
                            <button
                              className="border rounded px-2 py-1"
                              onClick={() => void deleteChoice(ch.id)}
                              disabled={busy === ch.id}
                            >
                              Del
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

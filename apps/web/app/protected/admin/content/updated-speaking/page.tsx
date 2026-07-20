"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlusCircle, Eye } from "lucide-react";
import type { SpeakingTest2026 } from "@/models/speaking-2026";

type Row = {
  id: string;
  label: string;
  is_locked: boolean | null;
  updated_at: string | null;
  payload: SpeakingTest2026;
};

function fmt(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function PreviewModal({
  test,
  onClose,
}: {
  test: Row | null;
  onClose: () => void;
}) {
  if (!test) return null;

  const listenRepeat = test.payload.tasks.find((t) => t.type === "listen_repeat") as any;
  const interview = test.payload.tasks.find((t) => t.type === "interview") as any;

  const isAssetComplete = listenRepeat?.imageUrl && listenRepeat?.situationDescription;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{test.label}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {isAssetComplete ? (
          <div className="space-y-6">
            {listenRepeat?.imageUrl && (
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-700">상황</h3>
                <p className="text-sm text-slate-600">{listenRepeat.situationDescription}</p>
                <img
                  src={listenRepeat.imageUrl}
                  alt="Site map"
                  className="max-w-full rounded-lg border"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {listenRepeat && (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-700">Task 1: 듣고 따라말하기</h3>
                <p className="text-sm text-slate-600">상황: {listenRepeat.situation}</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">7개 문장</p>
                    <button
                      onClick={() => {
                        const text = listenRepeat.sentences
                          .map((s: any) => s.text)
                          .join("\n");
                        navigator.clipboard.writeText(text);
                        alert("복사되었습니다");
                      }}
                      className="rounded bg-slate-600 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-700"
                    >
                      모두 복사
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {listenRepeat.sentences.map((s: any, i: number) => (
                      <p key={s.id} className="text-xs leading-relaxed text-slate-700">
                        <span className="font-semibold text-slate-500">{i + 1}.</span> {s.text}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {interview && (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-700">Task 2: 인터뷰</h3>
                <div className="space-y-2">
                  {interview.questions.map((q: any, i: number) => (
                    <div key={q.id} className="text-xs text-slate-700">
                      <span className="font-semibold text-slate-500">Q{i + 1}:</span> {q.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SpeakingAdminListPage() {
  const [tests, setTests] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewTest, setPreviewTest] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/updated-speaking/list");
        const data = await res.json();
        if (data.ok) {
          setTests(data.tests);
        } else {
          setError(data.error);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size}개 항목을 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch("/api/admin/updated-speaking/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (data.ok) {
        setTests(tests.filter((t) => !selected.has(t.id)));
        setSelected(new Set());
      } else {
        alert("삭제 실패: " + data.error);
      }
    } catch (e: any) {
      alert("삭제 실패: " + e.message);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (selected.size === tests.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(tests.map((t) => t.id)));
    }
  };

  const handleToggleLock = async (id: string) => {
    const test = tests.find((t) => t.id === id);
    if (!test) return;

    setUnlocking(id);
    try {
      const endpoint = test.is_locked ? '/api/admin/updated-speaking/unlock' : '/api/admin/updated-speaking/lock';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.ok) {
        setTests(tests.map((t) => (t.id === id ? { ...t, is_locked: !t.is_locked } : t)));
      } else {
        alert('실패: ' + data.error);
      }
    } catch (e: any) {
      alert('실패: ' + e.message);
    } finally {
      setUnlocking(null);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6">
        <p className="text-sm text-slate-500">로딩 중…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Updated Speaking – 시험 관리</h1>
          {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/content/updated-speaking/assign"
            className="inline-flex items-center gap-1.5 rounded-lg border border-orange-400 px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50"
          >
            시험 배정
          </Link>
          <Link
            href="/admin/content/updated-speaking/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-orange-600"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            새 시험 만들기
          </Link>
        </div>
      </header>

      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
          <p className="text-xs font-medium text-orange-700">{selected.size}개 선택됨</p>
          <button
            onClick={handleDelete}
            className="rounded bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
          >
            없애기
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="hidden border-b bg-gray-50 px-4 py-2 text-[11px] font-medium text-gray-500 md:grid md:grid-cols-4 gap-4">
          <div className="w-10 flex items-center">
            <input
              type="checkbox"
              checked={tests.length > 0 && selected.size === tests.length}
              onChange={toggleSelectAll}
              className="h-4 w-4"
            />
          </div>
          <div>Label</div>
          <div>Updated</div>
          <div className="text-right">상태</div>
        </div>
        {tests.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-500">
            아직 시험이 없습니다.{" "}
            <Link href="/admin/content/updated-speaking/new" className="text-orange-500 underline">
              새로 만들기
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {tests.map((t, i) => (
              <div key={t.id} className="px-4 py-3 text-xs hover:bg-orange-50/30 md:grid md:grid-cols-4 gap-4 md:items-center">
                <div className="w-10 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.has(t.id)}
                    onChange={() => toggleSelect(t.id)}
                    className="h-4 w-4"
                  />
                  <span className="text-gray-400 font-medium text-[11px]">{i + 1}</span>
                </div>
                <div className="font-semibold text-gray-900">{t.label}</div>
                <div className="text-gray-500">{fmt(t.updated_at)}</div>
                <div className="flex items-center justify-end gap-1.5">
                  {t.is_locked && (
                    <button
                      onClick={() => handleToggleLock(t.id)}
                      disabled={unlocking === t.id}
                      className="rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-gray-700 disabled:opacity-50 cursor-pointer transition whitespace-nowrap leading-tight"
                    >
                      🔒 Unlock
                    </button>
                  )}
                  <button
                    onClick={() => setPreviewTest(t)}
                    className="rounded-lg border px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-orange-50 h-7 flex items-center gap-1 whitespace-nowrap"
                  >
                    <Eye className="h-3.5 w-3.5 flex-shrink-0" />
                    미리보기
                  </button>
                  <Link
                    href={`/admin/content/updated-speaking/${t.id}/edit`}
                    className="rounded-lg border px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-orange-50 h-7 flex items-center justify-center whitespace-nowrap"
                  >
                    에셋 편집
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PreviewModal test={previewTest} onClose={() => setPreviewTest(null)} />
    </main>
  );
}

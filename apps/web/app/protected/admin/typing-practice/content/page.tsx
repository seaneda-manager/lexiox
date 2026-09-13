"use client";

import { useEffect, useState } from "react";
import {
  listContentAction,
  createContentAction,
  deleteContentAction,
  listReadingPassagesAction,
  listListeningTracksAction,
  importReadingPassageAction,
  importListeningTrackAction,
} from "./actions";

type ContentRow = {
  id: string;
  title: string;
  source_type: "manual" | "reading_passage" | "listening_transcript";
  body_en: string;
  body_ko: string | null;
  tags: string[];
  difficulty: string | null;
  created_at: string;
};

const SOURCE_LABEL: Record<ContentRow["source_type"], string> = {
  manual: "직접 입력",
  reading_passage: "Reading 지문",
  listening_transcript: "Listening 스크립트",
};

export default function TypingPracticeContentAdminPage() {
  const [items, setItems] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [bodyKo, setBodyKo] = useState("");

  const [passages, setPassages] = useState<{ id: string; title: string }[]>([]);
  const [tracks, setTracks] = useState<{ id: string; title: string }[]>([]);
  const [selectedPassage, setSelectedPassage] = useState("");
  const [selectedTrack, setSelectedTrack] = useState("");

  const refresh = async () => {
    setLoading(true);
    const res = await listContentAction();
    if (res.ok) setItems(res.items ?? []);
    else setError(res.error ?? "목록을 불러오지 못했습니다.");
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    listReadingPassagesAction().then((res) => {
      if (res.ok) setPassages((res.items ?? []).map((p) => ({ id: p.id, title: p.title })));
    });
    listListeningTracksAction().then((res) => {
      if (res.ok) setTracks((res.items ?? []).map((t) => ({ id: t.id, title: t.title })));
    });
  }, []);

  const handleCreate = async () => {
    setError(null);
    setBusy(true);
    const res = await createContentAction({
      source_type: "manual",
      title,
      body_en: bodyEn,
      body_ko: bodyKo || null,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "저장 실패");
      return;
    }
    setTitle("");
    setBodyEn("");
    setBodyKo("");
    refresh();
  };

  const handleImportPassage = async () => {
    if (!selectedPassage) return;
    setBusy(true);
    const res = await importReadingPassageAction(selectedPassage);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "가져오기 실패");
    else refresh();
  };

  const handleImportTrack = async () => {
    if (!selectedTrack) return;
    setBusy(true);
    const res = await importListeningTrackAction(selectedTrack);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "가져오기 실패");
    else refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 콘텐츠를 삭제할까요?")) return;
    setBusy(true);
    const res = await deleteContentAction(id);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "삭제 실패");
    else refresh();
  };

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold">타자 암기 콘텐츠 관리</h1>
        <p className="text-sm text-gray-600 mt-1">
          LXGym "타자 암기 스피드 훈련"에서 학생이 타이핑할 Speaking script / Writing 모범답안 / Reading·Listening 지문을 등록합니다.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <section className="rounded-lg border bg-white p-4 space-y-3">
        <h2 className="font-semibold text-gray-800">직접 입력 (Speaking script / Writing 모범답안 등)</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목 (예: Speaking Task 2 모범답안 - 학교 관련)"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <textarea
          value={bodyEn}
          onChange={(e) => setBodyEn(e.target.value)}
          placeholder="영문 본문 (문장 단위로 타이핑 대상이 됩니다)"
          rows={5}
          className="w-full rounded-md border px-3 py-2 text-sm font-mono"
        />
        <textarea
          value={bodyKo}
          onChange={(e) => setBodyKo(e.target.value)}
          placeholder="한글 번역 (선택 — '한글만 보고 암기' 모드에서 사용, 줄 단위로 영문 문장과 매칭됩니다)"
          rows={3}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <button
          onClick={handleCreate}
          disabled={busy || !title || !bodyEn}
          className="rounded-md bg-black px-3 py-2 text-sm text-white hover:opacity-90 disabled:opacity-40"
        >
          + 저장
        </button>
      </section>

      <section className="rounded-lg border bg-white p-4 space-y-3">
        <h2 className="font-semibold text-gray-800">기존 Reading/Listening 지문에서 가져오기</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <select value={selectedPassage} onChange={(e) => setSelectedPassage(e.target.value)} className="flex-1 rounded-md border px-3 py-2 text-sm">
            <option value="">Reading 지문 선택</option>
            {passages.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          <button onClick={handleImportPassage} disabled={busy || !selectedPassage} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-40">
            가져오기
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select value={selectedTrack} onChange={(e) => setSelectedTrack(e.target.value)} className="flex-1 rounded-md border px-3 py-2 text-sm">
            <option value="">Listening 스크립트 선택</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <button onClick={handleImportTrack} disabled={busy || !selectedTrack} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-40">
            가져오기
          </button>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold text-gray-800 mb-3">등록된 콘텐츠 ({items.length})</h2>
        {loading ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500">등록된 콘텐츠가 없습니다.</p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{item.title}</p>
                  <p className="text-xs text-gray-500">
                    {SOURCE_LABEL[item.source_type]} · {item.body_en.length}자
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={busy}
                  className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-40"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

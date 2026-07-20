"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { saveGrammarChapterAction } from "../actions";

export default function GrammarEditorClient() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [level, setLevel] = useState<"middle" | "high">("middle");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력하세요");
      return;
    }

    setSaving(true);
    const result = await saveGrammarChapterAction({ title, content, level });

    if (result.ok) {
      alert("단원이 저장되었습니다");
      router.push("/admin/jr/content/grammar");
    } else {
      alert("저장 실패: " + result.error);
    }
    setSaving(false);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b bg-white p-4">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="text-3xl font-bold text-slate-900">새 Grammar 단원</h1>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="문법 단원 제목"
              className="w-full rounded-lg border border-slate-300 px-4 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              레벨
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2"
            >
              <option value="middle">중학</option>
              <option value="high">고등</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="개념 설명을 입력하세요"
              className="w-full rounded-lg border border-slate-300 px-4 py-2"
              rows={15}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 disabled:bg-slate-300"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
            <button
              onClick={() => router.back()}
              className="flex-1 rounded-lg border border-slate-300 px-6 py-3 text-slate-900 font-semibold hover:bg-slate-50"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { saveReadingPassageAction, updateReadingPassageAction } from "../actions";

type Props = {
  initialPassage?: any;
};

export default function ReadingEditorClient({ initialPassage }: Props) {
  const router = useRouter();
  const isEditing = !!initialPassage;
  const [title, setTitle] = useState(initialPassage?.title || "");
  const [content, setContent] = useState(initialPassage?.content || "");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    initialPassage?.difficulty || "medium"
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 지문을 입력하세요");
      return;
    }

    setSaving(true);
    let result;

    if (isEditing) {
      result = await updateReadingPassageAction({
        id: initialPassage.id,
        title,
        content,
        difficulty,
      });
    } else {
      result = await saveReadingPassageAction({
        title,
        content,
        difficulty,
      });
    }

    if (result.ok) {
      alert(`지문이 ${isEditing ? "수정" : "저장"}되었습니다`);
      router.push("/admin/jr/content/reading");
    } else {
      alert(`${isEditing ? "수정" : "저장"} 실패: ` + result.error);
    }
    setSaving(false);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b bg-white p-4">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="text-3xl font-bold text-slate-900">
            {isEditing ? "Reading 지문 편집" : "새 Reading 지문"}
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="지문 제목을 입력하세요"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm"
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              난이도
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm"
            >
              <option value="easy">쉬움</option>
              <option value="medium">중간</option>
              <option value="hard">어려움</option>
            </select>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              지문 내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="지문을 입력하세요"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-mono"
              rows={15}
            />
            <p className="text-xs text-slate-500 mt-2">
              {content.length} / 5000 자
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-lg bg-emerald-600 px-6 py-3 text-white font-semibold hover:bg-emerald-700 disabled:bg-slate-300"
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

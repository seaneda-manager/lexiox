"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const SKILLS = [
  { key: "reading",   label: "Reading" },
  { key: "listening", label: "Listening" },
  { key: "speaking",  label: "Speaking" },
  { key: "writing",   label: "Writing" },
];

const FOCUS_TYPES: Record<string, string[]> = {
  reading: [
    "main_idea", "detail", "negative_detail", "vocab", "inference",
    "rhetorical_purpose", "insertion", "summary", "paraphrasing",
  ],
  listening: [
    "main_idea", "detail", "function", "attitude", "inference",
    "organization", "connecting_content",
  ],
  speaking: [
    "independent", "integrated_read_listen", "integrated_listen",
  ],
  writing: [
    "integrated", "academic_discussion", "independent",
  ],
};

export default function NewChapterPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [skill, setSkill] = useState(params.get("skill") ?? "reading");
  const [orderNum, setOrderNum] = useState("");
  const [title, setTitle] = useState("");
  const [focusType, setFocusType] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const focusOptions = FOCUS_TYPES[skill] ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/toefl/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill,
          order_num: parseInt(orderNum),
          title,
          focus_type: focusType || null,
          description: description || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { id } = await res.json();
      router.push(`/admin/toefl/curriculum/${id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl space-y-6 px-6 py-8">
      <header className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-neutral-400">Admin / TOEFL / 새 챕터</div>
        <h1 className="text-2xl font-semibold">챕터 추가</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 스킬 */}
        <div>
          <label className="block text-sm font-medium mb-1">스킬</label>
          <div className="flex gap-2 flex-wrap">
            {SKILLS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => { setSkill(s.key); setFocusType(""); }}
                className={[
                  "rounded-lg border px-4 py-2 text-sm font-medium transition",
                  skill === s.key
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 hover:bg-neutral-50",
                ].join(" ")}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 순서 */}
        <div>
          <label className="block text-sm font-medium mb-1">챕터 번호</label>
          <input
            type="number"
            min={1}
            required
            value={orderNum}
            onChange={(e) => setOrderNum(e.target.value)}
            placeholder="1"
            className="w-24 rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium mb-1">챕터명</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Main Idea"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        {/* Focus Type */}
        <div>
          <label className="block text-sm font-medium mb-1">문제 유형 (Focus)</label>
          <select
            value={focusType}
            onChange={(e) => setFocusType(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            <option value="">선택 안 함</option>
            {focusOptions.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-sm font-medium mb-1">설명 (선택)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="이 챕터에서 다루는 내용..."
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? "저장 중..." : "챕터 생성"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-neutral-200 px-6 py-2.5 text-sm hover:bg-neutral-50"
          >
            취소
          </button>
        </div>
      </form>
    </main>
  );
}

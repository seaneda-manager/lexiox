"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { use } from "react";

const CONTENT_TYPES = [
  { key: "lecture",  label: "강좌",      emoji: "🎬", desc: "YouTube 강의 또는 설명 영상" },
  { key: "practice", label: "Practice", emoji: "✏️",  desc: "짧은 지문 + 문제 (연습용)" },
  { key: "test",     label: "Test",     emoji: "📋", desc: "챕터 미니 테스트" },
  { key: "drill",    label: "Drill",    emoji: "🎯", desc: "Sniper / Speed / Evidence Hunt" },
];

const REF_TABLES: Record<string, { label: string; placeholder: string }[]> = {
  lecture:  [{ label: "lectures", placeholder: "lectures 테이블 UUID" }],
  practice: [
    { label: "reading_tests_2026", placeholder: "reading_tests_2026 UUID" },
    { label: "updated_listening_sets", placeholder: "updated_listening_sets UUID" },
    { label: "speaking_2026_items", placeholder: "speaking_2026_items UUID" },
    { label: "writing_2026_prompts", placeholder: "writing_2026_prompts UUID" },
  ],
  test: [
    { label: "reading_tests_2026", placeholder: "reading_tests_2026 UUID" },
    { label: "generated_exams", placeholder: "generated_exams UUID" },
  ],
  drill: [{ label: "toefl_drills", placeholder: "toefl_drills UUID (추후)" }],
};

export default function NewContentPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [level, setLevel] = useState(searchParams.get("level") ?? "basic");
  const [contentType, setContentType] = useState("lecture");
  const [title, setTitle] = useState("");
  const [refTable, setRefTable] = useState("");
  const [refId, setRefId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const levelLabel: Record<string, string> = { basic: "기본", intermediate: "중급", advanced: "고급" };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/toefl/chapters/${chapterId}/content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          content_type: contentType,
          title: title || null,
          content_ref_table: refTable || null,
          content_ref_id: refId || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push(`/admin/toefl/curriculum/${chapterId}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl space-y-6 px-6 py-8">
      <header className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-neutral-400">
          콘텐츠 추가
        </div>
        <h1 className="text-2xl font-semibold">챕터 콘텐츠 추가</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 레벨 */}
        <div>
          <label className="block text-sm font-medium mb-1">레벨</label>
          <div className="flex gap-2">
            {["basic", "intermediate", "advanced"].map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => setLevel(lv)}
                className={[
                  "rounded-lg border px-4 py-2 text-sm transition",
                  level === lv
                    ? "border-neutral-900 bg-neutral-900 text-white font-medium"
                    : "border-neutral-200 hover:bg-neutral-50",
                ].join(" ")}
              >
                {levelLabel[lv]}
              </button>
            ))}
          </div>
        </div>

        {/* 콘텐츠 타입 */}
        <div>
          <label className="block text-sm font-medium mb-1">콘텐츠 유형</label>
          <div className="grid grid-cols-2 gap-2">
            {CONTENT_TYPES.map((ct) => (
              <button
                key={ct.key}
                type="button"
                onClick={() => { setContentType(ct.key); setRefTable(""); setRefId(""); }}
                className={[
                  "rounded-xl border p-3 text-left transition",
                  contentType === ct.key
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 hover:bg-neutral-50",
                ].join(" ")}
              >
                <p className="text-base">{ct.emoji}</p>
                <p className="text-sm font-medium mt-1">{ct.label}</p>
                <p className={`text-xs mt-0.5 ${contentType === ct.key ? "text-neutral-300" : "text-neutral-400"}`}>
                  {ct.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium mb-1">제목 (선택)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${levelLabel[level]} ${CONTENT_TYPES.find((c) => c.key === contentType)?.label}`}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        {/* 연결 콘텐츠 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">연결할 콘텐츠 (선택)</label>
          <select
            value={refTable}
            onChange={(e) => setRefTable(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            <option value="">테이블 선택 안 함</option>
            {(REF_TABLES[contentType] ?? []).map((t) => (
              <option key={t.label} value={t.label}>{t.label}</option>
            ))}
          </select>
          {refTable && (
            <input
              type="text"
              value={refId}
              onChange={(e) => setRefId(e.target.value)}
              placeholder="UUID"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          )}
        </div>

        {/* 메모 */}
        <div>
          <label className="block text-sm font-medium mb-1">메모 (선택)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="예: 기본 지문 3개, main idea 집중"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? "저장 중..." : "추가"}
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

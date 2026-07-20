"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GrammarLevel } from "@/models/grammar/types";

const LEVELS: { value: GrammarLevel; label: string }[] = [
  { value: "all", label: "전체 (All)" },
  { value: "ms", label: "중등 (MS)" },
  { value: "hs", label: "고등 (HS)" },
  { value: "toefl", label: "TOEFL" },
];

export default function NewUnitClient() {
  const router = useRouter();
  const [form, setForm] = useState({
    id: "",
    label_ko: "",
    label_en: "",
    description: "",
    level: "all" as GrammarLevel,
    order_index: 1,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.id || !form.label_ko || !form.label_en) {
      setError("ID, 한국어 이름, 영어 이름은 필수입니다.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/grammar-2026/unit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push(`/admin/content/grammar-2026/${form.id}`);
    } catch (e: any) {
      setError(e.message ?? "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Field label="유닛 ID (slug)" required>
        <input
          value={form.id}
          onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
          placeholder="noun-pronoun-agreement"
          className="input"
        />
        <p className="text-[11px] text-gray-400 mt-1">소문자 + 하이픈만 사용. 생성 후 변경 불가.</p>
      </Field>

      <Field label="한국어 이름" required>
        <input
          value={form.label_ko}
          onChange={(e) => setForm({ ...form, label_ko: e.target.value })}
          placeholder="명사-대명사 수일치"
          className="input"
        />
      </Field>

      <Field label="영어 이름" required>
        <input
          value={form.label_en}
          onChange={(e) => setForm({ ...form, label_en: e.target.value })}
          placeholder="Noun-Pronoun Agreement"
          className="input"
        />
      </Field>

      <Field label="설명 (선택)">
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="이 챕터에서 다루는 내용..."
          rows={2}
          className="input resize-none"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="레벨">
          <select
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value as GrammarLevel })}
            className="input"
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </Field>

        <Field label="순서">
          <input
            type="number"
            value={form.order_index}
            onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })}
            min={1}
            className="input"
          />
        </Field>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition"
      >
        {saving ? "저장 중..." : "유닛 생성 →"}
      </button>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .input:focus {
          border-color: #818cf8;
          box-shadow: 0 0 0 2px rgba(129,140,248,0.2);
        }
      `}</style>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

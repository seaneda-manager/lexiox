// File: apps/web/components/admin/reading/ChoiceEditor.tsx
"use client";

import { useCallback, useMemo, useState } from "react";

export type Choice = {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
};

type Props = {
  questionId: string;
  initialChoices: Choice[];
  onChange?: (choices: Choice[]) => void;
};

const MAX_CHOICES = 6;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = "Request failed";
    try {
      const j = await res.json();
      msg = (j?.error as string) || msg;
    } catch {}
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export default function ChoiceEditor({
  questionId,
  initialChoices,
  onChange,
}: Props) {
  const [items, setItems] = useState<Choice[]>([...initialChoices]);
  const [busy, setBusy] = useState(false);
  const canAdd = items.length < MAX_CHOICES && !busy;

  const sorted = useMemo(() => {
    // Optional: keep correct on top? For now keep order as-is.
    return items;
  }, [items]);

  const emit = useCallback(
    (next: Choice[]) => {
      setItems(next);
      onChange?.(next);
    },
    [onChange]
  );

  const addOne = useCallback(async () => {
    if (!canAdd) return;
    setBusy(true);
    try {
      const body = {
        question_id: questionId,
        text: "New choice",
        is_correct: false,
      };
      const data = await api<{ ok: true; ids: string[] }>(
        "/api/admin/reading/choice",
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );
      const id = data.ids?.[0];
      if (!id) throw new Error("No id returned");
      emit([
        ...items,
        { id, question_id: questionId, text: "New choice", is_correct: false },
      ]);
    } catch (e: any) {
      alert(e.message || "Failed to add choice");
    } finally {
      setBusy(false);
    }
  }, [canAdd, emit, items, questionId]);

  const addBulk = useCallback(async () => {
    if (!canAdd) return;
    const raw = window.prompt(
      "여러 보기를 줄바꿈으로 입력하세요 (최대 6개까지)"
    );
    if (!raw) return;
    const lines = raw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const capacity = MAX_CHOICES - items.length;
    const texts = lines.slice(0, capacity);
    if (texts.length === 0) return;
    setBusy(true);
    try {
      const data = await api<{ ok: true; ids: string[] }>(
        "/api/admin/reading/choice",
        {
          method: "POST",
          body: JSON.stringify({ question_id: questionId, texts }),
        }
      );
      const ids = data.ids || [];
      const newOnes: Choice[] = ids.map((id, i) => ({
        id,
        question_id: questionId,
        text: texts[i] || "",
        is_correct: false,
      }));
      emit([...items, ...newOnes]);
    } catch (e: any) {
      alert(e.message || "Failed to add choices");
    } finally {
      setBusy(false);
    }
  }, [canAdd, emit, items, questionId]);

  const saveRow = useCallback(
    async (c: Choice) => {
      setBusy(true);
      try {
        await api<{ ok: true }>("/api/admin/reading/choice", {
          method: "PATCH",
          body: JSON.stringify({
            id: c.id,
            text: c.text,
            is_correct: c.is_correct,
          }),
        });
        // 서버가 정답 단일화를 수행하므로, 클라이언트도 반영
        emit(
          items.map((it) =>
            it.id === c.id
              ? { ...c }
              : { ...it, is_correct: c.is_correct ? false : it.is_correct }
          )
        );
      } catch (e: any) {
        alert(e.message || "Failed to save");
      } finally {
        setBusy(false);
      }
    },
    [emit, items]
  );

  const toggleCorrect = useCallback(
    (id: string) => {
      const next = items.map((it) => ({ ...it, is_correct: it.id === id }));
      emit(next);
    },
    [emit, items]
  );

  const deleteRow = useCallback(
    async (id: string) => {
      if (!confirm("이 보기를 삭제할까요?")) return;
      setBusy(true);
      try {
        await api<{ ok: true }>("/api/admin/reading/choice", {
          method: "DELETE",
          body: JSON.stringify({ id }),
        });
        emit(items.filter((it) => it.id !== id));
      } catch (e: any) {
        alert(e.message || "Failed to delete");
      } finally {
        setBusy(false);
      }
    },
    [emit, items]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={addOne}
          disabled={!canAdd}
          className="px-3 py-1 rounded-2xl shadow text-sm disabled:opacity-50"
        >
          + 보기 추가
        </button>
        <button
          onClick={addBulk}
          disabled={!canAdd}
          className="px-3 py-1 rounded-2xl shadow text-sm disabled:opacity-50"
        >
          📥 여러 개 추가
        </button>
        <span className="text-xs opacity-70">
          {items.length}/{MAX_CHOICES}
        </span>
      </div>

      <ul className="space-y-2">
        {sorted.map((c) => (
          <li
            key={c.id}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-2xl p-2 shadow"
          >
            <input
              type="radio"
              name={`correct-${questionId}`}
              checked={c.is_correct}
              onChange={() => toggleCorrect(c.id)}
              aria-label="정답으로 지정"
            />
            <input
              className="w-full rounded-xl border px-3 py-2"
              value={c.text}
              onChange={(e) =>
                emit(
                  items.map((it) =>
                    it.id === c.id ? { ...c, text: e.target.value } : it
                  )
                )
              }
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => saveRow(c)}
                disabled={busy}
                className="px-3 py-1 rounded-xl shadow text-sm"
              >
                저장
              </button>
              <button
                onClick={() => deleteRow(c.id)}
                disabled={busy}
                className="px-3 py-1 rounded-xl shadow text-sm"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

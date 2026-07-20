'use client';

import { useState } from 'react';
import { bulkInsertVocabAction } from './actions';

type Passage = { id: string; title: string | null; grade: string | null };

type State =
  | { ok: true; inserted: number }
  | { ok: false; error: string }
  | null;

const PLACEHOLDER = `give up\t포기하다\t표현
look forward to\t기대하다\t표현
abandon\t버리다
persist\t지속하다
remarkable\t주목할 만한`;

export default function BulkVocabClient({ passages }: { passages: Passage[] }) {
  const [state, setState] = useState<State>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      const result = await bulkInsertVocabAction(fd);
      setState(result);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 지문 선택 */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-neutral-600">지문 선택 *</label>
        <select
          name="passage_id"
          required
          className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
        >
          <option value="">-- 지문을 선택하세요 --</option>
          {passages.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.grade ?? '?'}] {p.title ?? p.id}
            </option>
          ))}
        </select>
      </div>

      {/* 입력 안내 */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-800 space-y-1">
        <p className="font-semibold">입력 형식 (탭으로 구분)</p>
        <p><code>단어 [탭] 뜻 [탭] 표현 (선택) [탭] 예문 (선택)</code></p>
        <p className="text-blue-600">3번째 칸에 <strong>표현</strong> 또는 <strong>숙어</strong>를 쓰면 표현 모드에서 출제됩니다.</p>
        <p className="text-blue-600">Excel/스프레드시트에서 복사 붙여넣기 가능합니다.</p>
      </div>

      {/* 텍스트 입력 */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-neutral-600">
          단어 목록 *
        </label>
        <textarea
          name="words_text"
          rows={16}
          placeholder={PLACEHOLDER}
          required
          className="w-full rounded-xl border px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-neutral-300 resize-y"
        />
      </div>

      {/* 결과 메시지 */}
      {state?.ok === true && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {state.inserted}개 단어가 추가됐습니다.
        </div>
      )}
      {state?.ok === false && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? '저장 중...' : '단어 일괄 추가'}
      </button>
    </form>
  );
}

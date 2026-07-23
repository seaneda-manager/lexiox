'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { createHiNaesinPassageAction } from '../actions';

type SourceType = 'mock_exam' | 'textbook' | 'external_book' | '';

export default function HiNaesinPassageNewPage() {
  const [sourceType, setSourceType] = useState<SourceType>('');

  return (
    <FormContent sourceType={sourceType} setSourceType={setSourceType} />
  );
}

function FormContent({ sourceType, setSourceType }: { sourceType: SourceType; setSourceType: (v: SourceType) => void }) {
  const { pending } = useFormStatus();

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">
            내신 / 지문 추가
          </div>
          <h1 className="text-xl font-semibold text-neutral-900">새 지문 등록</h1>
        </div>
        <Link
          href="/admin/hi-naesin/passages"
          className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
        >
          목록으로
        </Link>
      </header>

      {state?.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          ⚠️ {state.error}
        </div>
      )}

      <form action={createHiNaesinPassageAction} className="space-y-5">

        {/* ── 출처 + 학년 ── */}
        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-600">출처 *</label>
              <select
                name="source_type"
                required
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as SourceType)}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
              >
                <option value="">선택하세요</option>
                <option value="mock_exam">모의고사</option>
                <option value="textbook">교과서</option>
                <option value="external_book">외부교재</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-600">학년 *</label>
              <select
                name="grade"
                required
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
              >
                <option value="">선택하세요</option>
                <option value="M1">중1</option>
                <option value="M2">중2</option>
                <option value="M3">중3</option>
                <option value="H1">고1</option>
                <option value="H2">고2</option>
                <option value="H3">고3</option>
              </select>
            </div>
          </div>

          {/* 모의고사 */}
          {sourceType === 'mock_exam' && (
            <div className="grid gap-3 sm:grid-cols-3 border-t pt-4">
              <Field label="연도" name="exam_year" placeholder="예: 2025" />
              <Field label="월" name="exam_month" placeholder="예: 9" />
              <Field label="문제 번호" name="question_number" placeholder="예: 34" />
            </div>
          )}

          {/* 교과서 */}
          {sourceType === 'textbook' && (
            <div className="grid gap-3 sm:grid-cols-3 border-t pt-4">
              <Field label="학교명" name="school_name" placeholder="예: 한국고등학교" />
              <Field label="교과서명" name="textbook_name" placeholder="예: 천재 (이재영)" />
              <Field label="단원" name="unit_label" placeholder="예: Lesson 3" />
            </div>
          )}

          {/* 외부교재 */}
          {sourceType === 'external_book' && (
            <div className="grid gap-3 sm:grid-cols-2 border-t pt-4">
              <Field label="교재명" name="book_name" placeholder="예: 자이스토리 고2" />
              <Field label="단원/번호" name="book_unit" placeholder="예: Part 2 - 15번" />
            </div>
          )}
        </section>

        {/* ── 지문 본문 ── */}
        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <Field label="제목 (선택)" name="title" placeholder="예: The Power of Habit" />

          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-600">지문 원문 *</label>
            <textarea
              name="passage_text"
              required
              rows={10}
              placeholder="영어 지문을 붙여넣으세요."
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300 resize-y font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-600">전체 해석 (선택)</label>
            <textarea
              name="translation_ko"
              rows={5}
              placeholder="한국어 해석 (없으면 비워도 됩니다)"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300 resize-y"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="단어 수" name="word_count" placeholder="예: 180" />
            <Field label="태그 (쉼표 구분)" name="topic_tags" placeholder="예: environment, AI" />
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Link
            href="/admin/hi-naesin/passages"
            className="rounded-xl border px-5 py-2.5 text-sm hover:bg-neutral-50"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={!sourceType || pending}
            className="rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pending ? '저장 중...' : '저장 후 드릴 편집'}
          </button>
        </div>
      </form>
    </main>
  );
}

function Field({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-neutral-600">{label}</label>
      <input
        name={name}
        placeholder={placeholder}
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { updateBookLevelInfoAction } from '../actions';

type Info = {
  level: string | null;
  recommendedGrade: string | null;
  expectedSchoolGrade: string | null;
  expectedMockExam: string | null;
};

export default function BookInfoPanel({ bookId, info }: { bookId: string; info: Info }) {
  const [editing, setEditing] = useState(false);
  const [level, setLevel] = useState(info.level ?? '');
  const [recommendedGrade, setRecommendedGrade] = useState(info.recommendedGrade ?? '');
  const [expectedSchoolGrade, setExpectedSchoolGrade] = useState(info.expectedSchoolGrade ?? '');
  const [expectedMockExam, setExpectedMockExam] = useState(info.expectedMockExam ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAnyInfo = info.level || info.recommendedGrade || info.expectedSchoolGrade || info.expectedMockExam;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await updateBookLevelInfoAction(bookId, {
      level, recommendedGrade, expectedSchoolGrade, expectedMockExam,
    });
    setSaving(false);
    if ('error' in result) { setError(result.error); return; }
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wide text-violet-600">레벨 정보</h2>
          <button type="button" onClick={() => setEditing(true)} className="text-[11px] text-violet-500 hover:text-violet-700 underline">
            {hasAnyInfo ? '수정' : '입력하기'}
          </button>
        </div>
        {hasAnyInfo ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {info.level && <p><span className="text-neutral-400">레벨</span> · {info.level}</p>}
            {info.recommendedGrade && <p><span className="text-neutral-400">권장 학년</span> · {info.recommendedGrade}</p>}
            {info.expectedSchoolGrade && <p><span className="text-neutral-400">예상 내신</span> · {info.expectedSchoolGrade}</p>}
            {info.expectedMockExam && <p><span className="text-neutral-400">예상 모의고사</span> · {info.expectedMockExam}</p>}
          </div>
        ) : (
          <p className="text-xs text-violet-400">아직 레벨 정보가 없습니다.</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wide text-violet-600">레벨 정보 편집</h2>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-neutral-400 hover:text-neutral-700">닫기</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input type="text" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="레벨 (예: Level 3)"
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400" />
        <input type="text" value={recommendedGrade} onChange={(e) => setRecommendedGrade(e.target.value)} placeholder="권장 학년 (예: 중2~중3)"
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400" />
        <input type="text" value={expectedSchoolGrade} onChange={(e) => setExpectedSchoolGrade(e.target.value)} placeholder="예상 내신 (예: 2~3등급)"
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400" />
        <input type="text" value={expectedMockExam} onChange={(e) => setExpectedMockExam(e.target.value)} placeholder="예상 모의고사 (예: 1~2등급)"
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400" />
      </div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
      <button type="submit" disabled={saving} className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
        {saving ? '저장 중…' : '저장'}
      </button>
    </form>
  );
}

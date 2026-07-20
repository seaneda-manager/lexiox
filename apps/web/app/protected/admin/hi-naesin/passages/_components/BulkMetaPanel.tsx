'use client';

import { useState, useTransition } from 'react';
import { bulkUpdatePassageMetaAction } from '../actions';

type Passage = { id: string; title: string | null; grade: string | null; school_name: string | null; exam_year: number | null; exam_month: number | null };

const GRADE_LABEL: Record<string, string> = { H1:'고1', H2:'고2', H3:'고3', M1:'중1', M2:'중2', M3:'중3' };
const MONTH_LABEL: Record<string, string> = { '4':'1학기 중간(4월)', '7':'1학기 기말(7월)', '10':'2학기 중간(10월)', '12':'2학기 기말(12월)' };

export default function BulkMetaPanel({ passages }: { passages: Passage[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [school, setSchool]     = useState('');
  const [grade, setGrade]       = useState('');
  const [year, setYear]         = useState(String(new Date().getFullYear()));
  const [month, setMonth]       = useState('');
  const [result, setResult]     = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const allIds = passages.map((p) => p.id);
  const allSelected = selected.size === allIds.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleApply() {
    if (selected.size === 0) { setResult('지문을 선택하세요.'); return; }
    if (!school && !grade && !year && !month) { setResult('변경할 항목을 하나 이상 입력하세요.'); return; }

    startTransition(async () => {
      const res = await bulkUpdatePassageMetaAction([...selected], {
        school_name: school || null,
        grade: grade || null,
        exam_year: year ? parseInt(year) : null,
        exam_month: month ? parseInt(month) : null,
      });
      if (res.ok) {
        setResult(`✓ ${selected.size}개 지문에 메타데이터를 적용했습니다.`);
        setSelected(new Set());
      } else {
        setResult(`오류: ${res.error}`);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* 일괄 적용 패널 */}
      <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
        <p className="text-xs font-semibold text-indigo-700">
          📋 일괄 메타데이터 적용 — 아래에서 지문 선택 후 값 입력 → 적용
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">학교명</label>
            <input value={school} onChange={(e) => setSchool(e.target.value)}
              placeholder="예: 한국고등학교 또는 공통"
              className="rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 w-44" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">학년</label>
            <select value={grade} onChange={(e) => setGrade(e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">변경 안 함</option>
              <option value="H1">고1</option><option value="H2">고2</option><option value="H3">고3</option>
              <option value="M1">중1</option><option value="M2">중2</option><option value="M3">중3</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">연도</label>
            <input value={year} onChange={(e) => setYear(e.target.value)}
              type="number" min={2020} max={2035}
              className="rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 w-24" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">시험 시기</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">변경 안 함</option>
              <option value="4">1학기 중간 (4월)</option>
              <option value="7">1학기 기말 (7월)</option>
              <option value="10">2학기 중간 (10월)</option>
              <option value="12">2학기 기말 (12월)</option>
            </select>
          </div>
          <button onClick={handleApply} disabled={isPending || selected.size === 0}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition">
            {isPending ? '적용 중...' : `선택 ${selected.size}개에 적용`}
          </button>
        </div>
        {result && (
          <p className={`text-xs ${result.startsWith('✓') ? 'text-emerald-700' : 'text-red-600'}`}>{result}</p>
        )}
      </section>

      {/* 지문 목록 */}
      <section className="overflow-hidden rounded-2xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left">
            <tr className="border-b [&>th]:px-4 [&>th]:py-2 text-xs font-medium text-neutral-500">
              <th className="w-8">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
              </th>
              <th>제목</th>
              <th>학년</th>
              <th>학교</th>
              <th>연도</th>
              <th>시험</th>
            </tr>
          </thead>
          <tbody>
            {passages.map((p) => {
              const checked = selected.has(p.id);
              const missingMeta = !p.school_name || !p.exam_year || !p.exam_month;
              return (
                <tr key={p.id}
                  onClick={() => toggle(p.id)}
                  className={`border-t cursor-pointer [&>td]:px-4 [&>td]:py-2.5 ${checked ? 'bg-indigo-50' : 'hover:bg-neutral-50'}`}>
                  <td>
                    <input type="checkbox" checked={checked} onChange={() => toggle(p.id)}
                      onClick={(e) => e.stopPropagation()} className="rounded" />
                  </td>
                  <td className="max-w-xs">
                    <p className="truncate font-medium text-neutral-800">{p.title ?? '(제목 없음)'}</p>
                  </td>
                  <td className="text-xs text-neutral-500">{GRADE_LABEL[p.grade ?? ''] ?? p.grade ?? '—'}</td>
                  <td className={`text-xs ${p.school_name ? 'text-neutral-700' : 'text-red-400'}`}>
                    {p.school_name ?? '미입력'}
                  </td>
                  <td className={`text-xs ${p.exam_year ? 'text-neutral-700' : 'text-red-400'}`}>
                    {p.exam_year ?? '미입력'}
                  </td>
                  <td className={`text-xs ${p.exam_month ? 'text-neutral-700' : 'text-red-400'}`}>
                    {p.exam_month ? (MONTH_LABEL[String(p.exam_month)] ?? `${p.exam_month}월`) : '미입력'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="border-t bg-neutral-50 px-4 py-2 text-xs text-neutral-400">
          총 {passages.length}개 지문 · 미입력 {passages.filter((p) => !p.school_name || !p.exam_year || !p.exam_month).length}개
        </div>
      </section>
    </div>
  );
}

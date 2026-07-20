'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import type { GradeResult, GradeItem } from '@/app/api/homework/grade/route';

// ── 상태 타입 ─────────────────────────────────────────────────
type Phase =
  | 'capture'       // 사진 촬영 전
  | 'preview'       // 사진 확인
  | 'grading'       // AI 채점 중
  | 'result';       // 결과 표시

// ── Page ─────────────────────────────────────────────────────
export default function HomeworkSubmitPage() {
  const { id: homeworkId } = useParams<{ id: string }>();
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase]         = useState<Phase>('capture');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile]   = useState<File | null>(null);
  const [result, setResult]         = useState<GradeResult | null>(null);
  const [error, setError]           = useState<string | null>(null);

  // ── 사진 선택 ──────────────────────────────────────────────
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoDataUrl(ev.target?.result as string);
      setPhase('preview');
    };
    reader.readAsDataURL(file);
  }, []);

  // ── 채점 요청 ──────────────────────────────────────────────
  const handleGrade = useCallback(async () => {
    if (!photoFile) return;
    setPhase('grading');
    setError(null);

    const fd = new FormData();
    fd.append('homework_id', homeworkId);
    fd.append('student_photo', photoFile);

    try {
      const res = await fetch('/api/homework/grade', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error ?? '채점 중 오류가 발생했습니다.');
        setPhase('preview');
        return;
      }

      setResult(data.result as GradeResult);
      setPhase('result');
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
      setPhase('preview');
    }
  }, [photoFile, homeworkId]);

  // ── 다시 찍기 ─────────────────────────────────────────────
  const handleRetake = useCallback(() => {
    setPhotoDataUrl(null);
    setPhotoFile(null);
    setPhase('capture');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return (
    <main className="mx-auto max-w-lg space-y-6 pb-12">

      {/* 헤더 */}
      <header>
        <div className="text-xs text-neutral-400 mb-1">
          <Link href="/student/homework" className="hover:underline">숙제 목록</Link>
          {' / 제출'}
        </div>
        <h1 className="text-xl font-bold text-neutral-900">숙제 채점</h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          숙제 사진을 찍으면 AI가 자동으로 채점합니다.
        </p>
      </header>

      {/* ── capture ─────────────────────────────────────────── */}
      {phase === 'capture' && (
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 flex flex-col items-center justify-center gap-4 py-16">
            <span className="text-5xl">📷</span>
            <p className="text-sm text-neutral-500 text-center px-4">
              숙제를 밝은 곳에서 평평하게 놓고<br />
              화면에 꽉 차도록 촬영해 주세요.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              사진 촬영 / 선택
            </button>
          </div>

          {/* hidden file input — capture="environment" = 후면 카메라 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          <p className="text-xs text-neutral-400 text-center">
            카메라가 없으면 갤러리에서 사진을 선택할 수 있습니다.
          </p>
        </div>
      )}

      {/* ── preview ─────────────────────────────────────────── */}
      {phase === 'preview' && photoDataUrl && (
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden border border-neutral-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoDataUrl}
              alt="제출할 숙제 사진"
              className="w-full object-contain max-h-[60vh]"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRetake}
              className="flex-1 rounded-xl border border-neutral-200 py-3 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
            >
              다시 찍기
            </button>
            <button
              type="button"
              onClick={handleGrade}
              className="flex-[2] rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              채점 요청 →
            </button>
          </div>
        </div>
      )}

      {/* ── grading ─────────────────────────────────────────── */}
      {phase === 'grading' && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
            <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 animate-spin" />
          </div>
          <p className="text-sm font-medium text-neutral-700">AI가 채점하고 있습니다…</p>
          <p className="text-xs text-neutral-400 text-center">
            정답지와 비교하는 중입니다. 10~20초 정도 걸릴 수 있습니다.
          </p>
        </div>
      )}

      {/* ── result ──────────────────────────────────────────── */}
      {phase === 'result' && result && (
        <div className="space-y-5">
          {/* 점수 요약 */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex items-end gap-3">
              <p className="text-4xl font-black text-neutral-900">
                {result.score_pct}
                <span className="text-xl font-bold text-neutral-400">%</span>
              </p>
              <div className="pb-0.5">
                <p className="text-sm text-neutral-500">
                  {result.correct_count} / {result.total_count}개 정답
                </p>
              </div>
            </div>

            {/* 점수 바 */}
            <div className="mt-3 h-2.5 w-full rounded-full bg-neutral-100">
              <div
                className={[
                  'h-2.5 rounded-full transition-all',
                  result.score_pct >= 80 ? 'bg-emerald-500'
                  : result.score_pct >= 60 ? 'bg-amber-400'
                  : 'bg-red-400',
                ].join(' ')}
                style={{ width: `${result.score_pct}%` }}
              />
            </div>

            {result.overall_feedback && (
              <p className="mt-3 text-sm text-neutral-600 leading-relaxed border-t pt-3">
                {result.overall_feedback}
              </p>
            )}
          </div>

          {/* 문항별 결과 */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400 px-1">
              문항별 결과
            </h2>
            {result.items.map((item) => (
              <ItemCard key={item.number} item={item} />
            ))}
          </div>

          {/* 버튼 */}
          <div className="flex flex-col gap-2">
            {/* 오답이 있을 때만 교정 버튼 표시 */}
            {result.items.some((item) => !item.is_correct) && (
              <Link
                href={`/student/homework/${homeworkId}/review`}
                className="block w-full text-center rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white hover:bg-amber-600"
              >
                ✏️ 오답 교정하기 ({result.items.filter((i) => !i.is_correct).length}개)
              </Link>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 rounded-xl border border-neutral-200 py-3 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
              >
                다시 제출
              </button>
              <Link
                href="/student/homework"
                className="flex-1 text-center rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                목록으로
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ── 문항 카드 ─────────────────────────────────────────────────
function ItemCard({ item }: { item: GradeItem }) {
  return (
    <div
      className={[
        'rounded-2xl border p-4',
        item.is_correct
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-red-200 bg-red-50',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <span
          className={[
            'mt-0.5 shrink-0 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold',
            item.is_correct
              ? 'bg-emerald-500 text-white'
              : 'bg-red-500 text-white',
          ].join(' ')}
        >
          {item.is_correct ? '○' : '✕'}
        </span>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-neutral-400">Q{item.number}</span>
            <span className="text-sm font-medium text-neutral-800">
              {item.student_answer || '(미기입)'}
            </span>
          </div>

          {!item.is_correct && (
            <>
              <p className="text-xs text-neutral-500">
                정답:{' '}
                <span className="font-semibold text-neutral-700">
                  {item.correct_answer}
                </span>
              </p>
              {item.explanation && (
                <p className="text-xs text-red-700 leading-relaxed border-t border-red-100 pt-2 mt-1">
                  {item.explanation}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

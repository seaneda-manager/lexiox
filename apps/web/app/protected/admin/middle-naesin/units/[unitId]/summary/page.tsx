import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import { gradeLabel } from '@/models/middle-naesin';
import type { MiddleNaesinUnit, MiddleNaesinContent } from '@/models/middle-naesin';
import { buildDrillSections } from '@/components/middle-naesin/drill/types';
import type { MiddleNaesinDrillSection, MiddleNaesinDrillSections, MiddleGrammarPoint } from '@/components/middle-naesin/drill/types';
import type { MiddleDrillVocabItem } from '@/models/middle-naesin/drill';
import { validateGrammarLesson } from '@/models/middle-naesin/grammar-lesson';
import { PrintControls } from './PrintControls';
import { GrammarClassifyView, LessonQuizView } from './QuizView';
import { buildLessonQuiz } from './quizData';
import { makeRng, buildGrammarClassify } from '@/lib/middle-naesin/summaryQuiz';

export const dynamic = 'force-dynamic';

// 직전 공부용 요약본: 같은 교재·학년·학기의 지정한 과(기본 5·6과)를 한 번에 모아 인쇄한다.
export default async function UnitSummaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ lessons?: string; seed?: string; gmax?: string }>;
}) {
  const { unitId } = await params;
  const { lessons = '5,6', seed = '1', gmax } = await searchParams;
  const grammarMax = gmax && Number(gmax) > 0 ? Number(gmax) : Infinity;
  const wanted = lessons.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n));
  const supabase = await getServerSupabase();

  const { data: base } = await supabase.from('middle_naesin_units').select('*').eq('id', unitId).single();
  if (!base) return <div className="p-8 text-red-600">단원을 찾을 수 없습니다.</div>;
  const b = base as MiddleNaesinUnit;

  let q = supabase
    .from('middle_naesin_units')
    .select('*')
    .eq('publisher', b.publisher)
    .eq('grade', b.grade)
    .eq('semester', b.semester)
    .in('lesson_number', wanted);
  q = b.school_name ? q.eq('school_name', b.school_name) : q.is('school_name', null);
  const { data: siblings } = await q.order('lesson_number');

  const units = new Map<string, MiddleNaesinUnit>();
  for (const u of (siblings ?? []) as MiddleNaesinUnit[]) units.set(u.id, u);
  units.set(b.id, b);
  const ordered = [...units.values()].sort((x, y) => (x.lesson_number ?? 0) - (y.lesson_number ?? 0));

  const { data: contentRows } = await supabase
    .from('middle_naesin_contents')
    .select('*')
    .in('unit_id', ordered.map((u) => u.id))
    .order('sort_order')
    .order('content_type');
  const contents = (contentRows ?? []) as MiddleNaesinContent[];

  // 요약본은 관리자용이므로 초안 레슨도 보여 주고 '초안' 표시를 붙인다.
  const drills = ordered.map((u) => {
    const own = contents.filter((c) => c.unit_id === u.id);
    return { unit: u, own, d: buildDrillSections(u.id, own, { includeDrafts: true }) };
  });
  const grammarQuiz = buildGrammarClassify(
    drills.flatMap(({ d }) => d.grammar.filter((g) => g.lesson).map((g) => ({ topic: g.lesson!.topic, lesson: g.lesson! }))),
    makeRng(`${seed}:grammar`),
    grammarMax,
  );
  const nextSeed = String((Number(seed) || 1) + 1);

  return (
    <main data-show="all" data-answers="off" className="summary mx-auto max-w-4xl space-y-8 px-6 py-8">
      <style>{`
        .summary h2 { break-after: avoid; }
        .summary .lesson { break-before: page; }
        .summary .lesson:first-of-type { break-before: auto; }
        .summary .avoid-break { break-inside: avoid; }
        .summary[data-show="summary"] .part-quiz { display: none; }
        .summary[data-show="quiz"] .part-summary { display: none; }
        .summary:not([data-answers="on"]) .answer-key { display: none; }
        @media print {
          .no-print { display: none !important; }
          .summary .quiz { break-before: page; }
          .summary { max-width: none; padding: 0; font-size: 11px; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>

      <header className="no-print flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">직전 공부 요약본</div>
          <h1 className="mt-1 text-xl font-semibold text-neutral-900">
            {b.publisher} · {gradeLabel(b.grade)} {b.semester}학기 ·{' '}
            {ordered.map((u) => `${u.lesson_number}과`).join(' · ')}
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            다른 과는 주소 끝에 <code>?lessons=3,4</code> 형태로 지정하세요. 퀴즈 문제 순서는{' '}
            <Link href={`?lessons=${lessons}&seed=${nextSeed}`} className="underline">
              다시 섞기
            </Link>
            로 바꿀 수 있습니다.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href={`/admin/middle-naesin/units/${unitId}`} className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50">
            ← 단원
          </Link>
        </div>
      </header>
      <div className="no-print"><PrintControls /></div>

      <details className="no-print rounded-lg border bg-neutral-50 p-3 text-xs">
        <summary className="cursor-pointer font-medium text-neutral-600">문법 포인트 진단 (요약본에 안 보일 때 확인)</summary>
        <div className="mt-2 space-y-2">
          {drills.map(({ unit, own }) => (
            <div key={unit.id}>
              <div className="font-semibold">Lesson {unit.lesson_number}</div>
              {own.filter((c) => c.content_type === 'grammar_point').length === 0 && (
                <p className="text-neutral-500">등록된 문법 포인트가 없습니다.</p>
              )}
              <ul className="list-disc pl-5">
                {own
                  .filter((c) => c.content_type === 'grammar_point')
                  .map((c) => {
                    const raw = (c.extra_data as { lesson?: { status?: string } } | null)?.lesson;
                    const check = raw ? validateGrammarLesson(raw) : null;
                    return (
                      <li key={c.id}>
                        {c.title} —{' '}
                        {!raw
                          ? '레슨 데이터 없음(기존 방식 문법 포인트)'
                          : check && !check.ok
                            ? `⚠ 형식 오류로 레슨을 읽지 못함: ${check.errors.slice(0, 3).join(' / ')}`
                            : `상태: ${raw.status === 'final' ? '확정' : '초안'}`}
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>
      </details>

      {drills.map(({ unit, d, own }) => (
        <LessonSummary key={unit.id} unit={unit} d={d} contents={own} />
      ))}

      <section className="quiz part-quiz space-y-8">
        <div className="border-b-2 border-neutral-900 pb-2">
          <h2 className="text-lg font-bold text-neutral-900">✅ 체크 퀴즈</h2>
          <p className="text-xs text-neutral-500">이름 ____________ &nbsp; 날짜 ____________ &nbsp; 점수 ______</p>
        </div>
        {grammarQuiz && <GrammarClassifyView quiz={grammarQuiz} />}
        {drills.map(({ unit, d, own }) => (
          <div key={unit.id} className="space-y-3">
            <h3 className="rounded bg-neutral-900 px-2 py-1 text-xs font-semibold text-white">
              Lesson {unit.lesson_number} {unit.lesson_title && `— ${unit.lesson_title}`}
            </h3>
            <LessonQuizView quiz={buildLessonQuiz(d, own, `${seed}:${unit.id}`)} />
          </div>
        ))}
      </section>
    </main>
  );
}

function LessonSummary({
  unit,
  contents,
  d,
}: {
  unit: MiddleNaesinUnit;
  contents: MiddleNaesinContent[];
  d: MiddleNaesinDrillSections;
}) {
  const pastExams = contents.filter((c) => c.content_type === 'past_exam');
  const passages: [string, MiddleNaesinDrillSection | null][] = [
    ['교과서 본문', d.mainText],
    ['대화문', d.dialogue],
    ['More Reading', d.moreReading],
  ];

  return (
    <article className="lesson part-summary space-y-6">
      <div className="border-b-2 border-neutral-900 pb-2">
        <h2 className="text-lg font-bold text-neutral-900">
          Lesson {unit.lesson_number} {unit.lesson_title && <span className="font-normal">— {unit.lesson_title}</span>}
        </h2>
        <p className="text-xs text-neutral-500">
          {unit.publisher} · {gradeLabel(unit.grade)} {unit.semester}학기
        </p>
      </div>

      {d.grammar.length > 0 && (
        <Section title="① 핵심 문법">
          <div className="space-y-3">
            {d.grammar.map((g) => (
              <Grammar key={g.id} point={g} />
            ))}
          </div>
        </Section>
      )}

      {d.vocab.length > 0 && (
        <Section title={`② 핵심 단어 (${d.vocab.length})`}>
          <VocabTable words={d.vocab} />
        </Section>
      )}

      {passages.map(([label, sec]) =>
        sec ? (
          <Section key={label} title={`③ ${label}`}>
            <div className="space-y-4">
              {sec.parts.map((p) => (
                <div key={p.contentId} className="avoid-break">
                  {sec.parts.length > 1 && <div className="mb-1 text-xs font-semibold text-neutral-600">{p.title}</div>}
                  <ol className="space-y-1.5">
                    {p.sentences.map((s) => (
                      <li key={s.index} className="text-sm leading-snug">
                        <span className="text-neutral-900">{s.en}</span>
                        {s.ko && <span className="block text-xs text-neutral-500">{s.ko}</span>}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </Section>
        ) : null,
      )}

      {pastExams.length > 0 && (
        <Section title="④ 기출 분석">
          <div className="space-y-3">
            {pastExams.map((p) => (
              <div key={p.id} className="avoid-break rounded-lg border p-3 text-sm">
                {p.title && <div className="mb-1 font-semibold">{p.title}</div>}
                {p.body_text && <p className="whitespace-pre-wrap">{p.body_text}</p>}
                {p.translation_ko && (
                  <p className="mt-2 whitespace-pre-wrap rounded bg-amber-50 p-2 text-xs text-neutral-700">
                    <b>해설</b> {p.translation_ko}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="rounded bg-neutral-900 px-2 py-1 text-xs font-semibold text-white">{title}</h3>
      {children}
    </section>
  );
}

function Grammar({ point }: { point: MiddleGrammarPoint }) {
  const l = point.lesson;
  if (!l) {
    return (
      <div className="avoid-break rounded-lg border p-3 text-sm">
        <div className="font-semibold">{point.title}</div>
        {point.explanationEn && <p className="mt-1 whitespace-pre-wrap">{point.explanationEn}</p>}
        {point.explanationKo && <p className="mt-1 whitespace-pre-wrap text-xs text-neutral-600">{point.explanationKo}</p>}
      </div>
    );
  }
  return (
    <div className="avoid-break rounded-lg border p-3 text-sm">
      <div className="font-semibold">
        {l.explanation.titleKo}
        {l.status !== 'final' && (
          <span className="no-print ml-2 rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700">초안</span>
        )}
      </div>
      <p className="mt-1 text-xs text-neutral-600">{l.explanation.summaryKo}</p>
      {l.explanation.rules.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5">
          {l.explanation.rules.map((r, i) => (
            <li key={i}>
              {r.en} <span className="text-xs text-neutral-500">{r.ko}</span>
            </li>
          ))}
        </ul>
      )}
      {l.explanation.examples.length > 0 && (
        <div className="mt-2 rounded bg-neutral-50 p-2">
          {l.explanation.examples.map((e, i) => (
            <div key={i} className="text-xs">
              <span className="font-medium text-neutral-800">{e.en}</span>{' '}
              <span className="text-neutral-500">{e.ko}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VocabTable({ words }: { words: MiddleDrillVocabItem[] }) {
  return (
    <table className="w-full border-collapse text-xs">
      <tbody>
        {words.map((w) => (
          <tr key={`${w.kind}-${w.index}`} className="avoid-break border-b align-top">
            <td className="w-1/5 py-1 pr-2 font-semibold text-neutral-900">{w.word}</td>
            <td className="w-1/5 py-1 pr-2 text-neutral-800">{w.koGloss ?? (w.kind === 'ko' ? w.definition : '')}</td>
            <td className="py-1 text-neutral-500">{w.kind === 'en_en' ? w.definition : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

import Link from 'next/link';
import { gradeLabel } from '@/models/middle-naesin';
import type { MiddleNaesinUnit, MiddleNaesinContent } from '@/models/middle-naesin';
import { buildDrillSections } from '@/components/middle-naesin/drill/types';
import type {
  MiddleNaesinDrillSection,
  MiddleNaesinDrillSections,
  MiddleGrammarPoint,
} from '@/components/middle-naesin/drill/types';
import type { MiddleDrillVocabItem } from '@/models/middle-naesin/drill';
import { validateGrammarLesson } from '@/models/middle-naesin/grammar-lesson';
import { makeRng, buildGrammarClassify, parseKeyExpressions } from '@/lib/middle-naesin/summaryQuiz';
import type { KeyExpressionGroup } from '@/lib/middle-naesin/summaryQuiz';
import { annotateSentences, DEFAULT_KEY_EXPRESSIONS } from '@/lib/middle-naesin/summaryAnnotate';
import { PrintControls } from './PrintControls';
import { GrammarClassifyView, LessonQuizView } from './QuizView';
import { buildLessonQuiz } from './quizData';
import { Marked } from './Annotated';

export type SummaryMode = 'admin' | 'student';

// 직전 공부용 요약본 + 체크 퀴즈. 관리자 화면과 학생 화면이 함께 쓴다.
// 관리자: 초안 문법도 보여주고 진단/확인용 문구를 노출한다. 학생: 확정된 문법만, 선생님용 문구는 숨긴다.
export function SummaryDocument({
  mode,
  units,
  contents,
  seed,
  gmax,
  lessons,
  backHref,
  backLabel,
}: {
  mode: SummaryMode;
  units: MiddleNaesinUnit[];
  contents: MiddleNaesinContent[];
  seed: string;
  gmax: number;
  lessons: string;
  backHref: string;
  backLabel: string;
}) {
  const b = units[0];
  const drills = units.map((u) => {
    const own = contents.filter((c) => c.unit_id === u.id);
    return { unit: u, own, d: buildDrillSections(u.id, own, { includeDrafts: mode === 'admin' }) };
  });
  const grammarQuiz = buildGrammarClassify(
    drills.flatMap(({ d }) => d.grammar.filter((g) => g.lesson).map((g) => ({ topic: g.lesson!.topic, lesson: g.lesson! }))),
    makeRng(`${seed}:grammar`),
    gmax,
  );
  const nextSeed = String((Number(seed) || 1) + 1);

  return (
    <main data-show="all" data-answers="off" data-mode={mode} className="summary mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <style>{`
        .summary h2 { break-after: avoid; }
        .summary .lesson { break-before: page; }
        .summary .lesson:first-of-type { break-before: auto; }
        .summary .avoid-break { break-inside: avoid; }
        .summary .print-only { display: none; }
        .summary mark { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .summary[data-mode="student"] .teacher-only { display: none; }
        .summary[data-show="summary"] .part-quiz { display: none; }
        .summary[data-show="quiz"] .part-summary { display: none; }
        .summary:not([data-answers="on"]) .answer-key { display: none; }
        @media print {
          .no-print { display: none !important; }
          .summary .print-only { display: block; }
          .summary .quiz { break-before: page; }
          .summary { max-width: none; padding: 0; font-size: 11px; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>

      <header className="no-print flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">직전 공부 요약본</div>
          <h1 className="mt-1 text-xl font-semibold text-neutral-900">
            {b.publisher} · {gradeLabel(b.grade)} {b.semester}학기 · {units.map((u) => `${u.lesson_number}과`).join(' · ')}
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            <mark className="rounded bg-yellow-200 px-1">노란색</mark> 대화문 주요 표현 ·{' '}
            <mark className="rounded bg-sky-100 px-1 font-semibold text-sky-900">파란 밑줄</mark> 본문 연결어(번호는 아래 설명표)
            {mode === 'admin' && (
              <>
                {' '}
                · 다른 과는 주소 끝에 <code>?lessons=3,4</code> 로 지정
              </>
            )}{' '}
            ·{' '}
            <Link href={`?lessons=${lessons}&seed=${nextSeed}`} className="underline">
              퀴즈 다시 섞기
            </Link>
          </p>
        </div>
        <Link href={backHref} className="shrink-0 rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50">
          {backLabel}
        </Link>
      </header>
      <div className="no-print">
        <PrintControls />
      </div>

      {mode === 'admin' && <GrammarDiagnostics drills={drills} />}

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

function GrammarDiagnostics({ drills }: { drills: { unit: MiddleNaesinUnit; own: MiddleNaesinContent[] }[] }) {
  return (
    <details className="no-print rounded-lg border bg-neutral-50 p-3 text-xs">
      <summary className="cursor-pointer font-medium text-neutral-600">문법 포인트 진단 (요약본에 안 보일 때 확인)</summary>
      <div className="mt-2 space-y-2">
        {drills.map(({ unit, own }) => {
          const gp = own.filter((c) => c.content_type === 'grammar_point');
          return (
            <div key={unit.id}>
              <div className="font-semibold">Lesson {unit.lesson_number}</div>
              {gp.length === 0 && <p className="text-neutral-500">등록된 문법 포인트가 없습니다.</p>}
              <ul className="list-disc pl-5">
                {gp.map((c) => {
                  const raw = (c.extra_data as { lesson?: { status?: string } } | null)?.lesson;
                  const check = raw ? validateGrammarLesson(raw) : null;
                  return (
                    <li key={c.id}>
                      {c.title} —{' '}
                      {!raw
                        ? '레슨 데이터 없음(기존 방식 문법 포인트)'
                        : check && check.ok === false
                          ? `⚠ 형식 오류로 레슨을 읽지 못함: ${check.errors.slice(0, 3).join(' / ')}`
                          : `상태: ${raw.status === 'final' ? '확정' : '초안'}`}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </details>
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
  // 관리자가 대화문 extra_data.keyExpressions 를 넣었으면 그것을, 없으면 기본 표현 목록을 형광펜 대상으로 쓴다.
  const keyGroups = contents.filter((c) => c.content_type === 'dialogue').flatMap((c) => parseKeyExpressions(c.extra_data));
  const exprs =
    keyGroups.length > 0 ? keyGroups.flatMap((g) => [...g.expressions, ...g.replies]) : DEFAULT_KEY_EXPRESSIONS;

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

      {d.mainText && (
        <Section title="③ 교과서 본문 (연결어 표시)">
          <Passage sec={d.mainText} connectives />
        </Section>
      )}

      {d.dialogue && (
        <Section title="③ 대화문 (주요 표현 형광펜)">
          {keyGroups.length > 0 && <KeyGroups groups={keyGroups} />}
          <Passage sec={d.dialogue} expressions={exprs} />
        </Section>
      )}

      {d.moreReading && (
        <Section title="③ More Reading (연결어 표시)">
          <Passage sec={d.moreReading} connectives />
        </Section>
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

function KeyGroups({ groups }: { groups: KeyExpressionGroup[] }) {
  return (
    <div className="avoid-break grid gap-2 rounded-lg border bg-yellow-50 p-3 text-xs sm:grid-cols-2">
      {groups.map((g) => (
        <div key={g.title}>
          <div className="font-semibold text-neutral-800">{g.title}</div>
          {g.expressions.length > 0 && (
            <p>
              <b className="text-neutral-500">표현</b> {g.expressions.join(' / ')}
            </p>
          )}
          {g.replies.length > 0 && (
            <p>
              <b className="text-neutral-500">답</b> {g.replies.join(' / ')}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// 본문/대화문 한 섹션. connectives 면 연결어 표시 + 설명표, expressions 가 있으면 주요 표현 형광펜.
function Passage({
  sec,
  connectives,
  expressions,
}: {
  sec: MiddleNaesinDrillSection;
  connectives?: boolean;
  expressions?: string[];
}) {
  return (
    <div className="space-y-4">
      {sec.parts.map((p) => {
        const ann = annotateSentences(
          p.sentences.map((s) => s.en),
          { connectives, expressions },
        );
        const notes = ann.flatMap((a) => a.notes);
        return (
          <div key={p.contentId} className="space-y-2">
            {sec.parts.length > 1 && <div className="text-xs font-semibold text-neutral-600">{p.title}</div>}
            <ol className="space-y-1.5">
              {p.sentences.map((s, i) => (
                <li key={s.index} className="avoid-break text-sm leading-snug">
                  <span className="text-neutral-900">
                    <Marked a={ann[i]} />
                  </span>
                  {s.ko && <span className="block text-xs text-neutral-500">{s.ko}</span>}
                </li>
              ))}
            </ol>
            {connectives && notes.length > 0 && (
              <div className="avoid-break rounded-lg border border-sky-200 bg-sky-50/50 p-2">
                <div className="mb-1 text-xs font-semibold text-sky-800">연결어 정리 — 왜 이 연결어일까?</div>
                <table className="w-full border-collapse text-xs">
                  <tbody>
                    {notes.map((n) => (
                      <tr key={n.no} className="align-top">
                        <td className="w-6 py-0.5 pr-1 font-bold text-sky-600">{n.no}</td>
                        <td className="w-24 py-0.5 pr-2 font-semibold text-neutral-900">{n.word}</td>
                        <td className="w-24 py-0.5 pr-2 text-sky-800">{n.role}</td>
                        <td className="py-0.5 text-neutral-700">{n.why}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="teacher-only no-print mt-1 text-[10px] text-amber-600">
                  연결어 설명은 자동 분석입니다. 인쇄 전에 한 번 확인하세요.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
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
          <span className="teacher-only no-print ml-2 rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700">초안</span>
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
              <span className="font-medium text-neutral-800">{e.en}</span> <span className="text-neutral-500">{e.ko}</span>
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

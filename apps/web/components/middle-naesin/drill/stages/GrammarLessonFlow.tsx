'use client';

import { useMemo, useState } from 'react';
import {
  findWrongTokenIndex,
  GRAMMAR_LEVEL_LABEL,
  GRAMMAR_QUESTION_KIND_LABEL,
  type GrammarLesson,
  type GrammarLessonFill,
  type GrammarLessonFix,
  type GrammarLessonLevel,
  type GrammarLessonQuestion,
} from '@/models/middle-naesin/grammar-lesson';
import SaveResultButton from '@/components/middle-naesin/drill/SaveResultButton';
import type { MiddleNaesinDrillDetailItem } from '@/lib/middle-naesin/drill-results';

type Props = {
  pointId: string;
  title: string;
  lesson: GrammarLesson;
  unitId?: string;
  isDraft?: boolean;
};

const STEPS = ['설명', '쓰기 깜지', '빈칸 채우기', 'Drill', '문제'] as const;

// 대소문자/문장부호는 무시하고 단어 사이 띄어쓰기는 유지한다.
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’‘]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const LEVEL_STYLE: Record<GrammarLessonLevel, string> = {
  basic: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  advanced: 'bg-rose-50 text-rose-700 border-rose-200',
};

function LevelBadge({ level }: { level: GrammarLessonLevel }) {
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${LEVEL_STYLE[level]}`}>
      {GRAMMAR_LEVEL_LABEL[level]}
    </span>
  );
}

type Result = { answer: string; correct: boolean };

export default function GrammarLessonFlow({ pointId, title, lesson, unitId, isDraft }: Props) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<boolean[]>([false, false, false, false, false]);
  const [fillRes, setFillRes] = useState<Record<number, Result>>({});
  const [fixRes, setFixRes] = useState<Record<number, Result>>({});
  const [qRes, setQRes] = useState<Record<number, Result>>({});

  const markDone = (i: number) => setDone((d) => d.map((v, idx) => (idx === i ? true : v)));
  const unlocked = (i: number) => i === 0 || done[i - 1];

  const drillTotal = lesson.drillFill.length + lesson.drillFix.length;
  const drillChecked = Object.keys(fillRes).length + Object.keys(fixRes).length;
  const drillDone = drillChecked >= drillTotal;
  const questionsDone = Object.keys(qRes).length >= lesson.questions.length;

  const detail: MiddleNaesinDrillDetailItem[] = useMemo(() => {
    const items: MiddleNaesinDrillDetailItem[] = [];
    lesson.drillFill.forEach((f, i) => {
      const r = fillRes[i];
      if (r) items.push({ prompt: `[Drill 빈칸·${GRAMMAR_LEVEL_LABEL[f.level]}] ${f.sentence}`, yourAnswer: r.answer, correctAnswer: f.answer, isCorrect: r.correct });
    });
    lesson.drillFix.forEach((f, i) => {
      const r = fixRes[i];
      if (r) items.push({ prompt: `[Drill 고치기·${GRAMMAR_LEVEL_LABEL[f.level]}] ${f.sentence}`, yourAnswer: r.answer, correctAnswer: f.correct.map((c) => c || '(삭제)').join(' / '), isCorrect: r.correct });
    });
    lesson.questions.forEach((q, i) => {
      const r = qRes[i];
      if (r) items.push({ prompt: `[문제·${GRAMMAR_LEVEL_LABEL[q.level]}] ${q.stem}`, yourAnswer: r.answer, correctAnswer: q.choices[q.answerIndex].en, isCorrect: r.correct, explanation: q.explanationKo });
    });
    return items;
  }, [lesson, fillRes, fixRes, qRes]);

  const score = detail.filter((d) => d.isCorrect).length;
  const total = drillTotal + lesson.questions.length;

  return (
    <div className="space-y-4 rounded-2xl border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
          <p className="text-xs text-neutral-400">{lesson.explanation.titleKo}</p>
        </div>
        {isDraft && (
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            초안 · 학생에게는 보이지 않음
          </span>
        )}
      </div>

      <div className="flex gap-1.5 rounded-xl border bg-neutral-50 p-1">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            disabled={!unlocked(i)}
            onClick={() => setStep(i)}
            className={[
              'flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition',
              step === i ? 'bg-neutral-900 text-white' : unlocked(i) ? 'text-neutral-600 hover:bg-neutral-100' : 'cursor-not-allowed text-neutral-300',
            ].join(' ')}
          >
            {!unlocked(i) ? '🔒 ' : done[i] ? '✓ ' : ''}
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <ExplanationStep lesson={lesson} onNext={() => { markDone(0); setStep(1); }} />
      )}
      {step === 1 && <CramStep cramText={lesson.cramText} onDone={() => { markDone(1); setStep(2); }} />}
      {step === 2 && <BlanksStep lesson={lesson} onDone={() => { markDone(2); setStep(3); }} />}
      {step === 3 && (
        <DrillStep
          lesson={lesson}
          fillRes={fillRes}
          fixRes={fixRes}
          onFill={(i, r) => setFillRes((p) => ({ ...p, [i]: r }))}
          onFix={(i, r) => setFixRes((p) => ({ ...p, [i]: r }))}
          canProceed={drillDone}
          onNext={() => { markDone(3); setStep(4); }}
        />
      )}
      {step === 4 && (
        <QuestionsStep lesson={lesson} results={qRes} onAnswer={(i, r) => setQRes((p) => ({ ...p, [i]: r }))} />
      )}

      {(done[3] || questionsDone) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-neutral-50 px-4 py-3 text-sm">
          <span className="font-semibold text-neutral-700">
            Drill + 문제 {score}/{total} 정답 ({detail.length}/{total} 풀이)
          </span>
          {unitId && (
            <SaveResultButton
              unitId={unitId}
              drillType="grammar_point"
              refId={pointId}
              score={score}
              total={detail.length}
              detail={detail}
              label={`결과 저장 (${score}/${detail.length})`}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── 1. 설명 ─────────────────────────────────────────────────────────
function ExplanationStep({ lesson, onNext }: { lesson: GrammarLesson; onNext: () => void }) {
  const [showKo, setShowKo] = useState(true);
  const ex = lesson.explanation;
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-sky-50 px-4 py-3">
        <p className="text-sm font-medium leading-relaxed text-neutral-900">{ex.summaryEn}</p>
        {showKo && <p className="mt-1.5 text-sm leading-relaxed text-sky-900">{ex.summaryKo}</p>}
      </div>
      <button type="button" onClick={() => setShowKo((v) => !v)} className="rounded-lg border px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50">
        {showKo ? '한글 숨기기' : '한글 보기'}
      </button>
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-widest text-neutral-400">Rules</div>
        {ex.rules.map((r, i) => (
          <div key={i} className="rounded-xl border p-3">
            <p className="text-sm font-medium text-neutral-800">{i + 1}. {r.en}</p>
            {showKo && <p className="mt-1 text-xs leading-relaxed text-neutral-500">{r.ko}</p>}
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-widest text-neutral-400">Examples</div>
        {ex.examples.map((r, i) => (
          <div key={i} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
            <p className="text-sm text-neutral-800">{r.en}</p>
            {showKo && <p className="mt-1 text-xs text-neutral-500">{r.ko}</p>}
          </div>
        ))}
      </div>
      <button type="button" onClick={onNext} className="rounded-xl bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800">
        다 읽었어요 → 쓰기 깜지
      </button>
    </div>
  );
}

// ── 2. 설명 쓰기 깜지 ────────────────────────────────────────────────
function CramStep({ cramText, onDone }: { cramText: string; onDone: () => void }) {
  const [text, setText] = useState('');
  const [checked, setChecked] = useState(false);
  const ok = norm(text) === norm(cramText);
  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-500">아래 설명을 그대로 따라 써 보세요. (대소문자와 문장부호는 달라도 괜찮아요)</p>
      <pre className="whitespace-pre-wrap rounded-xl bg-neutral-50 px-4 py-3 font-sans text-sm leading-relaxed text-neutral-800">{cramText}</pre>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setChecked(false); }}
        rows={Math.max(5, cramText.split('\n').length + 1)}
        placeholder="여기에 따라 쓰세요..."
        className="w-full rounded-xl border px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-emerald-200"
      />
      <div className="flex items-center gap-3">
        <button type="button" disabled={!text.trim()} onClick={() => setChecked(true)} className="rounded-xl bg-neutral-800 px-4 py-2 text-sm text-white disabled:opacity-40">
          확인
        </button>
        {checked && (ok ? (
          <button type="button" onClick={onDone} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">✓ 완료 → 빈칸 채우기</button>
        ) : (
          <span className="text-xs font-semibold text-amber-600">△ 원문과 달라요. 다시 확인해 보세요.</span>
        ))}
      </div>
    </div>
  );
}

// ── 3. 빈칸 채우기 ───────────────────────────────────────────────────
function BlanksStep({ lesson, onDone }: { lesson: GrammarLesson; onDone: () => void }) {
  const [vals, setVals] = useState<string[]>(lesson.blanks.map(() => ''));
  const [checked, setChecked] = useState(false);
  const allOk = lesson.blanks.every((b, i) => norm(vals[i]) === norm(b.answer));
  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-500">설명에서 배운 내용으로 빈칸을 채우세요.</p>
      {lesson.blanks.map((b, i) => {
        const [pre, post] = b.text.split('___');
        const ok = norm(vals[i]) === norm(b.answer);
        return (
          <div key={i} className="flex flex-wrap items-center gap-1.5 rounded-xl border p-3 text-sm text-neutral-800">
            <span className="font-bold text-neutral-400">{i + 1}.</span>
            <span>{pre}</span>
            <input
              value={vals[i]}
              onChange={(e) => { setVals((v) => v.map((x, j) => (j === i ? e.target.value : x))); setChecked(false); }}
              placeholder={b.hint ?? ''}
              className={['w-32 rounded-lg border px-2 py-1 text-sm outline-none', checked ? (ok ? 'border-emerald-400 bg-emerald-50' : 'border-rose-300 bg-rose-50') : ''].join(' ')}
            />
            <span>{post}</span>
          </div>
        );
      })}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setChecked(true)} className="rounded-xl bg-neutral-800 px-4 py-2 text-sm text-white">확인</button>
        {checked && (allOk ? (
          <button type="button" onClick={onDone} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">✓ 모두 정답 → Drill</button>
        ) : (
          <span className="text-xs font-semibold text-amber-600">△ 빨간 칸을 다시 확인하세요.</span>
        ))}
      </div>
    </div>
  );
}

// ── 4. Drill: 빈칸 + 틀린 곳 고치기(이유 고르기) ────────────────────
function DrillStep({
  lesson, fillRes, fixRes, onFill, onFix, canProceed, onNext,
}: {
  lesson: GrammarLesson;
  fillRes: Record<number, Result>;
  fixRes: Record<number, Result>;
  onFill: (i: number, r: Result) => void;
  onFix: (i: number, r: Result) => void;
  canProceed: boolean;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 text-sm font-bold text-neutral-700">A. 빈칸 채우기</div>
        <div className="space-y-3">
          {lesson.drillFill.map((f, i) => (
            <FillItem key={i} n={i + 1} item={f} result={fillRes[i]} onResult={(r) => onFill(i, r)} />
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 text-sm font-bold text-neutral-700">B. 틀린 부분 고치기 + 이유 고르기</div>
        <div className="space-y-3">
          {lesson.drillFix.map((f, i) => (
            <FixItem key={i} n={i + 1} item={f} result={fixRes[i]} onResult={(r) => onFix(i, r)} />
          ))}
        </div>
      </div>
      {canProceed && (
        <button type="button" onClick={onNext} className="rounded-xl bg-emerald-700 px-5 py-2 text-sm font-semibold text-white">✓ Drill 완료 → 문제</button>
      )}
    </div>
  );
}

function FillItem({ n, item, result, onResult }: { n: number; item: GrammarLessonFill; result?: Result; onResult: (r: Result) => void }) {
  const [val, setVal] = useState('');
  const [pre, post] = item.sentence.split('___');
  const submit = (v: string) => onResult({ answer: v, correct: norm(v) === norm(item.answer) || v === item.answer });
  const locked = !!result;
  return (
    <div className="space-y-2 rounded-xl border p-3">
      <div className="flex flex-wrap items-center gap-1.5 text-sm text-neutral-800">
        <LevelBadge level={item.level} />
        <span className="font-bold text-neutral-400">{n}.</span>
        <span>{pre}</span>
        {item.choices ? (
          <span className="inline-flex flex-wrap gap-1.5">
            {item.choices.map((c) => (
              <button
                key={c}
                type="button"
                disabled={locked}
                onClick={() => { setVal(c); submit(c); }}
                className={['rounded-full border px-3 py-1 text-sm', locked ? (c === item.answer ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : c === result?.answer ? 'border-rose-300 bg-rose-50 text-rose-700' : 'opacity-50') : 'hover:bg-neutral-100'].join(' ')}
              >
                {c}
              </button>
            ))}
          </span>
        ) : (
          <>
            <input value={val} disabled={locked} onChange={(e) => setVal(e.target.value)} placeholder={item.hint ?? ''} className="w-28 rounded-lg border px-2 py-1 text-sm outline-none" />
            {!locked && <button type="button" disabled={!val.trim()} onClick={() => submit(val)} className="rounded-lg bg-neutral-800 px-3 py-1 text-xs text-white disabled:opacity-40">확인</button>}
          </>
        )}
        <span>{post}</span>
      </div>
      {item.noteKo && <p className="text-xs text-neutral-400">💡 {item.noteKo}</p>}
      {result && (
        <p className={['text-xs font-semibold', result.correct ? 'text-emerald-600' : 'text-rose-600'].join(' ')}>
          {result.correct ? '✓ 정답' : `✗ 오답 · 정답: ${item.answer}`}
          {item.ko && <span className="ml-2 font-normal text-neutral-500">{item.ko}</span>}
        </p>
      )}
    </div>
  );
}

function FixItem({ n, item, result, onResult }: { n: number; item: GrammarLessonFix; result?: Result; onResult: (r: Result) => void }) {
  const tokens = item.sentence.split(/\s+/);
  const wrongIdx = findWrongTokenIndex(item.sentence, item.wrong);
  const [sel, setSel] = useState<number | null>(null);
  const [fix, setFix] = useState('');
  const [del, setDel] = useState(false);
  const [reason, setReason] = useState<number | null>(null);
  const locked = !!result;

  const check = () => {
    const tokenOk = sel === wrongIdx;
    const corrOk = del ? item.correct.includes('') : item.correct.some((c) => c !== '' && norm(c) === norm(fix));
    const reasonOk = reason === item.reasonIndex;
    const ans = `${sel !== null ? tokens[sel] : '?'} → ${del ? '(삭제)' : fix} / 이유: ${reason !== null ? item.reasonChoices[reason] : '?'}`;
    onResult({ answer: ans, correct: tokenOk && corrOk && reasonOk });
  };
  const ready = sel !== null && reason !== null && (del || fix.trim() !== '');
  const correctSentence = tokens
    .map((t, i) => (i === wrongIdx ? item.correct[0] : t))
    .filter((t) => t !== '')
    .join(' ');

  return (
    <div className="space-y-2.5 rounded-xl border p-3">
      <div className="flex items-start gap-2">
        <LevelBadge level={item.level} />
        <span className="mt-0.5 font-bold text-neutral-400">{n}.</span>
        <div className="flex flex-wrap gap-1.5">
          {tokens.map((t, i) => (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => setSel(i)}
              className={[
                'rounded-md px-1.5 py-0.5 text-sm transition',
                sel === i ? 'bg-amber-200 font-semibold text-amber-900' : 'hover:bg-neutral-100',
                locked && i === wrongIdx ? 'bg-rose-100 font-semibold text-rose-700 line-through' : '',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-neutral-400">틀린 단어를 눌러 선택하고, 고쳐 쓴 뒤 이유를 고르세요.</p>

      {!locked && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={fix}
              disabled={del}
              onChange={(e) => setFix(e.target.value)}
              placeholder="고친 단어"
              className="w-40 rounded-lg border px-2 py-1 text-sm outline-none disabled:bg-neutral-50"
            />
            <button
              type="button"
              onClick={() => { setDel((v) => !v); setFix(''); }}
              className={['rounded-lg border px-3 py-1 text-xs', del ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'].join(' ')}
            >
              삭제
            </button>
          </div>
          <div className="space-y-1">
            {item.reasonChoices.map((r, i) => (
              <label key={i} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1 text-sm hover:bg-neutral-50">
                <input type="radio" name={`reason-${n}-${item.sentence}`} checked={reason === i} onChange={() => setReason(i)} className="mt-1" />
                <span>{r}</span>
              </label>
            ))}
          </div>
          <button type="button" disabled={!ready} onClick={check} className="rounded-lg bg-neutral-800 px-4 py-1.5 text-xs text-white disabled:opacity-40">확인</button>
        </>
      )}

      {result && (
        <div className="space-y-1 rounded-lg bg-neutral-50 px-3 py-2 text-xs">
          <p className={['font-semibold', result.correct ? 'text-emerald-600' : 'text-rose-600'].join(' ')}>{result.correct ? '✓ 정답' : '✗ 오답'}</p>
          <p className="text-neutral-700">정답 문장: <span className="font-mono">{correctSentence}</span></p>
          <p className="text-neutral-700">이유: {item.reasonChoices[item.reasonIndex]}</p>
          {item.ko && <p className="text-neutral-500">{item.ko}</p>}
        </div>
      )}
    </div>
  );
}

// ── 5. 문제 ─────────────────────────────────────────────────────────
function QuestionsStep({ lesson, results, onAnswer }: { lesson: GrammarLesson; results: Record<number, Result>; onAnswer: (i: number, r: Result) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">
        문제는 영어로 나옵니다. 답을 고르면 보기의 해석과 해설이 보여요. ({Object.keys(results).length}/{lesson.questions.length})
      </p>
      {lesson.questions.map((q, i) => (
        <QuestionItem key={i} n={i + 1} q={q} result={results[i]} onPick={(idx) => onAnswer(i, { answer: q.choices[idx].en, correct: idx === q.answerIndex })} />
      ))}
    </div>
  );
}

function QuestionItem({ n, q, result, onPick }: { n: number; q: GrammarLessonQuestion; result?: Result; onPick: (idx: number) => void }) {
  const [showKo, setShowKo] = useState(false);
  const answered = !!result;
  const koVisible = showKo || answered;
  const pickedIdx = result ? q.choices.findIndex((c) => c.en === result.answer) : -1;
  return (
    <div className="space-y-2 rounded-xl border bg-neutral-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <LevelBadge level={q.level} />
        <span className="rounded-full border bg-white px-2 py-0.5 text-[10px] font-semibold text-neutral-500">{GRAMMAR_QUESTION_KIND_LABEL[q.kind]}</span>
        <span className="text-sm font-bold text-neutral-500">{n}.</span>
      </div>
      <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-neutral-800">{q.stem}</p>
      <div className="space-y-1.5">
        {q.choices.map((c, i) => {
          const isAnswer = i === q.answerIndex;
          const isPicked = i === pickedIdx;
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => onPick(i)}
              className={[
                'block w-full rounded-lg border px-3 py-2 text-left text-sm transition',
                answered ? (isAnswer ? 'border-emerald-300 bg-emerald-50' : isPicked ? 'border-rose-300 bg-rose-50' : 'bg-white opacity-60') : 'bg-white hover:bg-neutral-100',
              ].join(' ')}
            >
              <span className="mr-2 font-bold text-neutral-400">{q.kind === 'count_wrong' ? '' : String.fromCharCode(65 + i)}</span>
              {c.en}
              {koVisible && c.ko && <span className="mt-0.5 block text-xs text-neutral-500">{c.ko}</span>}
            </button>
          );
        })}
      </div>
      {!answered && (
        <button type="button" onClick={() => setShowKo((v) => !v)} className="rounded-lg border px-3 py-1 text-xs text-neutral-500 hover:bg-white">
          {showKo ? '해석 숨기기' : '보기 해석 보기'}
        </button>
      )}
      {answered && (
        <div className="space-y-1">
          <p className={['text-xs font-semibold', result.correct ? 'text-emerald-600' : 'text-rose-600'].join(' ')}>
            {result.correct ? '✓ 정답' : `✗ 오답 · 정답: ${q.kind === 'count_wrong' ? q.choices[q.answerIndex].en + '개' : String.fromCharCode(65 + q.answerIndex)}`}
          </p>
          <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-800">💡 {q.explanationKo}</p>
        </div>
      )}
    </div>
  );
}

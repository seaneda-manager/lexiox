import type { GrammarClassifyQuiz } from '@/lib/middle-naesin/summaryQuiz';
import type { OrderQuiz, LabelItem, Clue } from '@/lib/middle-naesin/summaryQuiz';
import type { LessonQuizData } from './quizData';

function ClueText({ clue }: { clue: Clue }) {
  return clue.kind === 'def' ? (
    <span className="italic text-neutral-700">
      {clue.text} <span className="not-italic text-[10px] text-neutral-400">(영영)</span>
    </span>
  ) : (
    <>{clue.text}</>
  );
}

const Ans = ({ children }: { children: React.ReactNode }) => (
  <span className="answer-key ml-2 rounded bg-red-50 px-1.5 text-xs font-semibold text-red-600">{children}</span>
);

function Q({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="avoid-break border-b border-neutral-400 pb-0.5 text-sm font-semibold text-neutral-900">
        {title} {hint && <span className="text-xs font-normal text-neutral-500">{hint}</span>}
      </h4>
      {children}
    </section>
  );
}

export function GrammarClassifyView({ quiz }: { quiz: GrammarClassifyQuiz }) {
  return (
    <Q title="① 문법 분류" hint="각 문장/설명이 어느 문법인지 기호를 ( ) 안에 쓰세요.">
      <ul className="avoid-break flex flex-wrap gap-x-5 gap-y-1 rounded bg-neutral-50 p-2 text-xs">
        {quiz.options.map((o) => (
          <li key={o.letter}>
            <b>{o.letter}</b> {o.label}
          </li>
        ))}
      </ul>
      <ol className="space-y-1.5">
        {quiz.items.map((it) => (
          <li key={it.no} className="avoid-break text-sm leading-snug">
            <span className="mr-1 inline-block w-6 text-right text-xs text-neutral-500">{it.no}.</span>( ) {it.en}
            {it.ko && <span className="ml-1 text-xs text-neutral-500">{it.ko}</span>}
            <Ans>{it.answer}</Ans>
          </li>
        ))}
      </ol>
    </Q>
  );
}

function Order({ q, no }: { q: OrderQuiz; no: number }) {
  return (
    <div className="avoid-break rounded border p-2 text-sm">
      <div className="text-xs font-semibold text-neutral-500">
        {no}. {q.title}
      </div>
      <p className="mt-1">
        <b className="mr-1">(처음)</b>
        {q.first}
      </p>
      <ul className="mt-1 space-y-0.5">
        {q.shuffled.map((s) => (
          <li key={s.letter}>
            <b className="mr-1">({s.letter})</b>
            {s.text}
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-xs text-neutral-500">
        순서: 처음{q.shuffled.map((_, i) => ' → ____').join('')}
        <Ans>{q.answer}</Ans>
      </p>
    </div>
  );
}

function OrderList({ list }: { list: OrderQuiz[] }) {
  return (
    <div className="space-y-2">
      {list.map((q, i) => (
        <Order key={i} q={q} no={i + 1} />
      ))}
    </div>
  );
}

function LabelList({ items }: { items: LabelItem[] }) {
  return (
    <ol className="space-y-2">
      {items.map((it) => (
        <li key={it.no} className="avoid-break rounded border p-2 text-sm">
          <p>
            <b className="mr-1">{it.no}.</b>
            {it.en}
          </p>
          <p className="mt-1 text-xs">
            <b>A</b> {it.a}
          </p>
          <p className="text-xs">
            <b>B</b> {it.b}
            <span className="ml-2 text-neutral-500">→ 정답 ( )</span>
            <Ans>{it.answer}</Ans>
          </p>
          {it.auto && <p className="teacher-only no-print mt-0.5 text-[10px] text-amber-600">자동 판별 문장입니다. 인쇄 전 확인하세요.</p>}
        </li>
      ))}
    </ol>
  );
}

export function LessonQuizView({ quiz }: { quiz: LessonQuizData }) {
  const q = quiz;
  const empty =
    !q.words && !q.phrases && !q.expressions && !q.qaMatch &&
    q.dialogueOrder.length + q.mainOrder.length + q.mainLabel.length + q.moreOrder.length + q.moreLabel.length === 0;
  if (empty) return <p className="text-sm text-neutral-400">이 과에서 만들 수 있는 퀴즈가 없습니다.</p>;

  return (
    <div className="space-y-5">
      {q.words && (
        <Q title="② 단어 (한 → 영)" hint="뜻을 보고 영어 단어를 쓰세요.">
          <ol className="columns-2 gap-6 text-sm">
            {q.words.items.map((it) => (
              <li key={it.no} className="avoid-break mb-1">
                <span className="mr-1 inline-block w-6 text-right text-xs text-neutral-500">{it.no}.</span>
                <ClueText clue={it.clue} /> → ____________
                <Ans>{it.answer}</Ans>
              </li>
            ))}
          </ol>
          {q.words.items.some((i) => i.clue.kind !== 'ko') && (
            <p className="teacher-only no-print text-[10px] text-amber-600">
              한글 뜻이 없는 단어는 사전 뜻 또는 영영 정의로 대신했습니다. 인쇄 전 확인하세요.
            </p>
          )}
        </Q>
      )}

      {q.phrases && (
        <Q title="③ 숙어 빈칸" hint="빈칸에 알맞은 전치사/부분을 쓰세요.">
          <ol className="columns-2 gap-6 text-sm">
            {q.phrases.items.map((it) => (
              <li key={it.no} className="avoid-break mb-1">
                <span className="mr-1 inline-block w-6 text-right text-xs text-neutral-500">{it.no}.</span>
                {it.text} {it.clue && <span className="text-xs text-neutral-500">(<ClueText clue={it.clue} />)</span>}
                <Ans>{it.answer}</Ans>
              </li>
            ))}
          </ol>
        </Q>
      )}

      {q.expressions && (
        <Q title="④ 대화문 주요 표현 분류" hint="각 표현이 어디에 속하는지 기호를 ( ) 안에 쓰세요.">
          <ul className="avoid-break flex flex-wrap gap-x-5 gap-y-1 rounded bg-neutral-50 p-2 text-xs">
            {q.expressions.options.map((o) => (
              <li key={o.letter}>
                <b>{o.letter}</b> {o.label}
              </li>
            ))}
          </ul>
          <ol className="columns-2 gap-6 text-sm">
            {q.expressions.items.map((it) => (
              <li key={it.no} className="avoid-break mb-1">
                <span className="mr-1 inline-block w-6 text-right text-xs text-neutral-500">{it.no}.</span>( ) {it.text}
                <Ans>{it.answer}</Ans>
              </li>
            ))}
          </ol>
        </Q>
      )}

      {q.qaMatch && (
        <Q title="④ 대화문 질문-응답 연결" hint="질문에 알맞은 응답의 기호를 쓰세요.">
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <ol className="space-y-1">
              {q.qaMatch.questions.map((it) => (
                <li key={it.no} className="avoid-break">
                  {it.no}. {it.text} → ( )
                </li>
              ))}
            </ol>
            <ul className="space-y-1">
              {q.qaMatch.replies.map((r) => (
                <li key={r.letter} className="avoid-break">
                  <b className="mr-1">{r.letter}</b>
                  {r.text}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs">
            <Ans>{q.qaMatch.answer}</Ans>
          </p>
        </Q>
      )}

      {q.dialogueOrder.length > 0 && (
        <Q title="⑤ 대화문 순서 배열" hint="처음 문장 다음에 이어질 순서대로 기호를 쓰세요.">
          <OrderList list={q.dialogueOrder} />
        </Q>
      )}

      {q.mainOrder.length > 0 && (
        <Q title="⑥ 본문 순서 배열" hint="처음 문장 다음에 이어질 순서대로 기호를 쓰세요.">
          <OrderList list={q.mainOrder} />
        </Q>
      )}

      {q.mainLabel.length > 0 && (
        <Q title="⑦ 본문 문법 요소" hint="문장을 바르게 설명한 것을 고르세요.">
          <LabelList items={q.mainLabel} />
        </Q>
      )}

      {q.moreOrder.length > 0 && (
        <Q title="⑧ More Reading 순서 배열" hint="처음 문장 다음에 이어질 순서대로 기호를 쓰세요.">
          <OrderList list={q.moreOrder} />
        </Q>
      )}

      {q.moreLabel.length > 0 && (
        <Q title="⑨ More Reading 문법 요소" hint="문장을 바르게 설명한 것을 고르세요.">
          <LabelList items={q.moreLabel} />
        </Q>
      )}
    </div>
  );
}

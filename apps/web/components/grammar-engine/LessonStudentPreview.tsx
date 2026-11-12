"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GRAMMAR_LEVEL_LABEL, GRAMMAR_QUESTION_KIND_LABEL, GRAMMAR_WRITTEN_KIND_LABEL, findWrongTokenIndex, type GrammarLesson } from "@/models/middle-naesin/grammar-lesson";
import { stripTags } from "@/lib/elevenlabs/mixedText";
import { acceptedAnswers, buildOptions, isCorrectAnswer } from "@/lib/grammar/gate";

// 학생이 보는 순서대로 레슨을 한 단계씩 돌려 보는 미리보기. 점수·기록은 저장하지 않는다.

function T({ children }: { children?: string }) {
  const parts = String(children ?? "").split(/\[b\](.+?)\[\/b\]/g);
  return <>{parts.map((x, i) => (i % 2 ? <b key={i}>{x}</b> : <span key={i}>{x}</span>))}</>;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const ok = "border-emerald-400 bg-emerald-50";
const bad = "border-rose-400 bg-rose-50";

function Box({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2 rounded-xl border bg-white p-4 text-sm">{children}</div>;
}

function Blank({ text, answer, hint }: { text: string; answer: string; hint?: string }) {
  const [v, setV] = useState("");
  const [done, setDone] = useState(false);
  const right = norm(v) === norm(answer);
  const [a, b] = text.split("___");
  return (
    <Box>
      <div>
        <T>{a}</T>
        <input value={v} onChange={(e) => setV(e.target.value)} disabled={done} className={`mx-1 w-32 rounded border px-2 py-0.5 ${done ? (right ? ok : bad) : ""}`} />
        <T>{b}</T>
      </div>
      {hint && <div className="text-xs text-neutral-500">힌트: {hint}</div>}
      {!done ? (
        <button onClick={() => setDone(true)} className="rounded-lg bg-neutral-900 px-3 py-1 text-xs text-white">확인</button>
      ) : (
        <div className={right ? "text-emerald-700" : "text-rose-700"}>{right ? "정답!" : `정답: ${answer}`}</div>
      )}
    </Box>
  );
}

function Fill({ q }: { q: GrammarLesson["drillFill"][number] }) {
  const [pick, setPick] = useState<string | null>(null);
  const right = pick !== null && norm(pick) === norm(q.answer);
  const [a, b] = q.sentence.split("___");
  const choices = q.choices ?? [];
  return (
    <Box>
      <div className="text-xs text-neutral-500">{GRAMMAR_LEVEL_LABEL[q.level]}</div>
      <div className="font-medium">
        <T>{a}</T>
        <span className={`mx-1 inline-block min-w-[4rem] rounded border px-2 ${pick === null ? "" : right ? ok : bad}`}>{pick ?? "＿＿"}</span>
        <T>{b}</T>
      </div>
      {q.ko && <div className="text-xs text-neutral-500">{q.ko}</div>}
      {q.hint && <div className="text-xs text-neutral-400">힌트: {q.hint}</div>}
      <div className="flex flex-wrap gap-2">
        {choices.map((c) => (
          <button key={c} disabled={pick !== null} onClick={() => setPick(c)} className="rounded-lg border px-3 py-1 hover:bg-neutral-50 disabled:opacity-60">{c}</button>
        ))}
      </div>
      {pick !== null && (
        <div className={right ? "text-emerald-700" : "text-rose-700"}>
          {right ? "정답!" : `오답 — 정답: ${q.answer}`} {q.noteKo && <span className="text-neutral-600">· {q.noteKo}</span>}
        </div>
      )}
    </Box>
  );
}

function Fix({ q }: { q: GrammarLesson["drillFix"][number] }) {
  const tokens = q.sentence.split(/\s+/);
  const wrongIdx = findWrongTokenIndex(q.sentence, q.wrong);
  const [tok, setTok] = useState<number | null>(null);
  const [fix, setFix] = useState("");
  const [fixed, setFixed] = useState<boolean | null>(null);
  const [reason, setReason] = useState<number | null>(null);
  const tokOk = tok === wrongIdx;
  return (
    <Box>
      <div className="text-xs text-neutral-500">{GRAMMAR_LEVEL_LABEL[q.level]} · 틀린 단어를 눌러 고치고 이유를 고르세요</div>
      <div className="flex flex-wrap gap-1.5 font-medium">
        {tokens.map((t, i) => (
          <button key={i} disabled={tok !== null} onClick={() => setTok(i)} className={`rounded border px-2 py-0.5 ${tok === i ? (tokOk ? ok : bad) : "hover:bg-neutral-50"}`}>{t}</button>
        ))}
      </div>
      {tok !== null && !tokOk && <div className="text-rose-700">틀린 단어는 “{q.wrong}” 입니다.</div>}
      {tokOk && fixed === null && (
        <div className="flex items-center gap-2">
          <input value={fix} onChange={(e) => setFix(e.target.value)} placeholder="고친 단어" className="w-40 rounded border px-2 py-0.5" />
          <button onClick={() => setFixed(q.correct.some((c) => norm(c) === norm(fix)))} className="rounded-lg bg-neutral-900 px-3 py-1 text-xs text-white">확인</button>
          {q.correct.includes("") && <button onClick={() => { setFix(""); setFixed(q.correct.includes("")); }} className="rounded-lg border px-3 py-1 text-xs">삭제</button>}
        </div>
      )}
      {fixed !== null && <div className={fixed ? "text-emerald-700" : "text-rose-700"}>{fixed ? "맞게 고쳤어요." : `정답: ${q.correct.map((c) => c || "(삭제)").join(" / ")}`}</div>}
      {fixed !== null && (
        <ul className="space-y-1">
          {q.reasonChoices.map((r, j) => (
            <li key={j}>
              <button
                disabled={reason !== null}
                onClick={() => setReason(j)}
                className={`w-full rounded border px-3 py-1.5 text-left ${reason === null ? "hover:bg-neutral-50" : j === q.reasonIndex ? ok : reason === j ? bad : "opacity-60"}`}
              >
                <T>{r}</T>
              </button>
            </li>
          ))}
        </ul>
      )}
      {reason !== null && q.ko && <div className="text-xs text-neutral-600">{q.ko}</div>}
    </Box>
  );
}

function Question({ q, n }: { q: GrammarLesson["questions"][number]; n: number }) {
  const [pick, setPick] = useState<number | null>(null);
  return (
    <Box>
      <div className="text-xs text-neutral-500">
        {n}. {GRAMMAR_LEVEL_LABEL[q.level]} · {GRAMMAR_QUESTION_KIND_LABEL[q.kind]}
      </div>
      <div className="whitespace-pre-wrap font-medium"><T>{q.stem}</T></div>
      {q.stemKo && <div className="text-xs text-neutral-500"><T>{q.stemKo}</T></div>}
      <ul className="space-y-1">
        {q.choices.map((c, j) => (
          <li key={j}>
            <button
              disabled={pick !== null}
              onClick={() => setPick(j)}
              className={`w-full rounded border px-3 py-1.5 text-left ${pick === null ? "hover:bg-neutral-50" : j === q.answerIndex ? ok : pick === j ? bad : "opacity-60"}`}
            >
              {q.kind === "count_wrong" ? "" : `${String.fromCharCode(65 + j)}. `}
              <T>{c.en}</T>
              {pick !== null && c.ko && <span className="ml-2 text-xs text-neutral-500"><T>{c.ko}</T></span>}
            </button>
          </li>
        ))}
      </ul>
      {pick !== null && (
        <div className={pick === q.answerIndex ? "text-emerald-700" : "text-rose-700"}>
          {pick === q.answerIndex ? "정답!" : "오답"} · <span className="text-neutral-700"><T>{q.explanationKo}</T></span>
        </div>
      )}
    </Box>
  );
}

// 칠판 한 줄: [b]…[/b] 는 노란 분필로 강조
function ChalkLine({ text }: { text: string }) {
  const parts = String(text ?? "").split(/\[b\](.+?)\[\/b\]/g);
  return <>{parts.map((x, i) => (i % 2 ? <span key={i} className="rounded bg-yellow-300/90 px-1 font-bold text-emerald-950">{x}</span> : <span key={i}>{x}</span>))}</>;
}

// 강의: 음성이 있으면 자동 재생 → 칠판이 한 줄씩 써지고 → 끝나면 다음 장면으로 저절로 넘어간다.
// 음성이 없으면 판서만 한 줄씩 써지고 "다음"으로 직접 넘긴다.
function Lecture({ segs }: { segs: NonNullable<GrammarLesson["lecture"]> }) {
  const [c, setC] = useState(0);
  const [shown, setShown] = useState(0); // 칠판에 써진 줄 수
  const [playing, setPlaying] = useState(false);
  const [needTap, setNeedTap] = useState(false); // 브라우저가 자동재생을 막았을 때
  const [subs, setSubs] = useState(true);
  const [finished, setFinished] = useState(false);
  const [t, setT] = useState(0); // 현재 재생 시간(초) — 음성에 문장별 시간(timings)이 있으면 자막·칠판을 이걸로 맞춘다
  const audioRef = useRef<HTMLAudioElement>(null);
  const seg = segs[c];
  const lines = seg.type === "board" ? seg.lines ?? [] : [];
  const hasAudioAny = segs.some((x) => x.audioUrl);
  const timings = seg.audioUrl && seg.timings && seg.timings.length > 0 ? seg.timings : null;
  // 칠판 줄은 문장 수에 비례해 문장 시작 시각에 나타난다. 시간 정보가 없으면 위의 일정 간격 방식을 쓴다.
  const lineStart = (k: number) => (timings ? timings[Math.min(timings.length - 1, Math.floor((k * timings.length) / Math.max(1, lines.length)))].start : 0);
  const shownEff = timings ? lines.filter((_, k) => lineStart(k) <= t + 0.05).length : shown;
  const curSent = timings ? Math.max(0, timings.findIndex((x, k) => t < x.end || k === timings.length - 1)) : -1;

  // 장면이 바뀌면 처음부터. 판서 줄 수를 음성 길이에 맞춰 나눠 쓴다(길이를 모르면 줄당 1.4초).
  useEffect(() => {
    setShown(0);
    setT(0);
    setFinished(false);
    setNeedTap(false);
    const el = audioRef.current;
    let timer: number | undefined;
    const startWriting = (durMs: number) => {
      if (lines.length === 0 || timings) return; // 시간 정보가 있으면 t 로 그린다
      const step = Math.max(900, Math.min(4000, durMs / (lines.length + 0.5)));
      let k = 0;
      const tick = () => {
        k += 1;
        setShown(k);
        if (k < lines.length) timer = window.setTimeout(tick, step);
      };
      timer = window.setTimeout(tick, 300);
    };
    if (seg.audioUrl && el) {
      el.src = seg.audioUrl;
      el.currentTime = 0;
      let started = false;
      const onMeta = () => { if (!started) { started = true; startWriting((el.duration || 0) * 1000 || lines.length * 1400); } };
      el.addEventListener("loadedmetadata", onMeta);
      el.play().then(() => setPlaying(true)).catch(() => { setPlaying(false); setNeedTap(true); });
      // 메타데이터가 안 오는 경우 대비
      const fb = window.setTimeout(onMeta, 1500);
      return () => { el.removeEventListener("loadedmetadata", onMeta); window.clearTimeout(fb); if (timer) window.clearTimeout(timer); el.pause(); };
    }
    setPlaying(false);
    startWriting(lines.length * 1400);
    return () => { if (timer) window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c]);

  const next = () => (c + 1 < segs.length ? setC(c + 1) : setFinished(true));
  const toggle = () => {
    const el = audioRef.current;
    if (!el || !seg.audioUrl) return;
    if (el.paused) el.play().then(() => { setPlaying(true); setNeedTap(false); }).catch(() => {});
    else { el.pause(); setPlaying(false); }
  };

  return (
    <div className="space-y-3">
      <audio ref={audioRef} onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onEnded={() => { setPlaying(false); setShown(lines.length); next(); }} preload="auto" />
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>
          강의 {c + 1} / {segs.length}
          {!hasAudioAny && " · 음성이 아직 없어 판서만 보여 줍니다."}
        </span>
        <button onClick={() => setSubs((v) => !v)} className="hover:text-neutral-800">자막 {subs ? "끄기" : "켜기"}</button>
      </div>

      {seg.type === "board" ? (
        <div className="min-h-[360px] rounded-2xl border-4 border-amber-900/70 bg-emerald-900 p-6 text-emerald-50 shadow-inner sm:min-h-[440px] sm:p-8">
          {seg.title && <div className="mb-4 border-b border-emerald-50/30 pb-3 text-lg font-bold text-yellow-200 sm:text-xl"><ChalkLine text={seg.title} /></div>}
          <ul className="space-y-3.5 text-[18px] font-medium leading-relaxed sm:text-[20px]">
            {lines.map((l, k) => (
              <li key={k} className={`transition-all duration-500 ${k < shownEff ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}>
                <ChalkLine text={l} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="min-h-[120px] rounded-2xl border bg-white p-5 text-lg font-medium leading-relaxed"><T>{seg.text}</T></div>
      )}

      {subs && (
        <div className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
          🔊{" "}
          {timings
            ? timings.map((x, k) => (
                <span key={k} className={k === curSent ? "rounded bg-yellow-100 px-0.5 font-medium text-neutral-900" : k < curSent ? "text-neutral-400" : ""}>{x.text}{" "}</span>
              ))
            : stripTags(seg.narration)}
        </div>
      )}

      {needTap && (
        <button onClick={toggle} className="w-full rounded-xl bg-violet-700 py-2.5 text-sm font-semibold text-white">▶ 눌러서 강의 듣기 (이후는 자동으로 넘어갑니다)</button>
      )}

      {finished ? (
        <div className="rounded-xl bg-emerald-50 px-4 py-2.5 text-center text-sm font-medium text-emerald-700">강의가 끝났어요. 아래 “다음 →”으로 계속하세요.</div>
      ) : (
        <div className="flex items-center gap-2">
          {seg.audioUrl && !needTap && (
            <button onClick={toggle} className="rounded-full bg-violet-100 px-3 py-1.5 text-sm font-semibold text-violet-700">{playing ? "⏸ 일시정지" : "▶ 재생"}</button>
          )}
          {c > 0 && <button onClick={() => setC(c - 1)} className="rounded-xl px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100">← 이전 장면</button>}
          <button onClick={next} className="ml-auto rounded-xl border px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50">건너뛰기 ▶</button>
        </div>
      )}
    </div>
  );
}

const shuffle = (a: string[]) => [...a].sort(() => Math.random() - 0.5);

// 문법 관문 규칙: 주관식 → (틀리면) 객관식 → (틀리면) 정답을 보고 다시 쓰기(감점). 미리보기에서는 점수를 저장하지 않는다.
function Popup({ q, n }: { q: NonNullable<GrammarLesson["popupQuiz"]>[number]; n: number }) {
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [v, setV] = useState("");
  const [done, setDone] = useState<null | "ok" | "assisted">(null);
  const [miss, setMiss] = useState(false);
  const options = useMemo(() => buildOptions(q, shuffle), [q]);
  const [a, b] = q.prompt.split("___");
  const answer = acceptedAnswers(q)[0];

  function submit() {
    if (isCorrectAnswer(q, v)) return setDone(stage === 0 ? "ok" : "assisted");
    setMiss(true);
    setV("");
    if (stage === 0) setStage(options.length > 0 ? 1 : 2);
  }

  return (
    <Box>
      <div className="text-xs text-neutral-500">팝업 퀴즈 {n}</div>
      <div className="font-medium">
        <T>{a}</T>
        <span className={`mx-1 inline-block min-w-[4rem] rounded border px-2 ${done ? ok : ""}`}>{done ? answer : "＿＿"}</span>
        <T>{b}</T>
      </div>
      {q.hint_ko && <div className="text-xs text-neutral-400">힌트: {q.hint_ko}</div>}
      {!done && stage === 0 && (
        <div className="flex gap-2">
          <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} className="w-40 rounded border px-2 py-0.5" placeholder="직접 쓰기" />
          <button onClick={submit} className="rounded-lg bg-neutral-900 px-3 py-1 text-xs text-white">확인</button>
        </div>
      )}
      {!done && stage === 1 && (
        <div className="space-y-1">
          <div className="text-rose-700">틀렸어요. 보기에서 골라 보세요.</div>
          <div className="flex flex-wrap gap-2">
            {options.map((o) => (
              <button key={o} onClick={() => (isCorrectAnswer(q, o) ? setDone("assisted") : setStage(2))} className="rounded-lg border px-3 py-1 hover:bg-neutral-50">{o}</button>
            ))}
          </div>
        </div>
      )}
      {!done && stage === 2 && (
        <div className="space-y-1">
          <div className="text-rose-700">정답은 <b>{answer}</b> 입니다. 정답을 보고 직접 다시 써 보세요.{miss && " (감점)"}</div>
          <div className="flex gap-2">
            <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} className="w-40 rounded border px-2 py-0.5" />
            <button onClick={submit} className="rounded-lg bg-neutral-900 px-3 py-1 text-xs text-white">확인</button>
          </div>
        </div>
      )}
      {done && <div className={done === "ok" ? "text-emerald-700" : "text-amber-700"}>{done === "ok" ? "정답! (+점수)" : "통과했어요. (실제 화면에서는 감점이 적용됩니다)"}</div>}
    </Box>
  );
}

const sentenceKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]/g, "").replace(/\s+/g, " ").trim();

function Written({ t, n }: { t: NonNullable<GrammarLesson["writtenTasks"]>[number]; n: number }) {
  const [v, setV] = useState("");
  const [res, setRes] = useState<boolean | null>(null);
  return (
    <Box>
      <div className="text-xs text-neutral-500">
        {n}. {GRAMMAR_LEVEL_LABEL[t.level]} · {GRAMMAR_WRITTEN_KIND_LABEL[t.kind]}
      </div>
      {t.prompt && <div className="font-medium"><T>{t.prompt}</T></div>}
      <div className="text-sm text-neutral-700"><T>{t.promptKo}</T></div>
      {t.kind === "order" && (
        <div className="flex flex-wrap gap-1.5">
          {(t.words ?? []).map((w, i) => <span key={i} className="rounded border bg-neutral-50 px-2 py-0.5">{w}</span>)}
        </div>
      )}
      <textarea value={v} onChange={(e) => setV(e.target.value)} disabled={res !== null} rows={2} className="w-full rounded-lg border p-2" placeholder="문장 전체를 쓰세요" />
      {res === null ? (
        <button onClick={() => setRes(t.answers.some((a) => sentenceKey(a) === sentenceKey(v)))} className="rounded-lg bg-neutral-900 px-3 py-1 text-xs text-white">확인</button>
      ) : (
        <div className={res ? "text-emerald-700" : "text-rose-700"}>
          {res ? "정답!" : "오답"} — 정답: {t.answers.join(" / ")} {t.noteKo && <span className="text-neutral-600">· {t.noteKo}</span>}
        </div>
      )}
    </Box>
  );
}

export default function LessonStudentPreview({ lesson }: { lesson: GrammarLesson }) {
  const ex = lesson.explanation;
  const hasLecture = (lesson.lecture?.length ?? 0) > 0;
  const steps = [
    { key: "lecture", label: "강의", show: hasLecture },
    { key: "explain", label: "설명", show: !hasLecture && (ex.rules.length > 0 || (lesson.exampleGroups?.length ?? 0) > 0) },
    { key: "summary", label: "요약", show: !!ex.summaryKo },
    { key: "popup", label: "팝업 퀴즈", show: (lesson.popupQuiz?.length ?? 0) > 0 },
    { key: "cram", label: "깜지", show: !!lesson.cramText.trim() },
    { key: "blanks", label: "설명 빈칸", show: lesson.blanks.length > 0 },
    { key: "fill", label: "Drill 빈칸", show: lesson.drillFill.length > 0 },
    { key: "fix", label: "Drill 고치기", show: lesson.drillFix.length > 0 },
    { key: "questions", label: "문제", show: lesson.questions.length > 0 },
    { key: "written", label: "서술형", show: (lesson.writtenTasks?.length ?? 0) > 0 },
  ].filter((s) => s.show);
  const [i, setI] = useState(0);
  const cur = steps[i];
  if (!cur) return <div className="rounded-xl border bg-white p-6 text-sm text-neutral-500">미리볼 내용이 없습니다. 섹션을 먼저 채워 주세요.</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {steps.map((s, k) => (
          <button key={s.key} onClick={() => setI(k)} className={`rounded-full border px-3 py-1 text-xs font-medium ${k === i ? "border-violet-500 bg-violet-50 text-violet-700" : "bg-white hover:bg-neutral-50"}`}>
            {k + 1}. {s.label}
          </button>
        ))}
      </div>

      <div key={cur.key} className="space-y-3">
        {cur.key === "explain" && (
          <>
            <h2 className="text-lg font-semibold">{ex.titleKo}</h2>
            <ol className="space-y-2">
              {ex.rules.map((r, k) => (
                <li key={k} className="rounded-xl border bg-white p-3 text-sm">
                  <div className="font-medium"><T>{r.en}</T></div>
                  <div className="text-neutral-600"><T>{r.ko}</T></div>
                </li>
              ))}
            </ol>
            {(lesson.exampleGroups ?? []).map((g, gi) => (
              <Box key={gi}>
                <div className="font-semibold">{g.title}</div>
                {g.note && <div className="text-xs text-violet-700">💡 {g.note}</div>}
                {g.examples.map((e, ei) => (
                  <div key={ei} className={`rounded px-2 py-1.5 ${e.wrong ? "bg-rose-50 text-rose-700" : "bg-emerald-50/40"}`}>
                    {e.wrong ? "✗ " : ""}
                    {e.tag && <span className="mr-1.5 rounded border bg-white px-1.5 py-0.5 text-[10px] font-bold text-neutral-600">{e.tag}</span>}
                    <T>{e.en}</T>
                    <span className="ml-2 text-xs text-neutral-500"><T>{e.ko}</T></span>
                    {e.note && <div className="text-[11px] text-neutral-500">{e.note}</div>}
                  </div>
                ))}
              </Box>
            ))}
          </>
        )}

        {cur.key === "summary" && (
          <Box>
            <h2 className="text-lg font-semibold">{ex.titleKo}</h2>
            <p className="font-medium">{ex.summaryEn}</p>
            <p className="text-sky-800">{ex.summaryKo}</p>
            <ul className="list-disc space-y-1 pl-5">
              {ex.rules.map((r, k) => <li key={k}><T>{r.ko}</T></li>)}
            </ul>
            <div className="space-y-1 pt-1">
              {ex.examples.map((e, k) => (
                <div key={k} className="rounded bg-emerald-50/50 px-2 py-1"><T>{e.en}</T> <span className="ml-2 text-xs text-neutral-500"><T>{e.ko}</T></span></div>
              ))}
            </div>
            {(lesson.examPoints?.length ?? 0) > 0 && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
                <div className="mb-1 text-xs font-bold text-sky-700">기출 유형</div>
                <ul className="space-y-1">{lesson.examPoints!.map((x, k) => <li key={k}><T>{x}</T></li>)}</ul>
              </div>
            )}
            {(lesson.topPoints?.length ?? 0) > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="mb-1 text-xs font-bold text-amber-700">1등급 포인트</div>
                <ul className="space-y-1.5">
                  {lesson.topPoints!.map((x, k) => (
                    <li key={k}>
                      <T>{x.text}</T>
                      {x.example && <div className="text-xs text-neutral-600"><T>{x.example.en}</T> <span className="ml-1 text-neutral-500"><T>{x.example.ko}</T></span></div>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(lesson.deepDive?.length ?? 0) > 0 && (
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                <div className="mb-1 text-xs font-bold text-violet-700">심화</div>
                <ul className="space-y-2">
                  {lesson.deepDive!.map((x, k) => (
                    <li key={k}>
                      <div className="font-medium"><T>{x.title}</T></div>
                      <div><T>{x.ko}</T></div>
                      {(x.examples ?? []).map((e, j) => <div key={j} className="text-xs text-neutral-600"><T>{e.en}</T> <span className="ml-1 text-neutral-500"><T>{e.ko}</T></span></div>)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Box>
        )}

        {cur.key === "cram" && (
          <Box>
            <div className="text-xs text-neutral-500">아래 문장을 그대로 따라 쓰세요. (미리보기는 입력을 저장하지 않습니다)</div>
            <pre className="whitespace-pre-wrap rounded-lg bg-neutral-50 p-3 font-sans"><T>{lesson.cramText}</T></pre>
            <textarea rows={5} placeholder="여기에 따라 쓰기" className="w-full rounded-lg border p-2" />
          </Box>
        )}

        {cur.key === "lecture" && <Lecture segs={lesson.lecture!} />}
        {cur.key === "popup" && lesson.popupQuiz!.map((q, k) => <Popup key={k} q={q} n={k + 1} />)}
        {cur.key === "written" && lesson.writtenTasks!.map((t, k) => <Written key={k} t={t} n={k + 1} />)}
        {cur.key === "blanks" && lesson.blanks.map((b, k) => <Blank key={k} {...b} />)}
        {cur.key === "fill" && lesson.drillFill.map((q, k) => <Fill key={k} q={q} />)}
        {cur.key === "fix" && lesson.drillFix.map((q, k) => <Fix key={k} q={q} />)}
        {cur.key === "questions" && lesson.questions.map((q, k) => <Question key={k} q={q} n={k + 1} />)}
      </div>

      <div className="flex justify-between pt-2">
        <button disabled={i === 0} onClick={() => setI(i - 1)} className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">← 이전</button>
        <button disabled={i === steps.length - 1} onClick={() => setI(i + 1)} className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">다음 →</button>
      </div>
    </div>
  );
}

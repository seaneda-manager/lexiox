"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ArcheryPhaser, { type ArcheryQuestion } from "@/components/workout/ArcheryPhaser";
import ArcheryFall from "@/components/workout/ArcheryFall";
import RaceGame from "@/components/workout/RaceGame";
import DriftGame from "@/components/workout/DriftGame";
import CockpitGame from "@/components/workout/CockpitGame";
import OmokGame, { type OmokLevel } from "@/components/workout/OmokGame";
import ClayGame from "@/components/workout/ClayGame";
import SprintGame from "@/components/workout/SprintGame";
import RescueGame from "@/components/workout/RescueGame";
import MemoryGame from "@/components/workout/MemoryGame";
import GameFrame from "@/components/workout/GameFrame";
import { ARCHERY_MODE_LABEL, DEMO_VOCAB, buildArcheryQuestions, type ArcheryMode, type ArcheryVocab } from "@/lib/workout/archeryQuestions";
import { loadMyStages, loadSetWords, type TrackInfo } from "@/lib/workout/loadStageWords";
import { groupOfStyle, isGameStyle, orientationOf, playHref, type GameStyle } from "@/lib/workout/gameCatalog";

function Player({ style }: { style: GameStyle }) {
  const router = useRouter();
  const group = groupOfStyle(style);
  const [mode, setMode] = useState<ArcheryMode>("en-en");
  const [round, setRound] = useState(0);
  const [assist, setAssist] = useState(false);
  const [omokLevel, setOmokLevel] = useState<OmokLevel>("normal");

  // 단어 범위: 데모 단어 / 내게 배정된 Day(실제 단어장). 배정이 없으면 선택지가 안 보인다.
  const [tracks, setTracks] = useState<TrackInfo[]>([]);
  const [setId, setSetId] = useState("");
  const [realVocab, setRealVocab] = useState<ArcheryVocab[] | null>(null);
  const [loadingWords, setLoadingWords] = useState(false);
  useEffect(() => {
    let alive = true;
    loadMyStages().then((t) => alive && setTracks(t));
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!setId) {
      setRealVocab(null);
      return;
    }
    let alive = true;
    setLoadingWords(true);
    loadSetWords(setId).then((v) => {
      if (!alive) return;
      setRealVocab(v);
      setLoadingWords(false);
    });
    return () => {
      alive = false;
    };
  }, [setId]);
  // 실제 단어가 너무 적으면(4개 미만) 데모로 대체하고, 오답 보기가 부족할 때는 데모 단어로 채운다
  const usingReal = !!realVocab && realVocab.length >= 4;
  const vocab: ArcheryVocab[] = usingReal ? realVocab! : DEMO_VOCAB;
  const extraPool: ArcheryVocab[] = usingReal && realVocab!.length < 16 ? DEMO_VOCAB : [];

  // 스펠링(빈칸) 문제는 활쏘기(매달린/날아가는 과녁)에서만 쓴다
  const spellingOk = style === "hang" || style === "fly";
  // 오목은 영어 단어의 철자를 모으므로 정답이 영어 단어인 문제(영영·한영)만 쓴다
  const noKoAnswer = style === "omok" || style === "rescue";
  const effMode: ArcheryMode = (!spellingOk && mode === "spelling") || (noKoAnswer && mode === "en-ko") ? "en-en" : mode;
  const usesMode = style !== "spell";

  // 모드·게임이 바뀌거나 다시 섞을 때마다 문제를 새로 만든다
  const questions = useMemo<ArcheryQuestion[]>(() => {
    const shuffled = [...vocab].sort(() => Math.random() - 0.5);
    if (style === "spell") {
      return shuffled.slice(0, 15).map((v, i) => ({ id: `sp-${i}`, prompt: v.ko, answer: v.word, choices: [] }));
    }
    const count = style === "rain" || style === "omok" || style === "sprint" || style === "rescue" ? 30 : style === "drift" || style === "driftcockpit" ? 12 : 10;
    return buildArcheryQuestions(shuffled.slice(0, count), effMode, extraPool);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effMode, style, round, vocab]);

  const pool = useMemo(() => [...vocab, ...extraPool].map((v) => (effMode === "en-ko" ? v.ko : v.word)), [effMode, vocab, extraPool]);

  const chip = (active: boolean, disabled = false) =>
    `px-4 py-2 rounded-full text-sm font-semibold transition ${
      disabled ? "bg-slate-800 text-slate-500 cursor-not-allowed" : active ? "bg-amber-400 text-slate-900" : "bg-slate-700 text-slate-200 hover:bg-slate-600"
    }`;

  const key = `${style}-${effMode}-${round}-${assist ? "a" : "n"}-${omokLevel}-${usingReal ? setId : "demo"}`;

  return (
    <main className="bg-slate-900 p-3 md:p-6 rounded-2xl">
      <div className="max-w-5xl mx-auto mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/workout/games" className="text-sm text-slate-300 hover:text-white underline-offset-2 hover:underline">
            ← 게임 목록
          </Link>
          <h1 className="text-white font-extrabold tracking-wide">{group.name}</h1>
          <span className="text-slate-400 text-sm">{group.subtitle}</span>
        </div>

        {group.modes.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 text-sm w-12">모드</span>
            {group.modes.map((m) => (
              <button key={m.style} className={chip(style === m.style)} onClick={() => router.replace(playHref(m.style))}>
                {m.label}
              </button>
            ))}
          </div>
        )}

        {(style === "drift" || style === "driftcockpit") && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 text-sm w-12">난이도</span>
            <button className={chip(!assist)} onClick={() => setAssist(false)}>
              일반
            </button>
            <button className={chip(assist)} onClick={() => setAssist(true)}>
              어시스트 (쉬움)
            </button>
            <span className="text-slate-400 text-xs">어시스트는 드리프트가 쉽게 걸리고 스핀·코스 이탈에 관대해요. 드리프트 점수는 ×0.7</span>
          </div>
        )}

        {(style === "omok" || style === "sprint" || style === "rescue" || style === "memory") && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 text-sm w-12">{style === "sprint" ? "상대" : style === "rescue" || style === "memory" ? "난이도" : "AI"}</span>
            {(["easy", "normal", "hard"] as OmokLevel[]).map((lv) => (
              <button key={lv} className={chip(omokLevel === lv)} onClick={() => setOmokLevel(lv)}>
                {lv === "easy" ? "쉬움" : lv === "normal" ? "보통" : "어려움"}
              </button>
            ))}
            <span className="text-slate-400 text-xs">
              {style === "sprint"
                ? "상대 선수의 속도 (쉬움 · 보통 · 어려움)"
                : style === "rescue"
                  ? "스테이지가 올라갈수록 어려워져요. 쉬움은 한 단계 낮게, 어려움은 한 단계 높게 시작해요"
                  : style === "memory"
                    ? "쉬움은 카드 4장부터·외우는 시간 1.3배, 어려움은 8장부터·0.8배로 시작해요"
                  : "AI도 철자 문제를 이 확률로 맞혀요 (50% / 72% / 90%)"}
            </span>
          </div>
        )}

        {tracks.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 text-sm w-12">단어</span>
            <select
              value={setId}
              onChange={(e) => setSetId(e.target.value)}
              className="rounded-full bg-slate-700 text-slate-100 text-sm font-semibold px-4 py-2 outline-none"
            >
              <option value="">데모 단어 (30개)</option>
              {tracks.map((t) => (
                <optgroup key={t.id} label={t.title}>
                  {t.stages.map((s) => (
                    <option key={s.setId} value={s.setId}>
                      Day {s.day} · {s.status === "COMPLETED" ? "완료" : s.status === "STARTED" ? "진행 중" : s.status === "ASSIGNED" ? "배정됨" : "예정"}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <span className="text-slate-400 text-xs">
              {loadingWords ? "단어 불러오는 중..." : setId ? (usingReal ? `내 단어 ${realVocab!.length}개로 게임해요` : "이 Day의 단어를 불러오지 못해 데모 단어로 대신해요") : "내 단어장 범위를 고르면 실제 단어로 게임해요"}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 text-sm w-12">문제</span>
          {(Object.keys(ARCHERY_MODE_LABEL) as ArcheryMode[]).map((m) => {
            const disabled = !usesMode || (!spellingOk && m === "spelling") || (noKoAnswer && m === "en-ko");
            return (
              <button key={m} disabled={disabled} className={chip(effMode === m && usesMode, disabled)} onClick={() => setMode(m)}>
                {ARCHERY_MODE_LABEL[m].label}
              </button>
            );
          })}
          <button className="ml-auto px-4 py-2 rounded-full text-sm bg-slate-700 text-slate-200 hover:bg-slate-600" onClick={() => setRound((r) => r + 1)}>
            ↻ 다시 섞기
          </button>
        </div>
      </div>

      <GameFrame orientation={orientationOf(style)}>
        {style === "memory" ? (
          <MemoryGame key={key} vocab={vocab} mode={effMode} level={omokLevel} stages={6} />
        ) : style === "rescue" ? (
          <RescueGame key={key} questions={questions} rounds={3} level={omokLevel} />
        ) : style === "clay" ? (
          <ClayGame key={key} questions={questions} />
        ) : style === "sprint" ? (
          <SprintGame key={key} questions={questions} level={omokLevel} />
        ) : style === "omok" ? (
          <OmokGame key={key} questions={questions} level={omokLevel} />
        ) : style === "cockpit" ? (
          <CockpitGame key={key} questions={questions} />
        ) : style === "drift" || style === "driftcockpit" ? (
          <DriftGame key={key} questions={questions} laps={2} gatesPerLap={6} assist={assist} view={style === "driftcockpit" ? "cockpit" : "top"} />
        ) : style === "trial" || style === "race" ? (
          <RaceGame key={key} questions={questions} mode={style} rows={10} />
        ) : style === "rain" || style === "spell" ? (
          <ArcheryFall
            key={key}
            kind={style === "rain" ? "words" : "letters"}
            questions={questions}
            pool={pool}
            titleSub={style === "rain" ? ARCHERY_MODE_LABEL[effMode].sub : undefined}
          />
        ) : (
          <ArcheryPhaser key={key} questions={questions} motion={style} titleSub={ARCHERY_MODE_LABEL[effMode].sub} />
        )}
      </GameFrame>
    </main>
  );
}

function PlayInner() {
  const params = useSearchParams();
  const raw = params.get("style");
  if (!isGameStyle(raw)) {
    return (
      <main className="p-6 text-slate-700">
        <p className="mb-3">게임을 찾을 수 없어요.</p>
        <Link href="/workout/games" className="text-amber-600 font-semibold underline">
          게임 목록으로
        </Link>
      </main>
    );
  }
  return <Player style={raw} />;
}

export default function WorkoutPlayPage() {
  return (
    <Suspense fallback={null}>
      <PlayInner />
    </Suspense>
  );
}

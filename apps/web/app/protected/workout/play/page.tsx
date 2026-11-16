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
import TetrisGame from "@/components/workout/TetrisGame";
import GameFrame from "@/components/workout/GameFrame";
import { ARCHERY_MODE_LABEL, DEMO_VOCAB, buildArcheryQuestions, type ArcheryMode, type ArcheryVocab } from "@/lib/workout/archeryQuestions";
import { loadMyStages, loadSetWords, type TrackInfo } from "@/lib/workout/loadStageWords";
import { usePerk } from "@/lib/workout/usePerk";
import { loadMyAssignments, reportAttempt, type MyAssignment } from "@/lib/workout/assignments";
import PerkLock from "@/components/workout/PerkLock";
import { groupOfStyle, isGameStyle, orientationOf, playHref, type GameStyle } from "@/lib/workout/gameCatalog";

function Player({ style, assignmentId, demo }: { style: GameStyle; assignmentId: string | null; demo: boolean }) {
  const router = useRouter();

  // 선생님이 내준 게임으로 들어왔다면 서버에서 확인한다(내 배정이고 아직 목표를 못 채웠을 때만 시간 차감 없이 열린다)
  const [asg, setAsg] = useState<MyAssignment | null>(null);
  const [asgLoading, setAsgLoading] = useState(!!assignmentId);
  const [bypass, setBypass] = useState(false);
  useEffect(() => {
    if (!assignmentId) return;
    let alive = true;
    loadMyAssignments().then((list) => {
      if (!alive) return;
      const a = list.find((x) => x.id === assignmentId && x.style === style) ?? null;
      setAsg(a);
      setBypass(!!a && !a.done); // 한 번 열리면 이 화면에서는 유지(마지막 판 결과 화면이 닫히지 않게)
      setAsgLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [assignmentId, style]);

  const [demoDone, setDemoDone] = useState(false);
  const perk = usePerk({ tick: !asgLoading && !bypass && !demo }); // 플레이 시간(보상) 확인 + 60초마다 1분 차감
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
    if (!asg) return;
    if (asg.setId) setSetId(asg.setId);
    if (["en-en", "ko-en", "en-ko", "spelling"].includes(asg.mode)) setMode(asg.mode as ArcheryMode);
    if (["easy", "normal", "hard"].includes(asg.level)) setOmokLevel(asg.level as OmokLevel);
  }, [asg]);
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
  const usingReal = !demo && !!realVocab && realVocab.length >= 4;
  // 체험(데모): 샘플 단어 10개로 한 판만
  const demoVocab = useMemo(() => [...DEMO_VOCAB].sort(() => Math.random() - 0.5).slice(0, 10), []);
  const vocab: ArcheryVocab[] = demo ? demoVocab : usingReal ? realVocab! : DEMO_VOCAB;
  const extraPool: ArcheryVocab[] = demo ? DEMO_VOCAB : usingReal && realVocab!.length < 16 ? DEMO_VOCAB : [];

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
      return shuffled.slice(0, demo ? 10 : 15).map((v, i) => ({ id: `sp-${i}`, prompt: v.ko, answer: v.word, choices: [] }));
    }
    const count = demo ? 10 : style === "rain" || style === "omok" || style === "sprint" || style === "rescue" || style === "tetris" ? 30 : style === "drift" || style === "driftcockpit" ? 12 : 10;
    return buildArcheryQuestions(shuffled.slice(0, count), effMode, extraPool);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effMode, style, round, vocab]);

  const pool = useMemo(() => [...vocab, ...extraPool].map((v) => (effMode === "en-ko" ? v.ko : v.word)), [effMode, vocab, extraPool]);

  const chip = (active: boolean, disabled = false) =>
    `px-4 py-2 rounded-full text-sm font-semibold transition ${
      disabled ? "bg-slate-800 text-slate-500 cursor-not-allowed" : active ? "bg-amber-400 text-slate-900" : "bg-slate-700 text-slate-200 hover:bg-slate-600"
    }`;

  // 한 판이 끝나면 결과를 기록하고, 내준 게임이면 진행 횟수를 올린다
  const onFinish = (result: object) => {
    if (demo) {
      window.setTimeout(() => setDemoDone(true), 7000); // 결과 화면을 잠깐 보여준 뒤 닫는다
      return;
    }
    reportAttempt({ style, setId: usingReal ? setId : null, assignmentId: asg?.id ?? null, mode: effMode, level: omokLevel, result: result as Record<string, unknown> });
    if (asg) setAsg((a) => (a ? { ...a, plays: a.plays + 1 } : a));
  };

  const key = `${style}-${effMode}-${round}-${assist ? "a" : "n"}-${omokLevel}-${usingReal ? setId : "demo"}`;

  // 게임은 보상: 시간이 없으면(숙제·학원 학습 전, 또는 오늘 시간을 다 씀) 잠금 화면. 플레이 중 시간이 0이 되면 게임이 닫힌다.
  if (!demo && (asgLoading || perk.state === "loading")) return <main className="p-6 text-slate-500 text-sm">게임 시간을 확인하는 중...</main>;
  if (!demo && !bypass && (perk.state === "locked" || perk.state === "login")) {
    return (
      <main className="p-4 md:p-6">
        <PerkLock perk={perk} />
      </main>
    );
  }

  // 테트리스는 옵션(모드·난이도·단어 범위·문제 방식)과 조작 설명을 오른쪽 사이드에 둔다
  const sideOptions = style === "tetris";
  const options = (
    <>
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

      {(style === "omok" || style === "sprint" || style === "rescue" || style === "memory" || style === "tetris") && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 text-sm w-12">{style === "sprint" ? "상대" : style === "rescue" || style === "memory" || style === "tetris" ? "난이도" : "AI"}</span>
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
                : style === "tetris"
                  ? "쉬움: 목숨 5·6줄·느리게 / 보통: 목숨 3·8줄 / 어려움: 목숨 2·10줄·빠르게"
                : style === "memory"
                  ? "쉬움은 카드 4장부터·외우는 시간 1.3배, 어려움은 8장부터·0.8배로 시작해요"
                : "AI도 철자 문제를 이 확률로 맞혀요 (50% / 72% / 90%)"}
          </span>
        </div>
      )}

      {asg?.note && <p className="text-amber-300 text-sm">선생님 메모: {asg.note}</p>}

      {!demo && (tracks.length > 0 || asg) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 text-sm w-12">단어</span>
          <select
            value={setId}
            onChange={(e) => setSetId(e.target.value)}
            disabled={!!asg}
            className="rounded-full bg-slate-700 text-slate-100 text-sm font-semibold px-4 py-2 outline-none"
          >
            <option value="">데모 단어 (30개)</option>
            {asg?.setId && !tracks.some((t) => t.stages.some((s) => s.setId === asg.setId)) && <option value={asg.setId}>{asg.setLabel ?? "내준 단어장"}</option>}
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
        <button disabled={demo} className="ml-auto px-4 py-2 rounded-full text-sm bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-40" onClick={() => setRound((r) => r + 1)}>
          ↻ 다시 섞기
        </button>
      </div>
    </>
  );

  const frame = (
    demo && demoDone ? (
        <div className="max-w-xl mx-auto rounded-2xl bg-slate-800 p-8 text-center text-slate-100">
          <p className="text-lg font-extrabold">체험 끝!</p>
          <p className="mt-2 text-sm text-slate-300">샘플 단어로 한 판 해봤어요. 숙제를 끝내거나 선생님이 게임을 내주면 내 단어로 계속 할 수 있어요.</p>
          <Link href="/workout/games" className="mt-5 inline-block rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-slate-900">
            게임 목록으로
          </Link>
        </div>
      ) : (
      <GameFrame orientation={orientationOf(style)}>
        {style === "tetris" ? (
          <TetrisGame onFinish={onFinish} key={key} questions={questions} level={omokLevel} stages={3} />
        ) : style === "memory" ? (
          <MemoryGame onFinish={onFinish} key={key} vocab={vocab} mode={effMode} level={omokLevel} stages={6} />
        ) : style === "rescue" ? (
          <RescueGame onFinish={onFinish} key={key} questions={questions} rounds={3} level={omokLevel} />
        ) : style === "clay" ? (
          <ClayGame onFinish={onFinish} key={key} questions={questions} />
        ) : style === "sprint" ? (
          <SprintGame onFinish={onFinish} key={key} questions={questions} level={omokLevel} />
        ) : style === "omok" ? (
          <OmokGame onFinish={onFinish} key={key} questions={questions} level={omokLevel} />
        ) : style === "cockpit" ? (
          <CockpitGame onFinish={onFinish} key={key} questions={questions} />
        ) : style === "drift" || style === "driftcockpit" ? (
          <DriftGame onFinish={onFinish} key={key} questions={questions} laps={2} gatesPerLap={6} assist={assist} view={style === "driftcockpit" ? "cockpit" : "top"} />
        ) : style === "trial" || style === "race" ? (
          <RaceGame onFinish={onFinish} key={key} questions={questions} mode={style} rows={10} />
        ) : style === "rain" || style === "spell" ? (
          <ArcheryFall
            onFinish={onFinish}
            key={key}
            kind={style === "rain" ? "words" : "letters"}
            questions={questions}
            pool={pool}
            titleSub={style === "rain" ? ARCHERY_MODE_LABEL[effMode].sub : undefined}
          />
        ) : (
          <ArcheryPhaser onFinish={onFinish} key={key} questions={questions} motion={style} titleSub={ARCHERY_MODE_LABEL[effMode].sub} />
        )}
      </GameFrame>
      )
  );

  return (
    <main className="bg-slate-900 p-3 md:p-6 rounded-2xl">
      <div className="max-w-5xl mx-auto mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/workout/games" className="text-sm text-slate-300 hover:text-white underline-offset-2 hover:underline">
            ← 게임 목록
          </Link>
          <h1 className="text-white font-extrabold tracking-wide">{group.name}</h1>
          <span className="text-slate-400 text-sm">{group.subtitle}</span>
          {demo ? (
            <span className="ml-auto rounded-full bg-sky-400 text-slate-900 text-xs font-bold px-3 py-1">체험판 · 샘플 단어 10개 · 1판</span>
          ) : bypass ? (
            <span className="ml-auto rounded-full bg-emerald-400 text-slate-900 text-xs font-bold px-3 py-1">
              선생님이 내준 게임 · {asg!.plays}/{asg!.targetPlays}판 · 시간 차감 없음
            </span>
          ) : perk.unlimited ? (
            <span className="ml-auto rounded-full bg-slate-700 text-slate-200 text-xs px-3 py-1">{perk.dev ? "개발 환경 · 잠금 우회" : "직원 미리보기 · 시간 제한 없음"}</span>
          ) : (
            <span className="ml-auto rounded-full bg-amber-400 text-slate-900 text-xs font-bold px-3 py-1">남은 게임 시간 {perk.balance}분</span>
          )}
        </div>

        {!sideOptions && options}
      </div>

      {sideOptions ? (
        <div className="max-w-5xl mx-auto flex flex-wrap items-start gap-4">
          {/* 게임이 먼저 자리를 차지하고, 옆에 자리가 남을 때만 사이드가 옆에 붙는다(좁으면 아래로) */}
          <div className="min-w-0 max-w-full">{frame}</div>
          <aside className="flex-1 min-w-[15rem] rounded-2xl bg-slate-800/70 p-3 flex flex-col gap-3">
            {options}
            <div className="rounded-xl bg-slate-900/70 p-3 text-xs text-slate-300 leading-relaxed">
              <p className="mb-1 font-bold text-slate-100">조작 (키보드)</p>
              <p>← → (A D) 이동</p>
              <p>↑ (W X Z) 회전</p>
              <p>↓ (S) 빠르게 내리기</p>
              <p>Space 한 번에 떨구기</p>
              <p>P pause권 사용</p>
            </div>
          </aside>
        </div>
      ) : (
        frame
      )}
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
  return <Player style={raw} assignmentId={params.get("assignment")} demo={params.get("demo") === "1"} />;
}

export default function WorkoutPlayPage() {
  return (
    <Suspense fallback={null}>
      <PlayInner />
    </Suspense>
  );
}

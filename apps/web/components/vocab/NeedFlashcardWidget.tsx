"use client";

// 학습 중 아무 때나 켤 수 있는 "필요 깜지" — 학생이 화면에 떠 있는 단어를 보면서
// 원하는 횟수만큼 철자/뜻을 직접 옮겨 적는 순수 연습용 위젯. 채점도, 저장도 하지 않는다
// (실물 깜지 종이를 화면 위에 띄운 것뿐이라 정답 데이터가 필요 없다).
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

let sharedAudioCtx: AudioContext | null = null;

function playTick() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    if (!sharedAudioCtx) sharedAudioCtx = new Ctx();
    const ctx = sharedAudioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 720;
    gain.gain.value = 0.05;
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch {
    // 오디오 재생 실패는 연습 자체를 막을 이유가 안 된다.
  }
}

type Row = { spelling: string; meaning: string };

export default function NeedFlashcardWidget() {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [repeatCount, setRepeatCount] = useState(3);
  const [rows, setRows] = useState<Row[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  function reset() {
    setStarted(false);
    setRows([]);
    setRepeatCount(3);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function start() {
    const n = Math.min(20, Math.max(1, repeatCount));
    setRows(Array.from({ length: n }, () => ({ spelling: "", meaning: "" })));
    setStarted(true);
  }

  function updateRow(idx: number, field: keyof Row, value: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
    playTick();
  }

  if (!mounted) return null;

  return createPortal(
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-[999] rounded-full bg-amber-500 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-amber-600 active:scale-95"
      >
        ✏️ 필요 깜지
      </button>

      {open && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">✏️ 필요 깜지</h2>
              <button
                type="button"
                onClick={close}
                className="text-sm text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {!started ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  지금 화면에 보이는 단어를 보면서 몇 번 써볼까요?
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={repeatCount}
                    onChange={(e) => setRepeatCount(Number(e.target.value) || 1)}
                    className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-center text-sm font-semibold"
                  />
                  <span className="text-sm text-slate-500">번</span>
                </div>
                <button
                  type="button"
                  onClick={start}
                  className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-white hover:bg-amber-600"
                >
                  시작하기
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-2 text-xs font-semibold text-slate-500">
                  <span></span>
                  <span>철자</span>
                  <span>뜻</span>
                </div>
                {rows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-[auto_1fr_1fr] items-center gap-2">
                    <span className="text-xs text-slate-400 w-4 text-right">{idx + 1}</span>
                    <input
                      type="text"
                      value={row.spelling}
                      onChange={(e) => updateRow(idx, "spelling", e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    />
                    <input
                      type="text"
                      value={row.meaning}
                      onChange={(e) => updateRow(idx, "meaning", e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={close}
                  className="mt-2 w-full rounded-xl bg-slate-800 py-3 text-sm font-bold text-white hover:bg-slate-900"
                >
                  완료
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>,
    document.body
  );
}

"use client";
// 마이크 확인: 권한 상태 · 음성 인식(Chrome) 지원 여부 · 말할 때 움직이는 음량 막대
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

type State = "idle" | "starting" | "on" | "denied" | "none" | "error";

export default function MicCheck({ className = "" }: { className?: string }) {
  const [state, setState] = useState<State>("idle");
  const [level, setLevel] = useState(0);
  const [heard, setHeard] = useState(false);
  const [sttOk, setSttOk] = useState(true);
  const [perm, setPerm] = useState<PermissionState | "unknown">("unknown");

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setSttOk(!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
    // 권한 상태를 미리 보여 준다(지원하지 않는 브라우저는 unknown 유지)
    (navigator as any).permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((p: PermissionStatus) => {
        setPerm(p.state);
        p.onchange = () => setPerm(p.state);
      })
      .catch(() => {});
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setLevel(0);
  }, []);

  useEffect(() => stop, [stop]);

  const start = async () => {
    setState("starting");
    setHeard(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AC();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
        const v = Math.min(1, peak / 64);
        setLevel(v);
        if (v > 0.15) setHeard(true);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      setState("on");
    } catch (e: any) {
      stop();
      const name = e?.name ?? "";
      if (name === "NotAllowedError" || name === "SecurityError") setState("denied");
      else if (name === "NotFoundError" || name === "OverconstrainedError") setState("none");
      else setState("error");
    }
  };

  const off = () => {
    stop();
    setState("idle");
  };

  const pct = Math.round(level * 100);

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-3 text-xs ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {state === "on" ? (
          <button onClick={off} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 font-semibold text-white">
            <MicOff className="h-3.5 w-3.5" /> 확인 끝내기
          </button>
        ) : (
          <button
            onClick={start}
            disabled={state === "starting"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-50"
          >
            <Mic className="h-3.5 w-3.5" /> {state === "starting" ? "마이크 연결 중…" : "마이크 확인"}
          </button>
        )}

        <span className="text-gray-500">
          권한:{" "}
          <b className={perm === "granted" ? "text-emerald-600" : perm === "denied" ? "text-rose-600" : "text-gray-700"}>
            {perm === "granted" ? "허용됨" : perm === "denied" ? "차단됨" : perm === "prompt" ? "아직 묻지 않음" : "확인 전"}
          </b>
        </span>
        <span className="text-gray-500">
          음성 인식: <b className={sttOk ? "text-emerald-600" : "text-rose-600"}>{sttOk ? "지원" : "미지원 (Chrome 사용)"}</b>
        </span>
      </div>

      {state === "on" && (
        <div className="mt-3 space-y-1.5">
          <div className="h-3 overflow-hidden rounded-full bg-gray-100">
            <div className={`h-full rounded-full transition-[width] duration-75 ${pct > 80 ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
          </div>
          <p className={heard ? "font-semibold text-emerald-700" : "text-gray-500"}>
            {heard ? "✓ 마이크가 잘 들려요. 이 상태로 녹음하면 됩니다." : "아무 말이나 해 보세요. 막대가 움직이면 정상입니다."}
          </p>
        </div>
      )}

      {state === "denied" && (
        <p className="mt-2 leading-relaxed text-rose-700">
          마이크가 차단되어 있어요. 주소창 왼쪽 <b>자물쇠 아이콘 → 마이크 → 허용</b>으로 바꾼 뒤 새로고침하세요. (Claude 앱 안의 브라우저 창에서는 마이크를 쓸 수 없어요. 일반 Chrome에서 열어 주세요.)
        </p>
      )}
      {state === "none" && <p className="mt-2 text-rose-700">마이크 장치를 찾지 못했어요. 마이크 연결과 Windows 소리 설정의 입력 장치를 확인해 주세요.</p>}
      {state === "error" && <p className="mt-2 text-rose-700">마이크를 열지 못했어요. 다른 프로그램이 마이크를 쓰고 있지 않은지 확인해 주세요.</p>}
    </div>
  );
}

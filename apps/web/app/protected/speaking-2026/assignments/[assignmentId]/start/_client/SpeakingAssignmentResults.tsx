"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

type RecordingResult = {
  itemId?: string;
  questionId?: string;
  audioDataUrl: string | null;
};

type ResultsPayload = {
  listenRepeat?: RecordingResult[];
  interview?: RecordingResult[];
};

type Props = {
  assignmentId: string;
  results?: ResultsPayload;
};

export default function SpeakingAssignmentResults({ assignmentId, results }: Props) {
  const router = useRouter();
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null);

  // Base64 DataURL을 Blob으로 변환
  const dataUrlToBlob = (dataUrl: string): Blob | null => {
    try {
      const arr = dataUrl.split(",");
      const mime = arr[0].match(/:(.*?);/)?.[1];
      const str = atob(arr[1]);
      const n = str.length;
      const u8arr = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        u8arr[i] = str.charCodeAt(i);
      }
      return new Blob([u8arr], { type: mime || "audio/webm" });
    } catch {
      return null;
    }
  };

  // audio urls 생성 (메모이제이션)
  const audioUrls = useMemo(() => {
    const urls: Record<string, string> = {};
    if (results?.listenRepeat) {
      results.listenRepeat.forEach((rec, idx) => {
        if (rec.audioDataUrl) {
          const blob = dataUrlToBlob(rec.audioDataUrl);
          if (blob) {
            urls[`lr-${idx}`] = URL.createObjectURL(blob);
          }
        }
      });
    }
    if (results?.interview) {
      results.interview.forEach((rec, idx) => {
        if (rec.audioDataUrl) {
          const blob = dataUrlToBlob(rec.audioDataUrl);
          if (blob) {
            urls[`iv-${idx}`] = URL.createObjectURL(blob);
          }
        }
      });
    }
    return urls;
  }, [results]);

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <div className="text-center space-y-2 mb-8">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-bold text-slate-900">시험 완료!</h1>
        <p className="text-sm text-slate-500">스피킹 테스트가 완료되었습니다.</p>
      </div>

      {/* Task 1 결과 */}
      {results?.listenRepeat && results.listenRepeat.length > 0 && (
        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-sky-100 px-3 py-0.5 text-xs font-semibold text-sky-700">Task 1</span>
            <h2 className="text-sm font-semibold text-slate-900">듣고 따라말하기 - 녹음</h2>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {results.listenRepeat.map((rec, idx) => (
              <div key={`lr-${idx}`} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                <span className="text-xs font-semibold text-slate-600 shrink-0">문장 {idx + 1}</span>
                {audioUrls[`lr-${idx}`] ? (
                  <audio
                    controls
                    src={audioUrls[`lr-${idx}`]}
                    className="flex-1 h-8"
                    onLoadStart={() => setLoadingAudio(`lr-${idx}`)}
                    onLoadedData={() => setLoadingAudio(null)}
                  />
                ) : (
                  <span className="text-xs text-slate-400">녹음 없음</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Task 2 결과 */}
      {results?.interview && results.interview.length > 0 && (
        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-violet-100 px-3 py-0.5 text-xs font-semibold text-violet-700">Task 2</span>
            <h2 className="text-sm font-semibold text-slate-900">인터뷰 - 녹음</h2>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {results.interview.map((rec, idx) => (
              <div key={`iv-${idx}`} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                <span className="text-xs font-semibold text-slate-600 shrink-0">질문 {idx + 1}</span>
                {audioUrls[`iv-${idx}`] ? (
                  <audio
                    controls
                    src={audioUrls[`iv-${idx}`]}
                    className="flex-1 h-8"
                    onLoadStart={() => setLoadingAudio(`iv-${idx}`)}
                    onLoadedData={() => setLoadingAudio(null)}
                  />
                ) : (
                  <span className="text-xs text-slate-400">녹음 없음</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* No results message */}
      {(!results || ((!results.listenRepeat || results.listenRepeat.length === 0) && (!results.interview || results.interview.length === 0))) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm text-amber-800">저장된 녹음이 없습니다.</p>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-3 justify-center pt-4">
        <button
          onClick={() => router.push("/speaking-2026/assignments")}
          className="rounded-xl border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          목록으로
        </button>
      </div>
    </main>
  );
}

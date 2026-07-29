"use client";

import React, { useEffect, useState } from "react";

type TrackWithSpeed = {
  id: string;
  name: string;
  speedTimeoutSeconds: number;
};

export default function SpeedSettingsClient() {
  const [tracks, setTracks] = useState<TrackWithSpeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 트랙 목록 불러오기
  useEffect(() => {
    async function fetchTracks() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/vocab/tracks-list");
        if (!res.ok) {
          throw new Error("Failed to fetch tracks");
        }

        const data = await res.json();
        setTracks(data.tracks || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchTracks();
  }, []);

  // 타이머 업데이트
  async function handleUpdate(trackId: string, newSeconds: number) {
    if (newSeconds < 2 || newSeconds > 30) {
      setError("타이머는 2~30초 사이여야 합니다");
      return;
    }

    try {
      setUpdating(trackId);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/vocab/speed-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId,
          speedTimeoutSeconds: newSeconds,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update speed settings");
      }

      // 로컬 상태 업데이트
      setTracks((prev) =>
        prev.map((t) =>
          t.id === trackId ? { ...t, speedTimeoutSeconds: newSeconds } : t
        )
      );

      setSuccess(`트랙 "${tracks.find((t) => t.id === trackId)?.name}"의 타이머가 ${newSeconds}초로 설정되었습니다`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center">
        <div className="text-slate-600">로딩 중...</div>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center">
        <div className="text-slate-600">사용 가능한 Track이 없습니다</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 font-semibold">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 font-semibold">
          ✅ {success}
        </div>
      )}

      <div className="grid gap-4">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="rounded-2xl border bg-white p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">{track.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{track.id}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-extrabold text-indigo-600">
                  {track.speedTimeoutSeconds}s
                </div>
                <div className="text-xs text-slate-500 mt-1">현재 설정</div>
              </div>
            </div>

            <div className="flex gap-2">
              {[3, 5, 6, 10, 15, 20, 30].map((seconds) => (
                <button
                  key={seconds}
                  onClick={() => handleUpdate(track.id, seconds)}
                  disabled={updating === track.id}
                  className={[
                    "px-3 py-2 text-sm font-semibold rounded-lg transition-colors",
                    track.speedTimeoutSeconds === seconds
                      ? "bg-indigo-600 text-white shadow"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {seconds}s
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-500 px-3 py-2 bg-slate-50 rounded-lg">
              💡 학생이 이 트랙의 Speed Challenge를 풀 때 타이머가{" "}
              <span className="font-semibold">{track.speedTimeoutSeconds}초</span>로
              설정됩니다
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

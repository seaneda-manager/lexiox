"use client";

import { useState } from "react";
import type { ExplanationSegment, ExplanationSegmentType, VideoSegmentContent, PausePoint } from "@/models/grammar/types";

type Props = {
  unitId: string;
  segments: ExplanationSegment[];
  onChange: (segments: ExplanationSegment[]) => void;
};

const TYPE_LABELS: Record<ExplanationSegmentType, string> = {
  text: "텍스트",
  animation: "애니메이션 (미지원)",
  blank: "빈칸",
  video: "📹 강의 영상",
  board: "🖊 판서",
};

const TYPE_COLORS: Record<ExplanationSegmentType, string> = {
  text:      "bg-gray-100 text-gray-600",
  animation: "bg-blue-100 text-blue-700",
  blank:     "bg-amber-100 text-amber-700",
  video:     "bg-indigo-100 text-indigo-700",
  board:     "bg-emerald-100 text-emerald-700",
};

export default function SegmentsEditor({ unitId, segments, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState<ExplanationSegmentType>("video");
  const [editingId, setEditingId] = useState<string | null>(null);

  // AI 강의 생성 (판서 + 음성)
  const [genOpen, setGenOpen] = useState(false);
  const [genVoiceId, setGenVoiceId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState<string | null>(null);

  // AI 설명 생성 (음성 없이)
  const [expGen, setExpGen] = useState(false);
  const [expMsg, setExpMsg] = useState<string | null>(null);

  const handleGenerateExplanation = async () => {
    const manualCount = segments.filter((s) => s.source === "manual").length;
    if (!confirm(`AI가 설명/예문/빈칸 세그먼트 초안을 생성해 채웁니다.${manualCount ? ` (🔒 유지 ${manualCount}개는 보존)` : ""}`)) return;
    setExpGen(true);
    setExpMsg(null);
    try {
      const res = await fetch(`/api/admin/grammar-2026/${unitId}/generate-explanation`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "생성 실패");
      onChange(data.segments ?? []);
      setExpMsg(`✅ 세그먼트 ${data.segmentCount}개 (유지 ${data.keptManual}개)`);
    } catch (e: any) {
      setExpMsg("❌ " + (e?.message ?? "오류"));
    } finally {
      setExpGen(false);
    }
  };

  const toggleSource = (id: string) =>
    onChange(segments.map((s) => (s.id === id ? { ...s, source: s.source === "manual" ? "ai" : "manual" } : s)));

  const handleGenerateLecture = async () => {
    if (!confirm("기존 설명 세그먼트를 AI가 만든 강의(판서 + 음성)로 교체합니다. 계속할까요?")) return;
    setGenerating(true);
    setGenMsg(null);
    try {
      const res = await fetch(`/api/admin/grammar-2026/${unitId}/generate-lecture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId: genVoiceId.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "생성 실패");
      onChange(data.segments ?? []);
      setGenMsg(
        `✅ 세그먼트 ${data.segmentCount}개 · 음성 ${data.audioCount}개 생성 (voice: ${data.voiceId})` +
          (data.failures?.length ? ` · 음성 실패 ${data.failures.length}개` : "")
      );
      setGenOpen(false);
    } catch (e: any) {
      setGenMsg("❌ " + (e?.message ?? "오류"));
    } finally {
      setGenerating(false);
    }
  };

  const update = (next: ExplanationSegment[]) => onChange(next);

  const hasVideo = segments.some((s) => s.type === "video");

  const handleAdd = () => {
    const id = `seg-${Date.now()}`;
    // 관리자가 직접 추가한 세그먼트는 manual → AI 재생성 시 보존
    const base = { id, unit_id: unitId, order_index: segments.length + 1, source: "manual" as const };
    let content: any;
    if (newType === "text")       content = { text: "" };
    else if (newType === "blank") content = { prompt: "", answer: "", hint_ko: "" };
    else if (newType === "video") content = { video_url: "", pause_points: [] } as VideoSegmentContent;
    else                          content = { key: "", duration_ms: 2000 };
    update([...segments, { ...base, type: newType, content }]);
    setAdding(false);
    setEditingId(id);
  };

  const handleUpdateContent = (id: string, content: any) =>
    update(segments.map((s) => s.id === id ? { ...s, content } : s));

  const handleDelete = (id: string) =>
    update(segments.filter((s) => s.id !== id));

  const handleMoveUp = (i: number) => {
    if (i === 0) return;
    const arr = [...segments];
    [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    update(arr.map((s, idx) => ({ ...s, order_index: idx + 1 })));
  };

  const handleMoveDown = (i: number) => {
    if (i >= segments.length - 1) return;
    const arr = [...segments];
    [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
    update(arr.map((s, idx) => ({ ...s, order_index: idx + 1 })));
  };

  return (
    <div className="space-y-3">
      {/* AI 설명 생성 (음성 없이) */}
      <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5 space-y-1.5">
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateExplanation}
            disabled={expGen}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
          >
            {expGen ? "생성 중…" : "🪄 AI 설명 생성"}
          </button>
          <span className="text-[10px] text-violet-700">
            주제·레벨·관리자 메모로 설명 / 예문 / 빈칸 팝업퀴즈 초안 생성. 🔒 유지 표시한 세그먼트는 보존.
          </span>
        </div>
        {expMsg && <p className="text-[11px] text-gray-700">{expMsg}</p>}
      </div>

      {/* AI 강의 생성 (판서 + 음성) */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGenOpen((v) => !v)}
            disabled={generating}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            {generating ? "생성 중… (1~2분)" : "🎬 AI 강의 생성 (판서 + 음성)"}
          </button>
          <span className="text-[10px] text-emerald-700">
            유닛 콘텐츠로 판서·내레이션·음성을 자동 생성해 설명 세그먼트를 교체합니다.
          </span>
        </div>
        {genOpen && (
          <div className="space-y-2 rounded-md bg-white/70 p-2">
            <label className="block text-[10px] text-gray-500">
              ElevenLabs Voice ID (선택 — 비우면 스톡 기본, 한/영 모두 읽는 multilingual 권장)
            </label>
            <input
              value={genVoiceId}
              onChange={(e) => setGenVoiceId(e.target.value)}
              placeholder="예: 21m00Tcm4TlvDq8ikWAM"
              className="w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
            <button
              onClick={handleGenerateLecture}
              disabled={generating}
              className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              생성 시작
            </button>
          </div>
        )}
        {genMsg && <p className="text-[11px] text-gray-700">{genMsg}</p>}
      </div>

      {segments.map((seg, i) => (
        <div key={seg.id} className="border rounded-xl bg-white overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b">
            <span className="text-[11px] text-gray-300 font-mono w-4">{i + 1}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[seg.type as ExplanationSegmentType] ?? "bg-gray-100 text-gray-500"}`}>
              {TYPE_LABELS[seg.type as ExplanationSegmentType] ?? seg.type}
            </span>
            <button
              onClick={() => toggleSource(seg.id)}
              title="관리자가 유지할 세그먼트로 잠그면 AI 재생성 시 보존됩니다"
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                seg.source === "manual"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-400 hover:bg-gray-200"
              }`}
            >
              {seg.source === "manual" ? "🔒 유지" : "AI"}
            </button>
            <div className="ml-auto flex items-center gap-0.5">
              <button onClick={() => handleMoveUp(i)} disabled={i === 0}
                className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs">↑</button>
              <button onClick={() => handleMoveDown(i)} disabled={i >= segments.length - 1}
                className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs">↓</button>
              <button onClick={() => setEditingId(editingId === seg.id ? null : seg.id)}
                className="px-2 py-1 text-[11px] text-indigo-500 hover:text-indigo-700">
                {editingId === seg.id ? "접기" : "편집"}
              </button>
              <button onClick={() => handleDelete(seg.id)}
                className="px-2 py-1 text-[11px] text-red-400 hover:text-red-600">삭제</button>
            </div>
          </div>

          {/* 미리보기 */}
          {editingId !== seg.id && (
            <p className="px-3 py-2 text-xs text-gray-500 truncate">
              {seg.type === "text"  && ((seg.content as any).text || <span className="italic text-gray-300">내용 없음</span>)}
              {seg.type === "blank" && ((seg.content as any).prompt || <span className="italic text-gray-300">문장 없음</span>)}
              {seg.type === "video" && (
                <span className="text-indigo-500">
                  {(seg.content as any).video_url
                    ? `🎬 ${(seg.content as any).video_url.split("/").at(-1)} — 빈칸 ${(seg.content as any).pause_points.length}개`
                    : <span className="italic text-gray-300">영상 URL 없음</span>}
                </span>
              )}
            </p>
          )}

          {/* 편집 폼 */}
          {editingId === seg.id && (
            <div className="px-3 py-3 space-y-3">
              {seg.type === "text" && (
                <textarea
                  value={(seg.content as any).text}
                  onChange={(e) => handleUpdateContent(seg.id, { text: e.target.value })}
                  rows={3}
                  placeholder="설명 텍스트..."
                  className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                  autoFocus
                />
              )}

              {seg.type === "blank" && (
                <div className="space-y-2">
                  <InlineInput label="문장 (빈칸 = ___)"
                    value={(seg.content as any).prompt}
                    onChange={(v) => handleUpdateContent(seg.id, { ...(seg.content as any), prompt: v })}
                    placeholder="명사가 단수이면 대명사도 ___이어야 한다."
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <InlineInput label="정답"
                      value={(seg.content as any).answer}
                      onChange={(v) => handleUpdateContent(seg.id, { ...(seg.content as any), answer: v })}
                      placeholder="단수"
                    />
                    <InlineInput label="힌트 (선택)"
                      value={(seg.content as any).hint_ko ?? ""}
                      onChange={(v) => handleUpdateContent(seg.id, { ...(seg.content as any), hint_ko: v })}
                      placeholder="단수 / 복수"
                    />
                  </div>
                </div>
              )}

              {seg.type === "video" && (
                <VideoSegmentEditor
                  content={seg.content as any}
                  onChange={(c) => handleUpdateContent(seg.id, c)}
                />
              )}
            </div>
          )}
        </div>
      ))}

      {/* 추가 */}
      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-2.5 border-2 border-dashed border-gray-200 text-xs text-gray-400 rounded-xl hover:border-indigo-300 hover:text-indigo-500 transition"
        >
          + 세그먼트 추가
        </button>
      ) : (
        <div className="border rounded-xl p-3 bg-indigo-50 space-y-2.5">
          <p className="text-xs font-medium text-indigo-700">추가할 유형</p>
          <div className="flex flex-wrap gap-2">
            {(["video", "text", "blank"] as ExplanationSegmentType[]).map((t) => (
              <button key={t} onClick={() => setNewType(t)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition
                  ${newType === t
                    ? "border-indigo-400 bg-white font-medium text-indigo-700"
                    : "border-indigo-200 text-gray-500 hover:bg-white"}`}>
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          {newType === "video" && hasVideo && (
            <p className="text-[10px] text-amber-600">⚠ 영상 세그먼트가 이미 있습니다. 하나만 사용을 권장합니다.</p>
          )}
          <div className="flex gap-2">
            <button onClick={handleAdd}
              className="px-4 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700">
              추가
            </button>
            <button onClick={() => setAdding(false)}
              className="px-3 py-1.5 text-xs text-gray-500">취소</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 영상 세그먼트 전용 에디터 ──────────────────────────────────
function VideoSegmentEditor({
  content,
  onChange,
}: {
  content: VideoSegmentContent;
  onChange: (c: VideoSegmentContent) => void;
}) {
  const addPausePoint = () => {
    const newPoint: PausePoint = {
      id: `pp-${Date.now()}`,
      timestamp_sec: 0,
      prompt: "",
      answer: "",
      hint_ko: "",
    };
    onChange({ ...content, pause_points: [...content.pause_points, newPoint] });
  };

  const updatePausePoint = (id: string, partial: Partial<PausePoint>) =>
    onChange({
      ...content,
      pause_points: content.pause_points.map((p) => p.id === id ? { ...p, ...partial } : p),
    });

  const deletePausePoint = (id: string) =>
    onChange({
      ...content,
      pause_points: content.pause_points.filter((p) => p.id !== id),
    });

  return (
    <div className="space-y-4">
      {/* 영상 URL */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1">영상 URL (mp4, YouTube 임베드 등)</p>
        <input
          value={content.video_url}
          onChange={(e) => onChange({ ...content, video_url: e.target.value })}
          placeholder="https://..."
          className="w-full text-sm border rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        {content.video_url && (
          <p className="text-[10px] text-green-600 mt-0.5">✓ URL 입력됨</p>
        )}
      </div>

      {/* 빈칸 타임스탬프 목록 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            빈칸 타임스탬프 ({content.pause_points.length}개)
          </p>
          <button
            onClick={addPausePoint}
            className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium"
          >
            + 추가
          </button>
        </div>

        {content.pause_points.length === 0 && (
          <p className="text-[11px] text-gray-300 italic py-2">
            타임스탬프를 추가하면 해당 시점에 영상이 멈추고 빈칸 문제가 등장합니다.
          </p>
        )}

        <div className="space-y-2.5">
          {content.pause_points
            .sort((a, b) => a.timestamp_sec - b.timestamp_sec)
            .map((pp) => (
              <div key={pp.id} className="border rounded-lg p-2.5 bg-amber-50 border-amber-100 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="shrink-0">
                    <p className="text-[10px] text-gray-400 mb-0.5">멈추는 시간 (초)</p>
                    <input
                      type="number"
                      min={0}
                      value={pp.timestamp_sec}
                      onChange={(e) => updatePausePoint(pp.id, { timestamp_sec: Number(e.target.value) })}
                      className="w-20 text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <div className="text-[10px] text-gray-300 mt-4">
                    {Math.floor(pp.timestamp_sec / 60)}:{String(pp.timestamp_sec % 60).padStart(2, "0")}
                  </div>
                  <button
                    onClick={() => deletePausePoint(pp.id)}
                    className="ml-auto text-[11px] text-red-400 hover:text-red-600 mt-3"
                  >
                    삭제
                  </button>
                </div>

                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">문장 (빈칸 = ___)</p>
                  <input
                    value={pp.prompt}
                    onChange={(e) => updatePausePoint(pp.id, { prompt: e.target.value })}
                    placeholder="주어가 단수이면 동사도 ___해야 한다."
                    className="w-full text-xs border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-gray-400 mb-0.5">정답</p>
                    <input
                      value={pp.answer}
                      onChange={(e) => updatePausePoint(pp.id, { answer: e.target.value })}
                      placeholder="단수"
                      className="w-full text-xs border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 mb-0.5">힌트 (선택)</p>
                    <input
                      value={pp.hint_ko ?? ""}
                      onChange={(e) => updatePausePoint(pp.id, { hint_ko: e.target.value })}
                      placeholder="단수 / 복수"
                      className="w-full text-xs border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function InlineInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-1">{label}</p>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full text-sm border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
    </div>
  );
}

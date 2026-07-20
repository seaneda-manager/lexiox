"use client";

import { useState, useRef, useCallback } from "react";
import type {
  SpeakingTest2026,
  SpeakingTaskListenRepeat2026,
  SpeakingTaskInterview2026,
  ImageRegion,
} from "@/models/speaking-2026";

type Props = {
  test: SpeakingTest2026;
  isLocked: boolean;
};

type UploadState = "idle" | "uploading" | "done" | "error";
type GenState = "idle" | "generating" | "preview" | "uploading" | "error";

// ── HuggingFace 이미지 생성 helper ─────────────────────────────────
async function generateImage(prompt: string): Promise<string> {
  const res = await fetch("/api/admin/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Generation failed");
  return data.imageUrl as string; // base64 data URL
}

// base64 dataURL → File 객체로 변환
function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

// ── 파일 업로드 helper ──────────────────────────────────────────────
async function uploadFile(file: File, folder: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  const res = await fetch("/api/admin/updated-speaking/upload", { method: "POST", body: form });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Upload failed");
  return data.url as string;
}

// ── Region Selector ────────────────────────────────────────────────
function RegionSelector({
  imageUrl,
  region,
  onChange,
  label,
}: {
  imageUrl: string;
  region?: ImageRegion;
  onChange: (r: ImageRegion) => void;
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<ImageRegion | null>(null);

  const toPercent = (e: React.MouseEvent): { x: number; y: number } => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const p = toPercent(e);
    setStart(p);
    setDragging(true);
    setPreview({ x: p.x, y: p.y, w: 0, h: 0 });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !start) return;
    const p = toPercent(e);
    setPreview({
      x: Math.min(start.x, p.x),
      y: Math.min(start.y, p.y),
      w: Math.abs(p.x - start.x),
      h: Math.abs(p.y - start.y),
    });
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (!dragging || !start) return;
    const p = toPercent(e);
    const r: ImageRegion = {
      x: Math.min(start.x, p.x),
      y: Math.min(start.y, p.y),
      w: Math.abs(p.x - start.x),
      h: Math.abs(p.y - start.y),
    };
    if (r.w > 1 && r.h > 1) {
      onChange(r);
    }
    setDragging(false);
    setStart(null);
    setPreview(null);
  };

  const active = preview ?? region;

  return (
    <div className="space-y-1">
      <p className="text-[11px] text-slate-500">{label} — 이미지 위에서 드래그해 영역 지정</p>
      <div
        ref={containerRef}
        className="relative select-none overflow-hidden rounded-lg border border-slate-200 cursor-crosshair"
        style={{ userSelect: "none" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => { if (dragging) { setDragging(false); setPreview(null); } }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="site map" className="w-full h-auto pointer-events-none" draggable={false} />
        {active && active.w > 0 && active.h > 0 && (
          <div
            className="absolute border-2 border-orange-500 bg-orange-400/20 pointer-events-none"
            style={{
              left: `${active.x}%`,
              top: `${active.y}%`,
              width: `${active.w}%`,
              height: `${active.h}%`,
            }}
          />
        )}
      </div>
      {region && (
        <p className="text-[10px] text-slate-400">
          현재: x={region.x.toFixed(1)}% y={region.y.toFixed(1)}% w={region.w.toFixed(1)}% h={region.h.toFixed(1)}%
        </p>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────
export default function SpeakingEditClient({ test: initial, isLocked }: Props) {
  const [test, setTest] = useState<SpeakingTest2026>(initial);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const listenRepeat = test.tasks.find((t) => t.type === "listen_repeat") as SpeakingTaskListenRepeat2026 | undefined;
  const interview = test.tasks.find((t) => t.type === "interview") as SpeakingTaskInterview2026 | undefined;

  const updateListenRepeat = (updater: (t: SpeakingTaskListenRepeat2026) => SpeakingTaskListenRepeat2026) =>
    setTest((prev) => {
      const next = structuredClone(prev);
      const idx = next.tasks.findIndex((t) => t.type === "listen_repeat");
      if (idx === -1) return prev;
      next.tasks[idx] = updater(next.tasks[idx] as SpeakingTaskListenRepeat2026);
      return next;
    });

  const updateInterview = (updater: (t: SpeakingTaskInterview2026) => SpeakingTaskInterview2026) =>
    setTest((prev) => {
      const next = structuredClone(prev);
      const idx = next.tasks.findIndex((t) => t.type === "interview");
      if (idx === -1) return prev;
      next.tasks[idx] = updater(next.tasks[idx] as SpeakingTaskInterview2026);
      return next;
    });

  // ── AI 이미지 생성 ────────────────────────────────────────────
  const [genState, setGenState] = useState<GenState>("idle");
  const [genPrompt, setGenPrompt] = useState("");
  const [genPreviewUrl, setGenPreviewUrl] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const defaultPrompt = listenRepeat
    ? `Top-down illustrated site map of a ${listenRepeat.situation}. Clearly labeled areas in English. Clean flat illustration style, simple colors, room layout with walls and doors visible. No people.`
    : "";

  const handleGenerate = async () => {
    const prompt = genPrompt || defaultPrompt;
    if (!prompt) return;
    setGenState("generating");
    setGenError(null);
    setGenPreviewUrl(null);
    try {
      const url = await generateImage(prompt);
      setGenPreviewUrl(url);
      setGenState("preview");
    } catch (e: any) {
      setGenError(e.message);
      setGenState("error");
    }
  };

  const handleUseGenerated = async () => {
    if (!genPreviewUrl) return;
    setGenState("uploading");
    try {
      const file = dataUrlToFile(genPreviewUrl, `sitemap-${Date.now()}.png`);
      const url = await uploadFile(file, "site-maps");
      updateListenRepeat((t) => ({ ...t, imageUrl: url }));
      setGenState("idle");
      setGenPreviewUrl(null);
      setSiteMapState("done");
    } catch (e: any) {
      setGenError(e.message);
      setGenState("error");
    }
  };

  // ── 이미지 업로드 ─────────────────────────────────────────────
  const [siteMapState, setSiteMapState] = useState<UploadState>("idle");
  const [gifState, setGifState] = useState<UploadState>("idle");

  // ── GIF 생성 ────────────────────────────────────────────────────
  const [spriteFile, setSpriteFile] = useState<File | null>(null);
  const [spriteRows, setSpriteRows] = useState("2");
  const [spriteCols, setSpriteCols] = useState("4");
  const [spriteDuration, setSpriteDuration] = useState("100");
  const [creatingGif, setCreatingGif] = useState(false);
  const [createdGifUrl, setCreatedGifUrl] = useState<string | null>(null);
  const [gifError, setGifError] = useState<string | null>(null);

  const handleCreateGif = async () => {
    if (!spriteFile) return;
    setCreatingGif(true);
    setGifError(null);
    setCreatedGifUrl(null);

    try {
      const form = new FormData();
      form.append("file", spriteFile);
      form.append("rows", spriteRows);
      form.append("cols", spriteCols);
      form.append("duration", spriteDuration);

      const res = await fetch("/api/admin/updated-speaking/create-gif", {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      setCreatedGifUrl(data.url);
    } catch (e: any) {
      setGifError(e.message);
    } finally {
      setCreatingGif(false);
    }
  };

  const handleUseCreatedGif = async () => {
    if (!createdGifUrl) return;
    updateInterview((t) => ({ ...t, interviewerGifUrl: createdGifUrl }));
    setSpriteFile(null);
    setCreatedGifUrl(null);
    setGifState("done");
  };

  const handleSiteMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSiteMapState("uploading");
    try {
      const url = await uploadFile(file, "site-maps");
      updateListenRepeat((t) => ({ ...t, imageUrl: url }));
      setSiteMapState("done");
    } catch {
      setSiteMapState("error");
    }
  };

  const handleGifUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGifState("uploading");
    try {
      const url = await uploadFile(file, "interviewer-gifs");
      updateInterview((t) => ({ ...t, interviewerGifUrl: url }));
      setGifState("done");
    } catch {
      setGifState("error");
    }
  };

  // ── 저장 ──────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaveState("saving");
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/updated-speaking/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Save failed");
      setSaveState("saved");
    } catch (e: any) {
      setSaveError(e.message);
      setSaveState("error");
    }
  }, [test]);

  if (isLocked) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
        🔒 이 시험은 Lock되어 수정할 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Task 1: Site Map 이미지 + 영역 지정 ── */}
      {listenRepeat && (
        <section className="space-y-5 rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-sky-100 px-3 py-0.5 text-xs font-semibold text-sky-700">Task 1</span>
            <h2 className="text-sm font-semibold text-slate-900">듣고 따라말하기 — Site Map</h2>
          </div>

          {/* AI 이미지 생성 */}
          <div className="space-y-3 rounded-lg border border-violet-100 bg-violet-50/50 p-4">
            <p className="text-xs font-semibold text-violet-700">✨ AI로 Site Map 생성 (HuggingFace)</p>
            <textarea
              rows={3}
              placeholder={defaultPrompt}
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value)}
              className="w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={genState === "generating" || genState === "uploading"}
                className="rounded-lg bg-violet-500 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-600 disabled:opacity-50"
              >
                {genState === "generating" ? "생성 중… (30초~2분)" : "생성하기"}
              </button>
              {genError && <p className="text-xs text-red-500">{genError}</p>}
            </div>

            {genPreviewUrl && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-600">생성된 이미지 미리보기</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={genPreviewUrl} alt="Generated site map" className="w-full rounded-lg border" />
                <div className="flex gap-2">
                  <button
                    onClick={handleUseGenerated}
                    disabled={genState === "uploading"}
                    className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {genState === "uploading" ? "저장 중…" : "이 이미지 사용"}
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={genState === "generating" || genState === "uploading"}
                    className="rounded-lg border px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    다시 생성
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 이미지 직접 업로드 */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">또는 직접 업로드</p>
            <div className="flex items-center gap-3">
              <label className={`cursor-pointer rounded-lg border px-4 py-2 text-xs font-medium
                ${siteMapState === "uploading" ? "opacity-50 pointer-events-none" : "hover:bg-slate-50"}`}>
                {siteMapState === "uploading" ? "업로드 중…" : siteMapState === "done" ? "이미지 변경" : "이미지 선택"}
                <input type="file" accept="image/*" className="hidden" onChange={handleSiteMapUpload} />
              </label>
              {siteMapState === "done" && <span className="text-xs text-emerald-600">✓ 업로드 완료</span>}
              {siteMapState === "error" && <span className="text-xs text-red-500">업로드 실패</span>}
              {listenRepeat.imageUrl && (
                <a href={listenRepeat.imageUrl} target="_blank" rel="noreferrer"
                  className="text-xs text-sky-600 underline">현재 이미지 보기</a>
              )}
            </div>
          </div>

          {/* 영역 지정 */}
          {listenRepeat.imageUrl && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-600">문장별 하이라이트 영역 지정</p>
              <div className="space-y-6">
                {listenRepeat.sentences.map((s, i) => (
                  <div key={s.id} className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-700">
                      문장 {i + 1}
                      {s.region && <span className="ml-2 text-[10px] font-normal text-emerald-600">✓ 영역 지정됨</span>}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">{s.text}</p>
                    <RegionSelector
                      imageUrl={listenRepeat.imageUrl!}
                      region={s.region}
                      label={`문장 ${i + 1}`}
                      onChange={(r) => updateListenRepeat((t) => {
                        const sentences = [...t.sentences];
                        sentences[i] = { ...sentences[i], region: r };
                        return { ...t, sentences };
                      })}
                    />
                    {s.region && (
                      <button
                        onClick={() => updateListenRepeat((t) => {
                          const sentences = [...t.sentences];
                          const { region: _, ...rest } = sentences[i];
                          sentences[i] = rest;
                          return { ...t, sentences };
                        })}
                        className="text-[10px] text-red-400 hover:text-red-600"
                      >
                        영역 삭제
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Task 2: 인터뷰어 GIF ── */}
      {interview && (
        <section className="space-y-5 rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-violet-100 px-3 py-0.5 text-xs font-semibold text-violet-700">Task 2</span>
            <h2 className="text-sm font-semibold text-slate-900">인터뷰 — 인터뷰어 애니메이션</h2>
          </div>

          {/* GIF 생성 섹션 */}
          <div className="space-y-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
            <p className="text-xs font-semibold text-emerald-700">✨ 스프라이트 시트로부터 GIF 생성</p>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">
                스프라이트 시트 (PNG/JPG)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSpriteFile(e.target.files?.[0] ?? null)}
                className="rounded-lg border bg-white px-3 py-2 text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium text-slate-600">행</label>
                <input
                  type="number"
                  value={spriteRows}
                  onChange={(e) => setSpriteRows(e.target.value)}
                  min="1"
                  className="w-full rounded-lg border bg-white px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">열</label>
                <input
                  type="number"
                  value={spriteCols}
                  onChange={(e) => setSpriteCols(e.target.value)}
                  min="1"
                  className="w-full rounded-lg border bg-white px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">간격(ms)</label>
                <input
                  type="number"
                  value={spriteDuration}
                  onChange={(e) => setSpriteDuration(e.target.value)}
                  min="10"
                  step="10"
                  className="w-full rounded-lg border bg-white px-2 py-1 text-xs"
                />
              </div>
            </div>

            <button
              onClick={handleCreateGif}
              disabled={!spriteFile || creatingGif}
              className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {creatingGif ? "생성 중…" : "GIF 생성"}
            </button>

            {gifError && <p className="text-xs text-red-500">{gifError}</p>}

            {createdGifUrl && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">생성된 GIF</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={createdGifUrl} alt="Created GIF" className="h-32 w-auto rounded-lg border" />
                <button
                  onClick={handleUseCreatedGif}
                  className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
                >
                  이 GIF 사용
                </button>
              </div>
            )}
          </div>

          {/* 직접 업로드 섹션 */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">또는 파일 직접 업로드</p>
            <div className="flex items-center gap-3">
              <label className={`cursor-pointer rounded-lg border px-4 py-2 text-xs font-medium
                ${gifState === "uploading" ? "opacity-50 pointer-events-none" : "hover:bg-slate-50"}`}>
                {gifState === "uploading" ? "업로드 중…" : gifState === "done" ? "파일 변경" : "파일 선택"}
                <input type="file" accept="image/*" className="hidden" onChange={handleGifUpload} />
              </label>
              {gifState === "done" && <span className="text-xs text-emerald-600">✓ 업로드 완료</span>}
              {gifState === "error" && <span className="text-xs text-red-500">업로드 실패</span>}
            </div>
          </div>

          {interview.interviewerGifUrl && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600">현재 사용 중인 GIF</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={interview.interviewerGifUrl}
                alt="Interviewer"
                className="h-48 w-auto rounded-xl border border-slate-200 object-cover"
              />
            </div>
          )}
        </section>
      )}

      {/* ── 저장 ── */}
      <div className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
        {saveError && <p className="text-xs text-red-500">{saveError}</p>}
        {saveState === "saved" && <p className="text-xs text-emerald-600">✓ 저장되었습니다.</p>}
        {saveState !== "saved" && saveState !== "error" && <div />}
        <button
          onClick={handleSave}
          disabled={saveState === "saving"}
          className="rounded-lg border border-slate-800 bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saveState === "saving" ? "저장 중…" : "저장"}
        </button>
      </div>
    </div>
  );
}

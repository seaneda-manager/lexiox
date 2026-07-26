"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGenerateSpeech } from "@/lib/elevenlabs/use-generate-speech";
import type {
  SpeakingTest2026,
  SpeakingTaskListenRepeat2026,
  SpeakingTaskInterview2026,
  ImageRegion,
} from "@/models/speaking-2026";

type Phase = "input" | "generating" | "edit" | "saving" | "saved";
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
  return data.imageUrl as string;
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

export default function SpeakingTestGeneratorClient() {
  const router = useRouter();
  const { generateAudio, loading: audioLoading } = useGenerateSpeech();
  const [phase, setPhase] = useState<Phase>("input");
  const [listenRepeatTopic, setListenRepeatTopic] = useState("");
  const [interviewTopic, setInterviewTopic] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<SpeakingTest2026 | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [sentenceAudioUrls, setSentenceAudioUrls] = useState<Record<string, string>>({});
  const [questionAudioUrls, setQuestionAudioUrls] = useState<Record<string, string>>({});
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  // ── 이미지 관련 상태 ────────────────────────────────────────────
  const [genState, setGenState] = useState<GenState>("idle");
  const [genPrompt, setGenPrompt] = useState("");
  const [genPreviewUrl, setGenPreviewUrl] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [siteMapState, setSiteMapState] = useState<UploadState>("idle");
  const [gifState, setGifState] = useState<UploadState>("idle");

  // ── GIF 생성 상태 ──────────────────────────────────────────────
  const [spriteFile, setSpriteFile] = useState<File | null>(null);
  const [spriteRows, setSpriteRows] = useState("2");
  const [spriteCols, setSpriteCols] = useState("4");
  const [spriteDuration, setSpriteDuration] = useState("100");
  const [creatingGif, setCreatingGif] = useState(false);
  const [createdGifUrl, setCreatedGifUrl] = useState<string | null>(null);
  const [gifCreateError, setGifCreateError] = useState<string | null>(null);

  // ── 추천 주제 상태 ──────────────────────────────────────────────
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicSuggestions, setTopicSuggestions] = useState<{
    listenRepeatTopic: string;
    interviewSuggestions: string[];
  } | null>(null);

  // 페이지 로드 시 추천 주제 가져오기
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setLoadingTopics(true);
        // 저장된 Speaking 시험이 이미 쓴 주제를 제외하고 받아온다.
        // 예전 엔드포인트는 하드코딩 프리셋에서 랜덤으로 뽑아 같은 주제가 반복됐다.
        const [lrRes, ivRes] = await Promise.all([
          fetch("/api/admin/updated-speaking/suggest-topics?bucket=listen_repeat"),
          fetch("/api/admin/updated-speaking/suggest-topics?bucket=interview"),
        ]);
        const lrData = await lrRes.json();
        const ivData = await ivRes.json();

        if (lrData.ok && ivData.ok) {
          setTopicSuggestions({
            listenRepeatTopic: lrData.topic,
            interviewSuggestions: ivData.suggestions,
          });
          setListenRepeatTopic(lrData.topic);
          setInterviewTopic(ivData.recommended);
        }
      } catch (e) {
        console.error("Failed to fetch topic suggestions:", e);
      } finally {
        setLoadingTopics(false);
      }
    };

    fetchSuggestions();
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!listenRepeatTopic.trim() || !interviewTopic.trim()) return;
    setError(null);
    setPhase("generating");
    try {
      const res = await fetch("/api/admin/updated-speaking/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listenRepeatTopic, interviewTopic }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Generation failed");
      const payload = data.payload as SpeakingTest2026;
      setTest(payload);
      setPhase("edit");
    } catch (e: any) {
      setError(e.message);
      setPhase("input");
    }
  }, [listenRepeatTopic, interviewTopic]);

  const handleSave = useCallback(async () => {
    if (!test) return;
    setError(null);
    setPhase("saving");
    try {
      // audioUrl을 test 객체에 병합
      const testToSave = structuredClone(test);
      const listenRepeatIdx = testToSave.tasks.findIndex((t) => t.type === "listen_repeat");
      if (listenRepeatIdx !== -1) {
        const listenRepeat = testToSave.tasks[listenRepeatIdx] as SpeakingTaskListenRepeat2026;
        listenRepeat.sentences = listenRepeat.sentences.map((s) => ({
          ...s,
          audioUrl: sentenceAudioUrls[s.id] || s.audioUrl || "",
        }));
        console.log('📝 Listen & Repeat sentences with audio:', listenRepeat.sentences.map(s => ({ id: s.id, hasAudio: !!sentenceAudioUrls[s.id] })));
      }

      const interviewIdx = testToSave.tasks.findIndex((t) => t.type === "interview");
      if (interviewIdx !== -1) {
        const interview = testToSave.tasks[interviewIdx] as SpeakingTaskInterview2026;
        interview.questions = interview.questions.map((q) => ({
          ...q,
          audioUrl: questionAudioUrls[q.id] || q.audioUrl || "",
        }));
        console.log('📝 Interview questions with audio:', interview.questions.map(q => ({ id: q.id, hasAudio: !!questionAudioUrls[q.id] })));
      }

      console.log('💾 Sending test to save:', { testId: test.id, sentenceAudioUrlsCount: Object.keys(sentenceAudioUrls).length });

      const res = await fetch("/api/admin/updated-speaking/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: testToSave }),
      });
      const data = await res.json();
      console.log('✅ Save response:', data);
      if (!data.ok) throw new Error(data.error ?? "Save failed");
      setSavedId(test.id);
      setPhase("saved");
      setTimeout(() => {
        router.push(`/admin/content/updated-speaking/${test.id}/edit`);
      }, 500);
    } catch (e: any) {
      console.error('❌ Save error:', e);
      setError(e.message);
      setPhase("edit");
    }
  }, [test, sentenceAudioUrls, questionAudioUrls, router]);

  // ── AI 이미지 생성 ────────────────────────────────────────────
  const defaultPrompt = test?.tasks.find(t => t.type === "listen_repeat")
    ? `Top-down illustrated site map of a ${(test?.tasks.find(t => t.type === "listen_repeat") as SpeakingTaskListenRepeat2026)?.situation || "place"}. Clearly labeled areas in English. Clean flat illustration style, simple colors, room layout with walls and doors visible. No people.`
    : "";

  const handleGenerateImage = async () => {
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
    if (!genPreviewUrl || !test) return;
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

  const handleCreateGif = async () => {
    if (!spriteFile) return;
    setCreatingGif(true);
    setGifCreateError(null);
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
      setGifCreateError(e.message);
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

  const handleGenerateAudio = async (id: string, text: string, type: "sentence" | "question") => {
    if (!text.trim()) return;
    setGeneratingIds((prev) => new Set([...prev, id]));
    try {
      console.log(`🎵 Generating ${type} audio for ${id}...`);
      const result = await generateAudio(text);
      if (result) {
        console.log(`✅ Generated ${type} audio:`, { id, url: result.url });
        if (type === "sentence") {
          setSentenceAudioUrls((prev) => {
            const updated = { ...prev, [id]: result.url };
            console.log(`📦 sentenceAudioUrls updated:`, Object.keys(updated).length, "items");
            return updated;
          });
        } else {
          setQuestionAudioUrls((prev) => {
            const updated = { ...prev, [id]: result.url };
            console.log(`📦 questionAudioUrls updated:`, Object.keys(updated).length, "items");
            return updated;
          });
        }
      } else {
        console.error(`❌ Failed to generate ${type} audio for ${id}`);
      }
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // ── helpers ────────────────────────────────────────────────────

  const updateListenRepeat = (updater: (t: SpeakingTaskListenRepeat2026) => SpeakingTaskListenRepeat2026) =>
    setTest((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const idx = next.tasks.findIndex((t) => t.type === "listen_repeat");
      if (idx === -1) return prev;
      next.tasks[idx] = updater(next.tasks[idx] as SpeakingTaskListenRepeat2026);
      return next;
    });

  const updateInterview = (updater: (t: SpeakingTaskInterview2026) => SpeakingTaskInterview2026) =>
    setTest((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const idx = next.tasks.findIndex((t) => t.type === "interview");
      if (idx === -1) return prev;
      next.tasks[idx] = updater(next.tasks[idx] as SpeakingTaskInterview2026);
      return next;
    });

  // ── saved 상태 ─────────────────────────────────────────────────

  if (phase === "saved") {
    return (
      <div className="space-y-4 text-center py-12">
        <div className="text-4xl">✅</div>
        <p className="text-sm font-semibold text-gray-800">시험이 저장되었습니다.</p>
        <p className="text-xs text-gray-500">편집 페이지로 이동 중…</p>
      </div>
    );
  }

  const listenRepeatTask = test?.tasks.find((t) => t.type === "listen_repeat") as SpeakingTaskListenRepeat2026 | undefined;
  const interviewTask = test?.tasks.find((t) => t.type === "interview") as SpeakingTaskInterview2026 | undefined;

  return (
    <div className="space-y-6">
      {/* Topic 입력 */}
      <section className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold">토픽 입력</h2>

        <div className="space-y-3">
          {/* Task 1 토픽 - 자동 선택 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">Task 1</span>
              <span className="text-xs font-medium text-slate-700">듣고 따라말하기 — 상황 (자동 선택)</span>
            </div>
            <div className="rounded-lg border bg-sky-50 px-3 py-2 text-sm text-slate-700 font-medium">
              {loadingTopics ? "주제 선택 중…" : listenRepeatTopic || "주제 준비 중…"}
            </div>
            <p className="text-[11px] text-slate-500">매번 다른 주제로 자동 생성됩니다.</p>
          </div>

          {/* Task 2 토픽 - 추천값 제시 */}
          <label className="block space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">Task 2</span>
              <span className="text-xs font-medium text-slate-700">인터뷰 — 주제 (선택 또는 수정)</span>
            </div>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:bg-gray-50"
              placeholder="주제를 선택하거나 입력하세요"
              value={interviewTopic}
              onChange={(e) => setInterviewTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              disabled={phase === "generating"}
              list="interview-topics"
            />
            <datalist id="interview-topics">
              {topicSuggestions?.interviewSuggestions.map((topic, idx) => (
                <option key={idx} value={topic} />
              ))}
            </datalist>
            {topicSuggestions && topicSuggestions.interviewSuggestions.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {topicSuggestions.interviewSuggestions.map((topic, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInterviewTopic(topic)}
                    className="text-[11px] rounded-lg bg-violet-100 px-2 py-1 text-violet-700 hover:bg-violet-200 font-medium"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            )}
          </label>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!listenRepeatTopic.trim() || !interviewTopic.trim() || phase === "generating"}
          className="w-full rounded-lg border border-orange-500 bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 disabled:opacity-50"
        >
          {phase === "generating" ? "생성 중…" : test ? "재생성" : "AI 생성"}
        </button>

        {phase === "generating" && (
          <p className="text-xs text-gray-500 animate-pulse">
            Claude가 Listen &amp; Repeat (7문장) + Interview (4문제) 생성 중입니다 (약 15-30초)…
          </p>
        )}
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </section>

      {test && phase !== "generating" && (
        <>
          {/* 시험 제목 */}
          <section className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
            <label className="text-xs font-semibold text-gray-700">시험 제목</label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={test.label}
              onChange={(e) => setTest((prev) => prev ? { ...prev, label: e.target.value } : prev)}
            />
          </section>

          {/* ── Task 1: Listen and Repeat ── */}
          {listenRepeatTask && (
            <section className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-sky-100 px-3 py-0.5 text-xs font-semibold text-sky-700">
                  Task 1
                </span>
                <span className="text-sm font-semibold text-gray-900">듣고 따라말하기 (Listen &amp; Repeat)</span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-xs">
                  <span className="text-gray-500">상황 (Situation)</span>
                  <input
                    className="mt-1 w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
                    value={listenRepeatTask.situation}
                    onChange={(e) => updateListenRepeat((t) => ({ ...t, situation: e.target.value }))}
                  />
                </label>
                <label className="block text-xs">
                  <span className="text-gray-500">상황 설명</span>
                  <input
                    className="mt-1 w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
                    value={listenRepeatTask.situationDescription ?? ""}
                    onChange={(e) => updateListenRepeat((t) => ({ ...t, situationDescription: e.target.value }))}
                  />
                </label>
              </div>

              {/* 현재 적용된 플로어플랜 (자동 또는 수동 생성 결과) */}
              {listenRepeatTask.imageUrl && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-600">현재 플로어플랜</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={listenRepeatTask.imageUrl} alt="Site map" className="w-full rounded-lg border" />
                </div>
              )}

              {/* AI 이미지 생성 (수동 재생성 / 프롬프트 커스터마이즈) */}
              <div className="space-y-3 rounded-lg border border-violet-100 bg-violet-50/50 p-4">
                <p className="text-xs font-semibold text-violet-700">✨ AI로 Site Map 재생성 (HuggingFace)</p>
                <textarea
                  rows={3}
                  placeholder={defaultPrompt}
                  value={genPrompt}
                  onChange={(e) => setGenPrompt(e.target.value)}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleGenerateImage}
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
                  {listenRepeatTask.imageUrl && (
                    <a href={listenRepeatTask.imageUrl} target="_blank" rel="noreferrer"
                      className="text-xs text-sky-600 underline">현재 이미지 보기</a>
                  )}
                </div>
              </div>

              {/* 영역 지정 */}
              {listenRepeatTask.imageUrl && (
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-slate-600">문장별 하이라이트 영역 지정</p>
                  <div className="space-y-6">
                    {listenRepeatTask.sentences.map((s, i) => (
                      <div key={s.id} className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-700">
                          문장 {i + 1}
                          {s.region && <span className="ml-2 text-[10px] font-normal text-emerald-600">✓ 영역 지정됨</span>}
                        </p>
                        <p className="text-xs text-slate-600 leading-relaxed">{s.text}</p>
                        <RegionSelector
                          imageUrl={listenRepeatTask.imageUrl!}
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

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600">문장 목록 ({listenRepeatTask.sentences.length}개)</p>
                {listenRepeatTask.sentences.map((s, i) => (
                  <div key={s.id} className="flex items-start gap-2">
                    <span className="mt-2 w-5 shrink-0 text-right text-xs text-gray-400">{i + 1}</span>
                    <textarea
                      rows={2}
                      className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
                      value={s.text}
                      onChange={(e) => updateListenRepeat((t) => {
                        const sentences = [...t.sentences];
                        sentences[i] = { ...sentences[i], text: e.target.value };
                        return { ...t, sentences };
                      })}
                    />
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-gray-400">말하기(초)</span>
                        <input
                          type="number"
                          className="w-14 rounded-lg border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
                          value={s.speakingSeconds}
                          onChange={(e) => updateListenRepeat((t) => {
                            const sentences = [...t.sentences];
                            sentences[i] = { ...sentences[i], speakingSeconds: Number(e.target.value) };
                            return { ...t, sentences };
                          })}
                        />
                      </div>
                      <button
                        onClick={() => handleGenerateAudio(s.id, s.text, "sentence")}
                        disabled={generatingIds.has(s.id) || audioLoading}
                        className="text-xs px-2 py-1 bg-sky-500 text-white rounded hover:bg-sky-600 disabled:bg-gray-400"
                      >
                        {generatingIds.has(s.id) ? "중..." : "🎤"}
                      </button>
                      {sentenceAudioUrls[s.id] && (
                        <audio
                          controls
                          src={sentenceAudioUrls[s.id]}
                          className="w-full max-w-xs"
                        />
                      )}
                    </div>
                    <button
                      onClick={() => updateListenRepeat((t) => ({
                        ...t,
                        sentences: t.sentences.filter((_, idx) => idx !== i),
                      }))}
                      className="mt-1.5 text-xs text-red-400 hover:text-red-600"
                    >✕</button>
                  </div>
                ))}
                <button
                  onClick={() => updateListenRepeat((t) => ({
                    ...t,
                    sentences: [...t.sentences, { id: `s${Date.now()}`, text: "", speakingSeconds: 10 }],
                  }))}
                  className="text-xs text-sky-600 hover:underline"
                >
                  + 문장 추가
                </button>
              </div>
            </section>
          )}

          {/* ── Task 2: Interview ── */}
          {interviewTask && (
            <section className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-violet-100 px-3 py-0.5 text-xs font-semibold text-violet-700">
                  Task 2
                </span>
                <span className="text-sm font-semibold text-gray-900">인터뷰 (Interview)</span>
                <span className="text-xs text-gray-400">{interviewTask.questions.length}문제 · 각 45초</span>
              </div>

              {/* 현재 적용된 인터뷰어 정지 사진 (AI 자동생성 결과) */}
              {interviewTask.interviewerImageUrl && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-600">
                    현재 인터뷰어 사진 {interviewTask.interviewerGender && `(${interviewTask.interviewerGender === "male" ? "남성" : "여성"})`}
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={interviewTask.interviewerImageUrl} alt="Interviewer" className="h-48 w-auto rounded-xl border object-cover" />
                </div>
              )}

              {/* GIF 생성 섹션 (선택 — 정지 사진 대신 애니메이션을 쓰고 싶을 때) */}
              <div className="space-y-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
                <p className="text-xs font-semibold text-emerald-700">✨ 스프라이트 시트로부터 GIF 생성 (선택)</p>
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
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  {creatingGif ? "생성 중…" : "GIF 생성"}
                </button>

                {gifCreateError && <p className="text-xs text-red-500">{gifCreateError}</p>}

                {createdGifUrl && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-600">생성된 GIF 미리보기</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={createdGifUrl} alt="Generated GIF" className="w-full rounded-lg border" />
                    <div className="flex gap-2">
                      <button
                        onClick={handleUseCreatedGif}
                        className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
                      >
                        이 GIF 사용
                      </button>
                      <button
                        onClick={handleCreateGif}
                        disabled={!spriteFile || creatingGif}
                        className="rounded-lg border px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        다시 생성
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* GIF 직접 업로드 */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">또는 직접 업로드</p>
                <div className="flex items-center gap-3">
                  <label className={`cursor-pointer rounded-lg border px-4 py-2 text-xs font-medium
                    ${gifState === "uploading" ? "opacity-50 pointer-events-none" : "hover:bg-slate-50"}`}>
                    {gifState === "uploading" ? "업로드 중…" : gifState === "done" ? "GIF 변경" : "GIF 선택"}
                    <input type="file" accept="image/gif" className="hidden" onChange={handleGifUpload} />
                  </label>
                  {gifState === "done" && <span className="text-xs text-emerald-600">✓ 업로드 완료</span>}
                  {gifState === "error" && <span className="text-xs text-red-500">업로드 실패</span>}
                  {interviewTask.interviewerGifUrl && (
                    <a href={interviewTask.interviewerGifUrl} target="_blank" rel="noreferrer"
                      className="text-xs text-violet-600 underline">현재 GIF 보기</a>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {interviewTask.questions.map((q, i) => (
                  <div key={q.id} className="flex items-start gap-2">
                    <span className="mt-2 w-5 shrink-0 text-right text-xs text-gray-400">Q{i + 1}</span>
                    <div className="flex-1 space-y-1">
                      <textarea
                        rows={2}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"
                        value={q.text}
                        onChange={(e) => updateInterview((t) => {
                          const questions = [...t.questions];
                          questions[i] = { ...questions[i], text: e.target.value };
                          return { ...t, questions };
                        })}
                      />
                      <input
                        className="w-full rounded-lg border px-3 py-1 text-xs text-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-300"
                        placeholder="주제 태그 (e.g. education, technology)"
                        value={q.topic ?? ""}
                        onChange={(e) => updateInterview((t) => {
                          const questions = [...t.questions];
                          questions[i] = { ...questions[i], topic: e.target.value };
                          return { ...t, questions };
                        })}
                      />
                      {questionAudioUrls[q.id] && (
                        <audio
                          controls
                          src={questionAudioUrls[q.id]}
                          className="w-full"
                        />
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-gray-400">말하기(초)</span>
                        <input
                          type="number"
                          className="w-14 rounded-lg border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
                          value={q.speakingSeconds}
                          onChange={(e) => updateInterview((t) => {
                            const questions = [...t.questions];
                            questions[i] = { ...questions[i], speakingSeconds: Number(e.target.value) };
                            return { ...t, questions };
                          })}
                        />
                      </div>
                      <button
                        onClick={() => handleGenerateAudio(q.id, q.text, "question")}
                        disabled={generatingIds.has(q.id) || audioLoading}
                        className="text-xs px-2 py-1 bg-violet-500 text-white rounded hover:bg-violet-600 disabled:bg-gray-400"
                      >
                        {generatingIds.has(q.id) ? "중..." : "🎤"}
                      </button>
                    </div>
                    <button
                      onClick={() => updateInterview((t) => ({
                        ...t,
                        questions: t.questions.filter((_, idx) => idx !== i),
                      }))}
                      className="mt-1.5 text-xs text-red-400 hover:text-red-600"
                    >✕</button>
                  </div>
                ))}
                <button
                  onClick={() => updateInterview((t) => ({
                    ...t,
                    questions: [...t.questions, { id: `q${Date.now()}`, text: "", topic: "", speakingSeconds: 45 }],
                  }))}
                  className="text-xs text-violet-600 hover:underline"
                >
                  + 질문 추가
                </button>
              </div>
            </section>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-gray-400">
              {savedId ? `저장됨 (ID: ${savedId.slice(0, 8)}…)` : "아직 저장되지 않았습니다."}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/admin/content/updated-speaking")}
                className="rounded-lg border px-4 py-2 text-xs font-medium hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={phase === "saving"}
                className="rounded-lg border border-orange-500 bg-orange-500 px-4 py-2 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {phase === "saving" ? "저장 중…" : "저장 &amp; 완료"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

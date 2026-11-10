"use client";

import { useRef, useState } from "react";

const GEMINI_PROMPT = `아래는 영어 단어 목록 CSV입니다 (열: id, text, meanings).
각 줄마다 다음 두 가지를 만들어 주세요.

1) pron: 한국인이 읽는 한글 발음 표기 (예: decline → 디클라인, justification → 저스티피케이션).
   두 단어 이상이면 단어 사이를 띄어 쓰기. 한글과 공백만 사용.
2) pos: meanings 안의 각 뜻([0], [1], …)마다 품사를 하나씩, 같은 순서로 "|"로 이어서 쓰기.
   사용 가능한 품사: 명사, 동사, 형용사, 부사, 전치사, 접속사, 대명사, 감탄사, 관사, 조동사, 숙어
   (여러 단어로 굳은 표현은 숙어, 뜻이 "~하다"면 동사, "~한/적인"이면 형용사처럼 한국어 뜻으로 판단)
   뜻이 3개면 품사도 반드시 3개. 예: 동사|명사

출력은 설명 없이 CSV 코드블록 하나만. 헤더 없이 한 줄에 하나, 열은 id,pron,pos 순서.
id는 입력의 id를 그대로 복사하세요 (절대 바꾸지 말 것).
예)
3f2c...-....,디클라인,동사|명사

[여기에 CSV 내용을 붙여넣기]`;

export default function VocabEnrichPage() {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [model, setModel] = useState("claude-haiku-4-5-20251001");
  const stopRef = useRef(false);

  const [pasted, setPasted] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  async function run() {
    setRunning(true);
    stopRef.current = false;
    let lastRemaining = Infinity;
    try {
      while (!stopRef.current) {
        const r = await fetch("/api/admin/vocab/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 40, model }),
        });
        const j = await r.json();
        if (!j.ok) {
          setLog((l) => [`오류: ${j.error}`, ...l]);
          break;
        }
        setRemaining(j.remaining);
        setLog((l) => [`처리 ${j.processed}개 / 건너뜀 ${j.skipped ?? 0}개 / 남음 ${j.remaining}개`, ...l]);
        if (j.remaining === 0 || j.remaining >= lastRemaining) break; // 끝났거나 진전이 없으면 중단
        lastRemaining = j.remaining;
      }
    } finally {
      setRunning(false);
    }
  }

  async function upload() {
    setUploading(true);
    setUploadResult(null);
    try {
      const r = await fetch("/api/admin/vocab/enrich/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pasted }),
      });
      const j = await r.json();
      setUploadResult(j);
      if (j.ok) {
        setRemaining(j.remaining);
        if (j.problemCount === 0) setPasted("");
      }
    } catch (e: any) {
      setUploadResult({ ok: false, error: e?.message ?? "업로드 실패" });
    } finally {
      setUploading(false);
    }
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(GEMINI_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 복사 실패 시 아래 텍스트를 직접 선택 */
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <h1 className="text-xl font-bold text-slate-900">단어 품사 · 한글 발음 생성</h1>
      <p className="text-sm text-slate-600">
        아직 처리되지 않은 단어에 뜻별 품사와 한글 발음을 채웁니다. 학생 학습 화면에 바로 반영됩니다. (먼저 DB 마이그레이션
        적용 필요) {remaining !== null && <b className="ml-1">남은 단어: {remaining}</b>}
      </p>

      {/* 방법 A: Gemini 등 외부 도구 (API 비용 없음) */}
      <section className="space-y-3 rounded-2xl border p-4">
        <h2 className="font-bold text-slate-900">방법 A · Gemini로 만들어서 올리기 (API 비용 없음)</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>
            단어 목록 CSV를 받습니다:{" "}
            <a className="font-semibold text-blue-600 underline" href="/api/admin/vocab/enrich/export?limit=300">
              300개 내려받기
            </a>{" "}
            (올린 단어는 빠지고, 다음 목록은 그다음 300개)
          </li>
          <li>
            Gemini에 아래 프롬프트를 붙이고, 그 뒤에 CSV 내용을 붙여 넣습니다.{" "}
            <button type="button" onClick={copyPrompt} className="rounded border px-2 py-0.5 text-xs font-semibold">
              {copied ? "복사됨 ✓" : "프롬프트 복사"}
            </button>
          </li>
          <li>Gemini가 준 CSV(id,pron,pos)를 아래에 붙여 넣고 올립니다.</li>
        </ol>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{GEMINI_PROMPT}</pre>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={8}
          placeholder="Gemini 결과(id,pron,pos)를 여기에 붙여 넣으세요"
          className="w-full rounded-lg border p-3 font-mono text-xs"
        />
        <button
          type="button"
          disabled={uploading || !pasted.trim()}
          onClick={upload}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white disabled:opacity-50"
        >
          {uploading ? "올리는 중…" : "검증하고 저장"}
        </button>
        {uploadResult && (
          <div className="rounded-lg border p-3 text-sm">
            {uploadResult.ok ? (
              <>
                <p className="font-semibold text-slate-900">
                  받은 줄 {uploadResult.received}개 · 저장 {uploadResult.saved}개 · 문제 {uploadResult.problemCount}개 · 남은 단어{" "}
                  {uploadResult.remaining}개
                </p>
                {uploadResult.problems?.length > 0 && (
                  <ul className="mt-2 max-h-40 list-disc space-y-0.5 overflow-auto pl-5 text-xs text-rose-700">
                    {uploadResult.problems.map((p: string, i: number) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="font-semibold text-rose-700">{uploadResult.error}</p>
            )}
          </div>
        )}
      </section>

      {/* 방법 B: Claude API 자동 (비용 발생) */}
      <section className="space-y-3 rounded-2xl border p-4">
        <h2 className="font-bold text-slate-900">방법 B · AI(Claude API)로 자동 생성 (API 비용 발생)</h2>
        <p className="text-sm text-slate-600">40개씩 반복 실행합니다. 중간에 멈춰도 이어서 할 수 있어요.</p>
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-700 mb-2">모델 선택:</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="model"
                  value="claude-haiku-4-5-20251001"
                  checked={model === "claude-haiku-4-5-20251001"}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={running}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">Haiku 4.5 (가장 저렴, 권장)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="model"
                  value="claude-sonnet-4-6"
                  checked={model === "claude-sonnet-4-6"}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={running}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">Sonnet 4.6 (더 정확함)</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={running}
              onClick={run}
              className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-50"
            >
              {running ? "생성 중…" : "생성 시작"}
            </button>
            {running && (
              <button type="button" onClick={() => (stopRef.current = true)} className="rounded-lg border px-4 py-2">
                멈춤
              </button>
            )}
          </div>
        </div>
        <ul className="space-y-1 text-sm text-slate-700">
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

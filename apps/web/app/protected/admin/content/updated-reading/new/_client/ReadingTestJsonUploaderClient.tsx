"use client";

import { useState } from "react";
import type { RReadingTest2026 } from "@/models/reading";

type UploadState =
  | { status: "idle" }
  | { status: "parsing" }
  | { status: "uploading" }
  | { status: "success"; id: string; label: string }
  | { status: "error"; message: string };

export default function ReadingTestJsonUploaderClient() {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setState({ status: "parsing" });

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      // 업로드된 JSON을 RReadingTest2026 으로 간주
      const incoming = json as RReadingTest2026;

      // meta 보정 (examEra 없으면 기본값)
      const meta = incoming.meta ?? ({} as any);

      const fixedTest: RReadingTest2026 = {
        ...incoming,
        meta: {
          ...meta,
          id: meta.id || "updated-reading-uploaded",
          label: meta.label || "Uploaded Reading 2026 Test",
          examEra: meta.examEra ?? "ibt_2026",
        },
      };

      setState({ status: "uploading" });

      // 🔥 여기서 서버가 원하는 형태로 보내야 함 → { test: RReadingTest2026 }
      const res = await fetch("/api/admin/updated-reading/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: fixedTest }),
      });

      if (!res.ok) {
        let extra = "";
        try {
          const errJson = await res.json();
          extra = errJson?.error || JSON.stringify(errJson);
        } catch {
          // ignore
        }
        throw new Error(
          `SAVE FAILED (${res.status}) ${extra ? "- " + extra : ""}`
        );
      }

      setState({
        status: "success",
        id: fixedTest.meta.id,
        label: fixedTest.meta.label,
      });
    } catch (err: any) {
      console.error("JSON UPLOAD ERROR", err);
      setState({
        status: "error",
        message: err?.message || "파일 처리 중 오류가 발생했습니다.",
      });
    }
  }

  return (
    <div className="space-y-3 text-xs">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 px-4 py-6 text-center hover:border-emerald-500 hover:bg-emerald-50">
        <span className="mb-1 font-semibold text-emerald-800">
          JSON 파일 선택하기
        </span>
        <span className="mb-2 text-[11px] text-emerald-700">
          RReadingTest2026 구조의 JSON 파일을 업로드하세요.
        </span>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-emerald-700 shadow-sm">
          {fileName ?? "클릭해서 파일 선택"}
        </span>
        <input
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>

      {state.status === "parsing" && (
        <p className="text-[11px] text-gray-600">JSON 파싱 중...</p>
      )}
      {state.status === "uploading" && (
        <p className="text-[11px] text-gray-600">
          Supabase에 저장 중입니다...
        </p>
      )}
      {state.status === "success" && (
        <div className="rounded-md bg-emerald-50 p-2 text-[11px] text-emerald-900">
          <p className="font-semibold">저장 완료 ✅</p>
          <p>
            ID:{" "}
            <code className="rounded bg-white px-1">{state.id}</code>
          </p>
          <p>
            Label: <span className="font-medium">{state.label}</span>
          </p>
          <p className="mt-1 text-[10px] text-emerald-800">
            목록 페이지에서 방금 저장된 시험을 확인할 수 있습니다.
          </p>
        </div>
      )}
      {state.status === "error" && (
        <div className="rounded-md bg-rose-50 p-2 text-[11px] text-rose-900">
          <p className="font-semibold">오류 ❌</p>
          <p>{state.message}</p>
        </div>
      )}
    </div>
  );
}

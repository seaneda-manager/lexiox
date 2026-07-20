"use client";

import { useRef, useState, useTransition } from "react";
import Avatar from "./Avatar";
import { uploadAvatar, removeAvatar, selectPresetAvatar } from "@/actions/profile";

// 프리셋 — 이모지 기반 (이미지 파일 없이 바로 사용 가능)
const PRESETS = [
  { id: "wizard",   emoji: "🧙", label: "Wizard" },
  { id: "knight",   emoji: "⚔️", label: "Knight" },
  { id: "archer",   emoji: "🏹", label: "Archer" },
  { id: "mage",     emoji: "🔮", label: "Mage" },
  { id: "dragon",   emoji: "🐉", label: "Dragon" },
  { id: "fox",      emoji: "🦊", label: "Fox" },
  { id: "owl",      emoji: "🦉", label: "Owl" },
  { id: "cat",      emoji: "🐱", label: "Cat" },
  { id: "robot",    emoji: "🤖", label: "Robot" },
  { id: "alien",    emoji: "👾", label: "Alien" },
  { id: "ninja",    emoji: "🥷", label: "Ninja" },
  { id: "astronaut",emoji: "👨‍🚀", label: "Astronaut" },
];

interface AvatarEditorProps {
  name: string | null;
  avatarUrl: string | null;
}

type Tab = "upload" | "preset";

export default function AvatarEditor({ name, avatarUrl }: AvatarEditorProps) {
  const [tab, setTab] = useState<Tab>("preset");
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const currentUrl = avatarUrl ?? null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setSelectedEmoji(null);
  }

  function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("avatar", file);
    setError(null);
    startTransition(async () => {
      const res = await uploadAvatar(fd);
      if (res.error) setError(res.error);
      else setPreview(null);
    });
  }

  function handlePresetSelect(emoji: string) {
    setSelectedEmoji(emoji);
    // 이모지를 SVG Data URL로 변환해서 저장
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${emoji}</text></svg>`;
    const url = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    startTransition(async () => {
      const res = await selectPresetAvatar(url);
      if (res.error) setError(res.error);
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const res = await removeAvatar();
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* 현재 아바타 미리보기 */}
      <div className="relative">
        <Avatar name={name} avatarUrl={preview ?? currentUrl} size="xl" />
        {(preview ?? currentUrl) && (
          <button
            onClick={handleRemove}
            disabled={isPending}
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-600"
            title="아바타 제거"
          >
            ×
          </button>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setTab("preset")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "preset" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          캐릭터 선택
        </button>
        <button
          onClick={() => setTab("upload")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "upload" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          이미지 업로드
        </button>
      </div>

      {/* 프리셋 탭 */}
      {tab === "preset" && (
        <div className="grid grid-cols-6 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePresetSelect(p.emoji)}
              disabled={isPending}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all hover:border-blue-400 ${
                selectedEmoji === p.emoji ? "border-blue-500 bg-blue-50" : "border-transparent"
              }`}
              title={p.label}
            >
              <span className="text-3xl">{p.emoji}</span>
              <span className="text-xs text-gray-500">{p.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* 업로드 탭 */}
      {tab === "upload" && (
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <label className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition-colors">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <p className="text-sm text-gray-500">클릭하여 이미지 선택</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF · 최대 2MB</p>
          </label>
          {preview && (
            <button
              onClick={handleUpload}
              disabled={isPending}
              className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
            >
              {isPending ? "저장 중..." : "저장"}
            </button>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
      {isPending && !error && <p className="text-sm text-gray-400">저장 중...</p>}
    </div>
  );
}

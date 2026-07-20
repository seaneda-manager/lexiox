// apps/web/components/speaking/SpeakingRunner2026.tsx
"use client";

type Props = {
  test: any;
  onFinish?: (result: any) => { ok: true } | Promise<{ ok: true }>;
};

export default function SpeakingRunner2026({ test, onFinish }: Props) {
  return (
    <div className="rounded border border-dashed p-4 text-sm text-gray-500">
      SpeakingRunner2026 placeholder – 나중에 녹음/타이머 붙일 예정
    </div>
  );
}

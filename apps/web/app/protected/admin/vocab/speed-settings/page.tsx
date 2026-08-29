// apps/web/app/(protected)/admin/vocab/speed-settings/page.tsx
import SpeedSettingsClient from "./_client/SpeedSettingsClient";

export default function AdminVocabSpeedSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl p-6 space-y-4">
      <div className="rounded-2xl border bg-white p-5">
        <div className="text-2xl font-extrabold">Speed Challenge 설정</div>
        <div className="mt-2 text-sm text-slate-600">
          Vocab Track별 Speed Challenge 타이머(2~30초)와 버전(정식/간략)을 설정합니다
        </div>
      </div>

      <SpeedSettingsClient />
    </div>
  );
}

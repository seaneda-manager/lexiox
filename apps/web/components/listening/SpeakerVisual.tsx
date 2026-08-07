"use client";

type SpeakerTaskKind = "choose_response" | "conversation" | "announcement" | "academic_talk";

interface SpeakerVisualProps {
  taskKind: SpeakerTaskKind;
  illustrationUrl?: string;
  size?: number;
}

/** illustrationUrl이 없을 때 쓰는 사람 실루엣 placeholder (테마 색상, 이모지 대신). */
function PersonPlaceholder({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        backgroundColor: "#EEF1F6",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="#B9C2D0">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      </svg>
    </div>
  );
}

/**
 * 지문 유형별로 화면에 표시할 화자 이미지.
 * conversation은 2명, choose_response/announcement/academic_talk는 1명이 등장한다 (실제 ETS와 동일).
 * illustrationUrl이 있으면 그 이미지를 그대로 쓰고(생성된 합성 이미지), 없으면 자리표시 실루엣을 보여준다.
 */
export default function SpeakerVisual({ taskKind, illustrationUrl, size = 220 }: SpeakerVisualProps) {
  if (illustrationUrl) {
    return (
      <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
        <img
          src={illustrationUrl}
          alt=""
          style={{ width: size, height: size, objectFit: "cover", backgroundColor: "#EEF1F6" }}
        />
      </div>
    );
  }

  if (taskKind === "conversation") {
    const half = size * 0.55;
    return (
      <div style={{ display: "flex", gap: 12 }}>
        <PersonPlaceholder size={half} />
        <PersonPlaceholder size={half} />
      </div>
    );
  }

  return <PersonPlaceholder size={size} />;
}

"use client";

interface SpeakingVisualProps {
  imageUrl?: string;
  region?: { x: number; y: number; w: number; h: number };
  /** true면 사람 실루엣(인터뷰어), false면 일반 이미지 placeholder(사이트맵) */
  isPerson?: boolean;
  size?: number;
}

/** illustrationUrl이 없을 때 쓰는 placeholder (테마 색상, 이모지 대신). */
function Placeholder({ isPerson, size }: { isPerson: boolean; size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        backgroundColor: "#EEF1F6",
        display: "flex",
        alignItems: isPerson ? "flex-end" : "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {isPerson ? (
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="#B9C2D0">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
        </svg>
      ) : (
        <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="none" stroke="#B9C2D0" strokeWidth={1.5}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      )}
    </div>
  );
}

/** Listen&Repeat 사이트맵 이미지 또는 Interview 인터뷰어 사진을 렌더링. 없으면 실루엣 placeholder. */
export default function SpeakingVisual({ imageUrl, region, isPerson = false, size = 260 }: SpeakingVisualProps) {
  if (!imageUrl) return <Placeholder isPerson={isPerson} size={size} />;

  return (
    <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
      <img
        src={imageUrl}
        alt=""
        style={{ width: size, height: size, objectFit: "cover", backgroundColor: "#EEF1F6" }}
      />
      {region && (
        <div
          style={{
            position: "absolute",
            pointerEvents: "none",
            left: `${region.x}%`,
            top: `${region.y}%`,
            width: `${region.w}%`,
            height: `${region.h}%`,
            border: "3px solid #0073E6",
            backgroundColor: "rgba(0,115,230,0.15)",
            borderRadius: 4,
            transition: "all 0.3s",
          }}
        />
      )}
    </div>
  );
}

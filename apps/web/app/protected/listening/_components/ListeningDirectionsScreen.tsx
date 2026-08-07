"use client";

import ListeningTestLayout2026, { ListeningHeaderLabel, ListeningSubHeaderLabel } from "@/components/listening/ListeningTestLayout2026";
import VolumeControl from "@/components/listening/VolumeControl";

interface ListeningDirectionsScreenProps {
  onNext: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
}

const nextButtonStyle: React.CSSProperties = {
  height: 32,
  padding: "0 16px",
  fontSize: 12,
  fontWeight: 700,
  border: "none",
  borderRadius: 4,
  backgroundColor: "#0073E6",
  color: "#FFFFFF",
  cursor: "pointer",
};

export default function ListeningDirectionsScreen({
  onNext,
  volume,
  onVolumeChange,
}: ListeningDirectionsScreenProps) {
  return (
    <ListeningTestLayout2026
      headerLeft={<ListeningHeaderLabel />}
      headerRight={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
          <button onClick={onNext} style={nextButtonStyle}>
            Begin &gt;
          </button>
        </div>
      }
      subHeaderLeft={<ListeningSubHeaderLabel />}
    >
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 20 }}>
        Listening Section
      </h2>

      <p style={{ fontSize: 15, lineHeight: 1.7, color: "#333", marginBottom: 12 }}>
        In the listening section, you will answer 35–45 questions to demonstrate how well you
        understand spoken English. There are three types of tasks.
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24, fontSize: 14 }}>
        <thead>
          <tr>
            <th style={{ backgroundColor: "#1A2B4C", color: "#FFFFFF", textAlign: "left", padding: "10px 14px", fontWeight: 700 }}>
              Type of Task
            </th>
            <th style={{ backgroundColor: "#1A2B4C", color: "#FFFFFF", textAlign: "left", padding: "10px 14px", fontWeight: 700 }}>
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid #E0E0E0" }}>
            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#222" }}>
              Listen and Choose a Response
            </td>
            <td style={{ padding: "10px 14px", color: "#333" }}>
              Select the best response to the question or statement.
            </td>
          </tr>
          <tr style={{ borderBottom: "1px solid #E0E0E0" }}>
            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#222" }}>
              Conversations
            </td>
            <td style={{ padding: "10px 14px", color: "#333" }}>
              Answer questions about short conversations.
            </td>
          </tr>
          <tr>
            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#222" }}>
              Announcements and Academic Talks
            </td>
            <td style={{ padding: "10px 14px", color: "#333" }}>
              Answer questions about announcements and academic talks.
            </td>
          </tr>
        </tbody>
      </table>

      <p style={{ fontSize: 15, color: "#333" }}>
        You <strong>WILL NOT</strong> be able to return to previous questions.
      </p>
    </ListeningTestLayout2026>
  );
}

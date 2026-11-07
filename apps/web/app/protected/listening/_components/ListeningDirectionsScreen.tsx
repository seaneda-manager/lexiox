"use client";

import { useContext } from "react";

import ListeningTestLayout2026, { ListeningHeaderLabel, ListeningSubHeaderLabel, useListeningTx, ListeningStudyContext } from "@/components/listening/ListeningTestLayout2026";
import VolumeControl from "@/components/listening/VolumeControl";

interface ListeningDirectionsScreenProps {
  onNext: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
}

const nextButtonStyle: React.CSSProperties = {
  height: 36,
  padding: "0 18px",
  fontSize: 13,
  fontWeight: 700,
  border: "none",
  borderRadius: 6,
  backgroundColor: "#FFFFFF",
  color: "#1E7B7D",
  cursor: "pointer",
};

export default function ListeningDirectionsScreen({
  onNext,
  volume,
  onVolumeChange,
}: ListeningDirectionsScreenProps) {
  const tx = useListeningTx();
  const isStudy = useContext(ListeningStudyContext);
  return (
    <ListeningTestLayout2026
      headerLeft={<ListeningHeaderLabel />}
      headerRight={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
          <button onClick={onNext} style={nextButtonStyle}>
            {tx("Begin >", "시작 >")}
          </button>
        </div>
      }
      subHeaderLeft={<ListeningSubHeaderLabel />}
    >
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 20 }}>
        {tx("Listening Section", "Listening 섹션")}
      </h2>

      <p style={{ fontSize: 15, lineHeight: 1.7, color: "#333", marginBottom: 12 }}>
        {tx("In the listening section, you will answer 35–45 questions to demonstrate how well you understand spoken English. There are three types of tasks.", "Listening 섹션에서는 35–45개 문항으로 영어 듣기 이해력을 평가합니다. 문제 유형은 세 가지입니다.")}
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24, fontSize: 14 }}>
        <thead>
          <tr>
            <th style={{ backgroundColor: "#1E7B7D", color: "#FFFFFF", textAlign: "left", padding: "10px 14px", fontWeight: 700 }}>
              {tx("Type of Task", "문제 유형")}
            </th>
            <th style={{ backgroundColor: "#1E7B7D", color: "#FFFFFF", textAlign: "left", padding: "10px 14px", fontWeight: 700 }}>
              {tx("Description", "설명")}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid #E0E0E0" }}>
            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#222" }}>
              {tx("Listen and Choose a Response", "Listen and Choose a Response (알맞은 응답 고르기)")}
            </td>
            <td style={{ padding: "10px 14px", color: "#333" }}>
              {tx("Select the best response to the question or statement.", "질문이나 말에 가장 알맞은 응답을 고릅니다.")}
            </td>
          </tr>
          <tr style={{ borderBottom: "1px solid #E0E0E0" }}>
            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#222" }}>
              {tx("Conversations", "Conversations (대화)")}
            </td>
            <td style={{ padding: "10px 14px", color: "#333" }}>
              {tx("Answer questions about short conversations.", "짧은 대화를 듣고 문제에 답합니다.")}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#222" }}>
              {tx("Announcements and Academic Talks", "Announcements and Academic Talks (공지와 강의)")}
            </td>
            <td style={{ padding: "10px 14px", color: "#333" }}>
              {tx("Answer questions about announcements and academic talks.", "공지와 학술 강의를 듣고 문제에 답합니다.")}
            </td>
          </tr>
        </tbody>
      </table>

      <p style={{ fontSize: 15, color: "#333" }}>
        {isStudy
          ? tx("In Study mode you can go back to previous questions.", "Study 모드에서는 이전 문제로 돌아갈 수 있습니다.")
          : <>You <strong>WILL NOT</strong> be able to return to previous questions.</>}
      </p>
    </ListeningTestLayout2026>
  );
}

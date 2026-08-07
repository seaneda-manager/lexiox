"use client";

import ListeningTestLayout2026, { ListeningHeaderLabel, ListeningSubHeaderLabel } from "@/components/listening/ListeningTestLayout2026";
import VolumeControl from "@/components/listening/VolumeControl";

interface ModuleStartScreenProps {
  module: 1 | 2;
  difficulty?: "hard" | "easy";
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

const paragraphStyle: React.CSSProperties = { fontSize: 15, lineHeight: 1.7, color: "#333", marginBottom: 14 };

function taskDescriptions(module: 1 | 2, difficulty: "hard" | "easy") {
  const items: { title: string; body: string }[] = [
    {
      title: "Task 1: Listen and Choose a Response",
      body: "In this task, you will listen to a sentence or question. You will then read four sentences and choose the option that is the best response.",
    },
  ];

  if (module === 1) {
    items.push(
      { title: "Task 2: Listen to a Conversation", body: "Answer questions about a short conversation between two speakers." },
      { title: "Task 3: Listen to an Announcement", body: "Answer questions about a campus announcement." },
      { title: "Task 4: Listen to an Academic Talk", body: "Answer questions about an academic talk from a professor." },
    );
  } else if (difficulty === "hard") {
    items.push(
      { title: "Task 2 & 3: Announcements", body: "Answer questions about two campus announcements involving rule changes or exceptions." },
      { title: "Task 4 & 5: Academic Talks", body: "Answer questions about two academic talks with advanced vocabulary." },
    );
  } else {
    items.push(
      { title: "Task 2, 3 & 4: Conversations", body: "Answer questions about three short conversations with clearer, simpler content." },
      { title: "Task 5 & 6: Announcements", body: "Answer questions about two shorter, more direct campus announcements." },
    );
  }

  return items;
}

export default function ModuleStartScreen({
  module,
  difficulty = "hard",
  onNext,
  volume,
  onVolumeChange,
}: ModuleStartScreenProps) {
  return (
    <ListeningTestLayout2026
      headerLeft={<ListeningHeaderLabel module={module} />}
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
        Module {module}
      </h2>

      <p style={paragraphStyle}>
        In an actual test, the clock will show you how much time you have to complete each question.
      </p>
      <p style={paragraphStyle}>
        You can use <strong>Next</strong> to move to the next question.
      </p>

      {taskDescriptions(module, difficulty).map((t) => (
        <p key={t.title} style={paragraphStyle}>
          <strong>{t.title}</strong>. {t.body}
        </p>
      ))}
    </ListeningTestLayout2026>
  );
}

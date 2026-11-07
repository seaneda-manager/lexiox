"use client";

import ListeningTestLayout2026, { ListeningHeaderLabel, ListeningSubHeaderLabel, useListeningTx } from "@/components/listening/ListeningTestLayout2026";
import VolumeControl from "@/components/listening/VolumeControl";

interface ModuleStartScreenProps {
  module: 1 | 2;
  difficulty?: "hard" | "easy";
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

const paragraphStyle: React.CSSProperties = { fontSize: 14, lineHeight: 1.7, color: "#444", marginBottom: 14 };

function taskDescriptions(module: 1 | 2, difficulty: "hard" | "easy") {
  const items: { title: string; body: string; titleKo: string; bodyKo: string }[] = [
    {
      title: "Task 1: Listen and Choose a Response",
      body: "In this task, you will listen to a sentence or question. You will then read four sentences and choose the option that is the best response.",
      titleKo: "Task 1: 알맞은 응답 고르기",
      bodyKo: "문장이나 질문을 듣고, 네 개의 문장을 읽은 뒤 가장 알맞은 응답을 고릅니다.",
    },
  ];

  if (module === 1) {
    items.push(
      { title: "Task 2: Listen to a Conversation", body: "Answer questions about a short conversation between two speakers.", titleKo: "Task 2: 대화 듣기", bodyKo: "두 사람의 짧은 대화를 듣고 문제에 답합니다." },
      { title: "Task 3: Listen to an Announcement", body: "Answer questions about a campus announcement.", titleKo: "Task 3: 공지 듣기", bodyKo: "캠퍼스 공지를 듣고 문제에 답합니다." },
      { title: "Task 4: Listen to an Academic Talk", body: "Answer questions about an academic talk from a professor.", titleKo: "Task 4: 학술 강의 듣기", bodyKo: "교수의 학술 강의를 듣고 문제에 답합니다." },
    );
  } else if (difficulty === "hard") {
    items.push(
      { title: "Task 2 & 3: Announcements", body: "Answer questions about two campus announcements involving rule changes or exceptions.", titleKo: "Task 2 & 3: 공지", bodyKo: "규정 변경이나 예외가 담긴 캠퍼스 공지 두 개를 듣고 문제에 답합니다." },
      { title: "Task 4 & 5: Academic Talks", body: "Answer questions about two academic talks with advanced vocabulary.", titleKo: "Task 4 & 5: 학술 강의", bodyKo: "고급 어휘가 쓰인 학술 강의 두 개를 듣고 문제에 답합니다." },
    );
  } else {
    items.push(
      { title: "Task 2, 3 & 4: Conversations", body: "Answer questions about three short conversations with clearer, simpler content.", titleKo: "Task 2, 3 & 4: 대화", bodyKo: "내용이 더 쉽고 분명한 짧은 대화 세 개를 듣고 문제에 답합니다." },
      { title: "Task 5 & 6: Announcements", body: "Answer questions about two shorter, more direct campus announcements.", titleKo: "Task 5 & 6: 공지", bodyKo: "더 짧고 직접적인 캠퍼스 공지 두 개를 듣고 문제에 답합니다." },
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
  const tx = useListeningTx();
  return (
    <ListeningTestLayout2026
      headerLeft={<ListeningHeaderLabel module={module} />}
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
      <div style={{ maxWidth: 620, margin: "6px auto 0" }}>
      <h2 style={{ fontSize: 22, fontWeight: 400, color: "#333", paddingBottom: 8, marginBottom: 20, borderBottom: "1px solid #DDD" }}>
        Module {module}
      </h2>

      <p style={paragraphStyle}>
        {tx("In an actual test, the clock will show you how much time you have to complete each question.", "실제 시험에서는 각 문제를 풀 수 있는 남은 시간이 시계로 표시됩니다. Study 모드에는 시간 제한이 없습니다.")}
      </p>
      <p style={paragraphStyle}>
        {tx("You can use Next to move to the next question.", "Next를 눌러 다음 문제로 이동합니다.")}
      </p>

      <p style={paragraphStyle}>
        {tx("The first task is ", "첫 번째 과제는 ")}<strong>{tx("Listen and Choose a Response", "Listen and Choose a Response")}</strong>{tx(". In this task, you will listen to a sentence or question. You will then read four sentences and choose the option that is the best response.", "입니다. 문장이나 질문을 듣고, 네 개의 문장을 읽은 뒤 가장 알맞은 응답을 고릅니다.")}
      </p>
      </div>
    </ListeningTestLayout2026>
  );
}

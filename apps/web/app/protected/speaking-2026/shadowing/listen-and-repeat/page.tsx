"use client";

import { useState } from "react";
import ListenAndRepeatShadowing, {
  ShadowingItem,
} from "../../components/ListenAndRepeatShadowing";

const demoItems: ShadowingItem[] = [
  {
    id: "sh1",
    sentence: "The student center closes earlier on Fridays.",
  },
  {
    id: "sh2",
    sentence: "Many international students attend orientation in the first week.",
  },
  {
    id: "sh3",
    sentence: "Please remember to submit your assignment before midnight.",
  },
  {
    id: "sh4",
    sentence: "The library will be under renovation during the summer term.",
  },
  {
    id: "sh5",
    sentence: "Group projects help students develop communication skills.",
  },
  {
    id: "sh6",
    sentence: "Some classes are offered both online and in person.",
  },
  {
    id: "sh7",
    sentence: "You can book an appointment with your advisor using the portal.",
  },
];

export default function ShadowingTestPage() {
  const [currentStage, setCurrentStage] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [completedStages, setCompletedStages] = useState<number[]>([]);

  const handleStageComplete = (stage: number, score: number) => {
    console.log(`🎉 Stage ${stage} 완료! 점수: ${score}`);

    setTotalScore(score);
    setCompletedStages((prev) => [...prev, stage]);

    // 다음 stage로 진행 (최대 50)
    if (stage < 50) {
      setTimeout(() => {
        setCurrentStage(stage + 1);
      }, 2000); // 2초 후 자동 진행
    }
  };

  // Stage 50 완료 화면
  if (completedStages.includes(50)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          fontFamily: "Arial, sans-serif",
          color: "white",
          textAlign: "center",
          padding: 40,
        }}
      >
        <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 20 }}>
          🏆 MASTER LEVEL ACHIEVED! 🏆
        </h1>
        <p style={{ fontSize: 24, marginBottom: 10 }}>
          모든 50개 Stage를 완료했습니다!
        </p>
        <p style={{ fontSize: 32, fontWeight: 700, color: "#FFD700", marginBottom: 30 }}>
          총 점수: {totalScore}
        </p>
        <div style={{ fontSize: 16, lineHeight: 1.8, maxWidth: 600 }}>
          <p>✨ 당신은 이제 원어민 수준의 shadowing 능력을 갖췄습니다!</p>
          <p>🎤 다음으로 Listen & Repeat 모드에 도전해보세요.</p>
        </div>
        <button
          onClick={() => {
            setCurrentStage(1);
            setCompletedStages([]);
            setTotalScore(0);
          }}
          style={{
            marginTop: 40,
            padding: "15px 40px",
            fontSize: 18,
            fontWeight: 700,
            backgroundColor: "#FFD700",
            color: "#333",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          🔄 다시 시작
        </button>
      </div>
    );
  }

  return (
    <ListenAndRepeatShadowing
      items={demoItems}
      mode="test"
      stage={currentStage}
      onStageComplete={handleStageComplete}
      onComplete={(result) => {
        console.log("Shadowing 세션 완료:", result);
      }}
    />
  );
}

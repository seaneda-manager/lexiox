import FocusModeWrapper from "@/components/common/FocusModeWrapper";
import StageBackground from "@/components/common/StageBackground";
import ScoreboardClient from "./_components/ScoreboardClient";

export default function VocabScoreboardPage() {
  return (
    <FocusModeWrapper className="relative w-full min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <StageBackground />
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        <ScoreboardClient />
      </div>
    </FocusModeWrapper>
  );
}

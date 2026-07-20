"use client";

import { useCallback } from "react";
import LecturePlayer from "./LecturePlayer";
import { saveLectureCompletionAction } from "../actions";

type QuizQuestion = {
  id: string;
  timestamp_seconds: number;
  question_text: string;
  blank_answer: string;
  hint: string | null;
};

type Props = {
  lectureId: string;
  youtubeId: string;
  questions: QuizQuestion[];
  studentId: string;
};

export default function LecturePlayerWrapper({ lectureId, youtubeId, questions, studentId }: Props) {
  const handleComplete = useCallback(
    async (score: number, total: number) => {
      try {
        await saveLectureCompletionAction(lectureId, score, total);
      } catch {
        // 완료 저장 실패해도 UX 방해 안 함
      }
    },
    [lectureId]
  );

  return (
    <LecturePlayer
      lectureId={lectureId}
      youtubeId={youtubeId}
      questions={questions}
      onComplete={handleComplete}
    />
  );
}

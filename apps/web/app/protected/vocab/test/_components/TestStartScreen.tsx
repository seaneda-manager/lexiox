"use client";

export interface TestStartScreenProps {
  trackId: string;
  dayNumber: number;
  useWrongOnly: boolean;
  /** review = 오늘의 복습 시험 */
  mode?: "day" | "review";
  onStart: () => void;
}

export default function TestStartScreen({
  trackId,
  dayNumber,
  useWrongOnly,
  mode = "day",
  onStart,
}: TestStartScreenProps) {
  const isReview = mode === "review";
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="max-w-md text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">{isReview ? "복습 시험" : "단어 시험"}</h1>
          <p className="text-lg text-gray-600">
            {isReview ? "오늘의 복습" : `Day ${dayNumber}`}
            {!isReview && useWrongOnly && " - 틀린 것만"}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div className="text-left space-y-2">
            <h2 className="font-semibold text-gray-800">시험 형식:</h2>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 단어 → 뜻 (주관식)</li>
              <li>• 뜻 → 단어 (주관식)</li>
              <li>• 동의어 (객관식)</li>
              <li>• 듣기 (객관식)</li>
            </ul>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-gray-500">
              {isReview
                ? "학습할 때 틀렸거나 몰랐던 단어 중, 오늘 복습할 단어들이 나와요."
                : useWrongOnly
                  ? "학습에서 틀린 단어들만 시험에 포함됩니다."
                  : "학습에서 약했던 단어 위주로 출제돼요."}
            </p>
          </div>
        </div>

        <button
          onClick={onStart}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition"
        >
          시험 시작
        </button>
      </div>
    </div>
  );
}

"use client";

export interface TestStartScreenProps {
  trackId: string;
  dayNumber: number;
  useWrongOnly: boolean;
  onStart: () => void;
}

export default function TestStartScreen({
  trackId,
  dayNumber,
  useWrongOnly,
  onStart,
}: TestStartScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="max-w-md text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">단어 시험</h1>
          <p className="text-lg text-gray-600">
            Day {dayNumber}
            {useWrongOnly && " - 틀린 것만"}
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
              {useWrongOnly
                ? "학습에서 틀린 단어들만 시험에 포함됩니다."
                : "Day의 전체 단어들이 포함됩니다."}
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

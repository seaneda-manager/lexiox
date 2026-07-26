"use client";

interface ModuleEndScreenProps {
  module: 1 | 2;
  correctCount: number;
  totalQuestions: number;
  onNext: () => void;
}

export default function ModuleEndScreen({
  module,
  correctCount,
  totalQuestions,
  onNext,
}: ModuleEndScreenProps) {
  const percentage = totalQuestions > 0
    ? Math.round((correctCount / totalQuestions) * 100)
    : 0;

  const isHardModule = percentage >= 80;
  const nextModuleDifficulty = isHardModule ? "Hard (Advanced)" : "Easy (Basic)";

  const getPerformanceMessage = () => {
    if (percentage >= 90) return "Outstanding! You're ready for the advanced module.";
    if (percentage >= 80) return "Excellent! You'll continue with the advanced module.";
    if (percentage >= 70) return "Good performance. The next module will be tailored to your level.";
    if (percentage >= 60) return "Solid effort. The next module will help you improve.";
    return "Keep practicing! The next module is designed to help you build skills.";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">TOEFL iBT 2026</h1>
          <div className="text-sm text-gray-500">Listening Section</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-lg p-12 space-y-8">
            {/* Completion Message */}
            <div className="text-center">
              <div className="text-5xl mb-4">✓</div>
              <h2 className="text-3xl font-bold text-gray-900">
                End of Module {module}
              </h2>
              <p className="text-gray-600 mt-2">
                The listening section of Module {module} is now complete.
              </p>
            </div>

            {/* Score Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border-2 border-blue-300 space-y-6">
              {/* Score Display */}
              <div className="text-center">
                <div className="text-6xl font-bold text-blue-600 mb-2">
                  {percentage}%
                </div>
                <div className="text-gray-600">
                  <span className="text-lg font-semibold text-gray-900">
                    {correctCount}
                  </span>
                  <span className="mx-2">of</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {totalQuestions}
                  </span>
                  <span className="ml-2">correct</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="relative h-3 bg-gray-300 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {/* Feedback */}
            <div className={`rounded-lg p-6 text-center border-l-4 ${
              percentage >= 80
                ? "bg-green-50 border-green-500"
                : percentage >= 60
                ? "bg-blue-50 border-blue-500"
                : "bg-amber-50 border-amber-500"
            }`}>
              <p className={`text-sm leading-relaxed font-semibold ${
                percentage >= 80
                  ? "text-green-900"
                  : percentage >= 60
                  ? "text-blue-900"
                  : "text-amber-900"
              }`}>
                {getPerformanceMessage()}
              </p>
            </div>

            {module === 1 && (
              <div className="bg-indigo-50 border border-indigo-300 rounded-lg p-6 space-y-4">
                <h3 className="font-semibold text-indigo-900">
                  Module 2 Difficulty Level
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-indigo-800 mb-2">
                      Based on your performance, you will proceed to:
                    </p>
                    <div className={`inline-block px-4 py-2 rounded-lg font-semibold text-sm ${
                      isHardModule
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {isHardModule ? "🔴" : "🟢"} {nextModuleDifficulty}
                    </div>
                  </div>
                  <div className="text-3xl">
                    {isHardModule ? "🚀" : "💪"}
                  </div>
                </div>
                <p className="text-xs text-indigo-700 mt-4">
                  Module 2 contains different listening content tailored to your performance level.
                </p>
              </div>
            )}

            {module === 2 && (
              <div className="bg-green-50 border border-green-300 rounded-lg p-6">
                <h3 className="font-semibold text-green-900 mb-2">
                  Congratulations! 🎉
                </h3>
                <p className="text-sm text-green-800">
                  You have completed the Listening section of the TOEFL iBT test.
                  Your results will be calculated and you will receive your detailed feedback.
                </p>
              </div>
            )}

            {/* Next Steps Info */}
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
              <p className="text-xs text-gray-600">
                {module === 1
                  ? "Click Next to begin Module 2. This module contains different listening materials based on your performance."
                  : "Click Next to view your results and feedback for the Listening section."}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-8 py-6 flex justify-end gap-4">
        <button
          onClick={onNext}
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
        >
          Next
        </button>
      </footer>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

interface ModuleStartScreenProps {
  module: 1 | 2;
  difficulty?: "hard" | "easy";
  totalTime?: number; // in seconds
  onNext: () => void;
}

export default function ModuleStartScreen({
  module,
  difficulty = "hard",
  totalTime = 1200, // 20 minutes default
  onNext,
}: ModuleStartScreenProps) {
  const [timeLeft, setTimeLeft] = useState(totalTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const isDifficultyHigh = difficulty === "hard";

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Header with Timer */}
      <header className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">TOEFL iBT 2026</h1>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Remaining Time</div>
              <div className="text-3xl font-bold text-blue-600 font-mono">
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-lg p-12 space-y-8">
            {/* Module Title */}
            <div className="text-center">
              <h2 className="text-4xl font-bold text-gray-900 mb-2">
                Module {module}
              </h2>
              <div className="flex justify-center gap-4 mt-4">
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    isDifficultyHigh
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {isDifficultyHigh ? "🔴 Hard" : "🟢 Easy"}
                </span>
                {module === 2 && (
                  <span className="px-4 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
                    Adaptive Level
                  </span>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded space-y-4">
              <p className="text-gray-700 leading-relaxed">
                During the test, the clock will show you how much time you have to finish each question.
              </p>
              <p className="text-gray-700 leading-relaxed">
                You can use the <span className="font-semibold">Next</span> button to move to the next question.
              </p>
              <p className="text-gray-700 leading-relaxed">
                <span className="font-semibold text-red-600">You will NOT be able to go back</span> to previous questions once you move forward.
              </p>
            </div>

            {/* Task Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-lg">Tasks in This Module:</h3>
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-sky-50 to-sky-100 border-l-4 border-sky-500 p-4 rounded">
                  <div className="font-semibold text-sky-900 mb-1">
                    Task 1: Listen and Choose a Response
                  </div>
                  <p className="text-sm text-sky-800">
                    In this task, you will listen to a sentence or question. You will then read four sentences and choose the option that is the best response.
                  </p>
                </div>

                {module === 1 && (
                  <>
                    <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-l-4 border-indigo-500 p-4 rounded">
                      <div className="font-semibold text-indigo-900 mb-1">
                        Task 2: Listen to a Conversation
                      </div>
                      <p className="text-sm text-indigo-800">
                        Answer questions about a short conversation between two speakers about campus or daily life topics.
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-l-4 border-amber-500 p-4 rounded">
                      <div className="font-semibold text-amber-900 mb-1">
                        Task 3: Listen to an Announcement
                      </div>
                      <p className="text-sm text-amber-800">
                        Answer questions about a campus announcement.
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-l-4 border-purple-500 p-4 rounded">
                      <div className="font-semibold text-purple-900 mb-1">
                        Task 4: Listen to an Academic Talk
                      </div>
                      <p className="text-sm text-purple-800">
                        Answer questions about an academic talk from a professor.
                      </p>
                    </div>
                  </>
                )}

                {module === 2 && isDifficultyHigh && (
                  <>
                    <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-l-4 border-amber-500 p-4 rounded">
                      <div className="font-semibold text-amber-900 mb-1">
                        Task 2 & 3: Announcements
                      </div>
                      <p className="text-sm text-amber-800">
                        Answer 2 questions each about two campus announcements involving rule changes or exceptions.
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-l-4 border-purple-500 p-4 rounded">
                      <div className="font-semibold text-purple-900 mb-1">
                        Task 4 & 5: Academic Talks (Advanced)
                      </div>
                      <p className="text-sm text-purple-800">
                        Answer 4 questions each about two academic talks. These are more complex with advanced vocabulary.
                      </p>
                    </div>
                  </>
                )}

                {module === 2 && !isDifficultyHigh && (
                  <>
                    <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-l-4 border-indigo-500 p-4 rounded">
                      <div className="font-semibold text-indigo-900 mb-1">
                        Task 2, 3 & 4: Conversations
                      </div>
                      <p className="text-sm text-indigo-800">
                        Answer 2 questions each about three short conversations with clearer, simpler content.
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-l-4 border-amber-500 p-4 rounded">
                      <div className="font-semibold text-amber-900 mb-1">
                        Task 5 & 6: Announcements
                      </div>
                      <p className="text-sm text-amber-800">
                        Answer 2 questions each about two campus announcements. These are shorter and more direct.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Getting Ready */}
            <div className="bg-green-50 border border-green-300 rounded-lg p-6">
              <h3 className="font-semibold text-green-900 mb-2">Ready to Begin?</h3>
              <p className="text-sm text-green-800">
                Make sure your audio is working properly and you are in a quiet environment. Click Next to begin Module {module}.
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

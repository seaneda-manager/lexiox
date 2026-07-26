"use client";

interface ListeningDirectionsScreenProps {
  onNext: () => void;
}

export default function ListeningDirectionsScreen({
  onNext,
}: ListeningDirectionsScreenProps) {
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
        <div className="w-full max-w-3xl">
          <div className="bg-white rounded-2xl shadow-lg p-12 space-y-8">
            {/* Title */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Listening Section
              </h2>
              <p className="text-gray-500">Instructions and Overview</p>
            </div>

            {/* Main Description */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded space-y-4">
              <p className="text-gray-700 leading-relaxed">
                In the listening section, you will be asked to answer 35–45 questions
                to demonstrate your ability to understand spoken English.
              </p>
              <p className="text-gray-700 leading-relaxed">
                There are three different types of tasks in this section.
              </p>
            </div>

            {/* Task Types Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="px-6 py-4 text-left font-semibold text-gray-900">
                      Type of Task
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-900">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-semibold text-gray-800">
                      Listen and Choose a Response
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      Select the best response to the question or statement.
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-semibold text-gray-800">
                      Conversations
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      Answer questions about short conversations between two speakers.
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-semibold text-gray-800">
                      Announcements and Academic Talks
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      Answer questions about announcements and academic talks.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Important Notice */}
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-semibold text-red-900 mb-2">Important:</p>
                  <p className="text-red-800 leading-relaxed">
                    <span className="font-semibold">
                      You will NOT be able to go back to previous questions in this section.
                    </span>
                    {" "}Once you move forward, you cannot review or change your answers to earlier questions.
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">⏱️ Timing</h3>
                <p className="text-sm text-blue-800">
                  Each question has a specific time limit. Use the timer at the top of the screen to monitor your time.
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">✍️ Answering</h3>
                <p className="text-sm text-blue-800">
                  Select your answer and click Next to move to the next question. You cannot skip questions.
                </p>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-green-50 border border-green-300 rounded-lg p-6">
              <h3 className="font-semibold text-green-900 mb-3">💡 Tips for Success</h3>
              <ul className="space-y-2 text-sm text-green-800">
                <li className="flex gap-3">
                  <span className="font-bold">•</span>
                  <span>Listen carefully to each audio clip. You will hear it only once.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold">•</span>
                  <span>Take notes while listening to help you remember important details.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold">•</span>
                  <span>Read all answer choices before selecting your response.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold">•</span>
                  <span>Manage your time carefully and do not spend too long on any single question.</span>
                </li>
              </ul>
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

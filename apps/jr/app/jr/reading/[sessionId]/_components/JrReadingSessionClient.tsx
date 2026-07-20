'use client';

export default function JrReadingSessionClient({
  sessionId,
  passage,
  initialStage,
}: any) {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-4">📚 Reading Session</h1>
        <div className="bg-white rounded-lg p-6 shadow">
          <p className="text-sm text-slate-600 mb-2">Session ID: {sessionId}</p>
          <p className="text-sm text-slate-600 mb-2">Stage: {initialStage}</p>
          <div className="mt-4 p-4 bg-slate-50 rounded">
            <h2 className="font-semibold mb-2">Passage Content:</h2>
            <p className="text-slate-700">{passage.content || "No content"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

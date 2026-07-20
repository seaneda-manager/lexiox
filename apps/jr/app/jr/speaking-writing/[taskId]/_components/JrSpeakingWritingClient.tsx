'use client';

export default function JrSpeakingWritingClient({
  taskId,
  taskType,
  prompt,
  dueDate,
}: any) {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-4">
          {taskType === 'speaking' ? '🎤' : '✍️'} {taskType === 'speaking' ? 'Speaking' : 'Writing'} Task
        </h1>
        <div className="bg-white rounded-lg p-6 shadow">
          <p className="text-sm text-slate-600 mb-2">Task ID: {taskId}</p>
          <p className="text-sm text-slate-600 mb-2">Type: {taskType}</p>
          <div className="mt-4 p-4 bg-slate-50 rounded">
            <h2 className="font-semibold mb-2">Prompt:</h2>
            <p className="text-slate-700">{prompt || "No prompt"}</p>
          </div>
          {dueDate && (
            <div className="mt-4 p-4 bg-slate-50 rounded">
              <h2 className="font-semibold mb-2">Due Date:</h2>
              <p className="text-slate-700">{new Date(dueDate).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

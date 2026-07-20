'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-red-500">Reading Test Error</h2>
      <pre className="mt-2 whitespace-pre-wrap text-sm opacity-80">
        {error?.message || 'Unknown error'}
      </pre>
      <button className="mt-4 rounded border px-3 py-2" onClick={() => reset()}>
        Retry
      </button>
    </div>
  );
}





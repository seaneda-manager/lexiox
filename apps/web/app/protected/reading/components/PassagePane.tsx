'use client';
export default function PassagePane({ title, content }: { title: string; content: string }) {
  return (
    <aside className="p-4 border rounded-2xl bg-white/5">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <article className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed">
        {content}
      </article>
    </aside>
  );
}






/* apps/web/app/components/PassagePane.tsx */
export default function PassagePane({ paragraphs = [] as string[] }) {
  const data = paragraphs.length
    ? paragraphs
    : [
        'Paragraph 1. Replace with server-provided content.',
        'Paragraph 2. Replace with server-provided content.',
        'Paragraph 3. Replace with server-provided content.',
      ];
  return (
    <article className="prose prose-neutral max-w-none leading-relaxed">
      {data.map((p, idx) => (
        <p id={`p-${idx + 1}`} key={idx} className="scroll-mt-24">
          {p}
        </p>
      ))}
    </article>
  );
}






// normalized utf8
'use client'
export default function PassagePane({ content }: { content?: string }) {
return (
<article className="prose max-w-none whitespace-pre-wrap rounded-2xl border p-4">
{content ?? 'PassagePane placeholder ???占쎌젣 蹂몃Ц??二쇱엯?占쎌꽭??'}
</article>
)
}





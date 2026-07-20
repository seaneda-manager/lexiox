// normalized utf8
'use client'


// Reading/Listening 怨듭슜 臾명빆 由ъ뒪??(?占쎌씪?占쏀깮)


type Choice = { id: string; label?: string; text?: string }
type Question = { id: string; number?: number; stem?: string; choices: Choice[] }


export default function QuestionList({
questions,
disabled,
answers,
onChange,
}: {
questions: Question[]
disabled?: boolean
answers: Record<string, string>
onChange: (qid: string, cid: string) => void
}) {
return (
<div className="space-y-6">
{questions.map((q, idx) => (
<div key={q.id} className="rounded-2xl border p-4">
<div className="mb-2 font-medium">
{(q.number ?? idx + 1) + '. '} {q.stem}
</div>
<fieldset className="space-y-2">
{q.choices.map((c) => {
const id = `${q.id}-${c.id}`
return (
<label
key={c.id}
htmlFor={id}
className={`flex items-start gap-2 p-2 rounded-xl border ${
disabled ? 'opacity-60' : 'hover:shadow'
}`}
>
<input
id={id}
type="radio"
name={q.id}
value={c.id}
disabled={disabled}
checked={answers[q.id] === c.id}
onChange={() => onChange(q.id, c.id)}
className="mt-1"
/>
<span>
{c.label ? <span className="font-semibold mr-1">{c.label}</span> : null}
{c.text}
</span>
</label>
)
})}
</fieldset>
</div>
))}
</div>
)
}





// Sample data & loader for Listening pilot
import type { ListeningTrack as ListeningTrackSample, ListeningQuestion, ListeningChoice } from '@/types/types-listening'

export const SAMPLE_TRACK: ListeningTrackSample = {
  id: 'track-001',
  audioUrl: '/audio/sample.mp3',
  durationSec: 300,
  timeLimitSec: 300,
  questions: [
    { id: 'q1', prompt: 'What is the main topic?', choices: [
      { id: 'a', text: 'A' } as ListeningChoice,
      { id: 'b', text: 'B', correct: true } as ListeningChoice,
      { id: 'c', text: 'C' } as ListeningChoice,
      { id: 'd', text: 'D' } as ListeningChoice,
    ]}
  ]
}

export async function loadSampleTrackFromPublic(path = '/data/demo-listening.json') {
  const res = await fetch(path, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to load sample: ${res.status}`)
  const json = await res.json()
  return json.tracks?.[0] as ListeningTrackSample
}

export function isChoiceCorrectLocal(q: ListeningQuestion, choiceId: string): boolean {
  return !!q.choices.find((c) => c.id === choiceId && c.correct)
}






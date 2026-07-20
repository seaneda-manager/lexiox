import ListeningStudyRunner from './ListeningStudyRunner';
const SAMPLE_TRACK = { id: '123' } as const; 

export default function Page() {
return <ListeningStudyRunner track={{ id: SAMPLE_TRACK.id } as any} />
}






import type { ArcheryVocab } from "./archeryQuestions";

export type StageInfo = { setId: string; day: number; status: string };
export type TrackInfo = { id: string; title: string; stages: StageInfo[] };

/** 학생에게 배정된 과정과 Day(스테이지) 목록. 로그인이 없거나 실패하면 빈 배열. */
export async function loadMyStages(): Promise<TrackInfo[]> {
  try {
    const res = await fetch("/api/workout/stages", { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { tracks?: TrackInfo[] };
    return json.tracks ?? [];
  } catch {
    return [];
  }
}

/** 한 세트(Day)의 실제 단어를 게임용 모양으로. 뜻이나 영영 정의가 없는 단어는 문제가 안 되므로 뺀다. */
export async function loadSetWords(setId: string): Promise<ArcheryVocab[]> {
  try {
    const res = await fetch(`/api/workout/words?setId=${encodeURIComponent(setId)}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { items?: { id: string; word: string; ko: string; def: string; pos: string; pron: string; synonyms: string[] }[] };
    return (json.items ?? [])
      .filter((w) => w.word && (w.ko || w.def))
      .map((w) => ({ id: w.id, word: w.word, ko: w.ko || w.def, def: w.def || w.ko, pos: w.pos, pron: w.pron, synonyms: w.synonyms }));
  } catch {
    return [];
  }
}

import { getServerSupabase } from "@/lib/supabase/server";
import VocabStudyClient from "./_client";
import type { SessionWord } from "@/models/vocab/SessionWord";

export const dynamic = "force-dynamic";

type TVocaWord = {
  id: string;
  word: string;
  pos?: string | string[];
  meanings_ko?: string | string[];
  meanings_en_simple?: string | string[];
  meaning_kr?: string;
  meaning_en?: string;
  level?: number;
  tags?: string[];
  [key: string]: any;
};

function normalizeArrayField(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v.map((x) => String(x)).filter(Boolean);
  }
  if (typeof v === "string") {
    return v.split(/\s*[,/|·]\s*/).filter(Boolean);
  }
  return [];
}

export default async function VocabStudyPage({
  searchParams,
}: {
  searchParams: Promise<{ trackId?: string }>;
}) {
  const { trackId } = await searchParams;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="p-8 text-center text-red-600">
        로그인이 필요합니다.
      </main>
    );
  }

  let track: any = null;
  let words: SessionWord[] = [];
  let error: any = null;

  if (trackId) {
    // Track 정보 조회
    const { data: trackData } = await supabase
      .from("vocab_tracks")
      .select("id, title")
      .eq("id", trackId)
      .single();
    track = trackData;

    // 할당받은 단어 조회
    const { data: assignments, error: assignError } = await supabase
      .from("student_vocab_assignments")
      .select("set_id")
      .eq("student_id", user.id)
      .eq("track_id", trackId)
      .is("completed_at", null);

    error = assignError;

    if (assignments && assignments.length > 0) {
      const setIds = assignments.map((a: any) => a.set_id);
      const { data: vocaData } = await supabase
        .from("voca_words")
        .select("*")
        .in("id", setIds)
        .order("created_at", { ascending: true });

      words = (vocaData ?? []).map((w: TVocaWord) => ({
        id: String(w.id),
        text: String(w.word || ""),
        meanings_ko: normalizeArrayField(w.meanings_ko || w.meaning_kr),
        meanings_en_simple: normalizeArrayField(w.meanings_en_simple || w.meaning_en),
        examples_easy: [],
      }));
    }
  } else {
    // trackId 없으면 최근 단어 20개
    const { data, error: err } = await supabase
      .from("voca_words")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(20);
    words = (data ?? []).map((w: TVocaWord) => ({
      id: String(w.id),
      text: String(w.word || ""),
      meanings_ko: normalizeArrayField(w.meanings_ko || w.meaning_kr),
      meanings_en_simple: normalizeArrayField(w.meanings_en_simple || w.meaning_en),
      examples_easy: [],
    }));
    error = err;
  }

  const hasError = !!error;
  const isEmpty = !hasError && words.length === 0;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      {/* 헤더 */}
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {track ? `${track.title} – Study Mode` : "Vocab – Study Mode"}
        </h1>
        <p className="text-sm text-gray-600">
          {trackId
            ? "할당받은 단어를 학습하고 있습니다."
            : "오늘 학습할 단어를 학습하는 공간입니다."}
        </p>
      </header>

      {/* 상태 메시지 (에러 / 비어있음) */}
      {hasError && (
        <section className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">단어 목록을 불러오는 중 오류가 발생했습니다.</p>
          <p className="mt-1">
            나중에 다시 시도해 보거나, Supabase 콘솔에서{" "}
            <code>voca_words</code> 테이블이 제대로 생성되었는지 확인해 주세요.
          </p>
          <p className="mt-2 text-xs opacity-80">
            (개발용 디버그) {error?.message}
          </p>
        </section>
      )}

      {isEmpty && !hasError && (
        <section className="rounded-2xl border bg-white/80 p-4 text-sm text-gray-700 shadow-sm">
          <p className="font-semibold">아직 등록된 단어가 없습니다.</p>
          <p className="mt-1">
            먼저 Admin에서 단어를 추가한 뒤, 이 페이지에서 학습을 진행할 수
            있습니다.
          </p>
        </section>
      )}

      {/* 단어 학습 UI */}
      {!hasError && !isEmpty && <VocabStudyClient words={words} />}
    </main>
  );
}

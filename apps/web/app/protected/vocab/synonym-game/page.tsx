import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import SynonymGameClient from "@/components/vocab/SynonymGameClient";

export const dynamic = "force-dynamic";

export default async function SynonymGamePage() {
  const authSupabase = await getServerSupabase();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  // Service Role Client (RLS 우회)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  // 동의어(tier 1)를 가진 단어만 대상으로 로드한다.
  // 예전엔 최신순 words 1000개를 그대로 넘겨서, 그 표본에 동의어 보유 단어가 하나도
  // 없으면 클라이언트가 무한 로딩에 빠졌다.
  const { data: synRows } = await supabase
    .from("word_synonyms")
    .select("word_id")
    .eq("tier", 1)
    .limit(20000);

  const synonymWordIds = Array.from(
    new Set((synRows ?? []).map((r: any) => r.word_id).filter(Boolean))
  );

  let words: any[] | null = null;
  let wordsError: { message: string } | null = null;

  if (synonymWordIds.length > 0) {
    const res = await supabase
      .from("words")
      .select(`
        id, text, pos, difficulty, is_function_word,
        meanings_ko, meanings_en_simple, examples_easy, examples_normal,
        created_at, updated_at
      `)
      .in("id", synonymWordIds.slice(0, 1000));
    words = res.data;
    wordsError = res.error;
  } else {
    // 폴백: 동의어 테이블이 비어있으면 기존 방식
    const res = await supabase
      .from("words")
      .select(`
        id, text, pos, difficulty, is_function_word,
        meanings_ko, meanings_en_simple, examples_easy, examples_normal,
        created_at, updated_at
      `)
      .order("created_at", { ascending: false })
      .limit(1000);
    words = res.data;
    wordsError = res.error;
  }

  if (wordsError) {
    console.error("DB Error:", wordsError);
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
        <div className="text-center">
          <p className="text-gray-600">데이터 로드 실패</p>
          <p className="text-sm text-gray-500 mt-2">{wordsError.message}</p>
        </div>
      </div>
    );
  }

  if (!words || words.length < 15) {
    console.error("Not enough words:", words?.length ?? 0);
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
        <div className="text-center">
          <p className="text-gray-600">게임을 시작할 수 있는 단어가 부족합니다.</p>
          <p className="text-sm text-gray-500 mt-2">(로드된: {words?.length ?? 0}개, 최소 15개 필요)</p>
        </div>
      </div>
    );
  }

  // 간단한 타입으로 변환 (클라이언트에서 동의어 로드)
  interface SimpleWord {
    id: string;
    text: string;
    pos: string | null;
    difficulty: number | null;
    is_function_word?: boolean;
    meanings_ko?: string[];
    synonyms?: SimpleWord[];
  }

  const vocabWords: SimpleWord[] = words.map((w: any) => ({
    id: w.id,
    text: w.text,
    pos: w.pos,
    difficulty: w.difficulty ?? 5,
    is_function_word: w.is_function_word,
    meanings_ko: w.meanings_ko,
    synonyms: [],
  }));

  return (
    <SynonymGameClient
      words={vocabWords}
    />
  );
}

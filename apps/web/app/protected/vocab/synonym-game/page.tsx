import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import SynonymGameClient from "@/components/vocab/SynonymGameClient";

export const dynamic = "force-dynamic";

export default async function SynonymGamePage() {
  // TODO: 테스트 후 인증 체크 복구
  // const authSupabase = await getServerSupabase();
  // const { data: { user } } = await authSupabase.auth.getUser();
  // if (!user) {
  //   redirect("/");
  // }

  // Service Role Client (RLS 우회)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  // 전체 단어 DB에서 랜덤하게 선택 (할당 상관없이)
  const { data: words, error: wordsError } = await supabase
    .from("words")
    .select(`id, text, difficulty`)
    .limit(100); // 충분한 단어 수 로드

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

  if (!words || words.length < 4) {
    console.error("Not enough words:", words?.length ?? 0);
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
        <div className="text-center">
          <p className="text-gray-600">게임을 시작할 수 있는 단어가 부족합니다.</p>
          <p className="text-sm text-gray-500 mt-2">(로드된: {words?.length ?? 0}개, 최소 4개 필요)</p>
        </div>
      </div>
    );
  }

  // VocabWord 타입으로 변환
  interface VocabWord {
    id: string;
    text: string;
    pos: string | null;
    difficulty: number | null;
    synonyms?: VocabWord[]; // 클라이언트에서 로드됨
  }

  const vocabWords: VocabWord[] = words.map((w: any) => ({
    id: w.id,
    text: w.text,
    pos: null, // Datamuse API에서 로드 가능
    difficulty: w.difficulty ?? 5,
    synonyms: [], // 초기값 (클라이언트에서 API로 로드)
  }));

  return (
    <SynonymGameClient
      words={vocabWords as any}
    />
  );
}

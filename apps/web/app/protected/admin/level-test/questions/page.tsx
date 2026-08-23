import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import { ArrowLeft } from 'lucide-react';
import QuestionForm from './_client/QuestionForm';
import QuestionRow from './_client/QuestionRow';

export const dynamic = 'force-dynamic';

const SECTION_ORDER = ['grammar', 'vocab', 'listening', 'reading', 'speaking', 'writing'];
const SECTION_LABEL: Record<string, string> = {
  grammar: '📚 문법', vocab: '🔤 어휘', listening: '🎧 듣기', reading: '📖 읽기', speaking: '🎤 말하기', writing: '✍️ 쓰기',
};

export default async function LevelTestQuestionsPage() {
  const supabase = await getServerSupabase();

  const { data: questions } = await supabase
    .from('level_test_questions')
    .select('id, section, order_index, prompt, choices, correct_choice_id, is_active, track, sub_level, generated_by_ai, audio_url, topic_label')
    .order('section', { ascending: true })
    .order('order_index', { ascending: true });

  const bySection: Record<string, typeof questions> = {};
  for (const q of questions ?? []) {
    if (!bySection[q.section]) bySection[q.section] = [];
    bySection[q.section]!.push(q);
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 pb-12">
      <header>
        <div className="text-xs text-neutral-400 mb-1">
          <Link href="/admin/level-test" className="hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> 레벨 테스트
          </Link>
          {' / 문제은행'}
        </div>
        <h1 className="text-xl font-bold text-neutral-900">레벨 테스트 문제은행</h1>
        <p className="text-xs text-neutral-400 mt-0.5">문법·어휘·듣기·읽기는 객관식, 말하기는 녹음 프롬프트입니다.</p>
      </header>

      {SECTION_ORDER.map((section) => {
        const list = bySection[section] ?? [];
        if (list.length === 0) return null;
        return (
          <section key={section} className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">
              {SECTION_LABEL[section]} ({list.length})
            </h2>
            <div className="space-y-1.5">
              {list.map((q) => (
                <QuestionRow key={q.id} question={q} />
              ))}
            </div>
          </section>
        );
      })}

      <QuestionForm />
    </main>
  );
}

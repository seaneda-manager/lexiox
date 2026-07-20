// apps/web/app/(protected)/updated-reading/test/page.tsx
import { getSupabaseServer } from '@/lib/supabaseServer';
import ReadingAdaptiveRunner2026 from '@/components/reading/ReadingAdaptiveRunner2026';
import type { RReadingTest2026 } from '@/models/reading';

export const dynamic = 'force-dynamic';

type SearchParams = {
  testId?: string;
};

type PageProps = {
  searchParams?: SearchParams;
};

export default async function Reading2026TestPage({ searchParams }: PageProps) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="p-6">Please sign in.</div>;
  }

  const testId = searchParams?.testId ?? 'updated-reading-demo-1';

  const demoTest = ({
    meta: {
      id: testId,
      label: '2026 Demo Reading',
      examEra: '2026-demo', // TODO: 실제 유니온 타입에 맞게 나중에 수정
    },
    modules: [
      // ------- Stage 1 -------
      {
        id: 'stage1-module-1',
        label: 'Stage 1 Module (demo)',
        items: [
          {
            id: 'item1',
            taskKind: 'academic_passage',
            stage: 1,
            passageHtml:
              '<p>This is a short <strong>demo academic passage</strong> for the 2026 Reading runner.</p>',
            questions: [
              {
                id: 'q1',
                number: 1,
                stem: 'According to the passage, what is the main purpose of this demo?',
                choices: [
                  {
                    id: 'q1a',
                    text: 'To test the adaptive runner UI.',
                    isCorrect: true,
                  },
                  {
                    id: 'q1b',
                    text: 'To measure your real TOEFL score.',
                  },
                  {
                    id: 'q1c',
                    text: 'To explain academic research in detail.',
                  },
                  {
                    id: 'q1d',
                    text: 'To practice integrated writing.',
                  },
                ],
              },
            ],
          },
        ],
      },

      // ------- Stage 2 -------
      {
        id: 'stage2-module-1',
        label: 'Stage 2 Module (demo)',
        items: [
          {
            id: 'item2',
            taskKind: 'academic_passage',
            stage: 2,
            passageHtml:
              '<p>This is a <em>Stage 2</em> demo passage for the 2026 Reading runner.</p>',
            questions: [
              {
                id: 'q2',
                number: 2,
                stem: 'What happens when you finish this module?',
                choices: [
                  {
                    id: 'q2a',
                    text: 'onFinish is called with your scores.',
                    isCorrect: true,
                  },
                  {
                    id: 'q2b',
                    text: 'The app closes automatically.',
                  },
                  {
                    id: 'q2c',
                    text: 'Nothing happens.',
                  },
                  {
                    id: 'q2d',
                    text: 'You start Listening automatically.',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  } as unknown) as RReadingTest2026;

  return (
    <div className="-m-4 md:-m-6 h-[calc(100%+2rem)] md:h-[calc(100%+3rem)]">
      <ReadingAdaptiveRunner2026 test={demoTest} />
    </div>
  );
}

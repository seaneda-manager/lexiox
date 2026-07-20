import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function Speaking2026StudyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Study Mode</h1>
        <p className="text-sm text-gray-600 mt-1">
          발음, 유창성, 문장 구조를 단계별로 연습할 수 있습니다. 실수해도 괜찮고 몇 번이고 반복할 수 있습니다.
        </p>
      </div>

      {/* 드릴 섹션 */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-1">📐 Structured Drills</h2>
          <p className="text-xs text-gray-600 mb-3">
            4가지 핵심 스킬을 집중적으로 연습합니다. 각 드릴은 구체적인 목표와 측정 지표를 제시합니다.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Link
            href="/speaking-2026/drills"
            className="rounded-lg border bg-white px-4 py-4 text-left shadow-sm transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
          >
            <div className="text-sm font-semibold">모든 Drill 보기</div>
            <div className="mt-1 text-xs text-neutral-500">
              3-Second Cheat · 45-Second Structure · Brainstorming · Fluency Marathon · Improvisation
            </div>
          </Link>

          <Link
            href="/speaking-2026/drills/fluency"
            className="rounded-lg border bg-white px-4 py-4 text-left shadow-sm transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
          >
            <div className="text-sm font-semibold">🎙️ Fluency Marathon</div>
            <div className="mt-1 text-xs text-neutral-500">
              연속 발화 능력 강화. 목표: 130-150 WPM
            </div>
          </Link>
        </div>
      </section>

      {/* 게임 섹션 */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-1">🎮 Pronunciation & Prosody Games</h2>
          <p className="text-xs text-gray-600 mb-3">
            발음, 강세, 인토네이션, 운율을 재미있게 연습합니다. 게임 방식으로 점수를 쌓고 배지를 획득합니다.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Link
            href="/speaking-2026/games/stress-hunt"
            className="rounded-lg border bg-white px-4 py-4 text-left shadow-sm transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
          >
            <div className="text-sm font-semibold">Stress Hunt</div>
            <div className="mt-1 text-xs text-neutral-500">
              단어의 정확한 강세 위치를 찾아 정확한 발음으로 말합니다.
            </div>
          </Link>

          <Link
            href="/speaking-2026/games/intonation-wave"
            className="rounded-lg border bg-white px-4 py-4 text-left shadow-sm transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
          >
            <div className="text-sm font-semibold">Intonation Wave</div>
            <div className="mt-1 text-xs text-neutral-500">
              문장의 음가 곡선(pitch)을 맞춰 자연스러운 인토네이션을 연습합니다.
            </div>
          </Link>

          <Link
            href="/speaking-2026/games/emphasis-challenge"
            className="rounded-lg border bg-white px-4 py-4 text-left shadow-sm transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
          >
            <div className="text-sm font-semibold">Emphasis Challenge</div>
            <div className="mt-1 text-xs text-neutral-500">
              핵심 단어에 강조를 넣어 의미 전달을 명확히 합니다.
            </div>
          </Link>

          <Link
            href="/speaking-2026/games/prosody-race"
            className="rounded-lg border bg-white px-4 py-4 text-left shadow-sm transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
          >
            <div className="text-sm font-semibold">Prosody Race</div>
            <div className="mt-1 text-xs text-neutral-500">
              자연스러운 rhythm과 timing으로 문장을 영어답게 말합니다.
            </div>
          </Link>
        </div>
      </section>

      {/* Task 실전 연습 */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-1">🎯 Task Practice</h2>
          <p className="text-xs text-gray-600 mb-3">
            실제 TOEFL Task 형식으로 연습합니다. 도중에 멈추고 반복할 수 있습니다.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Link
            href="/speaking-2026/listen-and-repeat"
            className="rounded-lg border bg-white px-4 py-4 text-left shadow-sm transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
          >
            <div className="text-sm font-semibold">Listen & Repeat</div>
            <div className="mt-1 text-xs text-neutral-500">
              Task 1 형식. 들은 문장을 정확하게 따라합니다.
            </div>
          </Link>

          <Link
            href="/speaking-2026/shadowing/listen-and-repeat"
            className="rounded-lg border bg-white px-4 py-4 text-left shadow-sm transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
          >
            <div className="text-sm font-semibold">Shadowing Practice</div>
            <div className="mt-1 text-xs text-neutral-500">
              음원을 보면서 함께 따라 말하며 발음과 운율을 자연스럽게 합니다.
            </div>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <div className="pt-4 flex justify-center">
        <Link
          href="/speaking-2026"
          className="text-sm text-neutral-600 hover:underline"
        >
          ← Hub로 돌아가기
        </Link>
      </div>
    </div>
  );
}

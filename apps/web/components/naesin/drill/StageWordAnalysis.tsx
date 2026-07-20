"use client";

import type { UnknownWordMark } from "@/components/naesin/drill/types";

type Props = {
  unknownWords: UnknownWordMark[];
  onUpdateWordMeta: (
    id: string,
    patch: Partial<Pick<UnknownWordMark, "pos" | "meaning">>,
  ) => void;
  onRemoveWord: (id: string) => void;
};

export default function Stage1WordAnalysis({
  unknownWords,
  onUpdateWordMeta,
  onRemoveWord,
}: Props) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-neutral-400">
            Stage 1
          </div>
          <div className="text-lg font-semibold text-neutral-900">단어 분석</div>
          <div className="mt-1 text-sm text-neutral-500">
            지문에서 모르는 단어를 체크한 뒤 품사와 뜻을 확인합니다.
          </div>
        </div>

        <div className="rounded-full border bg-neutral-50 px-3 py-1 text-xs text-neutral-600">
          체크 단어 {unknownWords.length}개
        </div>
      </div>

      <div className="mt-4">
        {unknownWords.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-neutral-50 p-6 text-sm text-neutral-500">
            왼쪽 지문에서 모르는 단어를 클릭해서 체크하세요.
          </div>
        ) : (
          <div className="space-y-3">
            {unknownWords.map((word) => (
              <div
                key={word.id}
                className="rounded-xl border bg-neutral-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-neutral-900">
                      {word.word}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      문장 {word.sentenceIndex + 1}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveWord(word.id)}
                    className="rounded-lg border px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    제거
                  </button>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-700">품사</label>
                    <input
                      value={word.pos ?? ""}
                      onChange={(e) =>
                        onUpdateWordMeta(word.id, { pos: e.target.value })
                      }
                      placeholder="예: n. / v. / adj."
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-700">뜻</label>
                    <input
                      value={word.meaning ?? ""}
                      onChange={(e) =>
                        onUpdateWordMeta(word.id, { meaning: e.target.value })
                      }
                      placeholder="뜻 입력"
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

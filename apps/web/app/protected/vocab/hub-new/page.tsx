"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Chapter = {
  chapterId: string;
  dayNumber: number;
  bookId: string;
};

type ProgressData = {
  ok: boolean;
  blocked: boolean;
  message?: string;
  todayCount?: number;
  nextChapter?: Chapter;
};

type ReviewData = {
  ok: boolean;
  chapters: Chapter[];
};

type Sentence = {
  id: string;
  sentence: string;
  translation: string;
  difficulty: "easy" | "medium" | "hard";
};

type WritingTask = {
  id: string;
  korean: string;
  english: string;
  grammar: string;
  hints: string[];
  missingWord: string;
};

const SAMPLE_SENTENCES: Sentence[] = [
  {
    id: "1",
    sentence: "The vast expanse of the universe continues to extend our understanding of its complexity.",
    translation: "우주의 광대한 범위는 우리의 이해를 계속 확장시킨다.",
    difficulty: "hard",
  },
  {
    id: "2",
    sentence: "Despite the adversity faced by the pioneers, their resilience ultimately facilitated progress.",
    translation: "선구자들이 직면한 역경에도 불구하고, 그들의 회복력은 궁극적으로 진보를 촉진했다.",
    difficulty: "hard",
  },
  {
    id: "3",
    sentence: "The inherent contradiction in his argument undermined the credibility of his entire thesis.",
    translation: "그의 논증에 내재된 모순은 그의 전체 논문의 신뢰성을 훼손했다.",
    difficulty: "medium",
  },
];

export default function VocabHubNewPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string>("");
  const [bookId, setBookId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [todayData, setTodayData] = useState<ProgressData | null>(null);
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [activeTab, setActiveTab] = useState<"today" | "review">("today");

  // 오늘의 문장 상태
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [revealed, setRevealed] = useState(false);

  // 오늘의 작문 상태
  const [writingIdx, setWritingIdx] = useState(0);
  const [writingInput, setWritingInput] = useState("");
  const [writingRevealed, setWritingRevealed] = useState(false);
  const [writingTasks, setWritingTasks] = useState<WritingTask[]>([]);
  const [writingLoading, setWritingLoading] = useState(false);

  // 초기 로드: 학생 ID와 할당된 책 조회
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/student/profile");
        if (!res.ok) {
          setError("학생 정보를 불러올 수 없습니다.");
          return;
        }
        const data = await res.json();
        setStudentId(data.studentId);
        setBookId(data.bookId);
      } catch (e: any) {
        setError(e?.message ?? "초기화 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // 오늘의 학습 데이터 조회
  useEffect(() => {
    if (!studentId || !bookId) return;

    async function loadTodayProgress() {
      try {
        const res = await fetch(
          `/api/vocab/progress?action=today&studentId=${studentId}&bookId=${bookId}`
        );
        const data: ProgressData = await res.json();
        setTodayData(data);
      } catch (e: any) {
        setError(e?.message ?? "진도 데이터를 불러올 수 없습니다.");
      }
    }

    loadTodayProgress();
  }, [studentId, bookId]);

  // 복습 데이터 조회
  useEffect(() => {
    if (!studentId || !bookId) return;

    async function loadReview() {
      try {
        const res = await fetch(
          `/api/vocab/progress?action=review&studentId=${studentId}&bookId=${bookId}`
        );
        const data: ReviewData = await res.json();
        setReviewData(data);
      } catch (e: any) {
        setError(e?.message ?? "복습 목록을 불러올 수 없습니다.");
      }
    }

    loadReview();
  }, [studentId, bookId]);

  // 오늘의 작문 문제 생성
  useEffect(() => {
    if (!todayData?.nextChapter?.chapterId) return;

    async function generateWritingTasks() {
      try {
        setWritingLoading(true);

        // 현재 chapter의 단어 조회
        const chapRes = await fetch(
          `/api/vocab/chapter?chapterId=${todayData.nextChapter!.chapterId}`
        );
        const chapData = await chapRes.json();

        if (!chapData.ok || !chapData.words?.length) {
          console.warn("No words found for chapter");
          // 테스트 데이터
          const testTasks: WritingTask[] = [
            {
              id: "w1",
              korean: "과학자는 발표하기 전에 데이터를 신중하게 분석했다.",
              english: "The scientist examined the data carefully before publishing.",
              grammar: "3형식",
              hints: ["carefully", "scientist", "data", "publishing"],
              missingWord: "examined",
            },
            {
              id: "w2",
              korean: "어제 회의에서 언급된 문제들이 즉시 해결되었다.",
              english: "The problems mentioned in yesterday's meeting were resolved immediately.",
              grammar: "수동태 + 형용사절",
              hints: ["problems", "yesterday's", "resolved", "immediately"],
              missingWord: "mentioned",
            },
            {
              id: "w3",
              korean: "학생들이 열심히 공부하면, 그들의 성적은 향상된다.",
              english: "When students study diligently, their grades improve significantly.",
              grammar: "조건절",
              hints: ["students", "diligently", "grades", "improve"],
              missingWord: "study",
            },
          ];
          setWritingTasks(testTasks);
          return;
        }

        // 상위 3개 단어 선택해서 작문 문제 생성
        const selectedWords = chapData.words.slice(0, 3);

        const allTasks: WritingTask[] = [];
        for (const word of selectedWords) {
          console.log("Generating task for word:", word.word);
          const genRes = await fetch("/api/vocab/generate-writing-tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              word: word.word,
              meaning: word.meaning || "unknown",
              count: 1,
            }),
          });

          const genData = await genRes.json();
          console.log("Generation response:", genData);
          if (genData.ok && genData.tasks?.length) {
            allTasks.push(genData.tasks[0]);
          }
        }

        if (allTasks.length > 0) {
          setWritingTasks(allTasks);
        } else {
          console.warn("No tasks generated, using test data");
          // 테스트 데이터로 폴백
          const testTasks: WritingTask[] = [
            {
              id: "w1",
              korean: "과학자는 발표하기 전에 데이터를 신중하게 분석했다.",
              english: "The scientist examined the data carefully before publishing.",
              grammar: "3형식",
              hints: ["carefully", "scientist", "data", "publishing"],
              missingWord: "examined",
            },
          ];
          setWritingTasks(testTasks);
        }
      } catch (e: any) {
        console.error("Failed to generate writing tasks:", e);
        // 테스트 데이터로 폴백
        const testTasks: WritingTask[] = [
          {
            id: "w1",
            korean: "과학자는 발표하기 전에 데이터를 신중하게 분석했다.",
            english: "The scientist examined the data carefully before publishing.",
            grammar: "3형식",
            hints: ["carefully", "scientist", "data", "publishing"],
            missingWord: "examined",
          },
        ];
        setWritingTasks(testTasks);
      } finally {
        setWritingLoading(false);
      }
    }

    generateWritingTasks();
  }, [todayData?.nextChapter?.chapterId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">로드 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">단어 학습</h1>
          <p className="text-gray-600 mt-2">하루에 최대 2개 Day까지 학습할 수 있습니다.</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* 탭 */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab("today")}
            className={`px-4 py-2 font-medium ${
              activeTab === "today"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            오늘의 학습
          </button>
          <button
            onClick={() => setActiveTab("review")}
            className={`px-4 py-2 font-medium ${
              activeTab === "review"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            복습 ({reviewData?.chapters?.length ?? 0})
          </button>
        </div>

        {/* 오늘의 학습 탭 */}
        {activeTab === "today" && (
          <div className="bg-white rounded-lg shadow p-6">
            {todayData?.blocked ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">🎉</div>
                <p className="text-lg font-semibold text-gray-800">{todayData.message}</p>
              </div>
            ) : todayData?.nextChapter ? (
              <div>
                <div className="mb-6">
                  <p className="text-gray-600 mb-2">
                    오늘 완료한 Day: <span className="font-bold">{todayData.todayCount ?? 0}/2</span>
                  </p>
                  <div className="flex gap-1">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 flex-1 rounded ${
                          i < (todayData.todayCount ?? 0)
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      ></div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <p className="text-gray-600 mb-4">다음 학습</p>
                  <div className="bg-blue-50 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      Day {todayData.nextChapter.dayNumber}
                    </h3>
                    <button
                      onClick={() => {
                        // 기존 Voca 세션으로 이동
                        window.location.href = `/vocab/session?setId=${todayData.nextChapter!.chapterId}&dayIndex=${todayData.nextChapter!.dayNumber}`;
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
                    >
                      학습 시작
                    </button>
                  </div>
                </div>

                {/* 오늘의 문장 섹션 */}
                <div className="border-t pt-6 mt-6">
                  <div className="rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100 p-6 mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">✍️ 오늘의 문장</h2>
                    <p className="mt-1 text-slate-600">학습한 단어를 포함한 어려운 문장을 해석해보세요</p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="mb-6 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-600">
                        문장 {sentenceIdx + 1} / {SAMPLE_SENTENCES.length}
                      </span>
                      <span className="inline-block px-3 py-1 rounded-full text-sm font-bold bg-rose-100 text-rose-700">
                        {SAMPLE_SENTENCES[sentenceIdx].difficulty}
                      </span>
                    </div>

                    {/* 문장 표시 */}
                    <div className="mb-6 space-y-4">
                      <div className="text-xl font-bold text-slate-900 leading-relaxed">
                        {SAMPLE_SENTENCES[sentenceIdx].sentence}
                      </div>
                    </div>

                    {/* 해석 입력 */}
                    <div className="mb-4">
                      <textarea
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="문장의 해석을 입력하세요..."
                        disabled={revealed}
                        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-900 placeholder-slate-500 focus:border-rose-500 focus:outline-none disabled:bg-slate-50"
                        rows={3}
                      />
                    </div>

                    {/* 정답 확인 */}
                    {revealed && (
                      <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                        <div className="text-sm font-semibold text-emerald-700 mb-2">📝 정답 해석</div>
                        <div className="text-slate-900 leading-relaxed">{SAMPLE_SENTENCES[sentenceIdx].translation}</div>
                      </div>
                    )}

                    {/* 버튼 */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setRevealed(!revealed)}
                        className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-3 text-white font-semibold transition"
                      >
                        {revealed ? "숨기기" : "정답 보기"}
                      </button>
                      <button
                        onClick={() => {
                          setSentenceIdx(sentenceIdx + 1);
                          setUserInput("");
                          setRevealed(false);
                        }}
                        disabled={sentenceIdx >= SAMPLE_SENTENCES.length - 1}
                        className="flex-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 px-4 py-3 text-white font-semibold transition"
                      >
                        {sentenceIdx < SAMPLE_SENTENCES.length - 1 ? "다음 문장 ▶" : "완료 ✅"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 오늘의 작문 섹션 */}
                <div className="border-t pt-6 mt-6">
                  <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-6 mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">📝 오늘의 작문</h2>
                    <p className="mt-1 text-slate-600">한글 해석과 단어 힌트를 보고 영문 문장을 완성하세요</p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    {writingLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
                        <p className="mt-4 text-gray-600">작문 문제를 생성 중입니다...</p>
                      </div>
                    ) : writingTasks.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-600">작문 문제를 생성할 수 없습니다.</p>
                      </div>
                    ) : (
                      <div>
                        <div className="mb-6 flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-600">
                            문제 {writingIdx + 1} / {writingTasks.length}
                          </span>
                        </div>

                        {/* 한글 해석 */}
                        <div className="mb-6 p-4 bg-amber-50 rounded-lg border-l-4 border-amber-500">
                          <p className="text-sm font-semibold text-slate-600 mb-2">한글 해석</p>
                          <p className="text-lg text-slate-900 leading-relaxed">
                            {writingTasks[writingIdx].korean}
                          </p>
                        </div>

                        {/* 문법 구조 */}
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                          <p className="text-sm font-semibold text-slate-600 mb-2">문법 구조</p>
                          <p className="text-base font-semibold text-blue-700">
                            [{writingTasks[writingIdx].grammar}]
                          </p>
                        </div>

                        {/* 단어 힌트 테이블 */}
                        <div className="mb-6">
                          <p className="text-sm font-semibold text-slate-600 mb-3">단어 힌트</p>
                          <div className="grid grid-cols-2 gap-3">
                            {writingTasks[writingIdx].hints.map((hint, idx) => (
                              <div
                                key={idx}
                                className="bg-amber-100 border-2 border-amber-300 rounded-lg p-3 text-center"
                              >
                                <span className="font-bold text-slate-900">[{hint}]</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 작문 입력 */}
                        <div className="mb-4">
                          <p className="text-sm font-semibold text-slate-600 mb-2">영문 문장 완성</p>
                          <textarea
                            value={writingInput}
                            onChange={(e) => setWritingInput(e.target.value)}
                            placeholder="한글 해석과 단어 힌트를 참고하여 영문 문장을 입력하세요..."
                            disabled={writingRevealed}
                            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base font-medium text-slate-900 placeholder-slate-500 focus:border-amber-500 focus:outline-none disabled:bg-slate-50"
                            rows={4}
                          />
                        </div>

                        {/* 정답 확인 */}
                        {writingRevealed && (
                          <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                            <div className="text-sm font-semibold text-emerald-700 mb-2">✅ 정답</div>
                            <div className="text-slate-900 leading-relaxed font-semibold">
                              {writingTasks[writingIdx].english}
                            </div>
                            <div className="text-sm text-emerald-600 mt-2">
                              핵심 단어: <span className="font-bold">{writingTasks[writingIdx].missingWord}</span>
                            </div>
                          </div>
                        )}

                        {/* 버튼 */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => setWritingRevealed(!writingRevealed)}
                            className="flex-1 rounded-lg bg-amber-600 hover:bg-amber-700 px-4 py-3 text-white font-semibold transition"
                          >
                            {writingRevealed ? "숨기기" : "정답 보기"}
                          </button>
                          <button
                            onClick={() => {
                              setWritingIdx(writingIdx + 1);
                              setWritingInput("");
                              setWritingRevealed(false);
                            }}
                            disabled={writingIdx >= writingTasks.length - 1}
                            className="flex-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 px-4 py-3 text-white font-semibold transition"
                          >
                            {writingIdx < writingTasks.length - 1 ? "다음 문제 ▶" : "완료 ✅"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">데이터를 불러오는 중...</p>
              </div>
            )}
          </div>
        )}

        {/* 복습 탭 */}
        {activeTab === "review" && (
          <div className="bg-white rounded-lg shadow p-6">
            {reviewData && reviewData.chapters.length > 0 ? (
              <div>
                <p className="text-gray-600 mb-4">완료한 Day를 선택하여 복습하세요.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {reviewData.chapters.map((ch) => (
                    <button
                      key={ch.chapterId}
                      onClick={() => {
                        window.location.href = `/vocab/session?setId=${ch.chapterId}&dayIndex=${ch.dayNumber}&mode=review`;
                      }}
                      className="bg-gradient-to-br from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700 text-white font-semibold py-4 rounded-lg transition text-center"
                    >
                      Day {ch.dayNumber}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">아직 완료한 Day가 없습니다.</p>
                <p className="text-sm text-gray-500 mt-2">
                  오늘의 학습을 완료하면 복습이 가능합니다.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

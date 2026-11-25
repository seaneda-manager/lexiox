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

type WritingTask = {
  id: string;
  korean: string;
  english: string;
  grammar: string;
  hints: string[];
  missingWord: string;
};

export default function VocabHubNewPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string>("");
  const [bookId, setBookId] = useState<string>("");
  const [books, setBooks] = useState<Array<{ trackId: string; title: string }>>([]);
  const [loading, setLoading] = useState(true);

  function pickBook(id: string) {
    if (id === bookId) return;
    setTodayData(null);
    setReviewData(null);
    setTestEligibility(null);
    setBookId(id);
    try {
      localStorage.setItem("vocab_hub_book", id);
    } catch {
      /* ignore */
    }
  }
  const [error, setError] = useState<string>("");

  const [todayData, setTodayData] = useState<ProgressData | null>(null);
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [activeTab, setActiveTab] = useState<"today" | "review" | "games">("today");

  // 단어 시험 자격 (해당 Day 학습을 깜지까지 완료해야 학원에서 시험 가능)
  const [testEligibility, setTestEligibility] = useState<{
    dayComplete: boolean;
    testTaken: boolean;
    score: number | null;
    day: number | null;
  } | null>(null);

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
        const list: Array<{ trackId: string; title: string }> = Array.isArray(data.books) ? data.books : [];
        setBooks(list);
        // 지난번에 고른 교재가 아직 배정돼 있으면 그걸 유지, 아니면 가장 최근 배정
        let initial: string = data.bookId;
        try {
          const saved = localStorage.getItem("vocab_hub_book");
          if (saved && list.some((b) => b.trackId === saved)) initial = saved;
        } catch {
          /* ignore */
        }
        setBookId(initial);
      } catch (e: any) {
        setError(e?.message ?? "초기화 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // 오늘의 학습 데이터 조회 함수
  const loadTodayProgress = async () => {
    if (!studentId || !bookId) return;
    try {
      const res = await fetch(
        `/api/vocab/progress?action=today&studentId=${studentId}&bookId=${bookId}`
      );
      const data: ProgressData = await res.json();
      setTodayData(data);
    } catch (e: any) {
      setError(e?.message ?? "진도 데이터를 불러올 수 없습니다.");
    }
  };

  // 단어 시험 자격 조회
  const loadTestEligibility = async () => {
    if (!bookId) return;
    try {
      const res = await fetch(
        `/api/vocab/test/eligibility?track_id=${encodeURIComponent(bookId)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const d = await res.json();
      if (d?.ok) {
        setTestEligibility({
          dayComplete: !!d.dayComplete,
          testTaken: !!d.testTaken,
          score: typeof d.score === "number" ? d.score : null,
          day: typeof d.day === "number" ? d.day : null,
        });
      }
    } catch {
      /* non-fatal */
    }
  };

  // 복습 데이터 조회 함수
  const loadReviewData = async () => {
    if (!studentId || !bookId) return;
    try {
      const res = await fetch(
        `/api/vocab/progress?action=review&studentId=${studentId}&bookId=${bookId}`
      );
      const data: ReviewData = await res.json();
      setReviewData(data);
    } catch (e: any) {
      setError(e?.message ?? "복습 목록을 불러올 수 없습니다.");
    }
  };

  // 초기 로드
  useEffect(() => {
    if (!studentId || !bookId) return;
    loadTodayProgress();
    loadReviewData();
    loadTestEligibility();
  }, [studentId, bookId]);

  // 페이지 포커스 시 데이터 새로고침 (학습 완료 후 돌아올 때)
  useEffect(() => {
    const handleFocus = () => {
      loadTodayProgress();
      loadReviewData();
      loadTestEligibility();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
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
          setWritingTasks([]);
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
          console.warn("No tasks generated");
          setWritingTasks([]);
        }
      } catch (e: any) {
        console.error("Failed to generate writing tasks:", e);
        setWritingTasks([]);
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
          {books.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {books.map((b) => (
                <button
                  key={b.trackId}
                  onClick={() => pickBook(b.trackId)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                    b.trackId === bookId
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {b.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* 한눈에 보기 위젯: 요약 + 바로 들어가기 */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <button
            onClick={() => setActiveTab("today")}
            className="rounded-xl border border-blue-200 bg-white p-4 text-left shadow-sm hover:bg-blue-50"
          >
            <p className="text-xs font-semibold text-blue-700">📖 오늘 학습</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {todayData?.blocked
                ? "오늘 완료"
                : todayData?.nextChapter
                  ? `Day ${todayData.nextChapter.dayNumber}`
                  : "-"}
            </p>
            <p className="text-xs text-gray-500">오늘 {todayData?.todayCount ?? 0}/2 완료</p>
          </button>
          <button
            onClick={() => setActiveTab("review")}
            className="rounded-xl border border-emerald-200 bg-white p-4 text-left shadow-sm hover:bg-emerald-50"
          >
            <p className="text-xs font-semibold text-emerald-700">🔁 복습</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{reviewData?.chapters?.length ?? 0}개</p>
            <p className="text-xs text-gray-500">복습할 Day</p>
          </button>
          <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-amber-700">📝 단어 시험</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {!testEligibility
                ? "-"
                : testEligibility.testTaken
                  ? `완료${testEligibility.score != null ? ` ${testEligibility.score}점` : ""}`
                  : testEligibility.dayComplete
                    ? "응시 가능"
                    : "학습 후 가능"}
            </p>
            <p className="text-xs text-gray-500">학원에서 응시</p>
          </div>
          <button
            onClick={() => router.push("/vocab/dashboard")}
            className="rounded-xl border border-violet-200 bg-white p-4 text-left shadow-sm hover:bg-violet-50"
          >
            <p className="text-xs font-semibold text-violet-700">📊 내 통계</p>
            <p className="mt-1 text-lg font-bold text-gray-900">보러 가기</p>
            <p className="text-xs text-gray-500">진도·약한 단어·활동</p>
          </button>
        </div>

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
          <button
            onClick={() => setActiveTab("games")}
            className={`px-4 py-2 font-medium ${
              activeTab === "games"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            🎮 게임
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
                  <p className="text-gray-600 mb-4">
                    다음 학습 <span className="text-xs text-gray-400">· 집에서 하는 단어 숙제</span>
                  </p>
                  <div className="bg-blue-50 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">
                      Day {todayData.nextChapter.dayNumber}
                    </h3>
                    <p className="mb-4 text-xs text-gray-500">
                      PreScreen → 스펠링 → 학습 → Speed → 깜지까지 끝내야 완료
                    </p>
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

                  {/* 단어 시험 안내 + 자격 상태 */}
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm text-amber-900">
                      📌 <span className="font-semibold">숙제인 단어 학습(깜지까지)을 완료해야만 학원에서 단어 시험을 볼 수 있습니다.</span>
                    </p>
                    {testEligibility && (
                      <div className="mt-3 space-y-3">
                        {testEligibility.testTaken ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                            ✓ 단어 시험 완료{testEligibility.score != null ? ` · ${testEligibility.score}점` : ""}
                          </span>
                        ) : testEligibility.dayComplete ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                            ● 학습 완료 · 학원에서 단어 시험 응시 가능
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-600">
                            🔒 학습 미완료 · 단어 시험 잠김
                          </span>
                        )}
                        {testEligibility.dayComplete && !testEligibility.testTaken && (
                          <button
                            onClick={() => {
                              window.location.href = testEligibility.day
                                ? `/vocab/test?track_id=${bookId}&day=${testEligibility.day}`
                                : "/vocab/test";
                            }}
                            className="block w-full rounded-lg border border-amber-300 bg-white py-2 text-center text-sm font-semibold text-amber-800 hover:bg-amber-100"
                          >
                            단어 시험 보러 가기 →
                          </button>
                        )}
                      </div>
                    )}
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

        {/* 게임 탭 */}
        {activeTab === "games" && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">단어 게임으로 재미있게 학습하세요! 🎮</h2>
              <p className="text-gray-600">학습한 단어를 게임으로 복습하고 보상을 얻으세요.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 동의어 게임 */}
              <button
                onClick={() => router.push("/vocab/synonym-game")}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 hover:border-purple-400 p-6 text-left transition-all hover:shadow-lg"
              >
                <div className="absolute top-2 right-2 text-4xl">🧠</div>
                <h3 className="text-xl font-bold text-purple-900 mb-2">동의어 게임</h3>
                <p className="text-sm text-purple-700 mb-4">
                  단어의 동의어를 찾아 15개 문제를 푸세요. 정확한 선택이 스트릭을 높여줍니다!
                </p>
                <div className="inline-block bg-purple-600 group-hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition">
                  게임 시작 →
                </div>
              </button>

              {/* 단어 게임 모음 */}
              <button
                onClick={() => router.push("/workout/games")}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 hover:border-orange-400 p-6 text-left transition-all hover:shadow-lg"
              >
                <div className="absolute top-2 right-2 text-4xl">🎮</div>
                <h3 className="text-xl font-bold text-orange-900 mb-2">단어 게임 모음</h3>
                <p className="text-sm text-orange-700 mb-4">
                  활쏘기, 테트리스 등 다양한 단어 게임으로 학습한 단어를 연습하세요.
                </p>
                <div className="inline-block bg-orange-600 group-hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition">
                  게임 보러 가기 →
                </div>
              </button>


              {/* 보너스 게임 (Comming Soon) */}
              <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 p-6 text-left opacity-60">
                <div className="absolute top-2 right-2 text-4xl">🎯</div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">더 많은 게임들...</h3>
                <p className="text-sm text-gray-600 mb-4">
                  새로운 게임이 곧 추가될 예정입니다.
                </p>
                <div className="inline-block bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold text-sm">
                  준비 중...
                </div>
              </div>
            </div>

            {/* 게임 정보 */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <span className="font-bold">💡 팁:</span> 게임을 매일 플레이하면 보상을 받을 수 있습니다. 친구와 함께 경쟁해보세요!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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

export default function VocabHubNewPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string>("");
  const [bookId, setBookId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [todayData, setTodayData] = useState<ProgressData | null>(null);
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [activeTab, setActiveTab] = useState<"today" | "review">("today");

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
            복습 ({reviewData?.chapters.length ?? 0})
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

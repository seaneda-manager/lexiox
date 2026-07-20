"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { addDay1Action } from "./add-day-action";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DebugPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        // 현재 사용자 정보
        const { data: authUser } = await supabase.auth.getUser();
        if (!authUser?.user?.id) {
          setData({ error: "NOT_LOGGED_IN" });
          setLoading(false);
          return;
        }

        // 학생 정보
        const { data: studentData } = await supabase
          .from("academy_students")
          .select("id, user_id, auth_user_id")
          .eq("auth_user_id", authUser.user.id)
          .maybeSingle();

        if (!studentData?.id) {
          setData({ error: "STUDENT_NOT_FOUND" });
          setLoading(false);
          return;
        }

        // 할당된 모든 단어집
        const { data: assignments } = await supabase
          .from("student_vocab_assignments")
          .select("id, set_id, day_index, available_at, assigned_at, completed_at")
          .eq("student_id", studentData.id)
          .is("canceled_at", null)
          .order("available_at", { ascending: true });

        // 모든 vocab_sets (track_id 포함)
        const { data: allSets } = await supabase
          .from("vocab_sets")
          .select("id, title, track_id, order_index");

        // track 정보 조회
        const trackIds = [...new Set((allSets ?? []).map((s: any) => s.track_id).filter(Boolean))];
        const { data: tracks } = await supabase
          .from("vocab_tracks")
          .select("id, title")
          .in("id", trackIds);

        const trackMap = new Map<string, string>();
        (tracks ?? []).forEach((t: any) => {
          trackMap.set(t.id, t.title);
        });

        setData({
          studentId: studentData.id,
          assignments,
          allSets,
          trackMap: Object.fromEntries(trackMap),
        });
      } catch (e: any) {
        setData({ error: String(e?.message ?? e) });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAddDay1 = async () => {
    setAdding(true);
    try {
      const res = await addDay1Action();
      setResult(res);
      if (res.ok) {
        // 1초 후 페이지 새로고침
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (e) {
      setResult({ ok: false, error: String(e) });
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div className="p-6">로딩 중...</div>;

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">📊 Debug: Vocab Assignments</h1>

      {data?.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {data.error}
        </div>
      )}

      {data?.studentId && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold mb-2">Student ID</h2>
            <code className="bg-slate-100 p-2 rounded block">{data.studentId}</code>
          </div>

          <div>
            <h2 className="text-lg font-bold mb-2">📚 All Available Sets</h2>
            <div className="bg-slate-50 p-4 rounded overflow-auto max-h-60">
              {data.allSets?.map((s: any) => (
                <div key={s.id} className="bg-white p-2 rounded mb-2 border border-gray-200">
                  <p><strong>Title:</strong> {s.title} (Day {s.order_index})</p>
                  <p><strong>Track:</strong> {data.trackMap?.[s.track_id] || s.track_id}</p>
                  <p className="text-xs text-gray-600"><strong>ID:</strong> {s.id}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold mb-2">🎯 Your Assignments</h2>
            <div className="bg-slate-50 p-4 rounded overflow-auto">
              <pre>{JSON.stringify(data.assignments, null, 2)}</pre>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold mb-2">🔍 Hackers Voca Status</h2>
            {data.allSets?.some((s: any) => s.name?.includes("Hackers")) ? (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                <p className="font-semibold mb-2">✅ Hackers Voca Found in vocab_sets</p>
                {data.allSets
                  ?.filter((s: any) => s.name?.includes("Hackers"))
                  .map((s: any) => (
                    <div key={s.id} className="bg-white p-3 rounded mb-2">
                      <p><strong>ID:</strong> {s.id}</p>
                      <p><strong>Name:</strong> {s.name}</p>
                      <p><strong>Assigned to you:</strong> {data.assignments?.some((a: any) => a.set_id === s.id) ? "✅ Yes" : "❌ No"}</p>

                      {/* Day 목록 */}
                      <div className="ml-4 mt-2">
                        {data.assignments?.filter((a: any) => a.set_id === s.id).length > 0 ? (
                          data.assignments?.filter((a: any) => a.set_id === s.id).map((a: any) => (
                            <div key={a.id} className="bg-slate-50 p-2 rounded text-sm mb-2">
                              <p>Day {a.day_index} - Available: {a.available_at}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-600 mb-2">❌ No days assigned</p>
                        )}
                      </div>

                      {/* Day 1 추가 버튼 */}
                      {!data.assignments?.some((a: any) => a.set_id === s.id && a.day_index === 1) && (
                        <button
                          onClick={handleAddDay1}
                          disabled={adding}
                          className="mt-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded font-semibold"
                        >
                          {adding ? "추가 중..." : "➕ Add Day 1"}
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                <p>❌ Hackers Voca not found in vocab_sets</p>
              </div>
            )}
          </div>

          {/* 결과 메시지 */}
          {result && (
            <div className={`mt-4 p-4 rounded ${result.ok ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
              <p className={result.ok ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>
                {result.ok ? "✅ " : "❌ "}
                {result.message || result.error}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// app/protected/student/review/_lib/skills.ts
// 학생 리뷰: 영역(Reading/Speaking/Listening/Writing)별 결과 목록 로더. 허브와 영역별 페이지가 공용으로 쓴다.
import type { SupabaseClient } from "@supabase/supabase-js";

export type SkillKey = "reading" | "speaking" | "listening" | "writing";

export interface ReviewRow {
  id: string;
  label: string;
  meta: string;
  href: string;
  /** 보조 링크 (예: Writing Drill) */
  extra?: { label: string; href: string };
  at: string | null;
}

export interface SkillList {
  rows: ReviewRow[];
  total: number;
}

export const SKILL_META: Record<
  SkillKey,
  { title: string; desc: string; color: "blue" | "orange" | "violet" | "teal"; emptyHref: string; emptyLabel: string }
> = {
  reading: { title: "Reading", desc: "문항별 정답·오답 복습, 단어·근거 분석", color: "blue", emptyHref: "/updated-reading/study", emptyLabel: "Reading 연습 시작하기" },
  speaking: { title: "Speaking", desc: "스크립트 · 피드백 · 다시 녹음", color: "orange", emptyHref: "/speaking-2026/study", emptyLabel: "Speaking 연습 시작하기" },
  listening: { title: "Listening", desc: "문항별 스크립트와 해설 복습", color: "violet", emptyHref: "/updated-listening", emptyLabel: "Listening 연습 시작하기" },
  writing: { title: "Writing", desc: "답안 비교 · 모범답안 · Drill", color: "teal", emptyHref: "/updated-writing/test", emptyLabel: "Writing 연습 시작하기" },
};

const fmt = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("ko-KR") : "-");

async function labelMap(supabase: SupabaseClient, table: string, ids: (string | null)[]): Promise<Record<string, string>> {
  const uniq = [...new Set(ids.filter(Boolean))] as string[];
  if (uniq.length === 0) return {};
  const { data } = await supabase.from(table).select("id,label").in("id", uniq);
  return (data ?? []).reduce<Record<string, string>>((acc, t: any) => {
    if (t?.id) acc[t.id] = t.label ?? t.id;
    return acc;
  }, {});
}

export async function loadSkill(supabase: SupabaseClient, userId: string, skill: SkillKey, limit: number): Promise<SkillList> {
  switch (skill) {
    case "reading": {
      const { data, count } = await supabase
        .from("reading_results_2026")
        .select("id,test_id,total_questions,finished_at", { count: "exact" })
        .eq("user_id", userId)
        .order("finished_at", { ascending: false })
        .limit(limit);
      const labels = await labelMap(supabase, "reading_tests_2026", (data ?? []).map((r: any) => r.test_id));
      return {
        total: count ?? data?.length ?? 0,
        rows: (data ?? []).map((r: any) => ({
          id: r.id,
          label: (r.test_id && labels[r.test_id]) || r.test_id || "Unknown",
          meta: `${r.total_questions ?? 0}문항 · ${fmt(r.finished_at)}`,
          href: `/student/review/reading/${r.id}`,
          at: r.finished_at,
        })),
      };
    }
    case "speaking": {
      const { data, count } = await supabase
        .from("speaking_results_2026")
        .select("id,test_id,content_score,created_at", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      const labels = await labelMap(supabase, "speaking_tests", (data ?? []).map((r: any) => r.test_id));
      return {
        total: count ?? data?.length ?? 0,
        rows: (data ?? []).map((r: any) => ({
          id: r.id,
          label: (r.test_id && labels[r.test_id]) || r.test_id || "Unknown",
          meta: `${fmt(r.created_at)}${r.content_score != null ? ` · 내용 ${r.content_score}점` : ""}`,
          href: `/student/review/speaking/${r.id}`,
          at: r.created_at,
        })),
      };
    }
    case "listening": {
      const { data, count } = await supabase
        .from("listening_results_2026")
        .select("id,test_id,module,difficulty,correct_count,total_questions,finished_at", { count: "exact" })
        .eq("user_id", userId)
        .order("finished_at", { ascending: false })
        .limit(limit);
      const labels = await labelMap(supabase, "listening_tests_2026", (data ?? []).map((r: any) => r.test_id));
      return {
        total: count ?? data?.length ?? 0,
        rows: (data ?? []).map((r: any) => {
          const tq = r.total_questions ?? 0;
          const cc = r.correct_count ?? 0;
          const diff = r.difficulty === "hard" ? " · Hard" : r.difficulty === "easy" ? " · Easy" : "";
          return {
            id: r.id,
            label: (r.test_id && labels[r.test_id]) || r.test_id || "Unknown",
            meta: `Module ${r.module}${diff} · ${tq > 0 ? `${Math.round((cc / tq) * 100)}% (${cc}/${tq})` : `${tq}문항`} · ${fmt(r.finished_at)}`,
            href: `/student/review/listening/${r.id}`,
            at: r.finished_at,
          };
        }),
      };
    }
    case "writing": {
      const { data, count } = await supabase
        .from("writing_2026_sessions")
        .select("id,test_id,created_at,grading_status", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      const labels = await labelMap(supabase, "writing_tests", (data ?? []).map((r: any) => r.test_id));
      return {
        total: count ?? data?.length ?? 0,
        rows: (data ?? []).map((r: any) => ({
          id: r.id,
          label: (r.test_id && labels[r.test_id]) || r.test_id || "Unknown",
          meta: `${fmt(r.created_at)}${r.grading_status === "teacher_graded" ? " · 선생님 채점 완료" : ""}`,
          href: `/writing-2026/review/${r.id}`,
          extra: { label: "Drill", href: `/writing-2026/drill/${r.id}` },
          at: r.created_at,
        })),
      };
    }
  }
}

"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type VocabCourse = {
  courseId: string;
  courseName: string;
  program: "toefl" | "lexiox" | "naesin";
  totalDays: number;
  completedDays: number;
  currentDayIndex: number;
  days: Array<{
    dayIndex: number;
    setId: string;
    wordCount: number;
    completedAt: string | null;
    availableAt: string;
    isCompleted: boolean;
    isAvailable: boolean;
    isLocked: boolean;
    weakWordStats?: {
      totalWrong: number;
      byPOS: Record<string, number>;
    };
  }>;
};

function todayISO_KST(): string {
  const k = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const y = k.getUTCFullYear();
  const m = String(k.getUTCMonth() + 1).padStart(2, "0");
  const d = String(k.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function createAuthedServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!url || !anon) {
    throw new Error("Supabase env missing");
  }

  return createServerClient(url, anon, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name, options) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}

export async function loadVocabHubAction() {
  try {
    const supabase = await createAuthedServerClient();
    const { data: authUser } = await supabase.auth.getUser();

    if (!authUser?.user?.id) {
      return { ok: false, error: "NOT_LOGGED_IN" };
    }

    const userId = authUser.user.id;
    const todayISO = todayISO_KST();

    // 1) 학생 정보 조회 (program, grade_band 포함)
    const { data: studentData } = await supabase
      .from("academy_students")
      .select("id, user_id, auth_user_id, grade_band")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (!studentData?.id) {
      return { ok: false, error: "STUDENT_NOT_FOUND" };
    }

    const studentId = studentData.id;
    const gradeBand = studentData.grade_band ?? null;

    // 2) 프로필에서 program 조회 (또는 다른 테이블)
    const { data: profileData } = await supabase
      .from("profiles")
      .select("program")
      .eq("id", userId)
      .maybeSingle();

    const program = profileData?.program ?? null;

    // 3) 학생의 모든 Vocab 할당 조회
    const { data: assignments } = await supabase
      .from("student_vocab_assignments")
      .select("id, set_id, student_id, day_index, available_at, assigned_at, completed_at, canceled_at")
      .eq("student_id", studentId)
      .is("canceled_at", null)
      .order("available_at", { ascending: true });

    if (!assignments || assignments.length === 0) {
      return { ok: true, courses: [], program };
    }

    // 4) 세트별로 그룹화
    const setIds = [...new Set((assignments as any[]).map((a) => a.set_id))];

    // 4-1) 단어장 메타데이터 조회 (track_id 포함)
    const { data: setMetadata } = await supabase
      .from("vocab_sets")
      .select("id, title, track_id")
      .in("id", setIds);

    // 4-2) track_id별로 vocab_tracks 정보 조회 (grade_band 포함)
    const trackIds = [...new Set((setMetadata ?? []).map((s: any) => s.track_id).filter(Boolean))];
    const { data: trackMetadata } = await supabase
      .from("vocab_tracks")
      .select("id, title, grade_band")
      .in("id", trackIds);

    const trackNameMap = new Map<string, string>();
    const trackGradeBandMap = new Map<string, string | null>();
    (trackMetadata ?? []).forEach((t: any) => {
      trackNameMap.set(t.id, t.title || `Track ${t.id.slice(0, 8)}`);
      trackGradeBandMap.set(t.id, t.grade_band ?? null);
    });

    // 모든 track 표시 (grade_band 필터링 임시 제거)
    const allowedTrackIds = new Set<string>();
    for (const trackId of trackGradeBandMap.keys()) {
      allowedTrackIds.add(trackId);
    }

    // setId → track title 매핑 (필터링된 track만)
    const setTrackMap = new Map<string, string>();
    (setMetadata ?? []).forEach((s: any) => {
      if (allowedTrackIds.has(s.track_id)) {
        const trackName = s.track_id ? trackNameMap.get(s.track_id) || `Track ${s.track_id.slice(0, 8)}` : `Set ${s.id.slice(0, 8)}`;
        setTrackMap.set(s.id, trackName);
      }
    });

    const { data: vocabSets } = await supabase
      .from("vocab_set_items")
      .select("set_id, word_id")
      .in("set_id", setIds);

    const setWordCount = new Map<string, number>();
    (vocabSets ?? []).forEach((item: any) => {
      setWordCount.set(item.set_id, (setWordCount.get(item.set_id) ?? 0) + 1);
    });

    // 5) 학생의 학습 시도 조회 (오답 통계용)
    const { data: attempts } = await supabase
      .from("vocab_learning_attempts")
      .select("set_id, wrong_word_ids, attempted_at")
      .eq("student_id", studentId);

    // 6) Set별 틀린 단어 맵
    const weakWordsBySet = new Map<string, Set<string>>();
    (attempts ?? []).forEach((a: any) => {
      const setId = a.set_id;
      const ids = Array.isArray(a.wrong_word_ids) ? a.wrong_word_ids : [];
      if (!weakWordsBySet.has(setId)) {
        weakWordsBySet.set(setId, new Set());
      }
      ids.forEach((id: string) => weakWordsBySet.get(setId)!.add(id));
    });

    // 7) 틀린 단어들의 품사 정보
    const allWrongWordIds = new Set<string>();
    weakWordsBySet.forEach((set) => {
      set.forEach((id) => allWrongWordIds.add(id));
    });

    let wordPOS: Record<string, string> = {};
    if (allWrongWordIds.size > 0) {
      const { data: words } = await supabase
        .from("words")
        .select("id, base_pos")
        .in("id", Array.from(allWrongWordIds));

      (words ?? []).forEach((w: any) => {
        wordPOS[w.id] = w.base_pos ?? "unknown";
      });
    }

    // 8) 코스별로 변환 (track_id를 key로 사용하여 같은 track의 모든 Days 묶기)
    const courseMap = new Map<string, VocabCourse>();

    (assignments as any[]).forEach((assignment) => {
      const setId = assignment.set_id;
      // vocab_sets 관계에서 track_id 가져오기
      const trackId = assignment.vocab_sets?.track_id || setMetadata?.find((s: any) => s.id === setId)?.track_id;

      // 학생의 grade_band에 맞지 않는 track 제외
      if (!trackId || !allowedTrackIds.has(trackId)) {
        return; // 이 assignment는 스킵
      }

      const dayIndex = assignment.day_index ?? 1;
      const isCompleted = !!assignment.completed_at;
      const isAvailable = assignment.available_at <= todayISO;

      if (!courseMap.has(trackId)) {
        const trackName = trackId ? trackNameMap.get(trackId) || `Track ${trackId.slice(0, 8)}` : `Vocabulary Set ${setId.slice(0, 8)}`;
        courseMap.set(trackId, {
          courseId: trackId,
          courseName: trackName, // Track 이름 (예: "해커스 토플 보카")
          program: program ?? "toefl",
          totalDays: 0,
          completedDays: 0,
          currentDayIndex: dayIndex,
          days: [],
        });
      }

      const course = courseMap.get(trackId)!;
      const wordCount = setWordCount.get(setId) ?? 0;

      // 완료 Day 카운트
      if (isCompleted) course.completedDays++;
      course.totalDays++;

      // 오답 통계 계산
      const wrongWordIds = weakWordsBySet.get(setId) ?? new Set();
      const posByCount: Record<string, number> = {};
      wrongWordIds.forEach((wid) => {
        const pos = wordPOS[wid] ?? "unknown";
        posByCount[pos] = (posByCount[pos] ?? 0) + 1;
      });

      // Day 정보 추가
      // isLocked: 이전 Day가 완료되지 않았으면 잠금 (Day 1은 항상 선택 가능)
      const prevDayCompleted = dayIndex === 1 ? true : course.days.some(d => d.dayIndex === dayIndex - 1 && d.isCompleted);

      course.days.push({
        dayIndex,
        setId,
        wordCount,
        completedAt: assignment.completed_at,
        availableAt: assignment.available_at,
        isCompleted,
        isAvailable,
        isLocked: !prevDayCompleted,
        weakWordStats: wrongWordIds.size > 0 ? {
          totalWrong: wrongWordIds.size,
          byPOS: posByCount,
        } : undefined,
      });
    });

    const courses = Array.from(courseMap.values());

    // 9) 누적 학습 통계 (이미 조회한 데이터 활용)
    const completedAssignments = (assignments as any[]).filter(a => a.completed_at);
    let totalWordsLearned = 0;
    const wordsByPOS: Record<string, number> = {};

    // 완료된 set들의 모든 단어에 대해 품사별로 집계
    completedAssignments.forEach((assignment) => {
      const setId = assignment.set_id;
      const wordCount = setWordCount.get(setId) ?? 0;
      totalWordsLearned += wordCount;

      // vocab_set_items에서 이 set의 모든 단어 찾기
      const setVocabItems = (vocabSets ?? []).filter((v: any) => v.set_id === setId);
      setVocabItems.forEach((item: any) => {
        const pos = wordPOS[item.word_id] ?? "unknown";
        wordsByPOS[pos] = (wordsByPOS[pos] ?? 0) + 1;
      });
    });

    return {
      ok: true,
      courses,
      program,
      studentId,
      cumulativeStats: {
        totalWordsLearned,
        wordsByPOS
      }
    };
  } catch (e: any) {
    console.error("loadVocabHubAction error:", e);
    return { ok: false, error: String(e?.message ?? e) };
  }
}

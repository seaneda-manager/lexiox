export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/auth/requireTeacherOrAdmin";
import { getServiceSupabase } from "@/lib/supabase/service";
import {
  buildExamQuestions,
  isQuestionType,
  loadRangeWordIds,
  loadWordData,
} from "@/lib/vocab/test/teacherExam";

async function guard() {
  try {
    return { auth: await requireTeacherOrAdmin() };
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    const status = msg.startsWith("403") ? 403 : msg.startsWith("401") ? 401 : 500;
    return { error: NextResponse.json({ error: msg }, { status }) };
  }
}

/** GET /api/teacher/vocab-exams — 내가 만든 시험 목록 (admin 은 전체) */
export async function GET() {
  const g = await guard();
  if (g.error) return g.error;
  const { user, role } = g.auth!;
  const db = getServiceSupabase();

  let q = db
    .from("vocab_teacher_exams")
    .select("id, title, track_id, day_from, day_to, question_count, question_types, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (role !== "admin") q = q.eq("created_by", user.id);
  const { data: exams, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (exams ?? []).map((e: any) => e.id);
  const counts = new Map<string, { assigned: number; done: number }>();
  if (ids.length > 0) {
    const [{ data: targets }, { data: sessions }] = await Promise.all([
      db.from("vocab_teacher_exam_targets").select("exam_id").in("exam_id", ids),
      db.from("vocab_test_sessions").select("exam_id, student_id").in("exam_id", ids).eq("status", "graded"),
    ]);
    for (const t of targets ?? []) {
      const c = counts.get((t as any).exam_id) ?? { assigned: 0, done: 0 };
      c.assigned++;
      counts.set((t as any).exam_id, c);
    }
    const doneKey = new Set<string>();
    for (const s of sessions ?? []) {
      const k = `${(s as any).exam_id}:${(s as any).student_id}`;
      if (doneKey.has(k)) continue;
      doneKey.add(k);
      const c = counts.get((s as any).exam_id) ?? { assigned: 0, done: 0 };
      c.done++;
      counts.set((s as any).exam_id, c);
    }
  }

  return NextResponse.json({
    exams: (exams ?? []).map((e: any) => ({
      ...e,
      assigned: counts.get(e.id)?.assigned ?? 0,
      done: counts.get(e.id)?.done ?? 0,
    })),
  });
}

/**
 * POST /api/teacher/vocab-exams — 범위/문항 수/유형을 받아 문제를 출제(스냅샷 저장)하고 학생에게 배정
 * body: { title, track_id, day_from, day_to, question_count, question_types[], arrangement?, student_ids? }
 */
export async function POST(req: NextRequest) {
  const g = await guard();
  if (g.error) return g.error;
  const { user } = g.auth!;

  const body = await req.json().catch(() => null);
  const trackId = String(body?.track_id ?? "");
  const dayFrom = Number(body?.day_from);
  const dayTo = Number(body?.day_to);
  const count = Number(body?.question_count);
  const types = Array.isArray(body?.question_types) ? body.question_types.filter(isQuestionType) : [];
  const arrangement = body?.arrangement === "random" ? "random" : "grouped";
  const studentIds: string[] = Array.isArray(body?.student_ids)
    ? Array.from(new Set(body.student_ids.map(String)))
    : [];

  if (!trackId) return NextResponse.json({ error: "트랙을 선택해 주세요." }, { status: 400 });
  if (!Number.isInteger(dayFrom) || !Number.isInteger(dayTo) || dayFrom < 1 || dayTo < dayFrom) {
    return NextResponse.json({ error: "Day 범위가 올바르지 않습니다." }, { status: 400 });
  }
  if (!Number.isInteger(count) || count < 1 || count > 200) {
    return NextResponse.json({ error: "문항 수는 1~200 사이여야 합니다." }, { status: 400 });
  }
  if (types.length === 0) return NextResponse.json({ error: "문제 유형을 1개 이상 선택해 주세요." }, { status: 400 });

  const db = getServiceSupabase();

  const wordIds = await loadRangeWordIds(db, trackId, dayFrom, dayTo);
  if (wordIds.length === 0) {
    return NextResponse.json({ error: "선택한 범위에 단어가 없습니다." }, { status: 404 });
  }
  const wordData = await loadWordData(db, wordIds);
  const { questions, shortfall } = await buildExamQuestions({
    wordIds,
    wordData,
    types,
    count,
    arrangement,
  });
  if (questions.length === 0) {
    return NextResponse.json({ error: "선택한 유형으로 만들 수 있는 문제가 없습니다." }, { status: 422 });
  }

  const title =
    String(body?.title ?? "").trim() || `단어 시험 Day ${dayFrom}${dayTo > dayFrom ? `~${dayTo}` : ""}`;

  const { data: exam, error } = await db
    .from("vocab_teacher_exams")
    .insert({
      created_by: user.id,
      title,
      track_id: trackId,
      day_from: dayFrom,
      day_to: dayTo,
      question_count: questions.length,
      question_types: types,
      arrangement,
      questions,
    })
    .select("id")
    .single();
  if (error || !exam) {
    console.error("vocab exam insert failed:", error);
    return NextResponse.json({ error: "시험 저장에 실패했습니다." }, { status: 500 });
  }

  if (studentIds.length > 0) {
    const { error: tErr } = await db
      .from("vocab_teacher_exam_targets")
      .insert(studentIds.map(sid => ({ exam_id: exam.id, student_id: sid })));
    if (tErr) console.error("vocab exam targets insert failed:", tErr);
  }

  return NextResponse.json({
    id: exam.id,
    question_count: questions.length,
    word_count: wordIds.length,
    shortfall,
  });
}

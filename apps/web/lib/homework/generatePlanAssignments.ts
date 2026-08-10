import { getServiceSupabase } from "@/lib/supabase/service";

// student_vocab_plans와 동일한 weekdays 컨벤션: JS Date.getDay() 기준 0=일 ... 6=토
function computeOccurrenceDates(startDateStr: string, weekdays: number[], count: number): string[] {
  const dates: string[] = [];
  const weekdaySet = new Set(weekdays);
  const cursor = new Date(`${startDateStr}T00:00:00`);

  // 안전장치: weekdays가 비어있으면 매일로 취급 (무한루프 방지)
  const effectiveSet = weekdaySet.size > 0 ? weekdaySet : new Set([0, 1, 2, 3, 4, 5, 6]);

  let guard = 0;
  while (dates.length < count && guard < 3650) {
    if (effectiveSet.has(cursor.getDay())) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return dates;
}

/**
 * 학생의 숙제 페이스 플랜을 기준으로, 아직 photo_homework로 만들어지지 않은
 * 교재 유닛들을 스케줄에 맞춰 자동 생성한다. 교재에 새 유닛이 추가되거나
 * 플랜이 갱신될 때마다 다시 호출하면 그 사이 늘어난 만큼만 추가로 생성된다(멱등).
 */
export async function syncPlanAssignments(planId: string): Promise<{ created: number } | { error: string }> {
  const service = getServiceSupabase();

  const { data: plan, error: planErr } = await service
    .from("student_homework_plans")
    .select("*")
    .eq("id", planId)
    .single();
  if (planErr || !plan) return { error: planErr?.message ?? "플랜을 찾을 수 없습니다." };
  if (!plan.is_enabled || plan.is_paused) return { created: 0 };

  const { data: book } = await service
    .from("homework_books")
    .select("id, title, subject")
    .eq("id", plan.book_id)
    .maybeSingle();
  if (!book) return { error: "교재를 찾을 수 없습니다." };

  const { data: units } = await service
    .from("homework_book_units")
    .select("id, unit_index, title, answer_key_data")
    .eq("book_id", plan.book_id)
    .order("unit_index", { ascending: true });
  if (!units || units.length === 0) return { created: 0 };

  const { data: existingRows } = await service
    .from("photo_homework")
    .select("unit_index")
    .eq("plan_id", planId);
  const existingUnitIndexes = new Set((existingRows ?? []).map((r) => r.unit_index));

  const pendingUnits = units.filter(
    (u) => u.unit_index >= plan.cursor_unit_index && !existingUnitIndexes.has(u.unit_index),
  );
  if (pendingUnits.length === 0) return { created: 0 };

  const unitsPerSession = Math.max(1, plan.units_per_session ?? 1);
  const occurrenceCount = Math.ceil(pendingUnits.length / unitsPerSession);
  const occurrenceDates = computeOccurrenceDates(plan.start_date, plan.weekdays ?? [], occurrenceCount);

  const rows: Record<string, unknown>[] = [];
  pendingUnits.forEach((unit, idx) => {
    const occurrenceIdx = Math.floor(idx / unitsPerSession);
    const dueDate = occurrenceDates[occurrenceIdx];
    rows.push({
      title: `${book.title}${unit.title ? ` - ${unit.title}` : ` - Unit ${unit.unit_index}`}`,
      subject: book.subject,
      answer_key_data: unit.answer_key_data,
      due_at: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : null,
      is_active: true,
      created_by: plan.created_by,
      student_id: plan.student_id,
      book_id: plan.book_id,
      unit_index: unit.unit_index,
      plan_id: plan.id,
    });
  });

  const { error: insertErr } = await service.from("photo_homework").insert(rows);
  if (insertErr) return { error: insertErr.message };

  const newCursor = Math.max(...pendingUnits.map((u) => u.unit_index)) + 1;
  await service.from("student_homework_plans").update({ cursor_unit_index: newCursor }).eq("id", planId);

  return { created: rows.length };
}

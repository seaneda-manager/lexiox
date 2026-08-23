import { getServiceSupabase } from "@/lib/supabase/service";

// student_vocab_plans와 동일한 weekdays 컨벤션: JS Date.getDay() 기준 0=일 ... 6=토
export function computeOccurrenceDates(startDateStr: string, weekdays: number[], count: number): string[] {
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

  const currentRepeat = plan.current_repeat_number ?? 1;
  const targetRepeat = plan.target_repeat_count ?? 1;

  const { data: existingRows } = await service
    .from("photo_homework")
    .select("unit_index, repeat_number")
    .eq("plan_id", planId);
  // 같은 unit_index라도 회차(repeat_number)가 다르면 별개 취급 — 그래야 회독이 진행될 때
  // 이미 1회독에서 만든 unit 1을 "이미 있다"고 착각해서 2회독의 unit 1을 건너뛰지 않는다.
  const existingUnitIndexes = new Set(
    (existingRows ?? [])
      .filter((r) => (r.repeat_number ?? 1) === currentRepeat)
      .map((r) => r.unit_index),
  );

  // 커리큘럼 구조만 먼저 등록해두고 정답은 나중에 채워 넣을 수 있으므로(스캔 전 단계),
  // 정답이 아직 없는 유닛은 생성 대상에서 제외한다 — 나중에 채워지면 다음 sync 때 잡힌다.
  const hasContent = (u: (typeof units)[number]) =>
    ((u.answer_key_data as { items?: unknown[] } | null)?.items?.length ?? 0) > 0;

  const relevantUnits = units.filter((u) => u.unit_index >= plan.cursor_unit_index);
  const pendingUnits = relevantUnits.filter((u) => hasContent(u) && !existingUnitIndexes.has(u.unit_index));

  if (pendingUnits.length > 0) {
    const unitsPerSession = Math.max(1, plan.units_per_session ?? 1);
    const occurrenceCount = Math.ceil(pendingUnits.length / unitsPerSession);
    const occurrenceDates = computeOccurrenceDates(plan.start_date, plan.weekdays ?? [], occurrenceCount);

    const repeatSuffix = currentRepeat > 1 ? ` (${currentRepeat}회독)` : "";
    const rows: Record<string, unknown>[] = [];
    pendingUnits.forEach((unit, idx) => {
      const occurrenceIdx = Math.floor(idx / unitsPerSession);
      const dueDate = occurrenceDates[occurrenceIdx];
      rows.push({
        title: `${book.title}${unit.title ? ` - ${unit.title}` : ` - Unit ${unit.unit_index}`}${repeatSuffix}`,
        subject: book.subject,
        answer_key_data: unit.answer_key_data,
        due_at: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : null,
        is_active: true,
        created_by: plan.created_by,
        student_id: plan.student_id,
        book_id: plan.book_id,
        unit_index: unit.unit_index,
        plan_id: plan.id,
        repeat_number: currentRepeat,
      });
    });

    const { error: insertErr } = await service.from("photo_homework").insert(rows);
    if (insertErr) return { error: insertErr.message };
  }

  // 커서는 "아직 처리 안 된(정답 없거나 미생성인) 것 중 가장 작은 unit_index"로 맞춘다.
  // max+1로 한번에 건너뛰면 중간에 낀 빈 유닛을 영원히 놓치게 되므로 이렇게 계산해야 안전하다.
  const justGeneratedIds = new Set(pendingUnits.map((u) => u.id));
  const stillPending = relevantUnits.filter(
    (u) => !justGeneratedIds.has(u.id) && !existingUnitIndexes.has(u.unit_index),
  );
  if (relevantUnits.length > 0) {
    const bookFullyCoveredThisLap = stillPending.length === 0;
    const newCursor = bookFullyCoveredThisLap
      ? Math.max(...relevantUnits.map((u) => u.unit_index)) + 1
      : Math.min(...stillPending.map((u) => u.unit_index));

    // 이번 회차 유닛을 전부 다 냈고 목표 회독 수가 남아있으면, 커서를 1로 되돌리고
    // 다음 회차로 넘어가서 그 자리에서 바로 이어서 생성한다 — 이 함수는 교재에 유닛이
    // 추가되거나 플랜이 갱신될 때만 다시 불리기 때문에, 여기서 안 이어가면 다음 회차는
    // 아무 계기 없이는 영원히 시작되지 않는다.
    if (bookFullyCoveredThisLap && currentRepeat < targetRepeat) {
      await service
        .from("student_homework_plans")
        .update({ cursor_unit_index: 1, current_repeat_number: currentRepeat + 1 })
        .eq("id", planId);
      const nextLapResult = await syncPlanAssignments(planId);
      if ("error" in nextLapResult) return nextLapResult;
      return { created: pendingUnits.length + nextLapResult.created };
    }

    await service.from("student_homework_plans").update({ cursor_unit_index: newCursor }).eq("id", planId);
  }

  return { created: pendingUnits.length };
}

/**
 * 남은 유닛 수를 기준으로 "이 교재를 언제쯤 다 끝낼지" 추정한다.
 * 총 유닛 수(정답 미입력 포함, 등록된 커리큘럼 구조 전체)를 기준으로 계산하므로
 * 아직 스캔 전인 유닛도 앞으로 채워질 거라고 가정한 추정치다.
 */
export function estimateCompletionDate(
  remainingUnits: number,
  weekdays: number[],
  unitsPerSession: number,
): string | null {
  if (remainingUnits <= 0) return null;
  const occurrenceCount = Math.ceil(remainingUnits / Math.max(1, unitsPerSession));
  const todayStr = new Date().toISOString().slice(0, 10);
  const dates = computeOccurrenceDates(todayStr, weekdays, occurrenceCount);
  return dates[dates.length - 1] ?? null;
}

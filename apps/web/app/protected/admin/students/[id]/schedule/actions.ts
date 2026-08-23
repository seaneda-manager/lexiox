'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export const CALENDAR_EVENT_TYPES = ['exam', 'makeup', 'vacation', 'absence', 'other'] as const;
export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

async function requireAdmin() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: '로그인이 필요합니다.' };

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (me?.role !== 'admin') return { ok: false as const, error: '관리자만 접근할 수 있습니다.' };

  return { ok: true as const, userId: user.id };
}

export async function addCalendarEventAction(
  studentId: string,
  input: {
    eventType: CalendarEventType;
    title: string;
    eventDate: string;
    replacesDate?: string | null;
    note?: string | null;
  },
): Promise<{ ok: true } | { error: string }> {
  const admin = await requireAdmin();
  if (!admin.ok) return { error: admin.error };

  if (!CALENDAR_EVENT_TYPES.includes(input.eventType)) return { error: '이벤트 종류가 올바르지 않습니다.' };
  if (!input.title.trim()) return { error: '제목을 입력해 주세요.' };
  if (!input.eventDate) return { error: '날짜를 선택해 주세요.' };

  const service = getServiceSupabase();
  const { error } = await service.from('calendar_events').insert({
    student_id: studentId,
    event_type: input.eventType,
    title: input.title.trim(),
    event_date: input.eventDate,
    replaces_date: input.eventType === 'makeup' ? (input.replacesDate || null) : null,
    note: input.note?.trim() || null,
    created_by: admin.userId,
  });
  if (error) return { error: error.message };

  revalidatePath(`/admin/students/${studentId}/schedule`);
  revalidatePath('/student/schedule');
  return { ok: true };
}

export async function deleteCalendarEventAction(studentId: string, eventId: string): Promise<void> {
  const admin = await requireAdmin();
  if (!admin.ok) return;

  const service = getServiceSupabase();
  await service.from('calendar_events').delete().eq('id', eventId).eq('student_id', studentId);

  revalidatePath(`/admin/students/${studentId}/schedule`);
  revalidatePath('/student/schedule');
}

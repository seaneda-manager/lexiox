import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import CalendarEventManager from './_client/CalendarEventManager';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function StudentCalendarSchedulePage({ params }: PageProps) {
  const { id: studentId } = await params;
  const supabase = await getServerSupabase();

  const { data: student, error: studentErr } = await supabase
    .from('academy_students')
    .select('id, full_name, display_name, email')
    .eq('id', studentId)
    .maybeSingle();

  if (studentErr || !student) return notFound();

  const { data: events } = await supabase
    .from('calendar_events')
    .select('id, event_type, title, event_date, replaces_date, note')
    .eq('student_id', studentId)
    .order('event_date', { ascending: true });

  const studentLabel =
    (student as any).full_name || (student as any).display_name || (student as any).email || `학생 ${studentId.slice(0, 8)}`;

  return (
    <main className="mx-auto max-w-2xl space-y-6 pb-12 px-6 py-8">
      <header>
        <div className="text-xs text-neutral-400 mb-1">
          <Link href="/admin/students" className="hover:underline">학생 목록</Link>
          {' / 스케줄'}
        </div>
        <h1 className="text-xl font-bold text-neutral-900">{studentLabel}</h1>
        <p className="text-xs text-neutral-400 mt-0.5">시험·메이크업·휴가·결석 등 캘린더 이벤트를 등록합니다.</p>
      </header>

      <CalendarEventManager studentId={studentId} initialEvents={(events ?? []) as any} />
    </main>
  );
}

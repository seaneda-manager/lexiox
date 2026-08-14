import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendBulkEmails } from '@/lib/utils/emailService';
import type { EmailNotificationType } from '@/lib/types/email';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SendEmailRequest {
  type: EmailNotificationType;
  studentIds: string[];
  includeParents?: boolean;
  data: {
    problemCount?: number;
    deadline?: string;
    category?: string;
    homeworkTitle?: string;
    bookName?: string;
    message?: string;
    title?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: SendEmailRequest = await request.json();
    const { type, studentIds, includeParents = false, data } = body;

    if (!studentIds || studentIds.length === 0) {
      return NextResponse.json(
        { error: '학생 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // Get student emails from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Students를 조회할 수 없습니다.' },
        { status: 500 }
      );
    }

    // Get academy_students data for parent emails
    const { data: students, error: studentsError } = await supabase
      .from('academy_students')
      .select('id, auth_user_id, name, parent_email')
      .in('auth_user_id', studentIds);

    if (studentsError) {
      console.error('Students error:', studentsError);
      return NextResponse.json(
        { error: 'Students 데이터를 조회할 수 없습니다.' },
        { status: 500 }
      );
    }

    // Build email list
    const emailList: { name: string; email: string }[] = [];

    for (const student of students || []) {
      // Get student's auth email
      const authUser = authUsers.users.find(u => u.id === student.auth_user_id);
      if (authUser?.email) {
        emailList.push({
          name: student.name || 'Student',
          email: authUser.email,
        });
      }

      // Add parent email if available and requested
      if (includeParents && student.parent_email) {
        emailList.push({
          name: `${student.name || 'Student'}의 학부모`,
          email: student.parent_email,
        });
      }
    }

    if (emailList.length === 0) {
      return NextResponse.json(
        { error: '발송할 이메일이 없습니다.' },
        { status: 400 }
      );
    }

    // Send emails
    const result = await sendBulkEmails(emailList, type, data);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '이메일 발송 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${result.count}명에게 이메일이 발송되었습니다.`,
      count: result.count,
      total: emailList.length,
    });
  } catch (error) {
    console.error('Send email error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

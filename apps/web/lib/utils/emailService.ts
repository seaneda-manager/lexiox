import { Resend } from 'resend';
import type { EmailNotificationType } from '@/lib/types/email';

const resend = new Resend(process.env.RESEND_API_KEY);

const SENDER_EMAIL = 'notifications@toefl-platform.com';
const APP_URL = process.env.NEXT_PUBLIC_SUPABASE_SITE_URL || 'https://app.toefl.com';

interface EmailTemplate {
  subject: string;
  html: string;
}

function generateDailyTaskEmail(
  studentName: string,
  problemCount: number,
  deadline?: string,
  category?: string
): EmailTemplate {
  return {
    subject: `📝 새로운 Daily Task가 배정되었습니다`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 12px 12px 0 0; color: white;">
          <h1 style="margin: 0; font-size: 24px;">새로운 Daily Task</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">매일 조금씩 성장합니다</p>
        </div>

        <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin: 0 0 20px 0;">안녕하세요 <strong>${studentName}</strong>님,</p>

          <p style="margin: 0 0 20px 0;">새로운 Daily Task가 배정되었습니다.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #059669; margin: 20px 0;">
            <div style="margin: 10px 0;">
              <span style="color: #6b7280; font-size: 14px;">📚 문제 수</span>
              <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 600; color: #059669;">${problemCount}개</p>
            </div>
            ${category ? `
            <div style="margin: 10px 0;">
              <span style="color: #6b7280; font-size: 14px;">🏷️ 주제</span>
              <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 500;">${category}</p>
            </div>
            ` : ''}
            ${deadline ? `
            <div style="margin: 10px 0;">
              <span style="color: #6b7280; font-size: 14px;">⏰ 제한 시간</span>
              <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 500;">${deadline}</p>
            </div>
            ` : ''}
          </div>

          <a href="${APP_URL}/protected/student" style="display: inline-block; background: #059669; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 20px 0;">
            지금 시작하기
          </a>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            이 메일은 자동으로 발송되었습니다. 문의사항이 있으시면 support@toefl-platform.com으로 연락주세요.
          </p>
        </div>
      </div>
    `,
  };
}

function generateHomeworkEmail(
  studentName: string,
  homeworkTitle: string,
  bookName?: string
): EmailTemplate {
  return {
    subject: `📖 새로운 숙제가 배정되었습니다: ${homeworkTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; border-radius: 12px 12px 0 0; color: white;">
          <h1 style="margin: 0; font-size: 24px;">새로운 숙제</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">학습을 계속해봅시다</p>
        </div>

        <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin: 0 0 20px 0;">안녕하세요 <strong>${studentName}</strong>님,</p>

          <p style="margin: 0 0 20px 0;">새로운 숙제가 배정되었습니다.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
            <div style="margin: 10px 0;">
              <span style="color: #6b7280; font-size: 14px;">📝 숙제 제목</span>
              <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 600; color: #3b82f6;">${homeworkTitle}</p>
            </div>
            ${bookName ? `
            <div style="margin: 10px 0;">
              <span style="color: #6b7280; font-size: 14px;">📚 교재</span>
              <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 500;">${bookName}</p>
            </div>
            ` : ''}
          </div>

          <a href="${APP_URL}/protected/student" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 20px 0;">
            숙제 확인하기
          </a>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            이 메일은 자동으로 발송되었습니다. 문의사항이 있으시면 support@toefl-platform.com으로 연락주세요.
          </p>
        </div>
      </div>
    `,
  };
}

function generateHomeworkGradingEmail(
  teacherName: string,
  studentName: string,
  homeworkTitle: string,
  subjectLabel: string,
  scorePct: number,
  correctCount: number,
  totalCount: number,
  feedback: string,
  homeworkId: string
): EmailTemplate {
  const scoreColor = scorePct >= 80 ? '#059669' : scorePct >= 50 ? '#d97706' : '#dc2626';
  return {
    subject: `📷 [${studentName}] 숙제 채점 결과: ${homeworkTitle} (${scorePct}%)`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); padding: 30px; border-radius: 12px 12px 0 0; color: white;">
          <h1 style="margin: 0; font-size: 24px;">숙제 채점 완료</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">학생이 숙제 사진을 제출했습니다</p>
        </div>

        <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin: 0 0 20px 0;">안녕하세요 <strong>${teacherName}</strong>님,</p>

          <p style="margin: 0 0 20px 0;"><strong>${studentName}</strong> 학생이 숙제를 제출하여 AI가 자동 채점했습니다.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${scoreColor}; margin: 20px 0;">
            <div style="margin: 10px 0;">
              <span style="color: #6b7280; font-size: 14px;">📝 숙제</span>
              <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 600;">${homeworkTitle}</p>
              <p style="margin: 2px 0 0 0; font-size: 13px; color: #6b7280;">${subjectLabel}</p>
            </div>
            <div style="margin: 10px 0;">
              <span style="color: #6b7280; font-size: 14px;">📊 점수</span>
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 700; color: ${scoreColor};">${scorePct}% <span style="font-size: 14px; font-weight: 400; color: #6b7280;">(${correctCount}/${totalCount})</span></p>
            </div>
            <div style="margin: 10px 0;">
              <span style="color: #6b7280; font-size: 14px;">💬 AI 총평</span>
              <p style="margin: 5px 0 0 0; font-size: 15px;">${feedback}</p>
            </div>
          </div>

          <a href="${APP_URL}/protected/admin/homework/${homeworkId}" style="display: inline-block; background: #0891b2; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 20px 0;">
            상세 결과 확인하기
          </a>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            이 메일은 자동으로 발송되었습니다. 문의사항이 있으시면 support@toefl-platform.com으로 연락주세요.
          </p>
        </div>
      </div>
    `,
  };
}

function generateCustomEmail(studentName: string, title: string, message: string): EmailTemplate {
  return {
    subject: title,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); padding: 30px; border-radius: 12px 12px 0 0; color: white;">
          <h1 style="margin: 0; font-size: 24px;">${title}</h1>
        </div>

        <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin: 0 0 20px 0;">안녕하세요 <strong>${studentName}</strong>님,</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; line-height: 1.6;">
            ${message.split('\n').map(line => `<p style="margin: 10px 0;">${line}</p>`).join('')}
          </div>

          <a href="${APP_URL}/protected/student" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 20px 0;">
            앱으로 이동
          </a>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            이 메일은 자동으로 발송되었습니다. 문의사항이 있으시면 support@toefl-platform.com으로 연락주세요.
          </p>
        </div>
      </div>
    `,
  };
}

function getEmailTemplate(
  type: EmailNotificationType,
  studentName: string,
  data: any
): EmailTemplate {
  switch (type) {
    case 'daily-task':
      return generateDailyTaskEmail(
        studentName,
        data.problemCount || 0,
        data.deadline,
        data.category
      );
    case 'homework':
      return generateHomeworkEmail(
        studentName,
        data.homeworkTitle || '새로운 숙제',
        data.bookName
      );
    case 'homework-grading':
      return generateHomeworkGradingEmail(
        studentName, // recipient name (teacher) — param kept generic across templates
        data.studentName || '학생',
        data.homeworkTitle || '숙제',
        data.subjectLabel || '영어 숙제',
        data.scorePct ?? 0,
        data.correctCount ?? 0,
        data.totalCount ?? 0,
        data.feedback || '',
        data.homeworkId || ''
      );
    case 'custom':
      return generateCustomEmail(studentName, data.title || '알림', data.message || '');
    default:
      return generateCustomEmail(studentName, '알림', '새로운 알림입니다.');
  }
}

export async function sendEmailNotification(
  emails: { name: string; email: string }[],
  type: EmailNotificationType,
  data: any
): Promise<{ success: boolean; error?: string; results?: any }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return { success: false, error: 'RESEND_API_KEY가 설정되지 않았습니다.' };
    }

    const results = [];

    for (const recipient of emails) {
      const template = getEmailTemplate(type, recipient.name, data);

      const result = await resend.emails.send({
        from: `TOEFL Platform <${SENDER_EMAIL}>`,
        to: recipient.email,
        subject: template.subject,
        html: template.html,
      });

      results.push({
        email: recipient.email,
        success: !result.error,
        messageId: result.data?.id,
        error: result.error?.message,
      });
    }

    return { success: true, results };
  } catch (error) {
    console.error('Email notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '이메일 발송 중 오류가 발생했습니다.',
    };
  }
}

export async function sendBulkEmails(
  emails: { name: string; email: string }[],
  type: EmailNotificationType,
  data: any
): Promise<{ success: boolean; count: number; error?: string }> {
  const result = await sendEmailNotification(emails, type, data);
  return {
    success: result.success,
    count: result.results?.filter((r: any) => r.success).length || 0,
    error: result.error,
  };
}

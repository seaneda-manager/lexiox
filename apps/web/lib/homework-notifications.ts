// 깜지 리마인더 시스템

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";

export type NotificationType = "homework_created" | "homework_reminder" | "homework_due_soon";

interface HomeworkNotification {
  studentId: string;
  studentEmail: string;
  studentPhone?: string;
  studentName: string;
  homeworkCount: number;
  dueDate: string;
  type: NotificationType;
}

/**
 * 깜지 생성 후 즉시 알림 (Email)
 */
export async function sendHomeworkCreatedNotification(
  studentId: string,
  homeworkCount: number
) {
  try {
    // 학생 정보 조회
    const result = await db.query(
      `
      SELECT u.email, u.name, s.phone
      FROM academy_students s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = $1
      `,
      [studentId]
    );

    if (!result.rows.length) return;

    const student = result.rows[0];

    const notification: HomeworkNotification = {
      studentId,
      studentEmail: student.email,
      studentPhone: student.phone,
      studentName: student.name,
      homeworkCount,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      type: "homework_created",
    };

    // Email 발송
    await sendHomeworkEmail(notification);
  } catch (error) {
    console.error("Failed to send homework created notification:", error);
  }
}

/**
 * 일일 리마인더 (오전 8시)
 * - 미완료 깜지가 있는 학생에게만
 */
export async function sendDailyHomeworkReminder() {
  try {
    // 오늘 미완료 깜지가 있는 학생 조회
    const result = await db.query(
      `
      SELECT
        s.id,
        u.email,
        u.name,
        s.phone,
        COUNT(DISTINCT h.id) as homework_count
      FROM academy_students s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN vocab_student_homework h ON h.student_id = s.id
        AND DATE(h.created_at) = DATE(NOW())
        AND h.status != 'completed'
      WHERE h.id IS NOT NULL
      GROUP BY s.id, u.email, u.name, s.phone
      `
    );

    for (const student of result.rows) {
      const notification: HomeworkNotification = {
        studentId: student.id,
        studentEmail: student.email,
        studentPhone: student.phone,
        studentName: student.name,
        homeworkCount: parseInt(student.homework_count),
        dueDate: new Date().toISOString().split("T")[0],
        type: "homework_reminder",
      };

      // Email 발송
      await sendHomeworkEmail(notification);

      // SMS 발송 (선택적)
      if (student.phone) {
        await sendHomeworkSMS(notification);
      }
    }
  } catch (error) {
    console.error("Failed to send daily homework reminders:", error);
  }
}

/**
 * 마감 임박 알림 (오후 6시)
 * - 오늘 깜지를 완료하지 않은 학생
 */
export async function sendDueSoonNotification() {
  try {
    const result = await db.query(
      `
      SELECT
        s.id,
        u.email,
        u.name,
        s.phone,
        COUNT(DISTINCT h.id) as remaining_count
      FROM academy_students s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN vocab_student_homework h ON h.student_id = s.id
        AND DATE(h.created_at) = DATE(NOW())
        AND h.status != 'completed'
      WHERE h.id IS NOT NULL
      GROUP BY s.id, u.email, u.name, s.phone
      HAVING COUNT(DISTINCT h.id) > 0
      `
    );

    for (const student of result.rows) {
      const notification: HomeworkNotification = {
        studentId: student.id,
        studentEmail: student.email,
        studentPhone: student.phone,
        studentName: student.name,
        homeworkCount: parseInt(student.remaining_count),
        dueDate: new Date().toISOString().split("T")[0],
        type: "homework_due_soon",
      };

      // Email 발송
      await sendHomeworkEmail(notification);

      // SMS 발송 (선택적)
      if (student.phone) {
        await sendHomeworkSMS(notification);
      }
    }
  } catch (error) {
    console.error("Failed to send due soon notifications:", error);
  }
}

/**
 * Email 템플릿
 */
async function sendHomeworkEmail(notification: HomeworkNotification) {
  const templates: Record<NotificationType, { subject: string; body: string }> = {
    homework_created: {
      subject: `[깜지] ${notification.homeworkCount}개의 새로운 숙제가 생겼어요! 📝`,
      body: `
안녕하세요, ${notification.studentName}님! 👋

Speed 또는 Drill에서 틀린 단어들이 깜지 숙제로 자동 변환되었습니다.

📊 숙제 현황
- 오늘의 깜지: ${notification.homeworkCount}개
- 마감일: 내일 (${notification.dueDate})
- 학습 방식: 텍스트 깜지 또는 오디오 깜지 선택 가능

✨ 팁: 오디오 깜지를 선택하면 발음도 함께 연습할 수 있습니다!

지금 바로 시작하기:
https://yoursite.com/vocab/homework

화이팅! 💪
      `,
    },
    homework_reminder: {
      subject: `[알림] 오늘 깜지 ${notification.homeworkCount}개 남았어요 ⏰`,
      body: `
안녕하세요, ${notification.studentName}님! 🌅

오늘 완료해야 할 깜지가 ${notification.homeworkCount}개 남아있습니다.

📚 남은 숙제
- 깜지: ${notification.homeworkCount}개
- 예상 시간: ${notification.homeworkCount * 2}~${notification.homeworkCount * 3}분

🎯 꾸준한 학습이 영어 실력 향상의 핵심입니다!
지금 바로 시작해볼까요?

https://yoursite.com/vocab/homework

응원합니다! 📢
      `,
    },
    homework_due_soon: {
      subject: `[긴급] 오늘 깜지 ${notification.homeworkCount}개 마감 임박! 🚨`,
      body: `
안녕하세요, ${notification.studentName}님!

오늘 깜지가 곧 마감됩니다! ⏳

⚠️ 마감 정보
- 남은 깜지: ${notification.homeworkCount}개
- 마감 시간: 자정 (23:59)
- 예상 소요 시간: ${notification.homeworkCount * 2}~${notification.homeworkCount * 3}분

지금 바로 완료하세요!
https://yoursite.com/vocab/homework

마지막 스퍼트! 💨
      `,
    },
  };

  const template = templates[notification.type];

  return await sendEmail({
    to: notification.studentEmail,
    subject: template.subject,
    html: formatEmail(template.body),
  });
}

/**
 * SMS 템플릿
 */
async function sendHomeworkSMS(notification: HomeworkNotification) {
  const templates: Record<NotificationType, string> = {
    homework_created: `[깜지] ${notification.homeworkCount}개의 새로운 숙제! 내일까지 완료해주세요. https://yoursite.com/vocab/homework`,
    homework_reminder: `[알림] 오늘 깜지 ${notification.homeworkCount}개 남았어요. 지금 시작하세요! https://yoursite.com/vocab/homework`,
    homework_due_soon: `[긴급] 오늘 깜지 ${notification.homeworkCount}개 마감 임박! 지금 완료하세요! https://yoursite.com/vocab/homework`,
  };

  const message = templates[notification.type];

  if (notification.studentPhone) {
    return await sendSMS({
      to: notification.studentPhone,
      message,
    });
  }
}

/**
 * Email HTML 포맷팅
 */
function formatEmail(body: string): string {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
            <h2>📚 깜지 학습 시스템</h2>
          </div>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
            ${body.split("\n").filter(line => line.trim()).map(line => `<p>${line.trim()}</p>`).join("")}
          </div>
          <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
            <p>이 메일은 자동 발송되었습니다. 문의사항은 지원팀에 연락주세요.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * 학생별 알림 설정 조회
 */
export async function getNotificationPreferences(studentId: string) {
  try {
    const result = await db.query(
      `
      SELECT
        email_on_homework_created,
        email_daily_reminder,
        email_due_soon,
        sms_on_homework_created,
        sms_daily_reminder,
        sms_due_soon,
        daily_reminder_time,
        due_soon_time
      FROM student_notification_preferences
      WHERE student_id = $1
      `,
      [studentId]
    );

    if (!result.rows.length) {
      // 기본값 반환
      return {
        emailOnHomeworkCreated: true,
        emailDailyReminder: true,
        emailDueSoon: true,
        smsOnHomeworkCreated: false,
        smsDailyReminder: false,
        smsDueSoon: true,
        dailyReminderTime: "08:00",
        dueSoonTime: "18:00",
      };
    }

    return result.rows[0];
  } catch (error) {
    console.error("Failed to get notification preferences:", error);
    return null;
  }
}

/**
 * 알림 설정 저장
 */
export async function updateNotificationPreferences(
  studentId: string,
  preferences: {
    emailOnHomeworkCreated?: boolean;
    emailDailyReminder?: boolean;
    emailDueSoon?: boolean;
    smsOnHomeworkCreated?: boolean;
    smsDailyReminder?: boolean;
    smsDueSoon?: boolean;
    dailyReminderTime?: string;
    dueSoonTime?: string;
  }
) {
  try {
    const updates = Object.entries(preferences)
      .map(([key], idx) => `${key} = $${idx + 2}`)
      .join(", ");

    const values = Object.values(preferences);

    await db.query(
      `
      INSERT INTO student_notification_preferences (student_id, ${Object.keys(preferences).join(",")})
      VALUES ($1, ${Object.keys(preferences).map((_, idx) => `$${idx + 2}`).join(",")})
      ON CONFLICT (student_id) DO UPDATE SET
        ${updates},
        updated_at = NOW()
      `,
      [studentId, ...values]
    );

    return { ok: true };
  } catch (error) {
    console.error("Failed to update notification preferences:", error);
    return { ok: false, error: String(error) };
  }
}

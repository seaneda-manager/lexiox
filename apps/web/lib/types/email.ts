export type EmailNotificationType = 'daily-task' | 'homework' | 'homework-grading' | 'exam-mode-notice' | 'test' | 'custom';

export interface EmailNotificationPayload {
  type: EmailNotificationType;
  title: string;
  studentIds: string[];
  includeParents?: boolean;
  data: {
    // Daily Task
    problemCount?: number;
    deadline?: string;
    category?: string;

    // Homework
    homeworkTitle?: string;
    bookName?: string;

    // Generic
    message?: string;
    link?: string;
  };
}

export interface StudentEmail {
  studentId: string;
  studentName: string;
  studentEmail: string;
  parentEmail?: string;
}

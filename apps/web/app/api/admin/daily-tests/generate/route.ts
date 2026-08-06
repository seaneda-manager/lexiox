export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import {
  createDailyTask,
  assignDailyTaskToClass,
  getDailyTaskWithProblems,
} from '@/lib/utils/problemBank';
import type { DailyTaskType } from '@/lib/types/problem-bank';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/daily-task/generate
 *
 * Daily Task 생성
 * - 개별 학생용: studentId 지정
 * - Class 전체: classId 지정
 *
 * Request:
 * {
 *   "taskType": "light" | "medium_1" | "medium_2" | "medium_3" | "medium_4",
 *   "difficulty": "easy" | "core" | "hard",
 *   "studentId": "uuid" (optional),
 *   "classId": "uuid" (optional),
 *   "dueDate": "2026-08-07" (optional)
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { taskType, difficulty, numPassages, studentId, classId, dueDate } = body as {
      taskType: DailyTaskType;
      difficulty: 'easy' | 'core' | 'hard';
      numPassages?: number;
      studentId?: string;
      classId?: string;
      dueDate?: string;
    };

    // Validation
    if (!taskType || !difficulty) {
      return NextResponse.json(
        {
          ok: false,
          error: 'taskType and difficulty are required',
        },
        { status: 400 }
      );
    }

    if (!studentId && !classId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Either studentId or classId must be provided',
        },
        { status: 400 }
      );
    }

    if (studentId && classId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Cannot specify both studentId and classId',
        },
        { status: 400 }
      );
    }

    console.log(
      `[DailyTask] Generating ${taskType}/${difficulty}${studentId ? ` for student ${studentId}` : ` for class ${classId}`}`
    );

    let task;

    if (studentId) {
      // 개별 학생용 Daily Task
      task = await createDailyTask(taskType, difficulty, studentId, undefined, dueDate);
    } else {
      // Class 전체용 Daily Task
      task = await assignDailyTaskToClass(classId!, taskType, difficulty, dueDate);
    }

    // 생성된 task에 문제들을 populate해서 반환
    const taskWithProblems = await getDailyTaskWithProblems(task.id);

    console.log(`[DailyTask] ✅ Created task ${task.id}`);

    return NextResponse.json({
      ok: true,
      id: task.id,
      task: taskWithProblems,
    });
  } catch (err: any) {
    console.error('[DailyTask] ERROR', err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}

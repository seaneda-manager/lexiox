import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createDailyTask, assignDailyTaskToClass } from '@/lib/utils/problemBank';
import type { DailyTaskType } from '@/lib/types/problem-bank';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/daily-tests/generate-by-name
 *
 * Daily Task 생성 (학생 이름 또는 클래스 이름으로)
 *
 * Request:
 * {
 *   "taskType": "light" | "medium_1" | ...
 *   "difficulty": "easy" | "core" | "hard"
 *   "studentName": "김철수" (optional)
 *   "className": "1반" (optional)
 *   "dueDate": "2026-08-07" (optional)
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { taskType, difficulty, studentName, className, dueDate } = body as {
      taskType: DailyTaskType;
      difficulty: 'easy' | 'core' | 'hard';
      studentName?: string;
      className?: string;
      dueDate?: string;
    };

    // Validation
    if (!taskType || !difficulty) {
      return NextResponse.json(
        { ok: false, error: 'taskType and difficulty are required' },
        { status: 400 }
      );
    }

    if (!studentName && !className) {
      return NextResponse.json(
        { ok: false, error: 'Either studentName or className must be provided' },
        { status: 400 }
      );
    }

    if (studentName && className) {
      return NextResponse.json(
        { ok: false, error: 'Cannot specify both studentName and className' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    let studentId: string | undefined;
    let classId: string | undefined;

    // 학생 이름으로 검색
    if (studentName) {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .ilike('full_name', `%${studentName}%`)
        .limit(10);

      if (error) {
        return NextResponse.json(
          { ok: false, error: `Failed to search students: ${error.message}` },
          { status: 500 }
        );
      }

      if (!profiles || profiles.length === 0) {
        return NextResponse.json(
          { ok: false, error: `No student found matching: "${studentName}"` },
          { status: 404 }
        );
      }

      if (profiles.length > 1) {
        // 여러 명 찾음 - 일단 첫 번째 선택 (또는 정확히 일치하는 것)
        const exact = profiles.find(p => p.full_name === studentName);
        if (exact) {
          studentId = exact.id;
        } else {
          return NextResponse.json(
            {
              ok: false,
              error: `Multiple students found: ${profiles.map(p => p.full_name).join(', ')}. Please be more specific.`,
              matches: profiles,
            },
            { status: 400 }
          );
        }
      } else {
        studentId = profiles[0].id;
      }

      console.log(`[DailyTask] Student found: ${profiles[0].full_name} (${studentId})`);
    }

    // 클래스 이름으로 검색
    if (className) {
      const { data: classes, error } = await supabase
        .from('academy_classes')
        .select('id, class_name')
        .ilike('class_name', `%${className}%`)
        .limit(10);

      if (error) {
        return NextResponse.json(
          { ok: false, error: `Failed to search classes: ${error.message}` },
          { status: 500 }
        );
      }

      if (!classes || classes.length === 0) {
        return NextResponse.json(
          { ok: false, error: `No class found matching: "${className}"` },
          { status: 404 }
        );
      }

      if (classes.length > 1) {
        const exact = classes.find(c => c.class_name === className);
        if (exact) {
          classId = exact.id;
        } else {
          return NextResponse.json(
            {
              ok: false,
              error: `Multiple classes found: ${classes.map(c => c.class_name).join(', ')}. Please be more specific.`,
              matches: classes,
            },
            { status: 400 }
          );
        }
      } else {
        classId = classes[0].id;
      }

      console.log(`[DailyTask] Class found: ${classes[0].class_name} (${classId})`);
    }

    // Daily Task 생성
    let task;

    if (studentId) {
      task = await createDailyTask(taskType, difficulty, studentId, undefined, dueDate);
    } else if (classId) {
      task = await assignDailyTaskToClass(classId, taskType, difficulty, dueDate);
    } else {
      throw new Error('Invalid state: no studentId or classId');
    }

    console.log(`[DailyTask] ✅ Created task ${task.id}`);

    return NextResponse.json({
      ok: true,
      id: task.id,
      message: studentName
        ? `Daily Task assigned to ${studentName}`
        : `Daily Task assigned to class ${className}`,
      task,
    });
  } catch (err: any) {
    console.error('[DailyTask] ERROR', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

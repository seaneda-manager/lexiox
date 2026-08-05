import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServerSupabase } from '@/lib/supabase/server';
import { awardPoints } from '@/lib/gamification/awardPoints';

export const runtime    = 'nodejs';
export const maxDuration = 45;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { response } = (await req.json()) as { response?: string };
    if (!response?.trim()) {
      return NextResponse.json({ error: '답변이 필요합니다.' }, { status: 400 });
    }

    // 태스크 조회
    const { data: task } = await supabase
      .from('daily_tasks')
      .select('id, task_type, prompt, completed_at, student_id')
      .eq('id', id)
      .eq('student_id', user.id)
      .maybeSingle();

    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (task.completed_at) return NextResponse.json({ error: '이미 완료된 태스크입니다.' }, { status: 400 });

    // Claude 피드백 생성
    const client = new Anthropic();
    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system:     '당신은 한국 영어학원의 AI 튜터입니다. 학생의 영어 답변에 대해 간결하고 구체적인 피드백을 한국어로 3~4문장으로 제공해 주세요. 잘한 점 1가지와 개선점 1가지를 반드시 포함하세요.',
      messages: [{
        role:    'user',
        content: `[태스크]\n${task.prompt}\n\n[학생 답변]\n${response}`,
      }],
    });

    const aiFeedback = message.content[0].type === 'text'
      ? message.content[0].text.trim()
      : null;

    // 완료 처리
    const { data: updatedTask, error } = await supabase
      .from('daily_tasks')
      .update({
        completed_at:  new Date().toISOString(),
        response,
        ai_feedback:   aiFeedback,
        points_earned: 50,
      })
      .eq('id', id)
      .select('id, task_type, prompt, completed_at, ai_feedback, points_earned')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 포인트 적립
    void awardPoints({
      studentId: user.id,
      ruleId:    'daily_task_complete',
      sourceRef: id,
      metadata:  { task_type: task.task_type },
    });

    return NextResponse.json({ ok: true, task: updatedTask });
  } catch (err) {
    console.error('[daily-task/complete]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

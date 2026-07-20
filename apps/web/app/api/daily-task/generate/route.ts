import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServerSupabase } from '@/lib/supabase/server';

export const runtime   = 'nodejs';
export const maxDuration = 30;

const TASK_TYPES = [
  'current_events_q',
  'email_writing',
  'listen_repeat',
  'writing',
  'random_interview',
  'mock_lecturing',
] as const;

type TaskType = typeof TASK_TYPES[number];

const TASK_PROMPTS: Record<TaskType, string> = {
  current_events_q: `학생의 최근 학습 내용(리딩/리스닝 지문 주제)과 연관된 시사 질문을 만들어 주세요.
영어로 질문을 제시하고, 한국어로 간단한 배경 설명을 붙여 주세요.
예: "The UN released a report on rising sea levels. What do you think is the most important action individuals can take? (유엔이 해수면 상승 보고서를 발표했습니다. 개인이 취할 수 있는 가장 중요한 행동은 무엇일까요?)"`,

  email_writing: `학생이 실제로 쓸 법한 영어 이메일 상황을 한 가지 제시해 주세요.
수신인, 목적, 핵심 내용 3가지를 지시사항으로 주세요. 한국어로 상황 설명 후 영어로 과제를 주세요.`,

  listen_repeat: `TOEFL Speaking Task 1 스타일의 짧은 질문(30~40 단어)을 만들어 주세요.
"Read the following aloud, then record yourself answering in 45 seconds:" 형식으로 시작하세요.
주제는 개인 경험이나 선호도에 관한 것으로 해주세요.`,

  writing: `TOEFL Independent Writing 스타일의 에세이 질문을 만들어 주세요.
"Do you agree or disagree with the following statement?" 형식의 주제를 하나 제시하고,
3~4문장 분량의 짧은 응답(paragraph)을 작성하도록 안내해 주세요.`,

  random_interview: `면접 또는 영어 인터뷰 연습용 질문 3개를 만들어 주세요.
Easy/Medium/Hard 순서로 난이도를 높여 주세요.
각 질문 아래에 답변 힌트(bullet 2개)를 한국어로 달아 주세요.`,

  mock_lecturing: `중학교 또는 고등학교 수준의 영어 문법 규칙 하나를 선택해서
학생이 선생님처럼 설명하는 연습을 하도록 유도해 주세요.
"Explain the following grammar rule as if you are teaching a younger student:" 형식으로 주고,
규칙을 명확히 지정해 주세요 (예: present perfect vs simple past).`,
};

export async function POST() {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const todayStr = new Date().toISOString().split('T')[0];

    // 오늘 이미 있으면 반환
    const { data: existing } = await supabase
      .from('daily_tasks')
      .select('id, task_type, prompt, completed_at, points_earned')
      .eq('student_id', user.id)
      .eq('task_date', todayStr)
      .maybeSingle();

    if (existing) return NextResponse.json({ ok: true, task: existing });

    // 학생 최근 학습 컨텍스트 (간략)
    const { data: recentReading } = await supabase
      .from('reading_results_2026')
      .select('test_label')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3);

    const recentTopics = (recentReading ?? [])
      .map((r: any) => r.test_label)
      .filter(Boolean)
      .join(', ');

    // 랜덤 태스크 타입 선택 (최근 7일 내 안 쓴 타입 우선)
    const { data: recentTasks } = await supabase
      .from('daily_tasks')
      .select('task_type')
      .eq('student_id', user.id)
      .gte('task_date', new Date(Date.now() - 7 * 86400_000).toISOString().split('T')[0]);

    const usedTypes = new Set((recentTasks ?? []).map((t: any) => t.task_type as string));
    const unusedTypes = TASK_TYPES.filter((t) => !usedTypes.has(t));
    const pool = unusedTypes.length > 0 ? unusedTypes : [...TASK_TYPES];
    const taskType = pool[Math.floor(Math.random() * pool.length)] as TaskType;

    // Claude로 개인화된 프롬프트 생성
    const client = new Anthropic();
    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system:     '당신은 한국 영어학원의 AI 튜터입니다. 학생에게 오늘의 영어 학습 태스크를 간결하고 명확하게 제시해 주세요. 200자 이내로 작성하세요.',
      messages: [{
        role:    'user',
        content: `${TASK_PROMPTS[taskType]}${recentTopics ? `\n\n[학생 최근 학습 주제: ${recentTopics}]` : ''}`,
      }],
    });

    const prompt = message.content[0].type === 'text'
      ? message.content[0].text.trim()
      : TASK_PROMPTS[taskType];

    // DB 저장
    const { data: newTask, error } = await supabase
      .from('daily_tasks')
      .insert({
        student_id: user.id,
        task_date:  todayStr,
        task_type:  taskType,
        prompt,
      })
      .select('id, task_type, prompt, completed_at, points_earned')
      .single();

    if (error) {
      console.error('[daily-task/generate]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, task: newTask });
  } catch (err) {
    console.error('[daily-task/generate]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

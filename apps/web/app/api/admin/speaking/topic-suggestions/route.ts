import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

const PRESET_INTERVIEW_TOPICS = [
  "온라인 교육의 장점과 단점",
  "사회관계망서비스(SNS)의 영향",
  "환경 보존의 중요성",
  "인공지능과 미래 직업",
  "여행의 교육적 가치",
  "스포츠가 사회에 주는 영향",
  "다양성과 포용성",
  "시간 관리의 중요성",
  "전통문화의 보존",
  "건강한 생활 습관",
  "원격 근무의 미래",
  "국제 협력의 필요성",
  "음식 문화와 글로벌화",
  "사람들이 독서를 덜 하는 이유",
  "기술이 인간관계에 미치는 영향",
];

const PRESET_LISTEN_REPEAT_TOPICS = [
  "도서관 이용 안내",
  "기숙사 생활 조언",
  "캠퍼스 투어",
  "수강신청 절차",
  "카페에서의 주문",
  "도움 요청하기",
  "약속 정하기",
  "학업 상담",
  "컴퓨터실 이용법",
  "도서관 자료 검색",
  "교수님 방문",
  "학과 프로젝트 토의",
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const taskType = searchParams.get('taskType') as 'interview' | 'writing' | 'listen_repeat' || 'interview';
    const excludeTopics = searchParams.getAll('exclude');

    if (taskType === 'listen_repeat') {
      // Random topic for Listen & Repeat
      const available = PRESET_LISTEN_REPEAT_TOPICS.filter(
        t => !excludeTopics.includes(t)
      );
      const selected = available.length > 0
        ? available[Math.floor(Math.random() * available.length)]
        : PRESET_LISTEN_REPEAT_TOPICS[Math.floor(Math.random() * PRESET_LISTEN_REPEAT_TOPICS.length)];

      return NextResponse.json({
        ok: true,
        topic: selected,
      });
    }

    // For Interview & Writing: provide suggestions
    const availableSuggestions = PRESET_INTERVIEW_TOPICS.filter(
      t => !excludeTopics.includes(t)
    );

    // Return top 3 suggestions
    const suggestions = availableSuggestions.slice(0, 3).length > 0
      ? availableSuggestions.slice(0, 3)
      : PRESET_INTERVIEW_TOPICS.slice(0, 3);

    return NextResponse.json({
      ok: true,
      suggestions,
      recommended: suggestions[0],
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

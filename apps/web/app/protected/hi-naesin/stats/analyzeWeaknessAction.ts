'use server';

import Anthropic from '@anthropic-ai/sdk';
import { getServerSupabase } from '@/lib/supabase/server';

export type WeaknessAnalysisResult =
  | { ok: true; analysis: string }
  | { ok: false; error: string };

export async function analyzeWeaknessAction(): Promise<WeaknessAnalysisResult> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '로그인이 필요합니다.' };

  // ── 1. 세션 데이터 ─────────────────────────────────────────
  const { data: sessions } = await supabase
    .from('hi_naesin_sessions')
    .select('id, passage_id, submitted_at, score_percent')
    .eq('student_id', user.id)
    .eq('session_type', 'drill')
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })
    .limit(60);

  const submittedSessions = sessions ?? [];
  if (submittedSessions.length === 0) {
    return { ok: false, error: '분석할 드릴 결과가 없습니다. 드릴을 먼저 완료해 주세요.' };
  }

  const submittedIds = submittedSessions.map((s) => s.id);
  const passageIds = [...new Set(submittedSessions.map((s) => s.passage_id))];

  // ── 2. 드릴 응답 ──────────────────────────────────────────
  const { data: responses } = await supabase
    .from('hi_naesin_drill_responses')
    .select('session_id, drill_id, is_correct, score_pct, response_text, feedback_text')
    .in('session_id', submittedIds);

  const allResponses = responses ?? [];

  // ── 3. 드릴 메타 ─────────────────────────────────────────
  const drillIds = [...new Set(allResponses.map((r) => r.drill_id))];
  const { data: drills } =
    drillIds.length > 0
      ? await supabase
          .from('hi_naesin_drills')
          .select('id, drill_type, passage_id, payload')
          .in('id', drillIds)
      : { data: [] };

  const drillMap = new Map((drills ?? []).map((d) => [d.id, d]));

  // ── 4. 지문 정보 ─────────────────────────────────────────
  const { data: passages } =
    passageIds.length > 0
      ? await supabase
          .from('hi_naesin_passages')
          .select('id, title, grade')
          .in('id', passageIds)
      : { data: [] };

  const passageMap = new Map((passages ?? []).map((p) => [p.id, p]));

  // ── 5. 통계 집계 ─────────────────────────────────────────
  type TypeStat = { correct: number; total: number; scoreSum: number; scoreCount: number };
  const typeStats: Record<string, TypeStat> = {};
  const grammarWrong: Record<string, number> = {};

  for (const r of allResponses) {
    const d = drillMap.get(r.drill_id);
    if (!d) continue;
    const t = d.drill_type as string;
    if (!typeStats[t]) typeStats[t] = { correct: 0, total: 0, scoreSum: 0, scoreCount: 0 };
    typeStats[t].total++;
    if (r.is_correct === true) typeStats[t].correct++;
    if (r.score_pct != null) {
      typeStats[t].scoreSum += r.score_pct;
      typeStats[t].scoreCount++;
    }

    if (r.is_correct === false && t === 'grammar_choice') {
      const cat = (d.payload as Record<string, unknown>)?.grammarCategory as string | undefined;
      if (cat) grammarWrong[cat] = (grammarWrong[cat] ?? 0) + 1;
    }
  }

  // 지문별 숙지도 계산
  const passageStatMap: Record<string, TypeStat> = {};
  for (const r of allResponses) {
    const d = drillMap.get(r.drill_id);
    if (!d) continue;
    const pid = d.passage_id as string;
    if (!passageStatMap[pid]) passageStatMap[pid] = { correct: 0, total: 0, scoreSum: 0, scoreCount: 0 };
    passageStatMap[pid].total++;
    if (r.is_correct === true) passageStatMap[pid].correct++;
    if (r.score_pct != null) {
      passageStatMap[pid].scoreSum += r.score_pct;
      passageStatMap[pid].scoreCount++;
    }
  }

  // ── 6. 작문 약점 샘플 수집 ──────────────────────────────
  const writingWeakSamples: { feedback: string; score: number }[] = [];
  for (const r of allResponses) {
    const d = drillMap.get(r.drill_id);
    if (!d || d.drill_type !== 'writing') continue;
    if (r.score_pct != null && r.score_pct < 70 && r.feedback_text) {
      writingWeakSamples.push({ feedback: r.feedback_text, score: r.score_pct });
      if (writingWeakSamples.length >= 5) break;
    }
  }

  // ── 7. 프롬프트 구성 ─────────────────────────────────────
  const DRILL_LABELS: Record<string, string> = {
    translation: '번역(해석)',
    writing: '작문',
    fill_blank: '빈칸채우기',
    vocab: '단어',
    grammar_choice: '문법선택',
  };

  const typeLines = Object.entries(typeStats).map(([type, s]) => {
    const label = DRILL_LABELS[type] ?? type;
    if (type === 'writing' || type === 'translation') {
      const avg = s.scoreCount > 0 ? Math.round(s.scoreSum / s.scoreCount) : null;
      return `- ${label}: ${s.total}문제 완료, 평균 점수 ${avg ?? '?'}점`;
    }
    const acc = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    return `- ${label}: ${s.total}문제 중 ${s.correct}개 정답 (정답률 ${acc}%)`;
  });

  const grammarLines = Object.entries(grammarWrong)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([cat, cnt]) => `- ${cat}: ${cnt}회 오답`);

  // 취약 지문 (숙지도 낮은 순 최대 5개)
  const weakPassages = passageIds
    .map((pid) => {
      const s = passageStatMap[pid];
      const p = passageMap.get(pid);
      if (!s || s.total === 0 || !p) return null;
      const score = s.scoreCount > 0 ? Math.round(s.scoreSum / s.scoreCount) : Math.round((s.correct / s.total) * 100);
      return { title: p.title ?? '(지문)', score };
    })
    .filter(Boolean)
    .sort((a, b) => (a!.score - b!.score))
    .slice(0, 5) as { title: string; score: number }[];

  const weakPassageLines = weakPassages.map((p) => `- "${p.title}": 평균 ${p.score}점`);

  const writingFeedbackSection =
    writingWeakSamples.length > 0
      ? `\n[최근 작문 피드백 (낮은 점수 순)]\n` +
        writingWeakSamples.map((w, i) => `${i + 1}. 점수 ${w.score}점 — ${w.feedback}`).join('\n')
      : '';

  const totalSessions = submittedSessions.length;

  const prompt = `아래는 학생의 내신 드릴 학습 데이터입니다.

[학습 현황]
- 완료 세션: ${totalSessions}회
- 완료 지문: ${passageIds.length}개

[드릴 타입별 성취도]
${typeLines.join('\n') || '데이터 없음'}

[취약 문법 카테고리 (오답 횟수)]
${grammarLines.length > 0 ? grammarLines.join('\n') : '문법 오답 없음'}

[숙지도 낮은 지문]
${weakPassageLines.length > 0 ? weakPassageLines.join('\n') : '취약 지문 없음'}
${writingFeedbackSection}

---

위 데이터를 분석하여 다음 형식으로 한국어로 작성해 주세요:

1. **핵심 약점 요약** (2~3줄로 가장 중요한 문제점)

2. **영역별 약점 분석**
   - 각 약점 영역에 대해 구체적으로 어떤 부분이 부족한지 설명
   - 번역/작문/문법/단어 등 실제 데이터를 근거로 언급

3. **우선 학습 추천** (지금 당장 해야 할 것 3가지)

4. **한 줄 격려 메시지**

분석은 학생이 직접 읽는 것이므로 친근하고 구체적으로 작성해 주세요. 마크다운 형식(굵은 글씨, 목록)을 사용해 가독성 있게 작성하세요.`;

  // ── 8. Claude API 호출 ──────────────────────────────────
  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: [
        {
          type: 'text',
          text: '당신은 고등학생 영어 내신 학습 코치입니다. 학생의 학습 데이터를 분석하여 핵심 약점과 구체적인 학습 방향을 한국어로 친근하게 제시합니다. 마크다운 형식으로 가독성 있게 작성하세요.',
          cache_control: { type: 'ephemeral' },
        },
      ] as Parameters<typeof client.messages.create>[0]['system'],
      messages: [{ role: 'user', content: prompt }],
    });

    // 텍스트 블록만 추출
    const textContent = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    if (!textContent) return { ok: false, error: '분석 결과를 받지 못했습니다.' };

    return { ok: true, analysis: textContent };
  } catch (err) {
    console.error('Claude API error:', err);
    return { ok: false, error: 'AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' };
  }
}

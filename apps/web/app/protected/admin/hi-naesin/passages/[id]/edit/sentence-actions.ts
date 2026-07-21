'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import {
  splitEnglish,
  splitKorean,
  autoMatchSentences,
  extractKeyWords,
  makeBlankSentence,
  detectGrammarHints,
  countWords,
  parseVocabAnnotations,
} from '@/lib/hi-naesin/sentence-splitter';
import {
  generateGrammarQuestions,
  generateConnectiveQuestions,
} from '@/lib/hi-naesin/grammar-generator';
import { generateThoughtUnitDrills } from '@/lib/hi-naesin/thought-unit-generator';
import { generateReferenceQuestions } from '@/lib/hi-naesin/structure-generator';

type Ok<T extends object = object> = { ok: true } & T;
type Fail = { ok: false; error: string };

function revalidate(id: string) {
  revalidatePath(`/admin/hi-naesin/passages/${id}/edit`);
}

// ── 1단계: 문장 분리 & 자동 매칭 후 저장 ────────────────

export async function generateSentencePairsAction(
  passageId: string,
): Promise<Ok<{ count: number }> | Fail> {
  const supabase = await getServerSupabase();

  const { data: passage, error: pErr } = await supabase
    .from('hi_naesin_passages')
    .select('passage_text, translation_ko')
    .eq('id', passageId)
    .single();

  if (pErr || !passage) return { ok: false, error: '지문을 찾을 수 없습니다.' };

  const enSentences = splitEnglish(passage.passage_text);
  const koSentences = passage.translation_ko
    ? splitKorean(passage.translation_ko)
    : [];

  const pairs = autoMatchSentences(enSentences, koSentences);
  if (pairs.length === 0) return { ok: false, error: '문장을 분리할 수 없습니다.' };

  // 기존 문장 쌍 삭제 후 재생성
  await supabase
    .from('hi_naesin_passage_sentences')
    .delete()
    .eq('passage_id', passageId);

  const rows = pairs.map((p, i) => ({
    passage_id:  passageId,
    order_index: i,
    sentence_en: p.sentenceEn,
    sentence_ko: p.sentenceKo || null,
  }));

  const { error } = await supabase
    .from('hi_naesin_passage_sentences')
    .insert(rows);

  if (error) return { ok: false, error: error.message };

  revalidate(passageId);
  return { ok: true, count: rows.length };
}

// ── 2단계: 문장 쌍 수정 ─────────────────────────────────

export async function updateSentencePairAction(
  passageId: string,
  sentenceId: string,
  fd: FormData,
): Promise<Ok | Fail> {
  const supabase = await getServerSupabase();

  const sentenceEn = (fd.get('sentence_en') as string)?.trim();
  const sentenceKo = (fd.get('sentence_ko') as string)?.trim() || null;

  const { error } = await supabase
    .from('hi_naesin_passage_sentences')
    .update({ sentence_en: sentenceEn, sentence_ko: sentenceKo })
    .eq('id', sentenceId);

  if (error) return { ok: false, error: error.message };
  revalidate(passageId);
  return { ok: true };
}

// ── 2단계: 확인된 문장 쌍으로 기본 Drill 자동 생성 (번역/작문/빈칸/단어) ──

export async function generateDrillsFromSentencesAction(
  passageId: string,
): Promise<void> {
  const supabase = await getServerSupabase();
  const adminDb  = getServiceSupabase(); // RLS 우회 — admin 쓰기 전용

  const { data: sentences, error: sErr } = await supabase
    .from('hi_naesin_passage_sentences')
    .select('*')
    .eq('passage_id', passageId)
    .order('order_index');

  if (sErr || !sentences || sentences.length === 0) {
    redirect(`/admin/hi-naesin/passages/${passageId}/edit?tab=sentences&err=no_sentences`);
  }

  // 기존 자동생성 드릴 삭제 (service role: RLS DELETE 정책 무관하게 삭제)
  // translation/writing은 4단계(generateThoughtUnitDrillsAction)에서 중요도 기반으로 생성하므로 여기서 제외
  await adminDb
    .from('hi_naesin_drills')
    .delete()
    .eq('passage_id', passageId)
    .in('drill_type', ['fill_blank', 'grammar_choice', 'vocab']);

  const fillBlankDrills: object[] = [];

  // fill_blank은 문장당 최대 2개 → sentence index 재사용 시 unique(passage_id, drill_type, order_index) 위반
  // 전역 카운터로 고유한 order_index 보장
  let fillBlankIdx = 0;

  for (let i = 0; i < sentences.length; i++) {
    const { sentence_en, sentence_ko } = sentences[i];
    if (!sentence_en) continue;

    // 빈칸 넣기 (문장당 최대 2개, 핵심 단어 기반)
    // order_index를 전역 카운터(fillBlankIdx)로 부여 → unique constraint 위반 방지
    const keywords = extractKeyWords(sentence_en, 2);
    for (const keyword of keywords) {
      const template = makeBlankSentence(sentence_en, keyword);
      if (template) {
        fillBlankDrills.push({
          passage_id:   passageId,
          drill_type:   'fill_blank',
          order_index:  fillBlankIdx++,
          payload: {
            sentenceTemplate: template,
            answer:     keyword,
            distractors: [],
            sentenceKo: sentence_ko ?? '',
          },
          is_published: false,
        });
      }
    }
  }

  // ── 어휘 드릴 생성 ──────────────────────────────────────
  const { data: passageFull } = await adminDb
    .from('hi_naesin_passages')
    .select('passage_text')
    .eq('id', passageId)
    .single();

  const vocabDrills: object[] = [];
  if (passageFull?.passage_text) {
    const vocabItems = parseVocabAnnotations(passageFull.passage_text);
    for (let i = 0; i < vocabItems.length; i++) {
      const { word, meaningKo } = vocabItems[i];
      // 지문에서 예문 찾기
      const exSentence = sentences.find((s) =>
        new RegExp(`\\b${word.split(' ')[0]}\\b`, 'i').test(s.sentence_en)
      );
      vocabDrills.push({
        passage_id:   passageId,
        drill_type:   'vocab',
        order_index:  i,
        payload: {
          word,
          meaningKo,
          exampleSentence: exSentence?.sentence_en ?? null,
        },
        is_published: false,
      });
    }
  }

  // 기본 드릴 저장 (비어있는 배열은 insert 제외)
  const toInsert: Array<{ label: string; rows: object[] }> = [
    { label: 'fill_blank', rows: fillBlankDrills },
    { label: 'vocab',      rows: vocabDrills      },
  ].filter((x) => x.rows.length > 0);

  const baseResults = await Promise.all(
    toInsert.map((x) => adminDb.from('hi_naesin_drills').insert(x.rows)),
  );

  for (let bi = 0; bi < baseResults.length; bi++) {
    if (baseResults[bi].error) {
      const errMsg = encodeURIComponent(baseResults[bi].error?.message ?? 'unknown');
      redirect(`/admin/hi-naesin/passages/${passageId}/edit?tab=sentences&err=${toInsert[bi].label}:${errMsg}`);
    }
  }

  // 지문 배열 변형문제 자동 생성
  await generateTextOrderingVariant(adminDb, passageId, sentences);

  // 결과를 URL 파라미터로 전달해 배너 표시
  const fb = fillBlankDrills.length;
  const v = vocabDrills.length;

  redirect(
    `/admin/hi-naesin/passages/${passageId}/edit?tab=drill&ok=2step&fb=${fb}&v=${v}`,
  );
}

// ── 4단계: AI 생각단위 배열 + 중요도 기반 해석/작문 Drill 생성 ──

export async function generateThoughtUnitDrillsAction(
  passageId: string,
): Promise<void> {
  const supabase = await getServerSupabase();
  const adminDb  = getServiceSupabase(); // RLS 우회 — admin 쓰기 전용

  const { data: sentences, error: sErr } = await supabase
    .from('hi_naesin_passage_sentences')
    .select('id, order_index, sentence_en, sentence_ko')
    .eq('passage_id', passageId)
    .order('order_index');

  if (sErr || !sentences || sentences.length === 0) {
    redirect(`/admin/hi-naesin/passages/${passageId}/edit?tab=sentences&err=no_sentences`);
  }

  // 기존 자동생성 드릴 삭제 (service role: RLS 우회)
  await adminDb
    .from('hi_naesin_drills')
    .delete()
    .eq('passage_id', passageId)
    .in('drill_type', ['translation', 'translation_arrange', 'translation_choice', 'writing', 'writing_arrange']);

  const sentenceInputs = sentences
    .filter((s) => s.sentence_en)
    .map((s) => ({ sentenceEn: s.sentence_en, sentenceKo: s.sentence_ko ?? '' }));

  const genResult = await generateThoughtUnitDrills(sentenceInputs);

  if ('error' in genResult) {
    redirect(
      `/admin/hi-naesin/passages/${passageId}/edit?tab=drill&err=${encodeURIComponent('AI 오류 (생각단위): ' + genResult.error)}`,
    );
  }

  const translationArrangeDrills: object[] = [];
  const writingArrangeDrills:     object[] = [];
  const translationChoiceDrills:  object[] = [];
  const translationDrills:        object[] = [];
  const writingDrills:             object[] = [];
  const importanceUpdates: Array<{ id: string; importance: string }> = [];

  for (const { sentenceIndex, result } of genResult.results) {
    const sentence = sentences[sentenceIndex];
    if (!sentence?.sentence_en) continue;
    const { sentence_en: sentenceEn, sentence_ko: sentenceKo } = sentence;

    importanceUpdates.push({ id: sentence.id, importance: result.importance });

    translationArrangeDrills.push({
      passage_id:   passageId,
      drill_type:   'translation_arrange',
      order_index:  sentenceIndex,
      payload:      { sentenceEn, chunks: result.koChunks.map((c) => ({ id: c.id, ko: c.text })) },
      is_published: false,
    });

    if (sentenceKo) {
      writingArrangeDrills.push({
        passage_id:   passageId,
        drill_type:   'writing_arrange',
        order_index:  sentenceIndex,
        payload:      { koPrompt: sentenceKo, chunks: result.enChunks.map((c) => ({ id: c.id, en: c.text })) },
        is_published: false,
      });
    }

    if (result.importance === 'medium' && result.choiceOptions) {
      translationChoiceDrills.push({
        passage_id:   passageId,
        drill_type:   'translation_choice',
        order_index:  sentenceIndex,
        payload: {
          sentenceEn,
          options:     result.choiceOptions.map(({ key, text }) => ({ key, text })),
          correct:     result.choiceOptions.find((o) => o.isCorrect)?.key ?? 'a',
          explanation: result.explanation ?? '',
        },
        is_published: false,
      });
    }

    if (result.importance === 'high') {
      translationDrills.push({
        passage_id:   passageId,
        drill_type:   'translation',
        order_index:  sentenceIndex,
        payload:      { sentenceEn, answerKo: sentenceKo ?? '' },
        is_published: false,
      });

      if (sentenceKo) {
        const grammarHints = detectGrammarHints(sentenceEn);
        const hintWords    = extractKeyWords(sentenceEn, 3);
        writingDrills.push({
          passage_id:   passageId,
          drill_type:   'writing',
          order_index:  sentenceIndex,
          payload: {
            koPrompt:      sentenceKo,
            answerEn:      sentenceEn,
            acceptableAnswers: [],
            wordCount:     countWords(sentenceEn),
            hintWords,
            grammarHints,
          },
          is_published: false,
        });
      }
    }
  }

  // 문장 중요도 업데이트
  await Promise.all(
    importanceUpdates.map((u) =>
      adminDb.from('hi_naesin_passage_sentences').update({ importance: u.importance }).eq('id', u.id),
    ),
  );

  const toInsert: Array<{ label: string; rows: object[] }> = [
    { label: 'translation_arrange', rows: translationArrangeDrills },
    { label: 'writing_arrange',     rows: writingArrangeDrills     },
    { label: 'translation_choice',  rows: translationChoiceDrills  },
    { label: 'translation',         rows: translationDrills        },
    { label: 'writing',             rows: writingDrills             },
  ].filter((x) => x.rows.length > 0);

  const results = await Promise.all(
    toInsert.map((x) => adminDb.from('hi_naesin_drills').insert(x.rows)),
  );

  for (let i = 0; i < results.length; i++) {
    if (results[i].error) {
      const errMsg = encodeURIComponent(results[i].error?.message ?? 'unknown');
      redirect(`/admin/hi-naesin/passages/${passageId}/edit?tab=drill&err=${toInsert[i].label}:${errMsg}`);
    }
  }

  revalidate(passageId);

  redirect(
    `/admin/hi-naesin/passages/${passageId}/edit?tab=drill&ok=4step`
    + `&ta=${translationArrangeDrills.length}&wa=${writingArrangeDrills.length}`
    + `&tc=${translationChoiceDrills.length}&t=${translationDrills.length}&w=${writingDrills.length}`,
  );
}

// ── 3단계: AI 문법/연결어 Drill 생성 ──────────────────────

export async function generateGrammarDrillsAction(
  passageId: string,
): Promise<void> {
  const supabase = await getServerSupabase();
  const adminDb  = getServiceSupabase(); // RLS 우회 — admin 쓰기 전용

  const { data: sentences, error: sErr } = await supabase
    .from('hi_naesin_passage_sentences')
    .select('sentence_en, sentence_ko')
    .eq('passage_id', passageId)
    .order('order_index');

  if (sErr || !sentences || sentences.length === 0) {
    redirect(`/admin/hi-naesin/passages/${passageId}/edit?tab=sentences&err=no_sentences`);
  }

  // 기존 grammar_choice 삭제 (service role: RLS 우회)
  await adminDb
    .from('hi_naesin_drills')
    .delete()
    .eq('passage_id', passageId)
    .eq('drill_type', 'grammar_choice');

  const sentenceInputs = sentences
    .filter((s) => s.sentence_en)
    .map((s) => ({ sentenceEn: s.sentence_en, sentenceKo: s.sentence_ko ?? '' }));

  const [gResult, cResult] = await Promise.all([
    generateGrammarQuestions(sentenceInputs),
    generateConnectiveQuestions(sentenceInputs),
  ]);

  // redirect() MUST NOT be called inside try/catch — collect error first, redirect after
  // 'error' in x narrowing is more reliable than !x.ok for TypeScript
  if ('error' in gResult) {
    redirect(
      `/admin/hi-naesin/passages/${passageId}/edit?tab=drill&err=${encodeURIComponent('AI 오류 (문법): ' + gResult.error)}`,
    );
  }
  if ('error' in cResult) {
    redirect(
      `/admin/hi-naesin/passages/${passageId}/edit?tab=drill&err=${encodeURIComponent('AI 오류 (연결어): ' + cResult.error)}`,
    );
  }

  const grammarResults = gResult.results;
  const connectiveResults = cResult.results;

  const grammarChoiceDrills: object[] = [
    ...grammarResults.map(({ question }, idx) => ({
      passage_id:   passageId,
      drill_type:   'grammar_choice',
      order_index:  idx,
      payload:      question,
      is_published: false,
    })),
    ...connectiveResults.map(({ question }, idx) => ({
      passage_id:   passageId,
      drill_type:   'grammar_choice',
      order_index:  grammarResults.length + idx,
      payload:      question,
      is_published: false,
    })),
  ];

  let grammarCount = 0;
  if (grammarChoiceDrills.length > 0) {
    const { error: gErr } = await adminDb
      .from('hi_naesin_drills')
      .insert(grammarChoiceDrills);
    if (gErr) {
      const errMsg = encodeURIComponent(gErr.message);
      redirect(`/admin/hi-naesin/passages/${passageId}/edit?tab=drill&err=grammar_insert:${errMsg}`);
    }
    grammarCount = grammarChoiceDrills.length;
  }

  revalidate(passageId);

  const debugInfo = encodeURIComponent(
    `gr${grammarResults.length}_co${connectiveResults.length}_in${sentenceInputs.length}`,
  );
  redirect(
    `/admin/hi-naesin/passages/${passageId}/edit?tab=drill&ok=3step&g=${grammarCount}&d=${debugInfo}`,
  );
}

// ── 구조분석(identify→categorize) Drill 생성 — 1차: 지칭추론 ──────────

export async function generateStructureDrillsAction(
  passageId: string,
): Promise<void> {
  const supabase = await getServerSupabase();
  const adminDb  = getServiceSupabase(); // RLS 우회 — admin 쓰기 전용

  const { data: sentences, error: sErr } = await supabase
    .from('hi_naesin_passage_sentences')
    .select('sentence_en')
    .eq('passage_id', passageId)
    .order('order_index');

  if (sErr || !sentences || sentences.length === 0) {
    redirect(`/admin/hi-naesin/passages/${passageId}/edit?tab=sentences&err=no_sentences`);
  }

  // 기존 identify_categorize 삭제
  await adminDb
    .from('hi_naesin_drills')
    .delete()
    .eq('passage_id', passageId)
    .eq('drill_type', 'identify_categorize');

  const sentenceInputs = (sentences ?? [])
    .filter((s) => s.sentence_en)
    .map((s) => ({ sentenceEn: s.sentence_en as string }));

  const rResult = await generateReferenceQuestions(sentenceInputs);

  // redirect() 는 try/catch 밖에서 — 에러 먼저 수집
  if ('error' in rResult) {
    redirect(
      `/admin/hi-naesin/passages/${passageId}/edit?tab=drill&err=${encodeURIComponent('AI 오류 (구조분석): ' + rResult.error)}`,
    );
  }

  const rows = rResult.results.map(({ payload }, idx) => ({
    passage_id:   passageId,
    drill_type:   'identify_categorize',
    order_index:  idx,
    payload,
    is_published: false,
  }));

  let count = 0;
  if (rows.length > 0) {
    const { error: iErr } = await adminDb.from('hi_naesin_drills').insert(rows);
    if (iErr) {
      redirect(`/admin/hi-naesin/passages/${passageId}/edit?tab=drill&err=structure_insert:${encodeURIComponent(iErr.message)}`);
    }
    count = rows.length;
  }

  revalidate(passageId);
  redirect(`/admin/hi-naesin/passages/${passageId}/edit?tab=drill&ok=structure&s=${count}`);
}

// 지문 배열 변형문제 자동 생성 (4등분)
async function generateTextOrderingVariant(
  adminDb: ReturnType<typeof import('@/lib/supabase/service').getServiceSupabase>,
  passageId: string,
  sentences: Array<{ sentence_en: string }>,
) {
  const total = sentences.length;
  if (total < 4) return;

  const chunkSize = Math.floor(total / 4);
  const getText = (start: number, end: number) =>
    sentences
      .slice(start, end)
      .map((s) => s.sentence_en)
      .join(' ');

  const seg0 = getText(0, chunkSize);                    // 주어지는 첫 단락
  const segA = getText(chunkSize, chunkSize * 2);
  const segB = getText(chunkSize * 2, chunkSize * 3);
  const segC = getText(chunkSize * 3, total);

  const payload = {
    fixedSegment: { text: seg0 },
    segments: [
      { id: 'A', text: segA },
      { id: 'B', text: segB },
      { id: 'C', text: segC },
    ],
    correctOrder: ['A', 'B', 'C'],
  };

  // 기존 text_ordering 삭제 후 재생성
  await adminDb
    .from('hi_naesin_variant_questions')
    .delete()
    .eq('passage_id', passageId)
    .eq('question_type', 'text_ordering');

  await adminDb.from('hi_naesin_variant_questions').insert({
    passage_id:    passageId,
    question_type: 'text_ordering',
    order_index:   0,
    payload,
    is_published:  false,
  });
}

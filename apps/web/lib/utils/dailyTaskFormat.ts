/**
 * Daily Task 문제 포맷팅 공용 유틸
 * Problem Bank의 여러 생성 파이프라인이 남긴 스키마 차이를 정규화해서
 * play 페이지와 review 페이지가 동일한 로직을 공유하도록 한다.
 */

// 블록 요소는 줄바꿈으로 변환해 문단 구조를 보존한 평문 변환
export function stripHtml(html?: string | null): string {
  return (html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// script/style/on* 이벤트 핸들러만 제거한 최소 sanitize (관리자가 생성한 콘텐츠이므로 저위험)
export function sanitizeHtml(html?: string | null): string {
  return (html ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

// Complete Words 빈칸 마커를 공용 "__" 두 언더스코어로 정규화한다.
// 마이그레이션 데이터는 "extr__" 형태(prefix+__), AI 생성 데이터는 "(1)___" 형태를 쓴다.
export function normalizeBlankMarkers(text: string): string {
  return text.replace(/\(\d+\)_+/g, "__").replace(/_{3,}/g, "__");
}

// Problem Bank에는 생성 파이프라인이 서로 달라 두 가지 blanks 스키마가 섞여 있다:
// 구형(마이그레이션): { id, order, correctToken }
// 신형(AI 생성): { number, hint, distractors, correctAnswer }
// 두 스키마를 { id, order, correctToken } 형태로 정규화한다.
export function normalizeBlanks(blanks: any[], itemId: string) {
  return (blanks ?? []).map((b: any, idx: number) => ({
    ...b,
    id: b.id ?? `${itemId}-blank-${idx}`,
    order: b.order ?? b.number ?? idx + 1,
    correctToken: b.correctToken ?? b.correctAnswer ?? b.hidden ?? "",
  }));
}

// 객관식 questions도 파이프라인마다 스키마가 다르다:
// 구형: { stem, choices: [{ id, text, is_correct }] }
// 신형(마이그레이션): { questionText, options: ["A) ...", ...], correctAnswer: "A" }
// 두 스키마를 { stem, choices } 형태로 정규화한다.
export function normalizeQuestions(questions: any[]) {
  return (questions ?? []).map((q: any) => {
    const choices =
      Array.isArray(q.choices) && q.choices.length > 0
        ? q.choices
        : Array.isArray(q.options)
        ? q.options.map((opt: string) => {
            const match = opt.match(/^([A-D])\)\s*(.*)$/);
            const letter = match ? match[1] : opt.trim()[0];
            const text = match ? match[2] : opt;
            return {
              id: letter,
              text,
              is_correct: letter === q.correctAnswer,
            };
          })
        : [];
    return {
      ...q,
      stem: q.stem ?? q.questionText ?? q.question ?? "",
      choices,
    };
  });
}

export function formatCompleteWords(items: any[]) {
  return (items ?? []).map((item: any) => ({
    ...item,
    type: "complete_words" as const,
    passage: item.passage || stripHtml(item.paragraph_html),
    blanks: normalizeBlanks(Array.isArray(item.blanks) ? item.blanks : [], item.id),
  }));
}

export function formatDailyLife(items: any[]) {
  return (items ?? []).map((item: any) => ({
    ...item,
    type: "daily_life" as const,
    passage: item.passage || stripHtml(item.content_html),
    passageHtml: item.content_html ? sanitizeHtml(item.content_html) : null,
    questions: normalizeQuestions(Array.isArray(item.questions) ? item.questions : []),
  }));
}

export function formatAcademicPassage(items: any[]) {
  return (items ?? []).map((item: any) => ({
    ...item,
    type: "academic_passage" as const,
    passage: item.passage || stripHtml(item.passage_html),
    passageHtml: item.passage_html ? sanitizeHtml(item.passage_html) : null,
    questions: normalizeQuestions(Array.isArray(item.questions) ? item.questions : []),
  }));
}

// task row의 *_ids를 이용해 Problem Bank에서 문제를 조회하고 정규화까지 한 번에 처리
// Listening Response 포맷팅
function formatListeningResponse(responses: any[]) {
  return (responses ?? []).map((problem: any) => ({
    id: problem.id,
    topic: problem.topic,
    difficulty: problem.difficulty,
    audioUrl: problem.audio_url,
    transcript: problem.transcript,
    question: {
      id: problem.question?.id || `resp-${problem.id}`,
      stem: problem.question?.stem || "",
      choices: (problem.question?.choices || []).map((c: any, idx: number) => ({
        id: c.id || String.fromCharCode(97 + idx), // a, b, c, d
        text: c.text,
        correct: c.correct,
      })),
      correct: problem.question?.correct || "a",
    },
  }));
}

// Listening Track 포맷팅
function formatListeningTrack(tracks: any[]) {
  return (tracks ?? []).map((problem: any) => ({
    id: problem.id,
    topic: problem.topic,
    difficulty: problem.difficulty,
    trackType: problem.track_type, // conversation, announcement, lecture
    audioUrl: problem.audio_url,
    transcript: problem.transcript,
    questions: (problem.questions || []).map((q: any) => ({
      id: q.id,
      number: q.number,
      stem: q.stem || "",
      choices: (q.choices || []).map((c: any, idx: number) => ({
        id: c.id || String.fromCharCode(97 + idx),
        text: c.text,
        correct: c.correct,
      })),
      correct: q.correct || "a",
    })),
  }));
}

export async function fetchAndFormatDailyTaskProblems(supabase: any, task: any) {
  const [{ data: completeWords }, { data: dailyLife }, { data: academic }, { data: listeningResponses }, { data: listeningTrack }] = await Promise.all([
    task.complete_words_ids && task.complete_words_ids.length > 0
      ? supabase.from("problem_bank_complete_words_2026").select("*").in("id", task.complete_words_ids)
      : Promise.resolve({ data: [] }),
    task.daily_life_ids && task.daily_life_ids.length > 0
      ? supabase.from("problem_bank_daily_life_2026").select("*").in("id", task.daily_life_ids)
      : Promise.resolve({ data: [] }),
    task.academic_passage_ids && task.academic_passage_ids.length > 0
      ? supabase.from("problem_bank_academic_passage_2026").select("*").in("id", task.academic_passage_ids)
      : Promise.resolve({ data: [] }),
    task.listening_response_ids && task.listening_response_ids.length > 0
      ? supabase.from("problem_bank_listening_response_2026").select("*").in("id", task.listening_response_ids)
      : Promise.resolve({ data: [] }),
    task.listening_track_id
      ? supabase.from("problem_bank_listening_track_2026").select("*").eq("id", task.listening_track_id)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    complete_words: formatCompleteWords(completeWords ?? []),
    daily_life: formatDailyLife(dailyLife ?? []),
    academic_passage: formatAcademicPassage(academic ?? []),
    listening_response: formatListeningResponse(listeningResponses ?? []),
    listening_track: formatListeningTrack(listeningTrack ?? []),
  };
}

-- vocab_exam_results: LingoX VOCA 시험 결과 저장용

create table if not exists public.vocab_exam_results (
  id uuid primary key default gen_random_uuid(),

  -- 누가 친 시험인지 (없을 수도 있으니 null 허용)
  user_id uuid references auth.users (id) on delete set null,

  -- exam 모드: core / boosted / grammar-only 등으로 확장 가능
  mode text not null default 'core',

  -- 기존 enum grade_band 재사용 (nullable)
  grade_band public.grade_band null,

  -- 자동 채점 가능한 문항 수 / 맞은 개수 / 퍼센트
  total_questions integer not null,
  correct_auto integer not null,
  rate_auto integer not null,

  -- 원시 응답/메타데이터 통으로 저장 (JSONB)
  --  예: { answers: [...], questions: [...] }
  raw_answers jsonb not null,

  created_at timestamptz not null default now()
);

comment on table public.vocab_exam_results is
  'LingoX VOCA – 단어 시험 결과 기록 (자동채점 요약 + 원시 응답 JSON)';

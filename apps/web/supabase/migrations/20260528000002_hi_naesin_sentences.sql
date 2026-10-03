-- supabase/migrations/20260528000002_hi_naesin_sentences.sql
-- 지문 문장 쌍 (영어-한국어 매칭 결과 저장)

create table if not exists public.hi_naesin_passage_sentences (
  id          uuid primary key default gen_random_uuid(),
  passage_id  uuid not null references public.hi_naesin_passages(id) on delete cascade,
  order_index integer not null,
  sentence_en text not null,
  sentence_ko text,
  is_key      boolean not null default false,  -- 주요 문장 여부 (선택적 표시)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint hi_naesin_passage_sentences_order_unique unique (passage_id, order_index)
);

create index if not exists idx_hi_naesin_sentences_passage
  on public.hi_naesin_passage_sentences (passage_id);

drop trigger if exists trg_hi_naesin_passage_sentences_updated_at
  on public.hi_naesin_passage_sentences;
create trigger trg_hi_naesin_passage_sentences_updated_at
  before update on public.hi_naesin_passage_sentences
  for each row execute function public.tg_set_updated_at();

create table if not exists public.naesin_exam_scope_items (
  id uuid primary key default gen_random_uuid(),
  scope_id uuid not null references public.naesin_exam_scopes(id) on delete cascade,
  item_type text not null default 'note',
  title text not null,
  body text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.naesin_exam_scope_items
  add column if not exists item_type text not null default 'note',
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_naesin_exam_scope_items_scope_id
  on public.naesin_exam_scope_items(scope_id);

create index if not exists idx_naesin_exam_scope_items_scope_sort
  on public.naesin_exam_scope_items(scope_id, sort_order, created_at);

create index if not exists idx_naesin_exam_scope_items_item_type
  on public.naesin_exam_scope_items(item_type);

create extension if not exists pgcrypto;

create table if not exists public.ui_label_catalog (
  id uuid primary key default gen_random_uuid(),

  domain text not null,
  key text not null,

  track text null,
  section text null,
  school_level text null,
  audience text null,

  label_ko text not null,
  label_en text null,

  short_description_ko text null,
  long_description_ko text null,

  student_message_ko text null,
  parent_message_ko text null,
  teacher_message_ko text null,

  sort_order int not null default 100,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ui_label_catalog_domain
  on public.ui_label_catalog (domain);

create index if not exists idx_ui_label_catalog_key
  on public.ui_label_catalog (key);

create index if not exists idx_ui_label_catalog_scope
  on public.ui_label_catalog (track, section, school_level, audience);

create index if not exists idx_ui_label_catalog_active
  on public.ui_label_catalog (is_active);

-- 학원 홍보센터 (promo) v1
-- 본사(hq) → 가맹점(branch) 2단계 프랜차이즈 구조 위에서 가맹점별 홍보 채널·게시 일정·
-- 상담 문의·자동 콘텐츠 일정을 관리하고, 본사는 브랜드 가이드와 시즌 캠페인을 배포한다.
--
-- 기존 테이블 변경은 null 허용 컬럼 추가만 한다:
--   organizations.kind / parent_id  : 본사·가맹점 구분과 소속 본사
--   academy_students.org_id         : 학생 소속 가맹점 (학습 통계 집계용)
-- 홍보 데이터는 모두 promo_ 접두어 테이블에 둔다.

-- ──────────────────────────────────────────────────────────
-- 1. 기존 테이블 확장
-- ──────────────────────────────────────────────────────────
alter table public.organizations
  add column if not exists kind text not null default 'branch',
  add column if not exists parent_id uuid references public.organizations(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'organizations_kind_check') then
    alter table public.organizations
      add constraint organizations_kind_check check (kind in ('hq', 'branch'));
  end if;
end $$;

create index if not exists idx_organizations_parent on public.organizations (parent_id);

alter table public.academy_students
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

create index if not exists idx_academy_students_org on public.academy_students (org_id);

-- ──────────────────────────────────────────────────────────
-- 2. 권한 헬퍼
--    본사 관리자 = profiles.role = 'admin' 또는 is_admin
--    가맹점 운영자 = memberships.role in ('owner', 'manager')
-- ──────────────────────────────────────────────────────────
create or replace function public.promo_is_hq_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.role = 'admin' or coalesce(p.is_admin, false))
  );
$$;

create or replace function public.promo_can_manage(p_org uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.promo_is_hq_admin() or exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = auth.uid() and m.role in ('owner', 'manager')
  );
$$;

-- 가맹점 운영자가 자기 본사의 캠페인·브랜드 가이드를 읽을 수 있는지
create or replace function public.promo_can_read_hq(p_hq uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.promo_is_hq_admin() or exists (
    select 1
    from public.memberships m
    join public.organizations o on o.id = m.org_id
    where m.user_id = auth.uid() and m.role in ('owner', 'manager') and o.parent_id = p_hq
  );
$$;

revoke execute on function public.promo_is_hq_admin() from anon;
revoke execute on function public.promo_can_manage(uuid) from anon;
revoke execute on function public.promo_can_read_hq(uuid) from anon;

-- ──────────────────────────────────────────────────────────
-- 3. 가맹점 학원 정보 (홍보 문구 재료)
-- ──────────────────────────────────────────────────────────
create table if not exists public.promo_org_profiles (
  org_id          uuid primary key references public.organizations(id) on delete cascade,
  display_name    text,
  region          text,          -- 지역·인근 학교
  grades          text,          -- 대상 학년
  subjects        text,
  strengths       text,
  classes         text,          -- 반 구성·수업 방식
  phone           text,
  tone            text,
  avoid           text,
  trend_keywords  text[] not null default '{}',   -- 트렌드 분석에 추가로 볼 검색어
  auto_approve    boolean not null default false, -- true면 생성 즉시 승인(컨펌 생략)
  updated_at      timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────
-- 4. 홍보 채널 / 게시물 / 자동 일정
-- ──────────────────────────────────────────────────────────
create table if not exists public.promo_channels (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  kind        text not null check (kind in (
                'blog', 'insta', 'facebook', 'youtube', 'gbp', 'kakao', 'sms', 'place', 'flyer', 'shorts')),
  name        text not null,
  handle      text,
  write_url   text check (write_url is null or write_url like 'https://%'),
  active      boolean not null default true,
  color_idx   int not null default 0,
  -- 자동 업로드 대상 (인스타·페이스북·유튜브·구글 비즈니스 프로필)
  connection_id  uuid,      -- promo_connections.id (아래에서 FK 추가)
  target         jsonb,     -- {pageId} | {igUserId} | {channelId} | {locationName} 와 표시 이름
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_promo_channels_org on public.promo_channels (org_id);

create table if not exists public.promo_automations (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizations(id) on delete cascade,
  channel_id         uuid not null references public.promo_channels(id) on delete cascade,
  weekdays           smallint[] not null default '{}',   -- 0=일 ... 6=토
  post_time          time,
  topics             text[] not null default '{}',
  active             boolean not null default true,
  last_generated_at  timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_promo_automations_org on public.promo_automations (org_id);

-- 본사 시즌 캠페인 (가맹점 전체에 배포)
create table if not exists public.promo_campaigns (
  id              uuid primary key default gen_random_uuid(),
  hq_org_id       uuid not null references public.organizations(id) on delete cascade,
  title           text not null,
  summary         text,
  starts_on       date,
  ends_on         date,
  channel_kinds   text[] not null default '{}',
  brief           text,          -- AI에게 줄 캠페인 지침 (핵심 메시지, 혜택, 필수 문구)
  template_title  text,
  template_body   text,
  status          text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_promo_campaigns_hq on public.promo_campaigns (hq_org_id, status);

create table if not exists public.promo_posts (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  channel_id      uuid references public.promo_channels(id) on delete set null,
  title           text not null default '',
  body            text not null default '',
  hashtags        text[] not null default '{}',
  scheduled_on    date not null,
  scheduled_time  time,
  -- pending: 컨펌 대기 / scheduled: 승인됨(예약) / publishing: 업로드 중 / posted: 게시됨
  -- failed: 자동 업로드 실패 / skipped: 건너뜀
  status          text not null default 'scheduled'
                    check (status in ('pending', 'scheduled', 'publishing', 'posted', 'failed', 'skipped')),
  source          text not null default 'manual' check (source in ('manual', 'auto', 'campaign', 'plan')),
  media           jsonb not null default '[]'::jsonb,   -- [{url, path, type: image|video}]
  external_id     text,
  external_url    text,
  publish_error   text,
  publish_attempts int not null default 0,
  approved_by     uuid references auth.users(id) on delete set null,
  approved_at     timestamptz,
  trend_report_id uuid,
  automation_id   uuid references public.promo_automations(id) on delete set null,
  campaign_id     uuid references public.promo_campaigns(id) on delete set null,
  posted_at       timestamptz,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_promo_posts_org_date on public.promo_posts (org_id, scheduled_on);
create index if not exists idx_promo_posts_publish on public.promo_posts (status, scheduled_on) where status in ('scheduled', 'publishing');

-- 본사 브랜드 가이드 (본사 org당 1개)
create table if not exists public.promo_brand_guides (
  hq_org_id         uuid primary key references public.organizations(id) on delete cascade,
  brand_name        text,
  tone              text,
  must_include      text[] not null default '{}',
  must_avoid        text[] not null default '{}',
  default_hashtags  text[] not null default '{}',
  footer            text,       -- 모든 게시물 끝에 붙일 문구 (선택)
  updated_at        timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────
-- 5. 상담·문의
-- ──────────────────────────────────────────────────────────
create table if not exists public.promo_leads (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizations(id) on delete cascade,
  student_name       text not null,
  grade              text,
  school             text,
  parent_name        text,
  parent_phone       text,
  source_channel_id  uuid references public.promo_channels(id) on delete set null,
  source_label       text,      -- 채널 외 경로 (지인 소개, 간판 등)
  stage              text not null default 'inquiry'
                       check (stage in ('inquiry', 'booked', 'consulted', 'enrolled', 'on_hold')),
  inquired_on        date not null default current_date,
  next_contact_on    date,
  enrolled_on        date,
  memo               text,
  created_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_promo_leads_org_date on public.promo_leads (org_id, inquired_on);

-- ──────────────────────────────────────────────────────────
-- 6. 학습 통계 스냅샷 (가맹점·월 단위 집계, 개인정보 없음)
--    cron(/api/cron/promo-daily)이 service role로 채운다.
-- ──────────────────────────────────────────────────────────
create table if not exists public.promo_learning_snapshots (
  org_id        uuid not null references public.organizations(id) on delete cascade,
  period_month  date not null,     -- 해당 월 1일
  metrics       jsonb not null default '{}'::jsonb,
  computed_at   timestamptz not null default now(),
  primary key (org_id, period_month)
);

-- AI 호출 기록 (가맹점별 일일 한도 확인용)
create table if not exists public.promo_ai_runs (
  id          bigint generated always as identity primary key,
  org_id      uuid not null references public.organizations(id) on delete cascade,
  kind        text not null,       -- write | autogen | campaign | insight
  created_at  timestamptz not null default now()
);
create index if not exists idx_promo_ai_runs_org_time on public.promo_ai_runs (org_id, created_at);

-- 외부 플랫폼 연결 (OAuth). 토큰은 서버에서 AES-256-GCM으로 암호화해 저장한다.
-- 쓰기는 OAuth 콜백(service role)만 한다.
create table if not exists public.promo_connections (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organizations(id) on delete cascade,
  provider          text not null check (provider in ('meta', 'google')),
  account_label     text,
  access_token_enc  text,
  refresh_token_enc text,
  token_expires_at  timestamptz,
  status            text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  meta              jsonb not null default '{}'::jsonb,   -- 게시 가능한 페이지·계정·지점 목록 (페이지 토큰은 암호화)
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (org_id, provider)
);

alter table public.promo_channels
  drop constraint if exists promo_channels_connection_fk,
  add constraint promo_channels_connection_fk
    foreign key (connection_id) references public.promo_connections(id) on delete set null;

-- 주간 트렌드 분석 리포트 + 콘텐츠 플랜
create table if not exists public.promo_trend_reports (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  period_start  date not null,
  keywords      jsonb not null default '[]'::jsonb,   -- 분석한 검색어 그룹
  trend_data    jsonb not null default '{}'::jsonb,   -- 네이버 데이터랩 응답 요약 (상대 지수)
  summary       text,
  insights      jsonb not null default '[]'::jsonb,
  plan          jsonb not null default '[]'::jsonb,   -- [{date, kind, topic, angle}]
  posts_created int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists idx_promo_trend_reports_org on public.promo_trend_reports (org_id, period_start desc);

alter table public.promo_posts
  drop constraint if exists promo_posts_trend_report_fk,
  add constraint promo_posts_trend_report_fk
    foreign key (trend_report_id) references public.promo_trend_reports(id) on delete set null;

-- 게시물 이미지·영상 (인스타그램은 공개 URL에서 이미지를 가져가므로 public 버킷)
insert into storage.buckets (id, name, public)
values ('promo-media', 'promo-media', true)
on conflict (id) do nothing;

drop policy if exists promo_media_insert on storage.objects;
create policy promo_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'promo-media' and public.promo_can_manage(((storage.foldername(name))[1])::uuid));
drop policy if exists promo_media_delete on storage.objects;
create policy promo_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'promo-media' and public.promo_can_manage(((storage.foldername(name))[1])::uuid));

-- ──────────────────────────────────────────────────────────
-- 7. updated_at 트리거
-- ──────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'promo_org_profiles', 'promo_channels', 'promo_automations', 'promo_campaigns',
    'promo_posts', 'promo_brand_guides', 'promo_leads', 'promo_connections'
  ] loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$s', t);
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$s
         for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────
-- 8. RLS
-- ──────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'promo_org_profiles', 'promo_channels', 'promo_automations', 'promo_posts', 'promo_leads'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists promo_manage on public.%I', t);
    execute format(
      'create policy promo_manage on public.%I for all
         using (public.promo_can_manage(org_id))
         with check (public.promo_can_manage(org_id))', t);
  end loop;
end $$;

-- 연결 정보: 운영자는 읽기만 (토큰은 암호화돼 있음), 쓰기는 service role
alter table public.promo_connections enable row level security;
drop policy if exists promo_read on public.promo_connections;
create policy promo_read on public.promo_connections for select
  using (public.promo_can_manage(org_id));
drop policy if exists promo_delete on public.promo_connections;
create policy promo_delete on public.promo_connections for delete
  using (public.promo_can_manage(org_id));

alter table public.promo_trend_reports enable row level security;
drop policy if exists promo_read on public.promo_trend_reports;
create policy promo_read on public.promo_trend_reports for select
  using (public.promo_can_manage(org_id));

alter table public.promo_learning_snapshots enable row level security;
drop policy if exists promo_read on public.promo_learning_snapshots;
create policy promo_read on public.promo_learning_snapshots for select
  using (public.promo_can_manage(org_id));

alter table public.promo_ai_runs enable row level security;
drop policy if exists promo_read on public.promo_ai_runs;
create policy promo_read on public.promo_ai_runs for select
  using (public.promo_can_manage(org_id));
drop policy if exists promo_insert on public.promo_ai_runs;
create policy promo_insert on public.promo_ai_runs for insert
  with check (public.promo_can_manage(org_id));

alter table public.promo_campaigns enable row level security;
drop policy if exists promo_hq_write on public.promo_campaigns;
create policy promo_hq_write on public.promo_campaigns for all
  using (public.promo_is_hq_admin())
  with check (public.promo_is_hq_admin());
drop policy if exists promo_branch_read on public.promo_campaigns;
create policy promo_branch_read on public.promo_campaigns for select
  using (status = 'published' and public.promo_can_read_hq(hq_org_id));

alter table public.promo_brand_guides enable row level security;
drop policy if exists promo_hq_write on public.promo_brand_guides;
create policy promo_hq_write on public.promo_brand_guides for all
  using (public.promo_is_hq_admin())
  with check (public.promo_is_hq_admin());
drop policy if exists promo_branch_read on public.promo_brand_guides;
create policy promo_branch_read on public.promo_brand_guides for select
  using (public.promo_can_read_hq(hq_org_id));

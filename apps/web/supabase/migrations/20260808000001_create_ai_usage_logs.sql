-- 20260808000001_create_ai_usage_logs.sql
-- Anthropic API 호출별 토큰 사용량/추정 비용 로그.
-- 캐싱/모델 티어 최적화 전후 비교를 위한 가시성 확보 (내부 전용, 학생 소유 데이터 아님).
begin;

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  route text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_creation_input_tokens integer not null default 0,
  cache_read_input_tokens integer not null default 0,
  estimated_cost_usd numeric(10,6),
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_logs_route_created_at on public.ai_usage_logs(route, created_at);
create index if not exists idx_ai_usage_logs_created_at on public.ai_usage_logs(created_at);

-- 내부 비용 모니터링 전용 테이블 — RLS는 켜두되 정책은 만들지 않는다.
-- service role만 접근 가능 (RLS를 우회하는 getServiceSupabase()로만 기록/조회).
alter table public.ai_usage_logs enable row level security;

commit;

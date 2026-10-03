-- photo_homework: 선생님이 만드는 숙제 (정답지 포함)
create table if not exists photo_homework (
  id            uuid primary key default gen_random_uuid(),
  created_by    uuid references profiles(id) on delete set null,
  title         text not null,
  description   text,
  subject       text,           -- 'vocab' | 'grammar' | 'reading' | 'mixed'
  answer_key_url text,          -- Supabase Storage public URL
  due_at        timestamptz,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- photo_homework_submissions: 학생 제출 + AI 채점 결과
create table if not exists photo_homework_submissions (
  id             uuid primary key default gen_random_uuid(),
  homework_id    uuid not null references photo_homework(id) on delete cascade,
  student_id     uuid not null references profiles(id) on delete cascade,
  photo_url      text,          -- 학생 제출 사진 URL (optional — privacy)
  ai_results     jsonb,         -- Claude 채점 JSON
  correct_count  int,
  total_count    int,
  graded_at      timestamptz,
  created_at     timestamptz not null default now(),
  unique (homework_id, student_id)   -- 학생당 최신 1건 (upsert용)
);

-- Supabase Storage bucket: homework-images
-- (Supabase 콘솔에서 직접 생성 필요 — public 버킷)
-- bucket name: homework-images

-- RLS (선생님만 생성, 학생은 자신 제출만 읽기)
alter table photo_homework enable row level security;
alter table photo_homework_submissions enable row level security;

-- photo_homework: 선생님/어드민은 모두 접근, 학생은 활성 숙제만 읽기
drop policy if exists "teacher_admin_all_homework" on photo_homework;
create policy "teacher_admin_all_homework"
  on photo_homework for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role in ('teacher', 'admin')
    )
  );

drop policy if exists "student_read_active_homework" on photo_homework;
create policy "student_read_active_homework"
  on photo_homework for select
  using (
    is_active = true
    and exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'student'
    )
  );

-- photo_homework_submissions: 학생은 자신 것만, 선생님/어드민은 모두
drop policy if exists "student_own_submissions" on photo_homework_submissions;
create policy "student_own_submissions"
  on photo_homework_submissions for all
  using (student_id = auth.uid());

drop policy if exists "teacher_admin_all_submissions" on photo_homework_submissions;
create policy "teacher_admin_all_submissions"
  on photo_homework_submissions for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role in ('teacher', 'admin')
    )
  );

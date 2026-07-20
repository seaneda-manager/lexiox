-- Avatar storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profiles',
  'profiles',
  true,
  2097152, -- 2MB
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

-- 본인만 업로드/삭제 가능
drop policy if exists "avatar_upload" on storage.objects;
create policy "avatar_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profiles' and
    name = 'avatars/' || auth.uid() || '.' || split_part(name, '.', 2)
  );

drop policy if exists "avatar_update" on storage.objects;
create policy "avatar_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'profiles' and owner = auth.uid());

drop policy if exists "avatar_delete" on storage.objects;
create policy "avatar_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'profiles' and owner = auth.uid());

-- 누구나 읽기 가능 (public bucket)
drop policy if exists "avatar_read" on storage.objects;
create policy "avatar_read" on storage.objects
  for select to public
  using (bucket_id = 'profiles');

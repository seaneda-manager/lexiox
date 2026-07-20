-- Create public storage bucket for Updated Speaking assets (site map images, interviewer GIFs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'speaking-assets',
  'speaking-assets',
  true,
  20971520,  -- 20 MB
  array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
)
on conflict (id) do nothing;

-- Allow authenticated users (admin) to upload
create policy "admin upload speaking assets"
on storage.objects for insert
to authenticated
with check (bucket_id = 'speaking-assets');

-- Allow public read
create policy "public read speaking assets"
on storage.objects for select
to public
using (bucket_id = 'speaking-assets');

-- Allow authenticated users to update/delete their own uploads
create policy "admin update speaking assets"
on storage.objects for update
to authenticated
using (bucket_id = 'speaking-assets');

create policy "admin delete speaking assets"
on storage.objects for delete
to authenticated
using (bucket_id = 'speaking-assets');

-- admin/producer: hi_naesin 콘텐츠 테이블 쓰기 권한
create policy "hi_naesin_passages_write"
  on public.hi_naesin_passages
  for all
  using (public.is_admin_or_producer(auth.uid()))
  with check (public.is_admin_or_producer(auth.uid()));

create policy "hi_naesin_drills_write"
  on public.hi_naesin_drills
  for all
  using (public.is_admin_or_producer(auth.uid()))
  with check (public.is_admin_or_producer(auth.uid()));

create policy "hi_naesin_variant_questions_write"
  on public.hi_naesin_variant_questions
  for all
  using (public.is_admin_or_producer(auth.uid()))
  with check (public.is_admin_or_producer(auth.uid()));

create policy "hi_naesin_variant_choices_write"
  on public.hi_naesin_variant_choices
  for all
  using (public.is_admin_or_producer(auth.uid()))
  with check (public.is_admin_or_producer(auth.uid()));

create policy "hi_naesin_passage_sentences_write"
  on public.hi_naesin_passage_sentences
  for all
  using (public.is_admin_or_producer(auth.uid()))
  with check (public.is_admin_or_producer(auth.uid()));

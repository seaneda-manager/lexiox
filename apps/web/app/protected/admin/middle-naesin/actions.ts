'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase/server';

export async function createUnitAction(formData: FormData) {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from('middle_naesin_units')
    .insert({
      school_name:   formData.get('school_name') as string || null,
      publisher:     formData.get('publisher') as string,
      grade:         formData.get('grade') as string,
      semester:      Number(formData.get('semester')),
      lesson_number: formData.get('lesson_number') ? Number(formData.get('lesson_number')) : null,
      lesson_title:  formData.get('lesson_title') as string || null,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  redirect(`/admin/middle-naesin/units/${data.id}`);
}

export async function updateUnitAction(formData: FormData) {
  const supabase = await getServerSupabase();
  const id = formData.get('id') as string;
  const { error } = await supabase
    .from('middle_naesin_units')
    .update({
      school_name:   formData.get('school_name') as string || null,
      publisher:     formData.get('publisher') as string,
      grade:         formData.get('grade') as string,
      semester:      Number(formData.get('semester')),
      lesson_number: formData.get('lesson_number') ? Number(formData.get('lesson_number')) : null,
      lesson_title:  formData.get('lesson_title') as string || null,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/middle-naesin/units/${id}`);
  redirect(`/admin/middle-naesin/units/${id}`);
}

export async function toggleUnitPublishedAction(formData: FormData) {
  const supabase = await getServerSupabase();
  const id = formData.get('id') as string;
  const is_published = formData.get('is_published') === 'true';
  await supabase.from('middle_naesin_units').update({ is_published }).eq('id', id);
  revalidatePath('/admin/middle-naesin/units');
}

export async function upsertContentAction(formData: FormData) {
  const supabase = await getServerSupabase();
  const id       = formData.get('id') as string | null;
  const unit_id  = formData.get('unit_id') as string;
  const payload  = {
    unit_id,
    content_type:   formData.get('content_type') as string,
    title:          formData.get('title') as string || null,
    body_text:      formData.get('body_text') as string || null,
    translation_ko: formData.get('translation_ko') as string || null,
    sort_order:     Number(formData.get('sort_order') ?? 0),
  };

  if (id) {
    const { error } = await supabase.from('middle_naesin_contents').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('middle_naesin_contents').insert(payload);
    if (error) throw new Error(error.message);
  }
  revalidatePath(`/admin/middle-naesin/units/${unit_id}`);
  redirect(`/admin/middle-naesin/units/${unit_id}`);
}

export async function confirmUnitAction(formData: FormData) {
  const supabase = await getServerSupabase();
  const id = formData.get('id') as string;
  await supabase.from('middle_naesin_units').update({ is_published: true }).eq('id', id);
  revalidatePath(`/admin/middle-naesin/units/${id}`);
  redirect(`/admin/middle-naesin/units/${id}`);
}

export async function deleteContentAction(formData: FormData) {
  const supabase = await getServerSupabase();
  const id      = formData.get('id') as string;
  const unit_id = formData.get('unit_id') as string;
  await supabase.from('middle_naesin_contents').delete().eq('id', id);
  revalidatePath(`/admin/middle-naesin/units/${unit_id}`);
}

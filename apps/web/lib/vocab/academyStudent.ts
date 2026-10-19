/**
 * auth uid → academy_students.id
 * (student_vocab_assignments / student_vocab_plans / vocab_word_mastery / vocab_remedial_tasks 는
 *  auth uid 가 아니라 academy_students.id 를 쓴다.)
 */
export async function resolveAcademyStudentId(admin: any, authUserId: string): Promise<string | null> {
  const { data } = await admin
    .from("academy_students")
    .select("id")
    .or(`user_id.eq.${authUserId},auth_user_id.eq.${authUserId},profile_id.eq.${authUserId}`)
    .maybeSingle();
  return data?.id ?? null;
}

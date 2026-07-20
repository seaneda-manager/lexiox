// apps/web/app/(protected)/admin/vocab/sets/actions.ts
"use server";

export async function generateTracksUrl(params: {
  setIds: string[];
  studentIds: string[];
}): Promise<{ url: string }> {
  if (!params.setIds.length || !params.studentIds.length) {
    throw new Error("setIds와 studentIds가 필요합니다");
  }

  // Tracks 페이지 URL 생성
  const setsParam = params.setIds.join(",");
  const studentsParam = params.studentIds.join(",");
  const url = `/admin/vocab/Tracks?sets=${setsParam}&students=${studentsParam}`;

  return { url };
}

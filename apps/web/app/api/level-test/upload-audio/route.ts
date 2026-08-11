export const dynamic = 'force-dynamic';

// apps/web/app/api/level-test/upload-audio/route.ts
// 레벨 테스트 말하기 섹션 녹음 업로드. speaking-2026 upload-audio route와 동일한 패턴,
// 같은 "audio" 버킷을 쓰되 경로 prefix만 분리.
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const sessionId = formData.get("sessionId") as string | null;
    const questionId = formData.get("questionId") as string | null;

    if (!(file instanceof Blob)) {
      return NextResponse.json({ ok: false, error: "No file received" }, { status: 400 });
    }

    const ext = file.type === "audio/webm" ? "webm" : "dat";
    const fileName = `level-test/${user.id}/${sessionId ?? "unknown"}/${questionId ?? "q"}/${randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("audio").upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      console.error("level-test upload error", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from("audio").getPublicUrl(fileName);
    return NextResponse.json({ ok: true, path: fileName, publicUrl });
  } catch (e: any) {
    console.error("level-test/upload-audio route fatal error", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown server error" }, { status: 500 });
  }
}

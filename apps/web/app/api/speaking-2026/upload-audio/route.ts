// apps/web/app/api/speaking-2026/upload-audio/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const testId = formData.get("testId") as string | null;
    const taskId = formData.get("taskId") as string | null;

    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { ok: false, error: "No file received" },
        { status: 400 },
      );
    }

    const ext = file.type === "audio/webm" ? "webm" : "dat";

    // ✅ audio 버킷 안의 경로만 보기 좋게 정리
    const fileName = `speaking-2026/${user.id}/${testId ?? "demo"}/${
      taskId ?? "extra"
    }/${randomUUID()}.${ext}`;

    // ✅ 실제 존재하는 버킷 이름: audio
    const { error } = await supabase.storage
      .from("audio")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("audio").getPublicUrl(fileName);

    return NextResponse.json({
      ok: true,
      path: fileName,
      publicUrl,
    });
  } catch (e: any) {
    console.error("speaking-2026/upload-audio route fatal error", e);
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? "Unknown server error",
      },
      { status: 500 },
    );
  }
}

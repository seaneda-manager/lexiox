import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function createAuthedServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!url || !anon) {
    throw new Error("Supabase env missing");
  }

  return createServerClient(url, anon, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name, options) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}

async function checkAdminAccess(supabase: any, userId: string) {
  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", userId)
    .single();

  return !!admin;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ flagId: string }> }
) {
  try {
    const { flagId } = await params;
    const supabase = await createAuthedServerClient();

    // 1. Admin 권한 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await checkAdminAccess(supabase, user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. 요청 파싱
    const body = await request.json();
    const { action, newData, notes } = body;

    if (!action || !["approve", "reject", "edit"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    // 3. 플래그 조회
    const { data: flag, error: flagError } = await supabase
      .from("learning_stage_flags")
      .select("*")
      .eq("id", flagId)
      .single();

    if (flagError || !flag) {
      return NextResponse.json(
        { error: "Flag not found" },
        { status: 404 }
      );
    }

    // 4. 액션별 처리
    let updateData: any = {
      status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "edited",
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      admin_notes: notes || "",
    };

    // Edit인 경우 새 데이터로 learning_stage_items 업데이트
    if (action === "edit" && newData) {
      const { error: updateError } = await supabase
        .from("learning_stage_items")
        .update(newData)
        .eq("word_id", flag.word_id);

      if (updateError) {
        console.error("Update learning_stage_items error:", updateError);
        return NextResponse.json(
          { error: "Failed to update data" },
          { status: 500 }
        );
      }

      updateData.original_data = newData;
    }

    // Approve인 경우 학생에게 노출 가능하도록 상태 변경
    if (action === "approve") {
      const { error: lsError } = await supabase
        .from("learning_stage_items")
        .update({ data_status: "clean", mojibake_detected: false })
        .eq("word_id", flag.word_id);

      if (lsError) {
        console.error("Update data_status error:", lsError);
        return NextResponse.json(
          { error: "Failed to update data status" },
          { status: 500 }
        );
      }
    }

    // Reject인 경우 학생에게 숨김
    if (action === "reject") {
      const { error: lsError } = await supabase
        .from("learning_stage_items")
        .update({ data_status: "rejected" })
        .eq("word_id", flag.word_id);

      if (lsError) {
        console.error("Update data_status error:", lsError);
        return NextResponse.json(
          { error: "Failed to update data status" },
          { status: 500 }
        );
      }
    }

    // 5. 플래그 업데이트
    const { error: updateFlagError } = await supabase
      .from("learning_stage_flags")
      .update(updateData)
      .eq("id", flagId);

    if (updateFlagError) {
      console.error("Update flag error:", updateFlagError);
      return NextResponse.json(
        { error: "Failed to update flag" },
        { status: 500 }
      );
    }

    // 6. 감사 로그 저장 (선택사항)
    await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action: `LEARNING_STAGE_FLAG_${action.toUpperCase()}`,
      target_id: flagId,
      target_type: "learning_stage_flag",
      details: {
        flag_id: flagId,
        word_id: flag.word_id,
        action,
        notes,
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      status: "success",
      data: {
        flagId,
        resolved: true,
        appliedChanges: action !== "reject",
        action,
      },
    });
  } catch (error: any) {
    console.error("Admin Resolve Flag Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

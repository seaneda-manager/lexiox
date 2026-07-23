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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthedServerClient();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "pending";
    const severity = searchParams.get("severity");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "50");

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

    // 2. 플래그 조회
    let flagsQuery = supabase
      .from("learning_stage_flags")
      .select(
        `
        id,
        word_id,
        flag_type,
        severity,
        original_data,
        detected_issue,
        suggested_fix,
        confidence,
        status,
        resolved_by,
        resolved_at,
        admin_notes,
        created_at,
        updated_at,
        words(id, word)
      `
      )
      .order("created_at", { ascending: false });

    if (status) {
      flagsQuery = flagsQuery.eq("status", status);
    }
    if (severity) {
      flagsQuery = flagsQuery.eq("severity", severity);
    }
    if (type) {
      flagsQuery = flagsQuery.eq("flag_type", type);
    }

    const { data: flags, error: flagsError } = await flagsQuery.limit(limit);

    if (flagsError) {
      console.error("Flags error:", flagsError);
      return NextResponse.json(
        { error: "Failed to fetch flags" },
        { status: 500 }
      );
    }

    // 3. 통계 계산
    const { data: allFlags } = await supabase
      .from("learning_stage_flags")
      .select("status, severity, flag_type");

    const stats = {
      total: allFlags?.length || 0,
      byStatus: {
        pending: allFlags?.filter((f: any) => f.status === "pending").length || 0,
        approved: allFlags?.filter((f: any) => f.status === "approved").length || 0,
        rejected: allFlags?.filter((f: any) => f.status === "rejected").length || 0,
        edited: allFlags?.filter((f: any) => f.status === "edited").length || 0,
      },
      bySeverity: {
        HIGH: allFlags?.filter((f: any) => f.severity === "HIGH").length || 0,
        MEDIUM: allFlags?.filter((f: any) => f.severity === "MEDIUM").length || 0,
        LOW: allFlags?.filter((f: any) => f.severity === "LOW").length || 0,
      },
      byType: {} as Record<string, number>,
    };

    // 유형별 카운트
    allFlags?.forEach((f: any) => {
      stats.byType[f.flag_type] = (stats.byType[f.flag_type] || 0) + 1;
    });

    // 4. 응답 포맷팅
    const formattedFlags = (flags || []).map((f: any) => ({
      id: f.id,
      wordId: f.word_id,
      word: f.words?.word || "",
      flagType: f.flag_type,
      severity: f.severity,
      originalData: f.original_data,
      detectedIssue: f.detected_issue,
      suggestedFix: f.suggested_fix,
      confidence: f.confidence,
      status: f.status,
      resolvedBy: f.resolved_by,
      resolvedAt: f.resolved_at,
      adminNotes: f.admin_notes,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
    }));

    return NextResponse.json({
      status: "success",
      data: {
        total: stats.total,
        byStatus: stats.byStatus,
        bySeverity: stats.bySeverity,
        byType: stats.byType,
        flags: formattedFlags,
      },
    });
  } catch (error: any) {
    console.error("Admin Flags Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

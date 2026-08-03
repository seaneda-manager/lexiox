import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  // Vercel 크론 시크릿 검증
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase.rpc("create_overdue_assignment_notices");

    if (error) throw new Error(error.message);

    return Response.json({
      ok: true,
      created: data?.[0]?.created_count ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("Vocab notices cron error:", e);
    return Response.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';

// apps/web/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from '../../../../lib/supabaseServer';
const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServer();

  // ?몄쬆
  const { data: { user }, error: uerr } = await supabase.auth.getUser();
  if (uerr) return NextResponse.json({ error: uerr.message }, { status: 500 });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Admin 媛??
  const { data: me, error: perr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (perr) return NextResponse.json({ error: perr.message }, { status: 500 });
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // 荑쇰━ ?뚮씪誘명꽣
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const cursor = searchParams.get("cursor"); // created_at 湲곕컲 而ㅼ꽌

  // 踰좎씠??荑쇰━: auth.users + profiles 議곗씤??酉곌? ?녿떎硫? profiles留??ъ슜(?대찓??蹂꾨룄 而щ읆 媛??
  // ?ш린??profiles(email, full_name, created_at, role) 而щ읆???덈떎怨?媛??
  // track / has_toefl 은 20261021000001 마이그레이션이 만드는 컬럼이다.
  // 아직 실행 전이면 컬럼이 없어 조회가 실패하므로, 그때는 기존 컬럼만으로 다시 조회한다.
  const run = (columns: string) => {
    let query = supabase
      .from("profiles")
      .select(columns, { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE + 1);

    if (q) {
      query = query.ilike("email", `%${q}%`)
                   .or(`full_name.ilike.%${q}%`);
    }

    if (cursor) {
      query = query.lt("created_at", cursor);
    }
    return query;
  };

  let { data, count, error } = await run("id, email, full_name, role, program, track, has_toefl, created_at");
  if (error && /track|has_toefl/i.test(error.message)) {
    ({ data, count, error } = await run("id, email, full_name, role, program, created_at"));
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 而ㅼ꽌 怨꾩궛
  let nextCursor: string | null = null;
  let items = ((data ?? []) as unknown) as Array<Record<string, any>>;
  if (items.length > PAGE_SIZE) {
    const last = items[PAGE_SIZE - 1];
    nextCursor = last.created_at;
    items = items.slice(0, PAGE_SIZE);
  }

  // prevCursor??媛꾨떒???앸왂?섍굅?? 蹂꾨룄 諛⑹떇?쇰줈 援ы쁽 媛??
  return NextResponse.json({
    items,
    nextCursor,
    prevCursor: null,
    total: count ?? undefined,
  });
}





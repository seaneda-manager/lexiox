import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

const VALID_TRIBES = ["kenine", "fenine", "lutrine"] as const;
type Tribe = (typeof VALID_TRIBES)[number];

export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tribe } = await req.json();
  if (!VALID_TRIBES.includes(tribe as Tribe)) {
    return NextResponse.json({ error: "Invalid tribe" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ tribe })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, tribe });
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { PAGE_KEYS } from "@/components/landing/defaults";

const LANDING_KEY = "landing_home_v1";

function resolveKey(req: Request): string {
  const url = new URL(req.url);
  const page = url.searchParams.get("page");
  if (page && PAGE_KEYS[page]) return PAGE_KEYS[page];
  return LANDING_KEY;
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function guardAdmin() {
  const supabase = await getServerSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) return { status: 500 as const, error: userError.message };
  if (!user) return { status: 401 as const, error: "unauthorized" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) return { status: 500 as const, error: profileError.message };
  if (!profile || profile.role !== "admin") return { status: 403 as const, error: "forbidden" };
  return { status: 200 as const, error: null };
}

export async function GET(req: Request) {
  const guard = await guardAdmin();
  if (guard.status !== 200) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  try {
    const key = resolveKey(req);
    const adminSupabase = getServiceSupabase();
    const { data, error } = await adminSupabase
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data?.value ?? {});
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load landing config." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const guard = await guardAdmin();
  if (guard.status !== 200) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  try {
    const key = resolveKey(req);
    const body = await req.json();
    const adminSupabase = getServiceSupabase();
    const { data, error } = await adminSupabase
      .from("site_settings")
      .upsert({ key, value: body }, { onConflict: "key" })
      .select("value")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // ISR 캐시 무효화
    revalidatePath("/");
    revalidatePath("/toefl");
    revalidatePath("/naesin");
    revalidatePath("/jr");
    revalidatePath("/voca");
    revalidatePath("/arcade");

    return NextResponse.json(data?.value ?? body);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to save landing config." }, { status: 500 });
  }
}

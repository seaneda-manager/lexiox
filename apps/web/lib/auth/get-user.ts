"use server";

import { getSupabaseServer } from "@/lib/supabaseServer";

export interface CurrentUser {
  id: string;
  email: string;
}

/**
 * Get current authenticated user
 * Returns null if user is not authenticated
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const supabase = await getSupabaseServer();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || "",
    };
  } catch (err) {
    console.error("Error getting current user:", err);
    return null;
  }
}

/**
 * Get current user or throw if not authenticated
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("401 unauthorized");
  }

  return user;
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function createServiceClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  if (!url || !serviceKey) {
    throw new Error('Supabase env missing');
  }

  return createServerClient(url, serviceKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name, options) {
        cookieStore.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  });
}

/**
 * DELETE audio files older than 20 days from Supabase Storage
 * Runs daily via Cron (e.g., Vercel Cron)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization (Vercel Cron is automatically authorized)
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');

    // Allow: Vercel Cron (no auth needed) or Bearer token
    const isVercelCron = request.headers.get('x-vercel-cron') === 'true';
    const hasValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isVercelCron && !hasValidSecret && cronSecret) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createServiceClient();
    const DAYS = 20;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS);

    // List all files in audio bucket with speaking-2026 prefix
    const { data: files, error: listError } = await supabase.storage
      .from('audio')
      .list('speaking-2026', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'asc' },
      });

    if (listError) {
      console.error('List error:', listError);
      return NextResponse.json(
        { ok: false, error: listError.message },
        { status: 500 }
      );
    }

    // Filter files older than 20 days
    const oldFiles = (files ?? []).filter((file) => {
      if (!file.created_at) return false;
      const fileDate = new Date(file.created_at);
      return fileDate < cutoffDate;
    });

    console.log(`Found ${oldFiles.length} files older than ${DAYS} days`);

    if (oldFiles.length === 0) {
      return NextResponse.json({
        ok: true,
        deleted: 0,
        message: 'No files to delete',
      });
    }

    // Delete old files
    const deletedFiles: string[] = [];
    for (const file of oldFiles) {
      const { error: deleteError } = await supabase.storage
        .from('audio')
        .remove([`speaking-2026/${file.name}`]);

      if (!deleteError) {
        deletedFiles.push(file.name);
        console.log(`Deleted: ${file.name}`);
      } else {
        console.error(`Failed to delete ${file.name}:`, deleteError);
      }
    }

    return NextResponse.json({
      ok: true,
      deleted: deletedFiles.length,
      files: deletedFiles,
      message: `Successfully deleted ${deletedFiles.length} old audio files`,
    });
  } catch (e: any) {
    console.error('[/api/speaking-2026/cleanup-old-audio] Error:', e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for testing (manual trigger)
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const secret = request.nextUrl.searchParams.get('secret');

  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json(
      { ok: false, error: 'Invalid secret' },
      { status: 401 }
    );
  }

  // Reuse POST logic
  return POST(request);
}

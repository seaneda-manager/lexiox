export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { generateSpeakerImage, type SpeakerTaskKind } from '@/lib/listening/generateSpeakerImage';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface TrackImageRequest {
  trackId: string;
  taskKind: string;
}

// generate-audio와 동일한 배치 형태(tracks: [...])를 받아 results 맵으로 돌려준다.
// 관리자 에디터는 트랙 하나씩 단일 항목 배열로 호출한다.
export async function POST(req: Request) {
  try {
    const { tracks } = (await req.json()) as { tracks: TrackImageRequest[] };
    if (!tracks?.length) {
      return NextResponse.json({ ok: false, error: 'tracks required' }, { status: 400 });
    }

    const results: Record<string, { illustrationUrl: string }> = {};

    await Promise.all(
      tracks.map(async ({ trackId, taskKind }) => {
        const kind: SpeakerTaskKind =
          taskKind === 'conversation' || taskKind === 'announcement' || taskKind === 'academic_talk'
            ? taskKind
            : 'choose_response';
        const illustrationUrl = await generateSpeakerImage(kind);
        results[trackId] = { illustrationUrl };
      })
    );

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    console.error('[generate-image route] error:', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

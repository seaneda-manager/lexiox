export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { getUserAndProfile } from '@/lib/getUserAndProfile';
import { synthesizeNarration, type SplitMode } from '@/lib/elevenlabs/synthesize';

// 음성 시험대: 같은 문장을 방식(한 번에 / 영어 자동 분리 / [en] 표시 기준 분리)별로 만들어 비교해 듣는다.
// 저장하지 않고 오디오만 돌려준다 (구간 정보는 X-Voice-Parts 헤더).
export async function POST(req: NextRequest) {
  const { user, profile } = await getUserAndProfile();
  if (!user || (profile?.role !== 'admin' && profile?.role !== 'teacher')) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const text = typeof b.text === 'string' ? b.text.trim() : '';
  const koVoiceId = typeof b.koVoiceId === 'string' ? b.koVoiceId.trim() : '';
  const enVoiceId = typeof b.enVoiceId === 'string' && b.enVoiceId.trim() ? b.enVoiceId.trim() : undefined;
  const modelId = typeof b.modelId === 'string' ? b.modelId.trim() : '';
  const mode = (['whole', 'auto', 'tags'] as const).includes(b.mode as SplitMode) ? (b.mode as SplitMode) : 'whole';

  if (!text || text.length > 1200) return NextResponse.json({ ok: false, error: '텍스트는 1~1200자여야 합니다.' }, { status: 400 });
  const idOk = (v?: string) => !v || /^[A-Za-z0-9]{8,40}$/.test(v);
  if (!koVoiceId || !idOk(koVoiceId) || !idOk(enVoiceId))
    return NextResponse.json({ ok: false, error: 'Voice ID 형식이 올바르지 않습니다.' }, { status: 400 });
  if (!/^[A-Za-z0-9_.\-]{3,60}$/.test(modelId))
    return NextResponse.json({ ok: false, error: '모델 ID 형식이 올바르지 않습니다.' }, { status: 400 });

  const num = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && v >= lo && v <= hi ? v : undefined);

  try {
    const { audio, parts } = await synthesizeNarration(text, {
      koVoiceId,
      enVoiceId,
      modelId,
      mode,
      stability: num(b.stability, 0, 1),
      similarityBoost: num(b.similarityBoost, 0, 1),
      style: num(b.style, 0, 1),
      speed: num(b.speed, 0.5, 2),
      useContext: b.useContext !== false,
    });
    return new Response(new Uint8Array(audio), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'X-Voice-Parts': encodeURIComponent(JSON.stringify(parts.map((p) => ({ lang: p.lang, text: p.text.slice(0, 80) })))),
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : '음성 생성에 실패했습니다.' }, { status: 502 });
  }
}

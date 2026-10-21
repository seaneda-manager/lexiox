export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getUserAndProfile } from '@/lib/getUserAndProfile';

// 이 계정의 ElevenLabs 에서 쓸 수 있는 음성(TTS) 모델 목록. 새 모델(v4 등)의 정확한 ID 를 화면에서 고르게 한다.
export async function GET() {
  const { user, profile } = await getUserAndProfile();
  if (!user || (profile?.role !== 'admin' && profile?.role !== 'teacher')) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: 'ELEVENLABS_API_KEY 가 설정돼 있지 않습니다.' }, { status: 500 });

  const res = await fetch('https://api.elevenlabs.io/v1/models', { headers: { 'xi-api-key': key }, cache: 'no-store' });
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: `ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}` }, { status: 502 });
  }
  const raw = (await res.json()) as Array<{
    model_id: string;
    name?: string;
    description?: string;
    can_do_text_to_speech?: boolean;
    languages?: Array<{ language_id: string; name: string }>;
  }>;
  const models = raw
    .filter((m) => m.can_do_text_to_speech !== false)
    .map((m) => ({
      model_id: m.model_id,
      name: m.name ?? m.model_id,
      description: m.description ?? '',
      languageCount: m.languages?.length ?? 0,
      hasKorean: !!m.languages?.some((l) => l.language_id === 'ko' || l.name === 'Korean'),
    }));
  return NextResponse.json({ ok: true, models });
}

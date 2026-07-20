import { NextResponse } from 'next/server';
import { ElevenLabsClient } from 'elevenlabs';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 120;

const elevenlabs = new ElevenLabsClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface TrackAudio {
  trackId: string;
  transcript: string;
}

type Difficulty = 'easy' | 'hard';

function getRandomVoiceId(): string {
  try {
    const voicePool = JSON.parse(process.env.VOICE_POOL || '{}') as Record<string, string[]>;
    const random = Math.random() * 100;

    let selectedCountry: string;
    if (random < 60) {
      selectedCountry = 'us';
    } else if (random < 80) {
      selectedCountry = 'au';
    } else {
      selectedCountry = 'uk';
    }

    const voices = voicePool[selectedCountry] || [];
    if (voices.length === 0) return process.env.ELEVENLABS_KEY_ID || '';

    return voices[Math.floor(Math.random() * voices.length)];
  } catch (err) {
    console.error('Error parsing VOICE_POOL:', err);
    return process.env.ELEVENLABS_KEY_ID || '';
  }
}

export async function POST(req: Request) {
  try {
    const { testId, tracks, difficulty = 'easy' } = await req.json() as {
      testId: string;
      tracks: TrackAudio[];
      difficulty?: Difficulty;
    };

    if (!testId || !tracks || tracks.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'testId and tracks required' },
        { status: 400 }
      );
    }

    const results: Record<string, string> = {};

    for (const track of tracks) {
      try {
        const voiceId = getRandomVoiceId();
        console.log(`[Audio] Generating audio for ${track.trackId} with voice ${voiceId}`);

        const audio = await elevenlabs.generate({
          voice: voiceId,
          text: track.transcript,
          model_id: 'eleven_turbo_v2_5',
        });

        let audioBuffer: Buffer;
        if (Buffer.isBuffer(audio)) {
          audioBuffer = audio;
        } else if (audio instanceof ArrayBuffer) {
          audioBuffer = Buffer.from(audio);
        } else {
          // Handle stream or async iterable
          const chunks: Buffer[] = [];
          for await (const chunk of audio) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          audioBuffer = Buffer.concat(chunks);
        }

        const fileName = `listening/${testId}/${track.trackId}.mp3`;

        const { error } = await supabase.storage
          .from('content')
          .upload(fileName, audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: true,
          });

        if (error) throw error;

        const { data } = supabase.storage
          .from('content')
          .getPublicUrl(fileName);

        results[track.trackId] = data.publicUrl;
      } catch (err) {
        console.error(`Audio generation failed for track ${track.trackId}:`, err);
        results[track.trackId] = '';
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    console.error('AUDIO GENERATION ERROR', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

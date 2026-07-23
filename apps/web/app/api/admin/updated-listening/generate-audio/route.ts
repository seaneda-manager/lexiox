import { NextResponse } from 'next/server';
import { ElevenLabsClient } from 'elevenlabs';
import { createClient } from '@supabase/supabase-js';
import {
  parseDialogueTranscript,
  assignVoicesToSpeakers,
  isDialogue,
  type DialogueSegment,
} from '@/lib/elevenlabs/dialogue-utils';

export const runtime = 'nodejs';
export const maxDuration = 120;

const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY || 'placeholder' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface TrackAudio {
  trackId: string;
  transcript: string;
  taskKind?: string;
}

type Difficulty = 'easy' | 'hard';

// 기본 음성 풀 (generate-speech.ts와 동일)
const DEFAULT_VOICE_POOL = [
  'GZ4PpFJV8ikEGUtBrjK7', // 0: Laura (US 여)
  'uIZsnBL0YK1S5j69bAih', // 1: Samantha (US 여)
  'ynUcJpglne1SRSNHFg1k', // 2: Bill (US 남)
  'Gubgw9l4dtIoQA9YZHgx', // 3: Brian (US 남)
  'Ix8C14HEHgIQkJswik2o', // 4: Peter (UK 남)
  '6fZce9LFNG3iEITDfqZZ', // 5: Charlotte (UK 여)
  'roYauZ4bOLAKvVZTPLre', // 6: Lena (Canada 여)
  'SHJeg1jtED7EW6Zr6rHc', // 7: Alex (Canada 남)
];

function getVoicePool(): string[] {
  try {
    if (process.env.SPEAKING_VOICE_POOL) {
      return JSON.parse(process.env.SPEAKING_VOICE_POOL);
    }
  } catch (err) {
    console.warn('Failed to parse SPEAKING_VOICE_POOL, using defaults:', err);
  }
  return DEFAULT_VOICE_POOL;
}

function getRandomVoiceId(): string {
  const voicePool = getVoicePool();
  return voicePool[Math.floor(Math.random() * voicePool.length)];
}

async function generateSingleVoiceAudio(
  text: string,
  voiceId: string
): Promise<Buffer> {
  const audio = await elevenlabs.generate({
    voice: voiceId,
    text: text,
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
  return audioBuffer;
}

interface DialogueAudioResult {
  segments: Array<{
    speaker: string;
    text: string;
    audioUrl: string;
    buffer: Buffer;
  }>;
}

async function generateDialogueAudio(
  transcript: string
): Promise<DialogueAudioResult> {
  const segments = parseDialogueTranscript(transcript);
  if (segments.length === 0) {
    throw new Error('No dialogue segments found');
  }

  const voicePool = getVoicePool();
  const voiceMap = assignVoicesToSpeakers(segments, voicePool);

  console.log(`[Dialogue] Generating audio for ${segments.length} segments`);
  console.log(`[Dialogue] Voice map:`, voiceMap);

  const results: DialogueAudioResult['segments'] = [];

  for (const segment of segments) {
    const voiceId = voiceMap[segment.speaker];
    console.log(
      `[Dialogue] Generating segment ${segment.order}: "${segment.speaker}" with voice ${voiceId}`
    );

    const audioBuffer = await generateSingleVoiceAudio(segment.text, voiceId);
    results.push({
      speaker: segment.speaker,
      text: segment.text,
      audioUrl: '', // 나중에 Supabase에 업로드한 후 채워짐
      buffer: audioBuffer,
    });

    // Rate limit 대비 대기
    await new Promise((r) => setTimeout(r, 500));
  }

  return { segments: results };
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

    const results: Record<
      string,
      {
        audioUrl: string;
        segments?: Array<{ speaker: string; text: string; audioUrl: string }>;
      }
    > = {};

    for (const track of tracks) {
      try {
        // Dialogue vs 단일 화자 판단
        if (track.taskKind === 'dialogue' || isDialogue(track.transcript)) {
          console.log(`[Audio] Generating dialogue audio for ${track.trackId}`);
          const dialogueResult = await generateDialogueAudio(track.transcript);

          // 각 segment별로 Supabase에 업로드
          const segmentUrls: Array<{ speaker: string; text: string; audioUrl: string }> = [];

          for (let i = 0; i < dialogueResult.segments.length; i++) {
            const seg = dialogueResult.segments[i];
            const segmentFileName = `listening/${testId}/${track.trackId}_seg_${i}.mp3`;

            const { error } = await supabase.storage
              .from('content')
              .upload(segmentFileName, seg.buffer, {
                contentType: 'audio/mpeg',
                upsert: true,
              });

            if (error) throw error;

            const { data } = supabase.storage
              .from('content')
              .getPublicUrl(segmentFileName);

            segmentUrls.push({
              speaker: seg.speaker,
              text: seg.text,
              audioUrl: data.publicUrl,
            });
            console.log(
              `[Audio] Uploaded segment ${i}: ${seg.speaker} → ${data.publicUrl}`
            );
          }

          // 첫 번째 segment를 main audioUrl로 설정 (호환성)
          results[track.trackId] = {
            audioUrl: segmentUrls[0]?.audioUrl || '',
            segments: segmentUrls,
          };
        } else {
          console.log(`[Audio] Generating single-voice audio for ${track.trackId}`);
          const voiceId = getRandomVoiceId();
          const audioBuffer = await generateSingleVoiceAudio(
            track.transcript,
            voiceId
          );

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

          results[track.trackId] = {
            audioUrl: data.publicUrl,
          };
        }
      } catch (err) {
        console.error(`Audio generation failed for track ${track.trackId}:`, err);
        results[track.trackId] = { audioUrl: '' };
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

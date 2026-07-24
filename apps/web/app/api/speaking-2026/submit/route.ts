import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSupabase } from '@/lib/supabase/server';

/**
 * POST /api/speaking-2026/submit
 *
 * 요청:
 *   - FormData with audio_1.webm ~ audio_11.webm
 *   - testId (optional, for tracking)
 *
 * 응답:
 *   - { ok: true, resultId: "uuid" }
 */
export async function POST(req: NextRequest) {
  try {
    // 현재 사용자 확인
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // FormData 파싱
    const formData = await req.formData();
    const audioFiles: { itemNumber: number; blob: Blob }[] = [];

    for (let i = 1; i <= 11; i++) {
      const file = formData.get(`audio_${i}`) as Blob;
      if (file) {
        audioFiles.push({ itemNumber: i, blob: file });
      }
    }

    if (audioFiles.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No audio files provided' },
        { status: 400 }
      );
    }

    // Supabase Storage에 업로드
    const uploadedUrls: { itemNumber: number; url: string }[] = [];
    const testId = (formData.get('testId') as string) || 'test_' + Date.now();
    const storagePath = `speaking-audios/${user.id}/${testId}`;

    for (const { itemNumber, blob } of audioFiles) {
      const fileName = `item_${itemNumber}.webm`;
      const filePath = `${storagePath}/${fileName}`;

      // Blob → Buffer 변환
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Supabase Storage에 업로드
      const { data, error } = await supabase.storage
        .from('speaking-audios')
        .upload(filePath, buffer, {
          contentType: 'audio/webm',
          upsert: true,
        });

      if (error) {
        console.error(`Failed to upload item ${itemNumber}:`, error);
        throw error;
      }

      // 공개 URL 생성
      const { data: publicData } = supabase.storage
        .from('speaking-audios')
        .getPublicUrl(filePath);

      uploadedUrls.push({
        itemNumber,
        url: publicData.publicUrl,
      });
    }

    // 데이터베이스에 결과 레코드 생성
    const { data: result, error: dbError } = await supabase
      .from('speaking_test_responses')
      .insert({
        student_id: user.id,
        test_id: testId,
        audio_urls: Object.fromEntries(
          uploadedUrls.map((u) => [`item_${u.itemNumber}`, u.url])
        ),
        submitted_at: new Date().toISOString(),
        status: 'submitted',
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('Failed to save result to database:', dbError);
      throw dbError;
    }

    return NextResponse.json({
      ok: true,
      resultId: result.id,
      audioCount: uploadedUrls.length,
    });
  } catch (err: any) {
    console.error('Error in speaking-2026/submit:', err);
    return NextResponse.json(
      {
        ok: false,
        error: err.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

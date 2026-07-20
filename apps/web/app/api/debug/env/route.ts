import { NextResponse } from 'next/server';

// 🔒 프로덕션에서 비활성화
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'disabled' }, { status: 404 });
  }
  // 개발환경에서도 키 값은 노출하지 않음
  return NextResponse.json({
    hasUrl:        !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

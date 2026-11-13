export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handleDeleteTests } from '@/lib/admin/deleteTestsHandler';

// 관리자 확인 + 배정된 시험 삭제 차단은 공통 핸들러가 처리한다. (ids 배열도 그대로 받는다)
export async function POST(req: Request) {
  return handleDeleteTests(req, { section: 'speaking', table: 'speaking_tests' });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handleDeleteTests } from '@/lib/admin/deleteTestsHandler';

export async function POST(req: Request) {
  return handleDeleteTests(req, { section: 'reading', table: 'reading_tests_2026', mirrorTable: 'reading_tests' });
}

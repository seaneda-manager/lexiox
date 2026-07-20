import { getUserAndProfile } from '@/lib/getUserAndProfile';
import { redirect } from 'next/navigation';
import ReadingEditorClientV2 from '../_components/ReadingEditorClientV2';

export default async function ReadingEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== 'admin') redirect('/login');

  const { id } = await params;

  return <ReadingEditorClientV2 id={id} />;
}

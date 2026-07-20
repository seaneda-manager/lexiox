import { getUserAndProfile } from '@/lib/getUserAndProfile';
import { redirect } from 'next/navigation';
import ReadingEditorClientV2 from '../_components/ReadingEditorClientV2';

export default async function ReadingNewPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== 'admin') redirect('/login');

  return <ReadingEditorClientV2 />;
}

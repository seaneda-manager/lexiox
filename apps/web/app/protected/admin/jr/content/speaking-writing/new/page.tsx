import { getUserAndProfile } from '@/lib/getUserAndProfile';
import { redirect } from 'next/navigation';
import SpeakingWritingEditorClientV2 from '../_components/SpeakingWritingEditorClientV2';

export default async function SpeakingWritingNewPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== 'admin') redirect('/login');

  return <SpeakingWritingEditorClientV2 />;
}

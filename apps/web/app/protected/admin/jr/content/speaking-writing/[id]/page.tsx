import { getUserAndProfile } from '@/lib/getUserAndProfile';
import { redirect } from 'next/navigation';
import SpeakingWritingEditorClientV2 from '../../_components/SpeakingWritingEditorClientV2';

export default async function SpeakingWritingEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== 'admin') redirect('/login');

  const { id } = await params;

  return <SpeakingWritingEditorClientV2 id={id} />;
}

import { getUserAndProfile } from '@/lib/getUserAndProfile';
import { redirect } from 'next/navigation';
import GrammarEditorClientV2 from '../_components/GrammarEditorClientV2';

export default async function GrammarEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== 'admin') redirect('/login');

  const { id } = await params;

  return <GrammarEditorClientV2 id={id} />;
}

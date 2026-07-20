import { getUserAndProfile } from '@/lib/getUserAndProfile';
import { redirect } from 'next/navigation';
import GrammarEditorClientV2 from '../_components/GrammarEditorClientV2';

export default async function GrammarNewPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== 'admin') redirect('/login');

  return <GrammarEditorClientV2 />;
}

import { getUserAndProfile } from '@/lib/getUserAndProfile';
import { redirect } from 'next/navigation';
import ListeningEditorClientV2 from '../_components/ListeningEditorClientV2';

export default async function ListeningNewPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== 'admin') redirect('/login');

  return <ListeningEditorClientV2 />;
}

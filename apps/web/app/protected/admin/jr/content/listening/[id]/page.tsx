import { getUserAndProfile } from '@/lib/getUserAndProfile';
import { redirect } from 'next/navigation';
import ListeningEditorClientV2 from '../_components/ListeningEditorClientV2';

export default async function ListeningEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== 'admin') redirect('/login');

  const { id } = await params;

  return <ListeningEditorClientV2 id={id} />;
}

import { getUserAndProfile } from '@/lib/getUserAndProfile';
import { redirect } from 'next/navigation';
import ContentGeneratorClient from './_components/ContentGeneratorClient';

export default async function GenerateContentPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== 'admin') redirect('/login');

  return <ContentGeneratorClient />;
}

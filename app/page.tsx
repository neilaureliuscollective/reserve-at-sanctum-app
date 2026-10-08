import { redirect } from 'next/navigation';
import { publicUser } from '@/lib/auth';
import { entryDestination } from '@/lib/experience/entry';
import { Threshold } from '@/components/experience/threshold';
export const dynamic = 'force-dynamic';
export default async function Arrival({ searchParams }: { searchParams: Promise<{ replay?: string }> }) {
  const actor = await publicUser();
  const replay = (await searchParams).replay === '1';
  if (!replay && actor) redirect(entryDestination(actor));
  if (!replay) redirect('/discover');
  return <Threshold />;
}

import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { entryDestination } from '@/lib/experience/entry';
export const dynamic = 'force-dynamic';
export default async function Enter() { redirect(entryDestination(await currentUser())); }

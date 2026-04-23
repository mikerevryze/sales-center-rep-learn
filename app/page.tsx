import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function RootRedirect() {
  const session = await auth();
  if (!session?.user) redirect('/signin');
  redirect('/dashboard');
}

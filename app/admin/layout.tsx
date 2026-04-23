import { requireManagerOrAdmin } from '@/lib/auth-helpers';
import { AppShell } from '@/components/layout/app-shell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireManagerOrAdmin();
  return <AppShell user={user}>{children}</AppShell>;
}

import { requireManagerOrAdmin } from '@/lib/auth-helpers';

export default async function AdminPage() {
  await requireManagerOrAdmin();
  return <div className="text-muted-foreground">Admin — coming in admin commit.</div>;
}

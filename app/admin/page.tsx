import Link from 'next/link';
import { ArrowRight, BarChart3, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { requireManagerOrAdmin } from '@/lib/auth-helpers';
import { getAllAdminUsers } from '@/lib/admin';
import { formatDate, relativeTime } from '@/lib/utils';

export const metadata = { title: 'Admin' };

export default async function AdminIndex({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireManagerOrAdmin();
  const { q } = await searchParams;
  const users = await getAllAdminUsers({ search: q });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
          <p className="text-muted-foreground">
            {users.length} user{users.length === 1 ? '' : 's'} · Manage roles, review progress,
            audit roleplays.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/admin/analytics">
              <BarChart3 className="h-4 w-4" /> Analytics
            </Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" /> All users
            </CardTitle>
            <CardDescription>Search by name or email.</CardDescription>
          </div>
          <form className="flex items-center gap-2">
            <Input
              type="search"
              placeholder="Search users…"
              name="q"
              defaultValue={q}
              className="w-64"
              aria-label="Search users"
            />
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">User</th>
                <th className="py-2">Role</th>
                <th className="py-2">Module progress</th>
                <th className="py-2">Current module</th>
                <th className="py-2">Roleplay win rate</th>
                <th className="py-2">Last active</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        {u.image && <AvatarImage src={u.image} alt={u.name ?? u.email} />}
                        <AvatarFallback>
                          {(u.name ?? u.email).slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{u.name ?? '—'}</div>
                        <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <Badge
                      variant={
                        u.role === 'ADMIN'
                          ? 'default'
                          : u.role === 'MANAGER'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {u.role}
                    </Badge>
                  </td>
                  <td className="py-3 text-sm">
                    {u.modulesCompleted} / {u.totalModules}
                  </td>
                  <td className="py-3 text-xs text-muted-foreground">
                    {u.currentModuleTitle ?? '—'}
                  </td>
                  <td className="py-3 text-sm">
                    {u.roleplayTotal === 0
                      ? '—'
                      : `${u.roleplayWinRate}% (${u.roleplayWins}/${u.roleplayTotal})`}
                  </td>
                  <td
                    className="py-3 text-xs text-muted-foreground"
                    title={formatDate(u.lastActiveAt)}
                  >
                    {relativeTime(u.lastActiveAt)}
                  </td>
                  <td className="py-3 text-right">
                    <Button asChild variant="ghost" size="sm" className="gap-1">
                      <Link href={`/admin/users/${u.id}`}>
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No users match that search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

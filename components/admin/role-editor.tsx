'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { Role } from '@prisma/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { updateUserRoleAction } from '@/app/admin/actions';

const ROLES: Role[] = ['REP', 'MANAGER', 'ADMIN'];

export function RoleEditor({
  userId,
  currentRole,
  isSelf,
}: {
  userId: string;
  currentRole: Role;
  isSelf: boolean;
}) {
  const [role, setRole] = useState<Role>(currentRole);
  const [isPending, startTransition] = useTransition();

  const update = (next: Role) => {
    if (next === role) return;
    startTransition(async () => {
      const res = await updateUserRoleAction({ userId, role: next });
      if (!res.ok) {
        toast.error(res.error ?? 'Role update failed');
        return;
      }
      setRole(res.role);
      toast.success(`Role set to ${res.role}`);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isPending}>
          {isPending ? 'Updating…' : `Role: ${role}`}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {ROLES.map((r) => (
          <DropdownMenuItem
            key={r}
            onSelect={() => update(r)}
            disabled={r === role || (isSelf && r !== 'ADMIN')}
          >
            {r}
            {isSelf && r !== 'ADMIN' && (
              <span className="ml-2 text-xs text-muted-foreground">(locked — self)</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

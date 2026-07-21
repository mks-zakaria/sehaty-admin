'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card } from '@sehaty/ui';
import { ConsoleShell } from '@/components/ConsoleShell';
import {
  EmptyState,
  ErrorState,
  PageHeader,
  StatusPill,
  TableSkeleton,
  type PillTone,
} from '@/components/ui';
import { IconUsers } from '@/components/icons';
import {
  ApiError,
  getToken,
  listAdminUsers,
  type AdminUser,
  type UserRole,
} from '@/lib/api';

interface FilterForm {
  role: 'ALL' | UserRole;
  active: 'ALL' | 'ACTIVE' | 'INACTIVE';
}

const ROLE_TONES: Record<string, PillTone> = {
  DOCTOR: 'brand',
  PATIENT: 'neutral',
  ADMIN: 'warning',
};

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { register, watch } = useForm<FilterForm>({
    defaultValues: { role: 'ALL', active: 'ALL' },
  });
  const roleFilter = watch('role');
  const activeFilter = watch('active');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminUsers({
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        is_active:
          activeFilter === 'ALL' ? undefined : activeFilter === 'ACTIVE',
      });
      setUsers(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push('/login');
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, activeFilter, router]);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    void load();
  }, [load, router]);

  return (
    <ConsoleShell>
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="Users"
          description="Every platform account — doctors, patients, and admins."
          actions={
            !loading && !error ? (
              <StatusPill tone="neutral" dot={false}>
                {users.length} shown
              </StatusPill>
            ) : undefined
          }
        />

        <form className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="filter-role"
              className="text-sm font-medium text-content"
            >
              Role
            </label>
            <select
              id="filter-role"
              {...register('role')}
              className="field sm:w-44"
            >
              <option value="ALL">All</option>
              <option value="DOCTOR">Doctor</option>
              <option value="PATIENT">Patient</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="filter-active"
              className="text-sm font-medium text-content"
            >
              Status
            </label>
            <select
              id="filter-active"
              {...register('active')}
              className="field sm:w-44"
            >
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </form>

        {loading ? (
          <TableSkeleton rows={8} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={<IconUsers className="h-6 w-6" />}
            title="No users found"
            hint="No accounts match the current filters. Try widening the role or status filter."
          />
        ) : (
          <Card className="animate-fade-up overflow-hidden p-0">
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-surface-card shadow-[inset_0_-1px_0_rgb(var(--border))]">
                  <tr className="text-xs uppercase tracking-wider text-content-muted">
                    <th scope="col" className="px-4 py-3 font-semibold">
                      User
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Phone
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Role
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-line transition-colors duration-150 last:border-0 hover:bg-brand/5"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-content">
                          {user.full_name ?? user.email}
                        </span>
                        {user.full_name && (
                          <span className="block text-xs text-content-muted">
                            {user.email}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-content-muted">
                        {user.phone ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill
                          tone={ROLE_TONES[user.role] ?? 'neutral'}
                          dot={false}
                        >
                          {user.role}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill tone={user.is_active ? 'success' : 'danger'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3 text-content-muted">
                        {dateFmt(user.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </ConsoleShell>
  );
}

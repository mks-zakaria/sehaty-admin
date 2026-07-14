'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, Spinner } from '@sehaty/ui';
import { ConsoleShell } from '@/components/ConsoleShell';
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

const ROLE_STYLES: Record<string, string> = {
  DOCTOR:
    'border-brand/30 bg-brand-soft text-brand',
  PATIENT:
    'border-line bg-surface text-content-muted',
  ADMIN:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
};

function RoleBadge({ role }: { role: string }) {
  const styles = ROLE_STYLES[role] ?? 'border-line bg-surface text-content-muted';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${styles}`}
    >
      {role}
    </span>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  const styles = active
    ? 'border-brand/30 bg-brand-soft text-brand'
    : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${styles}`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

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

  const selectClass =
    'rounded-lg border border-line bg-surface px-3 py-2 text-sm font-normal text-content outline-none focus:border-brand focus:ring-2 focus:ring-brand/40';

  return (
    <ConsoleShell>
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-content">Users</h1>
          <p className="mt-1 text-sm text-content-muted">
            Every platform account — doctors, patients, and admins.
          </p>
        </header>

        <form className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1 text-sm font-medium text-content">
            Role
            <select {...register('role')} className={selectClass}>
              <option value="ALL">All</option>
              <option value="DOCTOR">Doctor</option>
              <option value="PATIENT">Patient</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-content">
            Status
            <select {...register('active')} className={selectClass}>
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
        </form>

        {loading ? (
          <div className="flex items-center gap-3 py-16 text-content-muted">
            <Spinner />
            <span>Loading users…</span>
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40">
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => void load()}
            >
              Retry
            </Button>
          </Card>
        ) : users.length === 0 ? (
          <Card className="text-center">
            <p className="text-sm text-content-muted">
              No users match the current filters.
            </p>
          </Card>
        ) : (
          <Card className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-content-muted">
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-line last:border-0"
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
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-4 py-3">
                        <ActiveBadge active={user.is_active} />
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

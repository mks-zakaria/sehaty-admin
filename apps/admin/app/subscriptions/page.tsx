'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, Spinner } from '@sehaty/ui';
import { ConsoleShell } from '@/components/ConsoleShell';
import {
  ApiError,
  getToken,
  listAdminSubscriptions,
  type AdminSubscription,
  type SubscriptionStatus,
} from '@/lib/api';

interface FilterForm {
  status: 'ALL' | SubscriptionStatus;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'border-brand/30 bg-brand-soft text-brand',
  TRIALING:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
  PAST_DUE:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300',
  CANCELLED: 'border-line bg-surface text-content-muted',
};

function StatusBadge({ status }: { status: string }) {
  const styles =
    STATUS_STYLES[status] ?? 'border-line bg-surface text-content-muted';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${styles}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const priceFmt = (value: number, currency: string) =>
  `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;

export default function SubscriptionsPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { register, watch } = useForm<FilterForm>({
    defaultValues: { status: 'ALL' },
  });
  const statusFilter = watch('status');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminSubscriptions({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setSubscriptions(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push('/login');
        return;
      }
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to load subscriptions.',
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter, router]);

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
          <h1 className="text-2xl font-semibold text-content">Subscriptions</h1>
          <p className="mt-1 text-sm text-content-muted">
            Doctor subscription plans and their billing status.
          </p>
        </header>

        <form className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1 text-sm font-medium text-content">
            Status
            <select {...register('status')} className={selectClass}>
              <option value="ALL">All</option>
              <option value="TRIALING">Trialing</option>
              <option value="ACTIVE">Active</option>
              <option value="PAST_DUE">Past due</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>
        </form>

        {loading ? (
          <div className="flex items-center gap-3 py-16 text-content-muted">
            <Spinner />
            <span>Loading subscriptions…</span>
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
        ) : subscriptions.length === 0 ? (
          <Card className="text-center">
            <p className="text-sm text-content-muted">
              No subscriptions match the current filters.
            </p>
          </Card>
        ) : (
          <Card className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-content-muted">
                    <th className="px-4 py-3 font-medium">Doctor</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Renews</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr
                      key={sub.id}
                      className="border-b border-line last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-content">
                        {sub.doctor_name ?? `Doctor #${sub.doctor_id}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-content">
                          {sub.plan_name}
                        </span>
                        <span className="block text-xs text-content-muted">
                          {priceFmt(sub.price_month, sub.currency)}
                          <span className="text-content-muted"> /mo</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={sub.status} />
                      </td>
                      <td className="px-4 py-3 text-content-muted">
                        {dateFmt(sub.current_period_end)}
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

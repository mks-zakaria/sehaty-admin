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
import { IconRepeat } from '@/components/icons';
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

const STATUS_TONES: Record<string, PillTone> = {
  ACTIVE: 'success',
  TRIALING: 'brand',
  PAST_DUE: 'warning',
  CANCELLED: 'neutral',
};

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

  return (
    <ConsoleShell>
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="Subscriptions"
          description="Doctor subscription plans and their billing status."
          actions={
            !loading && !error ? (
              <StatusPill tone="neutral" dot={false}>
                {subscriptions.length} shown
              </StatusPill>
            ) : undefined
          }
        />

        <form className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="filter-status"
              className="text-sm font-medium text-content"
            >
              Status
            </label>
            <select
              id="filter-status"
              {...register('status')}
              className="field sm:w-44"
            >
              <option value="ALL">All</option>
              <option value="TRIALING">Trialing</option>
              <option value="ACTIVE">Active</option>
              <option value="PAST_DUE">Past due</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </form>

        {loading ? (
          <TableSkeleton rows={7} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : subscriptions.length === 0 ? (
          <EmptyState
            icon={<IconRepeat className="h-6 w-6" />}
            title="No subscriptions found"
            hint="No subscriptions match the current filters. Try another status."
          />
        ) : (
          <Card className="animate-fade-up overflow-hidden p-0">
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-surface-card shadow-[inset_0_-1px_0_rgb(var(--border))]">
                  <tr className="text-xs uppercase tracking-wider text-content-muted">
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Doctor
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Plan
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Renews
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr
                      key={sub.id}
                      className="border-b border-line transition-colors duration-150 last:border-0 hover:bg-brand/5"
                    >
                      <td className="px-4 py-3 font-medium text-content">
                        {sub.doctor_name ?? `Doctor #${sub.doctor_id}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-content">
                          {sub.plan_name}
                        </span>
                        <span className="block text-xs text-content-muted tabular-nums">
                          {priceFmt(sub.price_month, sub.currency)} /mo
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill tone={STATUS_TONES[sub.status] ?? 'neutral'}>
                          {sub.status.replace('_', ' ')}
                        </StatusPill>
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

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ConsoleShell } from '@/components/ConsoleShell';
import {
  EmptyState,
  ErrorState,
  PageHeader,
  StatusPill,
  TableSkeleton,
  type PillTone,
} from '@/components/ui';
import {
  ApiError,
  getPaymentBoard,
  getToken,
  type PaymentBoard,
  type PaymentBoardRow,
} from '@/lib/api';

/**
 * The collection board: who has paid, who has not, and whose agenda is about
 * to switch off.
 *
 * Ordered by urgency rather than alphabetically — that ordering is the whole
 * feature. The list answers one question, "which cabinets do I call this
 * week", so a suspended doctor sits above one expiring in ten days regardless
 * of name or amount.
 *
 * Losing a subscription never takes a doctor's page down; only online booking
 * stops. The "Booking" column makes that visible so nobody assumes a lapsed
 * cabinet has disappeared from the site.
 */

const ACTION_LABEL: Record<PaymentBoardRow['action'], string> = {
  suspended: 'Suspended',
  grace: 'In grace',
  expiring_soon: 'Expiring soon',
  never_subscribed: 'No subscription',
  ok: 'Active',
};

const ACTION_TONE: Record<PaymentBoardRow['action'], PillTone> = {
  suspended: 'danger',
  grace: 'warning',
  expiring_soon: 'warning',
  never_subscribed: 'neutral',
  ok: 'success',
};

const dateFmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

const moneyFmt = (value: number) =>
  `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MAD`;

/** "in 12 days" / "8 days ago" — the number the operator actually acts on. */
function remaining(days: number | null): string {
  if (days === null) return '—';
  if (days === 0) return 'today';
  return days > 0 ? `in ${days} d` : `${Math.abs(days)} d ago`;
}

export default function PaymentsPage() {
  const router = useRouter();
  const [board, setBoard] = useState<PaymentBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBoard(await getPaymentBoard());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push('/login');
        return;
      }
      setError(
        err instanceof ApiError ? err.message : 'Failed to load the payments board.',
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    void load();
  }, [load, router]);

  return (
    <ConsoleShell>
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Payments"
          description="Who has paid, who has not, and whose booking is about to switch off. A lapsed subscription disables online booking only — the public page stays live."
          actions={
            board && !loading && !error ? (
              <StatusPill tone="neutral" dot={false}>
                {moneyFmt(board.total_due)} outstanding
              </StatusPill>
            ) : undefined
          }
        />

        {board && !loading && !error && (
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Suspended', value: board.suspended, tone: 'danger' as PillTone },
              { label: 'In grace', value: board.in_grace, tone: 'warning' as PillTone },
              {
                label: 'Expiring soon',
                value: board.expiring_soon,
                tone: 'warning' as PillTone,
              },
            ].map(({ label, value, tone }) => (
              <div
                key={label}
                className="rounded-xl border border-line bg-surface p-4"
              >
                <p className="text-sm text-muted">{label}</p>
                <p className="mt-1 flex items-center gap-2">
                  <span className="text-2xl font-semibold text-content">{value}</span>
                  {value > 0 && (
                    <StatusPill tone={tone} dot={false}>
                      action needed
                    </StatusPill>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}

        {loading && <TableSkeleton />}
        {error && <ErrorState message={error} onRetry={() => void load()} />}
        {!loading && !error && board?.rows.length === 0 && (
          <EmptyState title="No doctors yet." hint="Accredit a doctor to start tracking their subscription." />
        )}

        {!loading && !error && board && board.rows.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="bg-surface text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Doctor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Period ends</th>
                  <th className="px-4 py-3 font-medium">Booking</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 font-medium">Last payment</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-token">
                {board.rows.map((row) => (
                  <tr key={row.doctor_id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-content">{row.full_name}</p>
                      <p className="text-xs text-muted">
                        {[row.city, row.plan].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={ACTION_TONE[row.action]}>
                        {ACTION_LABEL[row.action]}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-content">{dateFmt(row.current_period_end)}</p>
                      <p className="text-xs text-muted">{remaining(row.days_remaining)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill
                        tone={row.booking_enabled ? 'success' : 'neutral'}
                        dot={false}
                      >
                        {row.booking_enabled ? 'On' : 'Off'}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3">
                      {row.amount_due > 0 ? (
                        <>
                          <p className="font-medium text-content">
                            {moneyFmt(row.amount_due)}
                          </p>
                          <p className="text-xs text-muted">
                            {row.open_invoices} open invoice
                            {row.open_invoices === 1 ? '' : 's'}
                          </p>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {dateFmt(row.last_payment_at)}
                    </td>
                    <td className="px-4 py-3">
                      {row.phone ? (
                        // A phone number on a collection list exists to be
                        // dialled, not read.
                        <a
                          href={`tel:${row.phone}`}
                          className="text-brand-600 hover:underline dark:text-brand-300"
                        >
                          {row.phone}
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ConsoleShell>
  );
}

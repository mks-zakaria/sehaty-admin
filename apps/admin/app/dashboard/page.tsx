'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Spinner } from '@sehaty/ui';
import { ConsoleShell } from '@/components/ConsoleShell';
import {
  ApiError,
  getKpis,
  getRevenue,
  getToken,
  type Kpis,
  type RevenueSummary,
} from '@/lib/api';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-sm text-content-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-content">
        {value.toLocaleString()}
      </p>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const year = new Date().getFullYear();
      const [kpiData, revenueData] = await Promise.all([
        getKpis(),
        getRevenue(year),
      ]);
      setKpis(kpiData);
      setRevenue(revenueData);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push('/login');
        return;
      }
      setError(
        err instanceof ApiError ? err.message : 'Failed to load dashboard.',
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

  const currencyFmt = (value: number, currency: string) =>
    `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

  const maxCollected = revenue
    ? Math.max(1, ...revenue.by_month.map((m) => m.collected))
    : 1;

  return (
    <ConsoleShell>
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-content">Dashboard</h1>
          <p className="mt-1 text-sm text-content-muted">
            Live operational KPIs and this year&rsquo;s cash revenue.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center gap-3 py-16 text-content-muted">
            <Spinner />
            <span>Loading dashboard…</span>
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
        ) : kpis && revenue ? (
          <div className="flex flex-col gap-8">
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-content-muted">
                Marketplace
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <KpiCard label="Doctors (total)" value={kpis.doctors_total} />
                <KpiCard
                  label="Doctors (verified)"
                  value={kpis.doctors_verified}
                />
                <KpiCard label="Patients" value={kpis.patients_total} />
                <KpiCard
                  label="Active subscriptions"
                  value={kpis.active_subscriptions}
                />
                <KpiCard
                  label="Reviews published"
                  value={kpis.reviews_published}
                />
                <KpiCard
                  label="Referrals rewarded"
                  value={kpis.referrals_rewarded}
                />
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-content-muted">
                Appointments by status
              </h2>
              <Card>
                {Object.keys(kpis.appointments_by_status).length === 0 ? (
                  <p className="text-sm text-content-muted">
                    No appointments recorded yet.
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
                    {Object.entries(kpis.appointments_by_status).map(
                      ([status, count]) => (
                        <li key={status} className="flex flex-col">
                          <span className="text-xs uppercase tracking-wide text-content-muted">
                            {status}
                          </span>
                          <span className="mt-1 text-2xl font-semibold text-content">
                            {count.toLocaleString()}
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                )}
              </Card>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-content-muted">
                Revenue · {revenue.year}
              </h2>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card>
                  <p className="text-sm text-content-muted">Total collected</p>
                  <p className="mt-2 text-3xl font-semibold text-content">
                    {currencyFmt(revenue.total_collected, revenue.currency)}
                  </p>
                </Card>
                <Card>
                  <p className="text-sm text-content-muted">
                    MRR (monthly recurring)
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-content">
                    {currencyFmt(revenue.mrr, revenue.currency)}
                  </p>
                </Card>
                <Card>
                  <p className="text-sm text-content-muted">
                    Active subscriptions
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-content">
                    {revenue.active_subscriptions.toLocaleString()}
                  </p>
                </Card>
              </div>

              <Card className="mt-4">
                <p className="mb-4 text-sm font-medium text-content">
                  Collected by month
                </p>
                <ul className="flex flex-col gap-2">
                  {revenue.by_month.map((m) => (
                    <li key={m.month} className="flex items-center gap-3">
                      <span className="w-10 shrink-0 text-xs text-content-muted">
                        {MONTH_LABELS[m.month - 1] ?? m.month}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-soft">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{
                            width: `${Math.round((m.collected / maxCollected) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="w-32 shrink-0 text-right text-sm text-content">
                        {currencyFmt(m.collected, revenue.currency)}
                      </span>
                      <span className="w-16 shrink-0 text-right text-xs text-content-muted">
                        {m.payments} pmt{m.payments === 1 ? '' : 's'}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          </div>
        ) : null}
      </div>
    </ConsoleShell>
  );
}

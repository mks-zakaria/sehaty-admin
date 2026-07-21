'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Card } from '@sehaty/ui';
import { ConsoleShell } from '@/components/ConsoleShell';
import {
  ErrorState,
  PageHeader,
  Skeleton,
  StatGridSkeleton,
} from '@/components/ui';
import {
  IconBadgeCheck,
  IconGift,
  IconHeartPulse,
  IconRepeat,
  IconStar,
  IconStethoscope,
  IconTrendingUp,
  IconUsers,
  IconWallet,
} from '@/components/icons';
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

function StatCard({
  label,
  value,
  context,
  icon,
  delay = 0,
}: {
  label: string;
  value: string;
  context?: string;
  icon: ReactNode;
  delay?: number;
}) {
  return (
    <Card
      className="animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-content-muted">{label}</p>
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"
        >
          {icon}
        </span>
      </div>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-content tabular-nums">
        {value}
      </p>
      {context && (
        <p className="mt-1.5 text-xs text-content-muted">{context}</p>
      )}
    </Card>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-content-muted">
      {children}
    </h2>
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

  const verifiedShare =
    kpis && kpis.doctors_total > 0
      ? Math.round((kpis.doctors_verified / kpis.doctors_total) * 100)
      : null;

  return (
    <ConsoleShell>
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="Dashboard"
          description="Live operational KPIs and this year's cash revenue."
        />

        {loading ? (
          <div className="flex flex-col gap-8">
            <StatGridSkeleton stats={6} />
            <div className="rounded-xl border border-line bg-surface-card p-5 shadow-card">
              <Skeleton className="h-3.5 w-40" />
              <div className="mt-4 flex flex-col gap-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/6" />
              </div>
            </div>
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : kpis && revenue ? (
          <div className="flex flex-col gap-10">
            <section>
              <SectionTitle>Marketplace</SectionTitle>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                  label="Doctors"
                  value={kpis.doctors_total.toLocaleString()}
                  context="All registered professionals"
                  icon={<IconStethoscope className="h-[18px] w-[18px]" />}
                />
                <StatCard
                  label="Verified doctors"
                  value={kpis.doctors_verified.toLocaleString()}
                  context={
                    verifiedShare !== null
                      ? `${verifiedShare}% of all doctors accredited`
                      : 'Awaiting first accreditations'
                  }
                  icon={<IconBadgeCheck className="h-[18px] w-[18px]" />}
                  delay={40}
                />
                <StatCard
                  label="Patients"
                  value={kpis.patients_total.toLocaleString()}
                  context="Registered patient accounts"
                  icon={<IconUsers className="h-[18px] w-[18px]" />}
                  delay={80}
                />
                <StatCard
                  label="Active subscriptions"
                  value={kpis.active_subscriptions.toLocaleString()}
                  context="Doctors on a paid plan"
                  icon={<IconRepeat className="h-[18px] w-[18px]" />}
                  delay={120}
                />
                <StatCard
                  label="Reviews published"
                  value={kpis.reviews_published.toLocaleString()}
                  context="Live after moderation"
                  icon={<IconStar className="h-[18px] w-[18px]" />}
                  delay={160}
                />
                <StatCard
                  label="Referrals rewarded"
                  value={kpis.referrals_rewarded.toLocaleString()}
                  context="Successful referral payouts"
                  icon={<IconGift className="h-[18px] w-[18px]" />}
                  delay={200}
                />
              </div>
            </section>

            <section>
              <SectionTitle>Appointments by status</SectionTitle>
              <Card className="animate-fade-up">
                {Object.keys(kpis.appointments_by_status).length === 0 ? (
                  <div className="flex items-center gap-3 py-2 text-sm text-content-muted">
                    <IconHeartPulse className="h-5 w-5 text-brand" />
                    No appointments recorded yet.
                  </div>
                ) : (
                  <ul className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
                    {Object.entries(kpis.appointments_by_status).map(
                      ([status, count]) => (
                        <li key={status} className="flex flex-col">
                          <span className="text-xs font-medium uppercase tracking-wider text-content-muted">
                            {status.replace(/_/g, ' ')}
                          </span>
                          <span className="mt-1 text-2xl font-semibold tracking-tight text-content tabular-nums">
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
              <SectionTitle>Revenue · {revenue.year}</SectionTitle>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <StatCard
                  label="Total collected"
                  value={currencyFmt(revenue.total_collected, revenue.currency)}
                  context={`Cash collected in ${revenue.year}`}
                  icon={<IconWallet className="h-[18px] w-[18px]" />}
                />
                <StatCard
                  label="MRR"
                  value={currencyFmt(revenue.mrr, revenue.currency)}
                  context="Monthly recurring revenue"
                  icon={<IconTrendingUp className="h-[18px] w-[18px]" />}
                  delay={40}
                />
                <StatCard
                  label="Active subscriptions"
                  value={revenue.active_subscriptions.toLocaleString()}
                  context="Currently billing"
                  icon={<IconRepeat className="h-[18px] w-[18px]" />}
                  delay={80}
                />
              </div>

              <Card className="mt-4 animate-fade-up">
                <p className="mb-4 text-sm font-semibold text-content">
                  Collected by month
                </p>
                <ul className="flex flex-col gap-2.5">
                  {revenue.by_month.map((m) => (
                    <li key={m.month} className="flex items-center gap-3">
                      <span className="w-10 shrink-0 text-xs font-medium text-content-muted">
                        {MONTH_LABELS[m.month - 1] ?? m.month}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-soft">
                        <div
                          className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
                          style={{
                            width: `${Math.round((m.collected / maxCollected) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="w-32 shrink-0 text-right text-sm text-content tabular-nums">
                        {currencyFmt(m.collected, revenue.currency)}
                      </span>
                      <span className="hidden w-16 shrink-0 text-right text-xs text-content-muted sm:block">
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

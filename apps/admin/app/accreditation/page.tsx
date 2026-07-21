'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Spinner } from '@sehaty/ui';
import { ConsoleShell } from '@/components/ConsoleShell';
import {
  CardListSkeleton,
  EmptyState,
  ErrorState,
  PageHeader,
  StatusPill,
} from '@/components/ui';
import { IconBadgeCheck } from '@/components/icons';
import {
  ApiError,
  accreditProfessional,
  getToken,
  listPendingProfessionals,
  type PendingProfessional,
} from '@/lib/api';

/** Initials for the avatar disc, e.g. "Dr Sara Alami" → "SA". */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function AccreditationPage() {
  const router = useRouter();
  const [items, setItems] = useState<PendingProfessional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPendingProfessionals();
      setItems(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push('/login');
        return;
      }
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to load pending professionals.',
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

  async function handleAccredit(userId: number) {
    setPendingId(userId);
    setError(null);
    try {
      await accreditProfessional(userId);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to accredit doctor.',
      );
    } finally {
      setPendingId(null);
    }
  }

  return (
    <ConsoleShell>
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Accreditation"
          description="Review and approve doctors awaiting accreditation."
          actions={
            !loading && !error && items.length > 0 ? (
              <StatusPill tone="warning">
                {items.length} pending
              </StatusPill>
            ) : undefined
          }
        />

        {loading ? (
          <CardListSkeleton cards={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<IconBadgeCheck className="h-6 w-6" />}
            title="All caught up"
            hint="No doctors are awaiting accreditation right now. New applications will appear here."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((pro, index) => (
              <li
                key={pro.user_id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <span
                      aria-hidden="true"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand"
                    >
                      {initials(pro.full_name) || '?'}
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-content">
                        <span className="truncate">{pro.full_name}</span>
                        {pro.speciality && (
                          <StatusPill tone="brand" dot={false}>
                            {pro.speciality}
                          </StatusPill>
                        )}
                      </p>
                      <p className="mt-1 truncate text-sm text-content-muted">
                        License {pro.license_no}
                        {pro.city && <> · {pro.city}</>} · {pro.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => void handleAccredit(pro.user_id)}
                    disabled={pendingId === pro.user_id}
                    className="shrink-0"
                    aria-label={`Accredit ${pro.full_name}`}
                  >
                    {pendingId === pro.user_id ? (
                      <Spinner label="Accrediting" />
                    ) : (
                      <>
                        <IconBadgeCheck className="h-4 w-4" />
                        Accredit
                      </>
                    )}
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ConsoleShell>
  );
}

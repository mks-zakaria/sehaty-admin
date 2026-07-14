'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Spinner } from '@sehaty/ui';
import { ConsoleShell } from '@/components/ConsoleShell';
import {
  ApiError,
  accreditProfessional,
  getToken,
  listPendingProfessionals,
  type PendingProfessional,
} from '@/lib/api';

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
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-brand-dark">
            Accreditation
          </h1>
          <p className="mt-1 text-sm text-brand-dark/60">
            Review and approve doctors awaiting accreditation.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center gap-3 py-16 text-brand-dark/60">
            <Spinner />
            <span>Loading pending doctors…</span>
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
            <p role="alert" className="text-sm text-red-700">
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
        ) : items.length === 0 ? (
          <Card className="text-center">
            <p className="text-sm text-brand-dark/60">
              No doctors are awaiting accreditation. All caught up.
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((pro) => (
              <li key={pro.user_id}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-brand-dark">
                      {pro.full_name}
                      {pro.speciality && (
                        <span className="ml-2 text-sm font-normal text-brand">
                          {pro.speciality}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-brand-dark/60">
                      License {pro.license_no}
                      {pro.city && <> · {pro.city}</>} · {pro.email}
                    </p>
                  </div>
                  <Button
                    onClick={() => void handleAccredit(pro.user_id)}
                    disabled={pendingId === pro.user_id}
                    className="shrink-0"
                  >
                    {pendingId === pro.user_id ? (
                      <Spinner label="Accrediting" />
                    ) : (
                      'Accredit'
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

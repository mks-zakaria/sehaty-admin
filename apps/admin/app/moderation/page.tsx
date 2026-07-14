'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, Spinner } from '@sehaty/ui';
import { ConsoleShell } from '@/components/ConsoleShell';
import {
  ApiError,
  getToken,
  listReviewQueue,
  moderateReview,
  type Review,
  type ReviewDirection,
  type ReviewModerateAction,
  type ReviewStatus,
} from '@/lib/api';

type Toast = { kind: 'success' | 'error'; message: string };

/** Which review + action is currently mid-flight, so we can disable its row. */
type Busy = { id: number; action: ReviewModerateAction } | null;

interface FilterForm {
  status: 'ALL' | Extract<ReviewStatus, 'PENDING' | 'FLAGGED'>;
  direction: 'ALL' | ReviewDirection;
}

const DIRECTION_LABEL: Record<ReviewDirection, string> = {
  PATIENT_ON_DOCTOR: 'patient → doctor',
  DOCTOR_ON_PATIENT: 'doctor → patient',
};

function Stars({ value }: { value: number }) {
  const rounded = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span
      aria-label={`${rounded} out of 5 stars`}
      className="text-base leading-none text-brand"
    >
      <span aria-hidden="true">
        {'★'.repeat(rounded)}
        <span className="text-content-muted/40">{'★'.repeat(5 - rounded)}</span>
      </span>
    </span>
  );
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const styles =
    status === 'FLAGGED'
      ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'
      : 'border-brand/30 bg-brand-soft text-brand';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${styles}`}
    >
      {status}
    </span>
  );
}

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export default function ModerationPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [busy, setBusy] = useState<Busy>(null);

  const { register, watch } = useForm<FilterForm>({
    defaultValues: { status: 'ALL', direction: 'ALL' },
  });
  const statusFilter = watch('status');
  const directionFilter = watch('direction');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listReviewQueue();
      setReviews(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push('/login');
        return;
      }
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to load the moderation queue.',
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

  const visible = useMemo(
    () =>
      reviews.filter(
        (r) =>
          (statusFilter === 'ALL' || r.status === statusFilter) &&
          (directionFilter === 'ALL' || r.direction === directionFilter),
      ),
    [reviews, statusFilter, directionFilter],
  );

  async function handleModerate(review: Review, action: ReviewModerateAction) {
    setToast(null);
    setBusy({ id: review.id, action });
    try {
      await moderateReview(review.id, action);
      // The review leaves the PENDING/FLAGGED queue — drop it optimistically.
      setReviews((prev) => prev.filter((r) => r.id !== review.id));
      setToast({
        kind: 'success',
        message:
          action === 'PUBLISH'
            ? `Review #${review.id} approved and published.`
            : `Review #${review.id} rejected and removed.`,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push('/login');
        return;
      }
      setToast({
        kind: 'error',
        message:
          err instanceof ApiError
            ? err.message
            : `Failed to ${action === 'PUBLISH' ? 'approve' : 'reject'} review #${review.id}.`,
      });
    } finally {
      setBusy(null);
    }
  }

  const selectClass =
    'rounded-lg border border-line bg-surface px-3 py-2 text-sm font-normal text-content outline-none focus:border-brand focus:ring-2 focus:ring-brand/40';

  return (
    <ConsoleShell>
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-content">
            Review moderation
          </h1>
          <p className="mt-1 text-sm text-content-muted">
            Approve or reject pending and flagged reviews before they go live.
          </p>
        </header>

        {toast && (
          <div
            role="status"
            className={
              toast.kind === 'success'
                ? 'mb-6 rounded-lg border border-brand/30 bg-brand-soft px-4 py-3 text-sm text-brand'
                : 'mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'
            }
          >
            {toast.message}
          </div>
        )}

        {!loading && !error && reviews.length > 0 && (
          <form className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1 text-sm font-medium text-content">
              Status
              <select {...register('status')} className={selectClass}>
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="FLAGGED">Flagged</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-content">
              Direction
              <select {...register('direction')} className={selectClass}>
                <option value="ALL">All</option>
                <option value="PATIENT_ON_DOCTOR">Patient → doctor</option>
                <option value="DOCTOR_ON_PATIENT">Doctor → patient</option>
              </select>
            </label>
          </form>
        )}

        {loading ? (
          <div className="flex items-center gap-3 py-16 text-content-muted">
            <Spinner />
            <span>Loading moderation queue…</span>
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
        ) : visible.length === 0 ? (
          <Card className="text-center">
            <p className="text-sm text-content-muted">
              {reviews.length === 0
                ? 'Queue is clear. No reviews are awaiting moderation.'
                : 'No reviews match the current filters.'}
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((review) => {
              const rowBusy = busy?.id === review.id;
              return (
                <li key={review.id}>
                  <Card className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Stars value={review.stars} />
                        <StatusBadge status={review.status} />
                      </div>
                      <span className="text-xs text-content-muted">
                        {dateFmt(review.created_at)}
                      </span>
                    </div>

                    {review.comment ? (
                      <p className="text-sm text-content">
                        “{review.comment}”
                      </p>
                    ) : (
                      <p className="text-sm italic text-content-muted">
                        No written comment.
                      </p>
                    )}

                    <p className="text-xs text-content-muted">
                      <span className="font-medium text-content">
                        {DIRECTION_LABEL[review.direction]}
                      </span>{' '}
                      · author #{review.author_id} → target #{review.target_id}{' '}
                      · appointment #{review.appointment_id}
                    </p>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() => void handleModerate(review, 'PUBLISH')}
                        disabled={rowBusy}
                        className="shrink-0"
                      >
                        {busy?.id === review.id && busy.action === 'PUBLISH' ? (
                          <Spinner label="Approving" />
                        ) : (
                          'Approve (publish)'
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => void handleModerate(review, 'REMOVE')}
                        disabled={rowBusy}
                        className="shrink-0"
                      >
                        {busy?.id === review.id && busy.action === 'REMOVE' ? (
                          <Spinner label="Rejecting" />
                        ) : (
                          'Reject (remove)'
                        )}
                      </Button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ConsoleShell>
  );
}

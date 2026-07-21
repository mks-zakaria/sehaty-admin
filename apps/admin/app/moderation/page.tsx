'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, Spinner } from '@sehaty/ui';
import { ConsoleShell } from '@/components/ConsoleShell';
import {
  Banner,
  CardListSkeleton,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  StatusPill,
} from '@/components/ui';
import { IconCheck, IconStar, IconX } from '@/components/icons';
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
      className="text-base leading-none text-warning"
    >
      <span aria-hidden="true">
        {'★'.repeat(rounded)}
        <span className="text-content-muted/40">{'★'.repeat(5 - rounded)}</span>
      </span>
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
  const [confirmTarget, setConfirmTarget] = useState<Review | null>(null);

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
      setConfirmTarget(null);
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
      setConfirmTarget(null);
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

  return (
    <ConsoleShell>
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Review moderation"
          description="Approve or reject pending and flagged reviews before they go live."
          actions={
            !loading && !error && reviews.length > 0 ? (
              <StatusPill tone="warning">{reviews.length} in queue</StatusPill>
            ) : undefined
          }
        />

        {toast && <Banner kind={toast.kind}>{toast.message}</Banner>}

        {!loading && !error && reviews.length > 0 && (
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
                <option value="PENDING">Pending</option>
                <option value="FLAGGED">Flagged</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="filter-direction"
                className="text-sm font-medium text-content"
              >
                Direction
              </label>
              <select
                id="filter-direction"
                {...register('direction')}
                className="field sm:w-52"
              >
                <option value="ALL">All</option>
                <option value="PATIENT_ON_DOCTOR">Patient → doctor</option>
                <option value="DOCTOR_ON_PATIENT">Doctor → patient</option>
              </select>
            </div>
          </form>
        )}

        {loading ? (
          <CardListSkeleton cards={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<IconStar className="h-6 w-6" />}
            title={
              reviews.length === 0 ? 'Queue is clear' : 'Nothing matches'
            }
            hint={
              reviews.length === 0
                ? 'No reviews are awaiting moderation. New pending or flagged reviews will land here.'
                : 'No reviews match the current filters. Try widening them.'
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((review, index) => {
              const rowBusy = busy?.id === review.id;
              return (
                <li
                  key={review.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                >
                  <Card className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Stars value={review.stars} />
                        <StatusPill
                          tone={review.status === 'FLAGGED' ? 'danger' : 'warning'}
                        >
                          {review.status}
                        </StatusPill>
                      </div>
                      <span className="text-xs text-content-muted">
                        {dateFmt(review.created_at)}
                      </span>
                    </div>

                    {review.comment ? (
                      <blockquote className="border-l-2 border-brand/40 pl-3 text-sm leading-relaxed text-content">
                        “{review.comment}”
                      </blockquote>
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

                    <div className="flex flex-wrap gap-3 border-t border-line pt-4">
                      <Button
                        onClick={() => void handleModerate(review, 'PUBLISH')}
                        disabled={rowBusy}
                        className="shrink-0"
                        aria-label={`Approve and publish review ${review.id}`}
                      >
                        {busy?.id === review.id && busy.action === 'PUBLISH' ? (
                          <Spinner label="Approving" />
                        ) : (
                          <>
                            <IconCheck className="h-4 w-4" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setConfirmTarget(review)}
                        disabled={rowBusy}
                        className="shrink-0"
                        aria-label={`Reject and remove review ${review.id}`}
                      >
                        <IconX className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        <ConfirmDialog
          open={confirmTarget !== null}
          title={`Reject review #${confirmTarget?.id ?? ''}?`}
          body="The review will be removed and will never be shown on the platform. This cannot be undone from the console."
          confirmLabel="Reject review"
          busy={busy?.action === 'REMOVE'}
          onConfirm={() =>
            confirmTarget && void handleModerate(confirmTarget, 'REMOVE')
          }
          onCancel={() => setConfirmTarget(null)}
        />
      </div>
    </ConsoleShell>
  );
}

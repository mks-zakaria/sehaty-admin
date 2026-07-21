'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '@sehaty/ui';
import { IconAlert, IconInbox } from './icons';

/* ------------------------------------------------------------------ */
/* Page header                                                        */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-content">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-content-muted">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Status pill                                                        */
/* ------------------------------------------------------------------ */

export type PillTone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';

const PILL_TONES: Record<PillTone, string> = {
  brand: 'bg-brand-soft text-brand',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-line/50 text-content-muted',
};

const PILL_DOTS: Record<PillTone, string> = {
  brand: 'bg-brand',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-content-muted',
};

export function StatusPill({
  tone = 'neutral',
  dot = true,
  children,
}: {
  tone?: PillTone;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${PILL_TONES[tone]}`}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${PILL_DOTS[tone]}`}
        />
      )}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Empty / error states                                               */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="animate-fade-up rounded-xl border border-dashed border-line bg-surface-card/60 px-6 py-14 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
        {icon ?? <IconInbox className="h-6 w-6" />}
      </span>
      <p className="mt-4 text-sm font-semibold text-content">{title}</p>
      {hint && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-content-muted">{hint}</p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="animate-fade-up rounded-xl border border-danger/30 bg-danger-soft px-6 py-8 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-danger/10 text-danger">
        <IconAlert className="h-6 w-6" />
      </span>
      <p role="alert" className="mt-3 text-sm font-medium text-danger">
        {message}
      </p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toast banner                                                       */
/* ------------------------------------------------------------------ */

export function Banner({
  kind,
  children,
}: {
  kind: 'success' | 'error';
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      className={`mb-6 animate-fade-up rounded-lg border px-4 py-3 text-sm ${
        kind === 'success'
          ? 'border-success/30 bg-success-soft text-success'
          : 'border-danger/30 bg-danger-soft text-danger'
      }`}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Skeletons (CSS shimmer, see globals.css)                           */
/* ------------------------------------------------------------------ */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

/** Full-width table placeholder while rows load. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="overflow-hidden rounded-xl border border-line bg-surface-card shadow-card"
    >
      <div className="border-b border-line px-4 py-3.5">
        <Skeleton className="h-3.5 w-2/5" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-6 border-b border-line px-4 py-4 last:border-0"
        >
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="ml-auto h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Stacked card placeholders (queues, plan lists…). */
export function CardListSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-3">
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-line bg-surface-card p-5 shadow-card"
        >
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-3.5 w-3/4" />
          <Skeleton className="mt-2 h-3.5 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/** KPI grid placeholder for the dashboard. */
export function StatGridSkeleton({ stats = 6 }: { stats?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: stats }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-line bg-surface-card p-5 shadow-card"
        >
          <div className="flex items-start justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-8 w-20" />
          <Skeleton className="mt-2 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Confirm dialog (destructive actions)                               */
/* ------------------------------------------------------------------ */

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus the safe option on open; close on Escape.
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-[2px]"
        onClick={busy ? undefined : onCancel}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-body"
        className="relative w-full max-w-sm animate-pop-in rounded-xl border border-line bg-surface-card p-6 shadow-raised"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
          <IconAlert className="h-6 w-6" />
        </span>
        <h2
          id="confirm-dialog-title"
          className="mt-4 text-base font-semibold tracking-tight text-content"
        >
          {title}
        </h2>
        <p id="confirm-dialog-body" className="mt-1.5 text-sm text-content-muted">
          {body}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-lg border border-line bg-surface-card px-4 py-2 text-sm font-medium text-content transition-colors duration-150 hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card disabled:cursor-not-allowed disabled:opacity-70"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-danger/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card disabled:cursor-not-allowed disabled:opacity-70 dark:text-surface"
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

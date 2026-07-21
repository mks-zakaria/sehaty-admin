'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, Spinner } from '@sehaty/ui';
import { ConsoleShell } from '@/components/ConsoleShell';
import {
  Banner,
  ConfirmDialog,
  ErrorState,
  PageHeader,
  Skeleton,
} from '@/components/ui';
import { IconWallet } from '@/components/icons';
import {
  ApiError,
  getAccountingExport,
  getToken,
  listPlans,
  recordCashPayment,
  runDunning,
  runReminders,
  seedPlans,
  type Plan,
} from '@/lib/api';

type Toast = { kind: 'success' | 'error'; message: string };

const REMINDER_WINDOWS = [24, 48, 72] as const;
type ReminderWindow = (typeof REMINDER_WINDOWS)[number];

interface PaymentForm {
  invoice_id: string;
  amount: string;
  receipt_no: string;
  paid_at: string;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <span id={id} className="text-xs font-medium text-danger">
      {message}
    </span>
  );
}

export default function BillingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [dunningBusy, setDunningBusy] = useState(false);
  const [dunningConfirm, setDunningConfirm] = useState(false);
  const [seedBusy, setSeedBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderWindow, setReminderWindow] = useState<ReminderWindow>(24);

  const year = new Date().getFullYear();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentForm>({
    defaultValues: { invoice_id: '', amount: '', receipt_no: '', paid_at: '' },
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPlans();
      setPlans(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push('/login');
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Failed to load plans.');
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

  function guard(err: unknown, fallback: string) {
    if (err instanceof ApiError && err.status === 401) {
      router.push('/login');
      return;
    }
    setToast({
      kind: 'error',
      message: err instanceof ApiError ? err.message : fallback,
    });
  }

  const onRecordPayment = handleSubmit(async (values) => {
    setToast(null);
    try {
      const payment = await recordCashPayment({
        invoice_id: Number(values.invoice_id),
        amount: Number(values.amount),
        receipt_no: values.receipt_no.trim(),
        paid_at: values.paid_at
          ? new Date(values.paid_at).toISOString()
          : undefined,
      });
      setToast({
        kind: 'success',
        message: `Recorded payment #${payment.id} of ${payment.amount} against invoice ${payment.invoice_id}.`,
      });
      reset();
    } catch (err) {
      guard(err, 'Failed to record payment.');
    }
  });

  async function handleDunning() {
    setToast(null);
    setDunningBusy(true);
    try {
      const { past_due } = await runDunning();
      setDunningConfirm(false);
      setToast({
        kind: 'success',
        message: `Dunning complete: ${past_due} subscription${past_due === 1 ? '' : 's'} flipped to past-due.`,
      });
    } catch (err) {
      setDunningConfirm(false);
      guard(err, 'Failed to run dunning.');
    } finally {
      setDunningBusy(false);
    }
  }

  async function handleReminders() {
    setToast(null);
    setReminderBusy(true);
    try {
      const { reminded } = await runReminders(reminderWindow);
      setToast({
        kind: 'success',
        message:
          reminded === 0
            ? 'No reminders were due.'
            : `${reminded} reminder${reminded === 1 ? '' : 's'} sent.`,
      });
    } catch (err) {
      guard(err, 'Failed to send appointment reminders.');
    } finally {
      setReminderBusy(false);
    }
  }

  async function handleSeed() {
    setToast(null);
    setSeedBusy(true);
    try {
      const { created } = await seedPlans();
      setToast({
        kind: 'success',
        message: `Seeded ${created} plan${created === 1 ? '' : 's'}.`,
      });
      await load();
    } catch (err) {
      guard(err, 'Failed to seed plans.');
    } finally {
      setSeedBusy(false);
    }
  }

  async function handleExport() {
    setToast(null);
    setExportBusy(true);
    try {
      const blob = await getAccountingExport(year);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `sehaty-accounting-${year}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      guard(err, 'Failed to download accounting export.');
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <ConsoleShell>
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="Billing"
          description="Cash payments, dunning, plan catalogue, and the year-end accounting export."
        />

        {toast && <Banner kind={toast.kind}>{toast.message}</Banner>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section>
            <Card className="animate-fade-up">
              <h2 className="text-lg font-semibold tracking-tight text-content">
                Record cash payment
              </h2>
              <p className="mt-1 text-sm text-content-muted">
                Record cash handed over at the desk. Idempotent per receipt
                number.
              </p>
              <form
                onSubmit={onRecordPayment}
                noValidate
                className="mt-5 flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="pay-invoice"
                    className="text-sm font-medium text-content"
                  >
                    Invoice ID
                  </label>
                  <input
                    id="pay-invoice"
                    type="number"
                    inputMode="numeric"
                    aria-invalid={errors.invoice_id ? 'true' : undefined}
                    aria-describedby={
                      errors.invoice_id ? 'pay-invoice-error' : undefined
                    }
                    {...register('invoice_id', {
                      required: 'Invoice ID is required.',
                      min: { value: 1, message: 'Must be a positive id.' },
                    })}
                    className="field"
                  />
                  <FieldError
                    id="pay-invoice-error"
                    message={errors.invoice_id?.message}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="pay-amount"
                    className="text-sm font-medium text-content"
                  >
                    Amount
                  </label>
                  <input
                    id="pay-amount"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    aria-invalid={errors.amount ? 'true' : undefined}
                    aria-describedby={
                      errors.amount ? 'pay-amount-error' : undefined
                    }
                    {...register('amount', {
                      required: 'Amount is required.',
                      min: {
                        value: 0.01,
                        message: 'Amount must be greater than zero.',
                      },
                    })}
                    className="field"
                  />
                  <FieldError
                    id="pay-amount-error"
                    message={errors.amount?.message}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="pay-receipt"
                    className="text-sm font-medium text-content"
                  >
                    Receipt number
                  </label>
                  <input
                    id="pay-receipt"
                    type="text"
                    aria-invalid={errors.receipt_no ? 'true' : undefined}
                    aria-describedby={
                      errors.receipt_no ? 'pay-receipt-error' : undefined
                    }
                    {...register('receipt_no', {
                      required: 'Receipt number is required.',
                    })}
                    className="field"
                  />
                  <FieldError
                    id="pay-receipt-error"
                    message={errors.receipt_no?.message}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="pay-paid-at"
                    className="text-sm font-medium text-content"
                  >
                    Paid at{' '}
                    <span className="font-normal text-content-muted">
                      (optional — defaults to now)
                    </span>
                  </label>
                  <input
                    id="pay-paid-at"
                    type="datetime-local"
                    {...register('paid_at')}
                    className="field"
                  />
                </div>

                <Button type="submit" disabled={isSubmitting} className="mt-1">
                  {isSubmitting ? (
                    <Spinner label="Recording" />
                  ) : (
                    'Record payment'
                  )}
                </Button>
              </form>
            </Card>
          </section>

          <section className="flex flex-col gap-6">
            <Card className="animate-fade-up" style={{ animationDelay: '60ms' }}>
              <h2 className="text-lg font-semibold tracking-tight text-content">
                Operations
              </h2>
              <p className="mt-1 text-sm text-content-muted">
                Run the overdue-invoice sweep, seed the plan catalogue, or
                export the {year} accounting trail.
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setDunningConfirm(true)}
                  disabled={dunningBusy}
                >
                  {dunningBusy ? (
                    <Spinner label="Running dunning" />
                  ) : (
                    'Run dunning'
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void handleSeed()}
                  disabled={seedBusy}
                >
                  {seedBusy ? <Spinner label="Seeding plans" /> : 'Seed plans'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void handleExport()}
                  disabled={exportBusy}
                >
                  {exportBusy ? (
                    <Spinner label="Preparing export" />
                  ) : (
                    `Download accounting export (${year})`
                  )}
                </Button>
              </div>
            </Card>

            <Card className="animate-fade-up" style={{ animationDelay: '120ms' }}>
              <h2 className="text-lg font-semibold tracking-tight text-content">
                Appointment reminders
              </h2>
              <p className="mt-1 text-sm text-content-muted">
                Notify patients of their upcoming confirmed appointments. Safe to
                run repeatedly — sending is idempotent.
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-sm font-medium text-content">
                  Look-ahead window
                  <select
                    value={reminderWindow}
                    onChange={(event) =>
                      setReminderWindow(
                        Number(event.target.value) as ReminderWindow,
                      )
                    }
                    disabled={reminderBusy}
                    className="field"
                  >
                    {REMINDER_WINDOWS.map((hours) => (
                      <option key={hours} value={hours}>
                        Next {hours} hours
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  variant="secondary"
                  onClick={() => void handleReminders()}
                  disabled={reminderBusy}
                >
                  {reminderBusy ? (
                    <Spinner label="Sending reminders" />
                  ) : (
                    'Send reminders now'
                  )}
                </Button>
              </div>
            </Card>

            <Card className="animate-fade-up" style={{ animationDelay: '180ms' }}>
              <h2 className="text-lg font-semibold tracking-tight text-content">
                Plans
              </h2>
              {loading ? (
                <div
                  role="status"
                  aria-label="Loading plans"
                  className="mt-4 flex flex-col gap-2"
                >
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5"
                    >
                      <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="mt-4">
                  <ErrorState message={error} onRetry={() => void load()} />
                </div>
              ) : plans.length === 0 ? (
                <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-line px-4 py-5 text-sm text-content-muted">
                  <IconWallet className="h-5 w-5 shrink-0 text-brand" />
                  No plans in the catalogue yet. Use “Seed plans” above.
                </div>
              ) : (
                <ul className="mt-4 flex flex-col gap-2">
                  {plans.map((plan) => (
                    <li
                      key={plan.code}
                      className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5 transition-colors duration-150 hover:border-brand/40 hover:bg-brand/5"
                    >
                      <div>
                        <p className="text-sm font-medium text-content">
                          {plan.name}
                        </p>
                        <p className="text-xs text-content-muted">{plan.code}</p>
                      </div>
                      <span className="text-sm font-medium text-content tabular-nums">
                        {plan.price_month.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        {plan.currency}
                        <span className="font-normal text-content-muted">
                          {' '}
                          /mo
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </div>

        <ConfirmDialog
          open={dunningConfirm}
          title="Run the dunning sweep?"
          body="Every subscription with an overdue invoice will be flipped to past-due. Doctors may lose visibility until they pay."
          confirmLabel="Run dunning"
          busy={dunningBusy}
          onConfirm={() => void handleDunning()}
          onCancel={() => setDunningConfirm(false)}
        />
      </div>
    </ConsoleShell>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, Spinner } from '@sehaty/ui';
import { ConsoleShell } from '@/components/ConsoleShell';
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

const REMINDER_WINDOWS = [24, 48, 72] as const;
type ReminderWindow = (typeof REMINDER_WINDOWS)[number];

type Toast = { kind: 'success' | 'error'; message: string };

interface PaymentForm {
  invoice_id: string;
  amount: string;
  receipt_no: string;
  paid_at: string;
}

export default function BillingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [dunningBusy, setDunningBusy] = useState(false);
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
      setToast({
        kind: 'success',
        message: `Dunning complete: ${past_due} subscription${past_due === 1 ? '' : 's'} flipped to past-due.`,
      });
    } catch (err) {
      guard(err, 'Failed to run dunning.');
    } finally {
      setDunningBusy(false);
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

  const fieldClass =
    'rounded-lg border border-line bg-surface px-3 py-2 text-sm font-normal text-content outline-none focus:border-brand focus:ring-2 focus:ring-brand/40';

  return (
    <ConsoleShell>
      <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-content">Billing</h1>
          <p className="mt-1 text-sm text-content-muted">
            Cash payments, dunning, plan catalogue, and the year-end accounting
            export.
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section>
            <Card>
              <h2 className="text-lg font-semibold text-content">
                Record cash payment
              </h2>
              <p className="mt-1 text-sm text-content-muted">
                Record cash handed over at the desk. Idempotent per receipt
                number.
              </p>
              <form onSubmit={onRecordPayment} className="mt-4 flex flex-col gap-4">
                <label className="flex flex-col gap-1 text-sm font-medium text-content">
                  Invoice ID
                  <input
                    type="number"
                    inputMode="numeric"
                    {...register('invoice_id', {
                      required: 'Invoice ID is required.',
                      min: { value: 1, message: 'Must be a positive id.' },
                    })}
                    className={fieldClass}
                  />
                  {errors.invoice_id && (
                    <span className="text-xs text-red-600 dark:text-red-400">
                      {errors.invoice_id.message}
                    </span>
                  )}
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-content">
                  Amount
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    {...register('amount', {
                      required: 'Amount is required.',
                      min: {
                        value: 0.01,
                        message: 'Amount must be greater than zero.',
                      },
                    })}
                    className={fieldClass}
                  />
                  {errors.amount && (
                    <span className="text-xs text-red-600 dark:text-red-400">
                      {errors.amount.message}
                    </span>
                  )}
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-content">
                  Receipt number
                  <input
                    type="text"
                    {...register('receipt_no', {
                      required: 'Receipt number is required.',
                    })}
                    className={fieldClass}
                  />
                  {errors.receipt_no && (
                    <span className="text-xs text-red-600 dark:text-red-400">
                      {errors.receipt_no.message}
                    </span>
                  )}
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-content">
                  Paid at{' '}
                  <span className="font-normal text-content-muted">
                    (optional — defaults to now)
                  </span>
                  <input
                    type="datetime-local"
                    {...register('paid_at')}
                    className={fieldClass}
                  />
                </label>

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
            <Card>
              <h2 className="text-lg font-semibold text-content">Operations</h2>
              <p className="mt-1 text-sm text-content-muted">
                Run the overdue-invoice sweep, seed the plan catalogue, or export
                the {year} accounting trail.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <Button
                  variant="secondary"
                  onClick={() => void handleDunning()}
                  disabled={dunningBusy}
                >
                  {dunningBusy ? <Spinner label="Running dunning" /> : 'Run dunning'}
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

            <Card>
              <h2 className="text-lg font-semibold text-content">
                Appointment reminders
              </h2>
              <p className="mt-1 text-sm text-content-muted">
                Notify patients of their upcoming confirmed appointments. Safe to
                run repeatedly — sending is idempotent.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-sm font-medium text-content">
                  Look-ahead window
                  <select
                    value={reminderWindow}
                    onChange={(event) =>
                      setReminderWindow(
                        Number(event.target.value) as ReminderWindow,
                      )
                    }
                    disabled={reminderBusy}
                    className={fieldClass}
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

            <Card>
              <h2 className="text-lg font-semibold text-content">Plans</h2>
              {loading ? (
                <div className="mt-4 flex items-center gap-3 text-content-muted">
                  <Spinner />
                  <span>Loading plans…</span>
                </div>
              ) : error ? (
                <div className="mt-4">
                  <p role="alert" className="text-sm text-red-700 dark:text-red-300">
                    {error}
                  </p>
                  <Button
                    variant="secondary"
                    className="mt-3"
                    onClick={() => void load()}
                  >
                    Retry
                  </Button>
                </div>
              ) : plans.length === 0 ? (
                <p className="mt-4 text-sm text-content-muted">
                  No plans in the catalogue yet. Use “Seed plans” above.
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-2">
                  {plans.map((plan) => (
                    <li
                      key={plan.code}
                      className="flex items-center justify-between rounded-lg border border-line px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-content">
                          {plan.name}
                        </p>
                        <p className="text-xs text-content-muted">{plan.code}</p>
                      </div>
                      <span className="text-sm font-medium text-content">
                        {plan.price_month.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        {plan.currency}
                        <span className="text-content-muted"> /mo</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </div>
      </div>
    </ConsoleShell>
  );
}

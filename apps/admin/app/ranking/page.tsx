'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, Spinner } from '@sehaty/ui';
import { ConsoleShell } from '@/components/ConsoleShell';
import {
  Banner,
  ErrorState,
  PageHeader,
  Skeleton,
} from '@/components/ui';
import {
  ApiError,
  getFeatureFlags,
  getRankingWeights,
  getToken,
  setFeatureFlag,
  setRankingWeights,
  type RankingWeightKey,
  type RankingWeights,
} from '@/lib/api';

type Toast = { kind: 'success' | 'error'; message: string };

/** The tunable weights, in display order, with human-facing copy. */
const WEIGHTS: { key: RankingWeightKey; label: string; hint: string }[] = [
  {
    key: 'w_rating',
    label: 'Rating',
    hint: 'How much a doctor’s average review score lifts them.',
  },
  {
    key: 'w_distance',
    label: 'Distance',
    hint: 'Proximity to the searching patient.',
  },
  {
    key: 'w_responsiveness',
    label: 'Responsiveness',
    hint: 'How quickly the doctor confirms appointments.',
  },
  {
    key: 'w_verified',
    label: 'Verified',
    hint: 'Boost for accredited, verified professionals.',
  },
  {
    key: 'w_recency',
    label: 'Recency',
    hint: 'Favours recently active profiles.',
  },
];

type WeightsForm = Record<RankingWeightKey, string>;

interface FlagForm {
  key: string;
  enabled: boolean;
}

function ConfigSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading configuration"
      className="grid grid-cols-1 gap-6 lg:grid-cols-2"
    >
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-line bg-surface-card p-5 shadow-card"
        >
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-3.5 w-3/4" />
          <div className="mt-6 flex flex-col gap-5">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RankingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [flagBusy, setFlagBusy] = useState<string | null>(null);

  const {
    register: registerWeight,
    handleSubmit: handleWeightSubmit,
    reset: resetWeights,
    setValue: setWeightValue,
    watch: watchWeights,
    formState: { errors: weightErrors, isSubmitting: weightSubmitting },
  } = useForm<WeightsForm>();

  const {
    register: registerFlag,
    handleSubmit: handleFlagSubmit,
    reset: resetFlag,
    formState: { errors: flagErrors, isSubmitting: flagCreating },
  } = useForm<FlagForm>({ defaultValues: { key: '', enabled: true } });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [weights, flagsData] = await Promise.all([
        getRankingWeights(),
        getFeatureFlags(),
      ]);
      resetWeights(toFormValues(weights));
      setFlags(flagsData.flags);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push('/login');
        return;
      }
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to load ranking configuration.',
      );
    } finally {
      setLoading(false);
    }
  }, [resetWeights, router]);

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

  const onSaveWeights = handleWeightSubmit(async (values) => {
    setToast(null);
    try {
      const body: Partial<RankingWeights> = {};
      for (const { key } of WEIGHTS) {
        body[key] = Number(values[key]);
      }
      const updated = await setRankingWeights(body);
      resetWeights(toFormValues(updated));
      setToast({ kind: 'success', message: 'Ranking weights saved.' });
    } catch (err) {
      guard(err, 'Failed to save ranking weights.');
    }
  });

  async function toggleFlag(key: string, enabled: boolean) {
    setToast(null);
    setFlagBusy(key);
    // Optimistic flip; roll back on failure.
    setFlags((prev) => ({ ...prev, [key]: enabled }));
    try {
      const flag = await setFeatureFlag(key, enabled);
      setFlags((prev) => ({ ...prev, [flag.key]: flag.enabled }));
      setToast({
        kind: 'success',
        message: `“${key}” ${enabled ? 'enabled' : 'disabled'}.`,
      });
    } catch (err) {
      setFlags((prev) => ({ ...prev, [key]: !enabled }));
      guard(err, `Failed to update “${key}”.`);
    } finally {
      setFlagBusy(null);
    }
  }

  const onCreateFlag = handleFlagSubmit(async (values) => {
    const key = values.key.trim();
    if (!key) return;
    setToast(null);
    setFlagBusy(key);
    try {
      const flag = await setFeatureFlag(key, values.enabled);
      setFlags((prev) => ({ ...prev, [flag.key]: flag.enabled }));
      setToast({ kind: 'success', message: `Flag “${flag.key}” saved.` });
      resetFlag();
    } catch (err) {
      guard(err, 'Failed to create flag.');
    } finally {
      setFlagBusy(null);
    }
  });

  const flagEntries = Object.entries(flags).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <ConsoleShell>
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="Ranking & configuration"
          description="Tune the doctor-locator search ranking and toggle feature flags."
        />

        {toast && <Banner kind={toast.kind}>{toast.message}</Banner>}

        {loading ? (
          <ConfigSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section>
              <Card className="animate-fade-up">
                <h2 className="text-lg font-semibold tracking-tight text-content">
                  Ranking weights
                </h2>
                <p className="mt-1 text-sm text-content-muted">
                  These weights drive the doctor-locator search ranking. A
                  higher weight makes that signal count for more; zero switches
                  it off.
                </p>
                <form
                  onSubmit={onSaveWeights}
                  noValidate
                  className="mt-5 flex flex-col gap-5"
                >
                  {WEIGHTS.map(({ key, label, hint }) => {
                    const raw = watchWeights(key);
                    const sliderValue = Number.isFinite(Number(raw))
                      ? Math.max(0, Math.min(5, Number(raw)))
                      : 0;
                    return (
                      <div key={key} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <label
                            htmlFor={key}
                            className="text-sm font-medium text-content"
                          >
                            {label}
                          </label>
                          <input
                            id={key}
                            type="number"
                            step="0.05"
                            min={0}
                            inputMode="decimal"
                            aria-invalid={weightErrors[key] ? 'true' : undefined}
                            aria-describedby={
                              weightErrors[key] ? `${key}-error` : undefined
                            }
                            {...registerWeight(key, {
                              required: 'Required.',
                              min: {
                                value: 0,
                                message: 'Must be non-negative.',
                              },
                              validate: (v) =>
                                !Number.isNaN(Number(v)) || 'Must be a number.',
                            })}
                            className="field w-24 text-right tabular-nums"
                          />
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={5}
                          step={0.05}
                          value={sliderValue}
                          aria-label={`${label} weight slider`}
                          onChange={(e) =>
                            setWeightValue(key, e.target.value, {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                          }
                          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-brand-soft accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
                        />
                        <p className="text-xs text-content-muted">{hint}</p>
                        {weightErrors[key] && (
                          <span
                            id={`${key}-error`}
                            className="text-xs font-medium text-danger"
                          >
                            {weightErrors[key]?.message}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  <Button
                    type="submit"
                    disabled={weightSubmitting}
                    className="mt-1"
                  >
                    {weightSubmitting ? (
                      <Spinner label="Saving weights" />
                    ) : (
                      'Save weights'
                    )}
                  </Button>
                </form>
              </Card>
            </section>

            <section>
              <Card className="animate-fade-up" style={{ animationDelay: '60ms' }}>
                <h2 className="text-lg font-semibold tracking-tight text-content">
                  Feature flags
                </h2>
                <p className="mt-1 text-sm text-content-muted">
                  Flip capabilities on or off across the platform. Changes apply
                  immediately.
                </p>

                {flagEntries.length === 0 ? (
                  <div className="mt-4">
                    <p className="text-sm text-content-muted">
                      No feature flags yet. Create one below.
                    </p>
                    <form
                      onSubmit={onCreateFlag}
                      noValidate
                      className="mt-4 flex flex-col gap-4"
                    >
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="flag-key"
                          className="text-sm font-medium text-content"
                        >
                          Flag key
                        </label>
                        <input
                          id="flag-key"
                          type="text"
                          placeholder="e.g. teleconsultation"
                          aria-invalid={flagErrors.key ? 'true' : undefined}
                          aria-describedby={
                            flagErrors.key ? 'flag-key-error' : undefined
                          }
                          {...registerFlag('key', {
                            required: 'Flag key is required.',
                          })}
                          className="field"
                        />
                        {flagErrors.key && (
                          <span
                            id="flag-key-error"
                            className="text-xs font-medium text-danger"
                          >
                            {flagErrors.key.message}
                          </span>
                        )}
                      </div>
                      <label className="flex items-center gap-2 text-sm font-medium text-content">
                        <input
                          type="checkbox"
                          {...registerFlag('enabled')}
                          className="h-4 w-4 accent-brand"
                        />
                        Enabled
                      </label>
                      <Button type="submit" disabled={flagCreating}>
                        {flagCreating ? (
                          <Spinner label="Saving flag" />
                        ) : (
                          'Create flag'
                        )}
                      </Button>
                    </form>
                  </div>
                ) : (
                  <ul className="mt-4 flex flex-col gap-2">
                    {flagEntries.map(([key, enabled]) => (
                      <li
                        key={key}
                        className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5 transition-colors duration-150 hover:border-brand/40 hover:bg-brand/5"
                      >
                        <span className="text-sm font-medium text-content">
                          {key}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={enabled}
                          aria-label={`Toggle ${key}`}
                          disabled={flagBusy === key}
                          onClick={() => void toggleFlag(key, !enabled)}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card disabled:cursor-not-allowed disabled:opacity-60 ${
                            enabled ? 'bg-brand' : 'bg-content-muted/30'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-surface-card shadow-card transition-transform duration-200 ${
                              enabled ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>
          </div>
        )}
      </div>
    </ConsoleShell>
  );
}

/** Turn the numeric weights payload into the form's string values. */
function toFormValues(weights: RankingWeights): WeightsForm {
  return {
    w_rating: String(weights.w_rating),
    w_distance: String(weights.w_distance),
    w_responsiveness: String(weights.w_responsiveness),
    w_verified: String(weights.w_verified),
    w_recency: String(weights.w_recency),
  };
}

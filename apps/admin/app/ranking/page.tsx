'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, Spinner } from '@sehaty/ui';
import { ConsoleShell } from '@/components/ConsoleShell';
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

  const fieldClass =
    'rounded-lg border border-line bg-surface px-3 py-2 text-sm font-normal text-content outline-none focus:border-brand focus:ring-2 focus:ring-brand/40';

  const flagEntries = Object.entries(flags).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <ConsoleShell>
      <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-content">
            Ranking &amp; configuration
          </h1>
          <p className="mt-1 text-sm text-content-muted">
            Tune the doctor-locator search ranking and toggle feature flags.
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

        {loading ? (
          <div className="flex items-center gap-3 py-16 text-content-muted">
            <Spinner />
            <span>Loading configuration…</span>
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
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section>
              <Card>
                <h2 className="text-lg font-semibold text-content">
                  Ranking weights
                </h2>
                <p className="mt-1 text-sm text-content-muted">
                  These weights drive the doctor-locator search ranking. A
                  higher weight makes that signal count for more; zero switches
                  it off.
                </p>
                <form onSubmit={onSaveWeights} className="mt-4 flex flex-col gap-5">
                  {WEIGHTS.map(({ key, label, hint }) => {
                    const raw = watchWeights(key);
                    const sliderValue = Number.isFinite(Number(raw))
                      ? Math.max(0, Math.min(5, Number(raw)))
                      : 0;
                    return (
                      <div key={key} className="flex flex-col gap-1">
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
                            {...registerWeight(key, {
                              required: 'Required.',
                              min: {
                                value: 0,
                                message: 'Must be non-negative.',
                              },
                              validate: (v) =>
                                !Number.isNaN(Number(v)) || 'Must be a number.',
                            })}
                            className={`${fieldClass} w-24 text-right`}
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
                          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-brand-soft accent-brand"
                        />
                        <p className="text-xs text-content-muted">{hint}</p>
                        {weightErrors[key] && (
                          <span className="text-xs text-red-600 dark:text-red-400">
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
              <Card>
                <h2 className="text-lg font-semibold text-content">
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
                      className="mt-4 flex flex-col gap-4"
                    >
                      <label className="flex flex-col gap-1 text-sm font-medium text-content">
                        Flag key
                        <input
                          type="text"
                          placeholder="e.g. teleconsultation"
                          {...registerFlag('key', {
                            required: 'Flag key is required.',
                          })}
                          className={fieldClass}
                        />
                        {flagErrors.key && (
                          <span className="text-xs text-red-600 dark:text-red-400">
                            {flagErrors.key.message}
                          </span>
                        )}
                      </label>
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
                        className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2"
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
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card disabled:cursor-not-allowed disabled:opacity-60 ${
                            enabled ? 'bg-brand' : 'bg-content-muted/30'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-surface-card shadow transition-transform ${
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

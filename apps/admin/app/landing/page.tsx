'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ConsoleShell } from '@/components/ConsoleShell';
import { DoctorProfilePanel } from '@/components/DoctorProfilePanel';
import {
  EmptyState,
  ErrorState,
  PageHeader,
  StatusPill,
  TableSkeleton,
} from '@/components/ui';
import {
  ApiError,
  getLandingConfig,
  getToken,
  listAdminUsers,
  listLandingTemplates,
  setLandingPersonalized,
  updateLandingConfig,
  type AdminUser,
  type LandingConfig,
  type LandingService,
} from '@/lib/api';

/**
 * Choose a doctor's public-page template and enter their content.
 *
 * This is an onboarding tool, not a settings screen: it gets used at a desk
 * during a 15-minute visit, so the whole thing is one panel with no wizard and
 * no navigation away from the doctor you are working on.
 *
 * The template is normally inherited from the doctor's specialty and needs no
 * action — the picker shows which one that is, so staff only override when they
 * mean to. `is_personalized` is deliberately a separate control: typing a
 * doctor's acts during a trial must not silently put them on the paid tier, and
 * recording the sale must not require re-entering their content.
 */

const FIELD =
  'w-full rounded-lg border border-token bg-card px-3 py-2 text-sm text-content';

/** Blank row appended so there is always somewhere to type. */
const EMPTY_SERVICE: LandingService = { label: '', price: null };

export default function LandingPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<AdminUser[]>([]);
  const [templates, setTemplates] = useState<string[]>([]);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [config, setConfig] = useState<LandingConfig | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Draft state, kept separate from `config` so an unsaved edit is never
  // mistaken for what is live on the page.
  const [template, setTemplate] = useState('');
  const [tagline, setTagline] = useState('');
  const [accent, setAccent] = useState('');
  const [services, setServices] = useState<LandingService[]>([EMPTY_SERVICE]);
  const [equipment, setEquipment] = useState('');
  const [faq, setFaq] = useState<{ q: string; a: string }[]>([{ q: '', a: '' }]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, keys] = await Promise.all([
        listAdminUsers({ role: 'DOCTOR', limit: 200 }),
        listLandingTemplates(),
      ]);
      setDoctors(list);
      setTemplates(keys);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push('/login');
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Failed to load doctors.');
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

  async function select(doctor: AdminUser) {
    setSelected(doctor);
    setSaved(false);
    setError(null);
    setBusy(true);
    try {
      const cfg = await getLandingConfig(doctor.id);
      setConfig(cfg);
      // An inherited template shows as blank so saving does not silently
      // convert "inherited" into an explicit override.
      setTemplate(cfg.template_is_default ? '' : cfg.template);
      setTagline(cfg.tagline ?? '');
      setAccent(cfg.accent ?? '');
      setServices(cfg.services.length ? [...cfg.services, EMPTY_SERVICE] : [EMPTY_SERVICE]);
      setEquipment(cfg.equipment.join(', '));
      setFaq(
        cfg.faq.length
          ? [...cfg.faq.map((f) => ({ q: f.question, a: f.answer })), { q: '', a: '' }]
          : [{ q: '', a: '' }],
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load the configuration.');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!selected) return;
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      const cfg = await updateLandingConfig(selected.id, {
        // Blank means "keep inheriting from the specialty".
        template: template || null,
        accent: accent.trim() || null,
        tagline: tagline.trim() || null,
        // Blank rows are the price of always having somewhere to type; drop
        // them rather than publishing empty lines on a doctor's page.
        services: services
          .filter((s) => s.label.trim())
          .map((s) => ({ label: s.label.trim(), price: s.price })),
        equipment: equipment
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean),
        faq: faq.filter((f) => f.q.trim() && f.a.trim()),
      });
      setConfig(cfg);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save.');
    } finally {
      setBusy(false);
    }
  }

  async function togglePersonalized() {
    if (!selected || !config) return;
    setBusy(true);
    setError(null);
    try {
      setConfig(await setLandingPersonalized(selected.id, !config.is_personalized));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConsoleShell>
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Landing pages"
          description="Pick a doctor's page template and enter their content. The template is inherited from their specialty unless you override it — content only appears publicly once the page is marked personalised."
        />

        {loading && <TableSkeleton />}
        {error && !selected && <ErrorState message={error} onRetry={() => void load()} />}
        {!loading && !error && doctors.length === 0 && (
          <EmptyState title="No doctors yet." hint="Accredit a doctor to configure their page." />
        )}

        {!loading && doctors.length > 0 && (
          <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
            {/* Doctor list */}
            <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-token">
              <ul className="divide-y divide-token">
                {doctors.map((doctor) => (
                  <li key={doctor.id}>
                    <button
                      type="button"
                      onClick={() => void select(doctor)}
                      className={`w-full px-4 py-3 text-left text-sm transition-colors hover:bg-card ${
                        selected?.id === doctor.id ? 'bg-card font-medium' : ''
                      }`}
                    >
                      <span className="block text-content">
                        {doctor.full_name ?? doctor.email}
                      </span>
                      <span className="block text-xs text-muted">{doctor.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Editor */}
            <div className="rounded-xl border border-token p-5">
              {!selected && (
                <p className="text-sm text-muted">
                  Select a doctor to configure their public page.
                </p>
              )}

              {selected && config && (
                <div className="space-y-5">
                  {/* Intake first — it is what you collect while sitting with
                      the doctor, and it is the only path to these fields. */}
                  <details open className="rounded-lg border border-token p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-content">
                      Contact, hours and insurance
                    </summary>
                    <div className="mt-4">
                      <DoctorProfilePanel doctorId={selected.id} />
                    </div>
                  </details>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-content">
                      {selected.full_name ?? selected.email}
                    </h2>
                    <button
                      type="button"
                      onClick={() => void togglePersonalized()}
                      disabled={busy}
                      className="rounded-full border border-token px-3 py-1.5 text-sm font-medium text-content disabled:opacity-50"
                    >
                      <StatusPill tone={config.is_personalized ? 'success' : 'neutral'}>
                        {config.is_personalized ? 'Personalised (paid)' : 'Free page'}
                      </StatusPill>
                      <span className="ms-2 text-xs text-muted">click to toggle</span>
                    </button>
                  </div>

                  {!config.is_personalized && (
                    <p className="rounded-lg border border-token bg-card px-3 py-2 text-xs text-muted">
                      This doctor is on the free page: the specialty template is applied, but
                      the content below stays private until you mark the page personalised.
                    </p>
                  )}

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-content">Template</span>
                    <select
                      value={template}
                      onChange={(e) => setTemplate(e.target.value)}
                      className={FIELD}
                    >
                      <option value="">
                        Inherit from specialty — currently “{config.template}”
                      </option>
                      {templates.map((key) => (
                        <option key={key} value={key}>
                          {key}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-content">Tagline</span>
                      <input
                        value={tagline}
                        onChange={(e) => setTagline(e.target.value)}
                        placeholder="One line under the doctor's name"
                        className={FIELD}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-content">
                        Accent colour
                      </span>
                      <input
                        value={accent}
                        onChange={(e) => setAccent(e.target.value)}
                        placeholder="#2b73b3 — blank uses the template's"
                        className={FIELD}
                      />
                    </label>
                  </div>

                  <fieldset>
                    <legend className="mb-1 text-sm font-medium text-content">
                      Acts and prices
                    </legend>
                    <p className="mb-2 text-xs text-muted">
                      Leave a price blank if the doctor does not publish one — the page shows a
                      dash rather than a made-up figure.
                    </p>
                    <div className="space-y-2">
                      {services.map((service, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            value={service.label}
                            onChange={(e) => {
                              const next = [...services];
                              next[index] = { ...next[index], label: e.target.value };
                              // Always keep one blank row to type into.
                              if (index === services.length - 1 && e.target.value) {
                                next.push({ ...EMPTY_SERVICE });
                              }
                              setServices(next);
                            }}
                            placeholder="Détartrage"
                            className={FIELD}
                          />
                          <input
                            value={service.price ?? ''}
                            onChange={(e) => {
                              const next = [...services];
                              const raw = e.target.value.trim();
                              next[index] = {
                                ...next[index],
                                price: raw === '' ? null : Number(raw),
                              };
                              setServices(next);
                            }}
                            inputMode="decimal"
                            placeholder="MAD"
                            className={`${FIELD} sm:w-32`}
                          />
                        </div>
                      ))}
                    </div>
                  </fieldset>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-content">Equipment</span>
                    <input
                      value={equipment}
                      onChange={(e) => setEquipment(e.target.value)}
                      placeholder="Radiographie panoramique, Caméra intra-orale"
                      className={FIELD}
                    />
                    <span className="mt-1 block text-xs text-muted">Separate with commas.</span>
                  </label>

                  <fieldset>
                    <legend className="mb-1 text-sm font-medium text-content">
                      Frequently asked
                    </legend>
                    <div className="space-y-2">
                      {faq.map((entry, index) => (
                        <div key={index} className="grid gap-2 sm:grid-cols-2">
                          <input
                            value={entry.q}
                            onChange={(e) => {
                              const next = [...faq];
                              next[index] = { ...next[index], q: e.target.value };
                              if (index === faq.length - 1 && e.target.value) {
                                next.push({ q: '', a: '' });
                              }
                              setFaq(next);
                            }}
                            placeholder="Faut-il un rendez-vous ?"
                            className={FIELD}
                          />
                          <input
                            value={entry.a}
                            onChange={(e) => {
                              const next = [...faq];
                              next[index] = { ...next[index], a: e.target.value };
                              setFaq(next);
                            }}
                            placeholder="Oui, sauf urgence."
                            className={FIELD}
                          />
                        </div>
                      ))}
                    </div>
                  </fieldset>

                  {error && <p className="text-sm text-red-500">{error}</p>}
                  {saved && <p className="text-sm text-emerald-500">Saved.</p>}

                  <button
                    type="button"
                    onClick={() => void save()}
                    disabled={busy}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ConsoleShell>
  );
}

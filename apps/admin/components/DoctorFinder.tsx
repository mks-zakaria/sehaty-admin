'use client';

import { useState } from 'react';
import { ApiError, createDoctor, searchDoctors, type DoctorMatch } from '@/lib/api';
import { StatusPill } from '@/components/ui';

/**
 * Step one of a visit: work out whether this doctor is already on the platform.
 *
 * Almost always they are — five thousand pages came from public directories —
 * and that is why search comes before create rather than beside it. Creating a
 * second profile for someone who has one splits their reviews, orphans whatever
 * QR code exists, and leaves two of them in the directory for patients to
 * choose between.
 *
 * So the create form is deliberately behind a step: it only appears once a
 * search has actually run and come back empty. An operator who can click
 * "create" without looking will click it, and the duplicate is silent.
 */

const SPECIALTIES = [
  ['generalist', 'Médecin généraliste'],
  ['dentistry', 'Dentiste'],
  ['cardiology', 'Cardiologue'],
  ['dermatology', 'Dermatologue'],
  ['gynecology', 'Gynécologue'],
  ['ophthalmology', 'Ophtalmologue'],
  ['pediatrics', 'Pédiatre'],
  ['psychiatry', 'Psychiatre'],
  ['otolaryngology', 'ORL'],
  ['orthopedics', 'Orthopédiste'],
] as const;

export function DoctorFinder({ onPick }: { onPick: (doctor: DoctorMatch) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DoctorMatch[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create is only reachable after a search has run and found nothing.
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('Casablanca');
  const [specialty, setSpecialty] = useState<string>('generalist');
  const [district, setDistrict] = useState('');

  async function run() {
    setBusy(true);
    setError(null);
    setCreating(false);
    try {
      const found = await searchDoctors(query.trim());
      setResults(found);
      setName(query.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Search failed.');
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    setBusy(true);
    setError(null);
    try {
      onPick(
        await createDoctor({
          full_name: name.trim(),
          city: city.trim(),
          specialty_slug: specialty,
          district: district.trim() || null,
        }),
      );
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? `${err.message} — search again and open the existing page.`
          : err instanceof ApiError
            ? err.message
            : 'Could not create the doctor.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-content" htmlFor="finder">
          Find the doctor
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="finder"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && query.trim().length > 1 && void run()}
            placeholder="Bennani, or amina bennani"
            className="field sm:w-80"
          />
          <button
            type="button"
            onClick={() => void run()}
            disabled={busy || query.trim().length < 2}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand disabled:opacity-50"
          >
            {busy ? 'Searching…' : 'Search'}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">
          Surname alone is enough, in any order, with or without accents.
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {results && results.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {results.map((doctor) => (
            <li key={doctor.doctor_id}>
              <button
                type="button"
                onClick={() => onPick(doctor)}
                className="flex w-full flex-wrap items-center justify-between gap-3 p-3 text-left hover:bg-surface"
              >
                <span>
                  <span className="font-medium text-content">{doctor.full_name}</span>
                  <span className="ms-2 text-xs text-muted">
                    {doctor.specialty ?? '—'} · {doctor.district ?? doctor.city ?? '—'}
                  </span>
                  {doctor.address && (
                    <span className="block text-xs text-muted">{doctor.address}</span>
                  )}
                </span>
                <StatusPill tone={doctor.is_unclaimed ? 'neutral' : 'success'}>
                  {doctor.is_unclaimed ? 'To onboard' : 'Onboarded'}
                </StatusPill>
              </button>
            </li>
          ))}
        </ul>
      )}

      {results && results.length === 0 && !creating && (
        <div className="rounded-xl border border-line p-4">
          <p className="text-sm text-content">
            Nothing matches “{query}”.
          </p>
          <p className="mt-1 text-xs text-muted">
            Try the surname on its own first — most doctors are already listed,
            and a second page splits their reviews and orphans their QR code.
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-3 rounded-lg border border-line px-3 py-1.5 text-sm text-content"
          >
            Add them as a new doctor
          </button>
        </div>
      )}

      {creating && (
        <div className="space-y-3 rounded-xl border border-line p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-muted">Full name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="field" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">Specialty</span>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="field"
              >
                {SPECIALTIES.map(([slug, label]) => (
                  <option key={slug} value={slug}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">City</span>
              <input value={city} onChange={(e) => setCity(e.target.value)} className="field" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">District</span>
              <input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Maârif"
                className="field"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => void add()}
            disabled={busy || name.trim().length < 3}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create and continue'}
          </button>
        </div>
      )}
    </section>
  );
}

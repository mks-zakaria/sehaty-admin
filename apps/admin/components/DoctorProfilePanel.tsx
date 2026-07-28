'use client';

import { useEffect, useState } from 'react';
import { LocationCapture } from '@/components/LocationCapture';
import {
  ApiError,
  getDoctorProfile,
  updateDoctorProfile,
  type AdminDoctorProfile,
  type DoctorOpeningHours,
} from '@/lib/api';

/**
 * The intake half of onboarding: contact, hours and insurance.
 *
 * These three are the only fields with no other operator path — the importer
 * carries contact but an imported doctor has no login, so nobody could enter
 * hours or insurance without editing the database by hand. They are also two of
 * the seven things the Pack Présence promises in print.
 *
 * The hours grid models one shape on purpose: an optional morning range and an
 * optional afternoon range per day. That is how essentially every Moroccan
 * cabinet works, and it is far quicker to fill at a desk than a generic
 * add-a-range builder.
 */

const FIELD =
  'w-full rounded-lg border border-token bg-card px-3 py-2 text-sm text-content';
const TIME =
  'rounded-lg border border-token bg-card px-2 py-1 text-sm text-content';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const INSURERS = ['cnss', 'cnops', 'amo', 'saham', 'axa', 'wafa', 'rma', 'allianz'];

interface DayRow {
  open: boolean;
  amFrom: string;
  amTo: string;
  pmFrom: string;
  pmTo: string;
}

const BLANK: DayRow = { open: false, amFrom: '', amTo: '', pmFrom: '', pmTo: '' };

function toRows(hours: DoctorOpeningHours[]): DayRow[] {
  return DAYS.map((_, weekday) => {
    const entry = hours.find((h) => h.weekday === weekday);
    if (!entry?.ranges.length) return { ...BLANK };
    const [am, pm] = entry.ranges;
    return {
      open: true,
      amFrom: am?.[0] ?? '',
      amTo: am?.[1] ?? '',
      pmFrom: pm?.[0] ?? '',
      pmTo: pm?.[1] ?? '',
    };
  });
}

/** Incomplete ranges are dropped rather than sent — the API rejects them, and
 *  losing a whole save to one half-filled box is a miserable way to lose an
 *  operator's work at a desk. */
function toHours(rows: DayRow[]): DoctorOpeningHours[] {
  const out: DoctorOpeningHours[] = [];
  rows.forEach((row, weekday) => {
    if (!row.open) return;
    const ranges: [string, string][] = [];
    if (row.amFrom && row.amTo) ranges.push([row.amFrom, row.amTo]);
    if (row.pmFrom && row.pmTo) ranges.push([row.pmFrom, row.pmTo]);
    if (ranges.length) out.push({ weekday, ranges });
  });
  return out;
}

export function DoctorProfilePanel({ doctorId }: { doctorId: number }) {
  const [profile, setProfile] = useState<AdminDoctorProfile | null>(null);
  const [rows, setRows] = useState<DayRow[]>(() => toRows([]));
  const [insurances, setInsurances] = useState<string[]>([]);
  const [tiersPayant, setTiersPayant] = useState(false);
  const [fixe, setFixe] = useState('');
  const [mobile, setMobile] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [district, setDistrict] = useState('');
  // Held separately from `profile` so an unsaved pin is visible before it is
  // written, and so the save can tell "picked now" from "already on file".
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setSaved(false);
    setError(null);
    getDoctorProfile(doctorId)
      .then((p) => {
        if (!alive) return;
        setProfile(p);
        setRows(toRows(p.opening_hours));
        setInsurances(p.insurances);
        setTiersPayant(p.tiers_payant);
        setFixe(p.phone_fixe ?? '');
        setMobile(p.phone_mobile ?? '');
        setWhatsapp(p.whatsapp ?? '');
        setDistrict(p.district ?? '');
        setPin(null);
      })
      .catch((err) => {
        if (alive) {
          setError(err instanceof ApiError ? err.message : 'Failed to load the profile.');
        }
      });
    return () => {
      alive = false;
    };
  }, [doctorId]);

  async function save() {
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await updateDoctorProfile(doctorId, {
        district: district.trim() || null,
        phone_fixe: fixe.trim() || null,
        phone_mobile: mobile.trim() || null,
        whatsapp: whatsapp.trim() || null,
        opening_hours: toHours(rows),
        insurances,
        tiers_payant: tiersPayant,
        // Only sent when a pin was taken during this visit. Sending the stored
        // one back would re-stamp a geocoded centroid as EXACT.
        ...(pin ? { lat: pin.lat, lng: pin.lng } : {}),
      });
      setProfile(updated);
      setPin(null);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save.');
    } finally {
      setBusy(false);
    }
  }

  const update = (i: number, patch: Partial<DayRow>) =>
    setRows(rows.map((r, n) => (n === i ? { ...r, ...patch } : r)));

  if (!profile) {
    return <p className="text-sm text-muted">{error ?? 'Loading profile…'}</p>;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-content">District</span>
          <input
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="Maârif"
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-content">Landline</span>
          <input value={fixe} onChange={(e) => setFixe(e.target.value)} className={FIELD} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-content">Mobile</span>
          <input value={mobile} onChange={(e) => setMobile(e.target.value)} className={FIELD} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-content">WhatsApp</span>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className={FIELD}
          />
        </label>
      </div>

      <LocationCapture
        lat={pin?.lat ?? profile.lat}
        lng={pin?.lng ?? profile.lng}
        precision={pin ? 'EXACT' : profile.geo_precision}
        onPick={(lat, lng) => setPin({ lat, lng })}
      />

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-content">Opening hours</legend>
        <p className="mb-2 text-xs text-muted">
          Leave a day unticked to publish it as closed.
        </p>
        <div className="space-y-1.5">
          {rows.map((row, i) => (
            <div key={DAYS[i]} className="flex flex-wrap items-center gap-2">
              <label className="flex w-24 items-center gap-2 text-sm text-content">
                <input
                  type="checkbox"
                  checked={row.open}
                  onChange={(e) => update(i, { open: e.target.checked })}
                />
                {DAYS[i]}
              </label>
              {row.open && (
                <>
                  <input
                    type="time"
                    value={row.amFrom}
                    onChange={(e) => update(i, { amFrom: e.target.value })}
                    className={TIME}
                  />
                  <input
                    type="time"
                    value={row.amTo}
                    onChange={(e) => update(i, { amTo: e.target.value })}
                    className={TIME}
                  />
                  <span className="text-xs text-muted">/</span>
                  <input
                    type="time"
                    value={row.pmFrom}
                    onChange={(e) => update(i, { pmFrom: e.target.value })}
                    className={TIME}
                  />
                  <input
                    type="time"
                    value={row.pmTo}
                    onChange={(e) => update(i, { pmTo: e.target.value })}
                    className={TIME}
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-content">Accepted insurance</legend>
        <div className="flex flex-wrap gap-2">
          {INSURERS.map((code) => {
            const active = insurances.includes(code);
            return (
              <button
                key={code}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setInsurances(
                    active ? insurances.filter((c) => c !== code) : [...insurances, code],
                  )
                }
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  active
                    ? 'bg-brand-600 text-white'
                    : 'border border-token text-content'
                }`}
              >
                {code.toUpperCase()}
              </button>
            );
          })}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-content">
          <input
            type="checkbox"
            checked={tiersPayant}
            onChange={(e) => setTiersPayant(e.target.checked)}
          />
          Tiers payant accepted
        </label>
      </fieldset>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {saved && <p className="text-sm text-emerald-500">Saved.</p>}

      <button
        type="button"
        onClick={() => void save()}
        disabled={busy}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Save profile'}
      </button>
    </div>
  );
}

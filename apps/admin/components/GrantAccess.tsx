'use client';

import { useState } from 'react';
import { ApiError, grantDoctorAccess, type AccessGrant } from '@/lib/api';

/**
 * The last step of an onboarding visit: hand the doctor a login.
 *
 * A page published from a public directory has a placeholder address and no
 * password, because nobody had spoken to that doctor. Selling them the agenda
 * without this leaves them unable to open it — and the obvious workaround,
 * registering them as a new doctor, mints a *second* page under a different
 * slug and orphans the QR plaque already on their wall.
 *
 * So this attaches credentials to the page that exists. Nothing about the
 * published page changes except that it is now theirs.
 *
 * The password is shown once, in the cabinet, to be typed in front of them.
 * There is no email delivery yet, and pretending otherwise would leave a doctor
 * waiting for a message that never arrives.
 */

const FIELD = 'field';

/** Readable, typable on a phone keyboard, and not worth guessing. */
function suggestPassword(): string {
  const words = ['cabinet', 'agenda', 'consult', 'patient', 'clinique'];
  const word = words[Math.floor(Math.random() * words.length)];
  return `${word}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function GrantAccess({ doctorId, slug }: { doctorId: number; slug: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(suggestPassword);
  const [granted, setGranted] = useState<AccessGrant | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      setGranted(await grantDoctorAccess(doctorId, email.trim(), password));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the login.');
    } finally {
      setBusy(false);
    }
  }

  if (granted) {
    return (
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-content">Doctor login</legend>
        <p className="text-sm text-emerald-500">
          {granted.full_name} can now sign in — page {granted.slug} unchanged.
        </p>
        {/* Shown once, to be typed in front of them before you leave. */}
        <div className="mt-2 rounded-lg border border-line bg-surface p-3 text-sm">
          <div dir="ltr">
            <strong>{granted.email}</strong>
          </div>
          <div dir="ltr" className="font-mono">
            {password}
          </div>
          <p className="mt-2 text-xs text-muted">
            Write this down now — it is not stored and cannot be shown again.
            Have them change it once they are logged in.
          </p>
        </div>
      </fieldset>
    );
  }

  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium text-content">Doctor login</legend>
      <p className="mb-2 text-xs text-muted">
        Their real address — this replaces the import placeholder and becomes
        how they sign in.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="dr.nom@gmail.com"
            className={FIELD}
            dir="ltr"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Temporary password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={FIELD}
            dir="ltr"
          />
        </label>
      </div>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy || !email.trim() || password.length < 8}
        className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Creating…' : `Create login for ${slug}`}
      </button>
    </fieldset>
  );
}

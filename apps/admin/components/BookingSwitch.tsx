'use client';

import { useEffect, useState } from 'react';
import {
  ApiError,
  getBookingState,
  setBookingEnabled,
  type BookingState,
} from '@/lib/api';
import { StatusPill } from '@/components/ui';

/**
 * Online appointments, on or off, for this cabinet.
 *
 * The other half of the sale. A doctor either wants an agenda or does not, and
 * that is a conversation held once, at the desk, with them in front of you — so
 * the switch lives in the visit rather than on a billing screen someone visits
 * afterwards.
 *
 * Two things it deliberately does not hide:
 *
 * - **Switching on can fail to open the agenda.** For a doctor whose
 *   subscription lapsed, "on" clears the block and still leaves booking shut.
 *   The panel reports what the server came back with, never what was clicked,
 *   because an operator who promises an agenda that never appears has sold a
 *   refund.
 * - **Off is not the same as unpaid.** A cabinet that takes walk-ins keeps
 *   paying for everything else; saying "switched off by staff" instead of
 *   "unpaid" is what stops them being chased for money that changes nothing.
 */

/** What each reason means to whoever is standing in the cabinet. */
const REASONS: Record<BookingState['reason'], string> = {
  active: 'Taking online appointments.',
  no_subscription:
    'Never subscribed — switching on starts their 3 free months.',
  expired: 'Subscription ended. A payment reopens the agenda, this switch will not.',
  cancelled: 'Cancelled and the paid period is over. Booking stays shut until they resubscribe.',
  past_due: 'Payment overdue. Booking closes when the grace period ends.',
  switched_off: 'Switched off by staff — not a payment problem.',
};

export function BookingSwitch({ doctorId }: { doctorId: number }) {
  const [state, setState] = useState<BookingState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getBookingState(doctorId).then(
      (s) => live && setState(s),
      (err) =>
        live &&
        setError(err instanceof ApiError ? err.message : 'Could not read the agenda state.'),
    );
    return () => {
      live = false;
    };
  }, [doctorId]);

  async function toggle(enabled: boolean) {
    setBusy(true);
    setError(null);
    try {
      setState(await setBookingEnabled(doctorId, enabled));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change the agenda.');
    } finally {
      setBusy(false);
    }
  }

  const open = state?.booking_enabled === true;
  // "On" is what the operator asked for; `booking_enabled` is what they got.
  // They differ for a lapsed doctor, and the difference is the whole point.
  const asked = state ? !state.manually_disabled : false;

  return (
    <section className="rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-content">Online appointments</h3>
          <p className="text-xs text-content-muted">
            {state ? REASONS[state.reason] : 'Reading the agenda state…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone={open ? 'success' : 'neutral'}>
            {open ? 'Agenda open' : 'Agenda closed'}
          </StatusPill>
          <button
            type="button"
            onClick={() => void toggle(!asked)}
            disabled={busy || state === null}
            aria-pressed={asked}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${
              asked
                ? 'border border-line text-content'
                : 'bg-brand text-on-brand'
            }`}
          >
            {busy ? 'Saving…' : asked ? 'Switch off' : 'Switch on'}
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {/* The one case where the button did not do what it looks like it did. */}
      {state && asked && !open && (
        <p className="mt-3 rounded-lg border border-line px-3 py-2 text-xs text-content">
          The block is cleared, but their agenda is still shut:{' '}
          <span className="font-medium">{REASONS[state.reason]}</span> Take the payment before
          promising online appointments.
        </p>
      )}

      {state?.current_period_end && (
        <p className="mt-2 text-xs text-content-muted">
          Paid through {new Date(state.current_period_end).toLocaleDateString('fr-MA')}
          {state.in_grace_period ? ' — in the grace period.' : ''}
        </p>
      )}
    </section>
  );
}

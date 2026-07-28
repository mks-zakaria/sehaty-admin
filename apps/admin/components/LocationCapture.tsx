'use client';

import { useState } from 'react';

/**
 * Pin the cabinet, from outside the cabinet.
 *
 * Imported doctors are geocoded from a written address, and Moroccan cabinet
 * addresses are lotissement-and-block references no map database holds — every
 * cabinet in Errahma resolves to one shared town centroid. That pin is fine for
 * "près de chez moi" and useless for navigation, so the public page refuses to
 * build directions from it.
 *
 * The onboarding visit is the one moment an exact pin is free: the operator is
 * physically at the door with a GPS in their pocket. One tap here is worth more
 * than any amount of address parsing.
 *
 * Accuracy is shown rather than hidden, because it is the one number that says
 * whether the reading can be trusted — a few metres standing at the door, a few
 * hundred indoors or on a poor signal, and kilometres if the button is tapped
 * from somewhere else entirely. The operator knows where they are standing; the
 * software cannot, so it reports and lets them judge.
 */

/** Above this, the reading is more likely the building next door than the door. */
const SHAKY_ACCURACY_M = 60;

interface Props {
  lat: number | null;
  lng: number | null;
  precision: string | null;
  onPick: (lat: number, lng: number) => void;
}

export function LocationCapture({ lat, lng, precision, onPick }: Props) {
  const [busy, setBusy] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const approximate = precision === 'APPROXIMATE';
  const hasPin = lat != null && lng != null;

  function useMyPosition() {
    if (!navigator.geolocation) {
      setError('This browser has no location support.');
      return;
    }
    setBusy(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAccuracy(position.coords.accuracy);
        onPick(position.coords.latitude, position.coords.longitude);
        setBusy(false);
      },
      (err) => {
        // The permission case is worth naming: the operator can fix it, and
        // "unknown error" would send them looking in the wrong place.
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission refused — allow it for this site and retry.'
            : 'Could not get a position. Try again outside the building.',
        );
        setBusy(false);
      },
      // No cached fix: a stale position from the previous cabinet is exactly
      // the wrong answer, and worth the extra seconds to avoid.
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium text-content">Cabinet location</legend>
      <p className="mb-2 text-xs text-muted">
        {hasPin && !approximate
          ? 'Exact pin on file.'
          : approximate
            ? 'Only an approximate pin from the address — the public page will not give directions to it.'
            : 'No pin yet, so this doctor is invisible to “near me” search.'}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={useMyPosition}
          disabled={busy}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Locating…' : 'Use my position'}
        </button>

        {hasPin && (
          <span className="text-xs text-muted" dir="ltr">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </span>
        )}

        {hasPin && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-content underline"
          >
            Check on map
          </a>
        )}
      </div>

      {accuracy != null && (
        <p className="mt-2 text-xs text-muted">
          Read to ±{Math.round(accuracy)} m.
          {accuracy > SHAKY_ACCURACY_M &&
            ' That is loose for a doorway — step outside and take it again before saving.'}
        </p>
      )}

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </fieldset>
  );
}

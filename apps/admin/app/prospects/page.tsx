'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConsoleShell } from '@/components/ConsoleShell';
import {
  EmptyState,
  ErrorState,
  PageHeader,
  StatusPill,
  TableSkeleton,
  type PillTone,
} from '@/components/ui';
import {
  ApiError,
  getProspects,
  getToken,
  type ProspectBoard,
  type ProspectRow,
} from '@/lib/api';

/**
 * The field list — the screen to work a quartier from.
 *
 * The billing board next door can only see doctors who have a subscription, so
 * every imported page is invisible to it. Those pages *are* the pipeline: the
 * doctor does not know the page exists yet, and the visit is the product.
 *
 * Ordered district-then-name by the server so the list reads as a route rather
 * than a database dump. Two states carry the whole visit:
 *
 *   - **onboarded** — has this conversation already happened?
 *   - **plan** — free landing page, or landing plus the booking engine they pay
 *     monthly for. Not paying is a normal steady state, not a failure: the page
 *     is free forever. The tier says which conversation to have.
 *
 * Driving is a first-class mode. Imported rows have no coordinates, so every
 * Maps link is built from `maps_query`, which the server fills with coordinates
 * when it has them and the written address when it does not.
 */

/** Google caps the directions URL at 9 intermediate stops, so 10 in total. */
const MAX_ROUTE_STOPS = 10;

function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Multi-stop driving directions, starting from wherever the phone is. */
function mapsRouteUrl(queries: string[]): string {
  const stops = queries.slice(0, MAX_ROUTE_STOPS);
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(0, -1);
  const params = new URLSearchParams({ api: '1', destination, travelmode: 'driving' });
  if (waypoints.length) params.set('waypoints', waypoints.join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

const PLAN_LABEL: Record<ProspectRow['plan'], string> = {
  landing: 'Page seule',
  landing_rdv: 'Page + RDV',
};

const PLAN_TONE: Record<ProspectRow['plan'], PillTone> = {
  landing: 'neutral',
  landing_rdv: 'success',
};

function claimTone(status: string): PillTone {
  if (status === 'VERIFIED') return 'success';
  if (status === 'CLAIMED') return 'brand';
  return 'neutral';
}

const FIELD =
  'rounded-lg border border-token bg-card px-3 py-1.5 text-sm text-content';

export default function ProspectsPage() {
  const router = useRouter();
  const [board, setBoard] = useState<ProspectBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [district, setDistrict] = useState('');
  const [onboarded, setOnboarded] = useState<'' | 'yes' | 'no'>('');
  const [plan, setPlan] = useState<'' | 'landing' | 'landing_rdv'>('');
  const [picked, setPicked] = useState<number[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBoard(
        await getProspects({
          district: district || undefined,
          onboarded: onboarded === '' ? undefined : onboarded === 'yes',
          plan: plan || undefined,
        }),
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login');
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Could not load the field list.');
    } finally {
      setLoading(false);
    }
  }, [district, onboarded, plan, router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    void load();
  }, [load, router]);

  const rows = board?.rows ?? [];

  // Route order follows the list, which is already grouped by district — the
  // order you would drive it, not the order you happened to tick the boxes.
  const routeStops = useMemo(
    () => rows.filter((r) => picked.includes(r.doctor_id)).map((r) => r.maps_query),
    [rows, picked],
  );

  const toggle = (id: number) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]));

  return (
    <ConsoleShell>
      <PageHeader
        title="Field list"
        description="Every doctor on the platform, where they stand, and how to drive there."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className={FIELD}
        >
          <option value="">All districts</option>
          {(board?.districts ?? []).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          value={onboarded}
          onChange={(e) => setOnboarded(e.target.value as typeof onboarded)}
          className={FIELD}
        >
          <option value="">Onboarded &amp; not</option>
          <option value="no">Not onboarded yet</option>
          <option value="yes">Onboarded</option>
        </select>

        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as typeof plan)}
          className={FIELD}
        >
          <option value="">Every plan</option>
          <option value="landing">Page seule</option>
          <option value="landing_rdv">Page + RDV</option>
        </select>

        {board && (
          <span className="text-sm text-muted">
            {board.total} listed · {board.onboarded} onboarded · {board.paying} paying
          </span>
        )}

        {picked.length > 0 && (
          <a
            href={mapsRouteUrl(routeStops)}
            target="_blank"
            rel="noopener noreferrer"
            className="ms-auto rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white"
          >
            Drive {Math.min(picked.length, MAX_ROUTE_STOPS)} stops
            {/* Never silently drop stops: say so when the cap bites. */}
            {picked.length > MAX_ROUTE_STOPS && ` (first ${MAX_ROUTE_STOPS} of ${picked.length})`}
          </a>
        )}
      </div>

      {loading && <TableSkeleton rows={6} />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          title="Nobody here yet"
          hint="Import a prospect list, or widen the filters."
        />
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-token">
          <table className="w-full min-w-[62rem] text-sm">
            <thead className="bg-surface-subtle text-left text-xs uppercase text-muted">
              <tr>
                <th className="w-10 px-3 py-2" />
                <th className="px-3 py-2">Doctor</th>
                <th className="px-3 py-2">Where</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.doctor_id} className="border-t border-token align-top">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Add ${row.full_name} to the route`}
                      checked={picked.includes(row.doctor_id)}
                      onChange={() => toggle(row.doctor_id)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-content">{row.full_name}</div>
                    <div className="text-xs text-muted">{row.specialty ?? '—'}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-content">{row.district ?? row.city ?? '—'}</div>
                    <div className="max-w-xs text-xs text-muted">{row.address ?? '—'}</div>
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill tone={claimTone(row.claim_status)}>
                      {row.onboarded ? 'Onboarded' : 'To visit'}
                    </StatusPill>
                    {row.source === 'IMPORT' && (
                      <div className="mt-1 text-xs text-muted">imported</div>
                    )}
                    {/* The visit is the only cheap chance to fix this, so it
                        has to be visible before setting off, not after. */}
                    {row.needs_pin && (
                      <div className="mt-1 text-xs text-warning">needs a pin</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill tone={PLAN_TONE[row.plan]}>{PLAN_LABEL[row.plan]}</StatusPill>
                    {row.is_personalized && (
                      <div className="mt-1 text-xs text-muted">Pack Présence</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs" dir="ltr">
                    {row.phone_fixe || row.phone_mobile ? (
                      <a
                        href={`tel:${row.phone_mobile ?? row.phone_fixe}`}
                        className="text-content underline"
                      >
                        {row.phone_mobile ?? row.phone_fixe}
                      </a>
                    ) : (
                      <span className="text-muted">no number</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2 text-xs">
                      <a
                        href={mapsSearchUrl(row.maps_query)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-token px-2 py-1 text-content"
                      >
                        Maps
                      </a>
                      <a
                        href={`/landing?doctor=${row.doctor_id}`}
                        className="rounded-lg border border-token px-2 py-1 text-content"
                      >
                        Page
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ConsoleShell>
  );
}

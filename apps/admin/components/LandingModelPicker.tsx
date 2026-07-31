'use client';

import { useEffect, useState } from 'react';
import {
  ApiError,
  getLandingConfig,
  listLandingLayouts,
  updateLandingConfig,
  type LandingConfig,
} from '@/lib/api';
import { doctorPageUrl } from '@/lib/landing';
import { StatusPill } from '@/components/ui';

/**
 * Which of the four page designs this doctor gets.
 *
 * This belongs in the visit, not on a settings screen, because it is the one part
 * of the product the doctor can see and have an opinion about. "Which of these do
 * you prefer" is a better fifteen minutes than any feature list, and the answer
 * takes one tap — so the choice saves immediately rather than behind a Save
 * button that gets forgotten while the operator moves on to the opening hours.
 *
 * The design is separate from the specialty template on purpose: the template
 * decides *which sections* a dentist page has and is inherited, this decides what
 * the page *looks like*. Nothing here can lose a doctor a section.
 *
 * The thumbnails are schematic on purpose. A real screenshot would be four
 * images to keep in sync with the landing app, and it would be illegible at this
 * size anyway; what an operator needs to convey across a desk is the shape.
 */

interface Model {
  name: string;
  blurb: string;
  thumb: React.ReactNode;
}

/** A schematic of each design: bars for text, circles for the photo. */
const BAR = 'rounded-sm bg-brand/25';
const PANEL = 'rounded bg-brand/10';

const MODELS: Record<string, Model> = {
  classic: {
    name: 'Classic',
    blurb:
      'One card, photo beside the name. What every page already looks like — the safe choice.',
    thumb: (
      <div className="flex h-full flex-col gap-1.5 rounded bg-surface-card p-2">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-brand/30" />
          <div className="flex-1 space-y-1">
            <div className={`h-1.5 w-full ${BAR}`} />
            <div className={`h-1 w-2/3 ${BAR}`} />
          </div>
        </div>
        <div className={`h-3 w-full ${PANEL}`} />
        <div className={`h-1 w-full ${BAR}`} />
        <div className={`h-1 w-5/6 ${BAR}`} />
        <div className={`h-1 w-full ${BAR}`} />
      </div>
    ),
  },
  editorial: {
    name: 'Editorial',
    blurb:
      'Large centred portrait on a coloured band, then one wide column. The page that looks bought.',
    thumb: (
      <div className="flex h-full flex-col rounded bg-surface-card">
        <div className="flex flex-col items-center gap-1 rounded-t bg-brand/15 px-2 py-2">
          <div className="h-6 w-6 rounded-full bg-brand/35" />
          <div className={`h-1.5 w-2/3 ${BAR}`} />
          <div className={`h-1 w-1/3 ${BAR}`} />
        </div>
        <div className="flex-1 space-y-1 p-2">
          <div className={`h-1 w-full ${BAR}`} />
          <div className={`h-1 w-full ${BAR}`} />
          <div className={`h-1 w-4/5 ${BAR}`} />
        </div>
      </div>
    ),
  },
  compact: {
    name: 'Compact',
    blurb:
      'Dense and phone-first: number, address and today’s hours without scrolling.',
    thumb: (
      <div className="flex h-full flex-col gap-1 rounded bg-surface-card p-2">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-brand/30" />
          <div className={`h-1.5 flex-1 ${BAR}`} />
        </div>
        <div className={`h-2 w-full ${PANEL}`} />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`h-0.5 w-full ${BAR}`} />
        ))}
      </div>
    ),
  },
  clinique: {
    name: 'Clinique',
    blurb:
      'Two columns — address, hours and phone pinned in a side panel that stays put.',
    thumb: (
      <div className="flex h-full gap-1.5 rounded bg-surface-card p-2">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded bg-brand/30" />
            <div className={`h-1.5 flex-1 ${BAR}`} />
          </div>
          <div className={`h-1 w-full ${BAR}`} />
          <div className={`h-1 w-3/4 ${BAR}`} />
          <div className={`h-1 w-full ${BAR}`} />
        </div>
        <div className={`w-1/3 ${PANEL}`} />
      </div>
    ),
  },
};

function describe(key: string): Model {
  // A design the console has not been taught about is still offered rather than
  // hidden: the API is the authority on what the landing app can render.
  return MODELS[key] ?? { name: key, blurb: '', thumb: null };
}

export function LandingModelPicker({
  doctorId,
  slug,
}: {
  doctorId: number;
  slug: string;
}) {
  const [layouts, setLayouts] = useState<string[]>([]);
  const [config, setConfig] = useState<LandingConfig | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([listLandingLayouts(), getLandingConfig(doctorId)])
      .then(([offered, current]) => {
        if (!live) return;
        setLayouts(offered);
        setConfig(current);
      })
      .catch((err) =>
        live
          ? setError(err instanceof ApiError ? err.message : 'Could not load the designs.')
          : undefined,
      );
    return () => {
      live = false;
    };
  }, [doctorId]);

  async function choose(layout: string) {
    if (layout === config?.layout) return;
    setBusy(layout);
    setError(null);
    try {
      setConfig(await updateLandingConfig(doctorId, { layout }));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not change the design.',
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-content">Page design</h3>
          <p className="text-xs text-content-muted">
            Show them on your phone and let them pick. Saves as you tap.
          </p>
        </div>
        <a
          href={doctorPageUrl(slug)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-content"
        >
          Open their page ↗
        </a>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {layouts.map((key) => {
          const model = describe(key);
          const chosen = config?.layout === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => void choose(key)}
              aria-pressed={chosen}
              disabled={busy !== null}
              className={`rounded-xl border p-3 text-left transition-colors disabled:opacity-60 ${
                chosen ? 'border-brand bg-brand/5' : 'border-line hover:bg-surface'
              }`}
            >
              <div className="h-24 overflow-hidden rounded-lg border border-line bg-surface p-1">
                {model.thumb}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-content">{model.name}</span>
                {busy === key ? (
                  <StatusPill tone="neutral">Saving…</StatusPill>
                ) : chosen ? (
                  <StatusPill tone="success">
                    {/* An inherited default is live too, and saying which is
                        which stops an operator "fixing" a page nobody set. */}
                    {config?.layout_is_default ? 'Default' : 'Live'}
                  </StatusPill>
                ) : null}
              </div>
              {model.blurb && (
                <p className="mt-1 text-xs leading-snug text-content-muted">{model.blurb}</p>
              )}
            </button>
          );
        })}
      </div>

      {/* The template is a separate, inherited decision — worth stating here,
          because "why is this dentist's page acts-first" is otherwise a question
          the design picker looks like it should answer. */}
      {config && (
        <p className="mt-3 text-xs text-content-muted">
          Sections come from the{' '}
          <span className="font-medium text-content">{config.template}</span> template
          {config.template_is_default ? ' (from their specialty)' : ' (chosen)'} — the
          design changes how the page looks, never what is on it.
        </p>
      )}
    </section>
  );
}

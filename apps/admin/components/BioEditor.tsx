'use client';

import { useEffect, useState } from 'react';
import { ApiError, getChatbotStatus, translateBio } from '@/lib/api';

/**
 * The doctor's presentation, in each language the page renders.
 *
 * Written per language rather than translated once: a Darija presentation and a
 * French one read differently, and a page that shows French prose under an
 * Arabic heading looks like nobody checked.
 *
 * The translate button drafts the other two from whichever the doctor actually
 * dictated. It fills the boxes and stops there — the operator reads it before
 * anything is saved, because a doctor's public page is a poor place to discover
 * a machine wrote something odd in a language you cannot read. The button hides
 * entirely when no key is configured, rather than offering something that
 * cannot work.
 */

const LANGS = [
  ['fr', 'Français', 'ltr'],
  ['ar', 'العربية', 'rtl'],
  ['ary', 'الدارجة', 'rtl'],
] as const;

type Bio = Record<string, string>;

export function BioEditor({
  value,
  onChange,
}: {
  value: Bio;
  onChange: (next: Bio) => void;
}) {
  const [source, setSource] = useState<string>('fr');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canTranslate, setCanTranslate] = useState(false);

  useEffect(() => {
    getChatbotStatus()
      .then((s) => setCanTranslate(s.available))
      .catch(() => setCanTranslate(false));
  }, []);

  async function draft() {
    const text = (value[source] ?? '').trim();
    if (text.length < 10) return;
    setBusy(true);
    setError(null);
    try {
      const drafted = await translateBio(text, source);
      // Only fill what is empty. An operator who has already corrected a
      // translation should not lose it to a second click.
      onChange({
        fr: value.fr?.trim() || drafted.fr || '',
        ar: value.ar?.trim() || drafted.ar || '',
        ary: value.ary?.trim() || drafted.ary || '',
      });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 503
          ? 'The assistant has no API key yet — type the other languages by hand.'
          : 'Could not draft the translations.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-sm font-medium text-content">Presentation</legend>
      <p className="text-xs text-muted">
        What the doctor wants patients to read. Factual — the Ordre restricts
        promotional claims, and it is the doctor who answers for them.
      </p>

      {LANGS.map(([code, label, dir]) => (
        <label key={code} className="block">
          <span className="mb-1 flex items-center gap-2 text-xs text-muted">
            {label}
            {(value[code] ?? '').trim().length > 0 && (
              <span className="text-success">•</span>
            )}
          </span>
          <textarea
            dir={dir}
            rows={3}
            value={value[code] ?? ''}
            onChange={(e) => onChange({ ...value, [code]: e.target.value })}
            onFocus={() => setSource(code)}
            placeholder={
              code === 'fr'
                ? 'Chirurgien-dentiste au Maârif depuis 2016…'
                : undefined
            }
            className="field"
          />
        </label>
      ))}

      {canTranslate && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void draft()}
            disabled={busy || (value[source] ?? '').trim().length < 10}
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-content disabled:opacity-50"
          >
            {busy ? 'Drafting…' : `Draft the other languages from ${source.toUpperCase()}`}
          </button>
          <span className="text-xs text-muted">
            Fills empty boxes only — read them before saving.
          </span>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </fieldset>
  );
}

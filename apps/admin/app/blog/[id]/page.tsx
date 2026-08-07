'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Spinner } from '@sehaty/ui';
import { ConsoleShell } from '@/components/ConsoleShell';
import { Banner, ErrorState, PageHeader, StatusPill } from '@/components/ui';
import {
  ApiError,
  createArticle,
  editArticle,
  getToken,
  listArticles,
  reviewArticle,
  type Article,
  type ArticleSource,
} from '@/lib/api';
import {
  blankImage,
  blankText,
  move,
  sectionLabel,
  toMarkdown,
  toSections,
  type Section,
} from '@/lib/sections';

/**
 * The article editor.
 *
 * Blocks on screen, markdown in the database. See `lib/sections.ts` for why:
 * everything downstream — the renderer, the JSON-LD, the FAQ extractor, the
 * drafter, the verbatim check — reads `body` as one markdown string, and the
 * editing experience does not need the storage to change to feel like blocks.
 */

const SPECIALTIES = [
  'generalist',
  'cardiology',
  'dentistry',
  'dermatology',
  'gynecology',
  'ophthalmology',
  'orthopedics',
  'otolaryngology',
  'pediatrics',
  'psychiatry',
];

const LOCALES = [
  ['fr', 'Français'],
  ['ar', 'العربية'],
  ['ary', 'الدارجة'],
  ['en', 'English'],
];

export default function ArticleEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = params.id === 'new';

  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [locale, setLocale] = useState('fr');
  const [specialty, setSpecialty] = useState('generalist');
  const [sections, setSections] = useState<Section[]>([blankText()]);
  const [sources, setSources] = useState<ArticleSource[]>([{ work: '', locator: null }]);

  const load = useCallback(async () => {
    if (isNew || !getToken()) return;
    setError(null);
    try {
      // No GET /admin/articles/{id}, so find it in the list. Cheap enough at
      // this scale, and one endpoint fewer to keep in step.
      const all = await listArticles({ limit: 200 });
      const found = all.find((a) => String(a.id) === params.id);
      if (!found) {
        setError('No article with that id.');
        return;
      }
      setArticle(found);
      setTitle(found.title);
      setSummary(found.summary ?? '');
      setLocale(found.locale);
      setSpecialty(found.specialty_slug ?? 'generalist');
      setSections(toSections(found.body));
      setSources(found.sources.length ? found.sources : [{ work: '', locator: null }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the article.');
    }
  }, [isNew, params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const body = useMemo(() => toMarkdown(sections), [sections]);
  const bodyChanged = article !== null && body !== article.body;
  const words = body.split(/\s+/).filter(Boolean).length;

  async function save() {
    setSaving(true);
    try {
      const cited = sources.filter((s) => s.work.trim());
      if (isNew) {
        const created = await createArticle({
          title,
          body,
          summary: summary || undefined,
          locale,
          specialty_slug: specialty,
          sources: cited,
        });
        router.push(`/blog/${created.id}`);
        return;
      }
      const updated = await editArticle(article!.id, {
        title,
        summary,
        locale,
        specialty_slug: specialty,
        // Only send the body when it actually changed: sending it unchanged
        // would still be an edit, and an edit to the body costs the article
        // its doctors' signatures.
        ...(bodyChanged ? { body } : {}),
        sources: cited,
      });
      setArticle(updated);
      setSections(toSections(updated.body));
      setToast({ kind: 'success', message: 'Saved.' });
    } catch (err) {
      setToast({
        kind: 'error',
        message: err instanceof ApiError ? err.message : 'Could not save.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (!article) return;
    setSaving(true);
    try {
      setArticle(await reviewArticle(article.id, true));
      setToast({ kind: 'success', message: 'Published.' });
    } catch (err) {
      setToast({
        kind: 'error',
        message: err instanceof ApiError ? err.message : 'Could not publish.',
      });
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <ConsoleShell>
        <ErrorState message={error} onRetry={load} />
      </ConsoleShell>
    );
  }

  return (
    <ConsoleShell>
      <PageHeader
        title={isNew ? 'New article' : title || 'Article'}
        description={
          article
            ? `${article.slug} · ${words} words`
            : 'Written from the literature, for a doctor to sign.'
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/blog">
              <Button variant="ghost">Back</Button>
            </Link>
            {article && article.status !== 'PUBLISHED' && (
              <Button variant="secondary" disabled={saving} onClick={publish}>
                Publish
              </Button>
            )}
            <Button disabled={saving || !title.trim()} onClick={save}>
              {saving ? <Spinner /> : 'Save'}
            </Button>
          </div>
        }
      />

      {toast && <Banner kind={toast.kind}>{toast.message}</Banner>}

      {/* The one consequence of this screen that is not obvious from it. */}
      {bodyChanged && article && article.validations.length > 0 && (
        <Banner kind="error">
          {article.validations.length === 1
            ? '1 doctor has signed this article. '
            : `${article.validations.length} doctors have signed this article. `}
          Saving a changed body removes their signatures — they put their name to
          the words as they were, and cannot be asked about the new ones.
        </Banner>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-4">
            <label className="flex flex-col gap-1 text-xs text-content-muted">
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-lg border border-line bg-surface-card px-3 py-2 text-base font-medium text-content"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-content-muted">
              Summary — the line someone forwards on WhatsApp
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={2}
                maxLength={200}
                className="rounded-lg border border-line bg-surface-card px-3 py-2 text-sm text-content"
              />
              <span className="text-right text-[11px]">{summary.length}/200</span>
            </label>
          </Card>

          {sections.map((section, index) => (
            <Card key={section.id} className="p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium uppercase tracking-wide text-content-muted">
                  {section.kind === 'image' ? 'Image' : 'Text'} · {sectionLabel(section)}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    aria-label="Move up"
                    onClick={() => setSections(move(sections, index, -1))}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label="Move down"
                    onClick={() => setSections(move(sections, index, 1))}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="danger"
                    aria-label="Remove block"
                    onClick={() =>
                      setSections(sections.filter((s) => s.id !== section.id))
                    }
                  >
                    ✕
                  </Button>
                </div>
              </div>

              {section.kind === 'text' ? (
                <textarea
                  value={section.value}
                  rows={Math.max(4, section.value.split('\n').length + 1)}
                  onChange={(e) =>
                    setSections(
                      sections.map((s) =>
                        s.id === section.id ? { ...s, value: e.target.value } : s,
                      ),
                    )
                  }
                  className="w-full rounded-lg border border-line bg-surface-card px-3 py-2 font-mono text-sm text-content"
                  placeholder="## A question the reader would ask next…"
                />
              ) : (
                <div className="flex flex-col gap-2">
                  <input
                    value={section.url}
                    onChange={(e) =>
                      setSections(
                        sections.map((s) =>
                          s.id === section.id ? { ...s, url: e.target.value } : s,
                        ),
                      )
                    }
                    placeholder="https://… (image URL)"
                    className="rounded-lg border border-line bg-surface-card px-3 py-2 text-sm text-content"
                  />
                  <input
                    value={section.alt}
                    onChange={(e) =>
                      setSections(
                        sections.map((s) =>
                          s.id === section.id ? { ...s, alt: e.target.value } : s,
                        ),
                      )
                    }
                    placeholder="What the picture shows, for a screen reader"
                    className="rounded-lg border border-line bg-surface-card px-3 py-2 text-sm text-content"
                  />
                  {section.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={section.url}
                      alt={section.alt}
                      className="max-h-56 rounded-lg border border-line object-contain"
                    />
                  )}
                </div>
              )}
            </Card>
          ))}

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setSections([...sections, blankText()])}>
              Add text
            </Button>
            <Button variant="secondary" onClick={() => setSections([...sections, blankImage()])}>
              Add image
            </Button>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-4">
            {article && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-content-muted">Status</span>
                <StatusPill
                  tone={article.status === 'PUBLISHED' ? 'success' : 'neutral'}
                >
                  {article.status.toLowerCase()}
                </StatusPill>
              </div>
            )}
            <label className="flex flex-col gap-1 text-xs text-content-muted">
              Language
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="rounded-lg border border-line bg-surface-card px-3 py-2 text-sm text-content"
              >
                {LOCALES.map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-content-muted">
              Specialty
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="rounded-lg border border-line bg-surface-card px-3 py-2 text-sm text-content"
              >
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </Card>

          <Card className="flex flex-col gap-2 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-content-muted">
              Sources
            </p>
            {/* Required, not decorative: an article about a disease that cites
                nothing gives the doctor being asked to sign it nothing to check. */}
            {sources.map((source, index) => (
              <div key={index} className="flex flex-col gap-1">
                <input
                  value={source.work}
                  onChange={(e) =>
                    setSources(
                      sources.map((s, i) =>
                        i === index ? { ...s, work: e.target.value } : s,
                      ),
                    )
                  }
                  placeholder="Work"
                  className="rounded-lg border border-line bg-surface-card px-3 py-2 text-sm text-content"
                />
                <input
                  value={source.locator ?? ''}
                  onChange={(e) =>
                    setSources(
                      sources.map((s, i) =>
                        i === index ? { ...s, locator: e.target.value || null } : s,
                      ),
                    )
                  }
                  placeholder="Chapter, page…"
                  className="rounded-lg border border-line bg-surface-card px-3 py-2 text-xs text-content"
                />
              </div>
            ))}
            <Button
              variant="ghost"
              onClick={() => setSources([...sources, { work: '', locator: null }])}
            >
              Add source
            </Button>
          </Card>

          {article && article.validations.length > 0 && (
            <Card className="flex flex-col gap-2 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-content-muted">
                Signed by
              </p>
              {article.validations.map((v) => (
                <div key={v.doctor_id} className="text-sm text-content">
                  {v.full_name}
                  <span className="ml-2 text-xs text-content-muted">
                    {v.verdict.toLowerCase()}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </aside>
      </div>
    </ConsoleShell>
  );
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Spinner } from '@sehaty/ui';
import { ConsoleShell } from '@/components/ConsoleShell';
import {
  Banner,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  StatusPill,
  TableSkeleton,
  type PillTone,
} from '@/components/ui';
import {
  ApiError,
  deleteArticle,
  getToken,
  listArticles,
  reviewArticle,
  type Article,
  type ArticleStatus,
} from '@/lib/api';

/**
 * The blog, as an editor sees it.
 *
 * The review queue at `/moderation` answers "what is waiting on me"; this is
 * the other question — everything, including the hundred drafts the generator
 * wrote that nobody has opened.
 */

const STATUS_TONE: Record<ArticleStatus, PillTone> = {
  DRAFT: 'neutral',
  PENDING: 'warning',
  PUBLISHED: 'success',
  REJECTED: 'danger',
};

const LOCALE_LABEL: Record<string, string> = {
  fr: 'Français',
  ar: 'العربية',
  ary: 'الدارجة',
  en: 'English',
};

type Toast = { kind: 'success' | 'error'; message: string };

export default function BlogPage() {
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'' | ArticleStatus>('');
  const [locale, setLocale] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<Toast | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Article | null>(null);

  const load = useCallback(async () => {
    if (!getToken()) return;
    setError(null);
    try {
      setArticles(
        await listArticles({
          status: status || undefined,
          locale: locale || undefined,
          search: search || undefined,
          limit: 200,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the articles.');
      setArticles([]);
    }
  }, [status, locale, search]);

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  async function publish(article: Article) {
    setBusy(article.id);
    try {
      await reviewArticle(article.id, true);
      setToast({ kind: 'success', message: `“${article.title}” is live.` });
      await load();
    } catch (err) {
      setToast({
        kind: 'error',
        message: err instanceof ApiError ? err.message : 'Could not publish it.',
      });
    } finally {
      setBusy(null);
    }
  }

  async function remove(article: Article) {
    setBusy(article.id);
    try {
      await deleteArticle(article.id);
      setToast({ kind: 'success', message: `“${article.title}” deleted.` });
      setPendingDelete(null);
      await load();
    } catch (err) {
      setToast({
        kind: 'error',
        message: err instanceof ApiError ? err.message : 'Could not delete it.',
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <ConsoleShell>
      <PageHeader
        title="Blog"
        description="Every article, whatever state it is in. Drafts are not public until someone publishes them."
        actions={
          <Link href="/blog/new">
            <Button>New article</Button>
          </Link>
        }
      />

      {toast && (
        <div className="mb-4">
          <Banner kind={toast.kind}>
            {toast.message}
          </Banner>
        </div>
      )}

      <Card className="mb-6 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-content-muted">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as '' | ArticleStatus)}
              className="rounded-lg border border-line bg-surface-card px-3 py-2 text-sm text-content"
            >
              <option value="">All</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING">Pending</option>
              <option value="PUBLISHED">Published</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-content-muted">
            Language
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="rounded-lg border border-line bg-surface-card px-3 py-2 text-sm text-content"
            >
              <option value="">All</option>
              {Object.entries(LOCALE_LABEL).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-xs text-content-muted">
            Search
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title or body…"
              className="rounded-lg border border-line bg-surface-card px-3 py-2 text-sm text-content"
            />
          </label>
        </div>
      </Card>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : articles === null ? (
        <TableSkeleton rows={8} />
      ) : articles.length === 0 ? (
        <EmptyState
          title="Nothing here"
          hint="No article matches these filters."
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-content-muted">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Language</th>
                <th className="px-4 py-3">Signed by</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id} className="border-b border-line/50 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/blog/${article.id}`}
                      className="font-medium text-content hover:text-brand"
                    >
                      {article.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-content-muted">{article.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill tone={STATUS_TONE[article.status]}>
                      {article.status.toLowerCase()}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-3 text-content-muted">
                    {LOCALE_LABEL[article.locale] ?? article.locale}
                  </td>
                  <td className="px-4 py-3">
                    {article.validations.length === 0 ? (
                      // Worth showing plainly: an unsigned article is the whole
                      // reason the publish button should give someone pause.
                      <span className="text-xs text-content-muted">no doctor yet</span>
                    ) : (
                      <span className="text-xs text-content">
                        {article.validations.map((v) => v.full_name).filter(Boolean).join(', ')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {busy === article.id && <Spinner />}
                      {article.status !== 'PUBLISHED' && (
                        <Button
                          variant="secondary"
                          disabled={busy === article.id}
                          onClick={() => publish(article)}
                        >
                          Publish
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        disabled={busy === article.id}
                        onClick={() => setPendingDelete(article)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this article?"
        body={
          pendingDelete?.status === 'PUBLISHED'
            ? `“${pendingDelete.title}” is published. Its URL may already be indexed and linked, and deleting it turns that into a 404. This cannot be undone.`
            : `“${pendingDelete?.title ?? ''}” will be removed for good, along with any doctor signatures on it.`
        }
        confirmLabel="Delete"
        busy={busy !== null}
        onConfirm={() => pendingDelete && remove(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    </ConsoleShell>
  );
}

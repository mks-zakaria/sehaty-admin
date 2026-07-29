'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ConsoleShell } from '@/components/ConsoleShell';
import { PageHeader } from '@/components/ui';
import { ApiError, exportBackup, getToken, restoreBackup, type RestoreReport } from '@/lib/api';

/**
 * Backup and restore for the directory.
 *
 * The listings themselves are replaceable — a re-scrape takes an afternoon.
 * What is not is the work done in cabinets: the exact pins someone stood
 * outside to drop, the presentations doctors dictated, the tariffs, the hours,
 * the claims. That is what this file protects, and it is why the wording here
 * talks about visits rather than rows.
 *
 * Restore is deliberately two clicks. The first is a dry run that reports what
 * would change and touches nothing; only after reading it can you apply. An
 * uploaded file is almost always older than the database it is being applied
 * to, and "restore" is a word that invites people to click it confidently.
 */

export default function BackupPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<RestoreReport | null>(null);
  const [pending, setPending] = useState<unknown | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const data = await exportBackup();
      // Dated, because the first question about any backup is how old it is.
      const stamp = new Date().toISOString().slice(0, 10);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sehaty-backup-${stamp}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  }

  async function choose(file: File) {
    setBusy(true);
    setError(null);
    setReport(null);
    setPending(null);
    try {
      const payload = JSON.parse(await file.text());
      setFileName(file.name);
      // Dry run first, always. Nothing is written by this call.
      setReport(await restoreBackup(payload, true));
      setPending(payload);
    } catch (err) {
      setError(
        err instanceof SyntaxError
          ? 'That file is not valid JSON.'
          : err instanceof ApiError
            ? err.message
            : 'Could not read the file.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      setReport(await restoreBackup(pending, false));
      setPending(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Restore failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConsoleShell>
      <PageHeader
        title="Backup & restore"
        description="Protects the work done in cabinets, not the listings — those can be re-scraped."
      />

      <div className="space-y-6">
        <section className="rounded-xl border border-line p-4">
          <h2 className="font-semibold text-content">Download a backup</h2>
          <p className="mt-1 text-sm text-muted">
            Every doctor with their pin, presentation, tariff, hours, insurance
            and claim status. Keep it somewhere that is not this server.
          </p>
          <button
            type="button"
            onClick={() => void download()}
            disabled={busy}
            className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand disabled:opacity-50"
          >
            {busy ? 'Preparing…' : 'Download JSON'}
          </button>
        </section>

        <section className="rounded-xl border border-line p-4">
          <h2 className="font-semibold text-content">Restore from a file</h2>
          <p className="mt-1 text-sm text-muted">
            A blank in the file never clears a value — restoring an old backup
            cannot undo a morning of visits. An exact pin is never replaced by an
            approximate one, and a delisted doctor is never brought back.
          </p>

          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="mt-3 block text-sm text-content"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void choose(file);
            }}
          />

          {report && (
            <div className="mt-4 rounded-lg border border-line bg-surface p-3 text-sm">
              <p className="font-medium text-content">
                {pending !== null ? `Dry run — ${fileName}` : 'Restored'}
              </p>
              <ul className="mt-2 space-y-0.5 text-muted">
                <li>{report.total} rows in the file</li>
                <li>
                  <strong className="text-content">{report.updated}</strong>{' '}
                  {pending !== null ? 'would change' : 'changed'}
                </li>
                <li>{report.unchanged} already match</li>
                {report.skipped_removed > 0 && (
                  <li>{report.skipped_removed} skipped — delisted at their request</li>
                )}
              </ul>
              {report.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-warning">
                    {report.errors.length} not applied
                  </summary>
                  <ul className="mt-1 max-h-40 overflow-auto text-xs text-muted">
                    {report.errors.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </details>
              )}

              {pending !== null && report.updated === 0 && (
                <p className="mt-2 text-xs text-muted">
                  Nothing to do — the database already matches this file.
                </p>
              )}

              {pending !== null && report.updated > 0 && (
                <button
                  type="button"
                  onClick={() => void apply()}
                  disabled={busy}
                  className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand disabled:opacity-50"
                >
                  {busy ? 'Restoring…' : `Apply ${report.updated} change(s)`}
                </button>
              )}
            </div>
          )}
        </section>

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </ConsoleShell>
  );
}

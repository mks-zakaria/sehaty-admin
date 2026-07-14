import Link from 'next/link';
import type { ReactNode } from 'react';

const NAV_SECTIONS = [
  { label: 'Accreditation', href: '/accreditation', enabled: true },
  { label: 'Users', href: '#', enabled: false },
  { label: 'Subscriptions', href: '#', enabled: false },
  { label: 'Reviews', href: '#', enabled: false },
  { label: 'Ranking', href: '#', enabled: false },
  { label: 'Dashboard', href: '#', enabled: false },
];

export function ConsoleShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-brand/10 bg-white px-4 py-6 md:flex">
        <div className="mb-8 px-2">
          <span className="text-lg font-semibold text-brand-dark">Sehaty</span>
          <span className="ml-1 text-sm text-brand">Admin</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_SECTIONS.map((section) =>
            section.enabled ? (
              <Link
                key={section.label}
                href={section.href}
                className="rounded-lg bg-brand-light px-3 py-2 text-sm font-medium text-brand"
              >
                {section.label}
              </Link>
            ) : (
              <span
                key={section.label}
                aria-disabled="true"
                title="Coming soon"
                className="cursor-not-allowed rounded-lg px-3 py-2 text-sm text-brand-dark/40"
              >
                {section.label}
              </span>
            ),
          )}
        </nav>
      </aside>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';

const NAV_SECTIONS = [
  { label: 'Dashboard', href: '/dashboard', enabled: true },
  { label: 'Accreditation', href: '/accreditation', enabled: true },
  { label: 'Billing', href: '/billing', enabled: true },
  { label: 'Users', href: '#', enabled: false },
  { label: 'Subscriptions', href: '#', enabled: false },
  { label: 'Reviews', href: '#', enabled: false },
  { label: 'Ranking', href: '#', enabled: false },
];

export function ConsoleShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface-card px-4 py-6 md:flex">
        <div className="mb-8 px-2">
          <span className="text-lg font-semibold text-content">Sehaty</span>
          <span className="ml-1 text-sm text-brand">Admin</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_SECTIONS.map((section) =>
            section.enabled ? (
              <Link
                key={section.label}
                href={section.href}
                className="rounded-lg bg-brand-soft px-3 py-2 text-sm font-medium text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
              >
                {section.label}
              </Link>
            ) : (
              <span
                key={section.label}
                aria-disabled="true"
                title="Coming soon"
                className="cursor-not-allowed rounded-lg px-3 py-2 text-sm text-content-muted/70"
              >
                {section.label}
              </span>
            ),
          )}
        </nav>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line px-6 py-3">
          <span className="text-sm font-medium text-content-muted md:hidden">
            Sehaty <span className="text-brand">Admin</span>
          </span>
          <span className="hidden md:inline" />
          <ThemeToggle />
        </header>
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

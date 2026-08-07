'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { clearToken } from '@/lib/api';
import { ThemeToggle } from './ThemeToggle';
import {
  IconBadgeCheck,
  IconGauge,
  IconInbox,
  IconLogout,
  IconMenu,
  IconRepeat,
  IconSliders,
  IconStar,
  IconUsers,
  IconWallet,
  IconX,
} from './icons';

interface NavSection {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const NAV_SECTIONS: NavSection[] = [
  { label: 'Dashboard', href: '/dashboard', icon: IconGauge },
  { label: 'Accreditation', href: '/accreditation', icon: IconBadgeCheck },
  { label: 'Field list', href: '/prospects', icon: IconUsers },
  { label: 'Onboard', href: '/onboarding', icon: IconBadgeCheck },
  { label: 'Billing', href: '/billing', icon: IconWallet },
  { label: 'Users', href: '/users', icon: IconUsers },
  { label: 'Subscriptions', href: '/subscriptions', icon: IconRepeat },
  { label: 'Payments', href: '/payments', icon: IconWallet },
  { label: 'Landing pages', href: '/landing', icon: IconSliders },
  { label: 'Blog', href: '/blog', icon: IconInbox },
  { label: 'Reviews', href: '/moderation', icon: IconStar },
  { label: 'Ranking', href: '/ranking', icon: IconSliders },
  { label: 'Backup', href: '/backup', icon: IconRepeat },
];

function Wordmark() {
  return (
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-2 rounded-lg px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
    >
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-brand-on"
      >
        S
      </span>
      <span className="text-base font-semibold tracking-tight text-content">
        Sehaty
        <span className="ml-1.5 rounded-md bg-brand-soft px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand">
          Admin
        </span>
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Console sections" className="flex flex-col gap-1">
      {NAV_SECTIONS.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card ${
              active
                ? 'bg-brand-soft font-semibold text-brand'
                : 'font-medium text-content-muted hover:bg-brand/5 hover:text-content'
            }`}
          >
            <Icon
              className={`h-[18px] w-[18px] shrink-0 transition-colors duration-150 ${
                active ? 'text-brand' : 'text-content-muted/80 group-hover:text-content'
              }`}
            />
            {label}
            {active && (
              <span
                aria-hidden="true"
                className="ml-auto h-1.5 w-1.5 rounded-full bg-brand"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** Human title for the sticky header, derived from the active route. */
function useSectionLabel(): string {
  const pathname = usePathname();
  return (
    NAV_SECTIONS.find(
      (s) => pathname === s.href || pathname.startsWith(`${s.href}/`),
    )?.label ?? 'Console'
  );
}

export function ConsoleShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sectionLabel = useSectionLabel();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  function handleSignOut() {
    clearToken();
    router.push('/login');
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface-card px-4 py-5 md:flex">
        <div className="mb-8 px-1">
          <Wordmark />
        </div>
        <NavLinks />
        <div className="mt-auto border-t border-line pt-4">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-content-muted transition-colors duration-150 hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
          >
            <IconLogout className="h-[18px] w-[18px]" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="presentation">
          <div
            className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] animate-fade-in flex-col overflow-y-auto border-r border-line bg-surface-card px-4 py-5 shadow-raised">
            <div className="mb-6 flex items-center justify-between px-1">
              <Wordmark />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-content-muted transition-colors duration-150 hover:bg-brand/10 hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setDrawerOpen(false)} />
            <div className="mt-auto border-t border-line pt-4">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-content-muted transition-colors duration-150 hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <IconLogout className="h-[18px] w-[18px]" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Frosted sticky header */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-surface-card/80 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-content transition-colors duration-150 hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:hidden"
            >
              <IconMenu className="h-5 w-5" />
            </button>
            <div className="min-w-0 md:hidden">
              <Wordmark />
            </div>
            <span className="hidden items-center gap-2 text-sm text-content-muted md:flex">
              Console
              <span aria-hidden="true" className="text-line">
                /
              </span>
              <span className="font-medium text-content">{sectionLabel}</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Sehaty Admin — Staff Console',
    template: '%s | Sehaty Admin',
  },
  description:
    'Internal staff console for Sehaty: accredit doctors and manage the platform.',
};

/**
 * Applies the saved (or OS-preferred) theme to <html data-theme> before the
 * first paint, so there is no light/dark flash on load. Mirrors the approach
 * used in sehaty-front's index.html, adapted to the Next app router.
 */
const NO_FLASH_THEME_SCRIPT = `(function(){try{var k='sehaty-admin-theme';var s=localStorage.getItem(k);var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=s==='dark'||s==='light'?s:(m?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-surface text-content">{children}</body>
    </html>
  );
}

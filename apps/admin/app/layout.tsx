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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--background)] text-brand-dark">
        {children}
      </body>
    </html>
  );
}

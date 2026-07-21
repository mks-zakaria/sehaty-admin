import type { Config } from 'tailwindcss';

/** Wrap an RGB-channel CSS variable so Tailwind can inject alpha values. */
const token = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Inter, loaded via next/font in app/layout.tsx.
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Semantic, theme-aware surfaces & text.
        surface: {
          DEFAULT: token('--surface'),
          card: token('--surface-card'),
        },
        content: {
          DEFAULT: token('--text'),
          muted: token('--text-muted'),
        },
        line: token('--border'),
        // Soft-blue brand, kept across both themes.
        brand: {
          DEFAULT: token('--brand'),
          hover: token('--brand-hover'),
          soft: token('--brand-soft'),
          on: token('--on-brand'),
        },
        // Status colours for pills, toasts, and validation.
        success: {
          DEFAULT: token('--success'),
          soft: token('--success-soft'),
        },
        warning: {
          DEFAULT: token('--warning'),
          soft: token('--warning-soft'),
        },
        danger: {
          DEFAULT: token('--danger'),
          soft: token('--danger-soft'),
        },
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        raised: 'var(--shadow-raised)',
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        'fade-in': 'fade-in 0.2s ease-out both',
        'pop-in': 'pop-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;

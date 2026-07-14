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
      },
    },
  },
  plugins: [],
};

export default config;

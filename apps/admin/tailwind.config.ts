import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          // Soft blue primary
          DEFAULT: '#2b73b3',
          dark: '#1b3d5e',
          light: '#eaf2fa',
          mint: '#2fae9b',
        },
      },
    },
  },
  plugins: [],
};

export default config;
